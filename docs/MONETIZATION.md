# SEO, Analytics, and AdSense

## Environment variables

Copy `.env.example` to `.env.local` and set values for production.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical base URL (no trailing slash). Required for correct sitemap, Open Graph, and JSON-LD in production. On Vercel, `VERCEL_URL` is used as a fallback when unset. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Google Analytics 4 property. Link the GA4 property to Google Search Console for the measurement loop. |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | AdSense publisher ID (`ca-pub-...`). Loads the AdSense script with `lazyOnload` to reduce impact on Core Web Vitals. |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | Display ad unit slot IDs for each template (create units in AdSense). Leave empty to hide that placement. |

## Google Search Console

1. Verify domain or URL-prefix property for your production URL.
2. Submit `https://<your-domain>/sitemap.xml` in Sitemaps.
3. Monitor Coverage, Experience (Core Web Vitals), and Search results.

## Google Analytics 4

1. Create a GA4 data stream for your website.
2. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` to the Measurement ID (starts with `G-`).
3. In GA4 Admin, link the Google Ads / AdSense accounts if you use them.

## Google AdSense

1. Apply for AdSense and get approval on your production domain.
2. Create display ad units for: home, pillar, in-article (after trust score), mid-content, footer (generation pages).
3. Map each unit’s slot ID to the matching `NEXT_PUBLIC_ADSENSE_SLOT_*` variable.
4. Keep a healthy content-to-ad ratio; avoid placing ads where they obscure main content or break policies.

## 30 / 60 / 90 day loop

- **30 days:** Fix crawl errors, validate rich results (FAQ, breadcrumbs), tune titles on underperforming queries.
- **60 days:** Expand internal links from hubs to high-value generations; refresh stale reports.
- **90 days:** Compare organic clicks vs RPM/EPMV by page template; prune or merge thin URLs.
