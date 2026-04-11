import type { SelectorGeneration, SelectorModel } from "@/lib/selector-types";
import { isPlaceholderGenerationOnly } from "@/lib/australian-taxonomy-to-selector-tree";

const DEFAULT_YEAR_MIN = 1980;

export type YearRange = {
  start: number;
  end: number;
};

export type GenerationYearMatch = {
  generation: SelectorGeneration;
  ranges: YearRange[];
};

export type ResolveYearToGenerationResult =
  | { kind: "matched"; selected: SelectorGeneration; matches: SelectorGeneration[] }
  | { kind: "no_match"; matches: SelectorGeneration[] };

export function isYearSegment(segment: string): boolean {
  return /^\d{4}$/.test(segment);
}

export function parseYearRanges(raw: string, nowYear: number = new Date().getUTCFullYear()): YearRange[] {
  if (!raw || raw.trim() === "—") return [];
  const normalized = raw
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\bcurrent\b|\bpresent\b|\bnow\b/g, String(nowYear))
    .replace(/\bto\b/g, "-");

  const ranges: YearRange[] = [];
  const rangePattern = /(\d{4})\s*-\s*(\d{4})/g;
  let match: RegExpExecArray | null;
  while ((match = rangePattern.exec(normalized)) !== null) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    ranges.push({
      start: Math.min(start, end),
      end: Math.max(start, end),
    });
  }

  if (ranges.length > 0) return ranges;

  const singlePattern = /\b(\d{4})\b/g;
  while ((match = singlePattern.exec(normalized)) !== null) {
    const year = Number(match[1]);
    if (!Number.isFinite(year)) continue;
    ranges.push({ start: year, end: year });
  }

  return ranges;
}

export function listSelectableYearsForModel(
  model: SelectorModel,
  nowYear: number = new Date().getUTCFullYear(),
): number[] {
  const parseable: YearRange[] = model.generations.flatMap((g) => parseYearRanges(g.years, nowYear));
  if (parseable.length === 0) {
    const out: number[] = [];
    for (let year = nowYear + 1; year >= DEFAULT_YEAR_MIN; year -= 1) {
      out.push(year);
    }
    return out;
  }

  let min = parseable[0]!.start;
  let max = parseable[0]!.end;
  for (const r of parseable) {
    min = Math.min(min, r.start);
    max = Math.max(max, r.end);
  }
  min = Math.max(DEFAULT_YEAR_MIN, min);
  max = Math.min(nowYear + 1, max);

  const out: number[] = [];
  for (let year = max; year >= min; year -= 1) {
    out.push(year);
  }
  return out;
}

export function resolveYearToGeneration(
  model: SelectorModel,
  modelYear: number,
  preferredGenerationSlug?: string | null,
  nowYear: number = new Date().getUTCFullYear(),
): ResolveYearToGenerationResult {
  const parseable = model.generations
    .map((generation): GenerationYearMatch => ({
      generation,
      ranges: parseYearRanges(generation.years, nowYear),
    }))
    .filter((entry) => entry.ranges.length > 0);

  const matchingEntries = parseable.filter((entry) =>
    entry.ranges.some((r) => modelYear >= r.start && modelYear <= r.end),
  );
  const matches = matchingEntries.map((entry) => entry.generation);
  if (matches.length > 0) {
    const preferred = preferredGenerationSlug
      ? matches.find((g) => g.slug === preferredGenerationSlug)
      : undefined;
    return { kind: "matched", selected: preferred ?? matches[0]!, matches };
  }

  if (parseable.length === 0 && isPlaceholderGenerationOnly(model.generations)) {
    return { kind: "matched", selected: model.generations[0]!, matches: [] };
  }

  return { kind: "no_match", matches: [] };
}
