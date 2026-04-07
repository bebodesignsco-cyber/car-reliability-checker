/**
 * Cleans `public/top_10_full_taxonomy.json` into project-shaped series data:
 * - Keeps only make/model pairs that exist in `public/australian_car_taxonomy.json`
 * - Drops Wikipedia category pages and non-model rows
 * - Normalizes generation labels and years for the selector
 *
 * Writes:
 * - `public/top10_model_series.json` — merged into the selector (see `src/lib/selector-data.ts`)
 * - `public/top_10_full_taxonomy.json` — compact cleaned copy (same top-level makes, filtered models)
 *
 * Run: npx tsx scripts/clean-top10-taxonomy.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelSeriesDatabase, ModelSeriesEntry } from "../src/lib/model-series-types";

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const RAW_MAKE_TO_TAXONOMY: Record<string, string> = {
  BMW: "Bmw",
  Toyota: "Toyota",
  Ford: "Ford",
  Holden: "Holden",
  Mazda: "Mazda",
  Hyundai: "Hyundai",
  Kia: "Kia",
  Mitsubishi: "Mitsubishi",
  Volkswagen: "Volkswagen",
  Nissan: "Nissan",
};

function isJunkModelKey(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (/^List of/i.test(n)) return true;
  if (/^Template:/i.test(n)) return true;
  if (/^Category:/i.test(n)) return true;
  if (/\svehicles$/i.test(n)) return true;
  if (/^concept vehicles?$/i.test(n)) return true;
  if (/^hybrid vehicles?$/i.test(n)) return true;
  if (/^trucks$/i.test(n)) return true;
  if (/^model codes$/i.test(n)) return true;
  if (/^vehicle series$/i.test(n)) return true;
  if (/^Lexus /i.test(n)) return true;
  if (/^Daihatsu /i.test(n)) return true;
  if (/^Hino /i.test(n)) return true;
  if (/^Scion /i.test(n)) return true;
  if (/^Mini .+vehicles$/i.test(n)) return true;
  if (/Rolls-Royce/i.test(n)) return true;
  if (/^Sauber/i.test(n)) return true;
  if (/^Spotlight/i.test(n)) return true;
  if (/^North American Datsun/i.test(n)) return true;
  if (/^motorcycles$/i.test(n)) return true;
  return false;
}

function isJunkGenerationLabel(label: string, hasAlternatives: boolean): boolean {
  const t = label.trim();
  if (!t) return true;
  if (!hasAlternatives) return false;
  if (/^Toyota Gen$/i.test(t)) return true;
  if (/^Platforms?$/i.test(t)) return true;
  if (/^Further Gen$/i.test(t)) return true;
  if (/^Pages Gen$/i.test(t)) return true;
  if (/^BMW$/i.test(t) && t.length <= 4) return true;
  return false;
}

function cleanYears(y: string): string {
  const t = y.trim();
  if (!t || t.toLowerCase() === "unknown") return "—";
  return t;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\s*;\s*\d{4}\s*$/, "")
    .replace(/,\s*Gen\s*$/i, "")
    .replace(/;\s*Gen\s*$/i, "")
    .trim();
}

function cleanEntries(raw: ModelSeriesEntry[]): ModelSeriesEntry[] {
  let list = raw.map((e) => ({
    label: cleanLabel(e.label),
    years: cleanYears(e.years),
  }));

  const hasAlt = list.length > 1;
  list = list.filter((e) => !isJunkGenerationLabel(e.label, hasAlt));

  const onlyAllGen =
    list.length === 1 && /^all generations$/i.test(list[0]!.label.trim());
  if (onlyAllGen) return [];

  list = list.filter((e) => !/^all generations$/i.test(e.label.trim()));

  if (list.length === 0) return [];

  const seen = new Set<string>();
  const out: ModelSeriesEntry[] = [];
  for (const e of list) {
    const k = normName(e.label);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function loadTaxonomyModelsByMake(): Map<string, Map<string, string>> {
  const path = join(process.cwd(), "public", "australian_car_taxonomy.json");
  const taxonomy = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const byMake = new Map<string, Map<string, string>>();
  for (const [make, value] of Object.entries(taxonomy)) {
    if (!Array.isArray(value)) continue;
    const m = new Map<string, string>();
    for (const model of value) {
      if (typeof model !== "string") continue;
      m.set(normName(model), model);
    }
    byMake.set(make, m);
  }
  return byMake;
}

type RawTop10 = Record<string, Record<string, ModelSeriesEntry[]>>;

function main(): void {
  const rawPath = join(process.cwd(), "public", "top_10_full_taxonomy.json");
  const raw = JSON.parse(readFileSync(rawPath, "utf8")) as RawTop10;
  const taxonomyModels = loadTaxonomyModelsByMake();

  const seriesOut: ModelSeriesDatabase = {};
  const taxonomyShape: Record<string, Record<string, ModelSeriesEntry[]>> = {};

  for (const [rawMake, modelsObj] of Object.entries(raw)) {
    const make = RAW_MAKE_TO_TAXONOMY[rawMake];
    if (!make) continue;
    if (!modelsObj || typeof modelsObj !== "object") continue;

    const allowed = taxonomyModels.get(make);
    if (!allowed || allowed.size === 0) continue;

    /** canonical model name -> aggregated raw entries */
    const merged = new Map<string, ModelSeriesEntry[]>();

    for (const [wikiModel, entries] of Object.entries(modelsObj)) {
      if (!Array.isArray(entries) || entries.length === 0) continue;
      if (isJunkModelKey(wikiModel)) continue;

      const canonical = allowed.get(normName(wikiModel));
      if (!canonical) continue;

      const prev = merged.get(canonical) ?? [];
      merged.set(canonical, prev.concat(entries));
    }

    for (const [canonical, combined] of merged) {
      const cleaned = cleanEntries(combined);
      if (cleaned.length === 0) continue;

      if (!seriesOut[make]) seriesOut[make] = {};
      seriesOut[make]![canonical] = cleaned;

      if (!taxonomyShape[make]) taxonomyShape[make] = {};
      taxonomyShape[make]![canonical] = cleaned;
    }
  }

  const seriesPath = join(process.cwd(), "public", "top10_model_series.json");
  writeFileSync(seriesPath, `${JSON.stringify(seriesOut, null, 2)}\n`, "utf8");

  const cleanedTaxonomyPath = join(process.cwd(), "public", "top_10_full_taxonomy.json");
  writeFileSync(cleanedTaxonomyPath, `${JSON.stringify(taxonomyShape, null, 2)}\n`, "utf8");

  const modelCount = Object.values(seriesOut).reduce(
    (n, models) => n + Object.keys(models).length,
    0,
  );
  console.log(`Wrote ${seriesPath} (${Object.keys(seriesOut).length} makes, ${modelCount} models).`);
  console.log(`Rewrote ${cleanedTaxonomyPath} (compact, taxonomy-aligned).`);
}

main();
