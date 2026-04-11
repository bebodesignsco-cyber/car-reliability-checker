import { SELECTOR_TREE } from "@/lib/selector-data";
import { isYearSegment, resolveYearToGeneration } from "@/lib/model-year";

export type ResolvedSelectorContext = {
  makeSlug: string;
  modelSlug: string;
  segmentSlug: string;
  generationSlug: string;
  modelYear?: number;
  makeName: string;
  modelName: string;
  generationLabel: string;
  years: string;
  matchingGenerationSlugs: string[];
  isLegacyGenerationSegment: boolean;
  selectedSeries?: string;
  seriesResolutionMethod?: "local_fallback" | "ai_grounded";
};

export function resolveSelectorContext(
  makeSlug: string,
  modelSlug: string,
  segmentSlug: string,
  preferredGenerationSlug?: string | null,
): ResolvedSelectorContext | null {
  const make = SELECTOR_TREE.find((m) => m.slug === makeSlug);
  if (!make) return null;
  const model = make.models.find((mo) => mo.slug === modelSlug);
  if (!model) return null;
  if (isYearSegment(segmentSlug)) {
    const modelYear = Number(segmentSlug);
    const resolved = resolveYearToGeneration(model, modelYear, preferredGenerationSlug);
    if (resolved.kind !== "matched") return null;
    return {
      makeSlug,
      modelSlug,
      segmentSlug,
      generationSlug: resolved.selected.slug,
      modelYear,
      makeName: make.name,
      modelName: model.name,
      generationLabel: resolved.selected.label,
      years: resolved.selected.years,
      matchingGenerationSlugs: resolved.matches.map((m) => m.slug),
      isLegacyGenerationSegment: false,
    };
  }
  const gen = model.generations.find((g) => g.slug === segmentSlug);
  if (!gen) return null;
  return {
    makeSlug,
    modelSlug,
    segmentSlug,
    generationSlug: gen.slug,
    makeName: make.name,
    modelName: model.name,
    generationLabel: gen.label,
    years: gen.years,
    matchingGenerationSlugs: [gen.slug],
    isLegacyGenerationSegment: true,
  };
}
