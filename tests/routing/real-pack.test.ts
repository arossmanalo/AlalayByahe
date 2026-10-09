import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { TransitPack } from "../../src/contracts/index";
import { validateTransitPack } from "../../src/contracts/validators";
import { analyzePack, validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { NOW, prefs, rides, trace } from "./helpers";

/**
 * Tests for data/candidates/lrt1-candidate.json: an UNREVIEWED transcription of the LRMC
 * stored value fare matrix for LRT-1, all 25 stations. It is not a release
 * pack and not an advertised coverage claim. These tests check that the transcription is
 * internally consistent and that it is correctly refused for release until a second
 * teammate has verified it.
 */

const CANDIDATE_PATH = new URL("../../data/candidates/lrt1-candidate.json", import.meta.url);
const raw = JSON.parse(readFileSync(CANDIDATE_PATH, "utf8")) as Record<string, any>;

const ORDER = [
  "dr_santos", "ninoy_aquino_avenue", "pitx", "mia_road", "redemptorist_aseana", "baclaran", "edsa",
  "libertad", "gil_puyat", "vito_cruz", "quirino", "pedro_gil", "un_avenue", "central",
  "carriedo", "doroteo_jose", "bambang", "tayuman", "blumentritt", "abad_santos", "r_papa",
  "fifth_avenue", "monumento", "balintawak", "fernando_poe_jr",
];
const place = (k: string): string => `place_lrt1_${k}`;
const stop = (k: string): string => `stop_lrt1_${k}`;

/**
 * Test-only stand-in for "a second teammate verified every routing fact": raises the
 * routing evidence to verified in memory. Never written to disk.
 */
function reviewedCopy(): Record<string, any> {
  const copy = JSON.parse(JSON.stringify(raw)) as Record<string, any>;
  for (const key of ["stops", "services", "directions", "routeStops", "walkLinks", "fares"]) {
    for (const rec of copy[key]) rec.evidence.reliability = "verified";
  }
  return copy;
}

function reviewedPack(): TransitPack {
  const result = validatePack(reviewedCopy(), { target: "release" });
  if (!result.ok) throw new Error(`reviewed copy should pass the release gate: ${JSON.stringify(result.error)}`);
  return result.value;
}

const trip = (from: string, to: string, over = {}) => ({
  queryId: "real_query",
  origin: { placeId: place(from), label: from, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  destination: { placeId: place(to), label: to, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  preferences: prefs(over),
});

describe("LRT-1 candidate pack (unreviewed transcription)", () => {
  it("is refused for release only because the facts are not yet verified", () => {
    const report = analyzePack(raw, { target: "release" });
    assert.equal(report.ok, false);
    assert.equal(report.pack, null);
    const errors = report.issues.filter((i) => i.severity === "error");
    assert.ok(errors.length > 0);
    assert.ok(
      errors.every((i) => i.code === "release_gate" && /must be verified/.test(i.message)),
      `unexpected errors:\n${errors.filter((i) => !(i.code === "release_gate" && /must be verified/.test(i.message))).map((i) => `${i.path}: ${i.message}`).join("\n")}`,
    );
    assert.deepEqual(report.issues.filter((i) => i.severity === "warning"), []);
  });

  it("is also refused by the integration layer's validator for the same reason", () => {
    assert.equal(validateTransitPack(raw).ok, false);
  });

  it("passes both validators once the facts are verified", () => {
    const reviewed = reviewedCopy();
    assert.equal(validateTransitPack(reviewed).ok, true, "integration validator");
    assert.equal(analyzePack(reviewed, { target: "release" }).ok, true, "pack validator");
  });

  it("states its limited coverage and contains no fixture material", () => {
    assert.match(raw["coverageLabels"][0], /LRT-1 only/);
    assert.match(raw["coverageLabels"][0], /no target corridor covered end to end/);
    assert.equal(raw["kind"], "release");
    assert.ok(!/test_|fixture|TEST ONLY/i.test(JSON.stringify(raw).replace(/source_wikipedia_lrt1/g, "")), "no fixture namespace or wording");
  });

  it("lists the stations in the order of the official matrix and in increasing latitude, south to north", () => {
    assert.deepEqual(raw["places"].map((p: any) => p.id), ORDER.map(place));
    const lat = raw["places"].map((p: any) => p.point.latitude as number);
    // Balintawak and Fernando Poe Jr. are almost due east of each other on EDSA, so only
    // require the line never to turn back south by more than a rounding error.
    for (let i = 1; i < lat.length; i++) assert.ok(lat[i]! > lat[i - 1]! - 0.001, `station ${i} is south of station ${i - 1}`);
    for (let i = 1; i < lat.length - 1; i++) assert.ok(lat[i]! > lat[i - 1]!, `station ${i} is not north of station ${i - 1}`);
    const lon = raw["places"].map((p: any) => p.point.longitude as number);
    assert.ok(lon[24]! > lon[23]! && lon[23]! > lon[22]!, "the line turns east after Monumento");
  });

  it("does not reuse a coordinate across stations (the Wikipedia Baclaran point duplicated EDSA)", () => {
    const keys = raw["places"].map((p: any) => `${p.point.latitude},${p.point.longitude}`);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("has a fare for every ordered pair, symmetric, between 16 and 52 pesos", () => {
    const matrix = raw["fares"][0].matrix as { fromStopId: string; toStopId: string; centavos: number }[];
    assert.equal(matrix.length, ORDER.length * (ORDER.length - 1));
    const byPair = new Map(matrix.map((m) => [`${m.fromStopId}>${m.toStopId}`, m.centavos]));
    for (const a of ORDER) {
      for (const b of ORDER) {
        if (a === b) continue;
        const forward = byPair.get(`${stop(a)}>${stop(b)}`);
        assert.equal(forward, byPair.get(`${stop(b)}>${stop(a)}`), `${a}<->${b} must be symmetric`);
        assert.ok(forward !== undefined && forward >= 1600 && forward <= 5200 && forward % 100 === 0, `${a}>${b} fare ${forward}`);
      }
    }
  });

  it("fares never decrease as the ride gets longer from a given station (a transcription sanity check)", () => {
    const matrix = raw["fares"][0].matrix as { fromStopId: string; toStopId: string; centavos: number }[];
    const fare = (a: string, b: string): number => matrix.find((m) => m.fromStopId === stop(a) && m.toStopId === stop(b))!.centavos;
    for (let from = 0; from < ORDER.length; from++) {
      for (let to = from + 2; to < ORDER.length; to++) {
        assert.ok(fare(ORDER[from]!, ORDER[to]!) >= fare(ORDER[from]!, ORDER[to - 1]!), `${ORDER[from]} to ${ORDER[to]}`);
      }
    }
  });

  it("matches fares read independently from the image", () => {
    const matrix = raw["fares"][0].matrix as { fromStopId: string; toStopId: string; centavos: number }[];
    const fare = (a: string, b: string): number => matrix.find((m) => m.fromStopId === stop(a) && m.toStopId === stop(b))!.centavos;
    const spot: [string, string, number][] = [
      ["vito_cruz", "gil_puyat", 1800], ["vito_cruz", "edsa", 2000], ["vito_cruz", "baclaran", 2100],
      ["baclaran", "quirino", 2200], ["dr_santos", "central", 3600], ["pedro_gil", "un_avenue", 1700],
      ["dr_santos", "fernando_poe_jr", 5200], ["monumento", "balintawak", 2000], ["blumentritt", "tayuman", 1700],
      ["central", "carriedo", 1700], ["vito_cruz", "doroteo_jose", 2400], ["edsa", "balintawak", 3900],
      ["balintawak", "fernando_poe_jr", 1900], ["abad_santos", "r_papa", 1700],
      ["libertad", "gil_puyat", 1700], ["pitx", "ninoy_aquino_avenue", 1800],
    ];
    for (const [a, b, centavos] of spot) {
      assert.equal(fare(a, b), centavos, `${a} to ${b}`);
      assert.equal(fare(b, a), centavos, `${b} to ${a}`);
    }
  });
});

describe("planning on the verified-in-memory copy", () => {
  const pack = reviewedPack();
  const plan = (from: string, to: string, over = {}) => planRoute(trip(from, to, over), pack, { now: () => NOW });

  it("plans Vito Cruz to Baclaran as one southbound ride at the documented fare, with no invented walk", () => {
    const r = plan("vito_cruz", "baclaran");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.equal(trace(o), "R(dir_lrt1_southbound:stop_lrt1_vito_cruz>stop_lrt1_baclaran)");
    assert.equal(o.transfers, 0);
    assert.equal(o.walkMeters, 0);
    assert.equal(rides(o)[0]!.headsign, "Dr. Santos");
    assert.equal(rides(o)[0]!.mode, "lrt");
    assert.equal(o.fare.status, "complete");
    assert.equal(o.fare.knownMinCentavos, 2100);
    assert.equal(o.fare.knownMaxCentavos, 2100);
  });

  it("plans the reverse as a separate northbound record", () => {
    const r = plan("baclaran", "vito_cruz");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const ride = rides(r.value.options[0]!)[0]!;
    assert.equal(ride.directionId, "dir_lrt1_northbound");
    assert.equal(ride.headsign, "Fernando Poe Jr.");
    assert.equal(r.value.options[0]!.fare.knownMinCentavos, 2100);
  });

  it("covers the Vito Cruz and EDSA (Taft) pair both ways", () => {
    for (const [a, b] of [["vito_cruz", "edsa"], ["edsa", "vito_cruz"]] as const) {
      const r = plan(a, b);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value.options[0]!.fare.knownMaxCentavos, 2000);
    }
  });

  it("spans the whole line in one ride, both ways, at the same documented fare", () => {
    for (const [a, b] of [["dr_santos", "fernando_poe_jr"], ["fernando_poe_jr", "dr_santos"]] as const) {
      const r = plan(a, b);
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.options[0]!.fare.knownMinCentavos, 5200);
      assert.equal(rides(r.value.options[0]!).length, 1);
      assert.equal(r.value.options[0]!.transfers, 0);
    }
  });

  it("every station can reach every other station directly with its own matrix fare", () => {
    const matrix = pack.fares[0]!.matrix!;
    for (const a of ORDER) {
      for (const b of ORDER) {
        if (a === b) continue;
        const r = plan(a, b);
        assert.equal(r.ok, true, `${a} to ${b}`);
        if (!r.ok) return;
        const expected = matrix.find((m) => m.fromStopId === stop(a) && m.toStopId === stop(b))!.centavos;
        assert.equal(r.value.options[0]!.fare.knownMinCentavos, expected, `${a} to ${b}`);
        assert.equal(r.value.options[0]!.fare.status, "complete");
        assert.equal(r.value.options[0]!.transfers, 0);
      }
    }
  });

  it("does not claim a discount the data does not document", () => {
    const r = plan("vito_cruz", "baclaran", { passenger: "student" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const ride = rides(r.value.options[0]!)[0]!;
    assert.equal(ride.fare.status, "estimated");
    assert.match(ride.fare.basis, /No student discount is documented/);
    assert.equal(ride.fare.minCentavos, 2100);
  });

  it("excluding rail leaves no verified journey, never a made-up one", () => {
    const r = plan("vito_cruz", "baclaran", { allowedModes: ["jeepney", "bus", "van", "tricycle"] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "CONSTRAINT_UNSATISFIED");
  });

  it("does not connect to places outside the pack", () => {
    const r = planRoute(trip("vito_cruz", "baclaran"), pack, { now: () => NOW });
    assert.equal(r.ok, true);
    const missing = planRoute({ ...trip("vito_cruz", "baclaran"), destination: { placeId: "place_lipa_terminal", label: "Lipa", point: { latitude: 13.9, longitude: 121.1 }, provenance: "stored" } }, pack, { now: () => NOW });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.error.code, "PLACE_NOT_FOUND");
  });
});
