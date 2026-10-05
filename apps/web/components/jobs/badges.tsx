import type { ReactNode } from "react";

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  const styles =
    tone === "accent" ? "border-sky-800 bg-sky-950/60 text-sky-300" : "border-zinc-700 bg-zinc-800/60 text-zinc-300";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${styles}`}>{children}</span>;
}

/** Score de 0 à 100 ; vert au-dessus du score minimum du profil. */
export function ScoreBadge({ score, minScore }: { score: number | null; minScore: number }) {
  if (score === null) return <span className="text-zinc-600">—</span>;
  const styles =
    score >= minScore ? "bg-emerald-950 text-emerald-300 ring-emerald-800" : "bg-zinc-800 text-zinc-400 ring-zinc-700";
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ${styles}`}>{score}</span>;
}

export function StatusBadge({ label, isNew }: { label: string; isNew: boolean }) {
  return (
    <span className={`text-xs ${isNew ? "text-sky-300" : "text-zinc-300"}`}>
      {isNew && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-sky-400 align-middle" />}
      {label}
    </span>
  );
}
