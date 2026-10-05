// Règles non négociables du projet (voir CLAUDE.md).

/** Délai aléatoire entre deux requêtes vers un site, en millisecondes. */
export const SCRAPE_DELAY_MS = { min: 2_000, max: 5_000 } as const;

/** Nombre total de tentatives par requête (première incluse). */
export const SCRAPE_MAX_ATTEMPTS = 3;

/** Base du backoff exponentiel entre deux tentatives, en millisecondes. */
export const SCRAPE_BACKOFF_BASE_MS = 2_000;
