function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Deterministic JSON: object keys sorted, array order preserved, no whitespace.
 * Two packs with identical content serialize identically regardless of key
 * order, so a hash of this string identifies pack content. Array order is
 * significant on purpose; reordering records yields a different fingerprint.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}
