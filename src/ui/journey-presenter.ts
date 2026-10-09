// Member 3 (UI-003): pure presentation logic for RouteResult. No React or native imports.
// The UI only reorganizes engine output; it never adds a route fact, step or peso amount.
import type { Evidence, JourneyOption, Mode, RideLeg, RouteRequest, WalkLeg } from "../contracts";
import { formatCentavosRange } from "./format";
import type { Strings } from "./i18n";

export type FareDisplay =
  | { kind: "complete"; minCentavos: number; maxCentavos: number }
  | { kind: "partial"; knownMinCentavos: number; knownMaxCentavos: number; unknownRideLegs: number }
  | { kind: "unknown"; unknownRideLegs: number };

/**
 * Converts an option fare summary into what may be shown. A "complete" status that still
 * reports unknown ride legs is downgraded to partial, and a partial subtotal is never a total.
 */
export function fareDisplay(fare: JourneyOption["fare"]): FareDisplay {
  const unknown = Math.max(0, fare.unknownRideLegs);
  if (fare.status === "complete" && unknown === 0) {
    return { kind: "complete", minCentavos: fare.knownMinCentavos, maxCentavos: fare.knownMaxCentavos };
  }
  if (fare.status === "unknown") {
    return { kind: "unknown", unknownRideLegs: unknown };
  }
  // Partial, or a "complete" status contradicted by unknown legs. Counts are passed through, never invented.
  return {
    kind: "partial",
    knownMinCentavos: fare.knownMinCentavos,
    knownMaxCentavos: fare.knownMaxCentavos,
    unknownRideLegs: unknown,
  };
}

export type FareText =
  | { kind: "complete"; label: string; value: string }
  | { kind: "partial" | "unknown"; title: string; lines: string[] };

/**
 * Wording for an option fare. Only a complete fare is called a total; a partial subtotal is always
 * titled "not the full total", and any unknown ride fare tells the user to confirm it (EC-051, EC-057).
 */
export function fareText(fare: JourneyOption["fare"], t: Strings): FareText {
  const d = fareDisplay(fare);
  switch (d.kind) {
    case "complete":
      return { kind: "complete", label: t.fareLabel, value: t.fareCompleteRange(formatCentavosRange(d.minCentavos, d.maxCentavos)) };
    case "partial": {
      const subtotal = formatCentavosRange(d.knownMinCentavos, d.knownMaxCentavos);
      return {
        kind: "partial",
        title: `${t.fareLabel}: ${t.fareNotTotal}`,
        lines:
          d.unknownRideLegs > 0
            ? [t.farePartial(subtotal, d.unknownRideLegs), t.fareConfirmWithOperator]
            : [t.fareKnownSubtotal(subtotal)],
      };
    }
    case "unknown":
      return {
        kind: "unknown",
        title: `${t.fareLabel}: ${t.fareUnknown}`,
        lines: [...(d.unknownRideLegs > 0 ? [t.fareUnknownLegs(d.unknownRideLegs)] : []), t.fareConfirmWithOperator],
      };
  }
}

export interface CoverageSummary {
  /** The loaded pack's coverage labels: the only coverage the app may claim. */
  labels: string[];
  /** Engine coverage warnings that add something beyond those labels. */
  notes: string[];
}

/**
 * Coverage shown on the results screen, for successes and failures alike. Engine warnings that
 * only repeat a pack label ("Coverage: <label>") are dropped so the subset is stated once.
 */
export function coverageSummary(packLabels: readonly string[], coverageWarnings: readonly string[]): CoverageSummary {
  const labels = [...new Set(packLabels.map((l) => l.trim()).filter((l) => l !== ""))];
  const known = new Set(labels.map((l) => l.toLowerCase()));
  const notes = coverageWarnings.filter((w) => !known.has(w.replace(/^coverage:s*/i, "").trim().toLowerCase()));
  return { labels, notes: [...new Set(notes)] };
}

export type OptionIssue =
  | "no_legs"
  | "no_ride"
  | "ride_missing_board"
  | "ride_missing_alight"
  | "ride_missing_headsign"
  | "ride_missing_service"
  | "walk_invalid_meters"
  | "invalid_fare_amount";

function isBlank(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === "";
}

