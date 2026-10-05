// Lecture des offres pour le dashboard. Chaque fonction est indépendante pour que les pages
// puissent les lancer ensemble (Promise.all).
import { and, asc, count, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm";
import type { Db } from "./index";
import { applications, jobs, matches } from "./schema";

export const JOBS_PAGE_SIZE = 25;

export interface JobFilters {
  q?: string;
  company?: string;
  city?: string;
  contract?: string;
  category?: string;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function whereClause(f: JobFilters): SQL | undefined {
  const conditions: SQL[] = [];
  const q = f.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      sql`(${jobs.title} like ${pattern} escape '\\' or ${jobs.company} like ${pattern} escape '\\' or ${jobs.description} like ${pattern} escape '\\')`,
    );
  }
  if (f.company) conditions.push(eq(jobs.company, f.company));
  if (f.city) conditions.push(eq(jobs.city, f.city));
  if (f.contract) conditions.push(eq(jobs.contractType, f.contract));
  if (f.category) conditions.push(eq(jobs.category, f.category));
  return conditions.length ? and(...conditions) : undefined;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  postedAt: string | null;
  category: string | null;
  city: string | null;
  contractType: string | null;
  score: number | null;
  status: string | null;
}

export async function listJobs(db: Db, filters: JobFilters, page: number): Promise<JobRow[]> {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      postedAt: jobs.postedAt,
      category: jobs.category,
      city: jobs.city,
      contractType: jobs.contractType,
      score: matches.score,
      status: applications.status,
    })
    .from(jobs)
    .leftJoin(matches, eq(matches.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(whereClause(filters))
    .orderBy(sql`${jobs.postedAt} is null`, desc(jobs.postedAt), desc(jobs.fetchedAt))
    .limit(JOBS_PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * JOBS_PAGE_SIZE)
    .all();
}

export async function countJobs(db: Db, filters: JobFilters): Promise<number> {
  return db.select({ n: count() }).from(jobs).where(whereClause(filters)).get()?.n ?? 0;
}

/** Valeurs distinctes d'une colonne, pour les listes déroulantes des filtres. */
async function distinct(db: Db, column: typeof jobs.company | typeof jobs.city | typeof jobs.contractType | typeof jobs.category) {
  const rows = db.selectDistinct({ value: column }).from(jobs).where(isNotNull(column)).orderBy(asc(column)).all();
  return rows.map((r) => r.value as string);
}

export async function jobFilterOptions(db: Db) {
  const [companies, cities, contracts, categories] = await Promise.all([
    distinct(db, jobs.company),
    distinct(db, jobs.city),
    distinct(db, jobs.contractType),
    distinct(db, jobs.category),
  ]);
  return { companies, cities, contracts, categories };
}

export async function getJob(db: Db, id: string) {
  return db.select().from(jobs).where(eq(jobs.id, id)).get() ?? null;
}

export async function getJobMatch(db: Db, jobId: string) {
  return db.select().from(matches).where(eq(matches.jobId, jobId)).get() ?? null;
}

export async function getJobApplication(db: Db, jobId: string) {
  return db.select().from(applications).where(eq(applications.jobId, jobId)).get() ?? null;
}
