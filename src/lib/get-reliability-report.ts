import { generateReliabilityReportWithGrounding } from "@/lib/generate-reliability-report";
import { getProfileForSegments } from "@/lib/mock-profiles";
import {
  isReportStale,
  readCachedReport,
  REPORT_CACHE_SCHEMA_VERSION,
  writeCachedReport,
} from "@/lib/reliability-report-cache";
import { resolveSelectorContext } from "@/lib/selector-resolve";
import type { CachedReliabilityReport, ReliabilityProfile } from "@/types";

export type LoadReliabilityReportResult =
  | { kind: "ok"; report: CachedReliabilityReport }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function cachedFromMock(profile: ReliabilityProfile): CachedReliabilityReport {
  return {
    schemaVersion: REPORT_CACHE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    profile,
    sources: [],
  };
}

export async function loadReliabilityReport(
  makeSlug: string,
  modelSlug: string,
  generationSlug: string,
): Promise<LoadReliabilityReportResult> {
  const ctx = resolveSelectorContext(makeSlug, modelSlug, generationSlug);
  if (!ctx) {
    return { kind: "not_found" };
  }

  const cached = await readCachedReport(makeSlug, modelSlug, generationSlug);
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (cached && !isReportStale(cached.generatedAt)) {
    return { kind: "ok", report: { ...cached, staleServed: false } };
  }

  if (hasApiKey) {
    try {
      const { profile, sources } = await generateReliabilityReportWithGrounding(ctx);
      const report: CachedReliabilityReport = {
        schemaVersion: REPORT_CACHE_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        profile,
        sources,
        staleServed: false,
      };
      await writeCachedReport(makeSlug, modelSlug, generationSlug, report);
      return { kind: "ok", report };
    } catch {
      if (cached) {
        return {
          kind: "ok",
          report: { ...cached, staleServed: true },
        };
      }
      const mock = getProfileForSegments(makeSlug, modelSlug, generationSlug);
      if (mock) {
        return { kind: "ok", report: cachedFromMock(mock) };
      }
      return {
        kind: "error",
        message:
          "Could not generate a reliability report. Check GEMINI_API_KEY and try again later.",
      };
    }
  }

  if (cached) {
    return { kind: "ok", report: { ...cached, staleServed: false } };
  }

  const mock = getProfileForSegments(makeSlug, modelSlug, generationSlug);
  if (mock) {
    return { kind: "ok", report: cachedFromMock(mock) };
  }

  return {
    kind: "error",
    message:
      "No cached report yet. Set GEMINI_API_KEY in the server environment to generate reports from the web.",
  };
}
