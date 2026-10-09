// Member 3 (ALERT-003): pure alert logic, presenter states and copy. The watcher here
// is a local stub of Member 2's planned createDropoffWatcher (ALERT-001), which has
// not merged yet; nothing here proves real GPS behaviour or alert distances.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Evidence, JourneyOption, RideLeg, TransitPack } from "../../src/contracts";
import {
  alertTargetFor,
  isWatching,
  nextAlertStatus,
  presentAlert,
  presentNoTarget,
  vibrationFor,
  type AlertStatus,
  type DropoffWatcher,
  type DropoffWatcherFactory,
  type LocationFix,
} from "../../src/ui/dropoff-alert";
import { strings, type UiLanguage } from "../../src/ui/i18n";

const releasePack = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "assets", "data", "release.json"), "utf8"),
) as TransitPack;
const evidence: Evidence = { sourceIds: [], checkedAt: "2026-10-10T00:00:00+08:00", reliability: "verified" };

function rideTo(alightStopId: string, alightLabel: string): RideLeg {
  return {
    kind: "ride", serviceId: "service_lrt1", directionId: "dir_lrt1_sb", mode: "lrt", serviceName: "LRT-1",
    headsign: "Dr. Santos", boardStopId: "stop_lrt1_edsa", alightStopId, boardLabel: "EDSA", alightLabel,
    alreadyOnboard: false, fare: { status: "verified", minCentavos: 1500, maxCentavos: 1500, sourceIds: [], basis: "test" },
    evidence,
  };
}
function optionWith(legs: JourneyOption["legs"]): JourneyOption {
  return {
    id: "opt_test", legs, transfers: 0, walkMeters: 0,
    fare: { status: "complete", knownMinCentavos: 1500, knownMaxCentavos: 1500, unknownRideLegs: 0, sourceIds: [] },
    rankReason: "test", warnings: [], datasetVersion: releasePack.version,
  };
}

/** Local stub of the planned ALERT-001 watcher: distance-only, for presenter/state tests. */
const stubWatcher: DropoffWatcherFactory = () => ({ ok: true, value: stubWatcherValue() });
function stubWatcherValue(): DropoffWatcher {
  let warned = false;
  let arrived = false;
  return {
    update(fix: LocationFix) {
      const d = fix.latitude; // the stub reads "distance" from latitude to keep tests readable
      if (d <= 400) {
        const event = arrived ? undefined : ("arrived" as const);
        arrived = true;
        return { state: "arrived", distanceMeters: d, event };
      }
      if (d <= 800) {
        const event = warned ? undefined : ("approaching" as const);
        warned = true;
        return { state: "approaching", distanceMeters: d, event };
      }
      return { state: "far" as const, distanceMeters: d };
    },
  };
}

describe("alert target (final drop-off)", () => {
  it("uses the final ride's alight stop when the reviewed release pack has its coordinates", () => {
    const r = alertTargetFor(optionWith([rideTo("stop_lrt1_vito_cruz", "Vito Cruz (LRT-1 platform)")]), releasePack);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.target.stopId, "stop_lrt1_vito_cruz");
      assert.deepEqual(r.target.point, { latitude: 14.563475, longitude: 120.99468 });
    }
  });

  it("never offers an alert for unverified (demo) data, a missing coordinate, or no ride", () => {
    const demo = { ...releasePack, kind: "test_fixture" } as TransitPack;
    const opt = optionWith([rideTo("stop_lrt1_vito_cruz", "Vito Cruz")]);
    assert.deepEqual(alertTargetFor(opt, demo), { ok: false, reason: "unverified" });
    assert.deepEqual(alertTargetFor(optionWith([rideTo("stop_unknown", "X")]), releasePack), { ok: false, reason: "no_coordinate" });
    assert.deepEqual(alertTargetFor(optionWith([]), releasePack), { ok: false, reason: "no_ride" });
    assert.deepEqual(alertTargetFor(opt, null), { ok: false, reason: "no_coordinate" });
  });
});

