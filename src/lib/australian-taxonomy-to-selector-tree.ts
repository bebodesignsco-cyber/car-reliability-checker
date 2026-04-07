import type { ModelSeriesDatabase, ModelSeriesEntry } from "./model-series-types";
import type { SelectorGeneration, SelectorMake } from "./selector-types";
import { urlSegmentSlug } from "./url-segment-slug";

const DEFAULT_GENERATION = {
  slug: "all",
  label: "All variants",
  years: "—",
} as const;

/** Meta rows in `australian_car_taxonomy.json` that are not manufacturer names. */
function isExcludedTaxonomyKey(key: string): boolean {
  if (key === "Showroom") return true;
  if (key.endsWith(" Lifestyle")) return true;
  if (key.endsWith(" Bodytype")) return true;
  return false;
}

function uniqueSlug(base: string, used: Set<string>): string {
  const first = base.length > 0 ? base : "x";
  if (!used.has(first)) {
    used.add(first);
    return first;
  }
  let n = 2;
  let candidate = `${first}-${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${first}-${n}`;
  }
  used.add(candidate);
  return candidate;
}

function entriesToGenerations(entries: ModelSeriesEntry[]): SelectorGeneration[] {
  const used = new Set<string>();
  return entries.map((e) => ({
    slug: uniqueSlug(urlSegmentSlug(e.label), used),
    label: e.label,
    years: e.years,
  }));
}

function resolveGenerationsForModel(
  makeName: string,
  modelName: string,
  seriesDb: ModelSeriesDatabase | undefined,
): SelectorGeneration[] {
  const entries = seriesDb?.[makeName]?.[modelName];
  if (entries && entries.length > 0) {
    return entriesToGenerations(entries);
  }
  return [{ ...DEFAULT_GENERATION }];
}

/** True when the model has no series DB row and only the "All variants" fallback. */
export function isPlaceholderGenerationOnly(
  generations: SelectorGeneration[],
): boolean {
  return (
    generations.length === 1 &&
    generations[0]!.slug === DEFAULT_GENERATION.slug &&
    generations[0]!.label === DEFAULT_GENERATION.label
  );
}

/** True when at least one model under this make has real series / generation options. */
export function makeHasAnyModelSeriesData(make: SelectorMake): boolean {
  return make.models.some((m) => !isPlaceholderGenerationOnly(m.generations));
}

/**
 * Build the selector tree from `public/australian_car_taxonomy.json` and
 * `public/australian_model_series.json` (per-model series / chassis codes).
 */
export function buildSelectorTreeFromTaxonomy(
  taxonomy: Record<string, unknown>,
  seriesDb?: ModelSeriesDatabase,
): SelectorMake[] {
  const globalMakeSlugs = new Set<string>();
  const pairs = Object.entries(taxonomy).filter(
    ([key, value]) =>
      !isExcludedTaxonomyKey(key) &&
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item): item is string => typeof item === "string"),
  ) as [string, string[]][];

  pairs.sort((a, b) => a[0].localeCompare(b[0], "en"));

  const tree: SelectorMake[] = [];
  for (const [makeName, modelNames] of pairs) {
    const makeSlug = uniqueSlug(urlSegmentSlug(makeName), globalMakeSlugs);
    const modelSlugs = new Set<string>();
    const models = [...modelNames]
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((modelName) => ({
        slug: uniqueSlug(urlSegmentSlug(modelName), modelSlugs),
        name: modelName,
        generations: resolveGenerationsForModel(makeName, modelName, seriesDb),
      }));

    tree.push({
      slug: makeSlug,
      name: makeName,
      models,
    });
  }

  return tree;
}
