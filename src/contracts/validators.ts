import type {
  Evidence, ExtractInput, Extraction, FareQuote, JourneyPreferences,
  Place, Point, RawIntent, Result, RouteRequest, RouteResult, TransitPack,
} from "./index";
import { MODES } from "./defaults";
import { fail, ok } from "./result";
import { validatePack } from "../data/validatePack";

type Obj = Record<string, unknown>;
class Invalid extends Error {}
function bad(label: string): never { throw new Invalid(label); }

function object(value: unknown, label: string, allowed?: readonly string[]): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) bad(label);
  const result = value as Obj;
  if (allowed && Object.keys(result).some(key => !allowed.includes(key))) bad(label + ": unknown field");
  return result;
}
function str(value: unknown, label: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) bad(label);
  return value;
}
function strings(value: unknown, label: string, max = 1000): string[] {
  if (!Array.isArray(value) || value.length > max) bad(label);
  value.forEach(v => str(v, label));
  return value as string[];
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > 10000) bad(label);
  return value;
}
function num(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) bad(label);
  return value;
}
function integer(value: unknown, label: string, min = 0): number {
  const n = num(value, label);
  if (!Number.isSafeInteger(n) || n < min) bad(label);
  return n;
}
function bool(value: unknown, label: string): void {
  if (typeof value !== "boolean") bad(label);
}
function choice(value: unknown, allowed: readonly string[], label: string): void {
  if (typeof value !== "string" || !allowed.includes(value)) bad(label);
}
function id(value: unknown, label = "id"): string {
  const s = str(value, label, 128);
  if (!/^[a-z][a-z0-9_]*$/.test(s)) bad(label);
  return s;
}
function date(value: unknown, label: string, allowDay = false): void {
  const s = str(value, label, 50);
  const full = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!(full.test(s) || (allowDay && day.test(s))) || !Number.isFinite(Date.parse(s))) bad(label);
  const calendar = s.slice(0, 10);
  if (new Date(calendar + "T00:00:00Z").toISOString().slice(0, 10) !== calendar) bad(label);
}
function point(value: unknown): Point {
  const p = object(value, "point", ["latitude", "longitude"]);
  const lat = num(p.latitude, "latitude"), lon = num(p.longitude, "longitude");
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) bad("point bounds");
  return p as unknown as Point;
}
function evidence(value: unknown, sources?: Set<string>): Evidence {
  const e = object(value, "evidence", ["sourceIds", "checkedAt", "reliability", "note"]);
  const refs = strings(e.sourceIds, "sourceIds");
  date(e.checkedAt, "checkedAt");
  choice(e.reliability, ["verified", "estimated", "unknown"], "reliability");
  if (e.reliability !== "unknown" && refs.length === 0) bad("evidence without sources");
  if (e.note !== undefined) str(e.note, "evidence note");
  if (sources && refs.some(ref => !sources.has(ref))) bad("dangling source");
  return e as unknown as Evidence;
}
function place(value: unknown, sources?: Set<string>): Place {
  const p = object(value, "place", ["id", "name", "aliases", "kind", "locality", "point", "evidence"]);
  id(p.id); str(p.name, "place name"); strings(p.aliases, "aliases");
  choice(p.kind, ["landmark", "terminal", "station", "address", "boarding_point"], "place kind");
  str(p.locality, "locality"); point(p.point); evidence(p.evidence, sources);
  return p as unknown as Place;
}
function modes(value: unknown, label: string, allowEmpty = true): void {
  const list = array(value, label);
  if (!allowEmpty && !list.length) bad(label);
  list.forEach(v => choice(v, MODES, label));
  if (new Set(list).size !== list.length) bad(label + ": duplicates");
}
function preferences(value: unknown): JourneyPreferences {
  const p = object(value, "preferences", ["allowedModes", "priority", "maxAccessWalkMeters",
    "maxTransferWalkMeters", "maxEgressWalkMeters", "directOnly", "budgetCentavos", "passenger"]);
  modes(p.allowedModes, "allowedModes", false);
  choice(p.priority, ["nearest_useful", "fewest_transfers", "lowest_known_fare"], "priority");
  for (const key of ["maxAccessWalkMeters", "maxTransferWalkMeters", "maxEgressWalkMeters"]) integer(p[key], key);
  bool(p.directOnly, "directOnly");
  if (p.budgetCentavos !== null) integer(p.budgetCentavos, "budgetCentavos");
  choice(p.passenger, ["regular", "student", "senior", "pwd"], "passenger");
  return p as unknown as JourneyPreferences;
}
function parse<T>(run: () => T, code: "AI_INVALID_OUTPUT" | "INVALID_INPUT" | "DATA_INVALID"): Result<T> {
  try { return ok(run()); }
  catch (cause) {
    return fail(code, code === "AI_INVALID_OUTPUT"
      ? "AI returned incomplete or invalid journey fields."
      : code === "DATA_INVALID" ? "Transit data could not be validated."
      : "Check the journey fields.", false, {
        field: cause instanceof Invalid ? cause.message : "invalid value",
      });
  }
}
export function validateExtractInput(value: unknown): Result<ExtractInput> {
  return parse(() => {
    const v = object(value, "input", ["queryId", "text", "locale", "knownPlaceLabels"]);
    str(v.queryId, "queryId", 128); str(v.text, "text", 600);
    choice(v.locale, ["en", "fil", "taglish"], "locale");
    strings(v.knownPlaceLabels, "knownPlaceLabels", 30);
    return v as unknown as ExtractInput;
  }, "INVALID_INPUT");
}
export function validateRawIntent(value: unknown): Result<RawIntent> {
  return parse(() => {
    const keys = ["kind", "originText", "destinationText", "useCurrentLocation", "allowedModes",
      "excludedModes", "priority", "maxAccessWalkMeters", "maxTransferWalkMeters",
      "maxEgressWalkMeters", "budgetCentavos", "directOnly", "ambiguities"];
    const v = object(value, "intent", keys);
    if (Object.keys(v).length !== keys.length) bad("missing intent field");
    choice(v.kind, ["journey", "onboard", "unrelated"], "kind");
    for (const key of ["originText", "destinationText"]) if (v[key] !== null) str(v[key], key, 600);
    bool(v.useCurrentLocation, "useCurrentLocation");
    if (v.allowedModes !== null) modes(v.allowedModes, "allowedModes");
    modes(v.excludedModes, "excludedModes");
    if (v.priority !== null) choice(v.priority, ["nearest_useful", "fewest_transfers", "lowest_known_fare"], "priority");
    for (const key of ["maxAccessWalkMeters", "maxTransferWalkMeters", "maxEgressWalkMeters", "budgetCentavos"]) {
      if (v[key] !== null) integer(v[key], key);
    }
    bool(v.directOnly, "directOnly"); strings(v.ambiguities, "ambiguities", 20);
    return v as unknown as RawIntent;
  }, "AI_INVALID_OUTPUT");
}
export function validateExtraction(value: unknown): Result<Extraction> {
  return parse(() => {
    const v = object(value, "extraction", ["intent", "engine", "elapsedMs"]);
    const intent = validateRawIntent(v.intent);
    if (!intent.ok) bad(intent.error.detail?.field ?? "intent");
    const engine = object(v.engine, "engine", ["kind", "modelId", "modelRevision", "runtime"]);
    choice(engine.kind, ["phone_local", "laptop_local"], "engine kind");
    for (const key of ["modelId", "modelRevision", "runtime"]) str(engine[key], key);
    if (num(v.elapsedMs, "elapsedMs") < 0) bad("elapsedMs");
    return v as unknown as Extraction;
  }, "AI_INVALID_OUTPUT");
}
export function validatePlace(value: unknown): Result<Place> {
  return parse(() => place(value), "DATA_INVALID");
}
export function validatePreferences(value: unknown): Result<JourneyPreferences> {
  return parse(() => preferences(value), "INVALID_INPUT");
}
export function hasFixtureId(value: string): boolean {
  return /(^|_)test(_|$)|(^|_)fixture(_|$)/.test(value);
}
export function validateTransitPack(value: unknown, options: { allowTestFixtures?: boolean } = {}): Result<TransitPack> {
  // Member 2 owns the graph/source validator. Storage and controller use the same
  // gate, including release provenance checks, instead of maintaining a second schema.
  return validatePack(value, { target: options.allowTestFixtures ? "development" : "release" });
}
export function validateRouteRequest(value: unknown, pack?: TransitPack): Result<RouteRequest> {
  return parse(() => {
    const r = object(value, "request", ["queryId", "origin", "destination", "preferences", "onboard"]);
    str(r.queryId, "queryId", 128); preferences(r.preferences);
    for (const key of ["origin", "destination"]) {
      const e = object(r[key], key, ["placeId", "label", "point", "provenance"]);
      id(e.placeId); str(e.label, key + " label"); point(e.point);
      choice(e.provenance, ["stored", "gps", "online"], "provenance");
      if (pack) {
        const known = pack.places.find(p => p.id === e.placeId);
        if (!known) bad(key + " outside coverage");
        const coord = e.point as Point;
        if (coord.latitude !== known.point.latitude || coord.longitude !== known.point.longitude) bad(key + " coordinate mismatch");
      }
    }
    if (r.onboard !== undefined) {
      const on = object(r.onboard, "onboard", ["directionId", "confirmedNextStopId", "confirmedAt"]);
      id(on.directionId); id(on.confirmedNextStopId); date(on.confirmedAt, "confirmedAt");
      if (pack) {
        const dir = pack.directions.find(d => d.id === on.directionId);
        const rs = pack.routeStops.find(s => s.directionId === on.directionId && s.stopId === on.confirmedNextStopId);
        const stop = pack.stops.find(s => s.id === on.confirmedNextStopId);
        if (pack.routeStops.filter(s => s.directionId === on.directionId && s.stopId === on.confirmedNextStopId).length !== 1) bad("ambiguous onboard next stop");
        if (!dir || dir.availability === "suspended" || !rs?.alight || !stop?.alight) bad("onboard next stop");
        if (stop.placeId !== (r.origin as Obj).placeId) bad("onboard origin must be confirmed next stop");
      }
    }
    return r as unknown as RouteRequest;
  }, "INVALID_INPUT");
}

