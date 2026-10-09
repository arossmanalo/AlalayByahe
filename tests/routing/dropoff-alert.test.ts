import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { JourneyOption, Point, TransitPack } from "../../src/contracts/index";
import { validatePack } from "../../src/data/validatePack";
import { aerialMeters } from "../../src/data/geo";
import { createDropoffWatcher, MIN_ALERT_RIDE_METERS, thresholdsForRide, type DropoffWatcher, type LocationFix } from "../../src/routing/dropoffProximity";
import { planRoute } from "../../src/routing/routePort";
import { buildTripPins, buildTripPinsForResult } from "../../src/routing/tripPins";
import { NOW, prefs } from "./helpers";

/**
 * Software tests only. They say the proximity maths and the pin data behave as designed; they do not
 * say anything about GPS behaviour on a phone, battery use, or whether the chosen distances suit riders.
 */

const TARGET: Point = { latitude: 14.5339, longitude: 120.998 }; // Baclaran station (release pack)
const M_PER_DEG_LAT = 111_195;

/** A point `meters` due north of the target. */
const north = (meters: number): Point => ({ latitude: TARGET.latitude + meters / M_PER_DEG_LAT, longitude: TARGET.longitude });

let clock = 1_000_000;
const fix = (meters: number, over: Partial<LocationFix> = {}): LocationFix => {
  clock += 5_000;
  const p = north(meters);
  return { latitude: p.latitude, longitude: p.longitude, accuracyMeters: 10, timestampMs: clock, ...over };
};

const make = (opts = {}): DropoffWatcher => {
  const r = createDropoffWatcher({ target: TARGET, ...opts });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

describe("createDropoffWatcher options", () => {
  it("rejects invalid options with structured errors", () => {
    const cases: [object, string][] = [
      [{ target: { latitude: Number.NaN, longitude: 121 } }, "target"],
      [{ target: { latitude: 95, longitude: 121 } }, "target"],
      [{ target: TARGET, radiusMeters: 0 }, "radiusMeters"],
      [{ target: TARGET, radiusMeters: 12.5 }, "radiusMeters"],
      [{ target: TARGET, radiusMeters: 500, warnMeters: 400 }, "warnMeters"],
      [{ target: TARGET, minAccuracyMeters: 0 }, "minAccuracyMeters"],
      [{ target: TARGET, debounceFixes: 0 }, "debounceFixes"],
    ];
    for (const [opts, field] of cases) {
      const r = createDropoffWatcher(opts as Parameters<typeof createDropoffWatcher>[0]);
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error.code, "INVALID_INPUT");
        assert.equal(r.error.detail?.field, field);
      }
    }
  });
});

