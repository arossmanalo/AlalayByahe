import type {
  Evidence, FarePolicy, FareQuote, JourneyOption, JourneyPreferences, Reliability, TransitPack,
} from "../contracts/index";
import { parseIsoDateOrDateTime } from "../data/isoTime";

/**
 * Fare calculation (ROUTE-004). Integer centavos only; no floating point money.
 *
 * Rules enforced here:
 *  - Unknown is never zero: an unknown quote has null min and max.
 *  - A fare is charged once per boarding (callers quote rides, not graph edges).
 *  - Expired, not-yet-valid or conflicting policies produce an unknown quote.
 *  - Distance fares use documented segment meters only, never aerial distance.
 *  - A discount is applied only when the policy documents it for that passenger.
 *
 * Discount ratio: the contract gives numerator/denominator without saying whether
 * it is the discount or the payable share. This module pins it as the PAYABLE
 * share (4/5 means the passenger pays 80% of the regular fare). This is awaiting
 * confirmation from the contract owner; see docs/evidence/pack-status.md.
 */

export type Passenger = JourneyPreferences["passenger"];

export interface RideFareQuery {
  serviceId: string;
  directionId: string;
  boardStopId: string;
  alightStopId: string;
  /** Positions in the direction's ordered stop list. */
  boardIndex: number;
  alightIndex: number;
  /** Ordered stop IDs of the direction, used to chain adjacent documented segments. */
  directionStopIds: readonly string[];
  passenger: Passenger;
  nowMs: number;
}

export interface FareBook {
  policiesByService: ReadonlyMap<string, FarePolicy[]>;
}

const books = new WeakMap<TransitPack, FareBook>();

export function buildFareBook(pack: TransitPack): FareBook {
  const hit = books.get(pack);
  if (hit) return hit;
  const policiesByService = new Map<string, FarePolicy[]>();
  for (const policy of [...pack.fares].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const list = policiesByService.get(policy.serviceId);
    if (list) list.push(policy);
    else policiesByService.set(policy.serviceId, [policy]);
  }
  const book = { policiesByService };
  books.set(pack, book);
  return book;
}

export const UNKNOWN_FARE_COPY = "Confirm fare with the driver/operator.";

export function unknownQuote(basis: string): FareQuote {
  return { status: "unknown", minCentavos: null, maxCentavos: null, sourceIds: [], basis };
}

/** Quote for a ride the passenger is already on: payment status is not known. */
export function currentRideQuote(): FareQuote {
  return unknownQuote("Current ride fare/payment is not confirmed.");
}

/* ---------------- validity ---------------- */

const MANILA_OFFSET_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Date-only bounds are Philippine calendar days, inclusive. */
function windowStart(text: string): number | null {
  const ms = parseIsoDateOrDateTime(text);
  if (ms === null) return null;
  return DATE_ONLY.test(text) ? ms - MANILA_OFFSET_MS : ms;
}
function windowEnd(text: string): number | null {
  const ms = parseIsoDateOrDateTime(text);
  if (ms === null) return null;
  return DATE_ONLY.test(text) ? ms - MANILA_OFFSET_MS + DAY_MS - 1 : ms;
}

type Validity = "current" | "expired" | "future" | "invalid";

function validityAt(policy: FarePolicy, nowMs: number): Validity {
  if (policy.validFrom !== undefined) {
    const from = windowStart(policy.validFrom);
    if (from === null) return "invalid";
    if (nowMs < from) return "future";
  }
  if (policy.validTo !== undefined) {
    const to = windowEnd(policy.validTo);
    if (to === null) return "invalid";
    if (nowMs > to) return "expired";
  }
  return "current";
}

/* ---------------- arithmetic ---------------- */

/** floor(numerator / denominator) for non-negative safe integers. */
function divFloor(n: number, d: number): number {
  return (n - (n % d)) / d;
}

export function applyRatio(centavos: number, numerator: number, denominator: number, rounding: "floor" | "ceil" | "nearest"): number {
  const product = centavos * numerator;
  if (rounding === "floor") return divFloor(product, denominator);
  if (rounding === "ceil") return divFloor(product + denominator - 1, denominator);
  return divFloor(2 * product + denominator, 2 * denominator);
}

