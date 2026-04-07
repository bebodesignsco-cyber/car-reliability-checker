export interface Make {
  id: string;
  name: string;
  slug: string;
}

export interface Model {
  id: string;
  makeId: string;
  name: string;
  slug: string;
}

export type RecommendedConfiguration = {
  /** Engine / transmission combo label */
  combo: string;
  strengths: string[];
};

export type ConfigurationToAvoid = {
  combo: string;
  criticalFailures: string[];
};

export interface ReliabilityProfile {
  trustScore: number;
  /** e.g. "2003-2014" for report header */
  yearsRange: string;
  recommendedConfigurations: RecommendedConfiguration[];
  configurationsToAvoid: ConfigurationToAvoid[];
  commonPlatformFailures: string[];
}

/** Single web source used for grounding (from Gemini or persisted cache). */
export type ReportSource = {
  title: string;
  uri: string;
};

/**
 * Full cached payload for a make/model/generation report (AI or legacy mock).
 * `schemaVersion` bumps when the JSON shape changes.
 */
export type CachedReliabilityReport = {
  schemaVersion: number;
  /** ISO 8601 timestamp when the profile text was last successfully produced. */
  generatedAt: string;
  profile: ReliabilityProfile;
  sources: ReportSource[];
  /**
   * True when regeneration was attempted (e.g. stale) but failed; an older profile is shown.
   */
  staleServed?: boolean;
};

export interface Generation {
  id: string;
  modelId: string;
  name: string;
  years: string;
  slug: string;
  reliabilityProfile: ReliabilityProfile;
}
