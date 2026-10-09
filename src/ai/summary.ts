import type { JourneyOption, RouteRequest } from "../contracts";
import type { ChatMessage } from "./prompt";
import type { CompletionOutcome, CompletionRequest } from "./runtime";

/**
 * AI trip summary (user-approved policy change, 2026-10-10; see contract §4 note).
 *
 * The on-device model rewrites the facts of ONE verified journey option into a short plain-language
 * summary. It is never the source of a fact: it only receives facts produced by the deterministic
 * route engine, and its text is shown only if it passes `checkSummary` (no number, fare, time or stop
 * that is not in the facts; first boarding stop and final stop named, in that order). Otherwise the
 * deterministic `templateSummary` is shown instead and labelled as such. The numbered steps from the
 * route engine always stay on screen and remain the authority.
 *
 * Same option and language give the same request (temperature 0, fixed seed), so a trip entered by
 * text or picked manually gets the same summary.
 */

export type SummaryLanguage = "en" | "fil";

export interface TripSummaryInput {
  queryId: string;
  option: JourneyOption;
  request: Pick<RouteRequest, "origin" | "destination">;
  language: SummaryLanguage;
}

export interface TripSummary {
  text: string;
  source: "phone_ai" | "template";
  /** Why the model's text was not used, when source is "template". */
  fallbackReason?: "ai_not_ready" | "ai_failed" | "check_failed";
  engine?: { modelId: string; modelRevision: string; runtime: string };
  elapsedMs?: number;
}

export interface TripFacts {
  origin: string;
  destination: string;
  lines: string[];
  firstBoard: string | null;
  finalStop: string | null;
  /** Every number that appears in the facts; the model may not introduce any other. */
  allowedNumbers: Set<string>;
}

const MODE_NAME: Record<string, string> = { van: "van/UV", jeepney: "jeepney", bus: "bus", tricycle: "tricycle", lrt: "LRT" };

function pesos(centavos: number): string {
  const whole = Math.floor(centavos / 100), cents = centavos % 100;
  return `PHP ${whole.toLocaleString("en-US")}.${String(cents).padStart(2, "0")}`;
}
function range(min: number, max: number): string {
  return min === max ? pesos(min) : `${pesos(min)} to ${pesos(max)}`;
}
/** "Vito Cruz (LRT-1 platform)" -> "Vito Cruz"; drops the onboard prefix. */
export function coreName(label: string): string {
  return label.replace(/^Currently onboard; next stop: /, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

export function fareFact(option: JourneyOption): string {
  const f = option.fare;
  if (f.status === "complete") return `Fare: ${range(f.knownMinCentavos, f.knownMaxCentavos)} in total.`;
  if (f.status === "partial") {
    return `Fare: known subtotal ${range(f.knownMinCentavos, f.knownMaxCentavos)}, not the full total; ${f.unknownRideLegs} ride fare(s) unknown.`;
  }
  return "Fare: unknown; confirm with the driver or operator.";
}

export function tripFacts(option: JourneyOption, request: TripSummaryInput["request"]): TripFacts {
  const lines: string[] = [];
  let firstBoard: string | null = null, finalStop: string | null = null;
  option.legs.forEach((leg) => {
    if (leg.kind === "walk") {
      lines.push(`Walk ${leg.meters} m.`);
    } else {
      const board = coreName(leg.boardLabel), alight = coreName(leg.alightLabel);
      firstBoard ??= board;
      finalStop = alight;
      lines.push(leg.alreadyOnboard
        ? `Stay on the ${MODE_NAME[leg.mode]} "${leg.serviceName}" (sign: ${leg.headsign}) and get off at ${alight}.`
        : `Board the ${MODE_NAME[leg.mode]} "${leg.serviceName}" at ${board} (sign: ${leg.headsign}) and get off at ${alight}.`);
    }
  });
  lines.push(`Transfers: ${option.transfers}. Total walking: ${option.walkMeters} m.`);
  lines.push(fareFact(option));
  const text = [request.origin.label, request.destination.label, ...lines].join(" ");
  const allowedNumbers = new Set(numbersIn(text));
  return { origin: request.origin.label, destination: request.destination.label, lines, firstBoard, finalStop, allowedNumbers };
}

/** Numbers as written, with thousands separators removed ("1,662.00" -> "1662.00" and "1662"). */
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/\d+(?:\.\d+)?/g)) {
    out.push(m[0]);
    if (m[0].includes(".")) out.push(m[0].replace(/\.0+$/, ""));
  }
  return out;
}

