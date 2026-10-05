"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef } from "react";
import { contractLabel } from "@/lib/labels";

export interface FilterValues {
  q: string;
  company: string;
  city: string;
  contract: string;
  category: string;
}

export interface FilterOptions {
  companies: string[];
  cities: string[];
  contracts: string[];
  categories: string[];
}

const fieldClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none";

/**
 * Formulaire GET classique : les filtres vivent dans l'URL (partageables, bouton retour du navigateur).
 * Les listes déroulantes soumettent dès qu'elles changent ; la recherche texte sur Entrée.
 */
export function JobFilters({ values, options }: { values: FilterValues; options: FilterOptions }) {
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = () => form.current?.requestSubmit();

  // Sans JS, le formulaire GET natif fonctionne ; avec JS, on retire les champs vides de l'URL.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : "/jobs");
  };

  const select = (name: keyof FilterValues, label: string, items: string[], format = (v: string) => v) => (
    <select name={name} defaultValue={values[name]} onChange={submit} className={fieldClass} aria-label={label}>
      <option value="">{label}</option>
      {items.map((v) => (
        <option key={v} value={v}>
          {format(v)}
        </option>
      ))}
    </select>
  );

  const active = Object.values(values).some(Boolean);

  return (
    <form key={JSON.stringify(values)} ref={form} method="get" action="/jobs" onSubmit={onSubmit} className="mb-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name="q"
        defaultValue={values.q}
        placeholder="Rechercher (titre, entreprise, description)…"
        className={`${fieldClass} min-w-72 flex-1`}
      />
      {select("company", "Toutes les entreprises", options.companies)}
      {select("city", "Toutes les villes", options.cities)}
      {select("contract", "Tous les contrats", options.contracts, (v) => contractLabel(v) ?? v)}
      {select("category", "Toutes les catégories", options.categories)}
      <button type="submit" className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-white">
        Filtrer
      </button>
      {active && (
        <Link href="/jobs" className="text-sm text-zinc-400 hover:text-zinc-100">
          Réinitialiser
        </Link>
      )}
    </form>
  );
}
