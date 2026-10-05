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
   entre deux requêtes (`politeDelay()` dans `apps/worker/src/scraper/politeness.ts`, bornes dans
   `SCRAPE_DELAY_MS` de `@rj/core`). Respecter robots.txt et les CGU de chaque site.
3. **Ne jamais postuler deux fois à la même offre.** Vérifier en base avant de préparer une
   candidature. L'index unique `applications.job_id` et `jobs.dedup_key` (entreprise + titre + lieu
   normalisés) servent de garde-fou : ne pas les contourner.
4. **Ne jamais cliquer sur le bouton d'envoi final** d'un formulaire de candidature. L'applier
   prépare le dossier et peut pré-remplir des champs. L'envoi est toujours fait à la main par
   l'utilisateur, qui passe ensuite la candidature en `submitted`.

### Indeed

Les CGU d'Indeed interdisent l'accès automatisé (bots, scrapers, agents IA) et l'envoi automatisé de
contenu. Pour Indeed : passer par le connecteur officiel (recherche + détail d'une offre) ou par les
e-mails d'alerte, **jamais** par du scraping du site. Les identifiants d'offre renvoyés par le
connecteur ne sont pas stables d'une session à l'autre : dédupliquer avec `dedup_key`.

## Structure (monorepo pnpm, TypeScript)

- `apps/web` : dashboard Next.js (App Router) + Tailwind v4, thème sombre. Pages : Dashboard, Jobs,
  Applications, CV Studio, Sources, Profile, Settings. La navigation est dans `components/nav.ts`.
- `apps/worker` : service Node (lancé avec `tsx`).
  - `scraper/` : récupération des offres par source
  - `matcher/` : notation offre ↔ profil
  - `tailor/` : adaptation du CV
  - `applier/` : préparation des candidatures (sans envoi)
  - `scheduler/` : planification des tâches
- `packages/core` (`@rj/core`) : types partagés, règles (`rules.ts`) et prompts Claude
  (`@rj/core/prompts`).
- `packages/db` (`@rj/db`) : SQLite via `better-sqlite3` + Drizzle ORM. Schéma dans `src/schema.ts`.

Les packages du workspace exportent directement leurs sources `.ts` (pas d'étape de build). Next les
transpile via `transpilePackages` ; le worker les exécute via `tsx`.

## Commandes

```sh
pnpm install
pnpm dev            # dashboard sur http://localhost:3000
pnpm dev:worker     # worker en mode watch
pnpm dev:all        # tout en parallèle
pnpm typecheck      # tsc sur tous les packages
pnpm --filter @rj/db generate   # migrations Drizzle
```

Configuration : copier `.env.example` en `.env` (`ANTHROPIC_API_KEY`, `DATABASE_PATH`). Les données
locales (`data/`, `*.db`) ne sont pas versionnées.

## Conventions

- Textes de l'interface et commentaires en français.
- Next.js 16 : lire `apps/web/AGENTS.md` (docs dans `node_modules/next/dist/docs/`) avant de toucher
  au dashboard.