describe("alert status machine", () => {
  const run = (events: Parameters<typeof nextAlertStatus>[1][]) =>
    events.reduce<AlertStatus>((s, e) => nextAlertStatus(s, e), { phase: "off" });

  it("goes off -> asking -> waiting for a fix -> far -> approaching -> arrived", () => {
    assert.deepEqual(run([{ type: "start" }]), { phase: "asking" });
    assert.deepEqual(run([{ type: "start" }, { type: "permission", outcome: "granted" }]), { phase: "waiting_fix" });
    const arrived = run([
      { type: "start" }, { type: "permission", outcome: "granted" },
      { type: "reading", state: "far", distanceMeters: 2300.4 },
      { type: "reading", state: "approaching", distanceMeters: 700 },
      { type: "reading", state: "arrived", distanceMeters: 120 },
    ]);
    assert.deepEqual(arrived, { phase: "arrived", distanceMeters: 120 });
  });

  it("denied or unavailable location leaves the alert off and the journey untouched", () => {
    assert.deepEqual(run([{ type: "start" }, { type: "permission", outcome: "denied" }]), { phase: "denied" });
    assert.deepEqual(run([{ type: "start" }, { type: "permission", outcome: "unavailable" }]), { phase: "unavailable" });
    assert.deepEqual(run([{ type: "start" }, { type: "permission", outcome: "granted" }, { type: "watch_failed" }]), { phase: "unavailable" });
  });

  it("ignores readings without a usable distance and readings when not watching", () => {
    const waiting = run([{ type: "start" }, { type: "permission", outcome: "granted" }]);
    assert.deepEqual(nextAlertStatus(waiting, { type: "reading", state: "far", distanceMeters: Number.NaN }), waiting);
    // Member 2's watcher reports null for a fix ignored before the first accepted one.
    assert.deepEqual(nextAlertStatus(waiting, { type: "reading", state: "far", distanceMeters: null }), waiting);
    assert.deepEqual(nextAlertStatus({ phase: "off" }, { type: "reading", state: "arrived", distanceMeters: 10 }), { phase: "off" });
    assert.deepEqual(nextAlertStatus({ phase: "denied" }, { type: "reading", state: "arrived", distanceMeters: 10 }), { phase: "denied" });
  });

  it("pauses in the background and stops on Stop alerts", () => {
    const watching = run([{ type: "start" }, { type: "permission", outcome: "granted" }, { type: "reading", state: "far", distanceMeters: 900 }]);
    assert.deepEqual(nextAlertStatus(watching, { type: "background" }), { phase: "paused" });
    assert.deepEqual(nextAlertStatus({ phase: "off" }, { type: "background" }), { phase: "off" });
    assert.deepEqual(nextAlertStatus(watching, { type: "stop" }), { phase: "off" });
    assert.equal(isWatching(watching), true);
    assert.equal(isWatching({ phase: "paused" }), false);
  });

  it("a late permission answer after Stop alerts cannot restart watching", () => {
    assert.deepEqual(nextAlertStatus({ phase: "off" }, { type: "permission", outcome: "granted" }), { phase: "off" });
  });

  it("vibrates only on the watcher's one-time events, longer for arrival", () => {
    const created = stubWatcher({ target: { latitude: 0, longitude: 0 } });
    assert.ok(created.ok);
    const w = created.value;
    const events = [5000, 700, 650, 300, 250].map((d) => w.update({ latitude: d, longitude: 0, accuracyMeters: 10, timestampMs: d }).event);
    assert.deepEqual(events, [undefined, "approaching", undefined, "arrived", undefined]);
    assert.equal(vibrationFor(undefined), null);
    const short = vibrationFor("approaching")!;
    const long = vibrationFor("arrived")!;
    const total = (p: number[]) => p.reduce((a, b) => a + b, 0);
    assert.ok(total(long) > total(short));
  });
});

