import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canonicalJson } from "../../src/data/canonicalJson";
import { aerialMeters } from "../../src/data/geo";
import { parseIsoDateOrDateTime, parseIsoDateTime } from "../../src/data/isoTime";
import { normalizeAlias, placeSearchKeys } from "../../src/data/normalize";
import {
  analyzePack, parsePackJson, validatePack,
  type PackIssueCode, type PackReport, type PackTarget,
} from "../../src/data/validatePack";

type Json = Record<string, any>;

const FIXTURE_URL = new URL("../fixtures/transit-pack.json", import.meta.url);
const fixtureText = readFileSync(FIXTURE_URL, "utf8");
const fresh = (): Json => JSON.parse(fixtureText) as Json;

const dev = (pack: unknown): PackReport => analyzePack(pack, { target: "development" });
const rel = (pack: unknown): PackReport => analyzePack(pack, { target: "release" });

function errorsOf(report: PackReport) {
  return report.issues.filter((i) => i.severity === "error");
}

function expectError(report: PackReport, code: PackIssueCode, pathPart: string): void {
  const hit = errorsOf(report).find((i) => i.code === code && i.path.includes(pathPart));
  assert.ok(
    hit,
    `expected a ${code} error at ${pathPart}; got:\n${report.issues.map((i) => `  ${i.severity} ${i.code} ${i.path}: ${i.message}`).join("\n") || "  (no issues)"}`,
  );
  assert.equal(report.ok, false);
  assert.equal(report.pack, null, "a failed report must not expose a pack");
}

/**
 * Test-only: reshapes the synthetic fixture so it is structurally a release pack
 * (no test_ IDs, no TEST ONLY wording, Philippine coordinates). It exists solely to
 * exercise the release gate's accept path in memory. It is never written to
 * assets/data and does not represent any real service.
 */
function releaseShaped(): Json {
  const p = fresh();
  const text = JSON.stringify(p)
    .replace(/_test_/g, "_x_")
    .replace(/pack_test_fixture/g, "pack_x_release")
    .replace(/TEST ONLY /g, "")
    .replace(/Synthetic unit-test evidence only; prohibited in release\./g, "Reviewed against the cited source.")
    .replace(/Synthetic unit-test data\. Not transport evidence\. Release-prohibited\./g, "Operator publication, cited for these facts only.")
    .replace(/Graph shape for automated tests only/g, "Route order for the cited service")
    .replace(/test_fixture_1/g, "release_x_1");
  const r = JSON.parse(text) as Json;
  r.kind = "release";
  r.coverageLabels = ["Example coverage label"];
  for (const place of r.places) {
    place.point = { latitude: 14 + place.point.latitude, longitude: 121 + place.point.longitude };
    place.name = place.name.replace(/test/gi, "Sample");
  }
  for (const s of r.stops) s.point = { latitude: 14 + s.point.latitude, longitude: 121 + s.point.longitude };
  for (const s of r.sources) s.url = "https://example.org/operator-notice";
  // Names and signboards must not carry "test" markers either.
  for (const s of r.services) s.signboardAliases = s.signboardAliases.map((a: string) => a.replace(/TEST/g, "SAMPLE"));
  for (const a of r.places) a.aliases = a.aliases.map((x: string) => x.replace(/test/gi, "sample"));
  return r;
}

