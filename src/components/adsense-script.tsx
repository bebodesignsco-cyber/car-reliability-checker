import Script from "next/script";

/**
 * Loads the AdSense script once. Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (ca-pub-...).
 * Create display ad units in AdSense and set slot env vars for `AdSenseDisplay`.
 */
export function AdSenseScript() {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  if (!id) return null;

  return (
    <Script
      id="adsense-loader"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(id)}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
