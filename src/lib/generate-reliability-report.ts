import { GoogleGenAI } from "@google/genai";

import { RELIABILITY_PROFILE_JSON_SCHEMA } from "@/lib/reliability-report-json-schema";
import type { ReportSource, ReliabilityProfile } from "@/types";
import type { ResolvedSelectorContext } from "@/lib/selector-resolve";
import { validateReliabilityProfile } from "@/lib/validate-reliability-profile";
import { urlSegmentSlug } from "@/lib/url-segment-slug";

/** Gemini API: Google Search grounding cannot be combined with controlled JSON (mime + schema). */
const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * If the primary model has no quota (common for deprecated IDs) or errors, try these in order.
 * See https://ai.google.dev/gemini-api/docs/models
 */
const MODEL_FALLBACKS = ["gemini-2.5-flash-lite", "gemini-2.0-flash"] as const;

function modelCandidates(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const out: string[] = [primary];
  for (const m of MODEL_FALLBACKS) {
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseProfileJson(text: string): ReliabilityProfile {
  const raw = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Gemini returned non-JSON text");
  }
  const profile = validateReliabilityProfile(parsed);
  if (!profile) {
    throw new Error("Gemini JSON failed validation");
  }
  return profile;
}

function extractSourcesFromResponse(response: {
  candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } }[];
}): ReportSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks?.length) return [];
  const out: ReportSource[] = [];
  const seen = new Set<string>();
  for (const ch of chunks) {
    const w = ch.web;
    if (!w?.uri) continue;
    if (seen.has(w.uri)) continue;
    seen.add(w.uri);
    out.push({
      title: w.title?.trim() || w.uri,
      uri: w.uri,
    });
  }
  return out;
}

const SCHEMA_HINT = JSON.stringify(RELIABILITY_PROFILE_JSON_SCHEMA, null, 2);

function buildGroundedPrompt(ctx: ResolvedSelectorContext): string {
  const requestedYearLine = ctx.modelYear ? `- Requested model year: ${ctx.modelYear}` : "";
  const selectedSeriesLine = ctx.selectedSeries
    ? `- User-selected series/generation slug: ${ctx.selectedSeries}`
    : "";
  return `You are summarizing real-world reliability for one vehicle generation for car buyers.

Vehicle:
- Market context: Australia (right-hand drive may apply; include globally relevant platform issues).
- Make: ${ctx.makeName}
- Model: ${ctx.modelName}
- URL segment selected by user: ${ctx.segmentSlug}
- Internal generation label: ${ctx.generationLabel}
- Internal generation years field: ${ctx.years}
${requestedYearLine}
${selectedSeriesLine}

If internal generation label is generic (e.g. "All variants"), infer the likely generation/chassis context from retrieved sources for the requested model year and state uncertainty when sources conflict.

Use Google Search to consult owner forums, Facebook groups (summaries only), enthusiast sites, repair databases, TSB/recall summaries, and automotive press. Prefer recurring themes across multiple independent sources.

Respond with a single JSON object only (no markdown fences, no commentary). It must match this shape and constraints:
${SCHEMA_HINT}

Base trustScore 0-100 on how consistently sources report serious powertrain/drivetrain issues vs routine maintenance.

yearsRange should match retrieved evidence for this request. If model year is provided, center the range around that year and adjacent production years supported by sources.

vehicleContext is optional. Only populate fields when sources clearly support them:
- generationSummary: 1-3 short objective sentences.
- platformOrSeriesCodes/bodyStyles/drivetrains: include only values explicitly supported by sources.
- confidenceNote: include when source evidence is thin or conflicting.
- Never invent generation codes, body styles, drivetrains, or precise facts not present in retrieved sources.

Include at least one recommended configuration and at least one configuration to avoid when sources support it; if sources are thin, still give best-effort labels and note uncertainty in strengths/criticalFailures wording (do not add fields outside the schema).

commonPlatformFailures: short inspection bullets that apply across trims (rust, suspension, electronics, fluids, etc.).

Avoid exact statistics, recall identifiers, and date claims unless those details appear in retrieved sources.`;
}

