import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createPoliteClient, RetryExhaustedError, StopScrapingError } from "../src/scraper/http";

let server: Server;
let base: string;
const hits = new Map<string, number>();

before(async () => {
  server = createServer((req, res) => {
    const path = req.url ?? "/";
    const n = (hits.get(path) ?? 0) + 1;
    hits.set(path, n);
    if (path === "/ok") return res.end("ok");
    if (path === "/forbidden") return res.writeHead(403).end();
    if (path === "/rate-limited") return res.writeHead(429).end();
    if (path === "/always-500") return res.writeHead(500).end();
    if (path === "/flaky") return n < 3 ? res.writeHead(502).end() : res.end("ok");
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

/** Client avec un sleep instantané qui enregistre les attentes demandées. */
function client(random = () => 0.5) {
  const waits: number[] = [];
  const c = createPoliteClient({ sleep: async (ms) => void waits.push(ms), random });
  return { c, waits };
}

describe("createPoliteClient", () => {
  it("attend entre 2 et 5 s entre deux requêtes, pas avant la première", async () => {
    const { c, waits } = client(() => 0);
    await c.request(`${base}/ok`);
    assert.deepEqual(waits, []);
    await c.request(`${base}/ok`);
    assert.deepEqual(waits, [2000]);

    const hi = client(() => 0.999);
    await hi.c.request(`${base}/ok`);
    await hi.c.request(`${base}/ok`);
    assert.ok(hi.waits[0]! > 4990 && hi.waits[0]! < 5000);
  });

  it("sérialise les requêtes concurrentes", async () => {
    const { c, waits } = client();
    await Promise.all([c.request(`${base}/ok`), c.request(`${base}/ok`), c.request(`${base}/ok`)]);
    assert.equal(waits.length, 2);
  });

  it("réessaie les 5xx avec backoff, 3 tentatives au total", async () => {
    hits.clear();
    const { c, waits } = client(() => 0);
    const res = await c.request(`${base}/flaky`);
    assert.equal(res.status, 200);
    assert.equal(hits.get("/flaky"), 3);
    // backoff 2 s puis 4 s, chacun suivi du délai de politesse (2 s ici)
    assert.deepEqual(waits, [2000, 2000, 4000, 2000]);

    await assert.rejects(c.request(`${base}/always-500`), RetryExhaustedError);
    assert.equal(hits.get("/always-500"), 3);
  });

  for (const [path, status] of [["/forbidden", 403], ["/rate-limited", 429]] as const) {
    it(`s'arrête immédiatement sur ${status}, sans réessayer ni continuer`, async () => {
      hits.clear();
      const { c } = client();
      await assert.rejects(c.request(`${base}${path}`), (err: unknown) => {
        assert.ok(err instanceof StopScrapingError);
        assert.equal(err.status, status);
        return true;
      });
      assert.equal(hits.get(path), 1);
      await assert.rejects(c.request(`${base}/ok`), StopScrapingError);
      assert.equal(hits.get("/ok"), undefined);
    });
  }
});
