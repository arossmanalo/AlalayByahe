// Member 3 (UI-005): pure selection logic for the manual onboard flow. No React or native imports.
// Only documented, non-suspended directions and legal alighting stops are offered.
import type { Direction, OnboardContext, ResolvedEndpoint, RouteStop, Service, Stop, TransitPack } from "../contracts";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

/** Services matching a name or signboard filter, sorted by mode then name. */
export function filterServices(pack: TransitPack, filter: string): Service[] {
  const q = normalize(filter);
  const list = q
    ? pack.services.filter(
        (s) => normalize(s.name).includes(q) || s.signboardAliases.some((a) => normalize(a).includes(q)),
      )
    : pack.services;
  return [...list].sort((a, b) => a.mode.localeCompare(b.mode) || a.name.localeCompare(b.name));
}

/** Suspended directions are excluded; "unknown" availability stays visible but labeled. */
export function selectableDirections(pack: TransitPack, serviceId: string): Direction[] {
  return pack.directions.filter((d) => d.serviceId === serviceId && d.availability !== "suspended");
}

export interface NextStopChoice {
  routeStop: RouteStop;
  stop: Stop;
}

/** Stops in sequence order where alighting is permitted by both the stop and the route stop. */
export function nextStopChoices(pack: TransitPack, directionId: string): NextStopChoice[] {
  const stops = new Map(pack.stops.map((s) => [s.id, s]));
  return pack.routeStops
    .filter((rs) => rs.directionId === directionId && rs.alight)
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((routeStop) => {
      const stop = stops.get(routeStop.stopId);
      return stop && stop.alight ? [{ routeStop, stop }] : [];
    });
}

/** The confirmed next stop becomes the planning origin; the context tells routing the user is onboard. */
export function onboardOrigin(
  choice: NextStopChoice,
  directionId: string,
  confirmedAt: string,
): { origin: ResolvedEndpoint; onboard: OnboardContext } {
  return {
    origin: {
      placeId: choice.stop.placeId,
      label: choice.stop.label,
      point: choice.stop.point,
      provenance: "stored",
    },
    onboard: { directionId, confirmedNextStopId: choice.stop.id, confirmedAt },
  };
}
