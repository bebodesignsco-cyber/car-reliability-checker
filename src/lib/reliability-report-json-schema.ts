/**
 * JSON Schema for Gemini `responseJsonSchema` (ReliabilityProfile only — sources come from grounding metadata).
 */
export const RELIABILITY_PROFILE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "trustScore",
    "yearsRange",
    "recommendedConfigurations",
    "configurationsToAvoid",
    "commonPlatformFailures",
  ],
  properties: {
    trustScore: {
      type: "number",
      description: "0-100 summary score from public reliability sentiment for this generation.",
    },
    yearsRange: {
      type: "string",
      description: "Model years for this generation, e.g. 2003-2014",
    },
    recommendedConfigurations: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["combo", "strengths"],
        properties: {
          combo: { type: "string" },
          strengths: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    },
    configurationsToAvoid: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["combo", "criticalFailures"],
        properties: {
          combo: { type: "string" },
          criticalFailures: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    },
    commonPlatformFailures: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
} as const;
