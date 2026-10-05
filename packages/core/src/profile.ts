// Profil unique de l'utilisateur : CV structuré, préférences de recherche et réponses de candidature.
// Les schémas Zod servent à la fois à la sortie structurée de Claude (extraction du CV)
// et à la validation de ce que le dashboard enregistre.
import { z } from "zod";

// ---------------------------------------------------------------- CV

/** Texte tel qu'écrit dans le CV, ou null s'il n'y figure pas. */
const text = () => z.string().nullable();

export const cvContactSchema = z.object({
  fullName: text(),
  headline: text().describe("Titre ou intitulé affiché sous le nom, tel qu'écrit"),
  email: text(),
  phone: text(),
  location: text(),
  linkedin: text(),
  website: text(),
});

export const cvExperienceSchema = z.object({
  title: text(),
  company: text(),
  location: text(),
  startDate: text().describe("Date de début telle qu'écrite (ex. « sept. 2021 »), sans reformatage"),
  endDate: text().describe("Date de fin telle qu'écrite, ou « Aujourd'hui » si c'est écrit ainsi"),
  description: text().describe("Paragraphe de contexte s'il y en a un, hors puces"),
  bullets: z.array(z.string()).describe("Puces de l'expérience, une entrée par puce, texte tel qu'écrit"),
});

export const cvEducationSchema = z.object({
  degree: text(),
  school: text(),
  location: text(),
  startDate: text(),
  endDate: text(),
  details: text().describe("Mention, spécialité, cours… si c'est écrit"),
});

export const cvLanguageSchema = z.object({
  language: z.string(),
  level: text().describe("Niveau tel qu'écrit (ex. « C1 », « courant »), null s'il n'est pas indiqué"),
});

export const cvProjectSchema = z.object({
  name: text(),
  description: text(),
  bullets: z.array(z.string()),
  url: text(),
});

export const cvCertificationSchema = z.object({
  name: z.string(),
  issuer: text(),
  date: text(),
});

export const cvSchema = z.object({
  contact: cvContactSchema,
  summary: text().describe("Résumé / accroche du CV, tel qu'écrit"),
  experiences: z.array(cvExperienceSchema),
  education: z.array(cvEducationSchema),
  skills: z.array(z.string()).describe("Compétences listées dans le CV, une entrée par compétence"),
  languages: z.array(cvLanguageSchema),
  projects: z.array(cvProjectSchema),
  certifications: z.array(cvCertificationSchema),
});

export type Cv = z.infer<typeof cvSchema>;
export type CvExperience = z.infer<typeof cvExperienceSchema>;
export type CvEducation = z.infer<typeof cvEducationSchema>;
export type CvProject = z.infer<typeof cvProjectSchema>;

export function emptyCv(): Cv {
  return {
    contact: { fullName: null, headline: null, email: null, phone: null, location: null, linkedin: null, website: null },
    summary: null,
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
  };
}

// ---------------------------------------------------------------- Préférences

export const CONTRACT_TYPES = ["cdi", "cdd", "freelance", "internship", "apprenticeship", "other"] as const;

export const preferencesSchema = z.object({
  categories: z.array(z.string()),
  keywords: z.array(z.string()),
  cities: z.array(z.string()),
  contracts: z.array(z.enum(CONTRACT_TYPES)),
  minScore: z.number().int().min(0).max(100),
  dailyLimit: z.number().int().min(0).max(200),
  /** Semi-auto : le pipeline prépare les dossiers, l'utilisateur valide et envoie chacun lui-même. */
  semiAuto: z.boolean(),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  categories: [],
  keywords: [],
  cities: [],
  contracts: [],
  minScore: 60,
  dailyLimit: 10,
  semiAuto: true,
};

// ---------------------------------------------------------------- Réponses de candidature

export const REMOTE_OPTIONS = ["none", "hybrid", "full", "flexible"] as const;

/**
 * Réponses saisies par l'utilisateur pour les formulaires de candidature.
 * Claude ne doit JAMAIS les inventer ni les déduire : null = « à demander à l'utilisateur ».
 */
export const applicationAnswersSchema = z
  .object({
    salaryMin: z.number().int().positive().nullable(),
    salaryMax: z.number().int().positive().nullable(),
    availability: z.string().nullable(),
    mobility: z.string().nullable(),
    remote: z.enum(REMOTE_OPTIONS).nullable(),
  })
  .refine((a) => a.salaryMin === null || a.salaryMax === null || a.salaryMin <= a.salaryMax, {
    message: "Le salaire minimum doit être inférieur ou égal au maximum",
    path: ["salaryMax"],
  });

export type ApplicationAnswers = z.infer<typeof applicationAnswersSchema>;

export const EMPTY_ANSWERS: ApplicationAnswers = {
  salaryMin: null,
  salaryMax: null,
  availability: null,
  mobility: null,
  remote: null,
};

// ---------------------------------------------------------------- Profil complet

export const profileSchema = z.object({
  cv: cvSchema,
  preferences: preferencesSchema,
  answers: applicationAnswersSchema,
});

export type Profile = z.infer<typeof profileSchema>;
