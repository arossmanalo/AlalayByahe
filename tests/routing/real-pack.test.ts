import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { TransitPack } from "../../src/contracts/index";
import { validateTransitPack } from "../../src/contracts/validators";
import { analyzePack, validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { NOW, prefs, rides, trace } from "./helpers";

/**
 * Tests for assets/data/release.json: the LRT-1 station-to-station release pack (all 25 stations,
 * stored value fares from the LRMC matrix effective April 2, 2025), transcribed by Member 2's
 * assistant and independently reviewed by Aryl Manalo on 2026-10-10.
 *
 * Coverage is LRT-1 stations only. These tests do not establish that any target corridor
 * (Lipa to Candelaria, Lipa to San Pablo, Candelaria to Vito Cruz/Taft end to end) is supported.
 */

const CANDIDATE_PATH = new URL("../../assets/data/release.json", import.meta.url);
const raw = JSON.parse(readFileSync(CANDIDATE_PATH, "utf8")) as Record<string, any>;

const ORDER = [
  "dr_santos", "ninoy_aquino_avenue", "pitx", "mia_road", "redemptorist_aseana", "baclaran", "edsa",
  "libertad", "gil_puyat", "vito_cruz", "quirino", "pedro_gil", "un_avenue", "central",
  "carriedo", "doroteo_jose", "bambang", "tayuman", "blumentritt", "abad_santos", "r_papa",
  "fifth_avenue", "monumento", "balintawak", "fernando_poe_jr",
];
const place = (k: string): string => `place_lrt1_${k}`;
const stop = (k: string): string => `stop_lrt1_${k}`;

/** Test-only: the same pack as if nobody had reviewed it (routing evidence downgraded to estimated). */
function unreviewedCopy(): Record<string, any> {
  const copy = JSON.parse(JSON.stringify(raw)) as Record<string, any>;
  for (const key of ["stops", "services", "directions", "routeStops", "walkLinks", "fares"]) {
    for (const rec of copy[key]) rec.evidence.reliability = "estimated";
  }
  return copy;
}

function releasePack(): TransitPack {
  const result = validatePack(raw, { target: "release" });
  if (!result.ok) throw new Error(`the release pack must pass the release gate: ${JSON.stringify(result.error)}`);
  return result.value;
}

const trip = (from: string, to: string, over = {}) => ({
  queryId: "real_query",
  origin: { placeId: place(from), label: from, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  destination: { placeId: place(to), label: to, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  preferences: prefs(over),
});

describe("LRT-1 release pack", () => {
  it("passes the release gate with no errors and no warnings", () => {
    const report = analyzePack(raw, { target: "release" });
    assert.deepEqual(report.issues, []);
    assert.equal(report.ok, true);
    assert.equal(report.summary?.kind, "release");
    assert.equal(report.summary?.places, 25);
  });

  it("is also accepted by the integration layer's validator", () => {
    assert.equal(validateTransitPack(raw).ok, true);
  });

  it("would be refused again if its routing evidence were not verified", () => {
    const report = analyzePack(unreviewedCopy(), { target: "release" });
    assert.equal(report.ok, false);
    const errors = report.issues.filter((i) => i.severity === "error");
    assert.ok(errors.length > 0 && errors.every((i) => i.code === "release_gate" && /must be verified/.test(i.message)));
    assert.equal(validateTransitPack(unreviewedCopy()).ok, false);
  });

  it("names its reviewer and the review date on every routing fact", () => {
    for (const key of ["stops", "services", "directions", "routeStops", "fares"]) {
      for (const rec of raw[key]) {
        assert.equal(rec.evidence.reliability, "verified", `${key} evidence`);
        assert.match(rec.evidence.note, /checked by Aryl Manalo on 2026-10-10/);
      }
    }
    for (const source of raw["sources"]) assert.match(source.checkedBy, /reviewed by Aryl Manalo/);
  });

  it("keeps approximate coordinates marked estimated rather than verified", () => {
    for (const p of raw["places"]) assert.equal(p.evidence.reliability, "estimated");
  });

  it("states its limited coverage and contains no fixture material", () => {
    assert.match(raw["coverageLabels"][0], /LRT-1 only/);
    assert.match(raw["coverageLabels"][0], /Reviewed 2026-10-10/);
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

describe("planning on the release pack", () => {
  const pack = releasePack();
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

  it("labels every result with the dataset version and the LRT-1-only coverage", () => {
    const r = plan("vito_cruz", "baclaran");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.options[0]!.datasetVersion, "lrt1_2026_10_10_1");
    assert.ok(r.value.coverageWarnings.some((w) => /LRT-1 only/.test(w)));
    assert.ok(r.value.coverageWarnings.some((w) => /not live availability/.test(w)));
  });

  it("onboard on a confirmed southbound train continues to the destination and leaves the current fare unknown", () => {
    const base = trip("vito_cruz", "baclaran");
    const r = planRoute(
      { ...base, onboard: { directionId: "dir_lrt1_southbound", confirmedNextStopId: stop("vito_cruz"), confirmedAt: "2026-10-10T01:00:00+08:00" } },
      pack, { now: () => NOW },
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.equal(rides(o)[0]!.alreadyOnboard, true);
    assert.equal(o.fare.status, "unknown");
    assert.equal(o.transfers, 0);
  });

  it("never rides backwards: a station already passed is reached only by riding on, getting off and boarding the opposite direction", () => {
    const base = trip("vito_cruz", "central");
    const r = planRoute(
      { ...base, onboard: { directionId: "dir_lrt1_southbound", confirmedNextStopId: stop("vito_cruz"), confirmedAt: "2026-10-10T01:00:00+08:00" } },
      pack, { now: () => NOW },
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const legs = rides(r.value.options[0]!);
    assert.equal(legs.length, 2, "current southbound ride, then a separate northbound boarding");
    const southOfVitoCruz = ORDER.slice(0, ORDER.indexOf("vito_cruz") + 1).map(stop);
    assert.ok(southOfVitoCruz.includes(legs[0]!.alightStopId), "the train only goes south, so the turnaround station is the confirmed next stop or one further south");
    assert.equal(legs[1]!.directionId, "dir_lrt1_northbound");
    assert.equal(r.value.options[0]!.transfers, 1);
  });
});
