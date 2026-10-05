import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupKey } from "@rj/core";
import { parseDetail, parseListing, toContractType, toIsoDate } from "../src/scraper/sources/indeed";

// Extraits réels (raccourcis) de sorties du connecteur Indeed.
const LISTING = `**Job Title:** Data Engineer H/F
            **Job Id:** JOBSEARCH_100007
            **Company:** GROUPE AFNOR
            **Location:** Saint-Denis (93)
            **Posted on:** September 18, 2026
            **Job Type:** N/A
            **Compensation:** N/A
            **View Job URL:** https://to.indeed.com/aagrmstq4jy7
            

**Job Title:** Data Engineer / Power Platform
            **Job Id:** JOBSEARCH_100008
            **Company:** Haddad Brands Europe
            **Location:** Saint-Denis (93)
            **Posted on:** July 28, 2026
            **Job Type:** Permanent
            **Compensation:** N/A
            **View Job URL:** https://to.indeed.com/aahmqbyc89ny
            `;

const DETAIL = `### Data Engineer H/F
        **View Job URL:** https://to.indeed.com/aabzd2jj6b6w
        **Job Id:** JOBSEARCH_100007
        **Company:** GROUPE AFNOR
        **Location:** Saint-Denis (93)
        **Posted on:** September 18, 2026
        **Job Type:** None
        **Compensation:** None

        Qui sommes-nous ?…

Le contexte

Nos données alimentent plusieurs services.

        `;

describe("connecteur Indeed", () => {
  it("découpe un listing en offres", () => {
    const jobs = parseListing(LISTING);
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0]!["Job Id"], "JOBSEARCH_100007");
    assert.equal(jobs[1]!["Company"], "Haddad Brands Europe");
    assert.equal(jobs[1]!["View Job URL"], "https://to.indeed.com/aahmqbyc89ny");
  });

  it("sépare en-tête et description complète d'un détail", () => {
    const { title, fields, description } = parseDetail(DETAIL);
    assert.equal(title, "Data Engineer H/F");
    assert.equal(fields["Company"], "GROUPE AFNOR");
    assert.equal(fields["Compensation"], "None");
    assert.ok(description.startsWith("Qui sommes-nous ?…"));
    assert.ok(description.endsWith("Nos données alimentent plusieurs services."));
  });

  it("normalise type de contrat et date", () => {
    assert.equal(toContractType("Permanent"), "cdi");
    assert.equal(toContractType("Contrat renouvelable"), "cdd");
    assert.equal(toContractType("Full-time"), null);
    assert.equal(toIsoDate("September 08, 2026"), "2026-09-08");
    assert.equal(toIsoDate(null), null);
  });

  it("donne la même clé de dédup malgré casse, accents et mention H/F", () => {
    const a = dedupKey({ company: "GROUPE AFNOR", title: "Data Engineer H/F", location: "Saint-Denis (93)" });
    const b = dedupKey({ company: "Groupe Afnor", title: "Data Engineer (F/H)", location: "Saint Denis (93)" });
    assert.equal(a, b);
  });
});

describe("classification", async () => {
  const { categorizeJob, cityFromLocation } = await import("@rj/core");

  it("catégorise d'après le titre", () => {
    assert.equal(categorizeJob("Data Engineer PySpark - Data Factory"), "Data Engineering");
    assert.equal(categorizeJob("Ingénieur(e) DBA / Base de données expérimenté(e)"), "Base de données");
    assert.equal(categorizeJob("Consultant DATA / Gouvernance de données"), "Gouvernance / MDM");
    assert.equal(categorizeJob("Consultant(e) Senior - DATA Energie & Telecoms - IDF"), "Conseil data");
    assert.equal(categorizeJob("Stage - Ingénieur(e) Cybersécurité – Protect Data"), "Cybersécurité");
    assert.equal(categorizeJob("Data Scientist (F/H) - Ingénieur statisticien"), "Data Science / IA");
    assert.equal(categorizeJob("Comptable fournisseurs"), null);
  });

  it("extrait la ville du lieu", () => {
    assert.equal(cityFromLocation("Courbevoie (92)"), "Courbevoie");
    assert.equal(cityFromLocation("Paris 13e (75)"), "Paris");
    assert.equal(cityFromLocation("Le Plessis-Robinson (92)"), "Le Plessis-Robinson");
    assert.equal(cityFromLocation(null), null);
  });
});
