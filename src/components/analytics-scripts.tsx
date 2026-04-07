"use client";

import Script from "next/script";

/**
 * Loads Google Analytics 4 when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set (e.g. G-XXXXXXXXXX).
 * Configure the property in GA4 and link Search Console for the measurement loop.
 */
export function AnalyticsScripts() {
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(id)}, { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