export const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: { summary: { type: "string" } },
} as const;

export const SUMMARY_MAX_TOKENS = 200;
const SUMMARY_SEED = 42;

const SYSTEM = [
  "You write a short trip summary for a commuter in the Philippines. Reply with JSON only: {\"summary\": \"...\"}.",
  "Use ONLY the facts given. Do not add any place, stop, number, fare, time, schedule, speed, traffic or advice that is not in the facts.",
  "Keep every stop name and every amount exactly as written. Mention where to board first and where to get off last, in order.",
  "Write 2 to 4 short sentences. Do not say fastest, live, or how long it takes.",
].join("\n");

export function buildSummaryRequest(facts: TripFacts, language: SummaryLanguage): CompletionRequest {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        `Language: ${language === "fil" ? "Filipino" : "English"}`,
        `From: ${facts.origin}`,
        `To: ${facts.destination}`,
        "Facts:",
        ...facts.lines.map((l, i) => `${i + 1}. ${l}`),
      ].join("\n"),
    },
  ];
  return { messages, jsonSchema: SUMMARY_SCHEMA, maxTokens: SUMMARY_MAX_TOKENS, temperature: 0, seed: SUMMARY_SEED };
}

const FORBIDDEN = /\b(minutes?|mins?|hours?|hrs?|oras|minuto|segundo|seconds?|fastest|quickest|pinakamabilis|mabilis|live|real[- ]?time|schedule|timetable|traffic|guarantee[ds]?|always|every \d+)\b/i;

function normalize(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Returns the summary text if it is safe to show, otherwise null. */
export function checkSummary(outcome: CompletionOutcome, facts: TripFacts): string | null {
  if (outcome.truncated || outcome.contextFull || outcome.interrupted || outcome.stoppedLimit || !outcome.stoppedEos) return null;
  if (outcome.tokensPredicted >= SUMMARY_MAX_TOKENS) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(outcome.text.trim()); } catch { return null; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const keys = Object.keys(parsed);
  const text = (parsed as { summary?: unknown }).summary;
  if (keys.length !== 1 || typeof text !== "string") return null;
  const summary = text.replace(/\s+/g, " ").trim();
  if (summary.length < 20 || summary.length > 600) return null;
  if (FORBIDDEN.test(summary)) return null;
  for (const n of numbersIn(summary)) if (!facts.allowedNumbers.has(n)) return null;
  if (/[₱$]/.test(summary) && !/PHP|₱/.test(summary)) return null;
  const norm = ` ${normalize(summary)} `;
  if (facts.firstBoard && facts.finalStop) {
    const first = norm.indexOf(` ${normalize(facts.firstBoard)} `);
    const last = norm.lastIndexOf(` ${normalize(facts.finalStop)} `);
    if (first < 0 || last < 0 || (facts.firstBoard !== facts.finalStop && last <= first)) return null;
  }
  return summary;
}

/** Deterministic summary used when the model is not ready, fails, or its text does not pass the check. */
export function templateSummary(facts: TripFacts, language: SummaryLanguage): string {
  const intro = language === "fil" ? `Mula ${facts.origin} papuntang ${facts.destination}.` : `From ${facts.origin} to ${facts.destination}.`;
  return [intro, ...facts.lines].join(" ");
}
