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
    location: text("location"),
    contractType: text("contract_type"),
    salaryText: text("salary_text"),
    description: text("description").notNull(),
    url: text("url").notNull(),
    postedAt: text("posted_at"),
    fetchedAt: text("fetched_at").notNull(),
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
