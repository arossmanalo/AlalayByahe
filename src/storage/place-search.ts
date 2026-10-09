import type { Place, PlaceCandidate, ResolveResult } from "../contracts";

export function normalizePlaceText(text: string): string {
  return text.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1]! + 1, row[j]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length]!;
}
export function resolveStoredPlaces(text: string, places: readonly Place[]): ResolveResult {
  const query = normalizePlaceText(text);
  if (!query) return { candidates: [], needsConfirmation: true };
  const exact: PlaceCandidate[] = [];
  const fuzzy: PlaceCandidate[] = [];
  for (const place of places) {
    const name = normalizePlaceText(place.name), aliases = place.aliases.map(normalizePlaceText);
    if (name === query) exact.push({ place, match: "exact" });
    else if (aliases.includes(query)) exact.push({ place, match: "alias" });
    else if (query.length >= 3 && [name, ...aliases].some(label =>
      label.includes(query) || (query.length >= 5 && Math.abs(query.length - label.length) <= 2 && distance(query, label) <= 2))) {
      fuzzy.push({ place, match: "fuzzy" });
    }
  }
  const candidates = (exact.length ? exact : fuzzy).sort((a, b) =>
    a.place.locality.localeCompare(b.place.locality) || a.place.name.localeCompare(b.place.name));
  return { candidates: candidates.slice(0, 10),
    needsConfirmation: candidates.length !== 1 || candidates[0]?.match === "fuzzy" };
}

