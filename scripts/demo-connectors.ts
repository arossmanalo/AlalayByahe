import type { Evidence, Place, TransitPack } from "../src/contracts/index";
import { defaultPreferences } from "../src/contracts/defaults";
import { aerialMeters } from "../src/data/geo";
import { validatePack } from "../src/data/validatePack";
import { planRoute } from "../src/routing/routePort";
import { APP_LIMITS } from "../src/application/config";

/**
 * DEMO BUILD ONLY. Joins the demo pack's separate islands (real LRT-1, the one-way road drafts and the
 * invented Luzon network) so that every ordered pair of demo places has a journey with default preferences.
 *
 * Islands are groups of places that can all reach each other. Islands are joined pairwise, nearest pair
 * of places first (Kruskal), with a two-way link: a walk when the gap is short enough for the default
 * 500 m transfer limit, otherwise a two-stop connector line. Every connector is labelled
 * "DEMO connector (invented)", carries estimated evidence and a sample fare, and lives only in the demo
 * pack (kind test_fixture). Connectors are added only between islands, so a trip that already worked keeps
 * its own route. The release pack is never touched.
 */

const WALK_MAX_AERIAL_METERS = 350;
const NOW = Date.parse("2026-10-10T12:00:00+08:00");

type Endpoint = { placeId: string; label: string; point: Place["point"]; provenance: "stored" };
const endpoint = (p: Place): Endpoint => ({ placeId: p.id, label: p.name, point: p.point, provenance: "stored" });

export function reachability(pack: TransitPack): boolean[][] {
  const checked = validatePack(pack, { target: "development" });
  if (!checked.ok) throw new Error(`demo pack is invalid: ${JSON.stringify(checked.error)}`);
  const valid = checked.value;
  return valid.places.map((a) => valid.places.map((b) =>
    a.id === b.id || planRoute(
      { queryId: "demo_connectivity", origin: endpoint(a), destination: endpoint(b), preferences: defaultPreferences() },
      valid, { now: () => NOW, labelLimit: APP_LIMITS.demoRoutingLabelLimit },
    ).ok));
}

/** Islands: maximal groups of places that can all reach each other (strongly connected). */
export function islands(reach: boolean[][]): number[] {
  const island = new Array<number>(reach.length).fill(-1);
  let next = 0;
  for (let i = 0; i < reach.length; i++) {
    if (island[i]! >= 0) continue;
    for (let j = 0; j < reach.length; j++) if (reach[i]![j] && reach[j]![i] && island[j]! < 0) island[j] = next;
    next++;
  }
  return island;
}

/** Sample fare for an invented connector, in centavos, rounded to whole pesos ending in 0 or 5. */
function sampleFare(meters: number, mode: "jeepney" | "bus"): number {
  const km = meters / 1000;
  const pesos = mode === "jeepney" ? Math.max(15, 13 + 2 * Math.max(0, km - 4)) : Math.max(50, 2.2 * km);
  return Math.round(pesos / 5) * 5 * 100;
}

export function connectIslands(pack: TransitPack, sourceId: string): TransitPack {
  const reach = reachability(pack);
  const island = islands(reach);
  const count = Math.max(...island) + 1;
  if (count <= 1) return pack;

  const places = pack.places;
  // Nearest pair of places for every pair of islands.
  const candidates: { a: number; b: number; meters: number; i: number; j: number }[] = [];
  for (let x = 0; x < count; x++) for (let y = x + 1; y < count; y++) {
    let best: { i: number; j: number; meters: number } | null = null;
    places.forEach((p, i) => {
      if (island[i] !== x) return;
      places.forEach((q, j) => {
        if (island[j] !== y) return;
        const meters = aerialMeters(p.point, q.point);
        if (!best || meters < best.meters || (meters === best.meters && p.id + q.id < places[best.i]!.id + places[best.j]!.id)) {
          best = { i, j, meters };
        }
      });
    });
    if (best) candidates.push({ a: x, b: y, ...(best as { i: number; j: number; meters: number }) });
  }
  candidates.sort((u, v) => u.meters - v.meters || u.a - v.a || u.b - v.b);

  const parent = Array.from({ length: count }, (_, k) => k);
  const find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k]!)));
  const evidence: Evidence = {
    sourceIds: [sourceId], checkedAt: pack.createdAt, reliability: "estimated",
    note: "DEMO connector, invented to join the demo islands. Not real transport information.",
  };
  const out: TransitPack = JSON.parse(JSON.stringify(pack)) as TransitPack;
  let n = 0;
  for (const c of candidates) {
    if (find(c.a) === find(c.b)) continue;
    parent[find(c.a)] = find(c.b);
    n++;
    const a = places[c.i]!, b = places[c.j]!;
    const tag = `test_demo_link_${String(n).padStart(2, "0")}`;
    if (c.meters <= WALK_MAX_AERIAL_METERS) {
      const meters = Math.ceil(c.meters * 1.25) + 10;
      for (const [from, to, dir] of [[a, b, "ab"], [b, a, "ba"]] as const) {
        // Keep a documented walk in this direction (one authoritative path per direction).
        if (out.walkLinks.some((w) => w.fromPlaceId === from.id && w.toPlaceId === to.id)) continue;
        out.walkLinks.push({
          id: `walk_${tag}_${dir}`, fromPlaceId: from.id, toPlaceId: to.id, meters,
          steps: [`DEMO connector (invented): walk about ${meters} m to ${to.name}.`], evidence,
        });
      }
      continue;
    }
    const mode = c.meters <= 20_000 ? "jeepney" : "bus";
    const serviceId = `service_${tag}`;
    out.services.push({ id: serviceId, name: `DEMO connector (invented): ${a.name} - ${b.name}`, mode, signboardAliases: [], evidence });
    const stopA = `stop_${tag}_a`, stopB = `stop_${tag}_b`;
    out.stops.push(
      { id: stopA, placeId: a.id, label: `${a.name} (DEMO connector ${n})`, point: a.point, board: true, alight: true, evidence },
      { id: stopB, placeId: b.id, label: `${b.name} (DEMO connector ${n})`, point: b.point, board: true, alight: true, evidence },
    );
    for (const [first, second, to, dir] of [[stopA, stopB, b, "ab"], [stopB, stopA, a, "ba"]] as const) {
      const directionId = `dir_${tag}_${dir}`;
      out.directions.push({
        id: directionId, serviceId, headsign: to.name, availability: "documented",
        availabilityNote: "DEMO connector, invented. Not real transport information.", evidence,
      });
      out.routeStops.push(
        { directionId, sequence: 1, stopId: first, board: true, alight: false, evidence },
        { directionId, sequence: 2, stopId: second, board: false, alight: true, evidence },
      );
    }
    out.fares.push({ id: `fare_${tag}`, serviceId, kind: "flat", flatCentavos: sampleFare(c.meters, mode), evidence });
  }
  return out;
}

/** Every ordered pair of distinct places must plan; returns the pairs that do not. */
export function unreachablePairs(pack: TransitPack): string[] {
  const reach = reachability(pack);
  const missing: string[] = [];
  reach.forEach((row, i) => row.forEach((ok, j) => { if (!ok) missing.push(`${pack.places[i]!.id} -> ${pack.places[j]!.id}`); }));
  return missing;
}
