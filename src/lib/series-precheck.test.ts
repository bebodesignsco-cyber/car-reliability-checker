import test from "node:test";
import assert from "node:assert/strict";

import { resolveSeriesCandidates } from "@/lib/series-precheck";

test("BMW 2 Series 2016 returns multiple series candidates", async () => {
  const out = await resolveSeriesCandidates("bmw", "2-series", 2016);
  assert.equal(out.status, "multiple");
  assert.ok(out.candidates.length > 1);
});

test("series precheck always returns valid status", async () => {
  const out = await resolveSeriesCandidates("toyota", "camry", 2018);
  assert.ok(["single", "multiple", "none"].includes(out.status));
});