function worst(a: Reliability, b: Reliability): Reliability {
  const order: Reliability[] = ["verified", "estimated", "unknown"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] as Reliability;
}

/* ---------------- pricing one policy ---------------- */

interface Priced {
  min: number;
  max: number;
  status: Reliability;
  basis: string;
  sourceIds: string[];
}
type PriceOutcome = { priced: Priced } | { reason: string };

function evidenceIds(...ev: Evidence[]): string[] {
  return [...new Set(ev.flatMap((e) => e.sourceIds))];
}

function priceMatrix(policy: FarePolicy, q: RideFareQuery): PriceOutcome {
  const row = policy.matrix?.find((m) => m.fromStopId === q.boardStopId && m.toStopId === q.alightStopId);
  if (!row) return { reason: `Fare table ${policy.id} has no fare for this boarding and alighting pair.` };
  return {
    priced: {
      min: row.centavos, max: row.centavos, status: policy.evidence.reliability,
      basis: `Documented fare for this stop pair (${policy.id}).`, sourceIds: evidenceIds(policy.evidence),
    },
  };
}

function segmentMeters(policy: FarePolicy, q: RideFareQuery): number | null {
  const rule = policy.distanceRule;
  if (!rule) return null;
  const exact = rule.verifiedSegmentMeters.find(
    (s) => s.directionId === q.directionId && s.fromStopId === q.boardStopId && s.toStopId === q.alightStopId,
  );
  if (exact) return exact.meters;
  // Otherwise chain documented adjacent segments along the ride; every hop must be documented.
  let total = 0;
  for (let i = q.boardIndex; i < q.alightIndex; i++) {
    const from = q.directionStopIds[i];
    const to = q.directionStopIds[i + 1];
    const hop = rule.verifiedSegmentMeters.find((s) => s.directionId === q.directionId && s.fromStopId === from && s.toStopId === to);
    if (!hop) return null;
    total += hop.meters;
  }
  return q.alightIndex > q.boardIndex ? total : null;
}

function priceDistance(policy: FarePolicy, q: RideFareQuery): PriceOutcome {
  const rule = policy.distanceRule;
  const meters = segmentMeters(policy, q);
  if (!rule || meters === null) {
    return { reason: "Fare cannot be calculated from available distance data." };
  }
  const extra = Math.max(0, meters - rule.includedMeters);
  const wholeIncrements = divFloor(extra, rule.incrementMeters);
  const exact = extra % rule.incrementMeters === 0;
  const min = rule.baseCentavos + wholeIncrements * rule.incrementCentavos;
  const max = exact ? min : min + rule.incrementCentavos;
  return {
    priced: {
      min, max,
      // The data does not say how a partial increment is charged, so a range is the honest answer.
      status: exact ? policy.evidence.reliability : worst(policy.evidence.reliability, "estimated"),
      basis: exact
        ? `Distance fare for ${meters} m of documented service distance (${policy.id}).`
        : `Distance fare for ${meters} m of documented service distance (${policy.id}); how a partial increment is charged is not recorded, so a range is shown.`,
      sourceIds: evidenceIds(policy.evidence),
    },
  };
}

function priceFlat(policy: FarePolicy): PriceOutcome {
  if (policy.flatCentavos !== undefined) {
    return {
      priced: {
        min: policy.flatCentavos, max: policy.flatCentavos, status: policy.evidence.reliability,
        basis: `Flat fare per ride (${policy.id}).`, sourceIds: evidenceIds(policy.evidence),
      },
    };
  }
  if (policy.flatRange) {
    return {
      priced: {
        min: policy.flatRange.minCentavos, max: policy.flatRange.maxCentavos, status: policy.evidence.reliability,
        basis: `Fare range per ride (${policy.id}).`, sourceIds: evidenceIds(policy.evidence),
      },
    };
  }
  return { reason: `Fare policy ${policy.id} has no amount.` };
}

const PASSENGER_NAME: Record<Exclude<Passenger, "regular">, string> = {
  student: "student", senior: "senior citizen", pwd: "PWD",
};

