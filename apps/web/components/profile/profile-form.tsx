"use client";

import {
  type ApplicationAnswers,
  type Cv,
  type Preferences,
  type Profile,
  CONTRACT_TYPES,
  REMOTE_OPTIONS,
} from "@rj/core";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Grid,
  LinesField,
  NumberField,
  Repeater,
  Section,
  SelectField,
  TextArea,
  TextField,
} from "./fields";
import { CONTRACT_LABELS } from "@/lib/labels";

const CV_MAX_BYTES = 5 * 1024 * 1024;

const REMOTE_LABELS: Record<(typeof REMOTE_OPTIONS)[number], string> = {
  none: "Pas de télétravail",
  hybrid: "Hybride",
  full: "Full remote",
  flexible: "Indifférent",
};

export interface ProfileFormProps {
  initial: Profile & { cvFileName: string | null; updatedAt: string | null };
}

type Status =
  | { kind: "idle" }
  | { kind: "extracting" }
  | { kind: "saving" }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string };

// Nettoyage avant enregistrement : espaces en trop, lignes vides, chaînes vides → null.
const s = (v: string | null) => (v === null || v.trim() === "" ? null : v.trim());
const lines = (v: string[]) => v.map((x) => x.trim()).filter(Boolean);

function clean(profile: Profile): Profile {
  const { cv, preferences } = profile;
  return {
    cv: {
      contact: Object.fromEntries(Object.entries(cv.contact).map(([k, v]) => [k, s(v)])) as Cv["contact"],
      summary: s(cv.summary),
      experiences: cv.experiences.map((e) => ({
        title: s(e.title), company: s(e.company), location: s(e.location),
        startDate: s(e.startDate), endDate: s(e.endDate), description: s(e.description), bullets: lines(e.bullets),
      })),
      education: cv.education.map((e) => ({
        degree: s(e.degree), school: s(e.school), location: s(e.location),
        startDate: s(e.startDate), endDate: s(e.endDate), details: s(e.details),
      })),
      skills: lines(cv.skills),
      languages: cv.languages.filter((l) => l.language.trim()).map((l) => ({ language: l.language.trim(), level: s(l.level) })),
      projects: cv.projects.map((p) => ({ name: s(p.name), description: s(p.description), bullets: lines(p.bullets), url: s(p.url) })),
      certifications: cv.certifications.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), issuer: s(c.issuer), date: s(c.date) })),
    },
    preferences: {
      ...preferences,
      categories: lines(preferences.categories),
      keywords: lines(preferences.keywords),
      cities: lines(preferences.cities),
    },
    answers: { ...profile.answers, availability: s(profile.answers.availability), mobility: s(profile.answers.mobility) },
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [cv, setCv] = useState<Cv>(initial.cv);
  const [preferences, setPreferences] = useState<Preferences>(initial.preferences);
  const [answers, setAnswers] = useState<ApplicationAnswers>(initial.answers);
  const [cvFileName, setCvFileName] = useState(initial.cvFileName);
  const [savedAt, setSavedAt] = useState(initial.updatedAt);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);

  // Prévient avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };
  const updateCv = edit(setCv);
  const updatePrefs = edit(setPreferences);
  const updateAnswers = edit(setAnswers);

  async function upload(file: File) {
    if (file.size > CV_MAX_BYTES) {
      setStatus({ kind: "error", message: "Le fichier dépasse 5 Mo." });
      return;
    }
    setStatus({ kind: "extracting" });
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/profile/cv", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setCv(data.cv);
      setCvFileName(data.fileName);
      setDirty(true);
      setStatus({
        kind: "info",
        message: `CV « ${data.fileName} » extrait. Vérifie chaque section, corrige si besoin, puis clique sur Enregistrer.`,
      });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    setStatus({ kind: "saving" });
    const profile = clean({ cv, preferences, answers });
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, cvFileName }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.map((i: { path: string[]; message: string }) => `${i.path.join(".")} : ${i.message}`);
        throw new Error([data.error, ...(detail ?? [])].join(" — "));
      }
      setCv(data.cv);
      setPreferences(data.preferences);
      setAnswers(data.answers);
      setSavedAt(data.updatedAt);
      setDirty(false);
      setStatus({ kind: "info", message: "Profil enregistré." });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  const busy = status.kind === "extracting" || status.kind === "saving";

  return (
    <div className="space-y-6 pb-24">
      <Section
        title="CV"
        description="PDF ou DOCX, 5 Mo maximum. Claude extrait uniquement ce qui est écrit ; rien n'est enregistré avant que tu cliques sur Enregistrer."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button variant="primary" disabled={busy} onClick={() => fileInput.current?.click()}>
            {status.kind === "extracting" ? "Extraction en cours…" : "Importer un CV"}
          </Button>
          <span className="text-sm text-zinc-500">{cvFileName ? `Dernier import : ${cvFileName}` : "Aucun CV importé"}</span>
        </div>
      </Section>

      <Section title="Contact">
        <Grid>
          <TextField label="Nom complet" value={cv.contact.fullName} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, fullName: v } })} />
          <TextField label="Titre" value={cv.contact.headline} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, headline: v } })} />
          <TextField label="E-mail" type="email" value={cv.contact.email} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, email: v } })} />
          <TextField label="Téléphone" type="tel" value={cv.contact.phone} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, phone: v } })} />
          <TextField label="Ville" value={cv.contact.location} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, location: v } })} />
          <TextField label="LinkedIn" type="url" value={cv.contact.linkedin} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, linkedin: v } })} />
          <TextField label="Site web" type="url" value={cv.contact.website} onChange={(v) => updateCv({ ...cv, contact: { ...cv.contact, website: v } })} />
        </Grid>
      </Section>

      <Section title="Résumé">
        <TextArea label="Résumé / accroche" rows={4} value={cv.summary} onChange={(v) => updateCv({ ...cv, summary: v })} />
      </Section>

      <Section title="Expériences">
        <Repeater
          items={cv.experiences}
          onChange={(experiences) => updateCv({ ...cv, experiences })}
          addLabel="Ajouter une expérience"
          itemTitle={(e, i) => [e.title, e.company].filter(Boolean).join(" — ") || `Expérience ${i + 1}`}
          create={() => ({ title: null, company: null, location: null, startDate: null, endDate: null, description: null, bullets: [] })}
          render={(e, set) => (
            <>
              <Grid>
                <TextField label="Poste" value={e.title} onChange={(v) => set({ ...e, title: v })} />
                <TextField label="Entreprise" value={e.company} onChange={(v) => set({ ...e, company: v })} />
                <TextField label="Lieu" value={e.location} onChange={(v) => set({ ...e, location: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Début" value={e.startDate} onChange={(v) => set({ ...e, startDate: v })} />
                  <TextField label="Fin" value={e.endDate} onChange={(v) => set({ ...e, endDate: v })} />
                </div>
              </Grid>
              <TextArea label="Contexte" value={e.description} onChange={(v) => set({ ...e, description: v })} rows={2} />
              <LinesField label="Puces" hint="Une puce par ligne" value={e.bullets} onChange={(v) => set({ ...e, bullets: v })} rows={5} />
            </>
          )}
        />
      </Section>

      <Section title="Formation">
        <Repeater
          items={cv.education}
          onChange={(education) => updateCv({ ...cv, education })}
          addLabel="Ajouter une formation"
          itemTitle={(e, i) => [e.degree, e.school].filter(Boolean).join(" — ") || `Formation ${i + 1}`}
          create={() => ({ degree: null, school: null, location: null, startDate: null, endDate: null, details: null })}
          render={(e, set) => (
            <>
              <Grid>
                <TextField label="Diplôme" value={e.degree} onChange={(v) => set({ ...e, degree: v })} />
                <TextField label="École" value={e.school} onChange={(v) => set({ ...e, school: v })} />
                <TextField label="Lieu" value={e.location} onChange={(v) => set({ ...e, location: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Début" value={e.startDate} onChange={(v) => set({ ...e, startDate: v })} />
                  <TextField label="Fin" value={e.endDate} onChange={(v) => set({ ...e, endDate: v })} />
                </div>
              </Grid>
              <TextArea label="Détails" value={e.details} onChange={(v) => set({ ...e, details: v })} rows={2} />
            </>
          )}
        />
      </Section>

      <Section title="Compétences">
        <LinesField label="Compétences" value={cv.skills} onChange={(skills) => updateCv({ ...cv, skills })} rows={6} />
      </Section>

      <Section title="Langues">
        <Repeater
          items={cv.languages}
          onChange={(languages) => updateCv({ ...cv, languages })}
          addLabel="Ajouter une langue"
          itemTitle={(l, i) => l.language || `Langue ${i + 1}`}
          create={() => ({ language: "", level: null })}
          render={(l, set) => (
            <Grid>
              <TextField label="Langue" value={l.language} onChange={(v) => set({ ...l, language: v ?? "" })} />
              <TextField label="Niveau" value={l.level} onChange={(v) => set({ ...l, level: v })} />
            </Grid>
          )}
        />
      </Section>

      <Section title="Projets">
        <Repeater
          items={cv.projects}
          onChange={(projects) => updateCv({ ...cv, projects })}
          addLabel="Ajouter un projet"
          itemTitle={(p, i) => p.name || `Projet ${i + 1}`}
          create={() => ({ name: null, description: null, bullets: [], url: null })}
          render={(p, set) => (
            <>
              <Grid>
                <TextField label="Nom" value={p.name} onChange={(v) => set({ ...p, name: v })} />
                <TextField label="Lien" type="url" value={p.url} onChange={(v) => set({ ...p, url: v })} />
              </Grid>
              <TextArea label="Description" value={p.description} onChange={(v) => set({ ...p, description: v })} rows={2} />
              <LinesField label="Puces" hint="Une puce par ligne" value={p.bullets} onChange={(v) => set({ ...p, bullets: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Certifications">
        <Repeater
          items={cv.certifications}
          onChange={(certifications) => updateCv({ ...cv, certifications })}
          addLabel="Ajouter une certification"
          itemTitle={(c, i) => c.name || `Certification ${i + 1}`}
          create={() => ({ name: "", issuer: null, date: null })}
          render={(c, set) => (
            <Grid>
              <TextField label="Nom" value={c.name} onChange={(v) => set({ ...c, name: v ?? "" })} />
              <TextField label="Organisme" value={c.issuer} onChange={(v) => set({ ...c, issuer: v })} />
              <TextField label="Date" value={c.date} onChange={(v) => set({ ...c, date: v })} />
            </Grid>
          )}
        />
      </Section>

      <Section title="Préférences de recherche" description="Utilisées pour récupérer et noter les offres.">
        <Grid>
          <LinesField label="Catégories visées" value={preferences.categories} onChange={(categories) => updatePrefs({ ...preferences, categories })} hint="Ex. Data engineering — une par ligne" />
          <LinesField label="Mots-clés" value={preferences.keywords} onChange={(keywords) => updatePrefs({ ...preferences, keywords })} />
          <LinesField label="Villes" value={preferences.cities} onChange={(cities) => updatePrefs({ ...preferences, cities })} />
          <div>
            <span className="mb-2 block text-xs font-medium text-zinc-400">Contrats</span>
            <div className="grid grid-cols-2 gap-2">
              {CONTRACT_TYPES.map((c) => (
                <Checkbox
                  key={c}
                  label={CONTRACT_LABELS[c]}
                  checked={preferences.contracts.includes(c)}
                  onChange={(on) =>
                    updatePrefs({
                      ...preferences,
                      contracts: on ? [...preferences.contracts, c] : preferences.contracts.filter((x) => x !== c),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <NumberField label="Score minimum" min={0} max={100} value={preferences.minScore} onChange={(v) => updatePrefs({ ...preferences, minScore: v ?? 0 })} hint="Les offres sous ce score (0–100) sont ignorées" />
          <NumberField label="Limite par jour" min={0} max={200} value={preferences.dailyLimit} onChange={(v) => updatePrefs({ ...preferences, dailyLimit: v ?? 0 })} hint="Nombre maximum de candidatures préparées par jour" />
        </Grid>
        <Checkbox
          label="Mode semi-auto"
          checked={preferences.semiAuto}
          onChange={(semiAuto) => updatePrefs({ ...preferences, semiAuto })}
          hint="Les dossiers sont préparés automatiquement ; tu valides et tu envoies chaque candidature toi-même."
        />
      </Section>

      <Section
        title="Réponses de candidature"
        description="Saisies par toi uniquement. Claude ne les invente jamais : un champ vide sera signalé comme « à compléter » dans les dossiers."
      >
        <Grid>
          <NumberField label="Prétentions salariales — minimum" placeholder="ex. 45000" value={answers.salaryMin} onChange={(v) => updateAnswers({ ...answers, salaryMin: v })} hint="€ brut annuel" />
          <NumberField label="Prétentions salariales — maximum" placeholder="ex. 55000" value={answers.salaryMax} onChange={(v) => updateAnswers({ ...answers, salaryMax: v })} hint="€ brut annuel" />
          <TextField label="Disponibilité" placeholder="ex. Immédiate, préavis de 3 mois…" value={answers.availability} onChange={(v) => updateAnswers({ ...answers, availability: v })} />
          <TextField label="Mobilité" placeholder="ex. Île-de-France, toute la France…" value={answers.mobility} onChange={(v) => updateAnswers({ ...answers, mobility: v })} />
          <SelectField
            label="Télétravail"
            value={answers.remote}
            onChange={(remote) => updateAnswers({ ...answers, remote })}
            emptyLabel="Non renseigné"
            options={REMOTE_OPTIONS.map((value) => ({ value, label: REMOTE_LABELS[value] }))}
          />
        </Grid>
      </Section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:left-56">
        <div className="flex items-center justify-between gap-4 px-10 py-3">
          <p
            className={
              "text-sm " +
              (status.kind === "error" ? "text-red-400" : status.kind === "info" ? "text-emerald-400" : "text-zinc-400")
            }
          >
            {status.kind === "error" || status.kind === "info"
              ? status.message
              : status.kind === "saving"
                ? "Enregistrement…"
                : dirty
                  ? "Modifications non enregistrées"
                  : savedAt
                    ? `Enregistré (${savedAt} UTC)`
                    : "Jamais enregistré"}
          </p>
          <Button variant="primary" disabled={!dirty || busy} onClick={save}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
