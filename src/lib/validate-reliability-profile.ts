import type { ReliabilityProfile } from "@/types";

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === "string");
}

function optionalStringArray(x: unknown): string[] | undefined | null {
  if (x === undefined) return undefined;
  if (!isStringArray(x)) return null;
  return x;
}

export function validateReliabilityProfile(data: unknown): ReliabilityProfile | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  let trustScore: unknown = o.trustScore;
  if (typeof trustScore === "string") {
    const n = Number(trustScore.trim());
    if (Number.isFinite(n)) trustScore = n;
  }
  if (typeof trustScore !== "number" || trustScore < 0 || trustScore > 100) return null;
  const yearsRange = o.yearsRange;
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

  const vehicleContextRaw = o.vehicleContext;
  let vehicleContext: ReliabilityProfile["vehicleContext"] | undefined;
  if (vehicleContextRaw !== undefined) {
    if (typeof vehicleContextRaw !== "object" || vehicleContextRaw === null) return null;
    const vc = vehicleContextRaw as Record<string, unknown>;
    if (vc.generationSummary !== undefined && typeof vc.generationSummary !== "string") return null;
    if (vc.confidenceNote !== undefined && typeof vc.confidenceNote !== "string") return null;
    const platformOrSeriesCodes = optionalStringArray(vc.platformOrSeriesCodes);
    const bodyStyles = optionalStringArray(vc.bodyStyles);
    const drivetrains = optionalStringArray(vc.drivetrains);
    if (platformOrSeriesCodes === null || bodyStyles === null || drivetrains === null) return null;
    vehicleContext = {
      generationSummary:
        typeof vc.generationSummary === "string" ? vc.generationSummary : undefined,
      platformOrSeriesCodes: platformOrSeriesCodes ?? undefined,
      bodyStyles: bodyStyles ?? undefined,
      drivetrains: drivetrains ?? undefined,
      confidenceNote: typeof vc.confidenceNote === "string" ? vc.confidenceNote : undefined,
    };
  }

  return {
    trustScore,
    yearsRange,
    recommendedConfigurations,
    configurationsToAvoid,
    commonPlatformFailures: quirks,
    vehicleContext,
  };
}
