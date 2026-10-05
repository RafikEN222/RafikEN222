import "server-only";
import { createDb, type Db } from "@rj/db";

// Une seule connexion SQLite par processus (survit au rechargement à chaud en dev).
const globalForDb = globalThis as unknown as { rjDb?: Db };

export function db(): Db {
  globalForDb.rjDb ??= createDb();
  return globalForDb.rjDb;
}
