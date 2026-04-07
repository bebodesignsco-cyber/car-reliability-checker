import type { ReliabilityProfile } from "@/types";

/** Wireframe mock: Volvo XC90 P2 — keyed by URL segments. */
const VOLVO_XC90_P2: ReliabilityProfile = {
  trustScore: 72,
  yearsRange: "2003-2014",
  recommendedConfigurations: [
    {
      combo: "2007-2014 2.4L D5 (turbo diesel)",
      strengths: [
        "Strong real-world fuel economy when maintained",
        "Timing belt service intervals are predictable if documented",
      ],
    },
    {
      combo: "2011-2014 3.2L inline-6",
      strengths: [
        "Smoother power delivery than early petrol trims",
        "Fewer diesel-specific maintenance items for some buyers",
      ],
    },
    {
      combo: "2007-2011 4.4L V8",
      strengths: [
        "Ample torque for highway merging and towing",
        "Service history matters more than exotic parts availability",
      ],
    },
  ],
  configurationsToAvoid: [
    {
      combo: "2003-2005 2.9L T6 + 4-speed GM automatic",
      criticalFailures: [
        "Catastrophic 4-speed GM transmission failure under normal driving loads",
      ],
    },
    {
      combo: "2005-early 2006 4.4L V8",
      criticalFailures: [
        "Counterbalance shaft bearing failure risk on early build engines",
      ],
    },
  ],
  commonPlatformFailures: [
    "Lower control arm bushings and strut mounts wear",
    "Haldex AWD pump failure when fluid service is neglected",
    "Clogged sunroof drains leading to CEM water damage",
  ],
};

type SegmentKey = `${string}/${string}/${string}`;

const PROFILES: Partial<Record<SegmentKey, ReliabilityProfile>> = {
  "volvo/xc90/p2": VOLVO_XC90_P2,
  "volvo/xc90/spa": VOLVO_XC90_P2,
};

export function getProfileForSegments(
  make: string,
  model: string,
  generation: string,
): ReliabilityProfile | null {
  const key = `${make}/${model}/${generation}` as SegmentKey;
  return PROFILES[key] ?? null;
}
