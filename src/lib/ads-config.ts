/**
 * Public AdSense IDs (also exposed in HTML). Env overrides defaults.
 */
export const ADSENSE_PUBLISHER_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? "ca-pub-7867649827185336";

/** Site-wide 728×90 leaderboard (ad unit slot). */
export const ADSENSE_SLOT_LEADERBOARD =
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD?.trim() ??
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME?.trim() ??
  "2481372495";
