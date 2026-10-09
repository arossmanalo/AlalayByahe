import type {
  Evidence, JourneyLeg, JourneyOption, Priority, RideLeg, RouteResult, TransitPack, WalkLeg,
} from "../contracts/index";
import { parseIsoDateTime } from "../data/isoTime";
import { aggregateFares } from "./fares";
import type { Label, Step } from "./search";

/**
 * Turns goal labels into normalized journey options and ranks them honestly (ROUTE-003/004).
 * Cheapest is only ever claimed among options whose fares are fully known.
 */

export const MAX_OPTIONS = 3;

export interface Candidate {
  label: Label;
  legs: JourneyLeg[];
  /** Ordered direction IDs of the rides. Options with the same route are not "distinct". */
  routeKey: string;
  signature: string;
  fare: JourneyOption["fare"];
  transfers: number;
}

export function formatCentavos(centavos: number): string {
  const pesos = Math.floor(centavos / 100);
  const rest = centavos % 100;
  return `PHP ${pesos}.${rest < 10 ? "0" : ""}${rest}`;
}

function formatRange(min: number, max: number): string {
  return min === max ? formatCentavos(min) : `${formatCentavos(min)} to ${formatCentavos(max)}`;
}

function mergeEvidence(items: readonly Evidence[]): Evidence {
  const order = ["verified", "estimated", "unknown"] as const;
  let worst = 0;
  let oldest = Infinity;
  let oldestText = items[0]?.checkedAt ?? "";
  const ids = new Set<string>();
  for (const e of items) {
    worst = Math.max(worst, order.indexOf(e.reliability));
    for (const id of e.sourceIds) ids.add(id);
    const ms = parseIsoDateTime(e.checkedAt) ?? Infinity;
    if (ms < oldest) {
      oldest = ms;
      oldestText = e.checkedAt;
    }
  }
  return { sourceIds: [...ids].sort(), checkedAt: oldestText, reliability: order[worst] as Evidence["reliability"] };
}

export function buildLegs(goal: Label): JourneyLeg[] {
  const steps: Step[] = [];
  for (let l: Label | null = goal; l; l = l.prev) if (l.step) steps.push(l.step);
  steps.reverse();
  const legs: JourneyLeg[] = [];
  for (const step of steps) {
    if (step.t === "walk") {
      const w: WalkLeg = {
        kind: "walk", linkId: step.link.id, fromPlaceId: step.link.fromPlaceId, toPlaceId: step.link.toPlaceId,
        meters: step.link.meters, instructions: [...step.link.steps], evidence: step.link.evidence,
      };
      legs.push(w);
    } else if (step.t === "ride") {
      const board = step.route.points[step.boardIndex];
      const alight = step.route.points[step.alightIndex];
      if (!board || !alight) continue;
      const between = step.route.points.slice(step.boardIndex, step.alightIndex + 1).map((p) => p.routeStop.evidence);
      const r: RideLeg = {
        kind: "ride", serviceId: step.route.service.id, directionId: step.route.direction.id, mode: step.route.service.mode,
        serviceName: step.route.service.name, headsign: step.route.direction.headsign,
        boardStopId: board.stop.id, alightStopId: alight.stop.id,
        boardLabel: step.alreadyOnboard ? `Currently onboard; next stop: ${board.stop.label}` : board.stop.label,
        alightLabel: alight.stop.label,
        alreadyOnboard: step.alreadyOnboard, fare: step.quote,
        evidence: mergeEvidence([step.route.direction.evidence, step.route.service.evidence, ...between]),
      };
      legs.push(r);
    }
  }
  return legs;
}

export function toCandidate(goal: Label): Candidate {
  const legs = buildLegs(goal);
  const rides = legs.filter((l): l is RideLeg => l.kind === "ride");
  const signature = legs
    .map((l) => (l.kind === "walk" ? l.linkId : `${l.directionId}:${l.boardStopId}>${l.alightStopId}${l.alreadyOnboard ? "*" : ""}`))
    .join("|");
  return {
    label: goal, legs, signature,
    routeKey: rides.map((r) => r.directionId).join(">"),
    fare: aggregateFares(rides.map((r) => r.fare)),
    transfers: Math.max(0, rides.length - 1),
  };
}

type Compare = (a: Candidate, b: Candidate) => number;

