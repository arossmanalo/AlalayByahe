import type { JourneyOption, Mode, Point, RideLeg, RouteResult, Stop, TransitPack } from "../contracts/index";

/**
 * Pure pin and line data for an optional map and for the drop-off alert target.
 *
 * Coordinates come only from the pack (stop and place points). Lines are straight segments between
 * those points and are always labelled approximate: they are NOT the road or rail path and are not
 * walking directions. A missing or invalid coordinate produces no pin and a note, never a guess.
 * A pin is "verified" only when the pack is a release pack and the record's evidence is verified.
 */

export type PinKind = "board" | "alight" | "transfer";
export type PinVerification = "verified" | "unverified";

export interface TripPin {
  id: string;
  kind: PinKind;
  placeId: string;
  stopId: string | null;
  name: string;
  point: Point;
  verification: PinVerification;
}

export interface TripLine {
  legId: string;
  kind: "ride" | "walk";
  mode: Mode | "walk";
  /** Ordered [latitude, longitude] pairs. */
  polyline: [number, number][];
  /** Always true: straight segments between pack coordinates, not a surveyed path. */
  approximate: true;
  verification: PinVerification;
}

export interface TripBounds { south: number; west: number; north: number; east: number }

export interface TripPins {
  optionId: string;
  legs: TripLine[];
  pins: TripPin[];
  /** The final drop-off pin, the default alert target. Null when its coordinate is missing. */
  dropoff: TripPin | null;
  bounds: TripBounds | null;
  missingCoordinate: string[];
}

const valid = (p: Point | undefined): p is Point =>
  !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
  Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

const pair = (p: Point): [number, number] => [p.latitude, p.longitude];

export function buildTripPins(option: JourneyOption, pack: TransitPack): TripPins {
  const stopById = new Map<string, Stop>(pack.stops.map((s) => [s.id, s]));
  const placeById = new Map(pack.places.map((p) => [p.id, p]));
  const isRelease = pack.kind === "release";
  const missing: string[] = [];

  const stopPin = (stopId: string, kind: PinKind): TripPin | null => {
    const stop = stopById.get(stopId);
    if (!stop || !valid(stop.point)) {
      missing.push(stopId);
      return null;
    }
    const place = placeById.get(stop.placeId);
    return {
      id: `pin_${kind}_${stopId}`,
      kind,
      placeId: stop.placeId,
      stopId,
      name: place?.name ?? stop.label,
      point: { latitude: stop.point.latitude, longitude: stop.point.longitude },
      verification: isRelease && stop.evidence.reliability === "verified" ? "verified" : "unverified",
    };
  };

  const rides = option.legs.filter((l): l is RideLeg => l.kind === "ride");
  const pins: TripPin[] = [];
  const lines: TripLine[] = [];
  const addPin = (pin: TripPin | null): void => {
    if (!pin) return;
    const clash = pins.findIndex((p) => p.stopId === pin.stopId);
    if (clash === -1) pins.push(pin);
    // One physical stop reached and left again is a single transfer pin.
    else if (pins[clash]!.kind !== pin.kind) pins[clash] = { ...pins[clash]!, kind: "transfer", id: `pin_transfer_${pin.stopId}` };
  };

  rides.forEach((ride, i) => {
    addPin(stopPin(ride.boardStopId, i === 0 ? "board" : "transfer"));
    addPin(stopPin(ride.alightStopId, i === rides.length - 1 ? "alight" : "transfer"));
  });

  let dropoff: TripPin | null = null;
  if (rides.length > 0) {
    const last = rides[rides.length - 1]!;
    dropoff = pins.find((p) => p.stopId === last.alightStopId && (p.kind === "alight" || p.kind === "transfer")) ?? null;
  }

  option.legs.forEach((leg, index) => {
    if (leg.kind === "ride") {
      const ordered = pack.routeStops
        .filter((r) => r.directionId === leg.directionId)
        .sort((a, b) => a.sequence - b.sequence);
      const from = ordered.findIndex((r) => r.stopId === leg.boardStopId);
      const to = ordered.findIndex((r) => r.stopId === leg.alightStopId);
      const ids = from !== -1 && to > from ? ordered.slice(from, to + 1).map((r) => r.stopId) : [leg.boardStopId, leg.alightStopId];
      const points: [number, number][] = [];
      let allVerified = isRelease;
      for (const id of ids) {
        const stop = stopById.get(id);
        if (!stop || !valid(stop.point)) {
          if (!missing.includes(id)) missing.push(id);
          continue;
        }
        points.push(pair(stop.point));
        if (stop.evidence.reliability !== "verified") allVerified = false;
      }
      if (points.length >= 2) {
        lines.push({
          legId: `leg_${index}_${leg.directionId}`, kind: "ride", mode: leg.mode, polyline: points,
          approximate: true, verification: allVerified ? "verified" : "unverified",
        });
      }
    } else {
      const a = placeById.get(leg.fromPlaceId)?.point;
      const b = placeById.get(leg.toPlaceId)?.point;
      if (valid(a) && valid(b)) {
        lines.push({
          legId: `leg_${index}_${leg.linkId}`, kind: "walk", mode: "walk", polyline: [pair(a), pair(b)],
          approximate: true, verification: isRelease && leg.evidence.reliability === "verified" ? "verified" : "unverified",
        });
      } else {
        missing.push(!valid(a) ? leg.fromPlaceId : leg.toPlaceId);
      }
    }
  });

  const coords = [...pins.map((p) => p.point), ...lines.flatMap((l) => l.polyline.map(([latitude, longitude]) => ({ latitude, longitude })))];
  const bounds: TripBounds | null = coords.length
    ? {
        south: Math.min(...coords.map((c) => c.latitude)), north: Math.max(...coords.map((c) => c.latitude)),
        west: Math.min(...coords.map((c) => c.longitude)), east: Math.max(...coords.map((c) => c.longitude)),
      }
    : null;

  return { optionId: option.id, legs: lines, pins, dropoff, bounds, missingCoordinate: [...new Set(missing)] };
}

/** Convenience for the UI: pins for one option of a result (default: the first). Null if out of range. */
export function buildTripPinsForResult(result: RouteResult, pack: TransitPack, optionIndex = 0): TripPins | null {
  const option = result.options[optionIndex];
  return option ? buildTripPins(option, pack) : null;
}
