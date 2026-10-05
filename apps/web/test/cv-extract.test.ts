import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { emptyCv } from "@rj/core";
import { CV_EXTRACT_SYSTEM_PROMPT } from "@rj/core/prompts";
import { CV_MAX_BYTES, CvUploadError, detectCvKind, extractCv } from "../lib/cv-extract";

const fixture = (name: string) => readFile(new URL(`./fixtures/${name}`, import.meta.url)).then((b) => new Uint8Array(b));

/** Client simulé : capture la requête et renvoie une réponse fixe. */
function fakeClient(response: Record<string, unknown>) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        parse: async (params: Record<string, unknown>) => {
          calls.push(params);
          return response;
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

describe("detectCvKind", () => {
  it("accepte PDF et DOCX d'après la signature du fichier", async () => {
    assert.equal(detectCvKind("cv.pdf", await fixture("faux-cv.pdf")), "pdf");
    assert.equal(detectCvKind("cv.DOCX", await fixture("faux-cv.docx")), "docx");
  });

  it("refuse les fichiers vides, trop gros, ou dont le contenu ne correspond pas", async () => {
    const reject = (name: string, bytes: Uint8Array, status: number) =>
      assert.throws(() => detectCvKind(name, bytes), (e) => e instanceof CvUploadError && e.status === status);
    reject("cv.pdf", new Uint8Array(), 400);
    reject("cv.pdf", new Uint8Array(CV_MAX_BYTES + 1), 413);
    reject("cv.pdf", new TextEncoder().encode("hello"), 415);
    reject("cv.docx", await fixture("faux-cv.pdf"), 415);
    reject("cv.txt", new TextEncoder().encode("%PDF-1.7"), 415);
  });
});

describe("extractCv", () => {
  const parsed = { ...emptyCv(), contact: { ...emptyCv().contact, fullName: "Camille Fictif" } };

  it("envoie le PDF tel quel avec le schéma, le prompt et le repli", async () => {
    const { client, calls } = fakeClient({ stop_reason: "end_turn", parsed_output: parsed });
    const cv = await extractCv("faux-cv.pdf", await fixture("faux-cv.pdf"), client);
    assert.equal(cv.contact.fullName, "Camille Fictif");

    const params = calls[0] as {
      model: string;
      system: string;
      fallbacks: string;
      output_config: { format: { type: string; schema: { required: string[] } } };
      messages: { content: { type: string; source: { type: string; media_type: string } }[] }[];
    };
    assert.equal(params.model, "claude-opus-5-5");
    assert.equal(params.system, CV_EXTRACT_SYSTEM_PROMPT);
    assert.equal(params.fallbacks, "default");
    assert.equal(params.output_config.format.type, "json_schema");
    assert.deepEqual(
      [...params.output_config.format.schema.required].sort(),
      ["certifications", "contact", "education", "experiences", "languages", "projects", "skills", "summary"],
    );
    const doc = params.messages[0]!.content[0]!;
    assert.deepEqual([doc.type, doc.source.type, doc.source.media_type], ["document", "base64", "application/pdf"]);
  });

  it("convertit le DOCX en HTML en gardant les puces", async () => {
    const { client, calls } = fakeClient({ stop_reason: "end_turn", parsed_output: parsed });
    await extractCv("faux-cv.docx", await fixture("faux-cv.docx"), client);
    const doc = (calls[0] as { messages: { content: { source: { type: string; data: string } }[] }[] }).messages[0]!
      .content[0]!;
    assert.equal(doc.source.type, "text");
    assert.match(doc.source.data, /<li>Conception de 12 tableaux de bord Power BI/);
    assert.match(doc.source.data, /Camille Fictif/);
  });

  it("signale un refus, une réponse tronquée ou hors format", async () => {
    for (const response of [
      { stop_reason: "refusal", parsed_output: null },
      { stop_reason: "max_tokens", parsed_output: null },
      { stop_reason: "end_turn", parsed_output: null },
    ]) {
      const { client } = fakeClient(response);
      await assert.rejects(extractCv("cv.pdf", await fixture("faux-cv.pdf"), client), CvUploadError);
    }
  });
});
