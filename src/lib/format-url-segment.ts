function formatToken(token: string): string {
  const alnum = token.match(/^([a-z]+)(\d+)$/i);
  if (alnum) {
    return alnum[1].toUpperCase() + alnum[2];
  }
  if (token.length === 0) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Turns a URL segment (e.g. volvo-polestar, xc90) into readable title text.
 */
export function formatUrlSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split("-")
    .filter(Boolean)
    .map(formatToken)
    .join(" ");
}
