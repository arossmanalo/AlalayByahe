/**
 * Canonical form for place names and aliases. Storage (INT-002) must index and
 * query aliases with this exact function so lookup and import agree.
 *
 * Lowercases, strips diacritics and punctuation, and collapses whitespace.
 * It does not translate or expand abbreviations: "Sto." stays distinct from
 * "Santo" until an alias record says otherwise.
 */
export function normalizeAlias(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distinct normalized lookup keys for a place: its name plus every alias. */
export function placeSearchKeys(place: { name: string; aliases: readonly string[] }): string[] {
  const keys = new Set<string>();
  for (const text of [place.name, ...place.aliases]) {
    const key = normalizeAlias(text);
    if (key.length > 0) keys.add(key);
  }
  return [...keys];
}
