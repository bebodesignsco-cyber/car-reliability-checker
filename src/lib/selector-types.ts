export type SelectorGeneration = {
  slug: string;
  /** Display label (e.g. series name or code) */
  label: string;
  years: string;
  /** RedBook YearGroup id when data came from Redbook Direct */
  redbookYearGroupId?: number;
};

export type SelectorModel = {
  slug: string;
  name: string;
  generations: SelectorGeneration[];
  /** RedBook Family id (model line) when data came from Redbook Direct */
  redbookFamilyId?: number;
};

export type SelectorMake = {
  slug: string;
  name: string;
  models: SelectorModel[];
  /** RedBook Make id when data came from Redbook Direct */
  redbookMakeId?: number;
};
