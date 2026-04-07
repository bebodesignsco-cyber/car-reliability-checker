/**
 * Stable URL segment from a display name (Redbook make/family/year-group names).
 */
export function urlSegmentSlug(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "x";
}