function validCentavos(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/**
 * Lists required fields missing from an option. Any issue means the option cannot be shown
 * as a complete journey; the UI reports it rather than filling the gap (EC-111).
 */
export function optionIssues(option: JourneyOption): OptionIssue[] {
  const issues = new Set<OptionIssue>();
  if (option.legs.length === 0) issues.add("no_legs");
  if (!option.legs.some((leg) => leg.kind === "ride")) issues.add("no_ride");
  for (const leg of option.legs) {
    if (leg.kind === "walk") {
      if (!Number.isInteger(leg.meters) || leg.meters < 0) issues.add("walk_invalid_meters");
    } else {
      if (isBlank(leg.boardStopId) || isBlank(leg.boardLabel)) issues.add("ride_missing_board");
      if (isBlank(leg.alightStopId) || isBlank(leg.alightLabel)) issues.add("ride_missing_alight");
      if (isBlank(leg.headsign) || isBlank(leg.directionId)) issues.add("ride_missing_headsign");
      if (isBlank(leg.serviceName) || isBlank(leg.serviceId)) issues.add("ride_missing_service");
      const { minCentavos, maxCentavos, status } = leg.fare;
      if (status !== "unknown") {
        if (minCentavos === null || maxCentavos === null || !validCentavos(minCentavos) || !validCentavos(maxCentavos) || minCentavos > maxCentavos) {
          issues.add("invalid_fare_amount");
        }
      }
    }
  }
  const { knownMinCentavos, knownMaxCentavos } = option.fare;
  if (!validCentavos(knownMinCentavos) || !validCentavos(knownMaxCentavos) || knownMinCentavos > knownMaxCentavos) {
    issues.add("invalid_fare_amount");
  }
  return [...issues];
}

export interface PartitionedOptions {
  shown: JourneyOption[];
  hiddenIncomplete: number;
}

/** Keeps at most three complete options in engine order; counts the incomplete ones. */
export function partitionOptions(options: JourneyOption[], limit = 3): PartitionedOptions {
  const complete = options.filter((o) => optionIssues(o).length === 0);
  return { shown: complete.slice(0, limit), hiddenIncomplete: options.length - complete.length };
}

export type JourneyStep =
  | {
      kind: "walk";
      number: number;
      leg: WalkLeg;
      fromLabel: string | null;
      toLabel: string | null;
    }
  | { kind: "ride"; number: number; leg: RideLeg };

/**
 * Orders legs into numbered steps. Walk endpoints are labeled only from data already present:
 * the request endpoints or the adjacent ride's boarding/alighting labels.
 */
export function journeySteps(option: JourneyOption, request: RouteRequest | null): JourneyStep[] {
  const legs = option.legs;
  return legs.map((leg, i): JourneyStep => {
    if (leg.kind === "ride") return { kind: "ride", number: i + 1, leg };
    const prev = i > 0 ? legs[i - 1] : null;
    const next = i < legs.length - 1 ? legs[i + 1] : null;
    let fromLabel: string | null = null;
    let toLabel: string | null = null;
    if (prev?.kind === "ride") fromLabel = prev.alightLabel;
    else if (i === 0 && request && request.origin.placeId === leg.fromPlaceId) fromLabel = request.origin.label;
    if (next?.kind === "ride") toLabel = next.boardLabel;
    else if (i === legs.length - 1 && request && request.destination.placeId === leg.toPlaceId) {
      toLabel = request.destination.label;
    }
    return { kind: "walk", number: i + 1, leg, fromLabel, toLabel };
  });
}

export type LegKind = Mode | "walk";

export function legSequence(option: JourneyOption): LegKind[] {
  return option.legs.map((leg) => (leg.kind === "walk" ? "walk" : leg.mode));
}

export function firstRide(option: JourneyOption): RideLeg | null {
  for (const leg of option.legs) if (leg.kind === "ride") return leg;
  return null;
}

/** Unique source IDs across legs, leg fares and the option fare, in first-seen order. */
export function collectSourceIds(option: JourneyOption): string[] {
  const seen = new Set<string>();
  const add = (ids: string[]) => ids.forEach((id) => seen.add(id));
  for (const leg of option.legs) {
    add(leg.evidence.sourceIds);
    if (leg.kind === "ride") add(leg.fare.sourceIds);
  }
  add(option.fare.sourceIds);
  return [...seen];
}

/** Oldest evidence check date across legs, so the UI never overstates freshness. */
export function oldestCheck(option: JourneyOption): string | null {
  const dates = option.legs.map((leg: { evidence: Evidence }) => leg.evidence.checkedAt).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b));
}
