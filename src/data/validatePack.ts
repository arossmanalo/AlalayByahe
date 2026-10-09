import type { AppError, Result, TransitPack } from "../contracts/index";
import { aerialMeters } from "./geo";
import { parseIsoDateOrDateTime, parseIsoDateTime } from "./isoTime";
import { normalizeAlias } from "./normalize";

/**
 * TransitPack 1.0 validation (ROUTE-002).
 *
 * A pack is untrusted JSON until it passes here. Validation never throws across
 * the module boundary; it returns a PackReport (full diagnostics) or a
 * Result<TransitPack> (the contract shape). A successful result is a deep,
 * frozen copy, so routing receives an immutable snapshot that cannot be changed
 * through the caller's original object.
 */

export const PACK_SCHEMA_VERSION = "1.0" as const;

export type PackTarget = "release" | "development";

export type PackIssueCode =
  | "schema"
  | "unknown_field"
  | "duplicate_id"
  | "dangling_ref"
  | "sequence"
  | "coordinates"
  | "evidence"
  | "walk"
  | "fare"
  | "flags"
  | "release_gate"
  | "unused";

export interface PackIssue {
  severity: "error" | "warning";
  code: PackIssueCode;
  /** JSON path such as `walkLinks[3].meters`. */
  path: string;
  message: string;
}

export interface PackSummary {
  packId: string;
  version: string;
  kind: string;
  places: number;
  stops: number;
  services: number;
  directions: number;
  routeStops: number;
  walkLinks: number;
  fares: number;
  sources: number;
}

export interface PackReport {
  target: PackTarget;
  /** True only when there are no error-severity issues. */
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issues: PackIssue[];
  summary: PackSummary | null;
  /** Deep-frozen validated copy; null when `ok` is false. */
  pack: TransitPack | null;
}

export interface ValidateOptions {
  /**
   * "release" requires kind release and the full release gate.
   * "development" also accepts kind test_fixture (tests and development only).
   * There is deliberately no default: callers must say which they mean.
   */
  target: PackTarget;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const MODES = ["van", "jeepney", "bus", "tricycle", "lrt"] as const;
const PLACE_KINDS = ["landmark", "terminal", "station", "address", "boarding_point"] as const;
const AVAILABILITY = ["documented", "unknown", "suspended"] as const;
const RELIABILITY = ["verified", "estimated", "unknown"] as const;
const FARE_KINDS = ["flat", "matrix", "distance", "unknown"] as const;
const PASSENGERS = ["student", "senior", "pwd"] as const;
const ROUNDING = ["floor", "ceil", "nearest"] as const;
const PACK_KINDS = ["release", "test_fixture"] as const;

const ID_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 96;
const MAX_TEXT_LENGTH = 2_000;
const MAX_RECORDS = 200_000;
/** A fare above PHP 100,000 is almost certainly a unit mistake (pesos vs centavos). */
const MAX_CENTAVOS = 10_000_000;
const MAX_SEGMENT_METERS = 2_000_000;
/** Walks beyond this are almost certainly a unit mistake; beyond the soft cap they get a warning. */
const MAX_WALK_METERS = 50_000;
const SOFT_WALK_METERS = 5_000;
/** Stops far from their place's point deserve a look, but a town-level place can legitimately be large. */
const STOP_DISTANCE_WARN_METERS = 1_000;

/** Rough Philippine bounding box. Catches swapped lat/lon and 0,0 placeholders in release data. */
const PH_BOUNDS = { minLat: 4.5, maxLat: 21.5, minLon: 116.0, maxLon: 127.0 };

/** An ID is in the synthetic namespace when a `test_` token appears in it. */
const FIXTURE_ID_RE = /(^|_)test_/;
const FIXTURE_TEXT_RE = /TEST ONLY|DEV FIXTURE|synthetic unit-test/i;

const ID_PREFIX = {
  place: "place_",
  stop: "stop_",
  service: "service_",
  direction: "dir_",
  walk: "walk_",
  fare: "fare_",
  source: "source_",
} as const;

const PACK_KEYS = [
  "schemaVersion", "packId", "version", "kind", "createdAt", "coverageLabels",
  "places", "stops", "services", "directions", "routeStops", "walkLinks", "fares", "sources",
];

/* ------------------------------------------------------------------ */
/* Small typed helpers                                                 */
/* ------------------------------------------------------------------ */

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function has(o: Obj, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

export function isFixtureId(id: string): boolean {
  return FIXTURE_ID_RE.test(id);
}

class Issues {
  readonly list: PackIssue[] = [];
  error(code: PackIssueCode, path: string, message: string): void {
    this.list.push({ severity: "error", code, path, message });
  }
  warn(code: PackIssueCode, path: string, message: string): void {
    this.list.push({ severity: "warning", code, path, message });
  }
}

interface Env {
  issues: Issues;
  sourceIds: Set<string>;
  /** Kind-driven: any pack claiming to be a release meets the release gate. */
  release: boolean;
}

function checkKeys(env: Env, o: Obj, path: string, required: string[], optional: string[] = []): void {
  for (const k of required) {
    if (!has(o, k)) env.issues.error("schema", `${path}.${k}`, "Required field is missing.");
  }
  for (const k of Object.keys(o)) {
    if (!required.includes(k) && !optional.includes(k)) {
      env.issues.error("unknown_field", `${path}.${k}`, "Field is not part of TransitPack 1.0.");
    }
  }
}

function reqString(env: Env, o: Obj, k: string, path: string, allowEmpty = false): string | undefined {
  const v = o[k];
  if (typeof v !== "string") {
    if (has(o, k)) env.issues.error("schema", `${path}.${k}`, "Must be a string.");
    return undefined;
  }
  if (!allowEmpty && v.trim().length === 0) {
    env.issues.error("schema", `${path}.${k}`, "Must not be empty.");
    return undefined;
  }
  if (v.length > MAX_TEXT_LENGTH) {
    env.issues.error("schema", `${path}.${k}`, `Must be at most ${MAX_TEXT_LENGTH} characters.`);
    return undefined;
  }
  return v;
}

function optString(env: Env, o: Obj, k: string, path: string): string | undefined {
  return has(o, k) ? reqString(env, o, k, path) : undefined;
}

function reqBool(env: Env, o: Obj, k: string, path: string): boolean | undefined {
  const v = o[k];
  if (typeof v !== "boolean") {
    if (has(o, k)) env.issues.error("schema", `${path}.${k}`, "Must be true or false.");
    return undefined;
  }
  return v;
}

function reqEnum<T extends string>(
  env: Env, o: Obj, k: string, path: string, values: readonly T[],
): T | undefined {
  const v = o[k];
  if (typeof v !== "string" || !values.includes(v as T)) {
    if (has(o, k)) env.issues.error("schema", `${path}.${k}`, `Must be one of: ${values.join(", ")}.`);
    return undefined;
  }
  return v as T;
}

function reqInt(
  env: Env, o: Obj, k: string, path: string, min: number, max: number, code: PackIssueCode = "schema",
): number | undefined {
  const v = o[k];
  if (typeof v !== "number" || !Number.isSafeInteger(v)) {
    if (has(o, k)) env.issues.error(code, `${path}.${k}`, "Must be an integer (no fractions, NaN or Infinity).");
    return undefined;
  }
  if (v < min || v > max) {
    env.issues.error(code, `${path}.${k}`, `Must be between ${min} and ${max}.`);
    return undefined;
  }
  return v;
}

function reqArray(env: Env, o: Obj, k: string, path: string): unknown[] | undefined {
  const v = o[k];
  if (!Array.isArray(v)) {
    if (has(o, k)) env.issues.error("schema", `${path}.${k}`, "Must be an array.");
    return undefined;
  }
  if (v.length > MAX_RECORDS) {
    env.issues.error("schema", `${path}.${k}`, `Must have at most ${MAX_RECORDS} entries.`);
    return undefined;
  }
  return v;
}

function reqStringArray(env: Env, o: Obj, k: string, path: string, allowEmptyArray: boolean): string[] | undefined {
  const arr = reqArray(env, o, k, path);
  if (!arr) return undefined;
  if (!allowEmptyArray && arr.length === 0) {
    env.issues.error("schema", `${path}.${k}`, "Must not be empty.");
  }
  const out: string[] = [];
  arr.forEach((item, i) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      env.issues.error("schema", `${path}.${k}[${i}]`, "Must be a non-empty string.");
    } else out.push(item);
  });
  return out;
}

