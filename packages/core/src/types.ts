// Types partagés entre le dashboard (apps/web), le worker et la base.

export type SourceId = "indeed" | "france-travail" | "email-alert" | "manual";

export type ContractType = "cdi" | "cdd" | "freelance" | "internship" | "apprenticeship" | "other";

export interface Job {
  id: string;
  source: SourceId;
  /** Identifiant chez la source, quand il est stable. */
  externalId: string | null;
  companySlug: string | null;
  /** Clé de déduplication : entreprise + titre + lieu normalisés. */
  dedupKey: string;
  title: string;
  company: string;
  location: string | null;
  contractType: ContractType | null;
  salaryText: string | null;
  description: string;
  questions: RecruiterQuestion[] | null;
  url: string;
  postedAt: string | null;
  fetchedAt: string;
}

export interface MatchResult {
  jobId: string;
  /** Score global de 0 à 100. */
  score: number;
  strengths: string[];
  gaps: string[];
  dealBreakers: string[];
  rationale: string;
}

export type ApplicationStatus =
  | "to_review"
  | "preparing"
  | "ready" // dossier prêt : l'utilisateur doit envoyer lui-même
  | "submitted" // marqué envoyé par l'utilisateur
  | "interview"
  | "rejected"
  | "offer"
  | "withdrawn";

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  tailoredCvPath: string | null;
  coverLetter: string | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  fullName: string;
  headline: string;
  targetRoles: string[];
  locations: string[];
  remote: "no" | "hybrid" | "full" | "any";
  minSalary: number | null;
  skills: string[];
  dealBreakers: string[];
}

export interface RecruiterQuestion {
  label: string;
  type: string | null;
  required: boolean;
  options: string[];
}

export type PipelineRunStatus = "running" | "success" | "partial" | "stopped" | "failed";
