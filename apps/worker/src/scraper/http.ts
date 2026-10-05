import { SCRAPE_BACKOFF_BASE_MS, SCRAPE_DELAY_MS, SCRAPE_MAX_ATTEMPTS } from "@rj/core";

/** Le site refuse ou limite l'accès (403/429) : on arrête tout le run, sans réessayer. */
export class StopScrapingError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`Arrêt immédiat : HTTP ${status} sur ${url}`);
    this.name = "StopScrapingError";
  }
}

export class RetryExhaustedError extends Error {
  constructor(
    readonly url: string,
    readonly attempts: number,
    readonly lastError: string,
  ) {
    super(`Échec après ${attempts} tentatives sur ${url} : ${lastError}`);
    this.name = "RetryExhaustedError";
  }
}

export interface PoliteClientOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Client HTTP poli : une requête à la fois, attente aléatoire (2 à 5 s par défaut) entre
 * deux requêtes, 3 tentatives avec backoff exponentiel sur erreur réseau ou 5xx,
 * arrêt immédiat sur 403/429.
 */
export function createPoliteClient(options: PoliteClientOptions = {}) {
  const {
    minDelayMs = SCRAPE_DELAY_MS.min,
    maxDelayMs = SCRAPE_DELAY_MS.max,
    maxAttempts = SCRAPE_MAX_ATTEMPTS,
    backoffBaseMs = SCRAPE_BACKOFF_BASE_MS,
    userAgent = "RechercheJob/0.1 (usage personnel)",
    fetchImpl = fetch,
    sleep = defaultSleep,
    random = Math.random,
  } = options;

  let queue: Promise<unknown> = Promise.resolve();
  let hasRequested = false;
  let stopped: StopScrapingError | null = null;

  async function waitTurn() {
    if (hasRequested) await sleep(minDelayMs + random() * (maxDelayMs - minDelayMs));
    hasRequested = true;
  }

  async function attemptAll(url: string, init: RequestInit): Promise<Response> {
    let lastError = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (stopped) throw stopped;
      if (attempt > 1) await sleep(backoffBaseMs * 2 ** (attempt - 2));
      await waitTurn();

      let res: Response;
      try {
        res = await fetchImpl(url, {
          ...init,
          headers: { "user-agent": userAgent, ...init.headers },
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }

      if (res.status === 403 || res.status === 429) {
        stopped = new StopScrapingError(url, res.status);
        throw stopped;
      }
      if (res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      return res;
    }
    throw new RetryExhaustedError(url, maxAttempts, lastError);
  }

  return {
    /** Effectue la requête quand c'est son tour (les appels concurrents sont sérialisés). */
    request(url: string, init: RequestInit = {}): Promise<Response> {
      const run = queue.then(() => attemptAll(url, init));
      queue = run.catch(() => undefined);
      return run;
    },
    get stopped() {
      return stopped;
    },
  };
}

export type PoliteClient = ReturnType<typeof createPoliteClient>;
