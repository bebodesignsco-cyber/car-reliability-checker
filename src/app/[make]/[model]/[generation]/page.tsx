import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReliabilityColumn } from "@/components/reliability-column";
import { ReportFooter } from "@/components/report-footer";
import { ReportScrollRotateHero } from "@/components/report-scroll-rotate-hero";
import { TrustScoreCard } from "@/components/trust-score-card";
import { formatUrlSegment } from "@/lib/format-url-segment";
import { loadReliabilityReport } from "@/lib/get-reliability-report";
import { isReportStale } from "@/lib/reliability-report-cache";
import { getReportHero } from "@/lib/report-hero-config";
import { getTrustVerdict } from "@/lib/trust-verdict";

export const dynamic = "force-dynamic";
/** Allow slow Gemini + Google Search grounding on serverless hosts (e.g. Vercel). */
export const maxDuration = 120;

type PageProps = {
  params: Promise<{ make: string; model: string; generation: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { make, model, generation } = await params;
  const title = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${formatUrlSegment(generation)}`;
  return {
    title: `${title} | Reliability`,
    description: `Reliability profile for ${title}.`,
  };
}

export default async function GenerationReliabilityPage({ params }: PageProps) {
  const { make, model, generation } = await params;

  const loaded = await loadReliabilityReport(make, model, generation);
  if (loaded.kind === "not_found") {
    notFound();
  }
  if (loaded.kind === "error") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-16">
        <p className="text-base leading-relaxed text-foreground">{loaded.message}</p>
      </main>
    );
  }

  const { profile } = loaded.report;
  const canRefresh = Boolean(process.env.GEMINI_API_KEY?.trim());
  const outdatedWithoutRefresh = !canRefresh && isReportStale(loaded.report.generatedAt);

  const makeLabel = formatUrlSegment(make).toUpperCase();
  const modelLabel = formatUrlSegment(model).toUpperCase();
  const generationLabel = formatUrlSegment(generation).toUpperCase();
  const verdict = getTrustVerdict(profile.trustScore);

  const reportTitle = `REPORT: ${makeLabel} > ${modelLabel} > ${generationLabel} (${profile.yearsRange})`;

  const hero = getReportHero(make, model, generation);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:gap-12 md:px-8 md:py-16">
      {hero ? (
        <ReportScrollRotateHero images={hero.images} alt={hero.alt} />
      ) : null}
      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-lg font-bold uppercase leading-snug tracking-wide text-foreground sm:text-xl">
          {reportTitle}
        </h1>
      </header>

      <TrustScoreCard score={profile.trustScore} verdict={verdict} />

      <section
        className="grid gap-6 md:grid-cols-2 md:gap-8 md:items-start"
        aria-labelledby="data-split-heading"
      >
        <h2 id="data-split-heading" className="sr-only">
          Recommended and avoid configurations
        </h2>
        <ReliabilityColumn
          variant="buy"
          items={profile.recommendedConfigurations}
        />
        <ReliabilityColumn
          variant="avoid"
          items={profile.configurationsToAvoid}
        />
      </section>

      <section
        className="border-2 border-foreground bg-background p-6 sm:p-8 md:p-10"
        aria-labelledby="platform-quirks-heading"
      >
        <h2
          id="platform-quirks-heading"
          className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
        >
          PLATFORM-WIDE QUIRKS & INSPECTION POINTS (ALL MODELS)
        </h2>
        <ul className="mt-6 list-disc space-y-4 pl-6" role="list">
          {profile.commonPlatformFailures.map((line) => (
            <li
              key={line}
              className="text-base leading-relaxed text-foreground sm:text-[1.05rem]"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <ReportFooter
        generatedAtIso={loaded.report.generatedAt}
        sources={loaded.report.sources}
        staleServed={loaded.report.staleServed}
        outdatedWithoutRefresh={outdatedWithoutRefresh}
      />
    </main>
  );
}
