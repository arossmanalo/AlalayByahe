const DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function validDate(y: number, m: number, d: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/**
 * Parses an ISO 8601 date-time that carries an explicit timezone
 * (Z or +hh:mm). Returns epoch milliseconds, or null when malformed.
 * Calendar validity is checked here rather than delegated to Date.parse so
 * results do not depend on the JavaScript engine's leniency.
 */
export function parseIsoDateTime(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = DATETIME_RE.exec(text);
  if (!m) return null;
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number) as [
    number, number, number, number, number,
  ];
  const s = m[6] === undefined ? 0 : Number(m[6]);
  if (!validDate(y, mo, d) || h > 23 || mi > 59 || s > 59) return null;
  let offsetMinutes = 0;
  const tz = m[7] as string;
  if (tz !== "Z") {
    const oh = Number(tz.slice(1, 3));
    const om = Number(tz.slice(4, 6));
    if (oh > 23 || om > 59) return null;
    offsetMinutes = (tz[0] === "-" ? -1 : 1) * (oh * 60 + om);
  }
  const fraction = /\.(\d+)/.exec(text);
  const ms = fraction ? Math.floor(Number(`0.${fraction[1]}`) * 1000) : 0;
  return Date.UTC(y, mo - 1, d, h, mi, s, ms) - offsetMinutes * 60_000;
}

/**
 * Accepts either a full ISO 8601 date-time with timezone or a plain
 * YYYY-MM-DD calendar date (treated as UTC midnight, for ordering only).
 */
export function parseIsoDateOrDateTime(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const d = DATE_RE.exec(text);
  if (d) {
    const [y, mo, day] = [d[1], d[2], d[3]].map(Number) as [number, number, number];
    return validDate(y, mo, day) ? Date.UTC(y, mo - 1, day) : null;
  }
  return parseIsoDateTime(text);
}
