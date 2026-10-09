import type { AppError, ErrorCode, Mode, Result, RoutePort, RouteRequest, RouteResult, TransitPack } from "../contracts/index";
import { buildFareBook } from "./fares";
import { buildGraph, type Graph } from "./graph";
import { resolveOnboard } from "./onboard";
import { rankCandidates, toCandidate, toResult } from "./rank";
import { search, type Constraints, type SearchInput } from "./search";

/**
 * RoutePort implementation (ROUTE-003/004/005). Pure TypeScript.
 *
 * Plans against an immutable, already-validated pack. Strict preferences (modes,
 * direct-only, budget, walking limits) are never relaxed silently: if nothing matches,
 * the caller gets CONSTRAINT_UNSATISFIED naming what would change the outcome, or
 * NO_VERIFIED_JOURNEY when even an unconstrained search finds nothing.
 */

export const DEFAULT_LABEL_LIMIT = 10_000;
const ALL_MODES: readonly Mode[] = ["van", "jeepney", "bus", "tricycle", "lrt"];
const PRIORITIES = ["nearest_useful", "fewest_transfers", "lowest_known_fare"];

export interface RoutePortOptions {
  /** Clock for fare validity. Injected so tests are deterministic. */
  now?: () => number;
  /** Computation guard, not a transfer cap. */
  labelLimit?: number;
}

function err(code: ErrorCode, message: string, retryable = false, detail?: AppError["detail"]): Result<never> {
  return { ok: false, error: { code, message, retryable, ...(detail ? { detail } : {}) } };
}

function isNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function checkRequest(request: RouteRequest): Result<never> | null {
  const p = request.preferences;
  if (!request.queryId) return err("INVALID_INPUT", "Missing query ID.", false, { field: "queryId" });
  if (!Array.isArray(p.allowedModes) || p.allowedModes.length === 0 || p.allowedModes.some((m) => !ALL_MODES.includes(m))) {
    return err("INVALID_INPUT", "Choose at least one transport mode.", false, { field: "preferences.allowedModes" });
  }
  if (!PRIORITIES.includes(p.priority)) return err("INVALID_INPUT", "Unknown ranking preference.", false, { field: "preferences.priority" });
  for (const field of ["maxAccessWalkMeters", "maxTransferWalkMeters", "maxEgressWalkMeters"] as const) {
    if (!isNonNegInt(p[field])) return err("INVALID_INPUT", "Walking limits must be whole meters.", false, { field: `preferences.${field}` });
  }
  if (p.budgetCentavos !== null && !isNonNegInt(p.budgetCentavos)) {
    return err("INVALID_INPUT", "Budget must be whole centavos.", false, { field: "preferences.budgetCentavos" });
  }
  if (typeof p.directOnly !== "boolean") return err("INVALID_INPUT", "Direct-only must be true or false.", false, { field: "preferences.directOnly" });
  return null;
}

type Relaxation = "modes" | "directOnly" | "budget" | "walking";

const RELAXATION_COPY: Record<Relaxation, { text: string; field: string }> = {
  modes: { text: "allow other transport modes", field: "preferences.allowedModes" },
  directOnly: { text: "allow transfers", field: "preferences.directOnly" },
  budget: { text: "remove the budget (some fares are unknown or higher)", field: "preferences.budgetCentavos" },
  walking: { text: "allow longer walks", field: "preferences.maxWalkMeters" },
};

function relax(c: Constraints, what: Relaxation[]): Constraints {
  return {
    modes: what.includes("modes") ? new Set(ALL_MODES) : c.modes,
    directOnly: what.includes("directOnly") ? false : c.directOnly,
    budgetCentavos: what.includes("budget") ? null : c.budgetCentavos,
    maxAccessWalkMeters: what.includes("walking") ? Infinity : c.maxAccessWalkMeters,
    maxTransferWalkMeters: what.includes("walking") ? Infinity : c.maxTransferWalkMeters,
    maxEgressWalkMeters: what.includes("walking") ? Infinity : c.maxEgressWalkMeters,
  };
}