function reqId(env: Env, o: Obj, k: string, path: string, prefix: string): string | undefined {
  const v = reqString(env, o, k, path);
  if (v === undefined) return undefined;
  if (!v.startsWith(prefix) || !ID_RE.test(v) || v.length > MAX_ID_LENGTH) {
    env.issues.error(
      "schema", `${path}.${k}`,
      `ID "${v}" must be lower_snake_case, start with "${prefix}" and be at most ${MAX_ID_LENGTH} characters.`,
    );
    return undefined;
  }
  return v;
}

interface PointValue { latitude: number; longitude: number }

function reqPoint(env: Env, o: Obj, k: string, path: string): PointValue | undefined {
  const p = o[k];
  if (!isObj(p)) {
    if (has(o, k)) env.issues.error("schema", `${path}.${k}`, "Must be an object with latitude and longitude.");
    return undefined;
  }
  const here = `${path}.${k}`;
  checkKeys(env, p, here, ["latitude", "longitude"]);
  const lat = p["latitude"];
  const lon = p["longitude"];
  let ok = true;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    if (has(p, "latitude")) env.issues.error("coordinates", `${here}.latitude`, "Latitude must be a finite number from -90 to 90.");
    ok = false;
  }
  if (typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    if (has(p, "longitude")) env.issues.error("coordinates", `${here}.longitude`, "Longitude must be a finite number from -180 to 180.");
    ok = false;
  }
  if (!ok) return undefined;
  const point = { latitude: lat as number, longitude: lon as number };
  if (env.release) {
    const b = PH_BOUNDS;
    if (point.latitude < b.minLat || point.latitude > b.maxLat || point.longitude < b.minLon || point.longitude > b.maxLon) {
      env.issues.error(
        "coordinates", here,
        "Coordinate is outside the Philippines; latitude and longitude may be swapped or a placeholder was left in.",
      );
      return undefined;
    }
  }
  return point;
}

interface EvidenceOptions {
  /** Release routing facts must be verified, not merely estimated. */
  requireVerifiedInRelease: boolean;
  /** Unknown reliability is allowed only where the record itself says "unknown". */
  allowUnknown: boolean;
}

