import type { AppError, OnboardContext, Result } from "../contracts/index";
import { parseIsoDateTime } from "../data/isoTime";
import type { DirectionRoute, Graph } from "./graph";

/**
 * Manual onboard replanning context (ROUTE-005).
 *
 * The passenger tells us the service direction they are riding and the next stop
 * ahead. We do not track the vehicle. The route search then evaluates the WHOLE
 * downstream path (continue riding, alight at a legal stop, walk a documented link,
 * board another service) instead of deciding from compass direction or from where
 * route lines cross.
 */

export interface OnboardSeed {
  route: DirectionRoute;
  /** Position of the confirmed next stop within the direction. */
  startIndex: number;
}

const clarify = (message: string, field: string): Result<never> => ({
  ok: false,
  error: { code: "NEEDS_CLARIFICATION", message, retryable: false, detail: { field } } satisfies AppError,
});

export function resolveOnboard(graph: Graph, context: OnboardContext): Result<OnboardSeed> {
  if (parseIsoDateTime(context.confirmedAt) === null) {
    return {
      ok: false,
      error: { code: "INVALID_INPUT", message: "Confirm your current service and next stop.", retryable: false, detail: { field: "onboard.confirmedAt" } },
    };
  }
  const route = graph.routes.get(context.directionId);
  if (!route) {
    return clarify("Confirm your current service and next stop.", "onboard.directionId");
  }
  const positions = route.points.flatMap((p) => (p.stop.id === context.confirmedNextStopId ? [p.index] : []));
  if (positions.length === 0) {
    return clarify("Select a stop ahead in this direction.", "onboard.confirmedNextStopId");
  }
  if (positions.length > 1) {
    // A loop passes this stop more than once; we cannot tell which pass the passenger is on.
    return clarify("This stop appears more than once on this route. Confirm which pass you are on.", "onboard.confirmedNextStopId");
  }
  return { ok: true, value: { route, startIndex: positions[0] as number } };
}
