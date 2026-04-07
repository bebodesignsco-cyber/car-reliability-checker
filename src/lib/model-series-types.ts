/** One selectable series / generation (Carsales-style chassis code or year span). */
export type ModelSeriesEntry = {
  label: string;
  years: string;
};

/**
 * Nested map: taxonomy make name -> model name -> series list.
 * Make/model keys match `australian_car_taxonomy.json` strings exactly.
 */
export type ModelSeriesDatabase = Record<string, Record<string, ModelSeriesEntry[]>>;
