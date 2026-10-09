// ALERT-003 follow-ups (Member 2's assistant, at the user's request): ride-sized distances, approximate-only
// location, weak-GPS counting and the adapter between the routing watcher and the UI. Software tests only;
// nothing here has run on a phone.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Evidence, JourneyOption, RideLeg, TransitPack } from "../../src/contracts";
import {
  alertTargetFor,
  isWeakSignal,
  nextAlertStatus,
  nextWeakCount,
  presentAlert,
  presentNoTarget,
  WEAK_SIGNAL_FIXES,
  type AlertStatus,
} from "../../src/ui/dropoff-alert";
import { createDropoffWatcher } from "../../src/ui/dropoff-watcher";
import { strings, type UiLanguage } from "../../src/ui/i18n";

const pack = JSON.parse(readFileSync(new URL("../../assets/data/release.json", import.meta.url), "utf8")) as TransitPack;
const evidence: Evidence = { sourceIds: [], checkedAt: "2026-10-10T00:00:00+08:00", reliability: "verified" };

const ride = (board: string, alight: string): RideLeg => ({
  kind: "ride", serviceId: "service_lrt1", directionId: "dir_lrt1_sb", mode: "lrt", serviceName: "LRT-1", headsign: "x",
  boardStopId: `stop_lrt1_${board}`, alightStopId: `stop_lrt1_${alight}`, boardLabel: board, alightLabel: alight,
  alreadyOnboard: false, fare: { status: "verified", minCentavos: 1500, maxCentavos: 1500, sourceIds: [], basis: "t" }, evidence,
});
const option = (...legs: RideLeg[]): JourneyOption => ({
  id: "o", legs, transfers: 0, walkMeters: 0,
  fare: { status: "complete", knownMinCentavos: 0, knownMaxCentavos: 0, unknownRideLegs: 0, sourceIds: [] },
  rankReason: "t", warnings: [], datasetVersion: pack.version,
});

describe("alert target sized to the final ride", () => {
  it("a long ride gets the full default distances; a one-stop ride gets smaller ones", () => {
    const long = alertTargetFor(option(ride("vito_cruz", "baclaran")), pack);
    assert.ok(long.ok);
    if (long.ok) assert.deepEqual(long.target.thresholds, { radiusMeters: 400, warnMeters: 800 });
    const oneStop = alertTargetFor(option(ride("abad_santos", "r_papa")), pack);
    assert.ok(oneStop.ok);
    if (oneStop.ok) {
      const { radiusMeters, warnMeters } = oneStop.target.thresholds!;
      assert.ok(radiusMeters < 400 && warnMeters < 800);
      assert.ok(warnMeters < 616, "the warning distance is shorter than the shortest LRT-1 ride");
    }
  });

  it("the final ride decides, not the whole journey", () => {
    const t = alertTargetFor(option(ride("dr_santos", "baclaran"), ride("baclaran", "edsa")), pack);
    assert.ok(t.ok);
    if (t.ok) assert.ok(t.target.thresholds!.warnMeters <= 310, "a 619 m final ride, not the long first ride");
  });

  it("offers no alert for a ride too short to be useful, and says so in both languages", () => {
    const close = JSON.parse(JSON.stringify(pack)) as TransitPack;
    const from = close.stops.find((s) => s.id === "stop_lrt1_edsa")!;
    const to = close.stops.find((s) => s.id === "stop_lrt1_baclaran")!;
    to.point = { latitude: from.point.latitude + 0.001, longitude: from.point.longitude }; // about 111 m
    const result = alertTargetFor(option(ride("edsa", "baclaran")), close);
    assert.deepEqual(result, { ok: false, reason: "too_short" });
    for (const lang of ["en", "fil"] as UiLanguage[]) {
      const view = presentNoTarget("too_short", strings[lang]);
      assert.equal(view.body, strings[lang].alertNoTargetShort);
      assert.equal(view.primary, null);
    }
  });

  it("falls back to the default distances when the board stop has no coordinate", () => {
    const broken = JSON.parse(JSON.stringify(pack)) as TransitPack;
    broken.stops.find((s) => s.id === "stop_lrt1_vito_cruz")!.point = { latitude: Number.NaN, longitude: 121 };
    const t = alertTargetFor(option(ride("vito_cruz", "baclaran")), broken);
    assert.ok(t.ok);
    if (t.ok) assert.equal(t.target.thresholds, undefined);
  });
});

