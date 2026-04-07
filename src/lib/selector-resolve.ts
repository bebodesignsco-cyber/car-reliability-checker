import { SELECTOR_TREE } from "@/lib/selector-data";

export type ResolvedSelectorContext = {
  makeSlug: string;
  modelSlug: string;
  generationSlug: string;
  makeName: string;
  modelName: string;
  generationLabel: string;
  years: string;
};

export function resolveSelectorContext(
  makeSlug: string,
  modelSlug: string,
  generationSlug: string,
): ResolvedSelectorContext | null {
  const make = SELECTOR_TREE.find((m) => m.slug === makeSlug);
  if (!make) return null;
  const model = make.models.find((mo) => mo.slug === modelSlug);
  if (!model) return null;
  const gen = model.generations.find((g) => g.slug === generationSlug);
  if (!gen) return null;
  return {
    makeSlug,
    modelSlug,
    generationSlug,
    makeName: make.name,
    modelName: model.name,
    generationLabel: gen.label,
    years: gen.years,
  };
}
