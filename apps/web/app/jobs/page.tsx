import { countJobs, getProfile, type JobFilters as Filters, jobFilterOptions, JOBS_PAGE_SIZE, listJobs } from "@rj/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ScoreBadge, StatusBadge } from "@/components/jobs/badges";
import { JobFilters } from "@/components/jobs/filters";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { contractLabel, formatDate, statusLabel } from "@/lib/labels";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const sp = await searchParams;
  const filters = { q: one(sp.q), company: one(sp.company), city: one(sp.city), contract: one(sp.contract), category: one(sp.category) };
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  // Requêtes indépendantes lancées ensemble.
  const [rows, total, options, profile] = await Promise.all([
    listJobs(db(), filters satisfies Filters, page),
    countJobs(db(), filters),
    jobFilterOptions(db()),
    Promise.resolve().then(() => getProfile(db())),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE));

  const query = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page, ...overrides })) {
      if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };
  const back = query({});

  // Page au-delà de la fin (ex. après avoir resserré les filtres) : on va à la dernière page.
  if (page > pageCount) redirect(`/jobs${query({ page: pageCount })}`);

  return (
    <>
      <PageHeader title="Jobs" description="Offres récupérées, notées par rapport à ton profil." />
      <JobFilters values={filters} options={options} />

      <p className="mb-3 text-sm text-zinc-400">
        {total} offre{total > 1 ? "s" : ""}
        {pageCount > 1 && ` · page ${page} sur ${pageCount}`}
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Offre</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Ville</th>
              <th className="px-4 py-3 font-medium">Contrat</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((job) => (
              <tr key={job.id} className="hover:bg-zinc-900/60">
                <td className="max-w-md px-4 py-3">
                  <Link
                    href={`/jobs/${job.id}${back ? `?back=${encodeURIComponent(back)}` : ""}`}
                    className="font-medium text-zinc-100 hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {job.company}
                    {job.postedAt && ` · ${formatDate(job.postedAt)}`}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{job.category ?? <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-zinc-300">{job.city ?? <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-zinc-300">{contractLabel(job.contractType) ?? <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3">
                  <ScoreBadge score={job.score} minScore={profile.preferences.minScore} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge label={statusLabel(job.status)} isNew={job.status === null} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Aucune offre ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/jobs${query({ page: page - 1 })}`} className="text-zinc-300 hover:text-white">
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          {page < pageCount && (
            <Link href={`/jobs${query({ page: page + 1 })}`} className="text-zinc-300 hover:text-white">
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