describe("approximate-only location", () => {
  it("is its own status that does not watch, offers another try, and explains the fix", () => {
    const status = [{ type: "start" as const }, { type: "permission" as const, outcome: "approximate" as const }].reduce<AlertStatus>(
      (s, e) => nextAlertStatus(s, e), { phase: "off" });
    assert.deepEqual(status, { phase: "approximate" });
    for (const lang of ["en", "fil"] as UiLanguage[]) {
      const t = strings[lang];
      const v = presentAlert(status, "Baclaran", t);
      assert.equal(v.title, t.alertApproximate);
      assert.equal(v.body, t.alertApproximateHelp);
      assert.equal(v.primary?.action, "start");
      assert.equal(v.showStop, false);
    }
  });
});

describe("weak GPS signal", () => {
  it("counts low-accuracy fixes, ignores other ignored fixes, and resets on a usable one", () => {
    let n = 0;
    for (let i = 0; i < WEAK_SIGNAL_FIXES - 1; i += 1) n = nextWeakCount(n, "low_accuracy");
    assert.equal(isWeakSignal(n), false);
    n = nextWeakCount(n, "low_accuracy");
    assert.equal(isWeakSignal(n), true);
    assert.equal(nextWeakCount(n, "stale_fix"), n);
    assert.equal(nextWeakCount(n, "invalid_fix"), n);
    assert.equal(nextWeakCount(n, undefined), 0);
  });
});

describe("routing watcher adapter", () => {
  const T = { latitude: 14.5339, longitude: 120.998 };
  const north = (m: number) => ({ latitude: T.latitude + m / 111_195, longitude: T.longitude });

  it("passes events through, reports ignored fixes with a reason, and accepts ride-sized options", () => {
    const w = createDropoffWatcher({ target: T, radiusMeters: 150, warnMeters: 300 });
    const fix = (m: number, over = {}) => ({ ...north(m), accuracyMeters: 10, timestampMs: 0, ...over });
    let ts = 0;
    const next = (m: number, over = {}) => w.update(fix(m, { timestampMs: (ts += 5000), ...over }));
    assert.equal(next(900).event, undefined);
    assert.equal(next(250).event, "approaching");
    const weak = next(100, { accuracyMeters: 500 });
    assert.equal(weak.ignored, "low_accuracy");
    assert.equal(weak.event, undefined);
    assert.equal(weak.state, "approaching", "an ignored fix repeats the last accepted state and distance");
    assert.ok(Number.isFinite(weak.distanceMeters));
    const first = createDropoffWatcher({ target: T });
    const none = first.update({ ...north(100), accuracyMeters: 500, timestampMs: 1 });
    assert.ok(Number.isNaN(none.distanceMeters), "no usable fix yet means no distance");
    assert.equal(none.ignored, "low_accuracy");
    assert.equal(next(100).event, undefined);
    assert.equal(next(90).event, "arrived");
  });

  it("throws a clear error for invalid options so the card can show 'Alerts are off'", () => {
    assert.throws(() => createDropoffWatcher({ target: { latitude: Number.NaN, longitude: 1 } }), /latitude/i);
  });
});

describe("new alert copy", () => {
  for (const lang of ["en", "fil"] as UiLanguage[]) {
    it(`${lang}: honest, no tracking, live or arrival-time claims`, () => {
      const t = strings[lang];
      const all = [t.alertNoTargetShort, t.alertApproximate, t.alertApproximateHelp, t.alertWeakSignal, t.alertWeakSignalShort, t.alertScreenOn];
      const forbidden = /\bfastest\b|real[- ]?time|\blive\b|guarantee|garantisado|arriving now|darating na|\bETA\b|will arrive/i;
      for (const s of all) {
        assert.ok(s.trim().length > 20);
        assert.doesNotMatch(s, forbidden, s);
      }
      assert.match(t.alertScreenOn, lang === "en" ? /battery/ : /baterya/);
      assert.match(t.alertScreenOn, lang === "en" ? /power button/ : /power button/);
    });
  }
});
