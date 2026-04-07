/**
 * Build `src/lib/selector-data.ts` from Redbook Direct (Make → Family → YearGroup).
 *
 * Environment:
 * - REDBOOK_API_KEY — required (from Redbook Commercial)
 * - REDBOOK_COUNTRY — default `au`
 * - REDBOOK_SEGMENT — default `car`
 * - REDBOOK_MAKE_IDS — optional comma-separated make ids (limits scope)
 * - REDBOOK_MAX_MAKES — optional cap after filtering (useful for testing)
 * - REDBOOK_REQUEST_PAUSE_MS — optional delay between paginated calls (default 50)
 *
 * Loads `.env.local` / `.env` from the project root when present.
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
import type { SelectorMake } from "../src/lib/selector-types";
import { urlSegmentSlug } from "../src/lib/url-segment-slug";

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

function uniqueSlug(base: string, id: number, used: Set<string>): string {
  let candidate = base;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  candidate = `${base}-rb${id}`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  let n = 2;
  let final = `${candidate}-${n}`;
  while (used.has(final)) {
    n += 1;
    final = `${candidate}-${n}`;
  }
  used.add(final);
  return final;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const apiKey = process.env.REDBOOK_API_KEY;
  if (!apiKey) {
    console.error("Missing REDBOOK_API_KEY. Add it to .env.local or the environment.");
    process.exit(1);
  }

  const country = (process.env.REDBOOK_COUNTRY ?? "au").toLowerCase();
  const segment = (process.env.REDBOOK_SEGMENT ?? "car").toLowerCase();
  const pauseMs = Number(process.env.REDBOOK_REQUEST_PAUSE_MS ?? "50") || 0;
  const makeIdsFilter = process.env.REDBOOK_MAKE_IDS
    ? new Set(
        process.env.REDBOOK_MAKE_IDS.split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => Number(s)),
      )
    : null;
  const maxMakes = process.env.REDBOOK_MAX_MAKES
    ? Number(process.env.REDBOOK_MAX_MAKES)
    : undefined;

  const client = new RedbookDirectClient(apiKey);
  const proj = "projection=Id,Name";
  const ygProj = "projection=Id,Name,StartYear,EndYear";

  const makesPath = `/v1/${country}/${segment}/Makes?${proj}`;
  const makesRaw = await client.fetchAllPages<Record<string, unknown>>(makesPath, { pauseMs });
  let makes = makesRaw
    .map((m) => ({ id: rbId(m), name: rbName(m) }))
    .filter((m): m is { id: number; name: string } => m.id !== undefined);
  if (makeIdsFilter) {
    makes = makes.filter((m) => makeIdsFilter.has(m.id));
  }
  if (maxMakes !== undefined && Number.isFinite(maxMakes)) {
    makes = makes.slice(0, maxMakes);
  }

  const tree: SelectorMake[] = [];
  const makeSlugs = new Set<string>();

  for (const make of makes) {
    const makeSlug = uniqueSlug(urlSegmentSlug(make.name), make.id, makeSlugs);
    const familiesPath = `/v1/${country}/${segment}/Families?makeId=${make.id}&${proj}`;
    const familiesRaw = await client.fetchAllPages<Record<string, unknown>>(familiesPath, {
      pauseMs,
    });
    const families = familiesRaw
      .map((f) => ({ id: rbId(f), name: rbName(f) }))
      .filter((f): f is { id: number; name: string } => f.id !== undefined);

    const modelSlugs = new Set<string>();
    const models: SelectorMake["models"] = [];

    for (const fam of families) {
      const modelSlug = uniqueSlug(urlSegmentSlug(fam.name), fam.id, modelSlugs);
      const ygPath = `/v1/${country}/${segment}/YearGroups?familyId=${fam.id}&${ygProj}`;
      const ygRaw = await client.fetchAllPages<Record<string, unknown>>(ygPath, { pauseMs });
      const genSlugs = new Set<string>();

      const sortedYg = [...ygRaw]
        .map((yg) => {
          const ygId = rbId(yg);
          const { start } = rbYearStartEnd(yg);
          return { yg, ygId, start: start ?? 0 };
        })
        .filter((row): row is { yg: Record<string, unknown>; ygId: number; start: number } => row.ygId !== undefined)
        .sort((a, b) => b.start - a.start);

      const generations: SelectorMake["models"][number]["generations"] = [];

      for (const { yg, ygId } of sortedYg) {
        const n = rbName(yg);
        const { start, end } = rbYearStartEnd(yg);
        const ys = yearRangeLabel(start, end);
        const slug = uniqueSlug(urlSegmentSlug(n), ygId, genSlugs);
        generations.push({
          slug,
          label: n,
          years: ys,
          redbookYearGroupId: ygId,
        });
      }

      if (generations.length === 0) continue;

      models.push({
        slug: modelSlug,
        name: fam.name,
        redbookFamilyId: fam.id,
        generations,
      });
    }

    if (models.length === 0) continue;

    tree.push({
      slug: makeSlug,
      name: make.name,
      redbookMakeId: make.id,
      models: models.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  tree.sort((a, b) => a.name.localeCompare(b.name));

  const outPath = join(process.cwd(), "src", "lib", "selector-data.ts");
  const file = `/* eslint-disable */
// Generated by scripts/fetch-redbook-selector.ts — do not edit by hand.
// Regenerate: npm run generate:selector

import type { SelectorMake } from "./selector-types";

export const SELECTOR_TREE: SelectorMake[] = ${JSON.stringify(tree, null, 2)};
`;
  writeFileSync(outPath, file, "utf8");
  console.log(`Wrote ${tree.length} makes to ${outPath}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
