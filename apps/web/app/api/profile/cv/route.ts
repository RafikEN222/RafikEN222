import Anthropic from "@anthropic-ai/sdk";
import { CV_MAX_BYTES, CvUploadError, extractCv } from "@/lib/cv-extract";

// Extrait le CV envoyé et renvoie le JSON. Rien n'est enregistré : l'utilisateur relit
// le formulaire puis clique sur Enregistrer.
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > CV_MAX_BYTES + 64 * 1024) {
    return Response.json({ error: "Le fichier dépasse 5 Mo." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Aucun fichier reçu (champ « file »)." }, { status: 400 });
  }

  try {
    const cv = await extractCv(file.name, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ cv, fileName: file.name });
  } catch (err) {
    if (err instanceof CvUploadError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Clé API Claude absente ou invalide (ANTHROPIC_API_KEY)." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Limite de l'API Claude atteinte, réessaie dans un instant." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Erreur de l'API Claude (${err.status ?? "réseau"}).` }, { status: 502 });
    }
    // Ex. aucune clé configurée : ANTHROPIC_API_KEY dans apps/web/.env.local.
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Extraction impossible : ${message}` }, { status: 500 });
  }
}
