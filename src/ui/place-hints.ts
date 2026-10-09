// Spelling hints for the on-device model (ExtractInput.knownPlaceLabels). Pure: no React or native imports.
//
// The model gets a short list of stored place names that the user's own words appear to mention, so that
// every stored place has the same chance of being recognised. Sending the first N places in pack order
// biased the model toward whichever places happened to come first (the LRT-1 stations and the start of
// the Lipa road draft), so other demo places were read less reliably. The hints are advisory only: the
// prompt tells the model to use a name only if the message mentions it, and the repository still
// resolves and the user still confirms every place.
import type { Place } from "../contracts";
import { normalizeAlias } from "../data/normalize";

export const MAX_PLACE_HINTS = 30; // contract §4: at most 30 known place labels
const MAX_HINT_CHARS = 120; // ExtractInput label length limit
const STOP_WORDS = new Set([
  "from", "to", "the", "and", "via", "near", "station", "terminal", "stop", "city", "town", "proper",
  "mula", "sa", "ng", "papunta", "papuntang", "pupunta", "galing", "hanggang", "ako", "na", "lang", "po",
]);

function tokens(text: string): string[] {
  return normalizeAlias(text).split(" ").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/** True when two words are equal or one edit apart (typos such as "candelarya"); short words must match exactly. */
function similar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Stored place names (and matching aliases) that the request text mentions, most specific first, then in
 * pack order. Returns an empty list when nothing matches; never pads with unrelated places.
 */
export function selectPlaceHints(text: string, places: readonly Place[], limit = MAX_PLACE_HINTS): string[] {
  const query = normalizeAlias(text);
  const queryWords = tokens(text);
  if (!query || queryWords.length === 0) return [];
  const scored: { labels: string[]; score: number; order: number }[] = [];
  places.forEach((place, order) => {
    let score = 0;
    const matched: string[] = [];
    for (const label of [place.name, ...place.aliases]) {
      const norm = normalizeAlias(label);
      const words = tokens(label);
      if (words.length === 0) continue;
      const whole = norm.length >= 3 && ` ${query} `.includes(` ${norm} `);
      const hits = words.filter((w) => queryWords.some((q) => similar(q, w))).length;
      if (whole || hits > 0) {
        score = Math.max(score, (whole ? 100 : 0) + hits * 10 - (words.length - hits));
        matched.push(label);
      }
    }
    if (score > 0) scored.push({ labels: [place.name, ...matched.filter((l) => l !== place.name)], score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  const out: string[] = [];
  for (const entry of scored) {
    for (const label of entry.labels) {
      const clean = label.replace(/\s+/g, " ").trim();
      if (!clean || clean.length > MAX_HINT_CHARS || out.includes(clean)) continue;
      out.push(clean);
      if (out.length === limit) return out;
    }
  }
  return out;
}
