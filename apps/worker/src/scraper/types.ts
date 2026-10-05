import type { ContractType, RecruiterQuestion, SourceId } from "@rj/core";

/** Offre telle qu'elle apparaît dans une liste (avant téléchargement du détail). */
export interface JobSummary {
  externalId: string | null;
  companySlug: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
}

export interface JobDetail {
  externalId: string | null;
  title: string;
  company: string;
  location: string | null;
  contractType: ContractType | null;
  salaryText: string | null;
  description: string;
  url: string;
  postedAt: string | null;
  /** Données structurées brutes de la source. */
  structured: Record<string, unknown>;
  questions: RecruiterQuestion[] | null;
}

export interface JobSource {
  id: SourceId;
  /** Entreprises disponibles pour `scrape --all`. */
  listCompanies(): Promise<string[]>;
  listJobs(companySlug: string): Promise<JobSummary[]>;
  fetchDetail(summary: JobSummary): Promise<JobDetail>;
}
