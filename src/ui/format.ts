// Member 3: pure display formatting. No React or native imports so tests/ui can run under node:test.
// Money stays in integer centavos and distance in integer meters until display.

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 1250 -> "₱12.50"; 100000 -> "₱1,000.00". Rejects non-integer or negative input. */
export function formatCentavos(centavos: number): string {
  if (!Number.isInteger(centavos) || centavos < 0) {
    throw new RangeError(`Invalid centavos: ${centavos}`);
  }
  const pesos = Math.floor(centavos / 100);
  const cents = centavos % 100;
  return `₱${groupThousands(String(pesos))}.${String(cents).padStart(2, "0")}`;
}

/** A single amount when min equals max, otherwise "₱12.00–₱15.00". */
export function formatCentavosRange(minCentavos: number, maxCentavos: number): string {
  if (minCentavos === maxCentavos) return formatCentavos(minCentavos);
  return `${formatCentavos(minCentavos)}–${formatCentavos(maxCentavos)}`;
}

/** Exact meters, never rounded into kilometers: 1250 -> "1,250 m". */
export function formatMeters(meters: number): string {
  if (!Number.isInteger(meters) || meters < 0) {
    throw new RangeError(`Invalid meters: ${meters}`);
  }
  return `${groupThousands(String(meters))} m`;
}

/** ISO 8601 timestamp -> "2026-10-09". Returns the input unchanged when it is not a date. */
export function formatDate(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : iso;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false };

const MAX_PESOS_DIGITS = 7; // ₱9,999,999.99 upper bound keeps centavos a safe integer

/**
 * Parses a peso amount typed by the user into integer centavos without floating point.
 * Accepts "50", "50.5", "50.50", "₱1,000", "PHP 20". Empty input means "no budget" (null).
 */
export function parsePesosToCentavos(input: string): ParseResult<number | null> {
  let text = input.trim();
  if (text === "") return { ok: true, value: null };
  text = text.replace(/^(₱|php|p)\s*/i, "").replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return { ok: false };
  const [, whole, fraction = ""] = match;
  if (whole.replace(/^0+(?=\d)/, "").length > MAX_PESOS_DIGITS) return { ok: false };
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? { ok: true, value: centavos } : { ok: false };
}

const MAX_WALK_METERS = 50_000;

/** Parses whole, nonnegative meters ("1000", "1,000"). Empty, decimal or negative input is rejected. */
export function parseMeters(input: string): ParseResult<number> {
  const text = input.trim().replace(/,/g, "").replace(/\s*m$/i, "");
  if (!/^\d+$/.test(text)) return { ok: false };
  const meters = Number(text);
  return meters <= MAX_WALK_METERS ? { ok: true, value: meters } : { ok: false };
}

/** Centavos -> editable text ("5050" -> "50.50"); null -> "". */
export function centavosToInput(centavos: number | null): string {
  if (centavos === null) return "";
  const pesos = Math.floor(centavos / 100);
  const cents = centavos % 100;
  return cents === 0 ? String(pesos) : `${pesos}.${String(cents).padStart(2, "0")}`;
}
