import type { Mode, RawIntent, Result } from "../contracts";
import { AI_MESSAGES, fail, ok } from "./errors";
import { INTENT_KINDS, MODES, PRIORITIES, RAW_INTENT_KEYS } from "./extractionSchema";

const MAX_MODEL_NOTES = 3;
const MAX_NOTE_CHARS = 120;

function invalid(field: string, why: string): Result<RawIntent> {
  return fail("AI_INVALID_OUTPUT", AI_MESSAGES.invalidOutput, true, {
    field,
    missingConnection: why,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNonNegativeInt(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

function isModeList(value: unknown): value is Mode[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<unknown>();
  for (const item of value) {
    if (!(MODES as readonly unknown[]).includes(item) || seen.has(item)) return false;
    seen.add(item);
  }
  return true;
}

/**
 * Structural validation against the canonical RawIntent schema (contract v1.0 §4).
 * The grammar constrains syntax on-device, but model output is still untrusted.
 */
export function validateRawIntent(value: unknown): Result<RawIntent> {
  if (!isPlainObject(value)) return invalid("intent", "Output is not a JSON object.");

  const keys = Object.keys(value);
  for (const key of keys) {
    if (!(RAW_INTENT_KEYS as readonly string[]).includes(key)) return invalid(key, "Unexpected key.");
  }
  for (const key of RAW_INTENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return invalid(key, "Missing key.");
  }

  if (!(INTENT_KINDS as readonly unknown[]).includes(value.kind)) return invalid("kind", "Invalid kind.");
  if (!isNullableString(value.originText)) return invalid("originText", "Expected string or null.");
  if (!isNullableString(value.destinationText)) return invalid("destinationText", "Expected string or null.");
  if (typeof value.useCurrentLocation !== "boolean") return invalid("useCurrentLocation", "Expected boolean.");
  if (value.allowedModes !== null && !isModeList(value.allowedModes)) {
    return invalid("allowedModes", "Expected null or unique mode list.");
  }
  if (!isModeList(value.excludedModes)) return invalid("excludedModes", "Expected unique mode list.");
  if (value.priority !== null && !(PRIORITIES as readonly unknown[]).includes(value.priority)) {
    return invalid("priority", "Invalid priority.");
  }
  for (const field of [
    "maxAccessWalkMeters",
    "maxTransferWalkMeters",
    "maxEgressWalkMeters",
    "budgetCentavos",
  ] as const) {
    if (!isNullableNonNegativeInt(value[field])) return invalid(field, "Expected nonnegative integer or null.");
  }
  if (typeof value.directOnly !== "boolean") return invalid("directOnly", "Expected boolean.");
  if (!Array.isArray(value.ambiguities) || !value.ambiguities.every((a) => typeof a === "string")) {
    return invalid("ambiguities", "Expected string list.");
  }

  return ok({
    kind: value.kind as RawIntent["kind"],
    originText: value.originText,
    destinationText: value.destinationText,
    useCurrentLocation: value.useCurrentLocation,
    allowedModes: value.allowedModes === null ? null : [...(value.allowedModes as Mode[])],
    excludedModes: [...value.excludedModes],
    priority: value.priority as RawIntent["priority"],
    maxAccessWalkMeters: value.maxAccessWalkMeters as number | null,
    maxTransferWalkMeters: value.maxTransferWalkMeters as number | null,
    maxEgressWalkMeters: value.maxEgressWalkMeters as number | null,
    budgetCentavos: value.budgetCentavos as number | null,
    directOnly: value.directOnly,
    ambiguities: [...(value.ambiguities as string[])],
  });
}

/** Lowercase, strip diacritics/punctuation and collapse whitespace for literal matching. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const p = normalizeText(phrase);
  return p.length > 0 && ` ${haystack} `.includes(` ${p} `);
}

const MODE_WORDS: Record<Mode, string[]> = {
  van: ["van", "vans", "uv", "uv express", "fx"],
  jeepney: ["jeep", "jeeps", "jeepney", "jeepneys", "dyip", "dyipni", "jip"],
  bus: ["bus", "buses", "busses", "bas"],
  tricycle: ["tricycle", "tricycles", "trike", "trikes", "traysikel", "trysikel", "tryk"],
  lrt: ["lrt", "lrt1", "lrt 1", "tren", "train", "trains"],
};

const HOME_WORDS = ["uwi", "umuwi", "uuwi", "pauwi", "bahay", "home", "amin", "samin", "sa amin"];
const DIRECT_WORDS = [
  "diretso", "deretso", "direct", "directly", "walang lipat", "di na lilipat", "hindi lilipat",
  "isang sakay", "isang sakayan", "one ride", "no transfer", "no transfers", "without transfer",
];
const NUMBER_WORDS = [
  "isa", "isang", "dalawa", "dalawang", "tatlo", "tatlong", "apat", "lima", "limang", "anim", "pito",
  "walo", "siyam", "sampu", "sampung", "daan", "raan", "libo", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "hundred", "thousand", "half", "kalahati", "kalahating",
  // Spanish-derived numerals common in peso amounts.
  "uno", "dos", "tres", "kwatro", "singko", "sais", "siyete", "otso", "nuwebe", "diyes", "onse", "dose",
  "bente", "beinte", "trenta", "kwarenta", "singkwenta", "sisenta", "setenta", "otsenta", "nobenta",
  "siyento", "mil",
];

/** Peso amounts written in the message, in whole pesos. */
export function pesoAmountsInText(text: string): number[] {
  const amounts = new Set<number>();
  const lower = text.toLowerCase().replace(/,/g, "");
  const before = /(?:₱|php|\bp)\s?(\d+(?:\.\d{1,2})?)/g;
  const after = /(\d+(?:\.\d{1,2})?)\s?(?:pesos?|piso|php)\b/g;
  for (const re of [before, after]) {
    for (const match of lower.matchAll(re)) amounts.add(Number(match[1]));
  }
  return [...amounts].filter((n) => Number.isFinite(n));
}

/** Distances written in the message, converted to meters. */
export function metersInText(text: string): number[] {
  const values = new Set<number>();
  const lower = text.toLowerCase().replace(/,/g, "");
  const re = /(\d+(?:\.\d+)?)\s?(km|kilometers?|kilometres?|kilometro|m|meters?|metres?|metro)\b/g;
  for (const match of lower.matchAll(re)) {
    const n = Number(match[1]);
    const unit = match[2] ?? "";
    if (!Number.isFinite(n)) continue;
    values.add(Math.round(unit.startsWith("k") ? n * 1000 : n));
  }
  return [...values];
}

function hasAnyNumber(normalized: string): boolean {
  return /\d/.test(normalized) || NUMBER_WORDS.some((w) => containsPhrase(normalized, w));
}

function cleanPlace(text: string | null): string | null {
  if (text === null) return null;
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length === 0 ? null : trimmed;
}

function sanitizeModelNotes(notes: string[]): string[] {
  return notes
    .map((n) => n.replace(/\s+/g, " ").trim())
    .filter((n) => n.length > 0)
    .slice(0, MAX_MODEL_NOTES)
    .map((n) => {
      // Model text is never allowed to carry amounts, distances or route numbers to the UI.
      if (/\d|₱|\bphp\b|\bpesos?\b/i.test(n)) return "AI flagged an unclear detail; please check every field.";
      return n.length > MAX_NOTE_CHARS ? `${n.slice(0, MAX_NOTE_CHARS - 1)}…` : n;
    });
}

/**
 * Deterministic semantic checks. They never change roles, places or limits; they
 * only add notes that the confirmation screen must surface before routing.
 */
export function checkIntentAgainstQuery(intent: RawIntent, queryText: string): RawIntent {
  const query = normalizeText(queryText);
  const notes: string[] = [];
  const origin = cleanPlace(intent.originText);
  const destination = cleanPlace(intent.destinationText);

  if (origin !== null && !containsPhrase(query, origin)) {
    notes.push(`Origin "${origin}" is not in your message. Please confirm the starting place.`);
  }
  if (destination !== null && !containsPhrase(query, destination)) {
    notes.push(`Destination "${destination}" is not in your message. Please confirm where you are going.`);
  }
  if (origin !== null && destination !== null && normalizeText(origin) === normalizeText(destination)) {
    notes.push("Origin and destination look the same. Did you mean another place or branch?");
  }
  if (intent.useCurrentLocation && origin !== null) {
    notes.push("Both your current location and a named starting place were found. Choose one.");
  }

  const mentionsHome = HOME_WORDS.some((w) => containsPhrase(query, w));
  const destinationIsHome = destination !== null && HOME_WORDS.includes(normalizeText(destination));
  if (destinationIsHome || (mentionsHome && destination === null)) {
    notes.push("Home is not a saved place. Which place is home for this trip?");
  }

  const allowed = intent.allowedModes;
  const excluded = intent.excludedModes;
  if (allowed !== null) {
    const both = allowed.filter((m) => excluded.includes(m));
    if (both.length > 0) {
      notes.push(`Your mode preferences conflict (${both.join(", ")} is both allowed and excluded). Which should apply?`);
    }
    if (allowed.filter((m) => !excluded.includes(m)).length === 0) {
      notes.push("No travel mode is left after your restrictions. Which modes should apply?");
    }
  } else if (excluded.length === MODES.length) {
    notes.push("Every travel mode was excluded. Which modes should apply?");
  }
  for (const mode of new Set([...(allowed ?? []), ...excluded])) {
    if (!MODE_WORDS[mode].some((w) => containsPhrase(query, w))) {
      notes.push(`The ${mode} restriction was not found in your message. Please confirm your modes.`);
    }
  }

  if (intent.directOnly && !DIRECT_WORDS.some((w) => containsPhrase(query, w))) {
    notes.push("Direct-only was not clearly requested. Please confirm whether transfers are allowed.");
  }

  const walkValues = [intent.maxAccessWalkMeters, intent.maxTransferWalkMeters, intent.maxEgressWalkMeters];
  const anyLimit = walkValues.some((v) => v !== null) || intent.budgetCentavos !== null;
  if (anyLimit && !hasAnyNumber(query)) {
    notes.push("A walking or budget limit was found that is not in your message. Please confirm your limits.");
  } else {
    const stated = metersInText(queryText);
    if (stated.length > 0 && walkValues.some((v) => v !== null && !stated.includes(v))) {
      notes.push("A walking limit does not match the distance in your message. Please confirm it.");
    }
    const pesos = pesoAmountsInText(queryText);
    if (intent.budgetCentavos !== null && pesos.length > 0) {
      const expected = pesos.map((p) => Math.round(p * 100));
      if (!expected.includes(intent.budgetCentavos)) {
        notes.push(`Please confirm your budget (your message mentions ₱${pesos.join(", ₱")}).`);
      }
    }
  }

  return {
    ...intent,
    originText: origin,
    destinationText: destination,
    allowedModes: allowed === null ? null : [...allowed],
    excludedModes: [...excluded],
    ambiguities: [...notes, ...sanitizeModelNotes(intent.ambiguities)],
  };
}
