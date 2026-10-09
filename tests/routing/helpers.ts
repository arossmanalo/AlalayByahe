import type {
  FarePolicy, JourneyOption, JourneyPreferences, Mode, Result, RideLeg, RouteRequest, RouteResult, TransitPack, WalkLeg,
} from "../../src/contracts/index";
import { validatePack } from "../../src/data/validatePack";

/**
 * Test-only builder for tiny synthetic graphs. Everything it makes is kind
 * "test_fixture" in the test_ namespace and is validated before use, so tests
 * exercise the same pack contract as production data.
 */

export const CHECKED = "2026-10-09T21:00:00+08:00";
/** Noon Manila time on 2026-10-09; fixed so fare validity is deterministic. */
export const NOW = Date.UTC(2026, 9, 9, 4, 0, 0);

const ev = (reliability: "verified" | "estimated" = "verified") => ({
  sourceIds: ["source_test_fixture"], checkedAt: CHECKED, reliability, note: "Synthetic test evidence.",
});

export type FareSpec =
  | { flat: number }
  | { range: [number, number] }
  | { unknown: true }
  | { policy: Omit<FarePolicy, "id" | "serviceId" | "evidence"> & { evidence?: FarePolicy["evidence"] } };

export interface StopSpec { at: string; board?: boolean; alight?: boolean }
export interface LineSpec {
  svc: string;
  mode: Mode;
  stops: (string | StopSpec)[];
  /** Defaults to documented. */
  availability?: "documented" | "unknown" | "suspended";
  fare?: FareSpec;
}
export interface MiniSpec {
  lines: LineSpec[];
  /** [fromPlace, toPlace, meters] directed walks. */
  walks?: [string, string, number][];
  /** Extra places with no stops (endpoints). */
  places?: string[];
}

export const placeId = (name: string): string => `place_test_${name}`;
export const stopId = (name: string, svc: string): string => `stop_test_${name}_${svc}`;
export const dirId = (svc: string): string => `dir_test_${svc}`;
export const serviceId = (svc: string): string => `service_test_${svc}`;

export function mini(spec: MiniSpec): TransitPack {
  const names: string[] = [];
  const see = (n: string): void => { if (!names.includes(n)) names.push(n); };
  for (const l of spec.lines) for (const s of l.stops) see(typeof s === "string" ? s : s.at);
  for (const [a, b] of spec.walks ?? []) { see(a); see(b); }
  for (const p of spec.places ?? []) see(p);

  // All places sit within ~11 m steps of each other so any documented walk is physically plausible.
  const point = (n: string) => ({ latitude: 0, longitude: 0.0001 * names.indexOf(n) });

  const stops: TransitPack["stops"] = [];
  const routeStops: TransitPack["routeStops"] = [];
  const directions: TransitPack["directions"] = [];
  const services: TransitPack["services"] = [];
  const fares: TransitPack["fares"] = [];

  for (const line of spec.lines) {
    services.push({ id: serviceId(line.svc), name: `TEST ONLY ${line.svc}`, mode: line.mode, signboardAliases: [], evidence: ev() });
    directions.push({
      id: dirId(line.svc), serviceId: serviceId(line.svc), headsign: `TEST ONLY ${line.svc}`,
      availability: line.availability ?? "documented", availabilityNote: "TEST ONLY synthetic.", evidence: ev(),
    });
    line.stops.forEach((s, i) => {
      const spec2: StopSpec = typeof s === "string" ? { at: s } : s;
      const board = spec2.board ?? true;
      const alight = spec2.alight ?? true;
      const sid = stopId(spec2.at, line.svc);
      if (!stops.some((x) => x.id === sid)) {
        stops.push({ id: sid, placeId: placeId(spec2.at), label: `TEST ONLY ${spec2.at} ${line.svc}`, point: point(spec2.at), board: true, alight: true, evidence: ev() });
      }
      routeStops.push({ directionId: dirId(line.svc), sequence: i + 1, stopId: sid, board, alight, evidence: ev() });
    });
    if (line.fare) {
      const f = line.fare;
      const base = { id: `fare_test_${line.svc}`, serviceId: serviceId(line.svc) };
      if ("flat" in f) fares.push({ ...base, kind: "flat", flatCentavos: f.flat, evidence: ev() });
      else if ("range" in f) fares.push({ ...base, kind: "flat", flatRange: { minCentavos: f.range[0], maxCentavos: f.range[1] }, evidence: ev() });
      else if ("unknown" in f) fares.push({ ...base, kind: "unknown", evidence: { sourceIds: [], checkedAt: CHECKED, reliability: "unknown" } });
      else fares.push({ ...base, evidence: ev(), ...f.policy });
    }
  }

  const pack: TransitPack = {
    schemaVersion: "1.0", packId: "pack_test_mini", version: "test_fixture_mini", kind: "test_fixture", createdAt: CHECKED,
    coverageLabels: ["TEST ONLY synthetic graph"],
    sources: [{
      id: "source_test_fixture", title: "TEST ONLY", publisher: "tests", retrievedAt: CHECKED,
      usageBasis: "Synthetic.", factsSupported: ["test graph"], checkedBy: "tests",
    }],
    places: names.map((n) => ({
      id: placeId(n), name: `TEST ONLY ${n}`, aliases: [], kind: "landmark" as const, locality: "TEST ONLY", point: point(n), evidence: ev(),
    })),
    stops, services, directions, routeStops,
    walkLinks: (spec.walks ?? []).map(([a, b, m]) => ({
      id: `walk_test_${a}_${b}`, fromPlaceId: placeId(a), toPlaceId: placeId(b), meters: m, steps: [`TEST ONLY walk ${a} to ${b}`], evidence: ev(),
    })),
    fares,
  };
  const checked = validatePack(pack, { target: "development" });
  if (!checked.ok) throw new Error(`mini() built an invalid pack: ${JSON.stringify(checked.error)}`);
  return checked.value;
}

export const ALL_MODES: Mode[] = ["van", "jeepney", "bus", "tricycle", "lrt"];

export function prefs(over: Partial<JourneyPreferences> = {}): JourneyPreferences {
  return {
    allowedModes: [...ALL_MODES], priority: "nearest_useful",
    maxAccessWalkMeters: 1000, maxTransferWalkMeters: 500, maxEgressWalkMeters: 1000,
    directOnly: false, budgetCentavos: null, passenger: "regular", ...over,
  };
}

export function req(from: string, to: string, over: Partial<JourneyPreferences> = {}): RouteRequest {
  const endpoint = (n: string) => ({ placeId: placeId(n), label: n, point: { latitude: 0, longitude: 0 }, provenance: "stored" as const });
  return { queryId: "test_query", origin: endpoint(from), destination: endpoint(to), preferences: prefs(over) };
}

export function okValue(result: Result<RouteResult>): RouteResult {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

export const rides = (o: JourneyOption): RideLeg[] => o.legs.filter((l): l is RideLeg => l.kind === "ride");
export const walks = (o: JourneyOption): WalkLeg[] => o.legs.filter((l): l is WalkLeg => l.kind === "walk");
/** Compact trace: W(meters) for walks, R(direction:board>alight) for rides. */
export function trace(o: JourneyOption): string {
  return o.legs
    .map((l) => (l.kind === "walk" ? `W${l.meters}` : `R(${l.directionId.replace("dir_test_", "")}:${l.boardStopId.replace("stop_test_", "")}>${l.alightStopId.replace("stop_test_", "")})`))
    .join(" ");
}
