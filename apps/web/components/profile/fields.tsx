"use client";

import type { ReactNode } from "react";

// Champs de formulaire du profil. Convention : une chaîne vide dans l'interface = null en base.

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 " +
  "placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none";

export function Section({ title, description, children, actions }: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, type = "text" }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "email" | "tel" | "url";
}) {
  return (
    <Label label={label} hint={hint}>
      <input
        type={type}
        className={inputClass}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </Label>
  );
}

export function TextArea({ label, value, onChange, rows = 3, hint }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <textarea
        className={inputClass}
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </Label>
  );
}

/** Liste de chaînes éditée comme un texte, une entrée par ligne. */
export function LinesField({ label, value, onChange, rows = 4, hint }: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Label label={label} hint={hint ?? "Une entrée par ligne"}>
      <textarea
        className={inputClass}
        rows={rows}
        value={value.join("\n")}
        // Les lignes vides sont gardées pendant la saisie et retirées à l'enregistrement.
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </Label>
  );
}

export function NumberField({ label, value, onChange, min, max, hint, placeholder }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <input
        type="number"
        inputMode="numeric"
        className={inputClass}
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Math.trunc(Number(e.target.value)))}
      />
    </Label>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, emptyLabel }: {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: readonly { value: T; label: string }[];
  emptyLabel: string;
}) {
  return (
    <Label label={label}>
      <select
        className={inputClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : (e.target.value as T))}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

export function Checkbox({ label, checked, onChange, hint }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-zinc-200"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

export function Button({ children, onClick, variant = "secondary", disabled, type = "button" }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-zinc-100 text-zinc-900 hover:bg-white",
    secondary: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800",
    danger: "text-red-400 hover:bg-red-950/40",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

/** Liste d'éléments répétables (expériences, formations…) avec ajout et suppression. */
export function Repeater<T>({ items, onChange, create, render, addLabel, itemTitle }: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (item: T) => void) => ReactNode;
  addLabel: string;
  itemTitle: (item: T, index: number) => string;
}) {
  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="text-sm text-zinc-500">Aucune entrée.</p>}
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-zinc-300">{itemTitle(item, i)}</span>
            <Button variant="danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              Supprimer
            </Button>
          </div>
          <div className="space-y-4">{render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}</div>
        </div>
      ))}
      <Button onClick={() => onChange([...items, create()])}>{addLabel}</Button>
    </div>
  );
}
