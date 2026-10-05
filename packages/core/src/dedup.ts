// Clé de déduplication d'une offre : entreprise + titre + lieu normalisés.
// Les identifiants des sources ne sont pas toujours stables (cf. connecteur Indeed),
// cette clé sert donc de référence pour « déjà en base ».

const GENDER_MARKERS = /\(?\b(?:h\s*\/\s*f|f\s*\/\s*h|h\s*\/\s*f\s*\/\s*x|m\s*\/\s*f|f\s*\/\s*m)\b\)?/gi;

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/ /g, "-");
}

export function dedupKey(job: { company: string; title: string; location: string | null }): string {
  const title = job.title.replace(GENDER_MARKERS, " ");
  return [job.company, title, job.location ?? ""].map(normalizeText).join("|");
}
