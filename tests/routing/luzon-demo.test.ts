import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { analyzePack, validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { NOW, prefs, rides } from "./helpers";

/**
 * tests/fixtures/luzon-demo-pack.json is SYNTHETIC: invented routes, stops, fares and walks
 * across Luzon for tests and demos. It is a test_fixture pack that the release gate refuses.
 * Passing these tests says the engine behaves on a large graph; it says nothing about real transport.
 */

const raw = JSON.parse(readFileSync(new URL("../fixtures/luzon-demo-pack.json", import.meta.url), "utf8")) as Record<string, any>;
const validated = validatePack(raw, { target: "development" });
if (!validated.ok) throw new Error(`demo pack must validate: ${JSON.stringify(validated.error)}`);
const pack = validated.value;

const trip = (from: string, to: string, over = {}) => ({
  queryId: "luzon_demo",
  origin: { placeId: `place_test_${from}`, label: from, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  destination: { placeId: `place_test_${to}`, label: to, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  preferences: prefs(over),
});
const plan = (from: string, to: string, over = {}) => planRoute(trip(from, to, over), pack, { now: () => NOW });
const heads = (o: Parameters<typeof rides>[0]) => rides(o).map((r) => r.headsign.replace(" (DEMO)", ""));

describe("Luzon demo pack is clearly synthetic and never releasable", () => {
  it("validates for development with no errors and no warnings", () => {
    const report = analyzePack(raw, { target: "development" });
    assert.deepEqual(report.issues, []);
    assert.equal(report.summary?.kind, "test_fixture");
  });

  it("is refused by the release gate, even if its kind is flipped to release", () => {
    assert.equal(analyzePack(raw, { target: "release" }).ok, false);
    const flipped = JSON.parse(JSON.stringify(raw)) as Record<string, any>;
    flipped["kind"] = "release";
    const report = analyzePack(flipped, { target: "release" });
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((i) => i.code === "release_gate" && /Fixture-namespace ID|Synthetic\/test wording/.test(i.message)));
  });

  it("says DEMO everywhere a person could read a name, and states it is not real", () => {
    assert.match(raw["coverageLabels"][0], /DEMO DATA, NOT REAL/);
    for (const p of raw["places"]) assert.match(p.name, /\(DEMO\)$/);
    for (const s of raw["services"]) assert.match(s.name, /\(DEMO\)$/);
    assert.ok(raw["places"].every((p: any) => /^place_test_/.test(p.id)));
    assert.ok(raw["fares"].every((f: any) => /^fare_test_/.test(f.id)));
  });

  it("spans Luzon from Laoag to Legazpi and from Iba to Daet", () => {
    const lat = raw["places"].map((p: any) => p.point.latitude as number);
    const lon = raw["places"].map((p: any) => p.point.longitude as number);
    assert.ok(Math.max(...lat) > 18.1 && Math.min(...lat) < 13.2);
    assert.ok(Math.min(...lon) < 120.0 && Math.max(...lon) > 123.7);
  });

  it("covers every mode and every fare kind", () => {
    assert.deepEqual([...new Set(raw["services"].map((s: any) => s.mode))].sort(), ["bus", "jeepney", "lrt", "tricycle", "van"]);
    assert.deepEqual([...new Set(raw["fares"].map((f: any) => f.kind))].sort(), ["flat", "matrix", "unknown"]);
  });
});

describe("the engine on a Luzon-sized graph", () => {
  it("every place is reachable from Cubao and back (no stranded demo places)", () => {
    const keys = raw["places"].map((p: any) => (p.id as string).replace("place_test_", ""));
    const stranded: string[] = [];
    for (const k of keys.filter((x: string) => x !== "cubao")) {
      const there = plan("cubao", k, { maxTransferWalkMeters: 2000, maxAccessWalkMeters: 2000, maxEgressWalkMeters: 2000 });
      const back = plan(k, "cubao", { maxTransferWalkMeters: 2000, maxAccessWalkMeters: 2000, maxEgressWalkMeters: 2000 });
      if (!there.ok || !back.ok) stranded.push(k);
    }
    assert.deepEqual(stranded, []);
  });

  it("Lipa to Baguio needs two transfers: bus to PITX, EDSA Carousel to Cubao, bus to Baguio", () => {
    const r = plan("lipa_terminal", "baguio");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.equal(o.transfers, 2);
    // A ride's headsign is where that vehicle is headed, not where the passenger gets off:
    // the EDSA Carousel from PITX toward Cubao is signed for its terminus, Monumento.
    assert.deepEqual(heads(o), ["PITX terminal", "Monumento terminal", "Baguio City terminal"]);
  });

  it("Laoag to Legazpi crosses the whole island in three rides", () => {
    const r = plan("laoag", "legazpi");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.equal(o.transfers, 2);
    assert.deepEqual(heads(o), ["Cubao terminal", "PITX terminal", "Legazpi terminal"]);
    assert.equal(o.fare.status, "complete");
  });

  it("an unknown fare makes the total partial, never zero or complete", () => {
    const r = plan("candelaria", "vito_cruz");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.equal(o.fare.status, "partial");
    assert.equal(o.fare.unknownRideLegs, 1);
    assert.ok(o.fare.knownMinCentavos > 0);
  });

  it("direct-only and mode exclusions are strict on the large graph", () => {
    const direct = plan("lipa_terminal", "baguio", { directOnly: true });
    assert.equal(direct.ok, false);
    if (!direct.ok) assert.equal(direct.error.code, "CONSTRAINT_UNSATISFIED");
    const noBus = plan("laoag", "legazpi", { allowedModes: ["van", "jeepney", "tricycle", "lrt"] });
    assert.equal(noBus.ok, false);
    if (!noBus.ok) assert.ok(["CONSTRAINT_UNSATISFIED", "NO_VERIFIED_JOURNEY"].includes(noBus.error.code));
  });

  it("a tricycle-only trip uses the documented stand and keeps its fare as a range", () => {
    const r = plan("lipa_palengke", "sm_lipa", { allowedModes: ["tricycle"] });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const ride = rides(r.value.options[0]!)[0]!;
    assert.equal(ride.mode, "tricycle");
    assert.equal(ride.fare.minCentavos, 3000);
    assert.equal(ride.fare.maxCentavos, 5000);
  });

  it("rail-only trip from Baclaran to Antipolo changes trains at shared hubs with no walking", () => {
    const r = plan("baclaran", "antipolo", { allowedModes: ["lrt"] });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.deepEqual(rides(o).map((x) => x.serviceName), ["LRT-1 (DEMO)", "MRT-3 (DEMO)", "LRT-2 (DEMO)"]);
    assert.equal(o.transfers, 2);
    assert.equal(o.walkMeters, 0);
  });

  it("search stays within the label guard on the full graph", () => {
    const r = planRoute(trip("laoag", "legazpi"), pack, { now: () => NOW, labelLimit: 10_000 });
    assert.equal(r.ok, true);
  });
});
