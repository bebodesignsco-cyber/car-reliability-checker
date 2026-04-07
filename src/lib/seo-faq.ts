import type { ReliabilityProfile } from "@/types";
import { formatUrlSegment } from "@/lib/format-url-segment";

/**
 * FAQ items for visible FAQ + FAQPage JSON-LD (AU buyer intent).
 */
export function buildReliabilityFaqItems(
  make: string,
  model: string,
  generation: string,
  profile: ReliabilityProfile,
): { question: string; answer: string }[] {
  const vehicle = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${formatUrlSegment(generation)}`;
  const years = profile.yearsRange;

  const buySummary =
    profile.recommendedConfigurations.length > 0
      ? profile.recommendedConfigurations
          .map((c) => `${c.combo}: ${c.strengths.slice(0, 2).join(" ")}`)
          .join(" ")
      : "See the recommended configurations section on this page.";

  const avoidSummary =
    profile.configurationsToAvoid.length > 0
      ? profile.configurationsToAvoid
          .map((c) => `${c.combo}: ${c.criticalFailures.slice(0, 2).join(" ")}`)
          .join(" ")
      : "See the configurations to avoid section on this page.";

  const platformSummary =
    profile.commonPlatformFailures.length > 0
      ? profile.commonPlatformFailures.slice(0, 4).join(" ")
      : "Check owner forums and specialist inspections for this generation.";

  return [
    {
      question: `Is the ${vehicle} (${years}) reliable in Australia?`,
      answer: `This generation is summarized with a trust score of ${profile.trustScore} out of 100 based on recurring themes in owner reports and platform notes (not a lab test). Use the buy/avoid lists and inspection points below before purchase.`,
    },
    {
      question: `Which ${vehicle} configuration should I buy used?`,
      answer: buySummary,
    },
    {
      question: `Which ${vehicle} configurations should I avoid?`,
      answer: avoidSummary,
    },
    {
      question: `What should I inspect on a used ${vehicle}?`,
      answer: platformSummary,
    },
  ];
}
