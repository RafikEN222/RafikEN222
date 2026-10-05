import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
};

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    dedupKey: text("dedup_key").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    companySlug: text("company_slug"),
    location: text("location"),
    contractType: text("contract_type"),
    salaryText: text("salary_text"),
    description: text("description").notNull(),
    url: text("url").notNull(),
    postedAt: text("posted_at"),
    /** Données structurées brutes de la source (JSON). */
    structured: text("structured", { mode: "json" }),
    /** Questions du recruteur, quand la source les expose (JSON). */
    questions: text("questions", { mode: "json" }),
    fetchedAt: text("fetched_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("jobs_dedup_key_idx").on(t.dedupKey)],
);

export const matches = sqliteTable("matches", {
  jobId: text("job_id")
    .primaryKey()
    .references(() => jobs.id),
  score: integer("score").notNull(),
  details: text("details", { mode: "json" }).notNull(),
  ...timestamps,
});

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    status: text("status").notNull().default("to_review"),
    tailoredCvPath: text("tailored_cv_path"),
    coverLetter: text("cover_letter"),
    notes: text("notes"),
    submittedAt: text("submitted_at"),
    ...timestamps,
  },
  // Une seule candidature par offre : garde-fou contre les doublons.
  (t) => [uniqueIndex("applications_job_id_idx").on(t.jobId)],
);

export const pipelineRuns = sqliteTable("pipeline_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(), // "scrape"
  source: text("source").notNull(),
  scope: text("scope").notNull(), // slug d'entreprise ou "all"
  status: text("status").notNull().default("running"), // running | success | partial | stopped | failed
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  detailsFetched: integer("details_fetched").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errors: text("errors", { mode: "json" }).$type<string[]>().notNull().default([]),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
});

/** Profil unique (id = 1) : CV structuré, préférences et réponses de candidature. */
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  cv: text("cv", { mode: "json" }).notNull(),
  preferences: text("preferences", { mode: "json" }).notNull(),
  answers: text("answers", { mode: "json" }).notNull(),
  /** Nom du dernier fichier CV importé (le fichier lui-même n'est pas conservé). */
  cvFileName: text("cv_file_name"),
  ...timestamps,
});
