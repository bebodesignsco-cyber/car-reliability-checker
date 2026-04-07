import { getModelBySlug } from "@/lib/selector-nav";

export type RelatedGenerationLink = {
  href: string;
  label: string;
  years: string;
};

/**
 * Other generations of the same model (for internal linking).
 */
export function getSiblingGenerationLinks(
  makeSlug: string,
  modelSlug: string,
  currentGenerationSlug: string,
  limit = 8,
): RelatedGenerationLink[] {
  const ctx = getModelBySlug(makeSlug, modelSlug);
  if (!ctx) return [];
  return ctx.model.generations
    .filter((g) => g.slug !== currentGenerationSlug)
    .slice(0, limit)
    .map((g) => ({
      href: `/${makeSlug}/${modelSlug}/${g.slug}`,
      label: g.label,
      years: g.years,
    }));
}
