import Link from "next/link";

import { SELECTOR_TREE } from "@/lib/selector-data";

const TOP_MAKES = SELECTOR_TREE.slice(0, 12);

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-foreground bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Explore</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm" role="list">
            <li>
              <Link href="/" className="underline underline-offset-4">
                Home &amp; selector
              </Link>
            </li>
            <li>
              <Link href="/used-car-reliability" className="underline underline-offset-4">
                Used car reliability (Australia)
              </Link>
            </li>
          </ul>
        </div>
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Popular makes</p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" role="list">
            {TOP_MAKES.map((m) => (
              <li key={m.slug}>
                <Link href={`/used-car-reliability/${m.slug}`} className="underline underline-offset-4">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-foreground/70">
        Reports summarise recurring themes from public sources and general automotive knowledge;
        always confirm with inspection and history before purchase.
      </p>
    </footer>
  );
}
