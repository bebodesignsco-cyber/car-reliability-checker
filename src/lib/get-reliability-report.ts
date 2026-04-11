import { generateReliabilityReportWithGrounding } from "@/lib/generate-reliability-report";
import { getProfileForSegments } from "@/lib/mock-profiles";
import { isYearSegment } from "@/lib/model-year";
import {
  isReportStale,
  readCachedReport,
  REPORT_CACHE_SCHEMA_VERSION,
  writeCachedReport,
} from "@/lib/reliability-report-cache";
import { resolveSelectorContext, type ResolvedSelectorContext } from "@/lib/selector-resolve";
import type { CachedReliabilityReport, ReliabilityProfile } from "@/types";

export type LoadReliabilityReportResult =
  | { kind: "ok"; report: CachedReliabilityReport; context: ResolvedSelectorContext }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function cachedFromMock(profile: ReliabilityProfile): CachedReliabilityReport {
  return {
    schemaVersion: REPORT_CACHE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    profile,
    sources: [],
    retrievalMode: "ungrounded",
  };
}

function cacheSegment(segmentSlug: string, generationSlug: string, generationQuery?: string | null): string {
  if (!isYearSegment(segmentSlug)) return segmentSlug;
  if (generationQuery && generationQuery === generationSlug) {
    return `${segmentSlug}--${generationSlug}`;
  }
  return segmentSlug;
}

export async function loadReliabilityReport(
  makeSlug: string,
  modelSlug: string,
  segmentSlug: string,
  generationQuery?: string | null,
): Promise<LoadReliabilityReportResult> {
  const ctx = resolveSelectorContext(makeSlug, modelSlug, segmentSlug, generationQuery);
  if (!ctx) {
    return { kind: "not_found" };
  }
  const keySegment = cacheSegment(segmentSlug, ctx.generationSlug, generationQuery);

  const cached = await readCachedReport(makeSlug, modelSlug, keySegment);
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (cached && !isReportStale(cached.generatedAt)) {
    return { kind: "ok", report: { ...cached, staleServed: false }, context: ctx };
  }

  if (hasApiKey) {
    try {
      const { profile, sources, retrievalMode } = await generateReliabilityReportWithGrounding(ctx);
      const report: CachedReliabilityReport = {
        schemaVersion: REPORT_CACHE_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        profile,
        sources,
        retrievalMode,
        staleServed: false,
      };
      try {
        await writeCachedReport(makeSlug, modelSlug, keySegment, report);
      } catch (cacheErr) {
        console.error(
          "[reliability] Failed to persist report cache (report still shown):",
          cacheErr instanceof Error ? cacheErr.message : cacheErr,
        );
      }
      return { kind: "ok", report, context: ctx };
    } catch (e) {
      if (cached) {
        return {
          kind: "ok",
          report: { ...cached, staleServed: true },
          context: ctx,
        };
      }
      const mock = getProfileForSegments(makeSlug, modelSlug, ctx.generationSlug);
      if (mock) {
        return { kind: "ok", report: cachedFromMock(mock), context: ctx };
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
    return { kind: "ok", report: { ...cached, staleServed: false }, context: ctx };
  }

  const mock = getProfileForSegments(makeSlug, modelSlug, ctx.generationSlug);
  if (mock) {
    return { kind: "ok", report: cachedFromMock(mock), context: ctx };
  }

  return {
    kind: "error",
    message:
      "No cached report yet. Set GEMINI_API_KEY in the server environment to generate reports from the web.",
  };
}
