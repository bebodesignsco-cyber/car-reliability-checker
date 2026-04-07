/**
 * Public site origin for canonical URLs, sitemap, and OG tags.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://www.yoursite.com.au).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export const SITE_NAME = "Used Car Reliability Guide";

export const SITE_DESCRIPTION =
  "Generation-level trust scores, engine picks, and platform risks for used car buyers in Australia.";
