import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDb, schema } from "@rj/db";
import { runScrape } from "../src/scraper/pipeline";
import { StopScrapingError } from "../src/scraper/http";
import type { JobSource, JobSummary } from "../src/scraper/types";

function fakeSource(summaries: JobSummary[], opts: { failOn?: string; stopOn?: string } = {}) {
  const detailCalls: string[] = [];
  const source: JobSource = {
    id: "indeed",
    listCompanies: async () => ["acme"],
    listJobs: async () => summaries,
    fetchDetail: async (s) => {
      detailCalls.push(s.externalId!);
      if (s.externalId === opts.stopOn) throw new StopScrapingError("https://example.test", 429);
      if (s.externalId === opts.failOn) throw new Error("détail illisible");
      return {
        externalId: s.externalId,
        title: s.title,
        company: s.company,
        location: s.location,
        contractType: null,
        salaryText: null,
        description: `Description de ${s.title}`,
        url: `https://example.test/${s.externalId}`,
        postedAt: null,
        structured: {},
        questions: null,
      };
    },
  };
  return { source, detailCalls };
}

const job = (id: string, title: string): JobSummary => ({
  externalId: id,
  companySlug: "acme",
  title,
  company: "ACME",
  location: "Paris (75)",
  url: null,
});

describe("runScrape", () => {
  it("ne télécharge le détail que des offres absentes de la base", async () => {
    const db = createDb(":memory:");
    const first = fakeSource([job("1", "Data Engineer H/F"), job("2", "Data Analyst")]);
    const r1 = await runScrape({ db, source: first.source, companies: ["acme"], scope: "acme" });
    assert.equal(r1.jobsNew, 2);
    assert.deepEqual(first.detailCalls, ["1", "2"]);

    // Identifiants différents (non stables), même offre + une nouvelle.
    const second = fakeSource([job("9", "Data Engineer (F/H)"), job("8", "Data Analyst"), job("7", "ML Engineer")]);
    const r2 = await runScrape({ db, source: second.source, companies: ["acme"], scope: "acme" });
    assert.equal(r2.jobsFound, 3);
    assert.equal(r2.jobsNew, 1);
    assert.deepEqual(second.detailCalls, ["7"]);

    const runs = db.select().from(schema.pipelineRuns).all();
    assert.deepEqual(
      runs.map((r) => [r.status, r.jobsFound, r.jobsNew, r.detailsFetched, r.errorCount]),
      [
        ["success", 2, 2, 2, 0],
        ["success", 3, 1, 1, 0],
      ],
    );
  });

  it("respecte --limit et enregistre les erreurs sans arrêter le run", async () => {
    const db = createDb(":memory:");
    const { source } = fakeSource([job("1", "A"), job("2", "B"), job("3", "C")], { failOn: "1" });
    const r = await runScrape({ db, source, companies: ["acme"], scope: "acme", limit: 1 });
    assert.equal(r.status, "partial");
    assert.equal(r.errors.length, 1);
    assert.equal(r.jobsNew, 1);
  });

  it("s'arrête net sur 403/429 et marque le run « stopped »", async () => {
    const db = createDb(":memory:");
    const { source, detailCalls } = fakeSource([job("1", "A"), job("2", "B"), job("3", "C")], { stopOn: "2" });
    const r = await runScrape({ db, source, companies: ["acme"], scope: "acme" });
    assert.equal(r.status, "stopped");
    assert.deepEqual(detailCalls, ["1", "2"]);
    assert.equal(r.jobsNew, 1);
    const [run] = db.select().from(schema.pipelineRuns).all();
    assert.equal(run!.status, "stopped");
    assert.match(run!.errors[0]!, /HTTP 429/);
  });
});
