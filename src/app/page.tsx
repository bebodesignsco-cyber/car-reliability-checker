import type { Metadata } from "next";
import Link from "next/link";

import { AdSenseDisplay } from "@/components/adsense-display";
import { HomeJsonLd } from "@/components/json-ld";
import { SelectorPanel } from "@/components/selector-panel";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_AU",
    type: "website",
  },
};

export default function Home() {
  const homeSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME?.trim();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <HomeJsonLd />
      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
          THE AUTO RELIABILITY ENGINE.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground">
          <Link
            href="/used-car-reliability"
            className="font-bold uppercase tracking-wide underline underline-offset-4"
          >
            Browse used car reliability guides (Australia)
          </Link>
        </p>
      </header>

      {homeSlot ? (
        <div className="w-full">
          <AdSenseDisplay slot={homeSlot} />
        </div>
      ) : null}

      <SelectorPanel />
    </main>
  );
}