function checkEvidence(env: Env, o: Obj, k: string, path: string, opts: EvidenceOptions): Obj | undefined {
  const ev = o[k];
  const here = `${path}.${k}`;
  if (!isObj(ev)) {
    env.issues.error("evidence", here, "Evidence record is required.");
    return undefined;
  }
  checkKeys(env, ev, here, ["sourceIds", "checkedAt", "reliability"], ["note"]);
  const ids = reqStringArray(env, ev, "sourceIds", here, true) ?? [];
  const checkedAt = reqString(env, ev, "checkedAt", here);
  if (checkedAt !== undefined && parseIsoDateTime(checkedAt) === null) {
    env.issues.error("evidence", `${here}.checkedAt`, "Must be an ISO 8601 date-time with a timezone, e.g. 2026-10-09T21:00:00+08:00.");
  }
  const reliability = reqEnum(env, ev, "reliability", here, RELIABILITY);
  optString(env, ev, "note", here);
  const seen = new Set<string>();
  ids.forEach((id, i) => {
    if (!env.sourceIds.has(id)) {
      env.issues.error("dangling_ref", `${here}.sourceIds[${i}]`, `Source "${id}" does not exist in sources.`);
    }
    if (seen.has(id)) env.issues.warn("evidence", `${here}.sourceIds[${i}]`, `Source "${id}" is listed twice.`);
    seen.add(id);
  });
  if (reliability === "unknown") {
    if (!opts.allowUnknown) {
      env.issues.error("evidence", `${here}.reliability`, "Unknown reliability cannot back a routing fact.");
    }
  } else if (reliability !== undefined && ids.length === 0) {
    env.issues.error("evidence", `${here}.sourceIds`, `A ${reliability} fact must cite at least one source.`);
  }
  if (env.release && opts.requireVerifiedInRelease && reliability !== undefined && reliability !== "verified") {
    env.issues.error("release_gate", `${here}.reliability`, "Release routing facts must be verified.");
  }
  return ev;
}

function forEachRecord(
  env: Env, root: Obj, key: string, fn: (rec: Obj, path: string, index: number) => void,
): void {
  const arr = reqArray(env, root, key, "$");
  if (!arr) {
    if (!has(root, key)) env.issues.error("schema", `$.${key}`, "Required collection is missing.");
    return;
  }
  arr.forEach((rec, i) => {
    const path = `${key}[${i}]`;
    if (!isObj(rec)) env.issues.error("schema", path, "Must be an object.");
    else fn(rec, path, i);
  });
}

function registerId(env: Env, seen: Map<string, string>, id: string | undefined, path: string, label: string): void {
  if (id === undefined) return;
  const prior = seen.get(id);
  if (prior !== undefined) {
    env.issues.error("duplicate_id", `${path}.id`, `Duplicate ${label} ID "${id}" (first used at ${prior}).`);
  } else seen.set(id, path);
}

/* ------------------------------------------------------------------ */
/* Pack analysis                                                       */
/* ------------------------------------------------------------------ */

interface PlaceInfo { point: PointValue; name: string; locality: string }
interface StopInfo { placeId: string; board: boolean; alight: boolean; point: PointValue | undefined }
interface ServiceInfo { mode: string }
interface DirectionInfo { serviceId: string; availability: string }
interface RouteStopInfo { sequence: number; stopId: string; board: boolean; alight: boolean; path: string }

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

function scanStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void {
  if (typeof value === "string") visit(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => scanStrings(v, `${path}[${i}]`, visit));
  else if (isObj(value)) for (const [k, v] of Object.entries(value)) scanStrings(v, `${path}.${k}`, visit);
}

