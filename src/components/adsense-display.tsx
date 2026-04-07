"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSenseDisplayProps = {
  /** Ad unit slot ID from Google AdSense. */
  slot: string;
  /** Optional min-height to reduce CLS while the slot resolves. */
  className?: string;
};

/**
 * Single display ad unit. Push runs after mount; script is loaded by `AdSenseScript` in root layout.
 */
export function AdSenseDisplay({ slot, className = "" }: AdSenseDisplayProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !slot || !insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore fill errors in dev or ad blockers */
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div
      className={`min-h-[120px] w-full max-w-full overflow-hidden ${className}`}
      aria-hidden
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