describe("alert presenter: every state", () => {
  const states: [string, AlertStatus][] = [
    ["off", { phase: "off" }],
    ["asking", { phase: "asking" }],
    ["denied", { phase: "denied" }],
    ["unavailable", { phase: "unavailable" }],
    ["no GPS fix", { phase: "waiting_fix" }],
    ["far", { phase: "far", distanceMeters: 2340 }],
    ["approaching", { phase: "approaching", distanceMeters: 640 }],
    ["arrived", { phase: "arrived", distanceMeters: 90 }],
    ["paused", { phase: "paused" }],
  ];

  for (const lang of ["en", "fil"] as UiLanguage[]) {
    const t = strings[lang];
    for (const [name, status] of states) {
      it(`${lang}: ${name} has visible text and a way out`, () => {
        const v = presentAlert(status, "Vito Cruz", t);
        assert.ok(v.title.trim().length > 0);
        // Stop alerts is visible whenever location is in use or an alert is showing.
        if (isWatching(status) || status.phase === "asking" || status.phase === "paused") assert.equal(v.showStop, true);
        // Off/denied/unavailable offer the start button again; nothing is stuck.
        if (["off", "denied", "unavailable"].includes(status.phase)) assert.equal(v.primary?.action, "start");
      });
    }
  }

  it("names the stop in approaching and arrived banners and announces them to TalkBack", () => {
    const t = strings.en;
    const near = presentAlert({ phase: "approaching", distanceMeters: 640 }, "Vito Cruz", t);
    const at = presentAlert({ phase: "arrived", distanceMeters: 90 }, "Vito Cruz", t);
    assert.equal(near.title, "You are near Vito Cruz.");
    assert.ok(near.announce?.includes("Vito Cruz"));
    assert.ok(at.announce?.includes("Vito Cruz"));
    assert.equal(at.tone, "danger");
  });

  it("shows a rounded straight-line distance while far, and asks for the station sign", () => {
    const t = strings.en;
    assert.match(presentAlert({ phase: "far", distanceMeters: 2340 }, "Vito Cruz", t).body ?? "", /About 2\.3 km from Vito Cruz \(straight-line/);
    assert.match(presentAlert({ phase: "far", distanceMeters: 456 }, "Vito Cruz", t).body ?? "", /About 460 m/);
    assert.match(presentAlert({ phase: "arrived", distanceMeters: 90 }, "Vito Cruz", t).body ?? "", /station sign/);
  });

  it("explains why there is no alert for unverified data", () => {
    assert.match(presentNoTarget("unverified", strings.en).body ?? "", /Unverified|unverified \(demo data\)/);
  });
});

describe("alert copy audit (ALERT-003)", () => {
  const alertCopy = (lang: UiLanguage) =>
    Object.entries(strings[lang])
      .filter(([key]) => key.startsWith("alert"))
      .map(([, v]) => (typeof v === "function" ? (v as (...a: string[]) => string)("Vito Cruz", "Vito Cruz") : String(v)));

  for (const lang of ["en", "fil"] as UiLanguage[]) {
    it(`${lang}: never implies vehicle tracking, live data, speed or an arrival time`, () => {
      const forbidden = /track|subaybay|\blive\b|real[- ]?time|arriving|darating|\bETA\b|minute|minuto|fastest|pinakamabilis/i;
      for (const s of alertCopy(lang)) assert.doesNotMatch(s, forbidden, s);
    });
  }

  it("says location stays on the phone and is only used while the app is open", () => {
    const explain = strings.en.alertExplain("Vito Cruz");
    assert.match(explain, /while the app is open/);
    assert.match(explain, /stays on this phone and is not saved or sent anywhere/);
    assert.equal(strings.en.alertDenied, "Alerts are off: location not allowed.");
    assert.equal(strings.en.alertPaused, "Alerts paused: app in background.");
    assert.equal(strings.en.alertStart, "Notify me near my stop");
  });
});

describe("wiring with Member 2's real watcher (ALERT-001)", () => {
  it("createDropoffWatcher satisfies the UI port and drives the alert states", async () => {
    const { createDropoffWatcher } = await import("../../src/routing/dropoffProximity");
    const factory: DropoffWatcherFactory = createDropoffWatcher; // compile-time contract check
    const vitoCruz = { latitude: 14.563475, longitude: 120.99468 };
    const created = factory({ target: vitoCruz });
    assert.ok(created.ok);
    const w = created.value;
    let status: AlertStatus = { phase: "waiting_fix" };
    const fix = (dLat: number, ts: number) => ({ latitude: vitoCruz.latitude + dLat, longitude: vitoCruz.longitude, accuracyMeters: 15, timestampMs: ts });
    const events: (string | undefined)[] = [];
    // ~2.2 km north, ~650 m, then twice ~100 m (debounce needs two fixes inside the radius).
    for (const [dLat, ts] of [[0.02, 1000], [0.006, 2000], [0.001, 3000], [0.0009, 4000]] as const) {
      const r = w.update(fix(dLat, ts));
      events.push(r.event);
      status = nextAlertStatus(status, { type: "reading", state: r.state, distanceMeters: r.distanceMeters });
    }
    assert.deepEqual(events, [undefined, "approaching", undefined, "arrived"]);
    assert.equal(status.phase, "arrived");
  });
});
