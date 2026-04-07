import { GoogleGenAI } from "@google/genai";

import { RELIABILITY_PROFILE_JSON_SCHEMA } from "@/lib/reliability-report-json-schema";
import type { ReportSource, ReliabilityProfile } from "@/types";
import type { ResolvedSelectorContext } from "@/lib/selector-resolve";
import { validateReliabilityProfile } from "@/lib/validate-reliability-profile";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
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

function buildUserPrompt(ctx: ResolvedSelectorContext): string {
  return `You are summarizing real-world reliability for one vehicle generation for car buyers.

Vehicle:
- Market context: Australia (right-hand drive may apply; include globally relevant platform issues).
- Make: ${ctx.makeName}
- Model: ${ctx.modelName}
- Generation / series: ${ctx.generationLabel}
- Typical years on file: ${ctx.years}

Use Google Search to consult owner forums, Facebook groups (summaries only), enthusiast sites, repair databases, TSB/recall summaries, and automotive press. Prefer recurring themes across multiple independent sources.

Output must be valid JSON only (no markdown) matching the schema. Base trustScore 0-100 on how consistently sources report serious powertrain/drivetrain issues vs routine maintenance.

yearsRange should match this generation (use "${ctx.years}" if it aligns with sources, otherwise refine to what sources indicate).

Include at least one recommended configuration and at least one configuration to avoid when sources support it; if sources are thin, still give best-effort labels and note uncertainty in strengths/criticalFailures wording (do not add fields outside the schema).

commonPlatformFailures: short inspection bullets that apply across trims (rust, suspension, electronics, fluids, etc.).`;
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
  const model = getGeminiModel();

  const response = await ai.models.generateContent({
    model,
    contents: buildUserPrompt(ctx),
    config: {
      temperature: 0.35,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: RELIABILITY_PROFILE_JSON_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Gemini returned non-JSON text");
  }

  const profile = validateReliabilityProfile(parsed);
  if (!profile) {
    throw new Error("Gemini JSON failed validation");
  }

  const sources = extractSourcesFromResponse(
    response as {
      candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } }[];
    },
  );

  return { profile, sources };
}
