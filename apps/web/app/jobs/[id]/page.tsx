import type { RecruiterQuestion } from "@rj/core";
import { getJob, getJobApplication, getJobMatch } from "@rj/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Tag } from "@/components/jobs/badges";
import { db } from "@/lib/db";
import { contractLabel, formatDate, statusLabel } from "@/lib/labels";

const SOURCE_LABELS: Record<string, string> = { indeed: "Indeed", "france-travail": "France Travail", "email-alert": "Alerte e-mail", manual: "Ajout manuel" };

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  // Requêtes indépendantes lancées ensemble.
  const [job, match, application] = await Promise.all([getJob(db(), id), getJobMatch(db(), id), getJobApplication(db(), id)]);
  if (!job) notFound();

  // Retour à la liste avec les mêmes filtres (seulement un chemin local).
  const back = typeof sp.back === "string" && sp.back.startsWith("?") ? `/jobs${sp.back}` : "/jobs";
  const questions = job.questions as RecruiterQuestion[] | null;

  return (
    <article className="max-w-4xl">
      <Link href={back} className="text-sm text-zinc-400 hover:text-zinc-100">
        ← Retour aux offres
      </Link>

      <header className="mt-4 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-zinc-400">{job.company}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {job.category && <Tag tone="accent">{job.category}</Tag>}
          {(job.city ?? job.location) && <Tag>{job.location ?? job.city}</Tag>}
          {job.contractType && <Tag>{contractLabel(job.contractType)}</Tag>}
          {job.salaryText && <Tag>{job.salaryText}</Tag>}
          {job.postedAt && <Tag>Publiée le {formatDate(job.postedAt)}</Tag>}
          <Tag>Source : {SOURCE_LABELS[job.source] ?? job.source}</Tag>
          <Tag>{match ? `Score ${match.score}/100` : "Non notée"}</Tag>
          <Tag>{statusLabel(application?.status ?? null)}</Tag>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Voir l'offre originale ↗
        </a>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Description</h2>
        <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{job.description}</div>
      </section>

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="mb-3 text-base font-semibold">Questions du recruteur</h2>
        {questions && questions.length > 0 ? (
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            {questions.map((q, i) => (
              <li key={i}>
                <span className="text-zinc-100">{q.label}</span>
                {q.required && <span className="ml-2 text-xs text-amber-400">obligatoire</span>}
                {q.options.length > 0 && <div className="mt-1 text-xs text-zinc-500">Choix : {q.options.join(" · ")}</div>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-500">
            {questions
              ? "Cette offre ne pose pas de question."
              : job.source === "indeed"
                ? "Le connecteur Indeed n'expose pas les questions du recruteur : elles apparaîtront au moment de postuler sur Indeed."
                : "La source ne fournit pas les questions du recruteur pour cette offre."}
          </p>
        )}
      </section>
    </article>
  );
}
