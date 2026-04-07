import type { ReportSource } from "@/types";

type ReportFooterProps = {
  generatedAtIso: string;
  sources: ReportSource[];
  staleServed?: boolean;
  /** True when cache is past TTL (30 days) but no refresh ran (e.g. missing API key). */
  outdatedWithoutRefresh?: boolean;
};

function formatDisplayDate(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export function ReportFooter({
  generatedAtIso,
  sources,
  staleServed,
  outdatedWithoutRefresh,
}: ReportFooterProps) {
  return (
    <footer className="border-t-2 border-foreground pt-8">
      <p className="text-sm leading-relaxed text-foreground/90">
        Last updated: <time dateTime={generatedAtIso}>{formatDisplayDate(generatedAtIso)}</time>
        {staleServed ? (
          <span className="mt-2 block text-foreground/80">
            The latest automatic refresh did not complete; showing the last successful version.
          </span>
        ) : null}
        {outdatedWithoutRefresh ? (
          <span className="mt-2 block text-foreground/80">
            This report is older than 30 days. Configure GEMINI_API_KEY on the server to refresh from
            current web sources.
          </span>
        ) : null}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-foreground/90">
        This page uses AI to summarize publicly available discussions and articles. It is not a
        mechanical inspection, warranty, or professional advice. Always verify with a qualified
        technician before purchase.
      </p>

      {sources.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">Sources (web)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed" role="list">
            {sources.map((s) => (
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
        </div>
      ) : null}
    </footer>
  );
}
