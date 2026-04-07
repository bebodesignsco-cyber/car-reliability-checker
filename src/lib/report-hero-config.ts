export type ReportHeroConfig = {
  images: string[];
  alt: string;
};

type SegmentKey = `${string}/${string}/${string}`;

/** Turntable frames: volvo_p2_xc9000.png … volvo_p2_xc9023.png */
const VOLVO_P2_XC90_IMAGES: string[] = Array.from({ length: 24 }, (_, i) => {
  const n = String(i).padStart(2, "0");
  return `/Volvo_p2_xc90/volvo_p2_xc90${n}.png`;
});

const REPORT_HEROES: Partial<Record<SegmentKey, ReportHeroConfig>> = {
  "volvo/xc90/p2": {
    images: VOLVO_P2_XC90_IMAGES,
    alt: "Volvo XC90 P2 generation exterior rotation",
  },
};

export function getReportHero(
  make: string,
  model: string,
  generation: string,
): ReportHeroConfig | undefined {
  const key = `${make}/${model}/${generation}` as SegmentKey;
  return REPORT_HEROES[key];
}
