import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MakeHubJsonLd } from "@/components/make-hub-json-ld";
import { getMakeBySlug } from "@/lib/selector-nav";
import { SITE_NAME } from "@/lib/site-config";

type PageProps = {
  params: Promise<{ make: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { make } = await params;
  const m = getMakeBySlug(make);
  if (!m) {
    return { title: "Not found" };
  }
  const label = m.name;
  const description = `Used car reliability in Australia for ${label}: browse models and generations, trust scores, buy vs avoid trims, and inspection points.`;
  return {
    title: `${label} used car reliability (AU)`,
    description,
    alternates: {
      canonical: `/used-car-reliability/${make}`,
    },
    openGraph: {
      title: `${label} used car reliability | ${SITE_NAME}`,
      description,
      url: `/used-car-reliability/${make}`,
      locale: "en_AU",
      type: "website",
    },
  };
}

export default async function MakeHubPage({ params }: PageProps) {
  const { make } = await params;
  const entry = getMakeBySlug(make);
  if (!entry) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <MakeHubJsonLd makeSlug={make} makeName={entry.name} />
      <nav className="text-sm text-foreground/90">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>
        {" / "}
        <Link href="/used-car-reliability" className="underline underline-offset-4">
          Used car reliability
        </Link>
        {" / "}
        <span className="font-medium">{entry.name}</span>
      </nav>

      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
          {entry.name} used car reliability
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
          Pick a model to see generations we cover. Each report includes a trust score, recommended
          configurations, known weak points, and platform-wide inspection notes for Australian buyers.
        </p>
      </header>

      <section aria-labelledby="models-heading">
        <h2
          id="models-heading"
          className="text-xs font-bold uppercase tracking-wide text-foreground"
        >
          Models
        </h2>
        <ul className="mt-6 flex flex-col gap-3" role="list">
          {entry.models.map((mo) => (
            <li key={mo.slug}>
              <Link
                href={`/used-car-reliability/${make}/${mo.slug}`}
                className="block border-2 border-foreground bg-background px-4 py-3 text-base font-semibold text-foreground no-underline transition hover:bg-foreground hover:text-background"
              >
                {mo.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-foreground/80">
        Need a specific year range? Pick a model below, then choose a generation. You can also jump
        straight in with the{" "}
        <Link href="/" className="font-medium underline underline-offset-4">
          homepage selector
        </Link>
        .
      </p>
    </main>
  );
}
