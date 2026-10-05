// Source Indeed alimentée par le connecteur Indeed officiel (et non par du scraping du site,
// interdit par les CGU d'Indeed : voir CLAUDE.md).
//
// Les sorties brutes du connecteur sont déposées dans <DATA_DIR>/imports/indeed/<slug>/ :
//   listing*.md         résultat(s) de `search_jobs`, copiés tels quels
//   details/<JobId>.md  résultat de `get_job_details` pour chaque offre
// La « liste » lit les listings ; le « détail » lit le fichier de l'offre.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type ContractType, slugify } from "@rj/core";
import type { JobDetail, JobSource, JobSummary } from "../types";

type Fields = Record<string, string>;

const FIELD_LINE = /^\s*\*\*(.+?):\*\*\s*(.*?)\s*$/;
const EMPTY_VALUES = new Set(["", "n/a", "none", "null"]);

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  return EMPTY_VALUES.has(value.trim().toLowerCase()) ? null : value.trim();
}

/** Découpe une sortie `search_jobs` en offres (un bloc par « **Job Title:** »). */
export function parseListing(markdown: string): Fields[] {
  const blocks: Fields[] = [];
  let current: Fields | null = null;
  for (const line of markdown.split("\n")) {
    const match = FIELD_LINE.exec(line);
    if (!match) continue;
    const [, key, value] = match as unknown as [string, string, string];
    if (key === "Job Title") {
      current = {};
      blocks.push(current);
    }
    if (current) current[key] = value;
  }
  return blocks;
}

/** Sépare l'en-tête (champs) et la description d'une sortie `get_job_details`. */
export function parseDetail(markdown: string): { title: string | null; fields: Fields; description: string } {
  const lines = markdown.split("\n");
  const fields: Fields = {};
  let title: string | null = null;
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const heading = /^\s*###\s+(.*)$/.exec(line);
    if (heading && title === null) {
      title = heading[1]!.trim();
      continue;
    }
    const match = FIELD_LINE.exec(line);
    if (match) {
      fields[match[1]!] = match[2]!;
      continue;
    }
    if (line.trim() === "" && Object.keys(fields).length === 0) continue;
    if (line.trim() === "") {
      i++;
      break;
    }
  }
  const description = lines
    .slice(i)
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, fields, description };
}

export function toContractType(jobType: string | null): ContractType | null {
  if (!jobType) return null;
  const t = jobType.toLowerCase();
  if (/(permanent|cdi)/.test(t)) return "cdi";
  if (/(cdd|temporary|temporaire|fixed|renouvelable)/.test(t)) return "cdd";
  if (/(intern|stage)/.test(t)) return "internship";
  if (/(apprenti|alternance)/.test(t)) return "apprenticeship";
  if (/(freelance|contract|indépendant)/.test(t)) return "freelance";
  return null;
}

export function toIsoDate(posted: string | null): string | null {
  if (!posted) return null;
  const ms = Date.parse(`${posted} UTC`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}

function belongsTo(company: string, slug: string): boolean {
  const c = slugify(company);
  return c === slug || c.includes(slug) || slug.includes(c);
}

export function createIndeedImportSource(importDir: string): JobSource {
  const root = join(importDir, "indeed");

  return {
    id: "indeed",

    async listCompanies() {
      const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
      return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    },

    async listJobs(companySlug) {
      const dir = join(root, companySlug);
      const files = (await readdir(dir).catch(() => null))?.filter((f) => /^listing.*\.md$/.test(f));
      if (!files || files.length === 0) {
        throw new Error(
          `Aucun listing pour « ${companySlug} » dans ${dir}. Exporte d'abord les offres avec le connecteur Indeed.`,
        );
      }
      const summaries = new Map<string, JobSummary>();
      for (const file of files.sort()) {
        for (const f of parseListing(await readFile(join(dir, file), "utf8"))) {
          const company = clean(f["Company"]);
          const title = clean(f["Job Title"]);
          const externalId = clean(f["Job Id"]);
          if (!company || !title || !belongsTo(company, companySlug)) continue;
          summaries.set(externalId ?? `${company}|${title}`, {
            externalId,
            companySlug,
            title,
            company,
            location: clean(f["Location"]),
            url: clean(f["View Job URL"]),
          });
        }
      }
      return [...summaries.values()];
    },

    async fetchDetail(summary) {
      if (!summary.externalId) throw new Error(`Offre sans identifiant : ${summary.title}`);
      const path = join(root, summary.companySlug, "details", `${summary.externalId}.md`);
      const raw = await readFile(path, "utf8").catch(() => null);
      if (raw === null) {
        throw new Error(`Détail non exporté pour ${summary.externalId} (${summary.title}) : ${path}`);
      }
      const { title, fields, description } = parseDetail(raw);
      const jobType = clean(fields["Job Type"]);
      const posted = clean(fields["Posted on"]);
      return {
        externalId: summary.externalId,
        title: title ?? summary.title,
        company: clean(fields["Company"]) ?? summary.company,
        location: clean(fields["Location"]) ?? summary.location,
        contractType: toContractType(jobType),
        salaryText: clean(fields["Compensation"]),
        description,
        url: clean(fields["View Job URL"]) ?? summary.url ?? "",
        postedAt: toIsoDate(posted),
        structured: { ...fields, title },
        // Le connecteur n'expose pas les questions du recruteur (elles sont derrière le login Indeed).
        questions: null,
      } satisfies JobDetail;
    },
  };
}
