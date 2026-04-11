import Link from "next/link";

import type { RelatedGenerationLink } from "@/lib/related-generations";

type RelatedGenerationsProps = {
  makeSlug: string;
  modelSlug: string;
  modelName: string;
  items: RelatedGenerationLink[];
};

export function RelatedGenerations({
  makeSlug,
  modelSlug,
  modelName,
  items,
}: RelatedGenerationsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="border-2 border-foreground bg-background p-6 sm:p-8"
      aria-labelledby="related-gens-heading"
    >
      <h2
        id="related-gens-heading"
        className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
      >
        Other {modelName} report links
      </h2>
      <ul className="mt-4 flex flex-col gap-3" role="list">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-base font-medium text-foreground underline underline-offset-4 hover:bg-foreground hover:text-background"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-foreground/90">
        <Link
          href={`/used-car-reliability/${makeSlug}/${modelSlug}`}
          className="font-medium underline underline-offset-4"
        >
          View all {modelName} used car reliability guides
        </Link>
      </p>
    </nav>
  );
}
