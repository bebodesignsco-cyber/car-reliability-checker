"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SELECTOR_TREE } from "@/lib/selector-data";

export function SelectorPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [makeSlug, setMakeSlug] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [generationSlug, setGenerationSlug] = useState("");

  const make = useMemo(
    () => SELECTOR_TREE.find((m) => m.slug === makeSlug),
    [makeSlug],
  );
  const model = useMemo(
    () => make?.models.find((mo) => mo.slug === modelSlug),
    [make, modelSlug],
  );
  const generation = useMemo(
    () => model?.generations.find((g) => g.slug === generationSlug),
    [model, generationSlug],
  );

  const canSubmit = Boolean(make && model && generation);

  function handleMakeChange(value: string) {
    setMakeSlug(value);
    setModelSlug("");
    setGenerationSlug("");
  }

  function handleModelChange(value: string) {
    setModelSlug(value);
    setGenerationSlug("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(() => {
      router.push(`/${make!.slug}/${model!.slug}/${generation!.slug}`);
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
              htmlFor="select-series"
              className="text-sm font-bold uppercase tracking-wide text-foreground"
            >
              3. SELECT SERIES
            </label>
            <select
              id="select-series"
              name="series"
              value={generationSlug}
              onChange={(e) => setGenerationSlug(e.target.value)}
              disabled={!model}
              className="h-14 w-full border-2 border-foreground bg-background px-4 text-base font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">—</option>
              {model?.generations.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label} ({g.years})
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
    </form>
  );
}
