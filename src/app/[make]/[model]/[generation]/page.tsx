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
import { isYearSegment } from "@/lib/model-year";

export const dynamic = "force-dynamic";
/** Allow slow Gemini + Google Search grounding on serverless hosts (e.g. Vercel). */
export const maxDuration = 120;

type PageProps = {
  params: Promise<{ make: string; model: string; generation: string }>;
  searchParams: Promise<{ generation?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { make, model, generation } = await params;
  const subject = isYearSegment(generation) ? `model year ${generation}` : formatUrlSegment(generation);
  const label = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${subject}`;
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

export default async function GenerationReliabilityPage({ params, searchParams }: PageProps) {
  const { make, model, generation } = await params;
  const { generation: generationQuery } = await searchParams;

  const adAfterTrust = process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE?.trim();
  const adMid = process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID?.trim();
  const adFooter = process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER?.trim();

  const loaded = await loadReliabilityReport(make, model, generation, generationQuery);
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
  const { context } = loaded;
  const canRefresh = Boolean(process.env.GEMINI_API_KEY?.trim());
  const outdatedWithoutRefresh = !canRefresh && isReportStale(loaded.report.generatedAt);

  const makeLabel = formatUrlSegment(make).toUpperCase();
  const modelLabel = formatUrlSegment(model).toUpperCase();
  const reportSubject = context.modelYear
    ? `model year ${context.modelYear}`
    : context.generationLabel;
  const reportSubjectUpper = reportSubject.toUpperCase();
  const verdict = getTrustVerdict(profile.trustScore);

  const reportTitle = `REPORT: ${makeLabel} > ${modelLabel} > ${reportSubjectUpper} (${profile.yearsRange})`;

  const hero = getReportHero(make, model, context.generationSlug);

  const faqItems = buildReliabilityFaqItems(make, model, reportSubject, profile);

  const modelCtx = getModelBySlug(make, model);
  const relatedGens = getSiblingGenerationLinks(make, model, generation);
  const overlappingGenerations =
    context.modelYear && context.matchingGenerationSlugs.length > 1 && modelCtx
      ? modelCtx.model.generations.filter((g) => context.matchingGenerationSlugs.includes(g.slug))
      : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:gap-12 md:px-8 md:py-16">
      <GenerationPageJsonLd
        make={make}
        model={model}
        segment={generation}
        subject={reportSubject}
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
          {formatUrlSegment(model)} {reportSubject} ({profile.yearsRange}). Compare
          recommended configurations, known weak points, and inspection priorities before you buy.
        </p>
      </header>
      {overlappingGenerations.length > 1 ? (
        <section className="border-2 border-foreground bg-background p-6 sm:p-8">
          <h2 className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground">
            Multiple generations match this year
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            This model year appears across more than one listed generation. Choose the closest series
            below to refine context.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed" role="list">
            {overlappingGenerations.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/${make}/${model}/${generation}?generation=${g.slug}`}
                  className="underline underline-offset-4"
                >
                  {g.label} ({g.years})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.vehicleContext ? (
        <section
          className="border-2 border-foreground bg-background p-6 sm:p-8 md:p-10"
          aria-labelledby="vehicle-context-heading"
        >
          <h2
            id="vehicle-context-heading"
            className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
          >
            Vehicle background from retrieved sources
          </h2>
          {profile.vehicleContext.generationSummary ? (
            <p className="mt-4 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
              {profile.vehicleContext.generationSummary}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.vehicleContext.platformOrSeriesCodes?.length ? (
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>Generation / series codes:</strong>{" "}
                {profile.vehicleContext.platformOrSeriesCodes.join(", ")}
              </p>
            ) : null}
            {profile.vehicleContext.bodyStyles?.length ? (
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>Body styles:</strong> {profile.vehicleContext.bodyStyles.join(", ")}
              </p>
            ) : null}
            {profile.vehicleContext.drivetrains?.length ? (
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>Drivetrains:</strong> {profile.vehicleContext.drivetrains.join(", ")}
              </p>
            ) : null}
          </div>
          {profile.vehicleContext.confidenceNote ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">
              {profile.vehicleContext.confidenceNote}
            </p>
          ) : null}
        </section>
      ) : null}

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
        subject={reportSubject}
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

      <section
        className="border-2 border-foreground bg-background p-6 sm:p-8 md:p-10"
        aria-labelledby="sources-heading"
      >
        <h2
          id="sources-heading"
          className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
        >
          Sources
        </h2>
        {loaded.report.sources.length > 0 ? (
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed" role="list">
            {loaded.report.sources.map((s) => (
              <li key={s.uri}>
                <a
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-foreground/40 underline-offset-2 hover:decoration-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-foreground/90">
            No web sources were attached to this report. This usually means grounding was unavailable
            and the fallback structured generation mode was used.
          </p>
        )}
      </section>

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
        retrievalMode={loaded.report.retrievalMode}
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
