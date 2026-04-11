"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { listSelectableYearsForModel, resolveYearToGeneration } from "@/lib/model-year";
import { SELECTOR_TREE } from "@/lib/selector-data";

export function SelectorPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [makeSlug, setMakeSlug] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [year, setYear] = useState("");
  const [generationHint, setGenerationHint] = useState("");

  const make = useMemo(
    () => SELECTOR_TREE.find((m) => m.slug === makeSlug),
    [makeSlug],
  );
  const model = useMemo(
    () => make?.models.find((mo) => mo.slug === modelSlug),
    [make, modelSlug],
  );
  const availableYears = useMemo(() => (model ? listSelectableYearsForModel(model) : []), [model]);
  const yearNumber = Number(year);
  const yearResolution = useMemo(() => {
    if (!model || year.length === 0 || !Number.isFinite(yearNumber)) return null;
    return resolveYearToGeneration(model, yearNumber, generationHint || null);
  }, [model, year, yearNumber, generationHint]);
  const hasAmbiguousGenerations =
    yearResolution?.kind === "matched" && yearResolution.matches.length > 1;
  const hasNoMatch = year.length > 0 && yearResolution?.kind === "no_match";

  const canSubmit = Boolean(
    make &&
      model &&
      year.length > 0 &&
      !hasNoMatch &&
      (!hasAmbiguousGenerations || Boolean(generationHint)),
  );

  function handleMakeChange(value: string) {
    setMakeSlug(value);
    setModelSlug("");
    setYear("");
    setGenerationHint("");
  }

  function handleModelChange(value: string) {
    setModelSlug(value);
    setYear("");
    setGenerationHint("");
  }

  function handleYearChange(value: string) {
    setYear(value);
    setGenerationHint("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(() => {
      const params = new URLSearchParams();
      if (generationHint) params.set("generation", generationHint);
      const query = params.size > 0 ? `?${params.toString()}` : "";
      router.push(`/${make!.slug}/${model!.slug}/${year}${query}`);
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
          {hasAmbiguousGenerations ? (
            <div className="flex flex-col gap-3">
              <label
                htmlFor="select-generation-hint"
                className="text-sm font-bold uppercase tracking-wide text-foreground"
              >
                4. OPTIONAL SERIES HINT
              </label>
              <select
                id="select-generation-hint"
                name="generationHint"
                value={generationHint}
                onChange={(e) => setGenerationHint(e.target.value)}
                className="h-14 w-full border-2 border-foreground bg-background px-4 text-base font-medium text-foreground"
              >
                <option value="">Choose matching series</option>
                {yearResolution?.kind === "matched"
                  ? yearResolution.matches.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.label} ({g.years})
                      </option>
                    ))
                  : null}
              </select>
            </div>
          ) : null}
          {hasNoMatch ? (
            <p className="text-sm text-foreground/80">
              This year is outside the listed range for this model. Choose another year, or use the
              model hub for broader coverage.
            </p>
          ) : null}
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
    </form>
  );
}