describe("synthetic fixture pack", () => {
  it("is valid for development with no errors or warnings", () => {
    const report = dev(fresh());
    assert.deepEqual(report.issues, []);
    assert.equal(report.ok, true);
    assert.equal(report.summary?.kind, "test_fixture");
    assert.equal(report.summary?.places, 13);
    assert.equal(report.summary?.directions, 7);
  });

  it("covers all five modes and every fare kind so later routing tests have realistic data", () => {
    const pack = fresh();
    assert.deepEqual([...new Set(pack.services.map((s: Json) => s.mode))].sort(), ["bus", "jeepney", "lrt", "tricycle", "van"]);
    assert.deepEqual([...new Set(pack.fares.map((f: Json) => f.kind))].sort(), ["distance", "flat", "matrix", "unknown"]);
    assert.ok(pack.fares.some((f: Json) => f.flatRange), "needs a positive fare range");
    assert.ok(pack.directions.some((d: Json) => d.availability === "suspended"), "needs a suspended direction");
  });

  it("rejects loading as a release pack", () => {
    expectError(rel(fresh()), "release_gate", "$.kind");
  });

  it("cannot pass the release gate by flipping kind to release", () => {
    const pack = fresh();
    pack.kind = "release";
    const report = rel(pack);
    expectError(report, "release_gate", "$.places");
    expectError(report, "release_gate", "$.packId");
    expectError(report, "release_gate", "$.sources");
    assert.ok(errorsOf(report).some((i) => /Synthetic\/test wording/.test(i.message)));
    assert.ok(errorsOf(report).some((i) => i.code === "coordinates"), "0,0 coordinates are outside the Philippines");
  });

  it("is also caught by the gate when merely labelled release in a development load", () => {
    const pack = fresh();
    pack.kind = "release";
    expectError(dev(pack), "release_gate", "$.places");
  });

  it("warns when a fixture pack stops using the test_ namespace", () => {
    const pack = releaseShaped();
    pack.kind = "test_fixture";
    const report = dev(pack);
    assert.equal(report.ok, true);
    assert.ok(report.issues.some((i) => i.code === "release_gate" && i.severity === "warning"));
  });
});

describe("release gate accept path", () => {
  it("accepts a structurally complete, non-fixture release pack (in-memory shape test only)", () => {
    const report = rel(releaseShaped());
    assert.deepEqual(errorsOf(report), []);
    assert.equal(report.ok, true);
    assert.equal(report.summary?.kind, "release");
  });

  it("requires a coverage statement", () => {
    const pack = releaseShaped();
    pack.coverageLabels = [];
    expectError(rel(pack), "release_gate", "$.coverageLabels");
  });

  it("requires routing facts to be verified, not estimated", () => {
    const pack = releaseShaped();
    pack.routeStops[0].evidence.reliability = "estimated";
    expectError(rel(pack), "release_gate", "routeStops[0].evidence.reliability");

    const walkPack = releaseShaped();
    walkPack.walkLinks[0].evidence.reliability = "estimated";
    expectError(rel(walkPack), "release_gate", "walkLinks[0].evidence.reliability");
  });

  it("allows estimated fares in release but never unsourced amounts", () => {
    const ok = releaseShaped();
    assert.equal(rel(ok).ok, true, "the shaped pack already contains an estimated fare");
    const bad = releaseShaped();
    const flat = bad.fares.find((f: Json) => f.flatCentavos !== undefined);
    flat.evidence = { sourceIds: [], checkedAt: flat.evidence.checkedAt, reliability: "unknown" };
    expectError(rel(bad), "fare", ".evidence");
  });

  it("rejects swapped latitude/longitude", () => {
    const pack = releaseShaped();
    const p = pack.places[0].point;
    [p.latitude, p.longitude] = [p.longitude, p.latitude];
    expectError(rel(pack), "coordinates", "places[0].point");
  });

  it("rejects leftover synthetic wording anywhere", () => {
    const pack = releaseShaped();
    pack.walkLinks[0].steps[0] = "TEST ONLY step";
    expectError(rel(pack), "release_gate", "walkLinks[0].steps[0]");
  });

  it("rejects fixture-namespace IDs inside text references", () => {
    const pack = releaseShaped();
    pack.fares[0].serviceId = "service_test_001";
    const report = rel(pack);
    assert.equal(report.ok, false);
  });
});

