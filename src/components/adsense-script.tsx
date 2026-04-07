import Script from "next/script";

import { ADSENSE_PUBLISHER_ID } from "@/lib/ads-config";

/**
 * Loads the AdSense script once. Client ID from env or `ads-config` default.
 */
export function AdSenseScript() {
  if (!ADSENSE_PUBLISHER_ID) return null;

  return (
    <Script
      id="adsense-loader"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_PUBLISHER_ID)}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