const LIMIT_ERROR = (): Result<never> =>
  err("SEARCH_LIMIT_REACHED", "Search limit reached. Try a narrower journey.", false);

export function planRoute(request: RouteRequest, pack: TransitPack, options: RoutePortOptions = {}): Result<RouteResult> {
  const bad = checkRequest(request);
  if (bad) return bad;
  const nowMs = (options.now ?? Date.now)();
  const labelLimit = options.labelLimit ?? DEFAULT_LABEL_LIMIT;

  let graph: Graph;
  try {
    graph = buildGraph(pack);
  } catch {
    return err("DATA_INVALID", "Transit data could not be validated.");
  }

  const prefs = request.preferences;
  const onboard = request.onboard;

  if (!graph.places.has(request.destination.placeId)) {
    return err("PLACE_NOT_FOUND", "Choose the correct location.", false, { field: "destination.placeId" });
  }
  let seed: SearchInput["onboard"];
  if (onboard) {
    const resolved = resolveOnboard(graph, onboard);
    if (!resolved.ok) return resolved;
    seed = resolved.value;
  } else {
    if (!graph.places.has(request.origin.placeId)) {
      return err("PLACE_NOT_FOUND", "Choose the correct location.", false, { field: "origin.placeId" });
    }
    if (request.origin.placeId === request.destination.placeId) {
      return err("INVALID_INPUT", "Origin and destination are the same place.", false, { field: "destination.placeId" });
    }
  }

  const input: SearchInput = {
    originPlaceId: request.origin.placeId,
    destinationPlaceId: request.destination.placeId,
    passenger: prefs.passenger,
    ...(seed ? { onboard: seed } : {}),
  };
  const fares = buildFareBook(pack);
  const strict: Constraints = {
    modes: new Set(prefs.allowedModes),
    directOnly: prefs.directOnly,
    budgetCentavos: prefs.budgetCentavos,
    maxAccessWalkMeters: prefs.maxAccessWalkMeters,
    maxTransferWalkMeters: prefs.maxTransferWalkMeters,
    maxEgressWalkMeters: prefs.maxEgressWalkMeters,
  };
  const run = (c: Constraints) => search(graph, fares, input, c, nowMs, labelLimit);

  try {
    const first = run(strict);
    if (first.kind === "limit") return LIMIT_ERROR();
    if (first.goals.length > 0) {
      const ranked = rankCandidates(first.goals.map(toCandidate), prefs.priority);
      return { ok: true, value: toResult(request.queryId, ranked, pack, prefs.priority, onboard !== undefined) };
    }

    // Nothing satisfies the stated preferences. Find out whether the data connects the
    // places at all, and which single preference stands in the way. Never relax silently.
    const everything = run(relax(strict, ["modes", "directOnly", "budget", "walking"]));
    if (everything.kind === "limit") return LIMIT_ERROR();
    if (everything.goals.length === 0) {
      return err("NO_VERIFIED_JOURNEY", "No verified complete journey available.", false, {
        missingConnection: "Selected places have no validated connecting service.",
      });
    }
    const blockers: Relaxation[] = [];
    for (const r of ["modes", "directOnly", "budget", "walking"] as const) {
      const out = run(relax(strict, [r]));
      if (out.kind === "limit") return LIMIT_ERROR();
      if (out.goals.length > 0) blockers.push(r);
    }
    const hint = blockers.length > 0
      ? ` A verified journey exists if you ${blockers.map((b) => RELAXATION_COPY[b].text).join(" or ")}.`
      : " A verified journey exists if you relax more than one preference.";
    const field = blockers.length === 1 ? RELAXATION_COPY[blockers[0] as Relaxation].field : undefined;
    return err("CONSTRAINT_UNSATISFIED", `No matching option. Change your preferences to see others.${hint}`, false, field ? { field } : undefined);
  } catch {
    return err("DATA_INVALID", "Transit data could not be validated.");
  }
}

export function createRoutePort(options: RoutePortOptions = {}): RoutePort {
  return {
    async plan(request: RouteRequest, pack: TransitPack): Promise<Result<RouteResult>> {
      return planRoute(request, pack, options);
    },
  };
}
