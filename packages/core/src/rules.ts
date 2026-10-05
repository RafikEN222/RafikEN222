// Règles non négociables du projet (voir CLAUDE.md).

/** Délai aléatoire entre deux requêtes vers un site, en millisecondes. */
export const SCRAPE_DELAY_MS = { min: 2_000, max: 5_000 } as const;
