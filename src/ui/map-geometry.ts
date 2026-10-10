// Schematic map geometry. Pure: no React, native or network code, so tests/ui can run it.
// The map is drawn on the phone from stored stop and place coordinates only. Lines are straight segments
// in stop order, never the track, road or a walking path, and nothing is requested from a map service.
import type { JourneyOption, Mode, Point, ResolvedEndpoint, RideLeg, TransitPack } from "../contracts";
import { buildTripPins, type PinVerification } from "../routing/tripPins";

export interface MapPoint { x: number; y: number }

export type LineStyle = "solid" | "dotted" | "dashed";

export interface MapLine {
  points: Point[];
  color: string;
  width: number;
  style: LineStyle;
  /** White outline under the line so it reads over other lines. */
  casing: boolean;
}

export type PinKind = "station" | "board" | "transfer" | "alight" | "origin" | "you" | "unverified";

export interface MapPin {
  point: Point;
  kind: PinKind;
  /** Mode line colour for station, board and transfer rings. */
  color: string;
  label?: string;
}

export interface MapLayers {
  lines: MapLine[];
  pins: MapPin[];
  /** Points the view is fitted to. Empty means nothing to draw. */
  fit: Point[];
}

/** Colours the map uses, passed in so this module stays free of the theme's React-side imports. */
export interface MapPalette {
  line: Record<Mode | "walk", string>;
  rest: Record<Mode | "walk", string>;
  unverified: string;
}

export const EMPTY_LAYERS: MapLayers = { lines: [], pins: [], fit: [] };

const valid = (p: Point | undefined | null): p is Point =>
  !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

// ---- Projection ----

export interface FitBox {
  width: number;
  height: number;
  top: number;
  bottom: number;
  /** Side padding, so labels beside the outermost points stay on screen. */
  side: number;
}

/** Smallest span the view zooms to, about 600 m, so one stop or a short ride is not blown up. */
const MIN_SPAN_DEGREES = 0.0055;

/**
 * Equirectangular projection fitted to the box. Longitudes are scaled by cos(latitude) so distances keep
 * their shape at Philippine latitudes. Returns null when there is nothing valid to fit.
 */