function fareQuote(value: unknown, sources: Set<string>): FareQuote {
  const f = object(value, "fare quote", ["status", "minCentavos", "maxCentavos", "sourceIds", "basis"]);
  choice(f.status, ["verified", "estimated", "unknown"], "fare status"); str(f.basis, "fare basis");
  const refs = strings(f.sourceIds, "fare sources"); if (refs.some(ref => !sources.has(ref))) bad("fare source");
  if (f.status === "unknown") {
    if (f.minCentavos !== null || f.maxCentavos !== null) bad("unknown fare amount");
  } else {
    if (!refs.length || integer(f.minCentavos, "fare min") > integer(f.maxCentavos, "fare max")) bad("fare range/source");
  }
  return f as unknown as FareQuote;
}
export function validateRouteResult(value: unknown, request: RouteRequest, pack: TransitPack): Result<RouteResult> {
  return parse(() => {
    const r = object(value, "route result", ["queryId", "options", "coverageWarnings"]);
    if (r.queryId !== request.queryId) bad("result queryId");
    strings(r.coverageWarnings, "coverage warnings");
    const options = array(r.options, "options");
    if (!options.length || options.length > 3) bad("journey options");
    const sources = new Set(pack.sources.map(s => s.id)), ids = new Set<string>();
    for (const v of options) {
      const option = object(v, "option", ["id", "legs", "transfers", "walkMeters", "fare", "rankReason", "warnings", "datasetVersion"]);
      const optionId = id(option.id);
      if (ids.has(optionId)) bad("duplicate option"); ids.add(optionId);
      if (option.datasetVersion !== pack.version) bad("datasetVersion");
      str(option.rankReason, "rankReason"); strings(option.warnings, "warnings");
      const legs = array(option.legs, "legs");
      let location = request.origin.placeId, walk = 0, pendingWalk = 0, rides = 0, transfers = 0;
      let knownMin = 0, knownMax = 0, unknown = 0, lastDirection: string | null = null;
      for (const raw of legs) {
        const leg = object(raw, "leg");
        if (leg.kind === "walk") {
          object(leg, "walk leg", ["kind", "linkId", "fromPlaceId", "toPlaceId", "meters", "instructions", "evidence"]);
          const link = pack.walkLinks.find(w => w.id === leg.linkId);
          if (!link || link.evidence.reliability !== "verified" || location !== link.fromPlaceId
              || leg.fromPlaceId !== link.fromPlaceId || leg.toPlaceId !== link.toPlaceId
              || leg.meters !== link.meters) bad("unverified walk leg");
          evidence(leg.evidence, sources);
          if (JSON.stringify(leg.instructions) !== JSON.stringify(link.steps)) bad("walk instructions");
          walk += link.meters; pendingWalk += link.meters; location = link.toPlaceId;
        } else if (leg.kind === "ride") {
          object(leg, "ride leg", ["kind", "serviceId", "directionId", "mode", "serviceName", "headsign",
            "boardStopId", "alightStopId", "boardLabel", "alightLabel", "alreadyOnboard", "fare", "evidence"]);
          const direction = pack.directions.find(d => d.id === leg.directionId && d.serviceId === leg.serviceId);
          const service = pack.services.find(s => s.id === leg.serviceId);
          const board = pack.stops.find(s => s.id === leg.boardStopId), alight = pack.stops.find(s => s.id === leg.alightStopId);
          const ordered = pack.routeStops.filter(s => s.directionId === leg.directionId).sort((a, b) => a.sequence - b.sequence);
          // A loop can repeat a stop. The contract has stop IDs, so accept only
          // a legal forward occurrence pair; onboard ambiguity is rejected below.
          const from = ordered.find(s => s.stopId === leg.boardStopId && (leg.alreadyOnboard || s.board));
          const to = ordered.find(s => s.stopId === leg.alightStopId && s.alight && from && s.sequence > from.sequence);
          bool(leg.alreadyOnboard, "alreadyOnboard");
          const on = rides === 0 && request.onboard;
          if (leg.alreadyOnboard && (!on || on.directionId !== leg.directionId || on.confirmedNextStopId !== leg.boardStopId)) bad("onboard ride");
          if (!direction || direction.availability !== "documented" || direction.evidence.reliability !== "verified"
              || !service || service.evidence.reliability !== "verified" || !board || !alight || !from || !to
              || board.placeId !== location || from.sequence >= to.sequence
              || (!leg.alreadyOnboard && (!from.board || !board.board))
              || !to.alight || !alight.alight || from.evidence.reliability !== "verified"
              || to.evidence.reliability !== "verified") bad("illegal or unverified ride");
          if (leg.mode !== service.mode || leg.serviceName !== service.name || leg.headsign !== direction.headsign
              || (leg.boardLabel !== board.label
                && !(leg.alreadyOnboard && leg.boardLabel === "Currently onboard; next stop: " + board.label))
              || leg.alightLabel !== alight.label) bad("ride metadata");
          if (!leg.alreadyOnboard && !request.preferences.allowedModes.includes(service.mode)) bad("excluded mode");
          evidence(leg.evidence, sources);
          const walkLimit = rides === 0 ? request.preferences.maxAccessWalkMeters : request.preferences.maxTransferWalkMeters;
          if (pendingWalk > walkLimit) bad("walk constraint");
          pendingWalk = 0;
          if (rides > 0 && lastDirection === direction.id) bad("split same-service boarding");
          if (request.onboard) {
            if (rides > 0 || !leg.alreadyOnboard) transfers++;
          } else if (rides > 0) transfers++;
          lastDirection = direction.id; rides++; location = alight.placeId;
          const quote = fareQuote(leg.fare, sources);
          if (quote.status === "unknown") unknown++;
          else { knownMin += quote.minCentavos!; knownMax += quote.maxCentavos!; }
        } else bad("leg kind");
      }
      if (location !== request.destination.placeId) bad("incomplete journey");
      const finalLimit = rides > 0 ? request.preferences.maxEgressWalkMeters
        : Math.min(request.preferences.maxAccessWalkMeters, request.preferences.maxEgressWalkMeters);
      if (pendingWalk > finalLimit || option.walkMeters !== walk || option.transfers !== transfers) bad("journey counts/walk limit");
      if (request.preferences.directOnly && transfers > 0) bad("directOnly constraint");
      const total = object(option.fare, "total", ["status", "knownMinCentavos", "knownMaxCentavos", "unknownRideLegs", "sourceIds"]);
      const status = unknown === 0 ? "complete" : unknown === rides ? "unknown" : "partial";
      if (total.status !== status || total.knownMinCentavos !== knownMin
          || total.knownMaxCentavos !== knownMax || total.unknownRideLegs !== unknown) bad("fare subtotal/status");
      if (strings(total.sourceIds, "total sourceIds").some(ref => !sources.has(ref))) bad("total fare source");
      if (request.preferences.budgetCentavos !== null && (unknown > 0 || knownMax > request.preferences.budgetCentavos)) bad("budget constraint");
    }
    return r as unknown as RouteResult;
  }, "DATA_INVALID");
}