describe("drop-off proximity", () => {
  it("stays far, then fires approaching once, then arrived once after two fixes inside the radius", () => {
    const w = make();
    assert.deepEqual([w.update(fix(3000)).state, w.update(fix(1500)).event], ["far", undefined]);
    const a = w.update(fix(700));
    assert.equal(a.state, "approaching");
    assert.equal(a.event, "approaching");
    assert.equal(w.update(fix(650)).event, undefined);
    const first = w.update(fix(300));
    assert.equal(first.event, undefined, "a single fix inside the radius must not arrive");
    assert.equal(first.state, "approaching");
    const arrived = w.update(fix(250));
    assert.equal(arrived.state, "arrived");
    assert.equal(arrived.event, "arrived");
    for (const m of [200, 100, 50]) assert.equal(w.update(fix(m)).event, undefined);
  });

  it("reports whole-meter distances", () => {
    const w = make();
    const u = w.update(fix(1000));
    assert.ok(Number.isInteger(u.distanceMeters));
    assert.ok(Math.abs((u.distanceMeters ?? 0) - 1000) <= 2);
  });

  it("does not arrive from one GPS jump into the radius, and the run restarts after leaving it", () => {
    const w = make();
    w.update(fix(900));
    assert.equal(w.update(fix(100)).event, "approaching", "one jump may warn, but must not arrive");
    assert.equal(w.update(fix(900)).event, undefined);
    assert.equal(w.update(fix(100)).event, undefined, "the inside-radius run restarted");
    assert.equal(w.update(fix(90)).event, "arrived");
  });

  it("does not repeat events when GPS jitters around the radius and warn lines", () => {
    const w = make();
    const events: (string | undefined)[] = [];
    for (const m of [790, 810, 790, 805, 795, 410, 390, 405, 395, 410, 390, 380, 370]) events.push(w.update(fix(m)).event);
    assert.deepEqual(events.filter(Boolean), ["approaching", "arrived"]);
  });

  it("stays arrived when a later fix drifts outside the radius", () => {
    const w = make();
    w.update(fix(300));
    w.update(fix(300));
    const drift = w.update(fix(600));
    assert.equal(drift.state, "arrived");
    assert.equal(drift.event, undefined);
  });

  it("with debounceFixes 1 arrives on the first fix inside the radius", () => {
    const w = make({ debounceFixes: 1 });
    assert.equal(w.update(fix(100)).event, "arrived");
  });

  it("ignores low-accuracy fixes without changing state or counting toward arrival", () => {
    const w = make();
    w.update(fix(900));
    const noisy = w.update(fix(50, { accuracyMeters: 500 }));
    assert.equal(noisy.ignored, "low_accuracy");
    assert.equal(noisy.state, "far");
    assert.equal(noisy.event, undefined);
    assert.equal(w.update(fix(300, { accuracyMeters: 120 })).ignored, "low_accuracy");
    assert.equal(w.update(fix(300)).event, "approaching");
    assert.equal(w.update(fix(300)).event, "arrived");
  });

  it("ignores NaN, infinite, out-of-range and negative-accuracy fixes", () => {
    const w = make();
    const bad: Partial<LocationFix>[] = [
      { latitude: Number.NaN }, { longitude: Number.POSITIVE_INFINITY }, { latitude: 91 }, { longitude: -181 },
      { accuracyMeters: Number.NaN }, { accuracyMeters: -1 }, { timestampMs: Number.NaN },
    ];
    for (const over of bad) {
      const u = w.update(fix(100, over));
      assert.equal(u.ignored, "invalid_fix");
      assert.equal(u.event, undefined);
      assert.equal(u.state, "far");
    }
    assert.equal(w.update(undefined as unknown as LocationFix).ignored, "invalid_fix");
  });

  it("ignores out-of-order and repeated timestamps", () => {
    const w = make();
    const a = fix(900);
    w.update(a);
    assert.equal(w.update({ ...fix(100), timestampMs: a.timestampMs - 1 }).ignored, "stale_fix");
    assert.equal(w.update({ ...fix(100), timestampMs: a.timestampMs }).ignored, "stale_fix");
    assert.equal(w.update(fix(100)).event, "approaching", "the stale fixes must not have counted toward arrival");
    assert.equal(w.update(fix(100)).event, "arrived");
  });

  it("re-arms only after the user leaves warn + 200 m", () => {
    const w = make();
    w.update(fix(300));
    assert.equal(w.update(fix(300)).event, "arrived");
    assert.equal(w.update(fix(1000)).state, "arrived", "still inside the re-arm margin");
    const away = w.update(fix(1100));
    assert.equal(away.state, "far");
    assert.equal(w.update(fix(700)).event, "approaching");
    w.update(fix(300));
    assert.equal(w.update(fix(300)).event, "arrived");
  });

  it("reset forgets all state", () => {
    const w = make();
    w.update(fix(300));
    w.update(fix(300));
    w.reset();
    assert.equal(w.update(fix(5000)).state, "far");
    assert.equal(w.update(fix(300)).event, "approaching");
  });

  it("handles a target near the antimeridian and a pole without NaN", () => {
    for (const target of [{ latitude: 0, longitude: 179.9999 }, { latitude: 89.9999, longitude: 0 }]) {
      const r = createDropoffWatcher({ target });
      assert.ok(r.ok);
      if (r.ok) {
        const u = r.value.update({ ...target, accuracyMeters: 5, timestampMs: 1 });
        assert.equal(u.distanceMeters, 0);
      }
    }
  });
});

