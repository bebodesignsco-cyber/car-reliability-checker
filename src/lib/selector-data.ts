import type { SelectorMake } from "./selector-types";
import type { ModelSeriesDatabase } from "./model-series-types";
import { buildSelectorTreeFromTaxonomy } from "./australian-taxonomy-to-selector-tree";
import australianCarTaxonomy from "../../public/australian_car_taxonomy.json";
import australianModelSeries from "../../public/australian_model_series.json";

/**
 * Make/model list from `public/australian_car_taxonomy.json`.
 * Series (generation) options from `public/australian_model_series.json` — chassis overrides in
 * `src/data/series-chassis-overrides.json`, merged with Redbook AU YearGroups when you run
 * `npm run build:model-series` with `REDBOOK_API_KEY` in `.env.local`.
 */
export const SELECTOR_TREE: SelectorMake[] = buildSelectorTreeFromTaxonomy(
  australianCarTaxonomy,
  australianModelSeries as ModelSeriesDatabase,
);
