import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CachedReliabilityReport } from "@/types";

/**
 * Filesystem JSON cache under `data/reliability-reports/` locally.
 * On Vercel, the project directory is not writable; cache uses the OS temp dir (ephemeral per instance).
 * Override with RELIABILITY_REPORT_CACHE_DIR. For durable cache across deploys, use Blob/KV/DB.
 */
export const REPORT_CACHE_SCHEMA_VERSION = 1;

/** ~30 days in ms; reports older than this are regenerated on read (when API is available). */
export const REPORT_STALE_MS = 30 * 24 * 60 * 60 * 1000;

function cacheRoot(): string {
  const override = process.env.RELIABILITY_REPORT_CACHE_DIR?.trim();
  if (override) return override;
  if (process.env.VERCEL) {
    return join(tmpdir(), "car-reliability-reports");
  }
  return join(process.cwd(), "data", "reliability-reports");
}

function segmentPath(make: string, model: string, generation: string): string {
  const safe = make.toLowerCase();
  const safeModel = model.toLowerCase();
  const safeGen = generation.toLowerCase();
  return join(cacheRoot(), safe, safeModel, `${safeGen}.json`);
}

export function isReportStale(generatedAtIso: string, nowMs: number = Date.now()): boolean {
  const t = Date.parse(generatedAtIso);
  if (Number.isNaN(t)) return true;
  return nowMs - t >= REPORT_STALE_MS;
}

export async function readCachedReport(
  make: string,
  model: string,
  generation: string,
): Promise<CachedReliabilityReport | null> {
  const p = segmentPath(make, model, generation);
  try {
    const raw = await readFile(p, "utf8");
    const parsed = JSON.parse(raw) as CachedReliabilityReport;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.schemaVersion !== "number" ||
      !parsed.profile ||
      typeof parsed.generatedAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedReport(
  make: string,
  model: string,
  generation: string,
  report: CachedReliabilityReport,
): Promise<void> {
  const p = segmentPath(make, model, generation);
  await mkdir(join(cacheRoot(), make.toLowerCase(), model.toLowerCase()), {
    recursive: true,
  });
  await writeFile(p, JSON.stringify(report, null, 2), "utf8");
}

/** List cache keys as `{ make, model, generation }[]` from disk. */
export async function listCachedReportKeys(): Promise<
  { make: string; model: string; generation: string }[]
> {
  const root = cacheRoot();
  const keys: { make: string; model: string; generation: string }[] = [];
  try {
    const makes = await readdir(root, { withFileTypes: true });
    for (const mk of makes) {
      if (!mk.isDirectory()) continue;
      const makePath = join(root, mk.name);
      const models = await readdir(makePath, { withFileTypes: true });
      for (const mo of models) {
        if (!mo.isDirectory()) continue;
        const modelPath = join(makePath, mo.name);
        const files = await readdir(modelPath);
        for (const f of files) {
          if (!f.endsWith(".json")) continue;
          keys.push({
            make: mk.name,
            model: mo.name,
            generation: f.replace(/\.json$/i, ""),
          });
        }
      }
    }
  } catch {
    // missing dir
  }
  return keys;
}
