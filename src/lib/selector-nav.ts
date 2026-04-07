import { SELECTOR_TREE } from "@/lib/selector-data";
import type { SelectorMake, SelectorModel } from "@/lib/selector-types";

export function getMakeBySlug(slug: string): SelectorMake | undefined {
  return SELECTOR_TREE.find((m) => m.slug === slug);
}

export function getModelBySlug(
  makeSlug: string,
  modelSlug: string,
): { make: SelectorMake; model: SelectorModel } | undefined {
  const make = getMakeBySlug(makeSlug);
  if (!make) return undefined;
  const model = make.models.find((mo) => mo.slug === modelSlug);
  if (!model) return undefined;
  return { make, model };
}
