import type { AiPort, Locale, Mode, Priority, RawIntent } from "../contracts";
import { normalizeText } from "./validateIntent";

// Scoring for the held-out Taglish corpus (AI-003 acceptance, AI-005 benchmarks).
// Pure; the same code runs in Node tests and inside a device build.

export interface ExpectedIntent {
  kind: RawIntent["kind"];
  /** null, one accepted spelling, or several accepted spellings. */
  originText: string | string[] | null;
  destinationText: string | string[] | null;
  useCurrentLocation: boolean;
  allowedModes: Mode[] | null;
  excludedModes: Mode[];
  priority: Priority | null;
  maxAccessWalkMeters: number | null;
  maxTransferWalkMeters: number | null;
  maxEgressWalkMeters: number | null;
  budgetCentavos: number | null;
  directOnly: boolean;
  /** True when a correct extraction must carry at least one ambiguity note. */
  requiresClarification: boolean;
}

export interface CorpusCase {
  id: string;
  locale: Locale;
  text: string;
  knownPlaceLabels: string[];
  tags: string[];
  expected: ExpectedIntent;
}

export const CRITICAL_SLOTS = [
  "kind",
  "originText",
  "destinationText",
  "useCurrentLocation",
  "allowedModes",
  "excludedModes",
  "priority",
  "maxAccessWalkMeters",
  "maxTransferWalkMeters",
  "maxEgressWalkMeters",
  "budgetCentavos",
  "directOnly",
] as const;
export type CriticalSlot = (typeof CRITICAL_SLOTS)[number];

export interface CaseScore {
  id: string;
  exact: boolean;
  slots: Record<CriticalSlot, boolean>;
  /** Origin/destination swapped with no ambiguity note: the dangerous failure. */
  silentWrongRole: boolean;
  clarificationMissed: boolean;
}

function placeMatches(expected: string | string[] | null, actual: string | null): boolean {
  if (expected === null) return actual === null;
  if (actual === null) return false;
  const accepted = (Array.isArray(expected) ? expected : [expected]).map(normalizeText);
  return accepted.includes(normalizeText(actual));
}

function sameModeSet(a: Mode[] | null, b: Mode[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((m) => b.includes(m));
}

export function scoreCase(testCase: CorpusCase, actual: RawIntent): CaseScore {
  const e = testCase.expected;
  const slots: Record<CriticalSlot, boolean> = {
    kind: e.kind === actual.kind,
    originText: placeMatches(e.originText, actual.originText),
    destinationText: placeMatches(e.destinationText, actual.destinationText),
    useCurrentLocation: e.useCurrentLocation === actual.useCurrentLocation,
    allowedModes: sameModeSet(e.allowedModes, actual.allowedModes),
    excludedModes: sameModeSet(e.excludedModes, actual.excludedModes),
    priority: e.priority === actual.priority,
    maxAccessWalkMeters: e.maxAccessWalkMeters === actual.maxAccessWalkMeters,
    maxTransferWalkMeters: e.maxTransferWalkMeters === actual.maxTransferWalkMeters,
    maxEgressWalkMeters: e.maxEgressWalkMeters === actual.maxEgressWalkMeters,
    budgetCentavos: e.budgetCentavos === actual.budgetCentavos,
    directOnly: e.directOnly === actual.directOnly,
  };
  const swapped =
    e.originText !== null &&
    e.destinationText !== null &&
    placeMatches(e.destinationText, actual.originText) &&
    placeMatches(e.originText, actual.destinationText);
  return {
    id: testCase.id,
    exact: CRITICAL_SLOTS.every((s) => slots[s]),
    slots,
    silentWrongRole: swapped && actual.ambiguities.length === 0,
    clarificationMissed: e.requiresClarification && actual.ambiguities.length === 0,
  };
}

export interface RunRecord {
  id: string;
  ok: boolean;
  errorCode: string | null;
  elapsedMs: number | null;
  score: CaseScore | null;
  intent: RawIntent | null;
  /** First completion after model load; reported apart from warm latency. */
  cold: boolean;
  /** queryId used for this case, to correlate with raw completion output. */
  queryId: string;
}

export interface RunSummary {
  cases: number;
  completed: number;
  exact: number;
  /** exact / cases; failed or errored runs count as misses. */
  exactRate: number;
  slotAccuracy: Record<CriticalSlot, number>;
  silentWrongRoles: string[];
  clarificationMisses: string[];
  errors: Record<string, number>;
  /** Warm runs only. */
  elapsedMs: { samples: number; median: number | null; p95: number | null };
  coldElapsedMs: number[];
  misses: string[];
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))] ?? null;
}

export function summarize(records: RunRecord[]): RunSummary {
  const slotAccuracy = {} as Record<CriticalSlot, number>;
  for (const slot of CRITICAL_SLOTS) {
    const hits = records.filter((r) => r.score?.slots[slot]).length;
    slotAccuracy[slot] = records.length === 0 ? 0 : hits / records.length;
  }
  const errors: Record<string, number> = {};
  for (const r of records) if (r.errorCode) errors[r.errorCode] = (errors[r.errorCode] ?? 0) + 1;
  const times = records.flatMap((r) => (r.ok && !r.cold && r.elapsedMs !== null ? [r.elapsedMs] : []));
  const coldTimes = records.flatMap((r) => (r.ok && r.cold && r.elapsedMs !== null ? [r.elapsedMs] : []));
  const exact = records.filter((r) => r.score?.exact).length;
  return {
    cases: records.length,
    completed: records.filter((r) => r.ok).length,
    exact,
    exactRate: records.length === 0 ? 0 : exact / records.length,
    slotAccuracy,
    silentWrongRoles: records.filter((r) => r.score?.silentWrongRole).map((r) => r.id),
    clarificationMisses: records.filter((r) => r.score?.clarificationMissed).map((r) => r.id),
    errors,
    elapsedMs: { samples: times.length, median: percentile(times, 50), p95: percentile(times, 95) },
    coldElapsedMs: coldTimes,
    misses: records.filter((r) => !r.score?.exact).map((r) => r.id),
  };
}

export interface RunCorpusOptions {
  /** Set when the model was loaded just before this run, so case 1 is a cold start. */
  firstIsCold?: boolean;
  onRecord?: (record: RunRecord, index: number, total: number) => void;
}

/** Runs the corpus sequentially through a real AiPort (device benchmark, AI-005). */
export async function runCorpus(
  ai: AiPort,
  cases: CorpusCase[],
  queryIdPrefix: string,
  options: RunCorpusOptions = {},
): Promise<RunRecord[]> {
  const records: RunRecord[] = [];
  for (const [index, testCase] of cases.entries()) {
    const queryId = `${queryIdPrefix}_${testCase.id}`;
    const cold = options.firstIsCold === true && index === 0;
    const result = await ai.extract({
      queryId,
      text: testCase.text,
      locale: testCase.locale,
      knownPlaceLabels: testCase.knownPlaceLabels,
    });
    const record: RunRecord = result.ok
      ? {
          id: testCase.id,
          ok: true,
          errorCode: null,
          elapsedMs: result.value.elapsedMs,
          score: scoreCase(testCase, result.value.intent),
          intent: result.value.intent,
          cold,
          queryId,
        }
      : { id: testCase.id, ok: false, errorCode: result.error.code, elapsedMs: null, score: null, intent: null, cold, queryId };
    records.push(record);
    options.onRecord?.(record, index, cases.length);
  }
  return records;
}
