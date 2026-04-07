import type { ReliabilityProfile } from "@/types";

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === "string");
}

export function validateReliabilityProfile(data: unknown): ReliabilityProfile | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  const trustScore = o.trustScore;
  const yearsRange = o.yearsRange;
  if (typeof trustScore !== "number" || trustScore < 0 || trustScore > 100) return null;
  if (typeof yearsRange !== "string" || yearsRange.length === 0) return null;

  const rec = o.recommendedConfigurations;
  const avoid = o.configurationsToAvoid;
  const quirks = o.commonPlatformFailures;
  if (!Array.isArray(rec) || !Array.isArray(avoid) || !isStringArray(quirks) || quirks.length < 1) {
    return null;
  }

  const recommendedConfigurations = [];
  for (const item of rec) {
    if (typeof item !== "object" || item === null) return null;
    const it = item as Record<string, unknown>;
    if (typeof it.combo !== "string" || !isStringArray(it.strengths) || it.strengths.length < 1) {
      return null;
    }
    recommendedConfigurations.push({ combo: it.combo, strengths: it.strengths });
  }

  const configurationsToAvoid = [];
  for (const item of avoid) {
    if (typeof item !== "object" || item === null) return null;
    const it = item as Record<string, unknown>;
    if (typeof it.combo !== "string" || !isStringArray(it.criticalFailures) || it.criticalFailures.length < 1) {
      return null;
    }
    configurationsToAvoid.push({ combo: it.combo, criticalFailures: it.criticalFailures });
  }

  return {
    trustScore,
    yearsRange,
    recommendedConfigurations,
    configurationsToAvoid,
    commonPlatformFailures: quirks,
  };
}
