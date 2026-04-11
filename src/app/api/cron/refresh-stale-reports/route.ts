import { NextResponse } from "next/server";

import { generateReliabilityReportWithGrounding } from "@/lib/generate-reliability-report";
import {
  isReportStale,
  listCachedReportKeys,
  readCachedReport,
  REPORT_CACHE_SCHEMA_VERSION,
  writeCachedReport,
} from "@/lib/reliability-report-cache";
import { resolveSelectorContext } from "@/lib/selector-resolve";

function parseCacheSegment(segment: string): { segmentSlug: string; generationQuery?: string } {
  const m = segment.match(/^(\d{4})--([a-z0-9-]+)$/i);
  if (!m) return { segmentSlug: segment };
  return { segmentSlug: m[1], generationQuery: m[2] };
}

/**
 * Monthly cron: refresh every cached report that is past the 30-day TTL.
 * Secure with Authorization: Bearer CRON_SECRET (same value as env CRON_SECRET).
 *
 * Vercel: add to vercel.json crons pointing to this path with the secret in headers
 * (or use Vercel Cron + CRON_SECRET query — prefer Authorization).
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 501 });
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const token = bearer ?? querySecret;
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 501 });
  }

  const keys = await listCachedReportKeys();
  const results: { key: string; status: "refreshed" | "skipped" | "error" }[] = [];

  for (const { make, model, generation } of keys) {
    const cacheSegment = parseCacheSegment(generation);
    const cached = await readCachedReport(make, model, generation);
    if (!cached || !isReportStale(cached.generatedAt)) {
      results.push({ key: `${make}/${model}/${generation}`, status: "skipped" });
      continue;
    }

    const ctx = resolveSelectorContext(
      make,
      model,
      cacheSegment.segmentSlug,
      cacheSegment.generationQuery,
    );
    if (!ctx) {
      results.push({ key: `${make}/${model}/${generation}`, status: "skipped" });
      continue;
    }

    try {
      const { profile, sources, retrievalMode } = await generateReliabilityReportWithGrounding(ctx);
      await writeCachedReport(make, model, generation, {
        schemaVersion: REPORT_CACHE_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        profile,
        sources,
        retrievalMode,
        staleServed: false,
      });
      results.push({ key: `${make}/${model}/${generation}`, status: "refreshed" });
    } catch {
      results.push({ key: `${make}/${model}/${generation}`, status: "error" });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
