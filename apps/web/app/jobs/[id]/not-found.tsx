import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-zinc-400">Cette offre n'existe pas ou a été supprimée.</p>
      <Link href="/jobs" className="mt-4 inline-block text-sm text-zinc-300 hover:text-white">
        ← Retour aux offres
      </Link>
    </div>
  );
}
