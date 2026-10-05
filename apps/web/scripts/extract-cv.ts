// Extrait un CV en ligne de commande et affiche le JSON (rien n'est enregistré).
//   pnpm --filter @rj/web extract-cv <fichier.pdf|fichier.docx>
// Nécessite ANTHROPIC_API_KEY.
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { extractCv } from "../lib/cv-extract";

const file = process.argv[2];
if (!file) {
  console.error("Usage : extract-cv <fichier.pdf|fichier.docx>");
  process.exit(2);
}
const path = resolve(process.env.INIT_CWD ?? process.cwd(), file);
const cv = await extractCv(basename(path), new Uint8Array(await readFile(path)));
console.log(JSON.stringify(cv, null, 2));
