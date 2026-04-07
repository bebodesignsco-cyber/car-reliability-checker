export type TrustVerdict = "RECOMMENDED" | "CAUTION" | "AVOID";

export function getTrustVerdict(score: number): TrustVerdict {
  if (score >= 70) return "RECOMMENDED";
  if (score >= 40) return "CAUTION";
  return "AVOID";
}
