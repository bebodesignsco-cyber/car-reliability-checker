import type { SelectorMake } from "./selector-types";
import type { ModelSeriesDatabase } from "./model-series-types";
import {
  buildSelectorTreeFromTaxonomy,
  makeHasAnyModelSeriesData,
} from "./australian-taxonomy-to-selector-tree";
import australianCarTaxonomy from "../../public/australian_car_taxonomy.json";
import australianModelSeries from "../../public/australian_model_series.json";
import top10ModelSeries from "../../public/top10_model_series.json";

/**
 * Make/model list from `public/australian_car_taxonomy.json`.
 * Series (generation) options: cleaned Wikipedia-derived rows for the top-volume makes in
 * `public/top10_model_series.json`, then `public/australian_model_series.json` (curated overrides
 * and Redbook output from `npm run build:model-series` with `REDBOOK_API_KEY`). Later layers win
 * on the same make/model key.
 */
function mergeModelSeriesDatabases(
  ...layers: ModelSeriesDatabase[]
): ModelSeriesDatabase {
  const out: ModelSeriesDatabase = {};
  for (const layer of layers) {
    for (const [make, models] of Object.entries(layer)) {
      if (!out[make]) out[make] = {};
      for (const [model, entries] of Object.entries(models)) {
        out[make]![model] = entries;
      }
    }
  }
  return out;
}

const mergedSeries: ModelSeriesDatabase = mergeModelSeriesDatabases(
  top10ModelSeries as ModelSeriesDatabase,
  australianModelSeries as ModelSeriesDatabase,
);

export const SELECTOR_TREE: SelectorMake[] = buildSelectorTreeFromTaxonomy(
  australianCarTaxonomy,
  mergedSeries,
).filter(makeHasAnyModelSeriesData);