const num = (a: number, b: number): number => a - b;
const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const comparators: Record<Priority, Compare> = {
  nearest_useful: (a, b) =>
    num(a.label.access, b.label.access) || num(a.transfers, b.transfers) || num(a.label.seg, b.label.seg) ||
    // Fare is deliberately not a tie-break here: an unknown fare carries a 0 subtotal and
    // must never make an option look cheaper than one whose fare is known.
    num(a.label.walk, b.label.walk) || text(a.signature, b.signature),
  fewest_transfers: (a, b) =>
    num(a.transfers, b.transfers) || num(a.label.walk, b.label.walk) || num(a.label.access, b.label.access) ||
    num(a.label.seg, b.label.seg) || text(a.signature, b.signature),
  lowest_known_fare: (a, b) => {
    // Options with a fully known fare are compared by worst-case then best-case fare.
    // Incomplete-fare options never outrank them and are ordered by effort, not price.
    const aComplete = a.fare.status === "complete";
    const bComplete = b.fare.status === "complete";
    if (aComplete !== bComplete) return aComplete ? -1 : 1;
    if (aComplete) {
      return num(a.fare.knownMaxCentavos, b.fare.knownMaxCentavos) || num(a.fare.knownMinCentavos, b.fare.knownMinCentavos) ||
        num(a.transfers, b.transfers) || num(a.label.walk, b.label.walk) || text(a.signature, b.signature);
    }
    return num(a.transfers, b.transfers) || num(a.label.walk, b.label.walk) || text(a.signature, b.signature);
  },
};

export function rankCandidates(candidates: Candidate[], priority: Priority): Candidate[] {
  const sorted = [...candidates].sort(comparators[priority]);
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of sorted) {
    if (seen.has(c.routeKey)) continue;
    seen.add(c.routeKey);
    out.push(c);
    if (out.length === MAX_OPTIONS) break;
  }
  return out;
}

/* ---------------- 32-bit FNV-1a, for stable journey IDs ---------------- */
function fnv(textValue: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < textValue.length; i++) {
    h ^= textValue.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function rankReason(c: Candidate, index: number, priority: Priority): string {
  const access = c.label.access;
  const egress = c.label.seg;
  const lead = index === 0 ? "" : "Alternative: ";
  if (priority === "nearest_useful") {
    return index === 0
      ? `Shortest feasible access walk (${access} m) among complete verified journeys; ${c.transfers} transfer(s); egress walk ${egress} m.`
      : `${lead}access walk ${access} m; ${c.transfers} transfer(s); egress walk ${egress} m.`;
  }
  if (priority === "fewest_transfers") {
    return index === 0
      ? `Fewest transfers (${c.transfers}) among complete verified journeys; total walking ${c.label.walk} m.`
      : `${lead}${c.transfers} transfer(s); total walking ${c.label.walk} m.`;
  }
  if (c.fare.status === "complete") {
    const range = formatRange(c.fare.knownMinCentavos, c.fare.knownMaxCentavos);
    return index === 0
      ? `Lowest fare among options with fully known fares (${range}).`
      : `${lead}fully known fare ${range}.`;
  }
  return `${lead}${c.fare.unknownRideLegs} ride fare(s) unknown, so this cannot be compared on price with the options above.`;
}

function warnings(c: Candidate, onboard: boolean): string[] {
  const out: string[] = [];
  const rides = c.legs.filter((l): l is RideLeg => l.kind === "ride");
  if (c.fare.status === "partial") out.push(`Known subtotal only; ${c.fare.unknownRideLegs} ride fare(s) unknown. Confirm fare with the driver/operator.`);
  if (c.fare.status === "unknown") out.push("Fare unknown. Confirm fare with the driver/operator.");
  if (rides.some((r) => r.fare.status === "estimated")) out.push("Some fares are estimates; see each ride's fare basis.");
  if (rides.length > 1) out.push("Each ride may have a separate fare.");
  if (onboard) out.push("Based on the service and next stop you confirmed. Vehicle position is not tracked.");
  out.push("Routes are documented, not live. Confirm the service and its direction before boarding.");
  return out;
}

export function toResult(
  queryId: string, ranked: Candidate[], pack: TransitPack, priority: Priority, onboard: boolean,
): RouteResult {
  const options: JourneyOption[] = ranked.map((c, i) => ({
    id: `journey_${fnv(c.signature)}`,
    legs: c.legs,
    transfers: c.transfers,
    walkMeters: c.label.walk,
    fare: c.fare,
    rankReason: rankReason(c, i, priority),
    warnings: warnings(c, onboard),
    datasetVersion: pack.version,
  }));
  const coverageWarnings = [
    ...pack.coverageLabels.map((l) => `Coverage: ${l}`),
    `Data version ${pack.version}. Routes are documented, not live availability.`,
  ];
  if (priority === "lowest_known_fare" && options.some((o) => o.fare.status !== "complete")) {
    coverageWarnings.push("Some fares are unknown, so cheapest cannot be confirmed.");
  }
  return { queryId, options, coverageWarnings };
}