describe("corrupt packs are rejected", () => {
  const cases: { name: string; mutate: (p: Json) => void; code: PackIssueCode; at: string }[] = [
    { name: "duplicate place ID", mutate: (p) => { p.places[1].id = p.places[0].id; }, code: "duplicate_id", at: "places[1].id" },
    { name: "duplicate stop ID", mutate: (p) => { p.stops[1].id = p.stops[0].id; }, code: "duplicate_id", at: "stops[1].id" },
    { name: "duplicate service ID", mutate: (p) => { p.services[1].id = p.services[0].id; }, code: "duplicate_id", at: "services[1].id" },
    { name: "duplicate direction ID", mutate: (p) => { p.directions[1].id = p.directions[0].id; }, code: "duplicate_id", at: "directions[1].id" },
    { name: "duplicate walk ID", mutate: (p) => { p.walkLinks[1].id = p.walkLinks[0].id; }, code: "duplicate_id", at: "walkLinks[1].id" },
    { name: "duplicate fare ID", mutate: (p) => { p.fares[1].id = p.fares[0].id; }, code: "duplicate_id", at: "fares[1].id" },
    { name: "duplicate source ID", mutate: (p) => { p.sources.push({ ...p.sources[0] }); }, code: "duplicate_id", at: "sources[1].id" },
    { name: "same stop listed twice at a place", mutate: (p) => { p.stops[1].placeId = p.stops[0].placeId; p.stops[1].label = p.stops[0].label; }, code: "duplicate_id", at: "stops[1].label" },
    { name: "same place name and locality twice", mutate: (p) => { p.places[1].name = p.places[0].name; }, code: "duplicate_id", at: "places[1].name" },
    { name: "stop references missing place", mutate: (p) => { p.stops[0].placeId = "place_missing"; }, code: "dangling_ref", at: "stops[0].placeId" },
    { name: "direction references missing service", mutate: (p) => { p.directions[0].serviceId = "service_missing"; }, code: "dangling_ref", at: "directions[0].serviceId" },
    { name: "route stop references missing direction", mutate: (p) => { p.routeStops[0].directionId = "dir_missing"; }, code: "dangling_ref", at: "routeStops[0].directionId" },
    { name: "route stop references missing stop", mutate: (p) => { p.routeStops[0].stopId = "stop_missing"; }, code: "dangling_ref", at: "routeStops[0].stopId" },
    { name: "walk references missing place", mutate: (p) => { p.walkLinks[0].toPlaceId = "place_missing"; }, code: "dangling_ref", at: "walkLinks[0].toPlaceId" },
    { name: "fare references missing service", mutate: (p) => { p.fares[0].serviceId = "service_missing"; }, code: "dangling_ref", at: "fares[0].serviceId" },
    { name: "evidence cites missing source", mutate: (p) => { p.places[0].evidence.sourceIds = ["source_missing"]; }, code: "dangling_ref", at: "places[0].evidence.sourceIds[0]" },
    { name: "matrix fare references missing stop", mutate: (p) => { p.fares[3].matrix[0].toStopId = "stop_missing"; }, code: "dangling_ref", at: "fares[3].matrix[0].toStopId" },
    { name: "duplicate sequence in a direction", mutate: (p) => { p.routeStops[1].sequence = 1; }, code: "sequence", at: "sequence" },
    { name: "same stop twice in a row", mutate: (p) => { p.routeStops[1].stopId = p.routeStops[0].stopId; }, code: "sequence", at: "stopId" },
    { name: "negative sequence", mutate: (p) => { p.routeStops[0].sequence = -1; }, code: "sequence", at: "routeStops[0].sequence" },
    { name: "fractional sequence", mutate: (p) => { p.routeStops[0].sequence = 1.5; }, code: "sequence", at: "routeStops[0].sequence" },
    { name: "direction with a single stop", mutate: (p) => { p.routeStops = p.routeStops.filter((r: Json) => !(r.directionId === "dir_test_004" && r.sequence === 2)); }, code: "sequence", at: "dir_test_004" },
    { name: "direction with no route stops", mutate: (p) => { p.routeStops = p.routeStops.filter((r: Json) => r.directionId !== "dir_test_004"); }, code: "sequence", at: "dir_test_004" },
    { name: "route stop allows boarding the stop forbids", mutate: (p) => { p.routeStops.find((r: Json) => r.stopId === "stop_test_dest_drop").board = true; }, code: "flags", at: ".board" },
    { name: "route stop allows alighting the stop forbids", mutate: (p) => { p.routeStops.find((r: Json) => r.stopId === "stop_test_trike_stand").alight = true; }, code: "flags", at: ".alight" },
    { name: "stop allows neither boarding nor alighting", mutate: (p) => { p.stops[0].board = false; p.stops[0].alight = false; }, code: "flags", at: "stops[0]" },
    { name: "direction with no boardable-then-alightable pair", mutate: (p) => { for (const r of p.routeStops) if (r.directionId === "dir_test_004") r.board = false; }, code: "flags", at: "dir_test_004" },
    { name: "latitude out of range", mutate: (p) => { p.places[0].point.latitude = 91; }, code: "coordinates", at: "places[0].point.latitude" },
    { name: "longitude out of range", mutate: (p) => { p.stops[0].point.longitude = -181; }, code: "coordinates", at: "stops[0].point.longitude" },
    { name: "non-numeric latitude", mutate: (p) => { p.places[0].point.latitude = "14.1"; }, code: "coordinates", at: "places[0].point.latitude" },
    { name: "null longitude (e.g. NaN round-tripped)", mutate: (p) => { p.places[0].point.longitude = null; }, code: "coordinates", at: "places[0].point.longitude" },
    { name: "walk shorter than the straight line", mutate: (p) => { p.walkLinks[5].meters = 300; }, code: "walk", at: "walkLinks[5].meters" },
    { name: "negative walk meters", mutate: (p) => { p.walkLinks[0].meters = -5; }, code: "walk", at: "walkLinks[0].meters" },
    { name: "fractional walk meters", mutate: (p) => { p.walkLinks[0].meters = 100.5; }, code: "walk", at: "walkLinks[0].meters" },
    { name: "walk of absurd length (km typed as m)", mutate: (p) => { p.walkLinks[5].meters = 1_200_000; }, code: "walk", at: "walkLinks[5].meters" },
    { name: "walk to itself", mutate: (p) => { p.walkLinks[0].toPlaceId = p.walkLinks[0].fromPlaceId; }, code: "walk", at: "walkLinks[0]" },
    { name: "same directed walk documented twice", mutate: (p) => { const w = { ...p.walkLinks[0], id: "walk_test_dup" }; p.walkLinks.push(w); }, code: "walk", at: "walkLinks[6]" },
    { name: "walk with no steps", mutate: (p) => { p.walkLinks[0].steps = []; }, code: "schema", at: "walkLinks[0].steps" },
    { name: "verified evidence without a source", mutate: (p) => { p.routeStops[0].evidence.sourceIds = []; }, code: "evidence", at: "routeStops[0].evidence.sourceIds" },
    { name: "unknown evidence backing a ride fact", mutate: (p) => { p.services[0].evidence = { sourceIds: [], checkedAt: p.services[0].evidence.checkedAt, reliability: "unknown" }; }, code: "evidence", at: "services[0].evidence.reliability" },
    { name: "missing evidence record", mutate: (p) => { delete p.stops[0].evidence; }, code: "evidence", at: "stops[0].evidence" },
    { name: "checkedAt without timezone", mutate: (p) => { p.stops[0].evidence.checkedAt = "2026-10-09T21:00:00"; }, code: "evidence", at: "stops[0].evidence.checkedAt" },
    { name: "checkedAt not a real date", mutate: (p) => { p.stops[0].evidence.checkedAt = "2026-02-30T10:00:00+08:00"; }, code: "evidence", at: "stops[0].evidence.checkedAt" },
    { name: "source retrievedAt malformed", mutate: (p) => { p.sources[0].retrievedAt = "yesterday"; }, code: "evidence", at: "sources[0].retrievedAt" },
    { name: "flat fare with both amount and range", mutate: (p) => { p.fares[4].flatRange = { minCentavos: 1, maxCentavos: 2 }; }, code: "fare", at: "fares[4]" },
    { name: "flat fare with neither amount nor range", mutate: (p) => { delete p.fares[4].flatCentavos; }, code: "fare", at: "fares[4]" },
    { name: "flat range min above max", mutate: (p) => { p.fares[2].flatRange = { minCentavos: 3000, maxCentavos: 1000 }; }, code: "fare", at: "fares[2].flatRange" },
    { name: "fractional centavos", mutate: (p) => { p.fares[4].flatCentavos = 60.5; }, code: "fare", at: "fares[4].flatCentavos" },
    { name: "negative centavos", mutate: (p) => { p.fares[4].flatCentavos = -100; }, code: "fare", at: "fares[4].flatCentavos" },
    { name: "centavos typo (pesos as centavos x1000)", mutate: (p) => { p.fares[4].flatCentavos = 600_000_000; }, code: "fare", at: "fares[4].flatCentavos" },
    { name: "fare amount with unknown evidence", mutate: (p) => { p.fares[4].evidence = { sourceIds: [], checkedAt: p.fares[4].evidence.checkedAt, reliability: "unknown" }; }, code: "fare", at: "fares[4].evidence" },
    { name: "unknown fare carrying an amount", mutate: (p) => { p.fares[0].flatCentavos = 0; }, code: "fare", at: "fares[0].flatCentavos" },
    { name: "flat fare carrying a matrix", mutate: (p) => { p.fares[4].matrix = []; }, code: "fare", at: "fares[4].matrix" },
    { name: "matrix pair in reverse order for the service", mutate: (p) => { const m = p.fares[3].matrix[0]; [m.fromStopId, m.toStopId] = [m.toStopId, m.fromStopId]; }, code: "fare", at: "fares[3].matrix[0]" },
    { name: "matrix pair not on the service", mutate: (p) => { p.fares[3].matrix[0].toStopId = "stop_test_xfer"; }, code: "fare", at: "fares[3].matrix[0]" },
    { name: "matrix pair listed twice", mutate: (p) => { p.fares[3].matrix.push({ ...p.fares[3].matrix[0] }); }, code: "fare", at: "fares[3].matrix[3]" },
    { name: "empty matrix", mutate: (p) => { p.fares[3].matrix = []; }, code: "fare", at: "fares[3].matrix" },
    { name: "distance increment of zero", mutate: (p) => { p.fares[1].distanceRule.incrementMeters = 0; }, code: "fare", at: "incrementMeters" },
    { name: "distance rule without documented segments", mutate: (p) => { p.fares[1].distanceRule.verifiedSegmentMeters = []; }, code: "fare", at: "verifiedSegmentMeters" },
    { name: "distance segment on another service's direction", mutate: (p) => { p.fares[1].distanceRule.verifiedSegmentMeters[0].directionId = "dir_test_001"; }, code: "fare", at: "verifiedSegmentMeters[0].directionId" },
    { name: "distance segment in wrong stop order", mutate: (p) => { const s = p.fares[1].distanceRule.verifiedSegmentMeters[0]; [s.fromStopId, s.toStopId] = [s.toStopId, s.fromStopId]; }, code: "fare", at: "verifiedSegmentMeters[0]" },
    { name: "distance segment of zero meters", mutate: (p) => { p.fares[1].distanceRule.verifiedSegmentMeters[0].meters = 0; }, code: "fare", at: "verifiedSegmentMeters[0].meters" },
    { name: "validFrom after validTo", mutate: (p) => { p.fares[1].validFrom = "2027-01-01"; }, code: "fare", at: "fares[1].validTo" },
    { name: "validity date not real", mutate: (p) => { p.fares[1].validTo = "2026-13-40"; }, code: "fare", at: "fares[1].validTo" },
    { name: "discount denominator zero", mutate: (p) => { p.fares[1].discountRules[0].denominator = 0; }, code: "fare", at: "discountRules[0].denominator" },
    { name: "discount ratio above one", mutate: (p) => { p.fares[1].discountRules[0].numerator = 9; }, code: "fare", at: "discountRules[0].numerator" },
    { name: "discount rounding invalid", mutate: (p) => { p.fares[1].discountRules[0].rounding = "banker"; }, code: "schema", at: "discountRules[0].rounding" },
    { name: "discount for the same passenger twice", mutate: (p) => { p.fares[1].discountRules.push({ ...p.fares[1].discountRules[0] }); }, code: "fare", at: "discountRules[1]" },
    { name: "discount on an unknown fare", mutate: (p) => { p.fares[0].discountRules = []; }, code: "fare", at: "fares[0].discountRules" },
    { name: "unknown top-level field", mutate: (p) => { p.liveArrivals = []; }, code: "unknown_field", at: "$.liveArrivals" },
    { name: "unknown nested field (typo)", mutate: (p) => { p.stops[0].alights = true; }, code: "unknown_field", at: "stops[0].alights" },
    { name: "wrong schema version", mutate: (p) => { p.schemaVersion = "2.0"; }, code: "schema", at: "$.schemaVersion" },
    { name: "invalid pack kind", mutate: (p) => { p.kind = "demo"; }, code: "schema", at: "$.kind" },
    { name: "invalid mode", mutate: (p) => { p.services[0].mode = "ferry"; }, code: "schema", at: "services[0].mode" },
    { name: "invalid place kind", mutate: (p) => { p.places[0].kind = "mall"; }, code: "schema", at: "places[0].kind" },
    { name: "ID without entity prefix", mutate: (p) => { p.places[0].id = "a_place"; }, code: "schema", at: "places[0].id" },
    { name: "ID not lower_snake_case", mutate: (p) => { p.places[0].id = "place_Test_A"; }, code: "schema", at: "places[0].id" },
    { name: "missing collection", mutate: (p) => { delete p.walkLinks; }, code: "schema", at: "$.walkLinks" },
    { name: "collection is not an array", mutate: (p) => { p.stops = {}; }, code: "schema", at: "$.stops" },
    { name: "record is not an object", mutate: (p) => { p.stops[0] = 7; }, code: "schema", at: "stops[0]" },
    { name: "empty place name", mutate: (p) => { p.places[0].name = "  "; }, code: "schema", at: "places[0].name" },
    { name: "non-string alias", mutate: (p) => { p.places[0].aliases = [3]; }, code: "schema", at: "places[0].aliases[0]" },
    { name: "suspended direction with no explanation", mutate: (p) => { p.directions[6].availabilityNote = ""; }, code: "schema", at: "directions[6].availabilityNote" },
    { name: "source without usage basis", mutate: (p) => { p.sources[0].usageBasis = ""; }, code: "schema", at: "sources[0].usageBasis" },
    { name: "source with no supported facts", mutate: (p) => { p.sources[0].factsSupported = []; }, code: "schema", at: "sources[0].factsSupported" },
    { name: "source with non-http URL", mutate: (p) => { p.sources[0].url = "javascript:alert(1)"; }, code: "schema", at: "sources[0].url" },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const pack = fresh();
      c.mutate(pack);
      expectError(dev(pack), c.code, c.at);
    });
  }

  it("rejects non-object inputs without throwing", () => {
    for (const bad of [null, undefined, 42, "pack", [], true]) {
      const report = dev(bad);
      assert.equal(report.ok, false, String(bad));
      assert.equal(report.pack, null);
    }
  });

  it("rejects values that are not plain JSON (cycles)", () => {
    const cyclic: Json = fresh();
    cyclic.self = cyclic;
    assert.equal(dev(cyclic).ok, false);
  });

  it("rejects an own __proto__ key instead of silently honoring it", () => {
    const pack = JSON.parse(fixtureText.replace('"schemaVersion"', '"__proto__": {"x": 1}, "schemaVersion"')) as Json;
    expectError(dev(pack), "unknown_field", "__proto__");
  });

  it("reports many problems at once so a bad pack can be fixed in one pass", () => {
    const pack = fresh();
    pack.places[0].point.latitude = 100;
    pack.stops[0].placeId = "place_missing";
    pack.fares[4].flatCentavos = 1.5;
    assert.ok(errorsOf(dev(pack)).length >= 3);
  });
});

