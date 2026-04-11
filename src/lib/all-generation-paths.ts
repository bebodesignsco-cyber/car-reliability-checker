import { SELECTOR_TREE } from "@/lib/selector-data";
import { listSelectableYearsForModel } from "@/lib/model-year";

export type GenerationPath = {
  make: string;
  model: string;
  segment: string;
};

/**
 * Indexable year paths for sitemap. Limited to recent windows to avoid very large URL sets.
 */
export function getAllYearPaths(limitPerModel = 10): GenerationPath[] {
  const out: GenerationPath[] = [];
  for (const make of SELECTOR_TREE) {
    for (const model of make.models) {
      for (const year of listSelectableYearsForModel(model).slice(0, limitPerModel)) {
        out.push({
          make: make.slug,
          model: model.slug,
          segment: String(year),
        });
      }
    }
  }
  return out;
}
