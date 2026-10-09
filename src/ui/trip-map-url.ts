// Optional journey map: builds a Geoapify Static Maps request (https://apidocs.geoapify.com/docs/maps/static/).
// Pure: no React, native or network code, so it is testable. The picture is a refreshed static image, not a
// pannable live map. Lines are straight segments between stop coordinates and approximate, never the road.
// Requesting the image sends the stop coordinates (and the phone's position while an alert runs) to Geoapify.
import type { Point } from "../contracts";
import { aerialMeters } from "../data/geo";
import type { TripLine, TripPin } from "../routing/tripPins";

export const STATIC_MAP_BASE = "https://maps.geoapify.com/v1/staticmap";
const MAX_URL_LENGTH = 1900; // GET limit is about 2,048 characters
const MAX_POINTS_PER_LINE = 12;

export const MAP_COLORS = {
  board: "#2e7d32",
  transfer: "#ef6c00",
  alight: "#c62828",
  you: "#1f63e6",
  ride: "#1f63e6",
  walk: "#616161",
} as const;

export interface StaticMapInput {
  apiKey: string;
  pins: TripPin[];
  lines: TripLine[];
  /** The phone's (or the preview's) position, only when the user chose to show it. */
  position?: Point | null;
  width?: number;
  height?: number;
}

const c = (hex: string): string => encodeURIComponent(hex);
const num = (n: number): string => n.toFixed(5);
const valid = (p: Point | null | undefined): p is Point =>
  !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

function thin(points: [number, number][]): [number, number][] {
  if (points.length <= MAX_POINTS_PER_LINE) return points;
  const out: [number, number][] = [];
  for (let i = 0; i < MAX_POINTS_PER_LINE; i += 1) out.push(points[Math.round((i * (points.length - 1)) / (MAX_POINTS_PER_LINE - 1))]!);
  return out;
}

/** A request URL, or null when there is nothing valid to draw or no key. Coordinates are longitude,latitude. */
export function buildStaticMapUrl(input: StaticMapInput): string | null {
  const key = input.apiKey.trim();
  if (!key) return null;
  const pins = input.pins.filter((p) => valid(p.point));
  const you = valid(input.position) ? input.position : null;
  if (pins.length === 0 && !you) return null;

  const markers = pins.map((p) => {
    const color = p.kind === "alight" ? MAP_COLORS.alight : p.kind === "board" ? MAP_COLORS.board : MAP_COLORS.transfer;
    const size = p.kind === "alight" ? "x-large" : "large";
    return `lonlat:${num(p.point.longitude)},${num(p.point.latitude)};type:material;color:${c(color)};size:${size}`;
  });
  if (you) markers.push(`lonlat:${num(you.longitude)},${num(you.latitude)};type:circle;color:${c(MAP_COLORS.you)};size:medium`);

  const geometry = (lines: TripLine[]): string[] =>
    lines
      .map((l) => ({ l, pts: thin(l.polyline.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))) }))
      .filter(({ pts }) => pts.length >= 2)
      .map(({ l, pts }) => `polyline:${pts.map(([lat, lon]) => `${num(lon)},${num(lat)}`).join(",")};linewidth:5;linecolor:${c(l.kind === "walk" ? MAP_COLORS.walk : MAP_COLORS.ride)}`);

  const build = (withLines: boolean): string => {
    const parts = [
      "style=osm-bright",
      `width=${input.width ?? 640}`,
      `height=${input.height ?? 400}`,
      `marker=${markers.join("|")}`,
    ];
    const g = withLines ? geometry(input.lines) : [];
    if (g.length) parts.push(`geometry=${g.join("|")}`);
    parts.push(`apiKey=${encodeURIComponent(key)}`);
    return `${STATIC_MAP_BASE}?${parts.join("&")}`;
  };

  const full = build(true);
  return full.length <= MAX_URL_LENGTH ? full : build(false).length <= MAX_URL_LENGTH ? build(false) : null;
}

/** Re-request the picture only after enough time and movement, to stay well inside the free request quota. */
export function shouldRefreshMap(
  previous: Point | null,
  next: Point | null,
  lastRefreshMs: number,
  nowMs: number,
  minIntervalMs = 20_000,
  minMoveMeters = 40,
): boolean {
  if (!valid(next)) return false;
  if (!valid(previous)) return true;
  if (nowMs - lastRefreshMs < minIntervalMs) return false;
  return aerialMeters(previous, next) >= minMoveMeters;
}