describe("warnings do not block a valid pack", () => {
  it("flags unused sources, unused stops and services without directions", () => {
    const pack = fresh();
    pack.sources.push({ ...pack.sources[0], id: "source_test_unused" });
    pack.stops.push({ ...pack.stops[0], id: "stop_test_orphan", label: "TEST ONLY Orphan" });
    pack.services.push({ ...pack.services[0], id: "service_test_empty" });
    const report = dev(pack);
    assert.equal(report.ok, true);
    const warned = report.issues.filter((i) => i.severity === "warning" && i.code === "unused").map((i) => i.path);
    assert.ok(warned.includes("sources[id=source_test_unused]"));
    assert.ok(warned.includes("stops[id=stop_test_orphan]"));
    assert.ok(warned.includes("services[id=service_test_empty]"));
  });

  it("warns that overlapping fare policies for one service conflict", () => {
    const pack = fresh();
    const second = JSON.parse(JSON.stringify(pack.fares[4])) as Json;
    second.id = "fare_test_005b";
    pack.fares.push(second);
    const report = dev(pack);
    assert.equal(report.ok, true);
    assert.ok(report.issues.some((i) => i.code === "fare" && i.severity === "warning" && /overlap/.test(i.message)));
  });

  it("does not warn for fare policies with disjoint validity", () => {
    const pack = fresh();
    pack.fares[4].validTo = "2025-12-31";
    const second = JSON.parse(JSON.stringify(pack.fares[4])) as Json;
    second.id = "fare_test_005b";
    second.validFrom = "2026-01-01";
    delete second.validTo;
    pack.fares.push(second);
    assert.deepEqual(dev(pack).issues, []);
  });

  it("warns when a stop is far from its place", () => {
    const pack = fresh();
    pack.stops[0].point = { latitude: 0, longitude: 0.05 };
    const report = dev(pack);
    assert.equal(report.ok, true);
    assert.ok(report.issues.some((i) => i.code === "coordinates" && i.severity === "warning"));
  });

  it("warns when two different places share an exact coordinate", () => {
    const pack = fresh();
    pack.places[2].point = { ...pack.places[1].point };
    const report = dev(pack);
    assert.ok(report.issues.some((i) => i.code === "coordinates" && i.severity === "warning" && /same coordinate/.test(i.message)));
  });

  it("warns on a repeated alias", () => {
    const pack = fresh();
    pack.places[0].aliases = ["test origin", "Test  Origin!"];
    const report = dev(pack);
    assert.equal(report.ok, true);
    assert.ok(report.issues.some((i) => i.severity === "warning" && /repeats/.test(i.message)));
  });
});

