"use client";

import { AdSenseDisplay } from "@/components/adsense-display";
import { ADSENSE_SLOT_LEADERBOARD } from "@/lib/ads-config";

/**
 * 728×90 leaderboard below the top of the viewport on every page (horizontal scroll on narrow screens).
 */
export function SiteLeaderboard() {
  if (!ADSENSE_SLOT_LEADERBOARD) return null;

  return (
    <div className="flex w-full justify-center overflow-x-auto px-4 py-3">
      <AdSenseDisplay slot={ADSENSE_SLOT_LEADERBOARD} width={728} height={90} />
    </div>
  );
}
