import { SELECTOR_TREE } from "@/lib/selector-data";

export type GenerationPath = {
  make: string;
  model: string;
  generation: string;
};

/**
 * All indexable `/{make}/{model}/{generation}` paths from the selector tree.
 */
export function getAllGenerationPaths(): GenerationPath[] {
  const out: GenerationPath[] = [];
  for (const make of SELECTOR_TREE) {
    for (const model of make.models) {
      for (const gen of model.generations) {
        out.push({
          make: make.slug,
          model: model.slug,
          generation: gen.slug,
        });
      }
    }
  }
  return out;
}
