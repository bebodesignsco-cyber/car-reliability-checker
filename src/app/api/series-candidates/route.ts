import { NextResponse } from "next/server";

import { resolveSeriesCandidates } from "@/lib/series-precheck";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const make = url.searchParams.get("make")?.trim() ?? "";
  const model = url.searchParams.get("model")?.trim() ?? "";
  const yearRaw = url.searchParams.get("year")?.trim() ?? "";
  if (!make || !model || !/^\d{4}$/.test(yearRaw)) {
    return NextResponse.json({ error: "Invalid make/model/year query" }, { status: 400 });
  }

  const year = Number(yearRaw);
  const result = await resolveSeriesCandidates(make, model, year);
  return NextResponse.json(result);
}
