// Dérivations simples et déterministes à partir des champs d'une offre.
// La catégorie est une première approximation par mots-clés du titre ; le matcher pourra l'affiner.
import { normalizeText } from "./dedup";

const CATEGORY_RULES: { category: string; patterns: RegExp[] }[] = [
  { category: "Cybersécurité", patterns: [/\bcyber/, /\bsecurite\b/, /\bsoc\b/, /\bpentest/] },
  { category: "Base de données", patterns: [/\bdba\b/, /\bbase de donnees\b/, /\bdatabase\b/] },
  { category: "Gouvernance / MDM", patterns: [/\bgouvernance\b/, /\bmdm\b/, /\bdata management\b/, /\bqualite des donnees\b/] },
  { category: "Data Science / IA", patterns: [/\bdata scientist/, /\bmachine learning\b/, /\bml\b/, /\bia\b/, /\bai\b/, /\bdeep learning\b/] },
  { category: "Data Engineering", patterns: [/\bdata engineer/, /\bbig data\b/, /\bdata factory\b/, /\bpyspark\b/, /\bingenieur e? data\b/] },
  { category: "Data Analyse / BI", patterns: [/\bdata analyst/, /\banalyste\b/, /\bbi\b/, /\bbusiness intelligence\b/, /\bpower bi\b/] },
  { category: "Développement", patterns: [/\bdevelopp?eu?r/, /\bdeveloper\b/, /\bsoftware engineer/, /\bfull ?stack\b/, /\bdevops\b/] },
  { category: "Conseil data", patterns: [/\bconsultant.*\bdata\b/] },
];

/** Catégorie d'une offre d'après son titre, ou null si aucune règle ne s'applique. */
export function categorizeJob(title: string): string | null {
  const t = normalizeText(title);
  return CATEGORY_RULES.find((r) => r.patterns.some((p) => p.test(t)))?.category ?? null;
}

export const JOB_CATEGORIES = CATEGORY_RULES.map((r) => r.category);

/** Ville d'après le lieu affiché : « Courbevoie (92) » → « Courbevoie », « Paris 13e (75) » → « Paris ». */
export function cityFromLocation(location: string | null): string | null {
  if (!location) return null;
  const city = location
    .replace(/\(.*?\)/g, "")
    .replace(/^paris\s+\d+(?:e|er|ème)?\b/i, "Paris")
    .trim();
  return city || null;
}
