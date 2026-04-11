import { getModelBySlug } from "@/lib/selector-nav";
import { isYearSegment, listSelectableYearsForModel } from "@/lib/model-year";

export type RelatedGenerationLink = {
  href: string;
  label: string;
};

/**
 * Other generations of the same model (for internal linking).
 */
export function getSiblingGenerationLinks(
  makeSlug: string,
  modelSlug: string,
  currentSegment: string,
  limit = 8,
): RelatedGenerationLink[] {
  const ctx = getModelBySlug(makeSlug, modelSlug);
  if (!ctx) return [];
  if (isYearSegment(currentSegment)) {
    const currentYear = Number(currentSegment);
    return listSelectableYearsForModel(ctx.model)
      .filter((year) => year !== currentYear)
      .slice(0, limit)
      .map((year) => ({
        href: `/${makeSlug}/${modelSlug}/${year}`,
        label: `Model year ${year}`,
      }));
  }
  return ctx.model.generations
    .filter((g) => g.slug !== currentSegment)
    .slice(0, limit)
    .map((g) => ({
      href: `/${makeSlug}/${modelSlug}/${g.slug}`,
      label: `${g.label} (${g.years})`,
    }));
}
