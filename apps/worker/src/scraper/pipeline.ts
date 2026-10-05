import { randomUUID } from "node:crypto";
import { dedupKey, type PipelineRunStatus } from "@rj/core";
import { type Db, schema } from "@rj/db";
import { eq } from "drizzle-orm";
import { StopScrapingError } from "./http";
import type { JobSource } from "./types";

export interface ScrapeOptions {
  db: Db;
  source: JobSource;
  /** Entreprises à traiter ; `scope` est enregistré dans pipeline_runs. */
  companies: string[];
  scope: string;
  /** Nombre maximum de nouvelles offres (détails téléchargés) pour ce run. */
  limit?: number;
  log?: (message: string) => void;
}

export interface ScrapeReport {
  runId: number;
  status: PipelineRunStatus;
  jobsFound: number;
  jobsNew: number;
  detailsFetched: number;
  errors: string[];
  newJobIds: string[];
}

export async function runScrape(options: ScrapeOptions): Promise<ScrapeReport> {
  const { db, source, companies, scope, limit = Infinity, log = () => {} } = options;
  const now = () => new Date().toISOString();

  const [run] = db
    .insert(schema.pipelineRuns)
    .values({ kind: "scrape", source: source.id, scope, startedAt: now() })
    .returning({ id: schema.pipelineRuns.id })
    .all();
  const report: ScrapeReport = {
    runId: run!.id,
    status: "running",
    jobsFound: 0,
    jobsNew: 0,
    detailsFetched: 0,
    errors: [],
    newJobIds: [],
  };

  const fail = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    report.errors.push(message);
    log(`  ✗ ${message}`);
  };

  let companiesListed = 0;
  try {
    companies: for (const slug of companies) {
      log(`→ ${slug}`);
      let summaries;
      try {
        summaries = await source.listJobs(slug);
      } catch (err) {
        if (err instanceof StopScrapingError) throw err;
        fail(err);
        continue;
      }
      companiesListed++;
      report.jobsFound += summaries.length;
      log(`  ${summaries.length} offre(s) dans la liste`);

      for (const summary of summaries) {
        const key = dedupKey(summary);
        const existing = db
          .select({ id: schema.jobs.id })
          .from(schema.jobs)
          .where(eq(schema.jobs.dedupKey, key))
          .get();
        if (existing) {
          // Déjà en base : on ne retélécharge pas le détail, on note juste qu'elle est toujours en ligne.
          db.update(schema.jobs)
            .set({ lastSeenAt: now(), updatedAt: now() })
            .where(eq(schema.jobs.id, existing.id))
            .run();
          continue;
        }
        if (report.detailsFetched >= limit) {
          log(`  limite de ${limit} nouvelle(s) offre(s) atteinte`);
          break companies;
        }

        let detail;
        try {
          detail = await source.fetchDetail(summary);
          report.detailsFetched++;
        } catch (err) {
          if (err instanceof StopScrapingError) throw err;
          fail(err);
          continue;
        }

        const id = randomUUID();
        const fetchedAt = now();
        // La clé reste celle de la liste, pour que le prochain run reconnaisse l'offre.
        const inserted = db
          .insert(schema.jobs)
          .values({
            id,
            source: source.id,
            externalId: detail.externalId,
            companySlug: summary.companySlug,
            dedupKey: key,
            title: detail.title,
            company: detail.company,
            location: detail.location,
            contractType: detail.contractType,
            salaryText: detail.salaryText,
            description: detail.description,
            url: detail.url,
            postedAt: detail.postedAt,
            structured: detail.structured,
            questions: detail.questions,
            fetchedAt,
            lastSeenAt: fetchedAt,
          })
          .onConflictDoNothing({ target: schema.jobs.dedupKey })
          .returning({ id: schema.jobs.id })
          .all();
        if (inserted.length > 0) {
          report.jobsNew++;
          report.newJobIds.push(id);
          log(`  + ${detail.title}`);
        }
      }
    }
    if (report.errors.length === 0) report.status = "success";
    else report.status = companiesListed === 0 ? "failed" : "partial";
  } catch (err) {
    fail(err);
    report.status = err instanceof StopScrapingError ? "stopped" : "failed";
  }

  db.update(schema.pipelineRuns)
    .set({
      status: report.status,
      jobsFound: report.jobsFound,
      jobsNew: report.jobsNew,
      detailsFetched: report.detailsFetched,
      errorCount: report.errors.length,
      errors: report.errors,
      finishedAt: now(),
    })
    .where(eq(schema.pipelineRuns.id, report.runId))
    .run();

  return report;
}
