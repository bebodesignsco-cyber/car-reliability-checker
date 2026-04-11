import test from "node:test";
import assert from "node:assert/strict";

import type { SelectorModel } from "@/lib/selector-types";
import { parseYearRanges, resolveYearToGeneration } from "@/lib/model-year";

test("parseYearRanges handles dashes and present/current", () => {
  const out = parseYearRanges("2003–2006, 2008-present", 2026);
  assert.deepEqual(out, [
    { start: 2003, end: 2006 },
    { start: 2008, end: 2026 },
  ]);
});

test("resolveYearToGeneration returns no_match when year outside parseable ranges", () => {
  const model: SelectorModel = {
    slug: "test-model",
    name: "Test Model",
    generations: [
      { slug: "gen-a", label: "Gen A", years: "2001-2005" },
      { slug: "gen-b", label: "Gen B", years: "2006-2010" },
    ],
  };
  const out = resolveYearToGeneration(model, 2015);
  assert.equal(out.kind, "no_match");
});

test("resolveYearToGeneration supports overlap with preferred generation hint", () => {
  const model: SelectorModel = {
    slug: "test-model",
    name: "Test Model",
    generations: [
      { slug: "gen-a", label: "Gen A", years: "2005-2010" },
      { slug: "gen-b", label: "Gen B", years: "2008-2014" },
    ],
  };
  const out = resolveYearToGeneration(model, 2009, "gen-b");
  assert.equal(out.kind, "matched");
  if (out.kind !== "matched") return;
  assert.equal(out.matches.length, 2);
  assert.equal(out.selected.slug, "gen-b");
});

test("resolveYearToGeneration accepts placeholder-only models", () => {
  const model: SelectorModel = {
    slug: "test-model",
    name: "Test Model",
    generations: [{ slug: "all", label: "All variants", years: "—" }],
  };
  const out = resolveYearToGeneration(model, 2012);
  assert.equal(out.kind, "matched");
  if (out.kind !== "matched") return;
  assert.equal(out.selected.slug, "all");
});
