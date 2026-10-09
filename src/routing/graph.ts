import type { Direction, Place, RouteStop, Service, Stop, TransitPack, WalkLink } from "../contracts/index";

/**
 * Indexed, read-only view of a validated TransitPack for routing (ROUTE-003).
 * Pure TypeScript: no React, no native APIs, no I/O.
 *
 * Only directions with availability "documented" are routable. "unknown" has no
 * evidence behind it and "suspended" is excluded by contract. Reverse directions
 * are independent records; nothing here ever invents the opposite direction.
 */

export interface RoutePoint {
  stop: Stop;
  routeStop: RouteStop;
  /** Position within the direction's ordered stop list. */
  index: number;
  /** Boarding needs the stop flag AND the route-stop flag. */
  canBoard: boolean;
  /** Alighting needs the stop flag AND the route-stop flag. */
  canAlight: boolean;
}

export interface DirectionRoute {
  direction: Direction;
  service: Service;
  points: RoutePoint[];
}

export interface BoardingOption {
  route: DirectionRoute;
  index: number;
}

export interface Graph {
  pack: TransitPack;
  places: ReadonlyMap<string, Place>;
  stops: ReadonlyMap<string, Stop>;
  routes: ReadonlyMap<string, DirectionRoute>;
  /** Boarding opportunities keyed by the place the stop belongs to, in stable order. */
  boardingsByPlace: ReadonlyMap<string, BoardingOption[]>;
  /** Directed walk links keyed by origin place, in stable order. */
  walksFrom: ReadonlyMap<string, WalkLink[]>;
}

const cache = new WeakMap<TransitPack, Graph>();

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildGraph(pack: TransitPack): Graph {
  const hit = cache.get(pack);
  if (hit) return hit;

  const places = new Map(pack.places.map((p) => [p.id, p] as const));
  const stops = new Map(pack.stops.map((s) => [s.id, s] as const));
  const services = new Map(pack.services.map((s) => [s.id, s] as const));

  const grouped = new Map<string, RouteStop[]>();
  for (const rs of pack.routeStops) {
    const list = grouped.get(rs.directionId);
    if (list) list.push(rs);
    else grouped.set(rs.directionId, [rs]);
  }

  const routes = new Map<string, DirectionRoute>();
  for (const direction of [...pack.directions].sort(byId)) {
    if (direction.availability !== "documented") continue;
    const service = services.get(direction.serviceId);
    const ordered = (grouped.get(direction.id) ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    if (!service || ordered.length < 2) continue;
    const points: RoutePoint[] = [];
    for (const routeStop of ordered) {
      const stop = stops.get(routeStop.stopId);
      if (!stop) continue;
      points.push({
        stop, routeStop, index: points.length,
        canBoard: stop.board && routeStop.board,
        canAlight: stop.alight && routeStop.alight,
      });
    }
    if (points.length >= 2) routes.set(direction.id, { direction, service, points });
  }

  const boardingsByPlace = new Map<string, BoardingOption[]>();
  for (const route of routes.values()) {
    for (const point of route.points) {
      if (!point.canBoard) continue;
      const key = point.stop.placeId;
      const list = boardingsByPlace.get(key);
      const option = { route, index: point.index };
      if (list) list.push(option);
      else boardingsByPlace.set(key, [option]);
    }
  }

  const walksFrom = new Map<string, WalkLink[]>();
  for (const link of [...pack.walkLinks].sort(byId)) {
    const list = walksFrom.get(link.fromPlaceId);
    if (list) list.push(link);
    else walksFrom.set(link.fromPlaceId, [link]);
  }

  const graph: Graph = { pack, places, stops, routes, boardingsByPlace, walksFrom };
  cache.set(pack, graph);
  return graph;
}
