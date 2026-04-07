/**
 * Builds `public/australian_model_series.json` (series / generations per model).
 *
 * 1. When REDBOOK_API_KEY is set: pulls Redbook AU Make → Family → YearGroup for each
 *    make/model pair in `public/australian_car_taxonomy.json` (Carsales-style series).
 * 2. Merges `src/data/series-chassis-overrides.json` on top so chassis codes (e.g. BMW E46)
 *    replace Redbook labels where provided.
 * 3. Optional: set TRY_CARQUERY_FALLBACK=1 to fill remaining gaps via CarQuery (slow).
 *
 * Run: npx tsx scripts/build-model-series-database.ts
 * Loads `.env.local` / `.env` when present.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  RedbookDirectClient,
  rbId,
  rbName,
  rbYearStartEnd,
  yearRangeLabel,
} from "../src/lib/redbook/redbook-client";
import type { ModelSeriesDatabase, ModelSeriesEntry } from "../src/lib/model-series-types";

function loadEnvFiles(): void {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, "utf8");
    for (const line of txt.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function isExcludedTaxonomyKey(key: string): boolean {
  if (key === "Showroom") return true;
  if (key.endsWith(" Lifestyle")) return true;
  if (key.endsWith(" Bodytype")) return true;
  return false;
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function familyMatchesModel(familyName: string, taxonomyModel: string): boolean {
  const a = normName(familyName);
  const b = normName(taxonomyModel);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

function findRedbookMake(
  makeName: string,
  makes: { id: number; name: string }[],
): { id: number; name: string } | undefined {
  const t = normName(makeName);
  const exact = makes.find((m) => normName(m.name) === t);
  if (exact) return exact;
  return makes.find(
    (m) => normName(m.name).includes(t) || t.includes(normName(m.name)),
  );
}

function loadTaxonomyPairs(): { make: string; model: string }[] {
  const taxonomyPath = join(process.cwd(), "public", "australian_car_taxonomy.json");
  const taxonomy = JSON.parse(readFileSync(taxonomyPath, "utf8")) as Record<string, unknown>;
  const pairs: { make: string; model: string }[] = [];
  for (const [make, value] of Object.entries(taxonomy)) {
    if (isExcludedTaxonomyKey(make)) continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    for (const m of value) {
      if (typeof m === "string") pairs.push({ make, model: m });
    }
  }
  return pairs;
}

function loadOverrides(): ModelSeriesDatabase {
  const p = join(process.cwd(), "src", "data", "series-chassis-overrides.json");
  return JSON.parse(readFileSync(p, "utf8")) as ModelSeriesDatabase;
}

function mergeOverrides(
  base: ModelSeriesDatabase,
  overrides: ModelSeriesDatabase,
): ModelSeriesDatabase {
  const out: ModelSeriesDatabase = JSON.parse(JSON.stringify(base)) as ModelSeriesDatabase;
  for (const [make, models] of Object.entries(overrides)) {
    out[make] = { ...out[make], ...models };
  }
  return out;
}

async function fetchRedbookSeries(): Promise<ModelSeriesDatabase> {
  const apiKey = process.env.REDBOOK_API_KEY;
  if (!apiKey) {
    return {};
  }

  const country = (process.env.REDBOOK_COUNTRY ?? "au").toLowerCase();
  const segment = (process.env.REDBOOK_SEGMENT ?? "car").toLowerCase();
  const pauseMs = Number(process.env.REDBOOK_REQUEST_PAUSE_MS ?? "50") || 0;

  const client = new RedbookDirectClient(apiKey);
  const proj = "projection=Id,Name";
  const ygProj = "projection=Id,Name,StartYear,EndYear";

  const makesPath = `/v1/${country}/${segment}/Makes?${proj}`;
  const makesRaw = await client.fetchAllPages<Record<string, unknown>>(makesPath, { pauseMs });
  const makes = makesRaw
    .map((m) => ({ id: rbId(m), name: rbName(m) }))
    .filter((m): m is { id: number; name: string } => m.id !== undefined);

  const pairs = loadTaxonomyPairs();
  const byMake = new Map<string, Set<string>>();
  for (const { make, model } of pairs) {
    if (!byMake.has(make)) byMake.set(make, new Set());
    byMake.get(make)!.add(model);
  }

  const out: ModelSeriesDatabase = {};

  for (const [makeName, modelSet] of byMake) {
    const rbMake = findRedbookMake(makeName, makes);
    if (!rbMake) {
      console.warn(`Redbook: no make match for taxonomy "${makeName}"`);
      continue;
    }

    const familiesPath = `/v1/${country}/${segment}/Families?makeId=${rbMake.id}&${proj}`;
    const familiesRaw = await client.fetchAllPages<Record<string, unknown>>(familiesPath, {
      pauseMs,
    });
    const families = familiesRaw
      .map((f) => ({ id: rbId(f), name: rbName(f) }))
      .filter((f): f is { id: number; name: string } => f.id !== undefined);

    for (const modelName of modelSet) {
      const fam = families.find((f) => familyMatchesModel(f.name, modelName));
      if (!fam) {
        console.warn(`Redbook: no family for ${makeName} / ${modelName}`);
        continue;
      }

      const ygPath = `/v1/${country}/${segment}/YearGroups?familyId=${fam.id}&${ygProj}`;
      const ygRaw = await client.fetchAllPages<Record<string, unknown>>(ygPath, { pauseMs });
      const sorted = [...ygRaw]
        .map((yg) => {
          const id = rbId(yg);
          const { start } = rbYearStartEnd(yg);
          return { yg, id, start: start ?? 0 };
        })
        .filter((row): row is { yg: Record<string, unknown>; id: number; start: number } => row.id !== undefined)
        .sort((a, b) => b.start - a.start);

      const entries: ModelSeriesEntry[] = sorted.map(({ yg }) => {
        const n = rbName(yg);
        const { start, end } = rbYearStartEnd(yg);
        return {
          label: n,
          years: yearRangeLabel(start, end),
        };
      });

      if (entries.length === 0) continue;

      out[makeName] = out[makeName] ?? {};
      out[makeName][modelName] = entries;
    }
  }

  return out;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const overrides = loadOverrides();

  let merged: ModelSeriesDatabase = {};

  if (process.env.REDBOOK_API_KEY) {
    console.log("Fetching series from Redbook (AU)…");
    merged = await fetchRedbookSeries();
    console.log(`Redbook: ${Object.keys(merged).length} makes with at least one model.`);
  } else {
    console.log("No REDBOOK_API_KEY — skipping Redbook (set in .env.local to fill all models).");
  }

  merged = mergeOverrides(merged, overrides);

  const pairs = loadTaxonomyPairs();
  const missing = pairs.filter(({ make, model }) => !merged[make]?.[model]);
  if (missing.length > 0) {
    console.warn(
      `Series missing for ${missing.length} make/model pair(s); the app falls back to one "All variants" option until you add Redbook data or edit src/data/series-chassis-overrides.json.`,
    );
  }

  const outPath = join(process.cwd(), "public", "australian_model_series.json");
  writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