function buildStructuredOnlyPrompt(ctx: ResolvedSelectorContext): string {
  const requestedYearLine = ctx.modelYear ? `- Requested model year: ${ctx.modelYear}` : "";
  const selectedSeriesLine = ctx.selectedSeries
    ? `- User-selected series/generation slug: ${ctx.selectedSeries}`
    : "";
  return `You are summarizing real-world reliability for one vehicle generation for car buyers, using general automotive knowledge (no live web search).

Vehicle:
- Market context: Australia (right-hand drive may apply; include globally relevant platform issues).
- Make: ${ctx.makeName}
- Model: ${ctx.modelName}
- URL segment selected by user: ${ctx.segmentSlug}
- Internal generation label: ${ctx.generationLabel}
- Internal generation years field: ${ctx.years}
${requestedYearLine}
${selectedSeriesLine}

yearsRange should match this generation and requested model year when present.

vehicleContext is optional. If uncertain, omit unsupported fields.
Include at least one recommended configuration and at least one configuration to avoid; if uncertain, give best-effort labels and note uncertainty in strengths/criticalFailures wording.`;
}

export type GenerateReportResult = {
  profile: ReliabilityProfile;
  sources: ReportSource[];
  retrievalMode: "grounded" | "ungrounded";
};

export type SeriesCandidate = {
  slug: string;
  label: string;
  years?: string;
  sourceUris: string[];
};

export type GenerateSeriesCandidatesResult = {
  candidates: SeriesCandidate[];
  sources: ReportSource[];
};

function buildSeriesCandidatesPrompt(makeName: string, modelName: string, modelYear: number): string {
  return `Identify possible vehicle series/generation entries for this request:
- Make: ${makeName}
- Model: ${modelName}
- Model year: ${modelYear}
- Market context: Australia

Return JSON only using this exact schema:
{
  "candidates": [
    {
      "label": "string",
      "years": "string (optional)"
    }
  ]
}

Rules:
- Candidate must be a series/generation/chassis family (e.g. F22, G42), NOT trim or variant.
- If uncertain, include multiple candidates rather than guessing.
- Keep labels short and objective.
- Do not include commentary or markdown fences.`;
}

function parseSeriesCandidatesJson(text: string): { label: string; years?: string }[] {
  const raw = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Gemini returned non-JSON series candidate text");
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const candidates = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return [];
  const out: { label: string; years?: string }[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== "string" || rec.label.trim().length === 0) continue;
    const label = rec.label.trim();
    const slug = urlSegmentSlug(label);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      label,
      years: typeof rec.years === "string" ? rec.years.trim() : undefined,
    });
  }
  return out;
}

export async function generateSeriesCandidatesWithGrounding(
  makeName: string,
  modelName: string,
  modelYear: number,
): Promise<GenerateSeriesCandidatesResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of modelCandidates()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildSeriesCandidatesPrompt(makeName, modelName, modelYear),
        config: {
          temperature: 0.2,
          tools: [{ googleSearch: {} }],
        },
      });
      const text = response.text;
      if (!text) continue;
      const parsed = parseSeriesCandidatesJson(text);
      const sources = extractSourcesFromResponse(
        response as {
          candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } }[];
        },
      );
      const out: SeriesCandidate[] = parsed.map((c) => ({
        slug: urlSegmentSlug(c.label),
        label: c.label,
        years: c.years,
        sourceUris: sources.map((s) => s.uri),
      }));
      if (out.length > 0) {
        return { candidates: out, sources };
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  return { candidates: [], sources: [] };
}

export async function generateReliabilityReportWithGrounding(
  ctx: ResolvedSelectorContext,
): Promise<GenerateReportResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of modelCandidates()) {
    // Grounding + controlled JSON are mutually exclusive on the Gemini API ("Controlled generation is not supported with Google_search tool").
    try {
      const grounded = await ai.models.generateContent({
        model,
        contents: buildGroundedPrompt(ctx),
        config: {
          temperature: 0.35,
          tools: [{ googleSearch: {} }],
        },
      });

      const groundedText = grounded.text;
      if (groundedText) {
        try {
          const profile = parseProfileJson(groundedText);
          const sources = extractSourcesFromResponse(
            grounded as {
              candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } }[];
            },
          );
          return {
            profile,
            sources,
            retrievalMode: sources.length > 0 ? "grounded" : "ungrounded",
          };
        } catch {
          // Fall through to structured-only generation on this model
        }
      }
    } catch (e) {
      lastError = e;
      // Grounded request failed (quota, tool unsupported, etc.) — try structured output without search.
    }

    try {
      const structured = await ai.models.generateContent({
        model,
        contents: buildStructuredOnlyPrompt(ctx),
        config: {
          temperature: 0.35,
          responseMimeType: "application/json",
          responseJsonSchema: RELIABILITY_PROFILE_JSON_SCHEMA,
        },
      });

      const structuredText = structured.text;
      if (!structuredText) {
        throw new Error("Empty response from Gemini");
      }

      const profile = parseProfileJson(structuredText);
      return { profile, sources: [], retrievalMode: "ungrounded" };
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(lastError != null ? String(lastError) : "Gemini report generation failed");
}
