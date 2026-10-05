import { profileSchema } from "@rj/core";
import { getProfile, saveProfile } from "@rj/db";
import { db } from "@/lib/db";

export async function GET() {
  return Response.json(getProfile(db()));
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { cvFileName?: unknown } | null;
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Profil invalide", issues: parsed.error.issues }, { status: 400 });
  }
  const fileName = typeof body?.cvFileName === "string" ? body.cvFileName : null;
  return Response.json(saveProfile(db(), parsed.data, fileName));
}
