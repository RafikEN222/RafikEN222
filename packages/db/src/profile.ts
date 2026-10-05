import {
  type Profile,
  DEFAULT_PREFERENCES,
  EMPTY_ANSWERS,
  emptyCv,
  profileSchema,
} from "@rj/core";
import { sql } from "drizzle-orm";
import type { Db } from "./index";
import { profile } from "./schema";

const PROFILE_ID = 1;

export interface StoredProfile extends Profile {
  cvFileName: string | null;
  updatedAt: string | null;
}

/** Profil enregistré, ou un profil vide si rien n'a encore été enregistré. */
export function getProfile(db: Db): StoredProfile {
  const row = db.select().from(profile).get();
  if (!row) {
    return { cv: emptyCv(), preferences: DEFAULT_PREFERENCES, answers: EMPTY_ANSWERS, cvFileName: null, updatedAt: null };
  }
  // Valide ce qui est en base, en complétant les champs ajoutés depuis.
  const parsed = profileSchema.parse({
    cv: { ...emptyCv(), ...(row.cv as object) },
    preferences: { ...DEFAULT_PREFERENCES, ...(row.preferences as object) },
    answers: { ...EMPTY_ANSWERS, ...(row.answers as object) },
  });
  return { ...parsed, cvFileName: row.cvFileName, updatedAt: row.updatedAt };
}

export function saveProfile(db: Db, input: Profile, cvFileName: string | null): StoredProfile {
  const data = profileSchema.parse(input);
  db.insert(profile)
    .values({ id: PROFILE_ID, ...data, cvFileName })
    .onConflictDoUpdate({
      target: profile.id,
      set: { ...data, cvFileName, updatedAt: sql`(CURRENT_TIMESTAMP)` },
    })
    .run();
  return getProfile(db);
}
