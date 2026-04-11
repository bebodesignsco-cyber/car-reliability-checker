type ReportFooterProps = {
  generatedAtIso: string;
  retrievalMode: "grounded" | "ungrounded";
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
  retrievalMode,
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
      {retrievalMode === "ungrounded" ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground/90">
          This version was generated without attached grounding sources. Treat the reliability summary
          as lower-confidence guidance and verify against primary references.
        </p>
      ) : null}
    </footer>
  );
}
