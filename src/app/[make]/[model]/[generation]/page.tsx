import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSenseDisplay } from "@/components/adsense-display";
import { GenerationPageJsonLd } from "@/components/json-ld";
import { RelatedGenerations } from "@/components/related-generations";
import { ReliabilityColumn } from "@/components/reliability-column";
import { ReportBuyerSections } from "@/components/report-buyer-sections";
import { ReportFaq } from "@/components/report-faq";
import { ReportFooter } from "@/components/report-footer";
import { ReportScrollRotateHero } from "@/components/report-scroll-rotate-hero";
import { TrustScoreCard } from "@/components/trust-score-card";
import { formatUrlSegment } from "@/lib/format-url-segment";
import { loadReliabilityReport } from "@/lib/get-reliability-report";
import { isReportStale } from "@/lib/reliability-report-cache";
import { getModelBySlug } from "@/lib/selector-nav";
import { SITE_NAME } from "@/lib/site-config";
import { buildReliabilityFaqItems } from "@/lib/seo-faq";
import { getSiblingGenerationLinks } from "@/lib/related-generations";
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
  const label = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${formatUrlSegment(generation)}`;
  const path = `/${make}/${model}/${generation}`;
  const title = `${label}: used car reliability (Australia)`;
  const description = `Australian used-car reliability for ${label}. Trust score, best configurations to buy, trims to avoid, and inspection points for this generation.`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${label} | ${SITE_NAME}`,
      description,
      url: path,
      locale: "en_AU",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} | ${SITE_NAME}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function GenerationReliabilityPage({ params }: PageProps) {
  const { make, model, generation } = await params;

  const adAfterTrust = process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE?.trim();
  const adMid = process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID?.trim();
  const adFooter = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER?.trim();

  const loaded = await loadReliabilityReport(make, model, generation);
  if (loaded.kind === "not_found") {
    notFound();
  }
  if (loaded.kind === "error") {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-16">
        <p>
          <Link
            href="/"
            className="inline-flex w-fit items-center border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground no-underline hover:bg-foreground hover:text-background"
          >
            Back to selector
          </Link>
        </p>
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

  const faqItems = buildReliabilityFaqItems(make, model, generation, profile);

  const modelCtx = getModelBySlug(make, model);
  const relatedGens = getSiblingGenerationLinks(make, model, generation);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:gap-12 md:px-8 md:py-16">
      <GenerationPageJsonLd
        make={make}
        model={model}
        generation={generation}
        profile={profile}
        faqItems={faqItems}
      />
      <p className="flex flex-wrap gap-4">
        <Link
          href="/"
          className="inline-flex w-fit items-center border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground no-underline hover:bg-foreground hover:text-background"
        >
          Back to selector
        </Link>
        <Link
          href="/used-car-reliability"
          className="inline-flex w-fit items-center border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground no-underline hover:bg-foreground hover:text-background"
        >
          Used car reliability guides
        </Link>
        <Link
          href={`/used-car-reliability/${make}`}
          className="inline-flex w-fit items-center border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground no-underline hover:bg-foreground hover:text-background"
        >
          {formatUrlSegment(make)} hub
        </Link>
      </p>
      {hero ? (
        <ReportScrollRotateHero images={hero.images} alt={hero.alt} />
      ) : null}
      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-lg font-bold uppercase leading-snug tracking-wide text-foreground sm:text-xl">
          {reportTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground sm:text-[1.05rem]">
          Used car reliability snapshot for Australia: {formatUrlSegment(make)}{" "}
          {formatUrlSegment(model)} {formatUrlSegment(generation)} ({profile.yearsRange}). Compare
          recommended configurations, known weak points, and inspection priorities before you buy.
        </p>
      </header>

      <TrustScoreCard score={profile.trustScore} verdict={verdict} />

      {adAfterTrust ? (
        <div className="w-full max-w-full">
          <AdSenseDisplay slot={adAfterTrust} />
        </div>
      ) : null}

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

      {adMid ? (
        <div className="w-full max-w-full">
          <AdSenseDisplay slot={adMid} />
        </div>
      ) : null}

      <ReportBuyerSections
        make={make}
        model={model}
        generation={generation}
        profile={profile}
      />

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

      <ReportFaq items={faqItems} />

      {modelCtx ? (
        <RelatedGenerations
          makeSlug={make}
          modelSlug={model}
          modelName={modelCtx.model.name}
          items={relatedGens}
        />
      ) : null}

      {adFooter ? (
        <div className="w-full max-w-full">
          <AdSenseDisplay slot={adFooter} />
        </div>
      ) : null}

      <ReportFooter
        generatedAtIso={loaded.report.generatedAt}
        sources={loaded.report.sources}
        staleServed={loaded.report.staleServed}
        outdatedWithoutRefresh={outdatedWithoutRefresh}
      />

      <p className="text-sm text-foreground/80">
        <Link
          href={`/used-car-reliability/${make}/${model}`}
          className="underline underline-offset-4"
        >
          More on {formatUrlSegment(make)} {formatUrlSegment(model)} used reliability
        </Link>
      </p>
    </main>
  );
}
