import type { MetadataRoute } from "next";

import { getAllYearPaths } from "@/lib/all-generation-paths";
import { SELECTOR_TREE } from "@/lib/selector-data";
import { getSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/used-car-reliability`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
  ];

  for (const make of SELECTOR_TREE) {
    entries.push({
      url: `${base}/used-car-reliability/${make.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
    for (const model of make.models) {
      entries.push({
        url: `${base}/used-car-reliability/${make.slug}/${model.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const p of getAllYearPaths(8)) {
    entries.push({
      url: `${base}/${p.make}/${p.model}/${p.segment}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }

  return entries;
}