export function analyzePack(input: unknown, options: ValidateOptions): PackReport {
  const issues = new Issues();
  const fail = (): PackReport => finish(issues, options.target, null, null);

  let data: unknown;
  try {
    // JSON round trip: rejects cycles/BigInt, strips functions and accessors, and
    // guarantees the value we validate is the value we later freeze and return.
    const text = JSON.stringify(input);
    data = text === undefined ? undefined : JSON.parse(text);
  } catch {
    issues.error("schema", "$", "Pack is not plain JSON data.");
    return fail();
  }
  if (!isObj(data)) {
    issues.error("schema", "$", "Pack must be a JSON object.");
    return fail();
  }
  const root = data;

  const kindRaw = root["kind"];
  const release = kindRaw === "release";
  const env: Env = { issues, sourceIds: new Set(), release };

  checkKeys(env, root, "$", PACK_KEYS);
  if (root["schemaVersion"] !== PACK_SCHEMA_VERSION) {
    issues.error("schema", "$.schemaVersion", `Unsupported schemaVersion; expected "${PACK_SCHEMA_VERSION}".`);
  }
  const packId = reqString(env, root, "packId", "$");
  const version = reqString(env, root, "version", "$");
  const kind = reqEnum(env, root, "kind", "$", PACK_KINDS);
  const createdAt = reqString(env, root, "createdAt", "$");
  if (createdAt !== undefined && parseIsoDateTime(createdAt) === null) {
    issues.error("schema", "$.createdAt", "Must be an ISO 8601 date-time with a timezone.");
  }
  const coverageLabels = reqStringArray(env, root, "coverageLabels", "$", !release) ?? [];

  if (options.target === "release" && kind !== undefined && kind !== "release") {
    issues.error("release_gate", "$.kind", `A ${kind} pack cannot be loaded as a release pack.`);
  }

  /* ---- sources ---- */
  const sourceSeen = new Map<string, string>();
  const sourceUse = new Map<string, number>();
  forEachRecord(env, root, "sources", (rec, path) => {
    checkKeys(env, rec, path,
      ["id", "title", "publisher", "retrievedAt", "usageBasis", "factsSupported", "checkedBy"],
      ["url", "publishedAt", "note"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.source);
    registerId(env, sourceSeen, id, path, "source");
    if (id !== undefined) env.sourceIds.add(id);
    reqString(env, rec, "title", path);
    reqString(env, rec, "publisher", path);
    reqString(env, rec, "usageBasis", path);
    reqString(env, rec, "checkedBy", path);
    reqStringArray(env, rec, "factsSupported", path, false);
    optString(env, rec, "note", path);
    const retrieved = reqString(env, rec, "retrievedAt", path);
    if (retrieved !== undefined && parseIsoDateTime(retrieved) === null) {
      issues.error("evidence", `${path}.retrievedAt`, "Must be an ISO 8601 date-time with a timezone.");
    }
    const published = optString(env, rec, "publishedAt", path);
    if (published !== undefined && parseIsoDateOrDateTime(published) === null) {
      issues.error("evidence", `${path}.publishedAt`, "Must be an ISO 8601 date or date-time.");
    }
    const url = optString(env, rec, "url", path);
    if (url !== undefined && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
      issues.error("schema", `${path}.url`, "Must be an http(s) URL.");
    }
  });

  /* ---- places ---- */
  const placeSeen = new Map<string, string>();
  const places = new Map<string, PlaceInfo>();
  const placeNameKeys = new Map<string, string>();
  const placePointKeys = new Map<string, string>();
  forEachRecord(env, root, "places", (rec, path) => {
    checkKeys(env, rec, path, ["id", "name", "aliases", "kind", "locality", "point", "evidence"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.place);
    registerId(env, placeSeen, id, path, "place");
    const name = reqString(env, rec, "name", path);
    const locality = reqString(env, rec, "locality", path);
    reqEnum(env, rec, "kind", path, PLACE_KINDS);
    const aliases = reqStringArray(env, rec, "aliases", path, true) ?? [];
    const point = reqPoint(env, rec, "point", path);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: false, allowUnknown: true });
    if (id !== undefined && name !== undefined && locality !== undefined && point !== undefined && !places.has(id)) {
      places.set(id, { point, name, locality });
      const key = `${normalizeAlias(name)}|${normalizeAlias(locality)}`;
      const prior = placeNameKeys.get(key);
      if (prior !== undefined) {
        issues.error("duplicate_id", `${path}.name`, `Place "${name}" duplicates ${prior} (same name and locality); give them distinct names.`);
      } else placeNameKeys.set(key, path);
      // Two different places at exactly the same point usually means one coordinate was copied
      // from the other (a station and its neighbour, for instance). Worth a human look.
      const pointKey = `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
      const sameSpot = placePointKeys.get(pointKey);
      if (sameSpot !== undefined) {
        issues.warn("coordinates", `${path}.point`, `Place has exactly the same coordinate as ${sameSpot}; one of them may have been copied in error.`);
      } else placePointKeys.set(pointKey, path);
    }
    if (name !== undefined) {
      const seenAlias = new Set<string>([normalizeAlias(name)]);
      aliases.forEach((a, i) => {
        const n = normalizeAlias(a);
        if (n.length === 0) issues.error("schema", `${path}.aliases[${i}]`, "Alias has no searchable characters.");
        else if (seenAlias.has(n)) issues.warn("schema", `${path}.aliases[${i}]`, `Alias "${a}" repeats the name or another alias.`);
        seenAlias.add(n);
      });
    }
  });

  /* ---- stops ---- */
  const stopSeen = new Map<string, string>();
  const stops = new Map<string, StopInfo>();
  const stopDupKeys = new Map<string, string>();
  forEachRecord(env, root, "stops", (rec, path) => {
    checkKeys(env, rec, path, ["id", "placeId", "label", "point", "board", "alight", "evidence"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.stop);
    registerId(env, stopSeen, id, path, "stop");
    const placeId = reqId(env, rec, "placeId", path, ID_PREFIX.place);
    const label = reqString(env, rec, "label", path);
    const point = reqPoint(env, rec, "point", path);
    const board = reqBool(env, rec, "board", path);
    const alight = reqBool(env, rec, "alight", path);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: true, allowUnknown: false });
    if (placeId !== undefined && !places.has(placeId) && !placeSeen.has(placeId)) {
      issues.error("dangling_ref", `${path}.placeId`, `Place "${placeId}" does not exist.`);
    }
    if (board === false && alight === false) {
      issues.error("flags", path, "A stop that allows neither boarding nor alighting cannot be used.");
    }
    if (id !== undefined && placeId !== undefined && board !== undefined && alight !== undefined && !stops.has(id)) {
      stops.set(id, { placeId, board, alight, point });
    }
    if (placeId !== undefined && label !== undefined) {
      const key = `${placeId}|${normalizeAlias(label)}`;
      const prior = stopDupKeys.get(key);
      if (prior !== undefined) {
        issues.error("duplicate_id", `${path}.label`, `Stop "${label}" duplicates ${prior} (same place and label).`);
      } else stopDupKeys.set(key, path);
    }
    const place = placeId === undefined ? undefined : places.get(placeId);
    if (place && point) {
      const gap = aerialMeters(place.point, point);
      if (gap > STOP_DISTANCE_WARN_METERS) {
        issues.warn("coordinates", `${path}.point`, `Stop is ${Math.round(gap)} m from its place point; confirm the coordinate.`);
      }
    }
  });

  /* ---- services ---- */
  const serviceSeen = new Map<string, string>();
  const services = new Map<string, ServiceInfo>();
  forEachRecord(env, root, "services", (rec, path) => {
    checkKeys(env, rec, path, ["id", "name", "mode", "signboardAliases", "evidence"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.service);
    registerId(env, serviceSeen, id, path, "service");
    reqString(env, rec, "name", path);
    const mode = reqEnum(env, rec, "mode", path, MODES);
    reqStringArray(env, rec, "signboardAliases", path, true);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: true, allowUnknown: false });
    if (id !== undefined && mode !== undefined && !services.has(id)) services.set(id, { mode });
  });

  /* ---- directions ---- */
  const directionSeen = new Map<string, string>();
  const directions = new Map<string, DirectionInfo>();
  forEachRecord(env, root, "directions", (rec, path) => {
    checkKeys(env, rec, path, ["id", "serviceId", "headsign", "availability", "availabilityNote", "evidence"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.direction);
    registerId(env, directionSeen, id, path, "direction");
    const serviceId = reqId(env, rec, "serviceId", path, ID_PREFIX.service);
    reqString(env, rec, "headsign", path);
    const availability = reqEnum(env, rec, "availability", path, AVAILABILITY);
    const note = reqString(env, rec, "availabilityNote", path, true);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: true, allowUnknown: false });
    if (serviceId !== undefined && !services.has(serviceId) && !serviceSeen.has(serviceId)) {
      issues.error("dangling_ref", `${path}.serviceId`, `Service "${serviceId}" does not exist.`);
    }
    if (availability !== undefined && availability !== "documented" && note !== undefined && note.trim().length === 0) {
      issues.error("schema", `${path}.availabilityNote`, `A ${availability} direction must explain why in availabilityNote.`);
    }
    if (id !== undefined && serviceId !== undefined && availability !== undefined && !directions.has(id)) {
      directions.set(id, { serviceId, availability });
    }
  });

  /* ---- route stops ---- */
  const routeStopsByDirection = new Map<string, RouteStopInfo[]>();
  forEachRecord(env, root, "routeStops", (rec, path) => {
    checkKeys(env, rec, path, ["directionId", "sequence", "stopId", "board", "alight", "evidence"]);
    const directionId = reqId(env, rec, "directionId", path, ID_PREFIX.direction);
    const sequence = reqInt(env, rec, "sequence", path, 0, 100_000, "sequence");
    const stopId = reqId(env, rec, "stopId", path, ID_PREFIX.stop);
    const board = reqBool(env, rec, "board", path);
    const alight = reqBool(env, rec, "alight", path);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: true, allowUnknown: false });
    if (directionId !== undefined && !directions.has(directionId) && !directionSeen.has(directionId)) {
      issues.error("dangling_ref", `${path}.directionId`, `Direction "${directionId}" does not exist.`);
    }
    const stop = stopId === undefined ? undefined : stops.get(stopId);
    if (stopId !== undefined && !stop && !stopSeen.has(stopId)) {
      issues.error("dangling_ref", `${path}.stopId`, `Stop "${stopId}" does not exist.`);
    }
    if (stop && board === true && !stop.board) {
      issues.error("flags", `${path}.board`, `Route stop allows boarding but stop "${stopId}" does not.`);
    }
    if (stop && alight === true && !stop.alight) {
      issues.error("flags", `${path}.alight`, `Route stop allows alighting but stop "${stopId}" does not.`);
    }
    if (directionId !== undefined && sequence !== undefined && stopId !== undefined && board !== undefined && alight !== undefined) {
      const list = routeStopsByDirection.get(directionId) ?? [];
      list.push({ sequence, stopId, board, alight, path });
      routeStopsByDirection.set(directionId, list);
    }
  });

  const orderedStops = new Map<string, RouteStopInfo[]>();
  for (const [directionId, list] of routeStopsByDirection) {
    const sorted = [...list].sort((a, b) => a.sequence - b.sequence);
    orderedStops.set(directionId, sorted);
    sorted.forEach((rs, i) => {
      const prev = sorted[i - 1];
      if (prev && prev.sequence === rs.sequence) {
        issues.error("sequence", `${rs.path}.sequence`, `Direction "${directionId}" repeats sequence ${rs.sequence} (also at ${prev.path}).`);
      } else if (prev && prev.stopId === rs.stopId) {
        issues.error("sequence", `${rs.path}.stopId`, `Direction "${directionId}" lists stop "${rs.stopId}" twice in a row.`);
      }
    });
  }

  for (const [directionId, info] of directions) {
    const path = `directions[id=${directionId}]`;
    const ordered = orderedStops.get(directionId) ?? [];
    if (ordered.length < 2) {
      issues.error("sequence", path, `Direction "${directionId}" needs at least two ordered route stops.`);
      continue;
    }
    if (info.availability === "suspended") continue;
    const firstBoard = ordered.findIndex((s) => s.board);
    const usable = firstBoard >= 0 && ordered.slice(firstBoard + 1).some((s) => s.alight);
    if (!usable) {
      issues.error("flags", path, `Direction "${directionId}" has no boarding stop followed by an alighting stop, so no ride can be made on it.`);
    }
  }

  /* ---- walk links ---- */
  const walkSeen = new Map<string, string>();
  const walkPairs = new Map<string, string>();
  forEachRecord(env, root, "walkLinks", (rec, path) => {
    checkKeys(env, rec, path, ["id", "fromPlaceId", "toPlaceId", "meters", "steps", "evidence"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.walk);
    registerId(env, walkSeen, id, path, "walk link");
    const from = reqId(env, rec, "fromPlaceId", path, ID_PREFIX.place);
    const to = reqId(env, rec, "toPlaceId", path, ID_PREFIX.place);
    const meters = reqInt(env, rec, "meters", path, 0, MAX_WALK_METERS, "walk");
    reqStringArray(env, rec, "steps", path, false);
    checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: true, allowUnknown: false });
    for (const [field, pid] of [["fromPlaceId", from], ["toPlaceId", to]] as const) {
      if (pid !== undefined && !places.has(pid) && !placeSeen.has(pid)) {
        issues.error("dangling_ref", `${path}.${field}`, `Place "${pid}" does not exist.`);
      }
    }
    if (from !== undefined && to !== undefined) {
      if (from === to) issues.error("walk", path, "A walk link must connect two different places.");
      const pairKey = `${from}>${to}`;
      const prior = walkPairs.get(pairKey);
      if (prior !== undefined) {
        issues.error("walk", path, `Directed walk ${from} to ${to} is already documented at ${prior}; keep one authoritative path.`);
      } else walkPairs.set(pairKey, path);
      const a = places.get(from);
      const b = places.get(to);
      if (a && b && meters !== undefined) {
        const aerial = aerialMeters(a.point, b.point);
        // Pedestrian paths cannot be shorter than the straight line; allow for coordinate rounding.
        if (meters + Math.max(25, aerial * 0.1) < aerial) {
          issues.error("walk", `${path}.meters`, `Walk is ${meters} m but the places are ${Math.round(aerial)} m apart in a straight line; the path or a coordinate is wrong.`);
        }
      }
    }
    if (meters !== undefined && meters > SOFT_WALK_METERS) {
      issues.warn("walk", `${path}.meters`, `Walk of ${meters} m is unusually long; confirm the unit is meters.`);
    }
  });

  /* ---- fares ---- */
  const fareSeen = new Map<string, string>();
  const policiesByService = new Map<string, { path: string; from: number | null; to: number | null }[]>();
  const positionOf = (directionId: string, stopId: string): number[] =>
    (orderedStops.get(directionId) ?? []).flatMap((s, i) => (s.stopId === stopId ? [i] : []));
  const serviceDirections = (serviceId: string): string[] =>
    [...directions].filter(([, d]) => d.serviceId === serviceId).map(([id]) => id);

  forEachRecord(env, root, "fares", (rec, path) => {
    checkKeys(env, rec, path, ["id", "serviceId", "kind", "evidence"],
      ["validFrom", "validTo", "flatCentavos", "flatRange", "matrix", "distanceRule", "discountRules"]);
    const id = reqId(env, rec, "id", path, ID_PREFIX.fare);
    registerId(env, fareSeen, id, path, "fare policy");
    const serviceId = reqId(env, rec, "serviceId", path, ID_PREFIX.service);
    const kindF = reqEnum(env, rec, "kind", path, FARE_KINDS);
    if (serviceId !== undefined && !services.has(serviceId) && !serviceSeen.has(serviceId)) {
      issues.error("dangling_ref", `${path}.serviceId`, `Service "${serviceId}" does not exist.`);
    }
    const ev = checkEvidence(env, rec, "evidence", path, { requireVerifiedInRelease: false, allowUnknown: true });
    if (kindF !== undefined && kindF !== "unknown" && ev && ev["reliability"] === "unknown") {
      issues.error("fare", `${path}.evidence`, "A fare with amounts must carry verified or estimated evidence; use kind \"unknown\" otherwise.");
    }

    let from: number | null = null;
    let to: number | null = null;
    for (const field of ["validFrom", "validTo"] as const) {
      const text = optString(env, rec, field, path);
      if (text === undefined) continue;
      const ms = parseIsoDateOrDateTime(text);
      if (ms === null) issues.error("fare", `${path}.${field}`, "Must be an ISO 8601 date or date-time with timezone.");
      else if (field === "validFrom") from = ms;
      else to = ms;
    }
    if (from !== null && to !== null && from > to) {
      issues.error("fare", `${path}.validTo`, "validTo is earlier than validFrom.");
    }
    if (serviceId !== undefined) {
      const list = policiesByService.get(serviceId) ?? [];
      list.push({ path, from, to });
      policiesByService.set(serviceId, list);
    }

    const valueFields = ["flatCentavos", "flatRange", "matrix", "distanceRule"] as const;
    const present = valueFields.filter((f) => has(rec, f));
    const required: Record<string, readonly string[]> = {
      flat: ["flatCentavos", "flatRange"], matrix: ["matrix"], distance: ["distanceRule"], unknown: [],
    };
    if (kindF !== undefined) {
      const allowed = required[kindF] ?? [];
      for (const f of present) {
        if (!allowed.includes(f)) issues.error("fare", `${path}.${f}`, `Field is not valid for a ${kindF} fare policy.`);
      }
      if (kindF === "unknown") {
        if (has(rec, "discountRules")) issues.error("fare", `${path}.discountRules`, "An unknown fare cannot carry discount rules.");
      }
    }

    if (kindF === "flat") {
      const hasFlat = has(rec, "flatCentavos");
      const hasRange = has(rec, "flatRange");
      if (hasFlat === hasRange) {
        issues.error("fare", path, "A flat fare needs exactly one of flatCentavos or flatRange.");
      }
      if (hasFlat) reqInt(env, rec, "flatCentavos", path, 0, MAX_CENTAVOS, "fare");
      if (hasRange) {
        const range = rec["flatRange"];
        if (!isObj(range)) issues.error("fare", `${path}.flatRange`, "Must be an object.");
        else {
          checkKeys(env, range, `${path}.flatRange`, ["minCentavos", "maxCentavos"]);
          const lo = reqInt(env, range, "minCentavos", `${path}.flatRange`, 0, MAX_CENTAVOS, "fare");
          const hi = reqInt(env, range, "maxCentavos", `${path}.flatRange`, 0, MAX_CENTAVOS, "fare");
          if (lo !== undefined && hi !== undefined && lo > hi) {
            issues.error("fare", `${path}.flatRange`, "minCentavos must not exceed maxCentavos.");
          }
        }
      }
    }

    if (kindF === "matrix") {
      const rows = reqArray(env, rec, "matrix", path);
      if (rows && rows.length === 0) issues.error("fare", `${path}.matrix`, "A matrix fare needs at least one stop pair.");
      const seenPairs = new Set<string>();
      rows?.forEach((row, i) => {
        const rp = `${path}.matrix[${i}]`;
        if (!isObj(row)) { issues.error("fare", rp, "Must be an object."); return; }
        checkKeys(env, row, rp, ["fromStopId", "toStopId", "centavos"]);
        const f = reqId(env, row, "fromStopId", rp, ID_PREFIX.stop);
        const t = reqId(env, row, "toStopId", rp, ID_PREFIX.stop);
        reqInt(env, row, "centavos", rp, 0, MAX_CENTAVOS, "fare");
        for (const [field, sid] of [["fromStopId", f], ["toStopId", t]] as const) {
          if (sid !== undefined && !stops.has(sid) && !stopSeen.has(sid)) {
            issues.error("dangling_ref", `${rp}.${field}`, `Stop "${sid}" does not exist.`);
          }
        }
        if (f !== undefined && t !== undefined) {
          const key = `${f}>${t}`;
          if (seenPairs.has(key)) issues.error("fare", rp, `Fare for ${f} to ${t} is listed twice.`);
          seenPairs.add(key);
          if (serviceId !== undefined && stops.has(f) && stops.has(t)) {
            const reachable = serviceDirections(serviceId).some((d) => {
              const fp = positionOf(d, f);
              const tp = positionOf(d, t);
              return fp.length > 0 && tp.length > 0 && Math.min(...fp) < Math.max(...tp);
            });
            if (!reachable) {
              issues.error("fare", rp, `${f} to ${t} is not an ordered pair on any direction of ${serviceId}.`);
            }
          }
        }
      });
    }

    if (kindF === "distance") {
      const rule = rec["distanceRule"];
      if (!isObj(rule)) {
        if (has(rec, "distanceRule")) issues.error("fare", `${path}.distanceRule`, "Must be an object.");
        else issues.error("fare", `${path}.distanceRule`, "A distance fare needs a distanceRule.");
      } else {
        const rp = `${path}.distanceRule`;
        checkKeys(env, rule, rp,
          ["baseCentavos", "includedMeters", "incrementMeters", "incrementCentavos", "verifiedSegmentMeters"]);
        reqInt(env, rule, "baseCentavos", rp, 0, MAX_CENTAVOS, "fare");
        reqInt(env, rule, "includedMeters", rp, 0, MAX_SEGMENT_METERS, "fare");
        reqInt(env, rule, "incrementMeters", rp, 1, MAX_SEGMENT_METERS, "fare");
        reqInt(env, rule, "incrementCentavos", rp, 0, MAX_CENTAVOS, "fare");
        const segs = reqArray(env, rule, "verifiedSegmentMeters", rp);
        if (segs && segs.length === 0) {
          issues.error("fare", `${rp}.verifiedSegmentMeters`, "Distance fares need documented service distances; aerial distance is never used.");
        }
        const seenSeg = new Set<string>();
        segs?.forEach((seg, i) => {
          const sp = `${rp}.verifiedSegmentMeters[${i}]`;
          if (!isObj(seg)) { issues.error("fare", sp, "Must be an object."); return; }
          checkKeys(env, seg, sp, ["directionId", "fromStopId", "toStopId", "meters"]);
          const d = reqId(env, seg, "directionId", sp, ID_PREFIX.direction);
          const f = reqId(env, seg, "fromStopId", sp, ID_PREFIX.stop);
          const t = reqId(env, seg, "toStopId", sp, ID_PREFIX.stop);
          reqInt(env, seg, "meters", sp, 1, MAX_SEGMENT_METERS, "fare");
          if (d !== undefined && !directions.has(d) && !directionSeen.has(d)) {
            issues.error("dangling_ref", `${sp}.directionId`, `Direction "${d}" does not exist.`);
          } else if (d !== undefined && serviceId !== undefined && directions.get(d)?.serviceId !== serviceId) {
            issues.error("fare", `${sp}.directionId`, `Direction "${d}" does not belong to ${serviceId}.`);
          }
          for (const [field, sid] of [["fromStopId", f], ["toStopId", t]] as const) {
            if (sid !== undefined && !stops.has(sid) && !stopSeen.has(sid)) {
              issues.error("dangling_ref", `${sp}.${field}`, `Stop "${sid}" does not exist.`);
            }
          }
          if (d !== undefined && f !== undefined && t !== undefined && directions.has(d)) {
            const fp = positionOf(d, f);
            const tp = positionOf(d, t);
            if (fp.length === 0 || tp.length === 0 || Math.min(...fp) >= Math.max(...tp)) {
              issues.error("fare", sp, `${f} to ${t} is not an ordered pair on ${d}.`);
            }
            const key = `${d}|${f}|${t}`;
            if (seenSeg.has(key)) issues.error("fare", sp, `Distance for ${f} to ${t} on ${d} is listed twice.`);
            seenSeg.add(key);
          }
        });
      }
    }

    if (has(rec, "discountRules")) {
      const rules = reqArray(env, rec, "discountRules", path);
      const seenPassenger = new Set<string>();
      rules?.forEach((rule, i) => {
        const rp = `${path}.discountRules[${i}]`;
        if (!isObj(rule)) { issues.error("fare", rp, "Must be an object."); return; }
        checkKeys(env, rule, rp, ["passenger", "numerator", "denominator", "rounding", "evidence"]);
        const passenger = reqEnum(env, rule, "passenger", rp, PASSENGERS);
        const denominator = reqInt(env, rule, "denominator", rp, 1, 1_000_000, "fare");
        const numerator = reqInt(env, rule, "numerator", rp, 0, 1_000_000, "fare");
        reqEnum(env, rule, "rounding", rp, ROUNDING);
        // The contract fixes the ratio's shape but not whether it is the discount or the
        // price multiplier. Either way it cannot exceed 1, so that is all this layer checks;
        // ROUTE-004 pins the meaning and must never invert it.
        if (numerator !== undefined && denominator !== undefined && numerator > denominator) {
          issues.error("fare", `${rp}.numerator`, "Discount ratio cannot exceed 1.");
        }
        const dev = checkEvidence(env, rule, "evidence", rp, { requireVerifiedInRelease: false, allowUnknown: false });
        void dev;
        if (passenger !== undefined) {
          if (seenPassenger.has(passenger)) issues.error("fare", rp, `Discount for ${passenger} is listed twice.`);
          seenPassenger.add(passenger);
        }
      });
    }
  });

  for (const [serviceId, list] of policiesByService) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b) continue;
        const overlap = (a.from ?? -Infinity) <= (b.to ?? Infinity) && (b.from ?? -Infinity) <= (a.to ?? Infinity);
        if (overlap) {
          issues.warn("fare", b.path, `Fare policies ${a.path} and ${b.path} for ${serviceId} overlap in time; fare calculation will treat them as conflicting and report the fare unknown.`);
        }
      }
    }
  }

  /* ---- cross-collection observations ---- */
  const usedStops = new Set<string>();
  for (const list of routeStopsByDirection.values()) for (const rs of list) usedStops.add(rs.stopId);
  for (const stopId of stops.keys()) {
    if (!usedStops.has(stopId)) issues.warn("unused", `stops[id=${stopId}]`, "Stop is not used by any direction.");
  }
  const directionsPerService = new Set<string>();
  for (const d of directions.values()) directionsPerService.add(d.serviceId);
  for (const serviceId of services.keys()) {
    if (!directionsPerService.has(serviceId)) {
      issues.warn("unused", `services[id=${serviceId}]`, "Service has no directions and cannot be ridden.");
    }
  }

  /* ---- source usage (counted from the cloned data so nothing is missed) ---- */
  const countSources = (value: unknown): void => {
    if (isObj(value)) {
      const ids = value["sourceIds"];
      if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") sourceUse.set(id, (sourceUse.get(id) ?? 0) + 1);
      for (const [key, v] of Object.entries(value)) if (key !== "sources") countSources(v);
    } else if (Array.isArray(value)) value.forEach(countSources);
  };
  countSources(root);
  for (const id of env.sourceIds) {
    if (!sourceUse.has(id)) issues.warn("unused", `sources[id=${id}]`, "Source is not cited by any record.");
  }

  /* ---- release gate ---- */
  if (release) {
    if (coverageLabels.length === 0) {
      issues.error("release_gate", "$.coverageLabels", "A release pack must state the coverage it actually supports.");
    }
    for (const [label, ids] of [
      ["packId", packId ? [packId] : []],
      ["places", [...places.keys()]], ["stops", [...stops.keys()]],
      ["services", [...services.keys()]], ["directions", [...directions.keys()]],
      ["sources", [...env.sourceIds]],
    ] as const) {
      for (const id of ids) {
        if (isFixtureId(id)) {
          issues.error("release_gate", `$.${label}`, `Fixture-namespace ID "${id}" cannot appear in a release pack.`);
        }
      }
    }
    scanStrings(root, "$", (text, p) => {
      if (FIXTURE_TEXT_RE.test(text)) {
        issues.error("release_gate", p, "Synthetic/test wording found in a release pack.");
      } else if (/^(walk|fare)_/.test(text) && isFixtureId(text)) {
        issues.error("release_gate", p, `Fixture-namespace ID "${text}" cannot appear in a release pack.`);
      }
    });
  } else if (kind === "test_fixture") {
    const stray = [...places.keys(), ...stops.keys(), ...services.keys(), ...directions.keys()].filter((id) => !isFixtureId(id));
    if (stray.length > 0) {
      issues.warn("release_gate", "$.kind", `Fixture pack uses non-fixture IDs (e.g. "${stray[0]}"); keep synthetic data in the test_ namespace so it cannot be mistaken for real data.`);
    }
  }

  const summary: PackSummary | null =
    packId !== undefined && version !== undefined && kind !== undefined
      ? {
          packId, version, kind,
          places: placeSeen.size, stops: stopSeen.size, services: serviceSeen.size,
          directions: directionSeen.size,
          routeStops: [...routeStopsByDirection.values()].reduce((n, l) => n + l.length, 0),
          walkLinks: walkSeen.size, fares: fareSeen.size, sources: sourceSeen.size,
        }
      : null;

  return finish(issues, options.target, summary, root);
}

function finish(issues: Issues, target: PackTarget, summary: PackSummary | null, root: Obj | null): PackReport {
  const errorCount = issues.list.filter((i) => i.severity === "error").length;
  const warningCount = issues.list.length - errorCount;
  const ok = errorCount === 0 && root !== null;
  return {
    target,
    ok,
    errorCount,
    warningCount,
    issues: issues.list,
    summary,
    pack: ok ? (deepFreeze(root) as unknown as TransitPack) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Contract-shaped entry points                                        */
/* ------------------------------------------------------------------ */

function invalid(report: PackReport): AppError {
  const first = report.issues.find((i) => i.severity === "error");
  return {
    code: "DATA_INVALID",
    message: "Transit data could not be validated.",
    retryable: false,
    ...(first ? { detail: { field: first.path } } : {}),
  };
}

/** Validates an in-memory value. On success returns a deep-frozen copy. */
export function validatePack(input: unknown, options: ValidateOptions): Result<TransitPack> {
  const report = analyzePack(input, options);
  return report.ok && report.pack ? { ok: true, value: report.pack } : { ok: false, error: invalid(report) };
}

/** Parses and validates pack JSON text (e.g. a bundled asset) without throwing. */
export function parsePackJson(text: string, options: ValidateOptions): PackReport {
  let value: unknown;
  try {
    value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    const issues = new Issues();
    issues.error("schema", "$", "Pack file is not valid JSON.");
    return finish(issues, options.target, null, null);
  }
  return analyzePack(value, options);
}
