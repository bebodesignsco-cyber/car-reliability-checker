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
      try {
        await writeCachedReport(makeSlug, modelSlug, generationSlug, report);
      } catch (cacheErr) {
        console.error(
          "[reliability] Failed to persist report cache (report still shown):",
          cacheErr instanceof Error ? cacheErr.message : cacheErr,
        );
      }
      return { kind: "ok", report };
    } catch (e) {
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
      const detail = e instanceof Error ? e.message : String(e);
      console.error("[reliability] Gemini report generation failed:", detail);
      const quotaHint =
        /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(detail) &&
        !/GEMINI_API_KEY is not set/.test(detail)
          ? " Gemini returned a quota or rate limit error; check billing or try again later."
          : "";
      return {
        kind: "error",
        message: `Could not generate a reliability report.${quotaHint} If this persists, confirm GEMINI_API_KEY and optional GEMINI_MODEL in the server environment.`,
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
