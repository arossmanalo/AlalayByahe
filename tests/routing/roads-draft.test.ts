import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { TransitPack } from "../../src/contracts/index";
import { analyzePack, validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { NOW, prefs, rides, walks } from "./helpers";

/**
 * data/candidates/roads-draft.json: the verified LRT-1 pack plus DRAFT road routes from
 * teammate reports. Not a release pack. These tests check that the draft is well formed,
 * that the release gate correctly refuses it until the road facts are checked, and what the
 * engine would say if they were. "Verified" copies below exist only in memory.
 */

const draft = JSON.parse(readFileSync(new URL("../../data/candidates/roads-draft.json", import.meta.url), "utf8")) as Record<string, any>;
const lrtOnly = JSON.parse(readFileSync(new URL("../../assets/data/release.json", import.meta.url), "utf8")) as Record<string, any>;

const ROAD_KEYS = ["stops", "services", "directions", "routeStops", "walkLinks", "fares"] as const;
const lrtIds = new Set<string>([
  ...lrtOnly["stops"].map((r: any) => r.id), ...lrtOnly["services"].map((r: any) => r.id), ...lrtOnly["directions"].map((r: any) => r.id),
  ...lrtOnly["walkLinks"].map((r: any) => r.id), ...lrtOnly["fares"].map((r: any) => r.id),
]);

function verifiedCopy(): TransitPack {
  const copy = JSON.parse(JSON.stringify(draft)) as Record<string, any>;
  for (const key of ROAD_KEYS) for (const rec of copy[key]) rec.evidence.reliability = "verified";
  const result = validatePack(copy, { target: "release" });
  if (!result.ok) throw new Error(`verified copy should pass: ${JSON.stringify(result.error)}`);
  return result.value;
}

const trip = (from: string, to: string, over = {}) => ({
  queryId: "roads_draft",
  origin: { placeId: from, label: from, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  destination: { placeId: to, label: to, point: { latitude: 14, longitude: 121 }, provenance: "stored" as const },
  preferences: prefs(over),
});

describe("road draft pack", () => {
  it("keeps every LRT-1 record untouched", () => {
    for (const key of ["places", "stops", "services", "directions", "routeStops", "walkLinks", "fares", "sources"]) {
      const kept = draft[key].slice(0, lrtOnly[key].length);
      assert.deepEqual(kept, lrtOnly[key], `${key}: LRT-1 records must be unchanged`);
    }
  });

  it("is refused for release only because the road facts are unverified", () => {
    const report = analyzePack(draft, { target: "release" });
    assert.equal(report.ok, false);
    const errors = report.issues.filter((i) => i.severity === "error");
    assert.equal(errors.length, 36);
    assert.ok(errors.every((i) => i.code === "release_gate" && /must be verified/.test(i.message)));
    assert.deepEqual(report.issues.filter((i) => i.severity === "warning"), []);
  });

  it("marks every road fact estimated and every new source as unchecked", () => {
    for (const key of ROAD_KEYS) {
      for (const rec of draft[key]) {
        if (rec.id && lrtIds.has(rec.id)) continue;
        if (!rec.id && lrtOnly[key].some((r: any) => JSON.stringify(r) === JSON.stringify(rec))) continue;
        assert.equal(rec.evidence.reliability, "estimated", `${key} ${rec.id ?? rec.directionId}`);
      }
    }
    for (const s of draft["sources"].slice(lrtOnly["sources"].length)) assert.match(s.checkedBy, /not yet checked|Not yet checked/i);
  });

  it("does not claim Lipa to San Pablo, return trips or student fares", () => {
    const text = JSON.stringify(draft["coverageLabels"]);
    assert.match(text, /DRAFT, unverified/);
    assert.ok(!draft["places"].some((p: any) => /san pablo|wawa|puregold/i.test(p.name)));
    assert.ok(draft["fares"].every((f: any) => !f.discountRules));
  });
});

describe("if the road facts were checked (in-memory copy)", () => {
  const pack = verifiedCopy();
  const plan = (from: string, to: string, over = {}) => planRoute(trip(from, to, over), pack, { now: () => NOW });

  it("plans Lipa to Candelaria as three jeepneys and a 150 m walk, fare P104", () => {
    const r = plan("place_lipa_mcdo_la_salle", "place_candelaria_town_proper");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const o = r.value.options[0]!;
    assert.deepEqual(rides(o).map((x) => x.headsign), ["Lipa Palengke", "Tiaong / Bantayan", "Candelaria"]);
    assert.equal(o.transfers, 2);
    assert.equal(o.walkMeters, 150);
    assert.deepEqual(walks(o).map((w) => w.meters), [150]);
    assert.equal(o.fare.status, "complete");
    assert.equal(o.fare.knownMinCentavos, 10400);
    assert.ok(o.fare.sourceIds.length > 0);
  });

  it("respects the 500 m default transfer walk: the Buendia-bus option needs a 790 m walk and is refused until the user allows it", () => {
    const strict = plan("place_candelaria_hacienda_inn", "place_lrt1_vito_cruz");
    assert.equal(strict.ok, true, "the PITX route (234 m walk) still works under the defaults");
    if (!strict.ok) return;
    assert.deepEqual(strict.value.options.map((o) => rides(o).map((x) => x.headsign).join(" > ")), ["PITX > SM Fairview"]);
    assert.equal(strict.value.options[0]!.fare.knownMinCentavos, 23000);

    const wide = plan("place_candelaria_hacienda_inn", "place_lrt1_vito_cruz", { maxTransferWalkMeters: 800 });
    assert.equal(wide.ok, true);
    if (!wide.ok) return;
    const heads = wide.value.options.map((o) => rides(o).map((x) => x.headsign).join(" > "));
    assert.ok(heads.includes("Buendia > Fernando Poe Jr."), "bus, 790 m walk, then LRT northbound");
    const viaLrt = wide.value.options[heads.indexOf("Buendia > Fernando Poe Jr.")]!;
    assert.equal(viaLrt.fare.knownMinCentavos, 25000 + 1800);
    assert.deepEqual(walks(viaLrt).map((w) => w.meters), [790]);
  });

  it("only the reported direction exists: the reverse trips have no verified journey", () => {
    for (const [a, b] of [
      ["place_candelaria_town_proper", "place_lipa_mcdo_la_salle"],
      ["place_lrt1_vito_cruz", "place_candelaria_hacienda_inn"],
    ] as const) {
      const r = plan(a, b);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error.code, "NO_VERIFIED_JOURNEY");
    }
  });

  it("a Lipa to San Pablo trip is not in the data at all", () => {
    const r = plan("place_lipa_mcdo_la_salle", "place_san_pablo");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "PLACE_NOT_FOUND");
  });
});