function withDiscount(policy: FarePolicy, priced: Priced, passenger: Passenger): Priced {
  if (passenger === "regular") return priced;
  const rule = policy.discountRules?.find((r) => r.passenger === passenger);
  if (!rule) {
    return {
      ...priced,
      status: worst(priced.status, "estimated"),
      basis: `${priced.basis} No ${PASSENGER_NAME[passenger]} discount is documented for this service, so the regular fare is shown; confirm eligibility.`,
    };
  }
  return {
    min: applyRatio(priced.min, rule.numerator, rule.denominator, rule.rounding),
    max: applyRatio(priced.max, rule.numerator, rule.denominator, rule.rounding),
    status: worst(priced.status, rule.evidence.reliability),
    basis: `${priced.basis} ${PASSENGER_NAME[passenger]} discount: pay ${rule.numerator}/${rule.denominator} of the regular fare, rounded ${rule.rounding === "nearest" ? "to nearest centavo" : rule.rounding === "floor" ? "down" : "up"}.`,
    sourceIds: [...new Set([...priced.sourceIds, ...evidenceIds(rule.evidence)])],
  };
}

function priceWith(policy: FarePolicy, q: RideFareQuery): PriceOutcome {
  if (policy.kind === "unknown") return { reason: `Fare for this service is not known (${policy.id}).` };
  if (policy.evidence.reliability === "unknown") return { reason: `Fare policy ${policy.id} has no supporting evidence.` };
  const outcome =
    policy.kind === "flat" ? priceFlat(policy) : policy.kind === "matrix" ? priceMatrix(policy, q) : priceDistance(policy, q);
  return "priced" in outcome ? { priced: withDiscount(policy, outcome.priced, q.passenger) } : outcome;
}

/* ---------------- public API ---------------- */

export function quoteRideFare(book: FareBook, q: RideFareQuery): FareQuote {
  const policies = book.policiesByService.get(q.serviceId) ?? [];
  if (policies.length === 0) return unknownQuote(`No fare policy is recorded for this service. ${UNKNOWN_FARE_COPY}`);

  const current = policies.filter((p) => validityAt(p, q.nowMs) === "current");
  if (current.length === 0) {
    const stale = policies.some((p) => validityAt(p, q.nowMs) === "expired");
    return unknownQuote(
      stale ? "Fare information needs updating: the recorded fare policy has expired." : "No fare policy is valid today for this service.",
    );
  }

  const outcomes = current.map((p) => priceWith(p, q));
  const priced = outcomes.flatMap((o) => ("priced" in o ? [o.priced] : []));
  if (priced.length === 0) {
    const reason = outcomes.flatMap((o) => ("reason" in o ? [o.reason] : []))[0] ?? "Fare is not known.";
    return unknownQuote(`${reason} ${UNKNOWN_FARE_COPY}`);
  }
  const first = priced[0] as Priced;
  const agree = priced.every((p) => p.min === first.min && p.max === first.max);
  if (!agree) return unknownQuote("Fare sources disagree. Please confirm.");

  return { status: first.status, minCentavos: first.min, maxCentavos: first.max, sourceIds: first.sourceIds, basis: first.basis };
}

/** Totals for a journey. A partial subtotal is never a total; callers must keep unknownRideLegs visible. */
export function aggregateFares(quotes: readonly FareQuote[]): JourneyOption["fare"] {
  let knownMin = 0;
  let knownMax = 0;
  let unknown = 0;
  const sources = new Set<string>();
  for (const q of quotes) {
    if (q.status === "unknown" || q.minCentavos === null || q.maxCentavos === null) {
      unknown++;
      continue;
    }
    knownMin += q.minCentavos;
    knownMax += q.maxCentavos;
    for (const id of q.sourceIds) sources.add(id);
  }
  const status = unknown === 0 ? "complete" : unknown === quotes.length ? "unknown" : "partial";
  return { status, knownMinCentavos: knownMin, knownMaxCentavos: knownMax, unknownRideLegs: unknown, sourceIds: [...sources].sort() };
}
