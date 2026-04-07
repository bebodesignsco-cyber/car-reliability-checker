import type { Metadata } from "next";
import Link from "next/link";

import { PillarJsonLd } from "@/components/pillar-json-ld";
import { SELECTOR_TREE } from "@/lib/selector-data";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

const title = "Used car reliability in Australia";

export const metadata: Metadata = {
  title,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/used-car-reliability",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: "/used-car-reliability",
    locale: "en_AU",
    type: "website",
  },
};

export default function UsedCarReliabilityPillarPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <PillarJsonLd />
      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
          Browse make hubs and model guides, then open a generation report for trust scores, buy vs
          avoid configurations, and inspection points tailored to Australian used car buyers.
        </p>
        <p className="mt-4">
          <Link
            href="/"
            className="text-base font-bold uppercase tracking-wide text-foreground underline underline-offset-4"
          >
            Open the selector
          </Link>
        </p>
      </header>

      <section aria-labelledby="makes-heading">
        <h2
          id="makes-heading"
          className="text-xs font-bold uppercase tracking-wide text-foreground"
        >
          Browse by make
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2" role="list">
          {SELECTOR_TREE.map((make) => (
            <li key={make.slug}>
              <Link
                href={`/used-car-reliability/${make.slug}`}
                className="block border-2 border-foreground bg-background px-4 py-3 text-base font-semibold text-foreground no-underline transition hover:bg-foreground hover:text-background"
              >
                {make.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
