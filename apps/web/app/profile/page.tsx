import { getProfile } from "@rj/db";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  await connection(); // lu à chaque requête, jamais prérendu
  const profile = getProfile(db());
  return (
    <>
      <PageHeader title="Profile" description="Ton CV structuré, tes préférences de recherche et tes réponses de candidature." />
      <ProfileForm initial={profile} />
    </>
  );
}
