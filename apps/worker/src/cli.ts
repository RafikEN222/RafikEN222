// CLI du worker.
//   scrape --company <slug> [--limit N]
//   scrape --all [--limit N]
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createDb, DATA_DIR } from "@rj/db";
import { createIndeedImportSource, runScrape } from "./scraper";

const USAGE = `Usage :
  scrape --company <slug> [--limit N]
  scrape --all [--limit N]`;

async function scrape(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      company: { type: "string" },
      all: { type: "boolean", default: false },
      limit: { type: "string" },
      source: { type: "string", default: "indeed" },
    },
  });

  if (!values.company === !values.all) {
    console.error(USAGE);
    return 2;
  }
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
    console.error("--limit doit être un entier positif");
    return 2;
  }
  if (values.source !== "indeed") {
    console.error(`Source inconnue : ${values.source}`);
    return 2;
  }

  const source = createIndeedImportSource(join(DATA_DIR, "imports"));
  const companies = values.all ? await source.listCompanies() : [values.company!];
  const db = createDb();

  const report = await runScrape({
    db,
    source,
    companies,
    scope: values.all ? "all" : values.company!,
    limit,
    log: (m) => console.log(m),
  });

  console.log(
    `\nRun #${report.runId} [${report.status}] : ${report.jobsFound} trouvée(s), ` +
      `${report.jobsNew} nouvelle(s), ${report.detailsFetched} détail(s) téléchargé(s), ` +
      `${report.errors.length} erreur(s)`,
  );
  return report.status === "failed" || report.status === "stopped" ? 1 : 0;
}

const [command, ...rest] = process.argv.slice(2);
const code = command === "scrape" ? await scrape(rest) : (console.error(USAGE), 2);
process.exit(code);
