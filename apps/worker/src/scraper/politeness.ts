import { SCRAPE_DELAY_MS } from "@rj/core";

/** Attente aléatoire entre deux requêtes vers un même site (2 à 5 s). */
export function politeDelay(): Promise<void> {
  const { min, max } = SCRAPE_DELAY_MS;
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
