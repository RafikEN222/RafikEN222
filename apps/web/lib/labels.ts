import type { ApplicationStatus, ContractType } from "@rj/core";

export const CONTRACT_LABELS: Record<ContractType, string> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  internship: "Stage",
  apprenticeship: "Alternance",
  other: "Autre",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  to_review: "À étudier",
  preparing: "En préparation",
  ready: "Prête à envoyer",
  submitted: "Envoyée",
  interview: "Entretien",
  rejected: "Refusée",
  offer: "Offre reçue",
  withdrawn: "Abandonnée",
};

export function contractLabel(value: string | null) {
  return value ? (CONTRACT_LABELS[value as ContractType] ?? value) : null;
}

/** Une offre sans candidature est « Nouvelle ». */
export function statusLabel(value: string | null) {
  return value ? (STATUS_LABELS[value as ApplicationStatus] ?? value) : "Nouvelle";
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
}
