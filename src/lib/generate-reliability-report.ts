import { GoogleGenAI } from "@google/genai";

import { RELIABILITY_PROFILE_JSON_SCHEMA } from "@/lib/reliability-report-json-schema";
import type { ReportSource, ReliabilityProfile } from "@/types";
import type { ResolvedSelectorContext } from "@/lib/selector-resolve";
import { validateReliabilityProfile } from "@/lib/validate-reliability-profile";

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
  return `You are summarizing real-world reliability for one vehicle generation for car buyers.

Vehicle:
- Market context: Australia (right-hand drive may apply; include globally relevant platform issues).
- Make: ${ctx.makeName}
- Model: ${ctx.modelName}
- Generation / series: ${ctx.generationLabel}
- Typical years on file: ${ctx.years}

Use Google Search to consult owner forums, Facebook groups (summaries only), enthusiast sites, repair databases, TSB/recall summaries, and automotive press. Prefer recurring themes across multiple independent sources.

Respond with a single JSON object only (no markdown fences, no commentary). It must match this shape and constraints:
${SCHEMA_HINT}

Base trustScore 0-100 on how consistently sources report serious powertrain/drivetrain issues vs routine maintenance.

yearsRange should match this generation (use "${ctx.years}" if it aligns with sources, otherwise refine to what sources indicate).

Include at least one recommended configuration and at least one configuration to avoid when sources support it; if sources are thin, still give best-effort labels and note uncertainty in strengths/criticalFailures wording (do not add fields outside the schema).

commonPlatformFailures: short inspection bullets that apply across trims (rust, suspension, electronics, fluids, etc.).`;
}

function buildStructuredOnlyPrompt(ctx: ResolvedSelectorContext): string {
  return `You are summarizing real-world reliability for one vehicle generation for car buyers, using general automotive knowledge (no live web search).

Vehicle:
- Market context: Australia (right-hand drive may apply; include globally relevant platform issues).
- Make: ${ctx.makeName}
- Model: ${ctx.modelName}
- Generation / series: ${ctx.generationLabel}
- Typical years on file: ${ctx.years}

yearsRange should match this generation (use "${ctx.years}" when reasonable).

Include at least one recommended configuration and at least one configuration to avoid; if uncertain, give best-effort labels and note uncertainty in strengths/criticalFailures wording.`;
}

export type GenerateReportResult = {
  profile: ReliabilityProfile;
  sources: ReportSource[];
};

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
          return { profile, sources };
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
      return { profile, sources: [] };
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(lastError != null ? String(lastError) : "Gemini report generation failed");
}
