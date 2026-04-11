import { generateSeriesCandidatesWithGrounding, type SeriesCandidate } from "@/lib/generate-reliability-report";
import { parseYearRanges } from "@/lib/model-year";
import { getModelBySlug } from "@/lib/selector-nav";
import type { ReportSource } from "@/types";
import { urlSegmentSlug } from "@/lib/url-segment-slug";

export type SeriesPrecheckStatus = "single" | "multiple" | "none";

export type SeriesPrecheckResult = {
  status: SeriesPrecheckStatus;
  candidates: SeriesCandidate[];
  resolutionMethod: "local_fallback" | "ai_grounded";
  sources: ReportSource[];
};

function uniqueCandidates(candidates: SeriesCandidate[]): SeriesCandidate[] {
  const out: SeriesCandidate[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push(c);
  }
  return out;
}

function fromLocalFallback(makeSlug: string, modelSlug: string, modelYear: number): SeriesPrecheckResult | null {
  const ctx = getModelBySlug(makeSlug, modelSlug);
  if (!ctx) return null;

  const parseableMatches: SeriesCandidate[] = [];
  for (const generation of ctx.model.generations) {
    const ranges = parseYearRanges(generation.years);
    if (ranges.some((r) => modelYear >= r.start && modelYear <= r.end)) {
      parseableMatches.push({
        slug: generation.slug,
        label: generation.label,
        years: generation.years,
        sourceUris: [],
      });
    }
  }
  if (parseableMatches.length === 1) {
    return {
      status: "single",
      candidates: parseableMatches,
      resolutionMethod: "local_fallback",
      sources: [],
    };
  }
  if (parseableMatches.length > 1) {
    return {
      status: "multiple",
      candidates: parseableMatches,
      resolutionMethod: "local_fallback",
      sources: [],
    };
  }
  return null;
}

function localLabelsFallback(makeSlug: string, modelSlug: string): SeriesCandidate[] {
  const ctx = getModelBySlug(makeSlug, modelSlug);
  if (!ctx) return [];
  return ctx.model.generations
    .filter((g) => g.label.toLowerCase() !== "all variants")
    .map((g) => ({
      slug: g.slug || urlSegmentSlug(g.label),
      label: g.label,
      years: g.years,
      sourceUris: [],
    }));
}

export async function resolveSeriesCandidates(
  makeSlug: string,
  modelSlug: string,
  modelYear: number,
): Promise<SeriesPrecheckResult> {
  const local = fromLocalFallback(makeSlug, modelSlug, modelYear);
  if (local) return local;

  const modelCtx = getModelBySlug(makeSlug, modelSlug);
  if (!modelCtx) {
    return { status: "none", candidates: [], resolutionMethod: "local_fallback", sources: [] };
  }

  try {
    const ai = await generateSeriesCandidatesWithGrounding(
      modelCtx.make.name,
      modelCtx.model.name,
      modelYear,
    );
    const candidates = uniqueCandidates(ai.candidates);
    if (candidates.length === 1) {
      return {
        status: "single",
        candidates,
        resolutionMethod: "ai_grounded",
        sources: ai.sources,
      };
    }
    if (candidates.length > 1) {
      return {
        status: "multiple",
        candidates,
        resolutionMethod: "ai_grounded",
        sources: ai.sources,
      };
    }
  } catch {
    // Fall back to local labels if AI precheck fails.
  }

  const fallback = uniqueCandidates(localLabelsFallback(makeSlug, modelSlug));
  if (fallback.length === 1) {
    return {
      status: "single",
      candidates: fallback,
      resolutionMethod: "local_fallback",
      sources: [],
    };
  }
  if (fallback.length > 1) {
    return {
      status: "multiple",
      candidates: fallback,
      resolutionMethod: "local_fallback",
      sources: [],
    };
  }
  return { status: "none", candidates: [], resolutionMethod: "local_fallback", sources: [] };
}
