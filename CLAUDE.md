# Recherche Job

Plateforme personnelle de recherche d'emploi : récupérer des offres, les noter par rapport au profil
de l'utilisateur, adapter son CV à chaque offre et préparer la candidature. L'utilisateur relit et
envoie lui-même chaque candidature.

## Règles non négociables

1. **Ne jamais inventer de contenu de CV.** Aucune expérience, compétence, diplôme, chiffre, date,
   outil ou certification qui ne figure pas dans le CV source ou le profil. On peut seulement
   sélectionner, réordonner, reformuler et mettre en avant l'existant. Un manque par rapport à l'offre
   se signale (`gaps`), il ne se comble pas.
2. **Scraper lentement** : une requête à la fois par site, avec une attente aléatoire de **2 à 5 s**
   entre deux requêtes, 3 tentatives avec backoff, arrêt immédiat du run sur 403/429. Tout accès HTTP
   passe par `createPoliteClient()` (`apps/worker/src/scraper/http.ts`, constantes dans
   `@rj/core/rules`). Respecter robots.txt et les CGU de chaque site.
3. **Ne jamais postuler deux fois à la même offre.** Vérifier en base avant de préparer une
   candidature. L'index unique `applications.job_id` et `jobs.dedup_key` (entreprise + titre + lieu
   normalisés) servent de garde-fou : ne pas les contourner.
4. **Ne jamais cliquer sur le bouton d'envoi final** d'un formulaire de candidature. L'applier
   prépare le dossier et peut pré-remplir des champs. L'envoi est toujours fait à la main par
   l'utilisateur, qui passe ensuite la candidature en `submitted`.
5. **Ne jamais inventer les réponses de candidature** (prétentions salariales, disponibilité,
   mobilité, télétravail). Elles viennent uniquement de `profile.answers`, saisies par
   l'utilisateur. Une valeur `null` se signale « à compléter », elle ne se devine pas.

### Indeed

Les CGU d'Indeed interdisent l'accès automatisé (bots, scrapers, agents IA) et l'envoi automatisé de
contenu. Pour Indeed : passer par le connecteur officiel (recherche + détail d'une offre) ou par les
e-mails d'alerte, **jamais** par du scraping du site. Les identifiants d'offre renvoyés par le
connecteur ne sont pas stables d'une session à l'autre : dédupliquer avec `dedup_key`.

Procédure d'import (source `apps/worker/src/scraper/sources/indeed.ts`) :

1. Avec le connecteur Indeed, `search_jobs` pour l'entreprise, puis enregistrer le champ `result`
   **tel quel** dans `data/imports/indeed/<slug>/listing-NNN.md`.
2. Pour chaque offre de l'entreprise **absente de la base**, `get_job_details` et enregistrer le
   `result` tel quel dans `data/imports/indeed/<slug>/details/<Job Id>.md`. Ne jamais retoucher ces
   fichiers à la main.
3. `pnpm scrape --company <slug>`.

Le connecteur n'expose pas les questions du recruteur (`questions` reste `null`).

## Structure (monorepo pnpm, TypeScript)

- `apps/web` : dashboard Next.js (App Router) + Tailwind v4, thème sombre. Pages : Dashboard, Jobs,
  Applications, CV Studio, Sources, Profile, Settings. La navigation est dans `components/nav.ts`.
- `apps/worker` : service Node (lancé avec `tsx`).
  - `scraper/` : récupération des offres par source
  - `matcher/` : notation offre ↔ profil
  - `tailor/` : adaptation du CV
  - `applier/` : préparation des candidatures (sans envoi)
  - `scheduler/` : planification des tâches
- `packages/core` (`@rj/core`) : types partagés, règles (`rules.ts`), schémas Zod du profil
  (`profile.ts` : CV, préférences, réponses de candidature) et prompts Claude (`@rj/core/prompts`).

### Profil

Un seul profil (table `profile`, id = 1, pas de login). Page `/profile` :
- Import du CV (PDF ou DOCX, 5 Mo max) → `POST /api/profile/cv` → `apps/web/lib/cv-extract.ts`
  (Claude, sortie structurée `cvSchema`, prompt `CV_EXTRACT_SYSTEM_PROMPT`). Le PDF est envoyé tel
  quel ; le DOCX est converti en HTML (mammoth) pour garder les puces. Rien n'est enregistré à
  l'import.
- Enregistrement uniquement via le bouton Enregistrer → `PUT /api/profile` (validé par
  `profileSchema`). Pas de sauvegarde automatique.
- `packages/db` (`@rj/db`) : SQLite via `better-sqlite3` + Drizzle ORM. Schéma dans `src/schema.ts`.
  Après modification du schéma : `pnpm --filter @rj/db generate`. Les migrations s'appliquent
  automatiquement à l'ouverture (`createDb()`). Chaque run du pipeline est tracé dans
  `pipeline_runs`.

Les packages du workspace exportent directement leurs sources `.ts` (pas d'étape de build). Next les
transpile via `transpilePackages` ; le worker les exécute via `tsx`.

### Jobs

- `/jobs` : tableau paginé (25 par page, `JOBS_PAGE_SIZE`), filtres dans l'URL (`q`, `company`,
  `city`, `contract`, `category`, `page`). Requêtes dans `packages/db/src/jobs.ts`.
- `/jobs/[id]` : détail (tags, description complète, questions du recruteur, lien d'origine).
- Les requêtes indépendantes d'une page sont lancées avec `Promise.all`. `better-sqlite3` étant
  synchrone, cela ne parallélise pas vraiment aujourd'hui ; garder ce découpage pour un futur
  driver asynchrone, et garder chaque requête indexée et courte.
- `jobs.city` et `jobs.category` sont dérivés à l'import (`cityFromLocation`, `categorizeJob`
  dans `@rj/core/classify`) : règles par mots-clés du titre, affinables par le matcher.

## Commandes

```sh
pnpm install
pnpm dev            # dashboard sur http://localhost:3000
pnpm dev:worker     # worker en mode watch
pnpm dev:all        # tout en parallèle
pnpm typecheck      # tsc sur tous les packages
pnpm test           # tests (node:test via tsx)
pnpm scrape --company <slug> [--limit N]   # importe les offres d'une entreprise
pnpm scrape --all [--limit N]              # toutes les entreprises de data/imports/indeed/
pnpm --filter @rj/db generate   # migrations Drizzle
pnpm --filter @rj/web extract-cv <fichier>   # extrait un CV et affiche le JSON (sans enregistrer)
```

Configuration : copier `.env.example` en `.env` (`ANTHROPIC_API_KEY`, `DATABASE_PATH`). Le
dashboard Next.js lit `apps/web/.env.local` : y mettre `ANTHROPIC_API_KEY` pour l'import de CV. Les données
locales (`data/`, `*.db`) ne sont pas versionnées.

## Conventions

- Textes de l'interface et commentaires en français.
- Next.js 16 : lire `apps/web/AGENTS.md` (docs dans `node_modules/next/dist/docs/`) avant de toucher
  au dashboard.
