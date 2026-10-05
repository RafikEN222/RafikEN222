// Utilisé par la route /api/profile/cv et par scripts/extract-cv.ts (pas de "server-only" pour ce dernier).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { type Cv, cvSchema } from "@rj/core";
import { CV_EXTRACT_SYSTEM_PROMPT, CV_EXTRACT_USER_PROMPT } from "@rj/core/prompts";
import mammoth from "mammoth";

export const CV_MAX_BYTES = 5 * 1024 * 1024;
const MODEL = "claude-opus-5-5";

export class CvUploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CvUploadError";
  }
}

type CvKind = "pdf" | "docx";

/** Vérifie taille, extension et signature du fichier (pas seulement le type MIME annoncé). */
export function detectCvKind(fileName: string, bytes: Uint8Array): CvKind {
  if (bytes.byteLength === 0) throw new CvUploadError("Le fichier est vide.");
  if (bytes.byteLength > CV_MAX_BYTES) throw new CvUploadError("Le fichier dépasse 5 Mo.", 413);
  const ext = fileName.toLowerCase().split(".").pop();
  const head = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  if (ext === "pdf" && head === "%PDF-") return "pdf";
  if (ext === "docx" && head.startsWith("PK\x03\x04")) return "docx";
  throw new CvUploadError("Format non pris en charge : envoie un PDF ou un DOCX.", 415);
}

async function cvContent(kind: CvKind, bytes: Uint8Array): Promise<Anthropic.Beta.BetaContentBlockParam> {
  if (kind === "pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") },
    };
  }
  // HTML plutôt que texte brut : garde les listes à puces et les titres de section.
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  if (!html.trim()) throw new CvUploadError("Le DOCX ne contient pas de texte lisible.", 422);
  return { type: "document", source: { type: "text", media_type: "text/plain", data: html } };
}

/** Extrait le CV avec Claude (sortie structurée). Rien n'est enregistré ici. */
export async function extractCv(
  fileName: string,
  bytes: Uint8Array,
  client: Anthropic = new Anthropic(),
): Promise<Cv> {
  const kind = detectCvKind(fileName, bytes);
  const document = await cvContent(kind, bytes);

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(cvSchema) },
    // En cas de refus par les filtres de sécurité, l'API relance la requête sur un modèle de repli.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: CV_EXTRACT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: [document, { type: "text", text: CV_EXTRACT_USER_PROMPT }] }],
  });

  if (response.stop_reason === "refusal") {
    throw new CvUploadError("Claude a refusé de traiter ce document.", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new CvUploadError("Le CV est trop long pour être extrait en une fois.", 422);
  }
  if (!response.parsed_output) {
    throw new CvUploadError("La réponse de Claude ne respecte pas le format attendu.", 502);
  }
  return response.parsed_output;
}