describe("thresholds sized to the ride", () => {
  it("offers no alert for rides shorter than 300 m or for invalid lengths", () => {
    assert.equal(MIN_ALERT_RIDE_METERS, 300);
    for (const m of [0, 100, 299, -5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(thresholdsForRide(m), null);
  });
  it("scales to a quarter and a half of the ride within the defaults, and warn stays below the ride", () => {
    assert.deepEqual(thresholdsForRide(300), { radiusMeters: 100, warnMeters: 200 });
    assert.deepEqual(thresholdsForRide(600), { radiusMeters: 150, warnMeters: 300 });
    assert.deepEqual(thresholdsForRide(1000), { radiusMeters: 250, warnMeters: 500 });
    assert.deepEqual(thresholdsForRide(5000), { radiusMeters: 400, warnMeters: 800 });
    for (let m = 300; m <= 6000; m += 7) {
      const t = thresholdsForRide(m)!;
      assert.ok(t.warnMeters < m && t.warnMeters >= t.radiusMeters, `ride ${m}`);
      assert.ok(createDropoffWatcher({ target: TARGET, ...t }).ok, `valid options for ${m}`);
    }
  });
  it("a short ride does not fire at the boarding stop with sized thresholds, but would with the defaults", () => {
    const board = north(450); // a 450 m ride ending at TARGET
    const sized = make(thresholdsForRide(450)!);
    assert.equal(sized.update({ ...fix(450), latitude: board.latitude }).event, undefined);
    const defaults = make();
    assert.equal(defaults.update({ ...fix(450), latitude: board.latitude }).event, "approaching");
  });
});

// ---------------------------------------------------------------- pins

const releasePack = (): TransitPack => {
  const raw = JSON.parse(readFileSync(new URL("../../assets/data/release.json", import.meta.url), "utf8"));
  const r = validatePack(raw, { target: "release" });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};
const demoPack = (): TransitPack => {
  const raw = JSON.parse(readFileSync(new URL("../../assets/demo/demo-pack.json", import.meta.url), "utf8"));
  const r = validatePack(raw, { target: "development" });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

const plan = (pack: TransitPack, from: string, to: string, over = {}) => {
  const res = planRoute(
    {
      queryId: "pins",
      origin: { placeId: from, label: from, point: { latitude: 14, longitude: 121 }, provenance: "stored" },
      destination: { placeId: to, label: to, point: { latitude: 14, longitude: 121 }, provenance: "stored" },
      preferences: prefs(over),
    },
    pack,
    { now: () => NOW },
  );
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.value;
};

describe("trip pins on the release pack", () => {
  const pack = releasePack();

  it("Vito Cruz to Baclaran: a board pin, a verified drop-off at Baclaran and one approximate line", () => {
    const result = plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran");
    const pins = buildTripPinsForResult(result, pack)!;
    assert.deepEqual(pins.pins.map((p) => [p.kind, p.stopId]), [["board", "stop_lrt1_vito_cruz"], ["alight", "stop_lrt1_baclaran"]]);
    assert.ok(pins.pins.every((p) => p.verification === "verified"));
    assert.equal(pins.dropoff?.stopId, "stop_lrt1_baclaran");
    assert.equal(pins.finalRideBoard?.stopId, "stop_lrt1_vito_cruz");
    assert.ok(thresholdsForRide(aerialMeters(pins.finalRideBoard!.point, pins.dropoff!.point)), "the 3.5 km ride gets an alert");
    assert.deepEqual(pins.dropoff?.point, { latitude: 14.5339, longitude: 120.998 });
    assert.deepEqual(pins.missingCoordinate, []);
    assert.equal(pins.legs.length, 1);
    assert.equal(pins.legs[0]!.approximate, true);
    assert.equal(pins.legs[0]!.verification, "verified");
    assert.equal(pins.legs[0]!.polyline[0]![0], 14.563475, "the line starts at Vito Cruz");
    assert.ok(pins.legs[0]!.polyline.length >= 3, "intermediate stops are included in order");
    assert.ok(pins.bounds!.north >= 14.563475 && pins.bounds!.south <= 14.5339);
  });

  it("Taft (EDSA) to Vito Cruz and back use opposite directions with the right drop-offs", () => {
    const there = buildTripPinsForResult(plan(pack, "place_lrt1_edsa", "place_lrt1_vito_cruz"), pack)!;
    const back = buildTripPinsForResult(plan(pack, "place_lrt1_vito_cruz", "place_lrt1_edsa"), pack)!;
    assert.equal(there.dropoff?.stopId, "stop_lrt1_vito_cruz");
    assert.equal(back.dropoff?.stopId, "stop_lrt1_edsa");
    assert.equal(there.pins[0]!.stopId, "stop_lrt1_edsa");
    assert.equal(back.pins[0]!.stopId, "stop_lrt1_vito_cruz");
    assert.notDeepEqual(there.legs[0]!.polyline, back.legs[0]!.polyline);
  });

  it("the drop-off point feeds the watcher end to end", () => {
    const pins = buildTripPinsForResult(plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran"), pack)!;
    const w = createDropoffWatcher({ target: pins.dropoff!.point });
    assert.ok(w.ok);
    if (w.ok) {
      const t = pins.dropoff!.point;
      assert.equal(w.value.update({ ...t, accuracyMeters: 8, timestampMs: 1 }).event, "approaching");
      assert.equal(w.value.update({ ...t, accuracyMeters: 8, timestampMs: 2 }).event, "arrived");
    }
  });

  it("returns null for a missing option index", () => {
    const result = plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran");
    assert.equal(buildTripPinsForResult(result, pack, 99), null);
  });

  it("a missing or invalid stop coordinate gives no pin and a note, never a guessed point", () => {
    const result = plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran");
    const broken = JSON.parse(JSON.stringify(pack)) as TransitPack;
    broken.stops.find((s) => s.id === "stop_lrt1_baclaran")!.point = { latitude: Number.NaN, longitude: 121 };
    const pins = buildTripPins(result.options[0]!, broken);
    assert.equal(pins.dropoff, null);
    assert.deepEqual(pins.pins.map((p) => p.stopId), ["stop_lrt1_vito_cruz"]);
    assert.ok(pins.missingCoordinate.includes("stop_lrt1_baclaran"));
    assert.ok(pins.legs.every((l) => l.polyline.every(([a, b]) => Number.isFinite(a) && Number.isFinite(b))));
  });

  it("a stop whose evidence is not verified is labelled unverified", () => {
    const result = plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran");
    const weaker = JSON.parse(JSON.stringify(pack)) as TransitPack;
    weaker.stops.find((s) => s.id === "stop_lrt1_baclaran")!.evidence.reliability = "estimated";
    const pins = buildTripPins(result.options[0]!, weaker);
    assert.equal(pins.dropoff?.verification, "unverified");
    assert.equal(pins.legs[0]!.verification, "unverified");
  });
});

describe("trip pins on the demo pack (test fixture)", () => {
  const pack = demoPack();

  it("Lipa to Candelaria: every pin and line is flagged unverified, with transfer pins between the jeepneys", () => {
    const result = plan(pack, "place_lipa_mcdo_la_salle", "place_candelaria_town_proper");
    const option: JourneyOption = result.options[0]!;
    const pins = buildTripPins(option, pack);
    assert.ok(pins.pins.length >= 3);
    assert.equal(pins.pins[0]!.kind, "board");
    assert.ok(pins.pins.slice(1, -1).every((p) => p.kind === "transfer"));
    assert.equal(pins.pins[pins.pins.length - 1]!.kind, "alight");
    assert.ok(pins.pins.every((p) => p.verification === "unverified"));
    assert.ok(pins.legs.every((l) => l.verification === "unverified" && l.approximate === true));
    assert.ok(pins.legs.some((l) => l.kind === "walk"), "the documented 150 m walk is drawn as an approximate line");
    assert.ok(pins.dropoff && pins.dropoff.verification === "unverified");
  });

  it("an LRT-1 stop is still unverified inside a test_fixture pack", () => {
    const result = plan(pack, "place_lrt1_vito_cruz", "place_lrt1_baclaran");
    const pins = buildTripPins(result.options[0]!, pack);
    assert.ok(pins.pins.every((p) => p.verification === "unverified"));
  });
});
