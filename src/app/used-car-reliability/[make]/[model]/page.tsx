import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModelHubJsonLd } from "@/components/model-hub-json-ld";
import { listSelectableYearsForModel } from "@/lib/model-year";
import { getModelBySlug } from "@/lib/selector-nav";
import { SITE_NAME } from "@/lib/site-config";

type PageProps = {
  params: Promise<{ make: string; model: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { make, model } = await params;
  const ctx = getModelBySlug(make, model);
  if (!ctx) {
    return { title: "Not found" };
  }
  const title = `${ctx.make.name} ${ctx.model.name} used car reliability (AU)`;
  const description = `Australian used car reliability by year for ${ctx.make.name} ${ctx.model.name}: open a model year report for trust scores, buy vs avoid trims, and inspection points.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/used-car-reliability/${make}/${model}`,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `/used-car-reliability/${make}/${model}`,
      locale: "en_AU",
      type: "website",
    },
  };
}

export default async function ModelHubPage({ params }: PageProps) {
  const { make, model } = await params;
  const ctx = getModelBySlug(make, model);
  if (!ctx) notFound();

  const { make: makeEntry, model: modelEntry } = ctx;
  const yearLinks = listSelectableYearsForModel(modelEntry).slice(0, 25);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <ModelHubJsonLd
        makeSlug={make}
        modelSlug={model}
        makeName={makeEntry.name}
        modelName={modelEntry.name}
      />
      <nav className="text-sm text-foreground/90">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>
        {" / "}
        <Link href="/used-car-reliability" className="underline underline-offset-4">
          Used car reliability
        </Link>
        {" / "}
        <Link href={`/used-car-reliability/${make}`} className="underline underline-offset-4">
          {makeEntry.name}
        </Link>
        {" / "}
        <span className="font-medium">{modelEntry.name}</span>
      </nav>

      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
          {makeEntry.name} {modelEntry.name} used car reliability
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
          Choose a model year to open the full report: trust score, recommended configurations,
          configurations to avoid, and platform-wide inspection bullets.
        </p>
        <p className="mt-4">
          <Link
            href="/"
            className="text-base font-bold uppercase tracking-wide text-foreground underline underline-offset-4"
          >
            Use the homepage selector
          </Link>
        </p>
      </header>

      <section aria-labelledby="gens-heading">
        <h2
          id="gens-heading"
          className="text-xs font-bold uppercase tracking-wide text-foreground"
        >
          Model years
        </h2>
        <ul className="mt-6 flex flex-col gap-3" role="list">
          {yearLinks.map((year) => (
            <li key={year}>
              <Link
                href={`/${make}/${model}/${year}`}
                className="block border-2 border-foreground bg-background px-4 py-3 text-base font-semibold text-foreground no-underline transition hover:bg-foreground hover:text-background"
              >
                Model year {year}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-foreground/80">
          Need another year? Use the homepage selector to pick any model year from 1980 onward.
        </p>
      </section>
    </main>
  );
}
