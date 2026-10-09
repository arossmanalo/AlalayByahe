import type { Point } from "../contracts/index";

const EARTH_RADIUS_METERS = 6_371_008.8;

/**
 * Great-circle (aerial) distance in meters. Used ONLY to sanity-check data
 * (e.g. a documented walking path cannot be shorter than the aerial gap).
 * It must never stand in for a pedestrian distance in routing.
 */
export function aerialMeters(a: Point, b: Point): number {
  const toRad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toRad;
  const dLon = (b.longitude - a.longitude) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * toRad) * Math.cos(b.latitude * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}
