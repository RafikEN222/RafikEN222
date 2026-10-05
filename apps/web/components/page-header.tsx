export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </header>
  );
}

export function Placeholder() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
      Pas encore implémenté.
    </div>
  );
}
