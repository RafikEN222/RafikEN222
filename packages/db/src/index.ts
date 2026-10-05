import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export { schema };
export { getProfile, saveProfile } from "./profile";
export * from "./jobs";

/**
 * Racine du monorepo, trouvée en remontant depuis le dossier courant. On n'utilise pas
 * import.meta.url : une fois bundlé par Next, il ne pointe plus vers les sources.
 */
function findRepoRoot(from = process.cwd()): string {
  let dir = resolve(from);
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`pnpm-workspace.yaml introuvable au-dessus de ${from}`);
    dir = parent;
  }
  return dir;
}

const repoRoot = findRepoRoot();
const migrationsFolder = join(repoRoot, "packages/db/migrations");

/** Dossier des données locales (base, imports). Non versionné. */
export const DATA_DIR = process.env.RJ_DATA_DIR ? resolve(process.env.RJ_DATA_DIR) : join(repoRoot, "data");

export function createDb(path = process.env.DATABASE_PATH ?? join(DATA_DIR, "recherche-job.db")) {
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}

export type Db = ReturnType<typeof createDb>;
