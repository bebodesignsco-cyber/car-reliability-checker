import { generateReliabilityReportWithGrounding } from "@/lib/generate-reliability-report";
import { getProfileForSegments } from "@/lib/mock-profiles";
import { isYearSegment } from "@/lib/model-year";
import { resolveSeriesCandidates } from "@/lib/series-precheck";
import {
  isReportStale,
  readCachedReport,
  REPORT_CACHE_SCHEMA_VERSION,
  writeCachedReport,
} from "@/lib/reliability-report-cache";
import { resolveSelectorContext, type ResolvedSelectorContext } from "@/lib/selector-resolve";
import type { CachedReliabilityReport, ReliabilityProfile } from "@/types";
import type { SeriesCandidate } from "@/lib/generate-reliability-report";

export type LoadReliabilityReportResult =
  | { kind: "ok"; report: CachedReliabilityReport; context: ResolvedSelectorContext }
  | {
      kind: "selection_required";
      makeSlug: string;
      modelSlug: string;
      modelYear: number;
      candidates: SeriesCandidate[];
      resolutionMethod: "local_fallback" | "ai_grounded";
    }
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

function cacheSegment(segmentSlug: string, generationQuery?: string | null): string {
  if (!isYearSegment(segmentSlug)) return segmentSlug;
  if (generationQuery) {
    return `${segmentSlug}--${generationQuery}`;
  }
  return segmentSlug;
}

export async function loadReliabilityReport(
  makeSlug: string,
  modelSlug: string,
  segmentSlug: string,
  seriesQuery?: string | null,
): Promise<LoadReliabilityReportResult> {
  let selectedSeries = seriesQuery ?? undefined;
  let seriesResolutionMethod: ResolvedSelectorContext["seriesResolutionMethod"] | undefined;
  let selectedSeriesLabel: string | undefined;
  if (isYearSegment(segmentSlug)) {
    const modelYear = Number(segmentSlug);
    const precheck = await resolveSeriesCandidates(makeSlug, modelSlug, modelYear);
    if (precheck.status === "multiple") {
      const chosen = selectedSeries
        ? precheck.candidates.find((c) => c.slug === selectedSeries)
        : undefined;
      if (!chosen) {
        return {
          kind: "selection_required",
          makeSlug,
          modelSlug,
          modelYear,
          candidates: precheck.candidates,
          resolutionMethod: precheck.resolutionMethod,
        };
      }
      selectedSeries = chosen.slug;
      selectedSeriesLabel = chosen.label;
      seriesResolutionMethod = precheck.resolutionMethod;
    } else if (precheck.status === "single" && precheck.candidates[0]) {
      selectedSeries = precheck.candidates[0].slug;
      selectedSeriesLabel = precheck.candidates[0].label;
      seriesResolutionMethod = precheck.resolutionMethod;
    }
  }

  const ctx = resolveSelectorContext(makeSlug, modelSlug, segmentSlug, selectedSeries);
  if (!ctx) {
    return { kind: "not_found" };
  }
  const resolvedCtx: ResolvedSelectorContext = {
    ...ctx,
    generationLabel: selectedSeriesLabel ?? ctx.generationLabel,
    selectedSeries,
    seriesResolutionMethod,
  };
  const keySegment = cacheSegment(segmentSlug, selectedSeries);

  const cached = await readCachedReport(makeSlug, modelSlug, keySegment);
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (cached && !isReportStale(cached.generatedAt)) {
    return { kind: "ok", report: { ...cached, staleServed: false }, context: resolvedCtx };
  }

  if (hasApiKey) {
    try {
      const { profile, sources, retrievalMode } =
        await generateReliabilityReportWithGrounding(resolvedCtx);
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
      return { kind: "ok", report, context: resolvedCtx };
    } catch (e) {
      if (cached) {
        return {
          kind: "ok",
          report: { ...cached, staleServed: true },
          context: resolvedCtx,
        };
      }
      const mock = getProfileForSegments(makeSlug, modelSlug, resolvedCtx.generationSlug);
      if (mock) {
        return { kind: "ok", report: cachedFromMock(mock), context: resolvedCtx };
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
    return { kind: "ok", report: { ...cached, staleServed: false }, context: resolvedCtx };
  }

  const mock = getProfileForSegments(makeSlug, modelSlug, resolvedCtx.generationSlug);
  if (mock) {
    return { kind: "ok", report: cachedFromMock(mock), context: resolvedCtx };
  }

  return {
    kind: "error",
    message:
      "No cached report yet. Set GEMINI_API_KEY in the server environment to generate reports from the web.",
  };
}