export function fitProjection(points: readonly Point[], box: FitBox): ((p: Point) => MapPoint) | null {
  const pts = points.filter(valid);
  if (pts.length === 0) return null;
  const lat0 = pts.reduce((s, p) => s + p.latitude, 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = pts.map((p) => p.longitude * k);
  const ys = pts.map((p) => -p.latitude);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padSpan = (lo: number, hi: number): [number, number] => {
    const span = hi - lo;
    if (span >= MIN_SPAN_DEGREES) return [lo, hi];
    const mid = (lo + hi) / 2;
    return [mid - MIN_SPAN_DEGREES / 2, mid + MIN_SPAN_DEGREES / 2];
  };
  [minX, maxX] = padSpan(minX, maxX);
  [minY, maxY] = padSpan(minY, maxY);
  const availW = Math.max(1, box.width - box.side * 2);
  const availH = Math.max(1, box.bottom - box.top);
  const scale = Math.min(availW / (maxX - minX), availH / (maxY - minY));
  const offsetX = box.side + (availW - (maxX - minX) * scale) / 2;
  const offsetY = box.top + (availH - (maxY - minY) * scale) / 2;
  return (p: Point) => ({ x: offsetX + (p.longitude * k - minX) * scale, y: offsetY + (-p.latitude - minY) * scale });
}

/** SVG path data through projected points. */
export function pathData(points: readonly MapPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

// ---- Pack lines ----

export interface ServiceLine {
  serviceId: string;
  mode: Mode;
  name: string;
  stops: { stopId: string; label: string; point: Point }[];
}

/** One line per service: its longest non-suspended direction, in stop order, with valid coordinates only. */
export function serviceLines(pack: TransitPack): ServiceLine[] {
  const stops = new Map(pack.stops.map((s) => [s.id, s]));
  const lines: ServiceLine[] = [];
  for (const service of pack.services) {
    let best: ServiceLine["stops"] = [];
    for (const direction of pack.directions) {
      if (direction.serviceId !== service.id || direction.availability === "suspended") continue;
      const ordered = pack.routeStops
        .filter((r) => r.directionId === direction.id)
        .sort((a, b) => a.sequence - b.sequence)
        .flatMap((r) => {
          const stop = stops.get(r.stopId);
          return stop && valid(stop.point) ? [{ stopId: stop.id, label: stop.label, point: stop.point }] : [];
        });
      if (ordered.length > best.length) best = ordered;
    }
    if (best.length >= 2) lines.push({ serviceId: service.id, mode: service.mode, name: service.name, stops: best });
  }
  return lines;
}

/** Stops ridden on one leg, board to alight inclusive, from the pack's stop order. Null when unknown. */
export function rideStopLabels(pack: TransitPack, leg: Pick<RideLeg, "directionId" | "boardStopId" | "alightStopId">): string[] | null {
  const stops = new Map(pack.stops.map((s) => [s.id, s]));
  const ordered = pack.routeStops.filter((r) => r.directionId === leg.directionId).sort((a, b) => a.sequence - b.sequence);
  const from = ordered.findIndex((r) => r.stopId === leg.boardStopId);
  const to = ordered.findIndex((r) => r.stopId === leg.alightStopId);
  if (from === -1 || to === -1 || to <= from) return null;
  const labels = ordered.slice(from, to + 1).map((r) => stops.get(r.stopId)?.label);
  return labels.every((l): l is string => typeof l === "string") ? labels : null;
}

/** Number of stops a ride passes, counting the stop where you get off. Null when the pack cannot say. */
export function rideStopCount(pack: TransitPack, leg: Pick<RideLeg, "directionId" | "boardStopId" | "alightStopId">): number | null {
  const labels = rideStopLabels(pack, leg);
  return labels ? labels.length - 1 : null;
}

/** Total stops across an option's rides, or null if any ride's count is unknown. */
export function optionStopCount(pack: TransitPack, option: JourneyOption): number | null {
  let total = 0;
  for (const leg of option.legs) {
    if (leg.kind !== "ride") continue;
    const n = rideStopCount(pack, leg);
    if (n === null) return null;
    total += n;
  }
  return total;
}

/** Short name for the loaded network: up to two service names, else the service count. */
export function networkShortName(pack: TransitPack): { kind: "names"; text: string } | { kind: "count"; count: number } {
  const names = [...new Set(pack.services.map((s) => s.name))];
  if (names.length > 0 && names.length <= 2 && names.every((n) => n.length <= 12)) return { kind: "names", text: names.join(", ") };
  return { kind: "count", count: pack.services.length };
}

/** Modes with no service at all in the pack: the honest "not covered" list. */
export function modesWithoutService(pack: TransitPack, modes: readonly Mode[]): Mode[] {
  const present = new Set(pack.services.map((s) => s.mode));
  return modes.filter((m) => !present.has(m));
}

// ---- Layers ----

/** Every service line with its stations; terminals labelled when the network is small enough to read. */
export function coverageLayers(pack: TransitPack, palette: MapPalette): MapLayers {
  const lines = serviceLines(pack);
  const labelTerminals = lines.length <= 3;
  const pins: MapPin[] = [];
  const out: MapLine[] = [];
  for (const line of lines) {
    const color = palette.line[line.mode];
    out.push({ points: line.stops.map((s) => s.point), color, width: 4.5, style: "solid", casing: true });
    if (lines.length <= 6) {
      line.stops.forEach((s, i) => {
        const terminal = i === 0 || i === line.stops.length - 1;
        pins.push({ point: s.point, kind: "station", color, label: labelTerminals && terminal ? stationName(s.label) : undefined });
      });
    }
  }
  return { lines: out, pins, fit: lines.flatMap((l) => l.stops.map((s) => s.point)) };
}

/** Coverage lines plus where the trip starts (blue ring) and ends (red pin), as on "Check your trip". */
export function endpointLayers(
  pack: TransitPack | null,
  origin: Pick<ResolvedEndpoint, "point" | "label"> | null,
  destination: Pick<ResolvedEndpoint, "point" | "label"> | null,
  palette: MapPalette,
): MapLayers {
  const base = pack ? coverageLayers(pack, palette) : EMPTY_LAYERS;
  const pins: MapPin[] = base.pins.map((p) => ({ ...p, label: undefined }));
  const fit: Point[] = [];
  if (origin && valid(origin.point)) {
    pins.push({ point: origin.point, kind: "origin", color: palette.line.walk, label: stationName(origin.label) });
    fit.push(origin.point);
  }
  if (destination && valid(destination.point)) {
    pins.push({ point: destination.point, kind: "alight", color: palette.line.walk, label: stationName(destination.label) });
    fit.push(destination.point);
  }
  // With both ends known the view frames them; otherwise it frames the whole network.
  return { lines: base.lines, pins, fit: fit.length === 2 ? fit : [...base.fit, ...fit] };
}

/**
 * One journey option: the rest of each ridden line in a light shade, the ridden part in the mode colour,
 * walks dotted, then board, transfer and get-off pins. Unverified stops get dashed orange rings.
 */
export function tripLayers(
  pack: TransitPack,
  option: JourneyOption,
  palette: MapPalette,
  labels: { board: (name: string) => string; alight: (name: string) => string } | null,
): MapLayers {
  const trip = buildTripPins(option, pack);
  const lines: MapLine[] = [];
  const pins: MapPin[] = [];
  const stops = new Map(pack.stops.map((s) => [s.id, s]));
  const rides = option.legs.filter((l): l is RideLeg => l.kind === "ride");

  for (const ride of rides) {
    const full = pack.routeStops
      .filter((r) => r.directionId === ride.directionId)
      .sort((a, b) => a.sequence - b.sequence)
      .flatMap((r) => {
        const s = stops.get(r.stopId);
        return s && valid(s.point) ? [s.point] : [];
      });
    if (full.length >= 2) lines.push({ points: full, color: palette.rest[ride.mode], width: 3.5, style: "solid", casing: false });
  }
  for (const leg of trip.legs) {
    const points = leg.polyline.map(([latitude, longitude]) => ({ latitude, longitude }));
    if (leg.kind === "walk") {
      lines.push({ points, color: palette.line.walk, width: 4.5, style: "dotted", casing: false });
    } else {
      const unverified = leg.verification === "unverified";
      lines.push({
        points,
        color: unverified ? palette.unverified : palette.line[leg.mode],
        width: unverified ? 5 : 6,
        style: unverified ? "dashed" : "solid",
        casing: !unverified,
      });
      if (!unverified) {
        for (const p of points.slice(1, -1)) pins.push({ point: p, kind: "station", color: palette.line[leg.mode] });
      }
    }
  }
  const modeOf = (stopId: string | null): Mode | "walk" => rides.find((r) => r.boardStopId === stopId || r.alightStopId === stopId)?.mode ?? "walk";
  for (const pin of trip.pins) {
    const color = pin.verification === "unverified" ? palette.unverified : palette.line[modeOf(pin.stopId)];
    const name = stationName(pin.name);
    if (pin.kind === "alight") {
      pins.push({ point: pin.point, kind: "alight", color, label: labels ? labels.alight(name) : name });
    } else {
      pins.push({
        point: pin.point,
        kind: pin.verification === "unverified" ? "unverified" : pin.kind,
        color,
        label: pin.kind === "board" ? (labels ? labels.board(name) : name) : undefined,
      });
    }
  }
  return { lines, pins, fit: trip.bounds ? trip.pins.map((p) => p.point).concat(trip.legs.flatMap((l) => l.polyline.map(([latitude, longitude]) => ({ latitude, longitude })))) : [] };
}

/** Whether any part of an option is drawn from unverified stops, so the map says lines are approximate. */
export function hasUnverified(pack: TransitPack, option: JourneyOption): boolean {
  const trip = buildTripPins(option, pack);
  const check = (v: PinVerification) => v === "unverified";
  return trip.pins.some((p) => check(p.verification)) || trip.legs.some((l) => l.kind === "ride" && check(l.verification));
}

/** One service direction for the onboard screen, with the confirmed next stop marked. */
export function directionLayers(
  pack: TransitPack,
  directionId: string,
  mode: Mode,
  nextStopId: string | null,
  palette: MapPalette,
  nextLabel: (name: string) => string,
): MapLayers {
  const stops = new Map(pack.stops.map((s) => [s.id, s]));
  const ordered = pack.routeStops
    .filter((r) => r.directionId === directionId)
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((r) => {
      const s = stops.get(r.stopId);
      return s && valid(s.point) ? [s] : [];
    });
  const color = palette.line[mode];
  const pins: MapPin[] = ordered.map((s) => ({ point: s.point, kind: "station", color }));
  const next = ordered.findIndex((s) => s.id === nextStopId);
  if (next !== -1) pins.push({ point: ordered[next]!.point, kind: "you", color, label: nextLabel(stationName(ordered[next]!.label)) });
  const fit = next === -1 ? ordered.map((s) => s.point) : ordered.slice(Math.max(0, next - 2), next + 3).map((s) => s.point);
  return { lines: ordered.length >= 2 ? [{ points: ordered.map((s) => s.point), color, width: 6, style: "solid", casing: true }] : [], pins, fit };
}

/** "Vito Cruz (LRT-1 platform)" -> "Vito Cruz"; "Vito Cruz Station" -> "Vito Cruz". Map labels only. */
export function stationName(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+Station$/i, "").trim() || label;
}
