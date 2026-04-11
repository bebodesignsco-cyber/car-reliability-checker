"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { listSelectableYearsForModel } from "@/lib/model-year";
import { SELECTOR_TREE } from "@/lib/selector-data";

type SeriesCandidate = {
  slug: string;
  label: string;
  years?: string;
  sourceUris: string[];
};

type SeriesPrecheckResponse = {
  status: "single" | "multiple" | "none";
  candidates: SeriesCandidate[];
  resolutionMethod: "local_fallback" | "ai_grounded";
};

export function SelectorPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [makeSlug, setMakeSlug] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [year, setYear] = useState("");
  const [seriesOptions, setSeriesOptions] = useState<SeriesCandidate[]>([]);
  const [showSeriesPopup, setShowSeriesPopup] = useState(false);
  const [precheckMethod, setPrecheckMethod] = useState<SeriesPrecheckResponse["resolutionMethod"] | null>(
    null,
  );

  const make = useMemo(
    () => SELECTOR_TREE.find((m) => m.slug === makeSlug),
    [makeSlug],
  );
  const model = useMemo(
    () => make?.models.find((mo) => mo.slug === modelSlug),
    [make, modelSlug],
  );
  const availableYears = useMemo(() => (model ? listSelectableYearsForModel(model) : []), [model]);
  const canSubmit = Boolean(make && model && year.length > 0);

  function handleMakeChange(value: string) {
    setMakeSlug(value);
    setModelSlug("");
    setYear("");
    setSeriesOptions([]);
    setShowSeriesPopup(false);
    setPrecheckMethod(null);
  }

  function handleModelChange(value: string) {
    setModelSlug(value);
    setYear("");
    setSeriesOptions([]);
    setShowSeriesPopup(false);
    setPrecheckMethod(null);
  }

  function handleYearChange(value: string) {
    setYear(value);
    setSeriesOptions([]);
    setShowSeriesPopup(false);
    setPrecheckMethod(null);
  }

  function routeToReport(seriesSlug?: string) {
    const params = new URLSearchParams();
    if (seriesSlug) params.set("series", seriesSlug);
    const query = params.size > 0 ? `?${params.toString()}` : "";
    router.push(`/${make!.slug}/${model!.slug}/${year}${query}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isPending) return;
    const makeValue = make!.slug;
    const modelValue = model!.slug;
    const yearValue = year;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/series-candidates?make=${encodeURIComponent(makeValue)}&model=${encodeURIComponent(modelValue)}&year=${encodeURIComponent(yearValue)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const precheck = (await res.json()) as SeriesPrecheckResponse;
          if (precheck.status === "multiple" && precheck.candidates.length > 1) {
            setSeriesOptions(precheck.candidates);
            setPrecheckMethod(precheck.resolutionMethod);
            setShowSeriesPopup(true);
            return;
          }
          if (precheck.status === "single" && precheck.candidates[0]) {
            routeToReport(precheck.candidates[0].slug);
            return;
          }
        }
      } catch {
        // Ignore API failures; route with year only.
      }
      routeToReport();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <div className="border-2 border-foreground bg-background p-6 sm:p-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label
              htmlFor="select-make"
              className="text-sm font-bold uppercase tracking-wide text-foreground"
            >
              1. SELECT MAKE
            </label>
            <select
              id="select-make"
              name="make"
              value={makeSlug}
              onChange={(e) => handleMakeChange(e.target.value)}
              className="h-14 w-full border-2 border-foreground bg-background px-4 text-base font-medium text-foreground"
            >
              <option value="">—</option>
              {SELECTOR_TREE.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label
              htmlFor="select-model"
              className="text-sm font-bold uppercase tracking-wide text-foreground"
            >
              2. SELECT MODEL
            </label>
            <select
              id="select-model"
              name="model"
              value={modelSlug}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!make}
              className="h-14 w-full border-2 border-foreground bg-background px-4 text-base font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">—</option>
              {make?.models.map((mo) => (
                <option key={mo.slug} value={mo.slug}>
                  {mo.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label
              htmlFor="select-year"
              className="text-sm font-bold uppercase tracking-wide text-foreground"
            >
              3. SELECT YEAR
            </label>
            <select
              id="select-year"
              name="year"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={!model}
              className="h-14 w-full border-2 border-foreground bg-background px-4 text-base font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">—</option>
              {availableYears.map((modelYear) => (
                <option key={modelYear} value={String(modelYear)}>
                  {modelYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || isPending}
        aria-busy={isPending}
        className="mt-6 h-16 w-full border-2 border-foreground bg-foreground text-sm font-bold uppercase tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "LOADING…" : "GENERATE REPORT"}
      </button>

      <p className="mt-6 text-center text-sm text-foreground/90">
        Prefer browsing?{" "}
        <Link href="/used-car-reliability" className="font-semibold underline underline-offset-4">
          Used car reliability guides by make
        </Link>
      </p>
      {showSeriesPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl border-2 border-foreground bg-background p-6 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Select series / generation (not trim level)
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              Multiple series appear to match this model year. Choose the series you meant before
              generating the final report.
            </p>
            {precheckMethod === "ai_grounded" ? (
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                Options were derived from web-source grounding.
              </p>
            ) : null}
            <ul className="mt-4 space-y-2" role="list">
              {seriesOptions.map((candidate) => (
                <li key={candidate.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSeriesPopup(false);
                      routeToReport(candidate.slug);
                    }}
                    className="w-full border-2 border-foreground bg-background px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-foreground hover:text-background"
                  >
                    {candidate.label}
                    {candidate.years ? ` (${candidate.years})` : ""}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowSeriesPopup(false)}
              className="mt-4 w-full border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-foreground hover:text-background"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
