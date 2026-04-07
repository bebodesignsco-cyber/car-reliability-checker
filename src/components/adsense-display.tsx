"use client";

import { useEffect, useRef } from "react";

import { ADSENSE_PUBLISHER_ID } from "@/lib/ads-config";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSenseDisplayProps = {
  /** Ad unit slot ID from Google AdSense. */
  slot: string;
  /** Fixed size (e.g. leaderboard 728×90). Omit for responsive auto format. */
  width?: number;
  height?: number;
  /** Optional min-height to reduce CLS while the slot resolves. */
  className?: string;
};

/**
 * Single display ad unit. Push runs after mount; script is loaded by `AdSenseScript` in root layout.
 */
export function AdSenseDisplay({
  slot,
  width,
  height,
  className = "",
}: AdSenseDisplayProps) {
  const insRef = useRef<HTMLModElement>(null);
  const fixed = width != null && height != null;

  useEffect(() => {
    if (!ADSENSE_PUBLISHER_ID || !slot || !insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore fill errors in dev or ad blockers */
    }
  }, [slot]);

  if (!ADSENSE_PUBLISHER_ID || !slot) return null;

  const minH = fixed ? height : 120;

  return (
    <div
      className={`w-full max-w-full overflow-hidden ${fixed ? "" : "min-h-[120px]"} ${className}`}
      style={fixed ? { minHeight: minH } : undefined}
      aria-hidden
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={
          fixed
            ? { display: "inline-block", width, height }
            : { display: "block" }
        }
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        {...(fixed
          ? {}
          : {
              "data-ad-format": "auto" as const,
              "data-full-width-responsive": "true" as const,
            })}
      />
    </div>
  );
}