describe("contract-shaped results", () => {
  it("validatePack returns a frozen copy isolated from the input", () => {
    const input = fresh();
    const result = validatePack(input, { target: "development" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    input.places[0].name = "mutated after validation";
    assert.notEqual(result.value.places[0]?.name, "mutated after validation");
    assert.ok(Object.isFrozen(result.value));
    assert.ok(Object.isFrozen(result.value.places[0]));
    assert.ok(Object.isFrozen(result.value.fares[1]?.distanceRule?.verifiedSegmentMeters[0]));
    // Strict mode throws, sloppy mode ignores the write; either way the value must not change.
    const before = result.value.places[0]?.name;
    try { (result.value.places[0] as { name: string }).name = "x"; } catch { /* strict mode */ }
    assert.equal(result.value.places[0]?.name, before);
  });

  it("returns DATA_INVALID with the first failing path and no raw diagnostics in the message", () => {
    const pack = fresh();
    pack.stops[0].placeId = "place_missing";
    const result = validatePack(pack, { target: "development" });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "DATA_INVALID");
    assert.equal(result.error.retryable, false);
    assert.equal(result.error.message, "Transit data could not be validated.");
    assert.equal(result.error.detail?.field, "stops[0].placeId");
  });

  it("rejects the fixture as a release pack through the contract entry point", () => {
    const result = validatePack(fresh(), { target: "release" });
    assert.equal(result.ok, false);
  });

  it("parsePackJson rejects malformed JSON and tolerates a UTF-8 BOM", () => {
    const bad = parsePackJson("{not json", { target: "development" });
    assert.equal(bad.ok, false);
    assert.equal(bad.issues[0]?.message, "Pack file is not valid JSON.");
    assert.equal(parsePackJson("﻿" + fixtureText, { target: "development" }).ok, true);
  });
});

describe("helpers", () => {
  it("canonicalJson ignores key order but not array order", () => {
    const pack = fresh();
    const reordered: Json = {};
    for (const k of Object.keys(pack).reverse()) reordered[k] = pack[k];
    assert.equal(canonicalJson(reordered), canonicalJson(pack));
    const swapped = fresh();
    [swapped.places[0], swapped.places[1]] = [swapped.places[1], swapped.places[0]];
    assert.notEqual(canonicalJson(swapped), canonicalJson(pack));
    assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }), '{"a":{"c":[3,{"y":2,"z":1}],"d":2},"b":1}');
  });

  it("normalizeAlias folds case, diacritics, punctuation and spacing only", () => {
    assert.equal(normalizeAlias("  San   Pablo, Laguna! "), "san pablo laguna");
    assert.equal(normalizeAlias("Cañón"), "canon");
    assert.notEqual(normalizeAlias("Sto. Tomas"), normalizeAlias("Santo Tomas"));
    assert.deepEqual(placeSearchKeys({ name: "Lipa", aliases: ["lipa", "LIPA!", "Lipa City"] }), ["lipa", "lipa city"]);
  });

  it("aerialMeters matches known distances", () => {
    assert.ok(Math.abs(aerialMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.0009 }) - 100.19) < 0.5);
    assert.equal(aerialMeters({ latitude: 14, longitude: 121 }, { latitude: 14, longitude: 121 }), 0);
  });

  it("ISO parsing requires a timezone and a real calendar date", () => {
    assert.equal(parseIsoDateTime("2026-10-09T21:00:00+08:00"), Date.UTC(2026, 9, 9, 13, 0, 0));
    assert.equal(parseIsoDateTime("2026-10-09T13:00:00Z"), Date.UTC(2026, 9, 9, 13, 0, 0));
    assert.equal(parseIsoDateTime("2026-10-09T21:00:00"), null);
    assert.equal(parseIsoDateTime("2026-02-29T10:00:00Z"), null);
    assert.notEqual(parseIsoDateTime("2028-02-29T10:00:00Z"), null);
    assert.equal(parseIsoDateTime("2026-10-09T24:00:00Z"), null);
    assert.equal(parseIsoDateTime(20261009), null);
    assert.equal(parseIsoDateOrDateTime("2026-10-09"), Date.UTC(2026, 9, 9));
    assert.equal(parseIsoDateOrDateTime("2026-04-31"), null);
  });
});

describe("target must be explicit", () => {
  it("the same fixture passes development and fails release", () => {
    const targets: PackTarget[] = ["development", "release"];
    const verdicts = targets.map((target) => analyzePack(fresh(), { target }).ok);
    assert.deepEqual(verdicts, [true, false]);
  });
});
