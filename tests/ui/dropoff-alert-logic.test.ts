import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alertText,
  isListening,
  phaseAfterPermission,
  phaseAfterUpdate,
  phaseOnAppState,
  vibrationFor,
  VIBRATION_ARRIVED,
  VIBRATION_APPROACHING,
  type AlertPhase,
} from "../../src/ui/dropoff-alert-logic";
import { strings, type UiLanguage } from "../../src/ui/i18n";
import type { ProximityUpdate } from "../../src/routing/dropoffProximity";

/** Software tests of the alert's pure logic and copy. Nothing here has run on a phone. */

const LANGS: UiLanguage[] = ["en", "fil"];
const watching = (state: "far" | "approaching" | "arrived", distanceMeters = 500): AlertPhase => ({ kind: "watching", state, distanceMeters });

describe("permission outcomes", () => {
  it("denied location leaves alerts off and says whether the system can ask again", () => {
    assert.deepEqual(phaseAfterPermission({ granted: false, canAskAgain: true, servicesEnabled: true }), { kind: "denied", canAskAgain: true });
    assert.deepEqual(phaseAfterPermission({ granted: false, canAskAgain: false, servicesEnabled: true }), { kind: "denied", canAskAgain: false });
  });
  it("granted but location services off is unavailable; granted and on starts waiting for a fix", () => {
    assert.deepEqual(phaseAfterPermission({ granted: true, canAskAgain: true, servicesEnabled: false }), { kind: "unavailable" });
    assert.deepEqual(phaseAfterPermission({ granted: true, canAskAgain: true, servicesEnabled: true }), { kind: "waiting" });
  });
});

describe("phase after a proximity update", () => {
  const update = (over: Partial<ProximityUpdate>): ProximityUpdate => ({ state: "far", distanceMeters: 1200, ...over });

  it("moves from waiting to watching with the state and whole-meter distance", () => {
    assert.deepEqual(phaseAfterUpdate({ kind: "waiting" }, update({})), watching("far", 1200));
    assert.deepEqual(phaseAfterUpdate(watching("far"), update({ state: "approaching", distanceMeters: 700, event: "approaching" })), watching("approaching", 700));
    assert.deepEqual(phaseAfterUpdate(watching("approaching"), update({ state: "arrived", distanceMeters: 300, event: "arrived" })), watching("arrived", 300));
  });
  it("an ignored first fix keeps waiting; an ignored later fix keeps the last reading", () => {
    assert.deepEqual(phaseAfterUpdate({ kind: "waiting" }, { state: "far", distanceMeters: null, ignored: "low_accuracy" }), { kind: "waiting" });
    assert.deepEqual(phaseAfterUpdate(watching("approaching", 650), { state: "approaching", distanceMeters: 650, ignored: "stale_fix" }), watching("approaching", 650));
  });
  it("updates that arrive while off, denied, paused or unavailable change nothing", () => {
    for (const prev of [{ kind: "off" }, { kind: "asking" }, { kind: "paused" }, { kind: "unavailable" }, { kind: "denied", canAskAgain: true }] as AlertPhase[]) {
      assert.deepEqual(phaseAfterUpdate(prev, update({ state: "arrived", distanceMeters: 10, event: "arrived" })), prev);
    }
  });
});

describe("app state", () => {
  it("pauses a listening alert in the background and resumes to waiting when the app returns", () => {
    assert.deepEqual(phaseOnAppState({ kind: "waiting" }, "background"), { kind: "paused" });
    assert.deepEqual(phaseOnAppState(watching("far"), "inactive"), { kind: "paused" });
    assert.deepEqual(phaseOnAppState({ kind: "paused" }, "active"), { kind: "waiting" });
  });
  it("does not start or change anything that was not listening", () => {
    for (const prev of [{ kind: "off" }, { kind: "denied", canAskAgain: false }, { kind: "unavailable" }, { kind: "asking" }] as AlertPhase[]) {
      assert.deepEqual(phaseOnAppState(prev, "background"), prev);
      assert.deepEqual(phaseOnAppState(prev, "active"), prev);
    }
    assert.equal(isListening({ kind: "paused" }), false);
    assert.equal(isListening({ kind: "waiting" }), true);
  });
});

describe("vibration", () => {
  it("is a short pulse when approaching and a longer pattern on arrival, as copies", () => {
    assert.deepEqual(vibrationFor("approaching"), VIBRATION_APPROACHING);
    assert.deepEqual(vibrationFor("arrived"), VIBRATION_ARRIVED);
    assert.notEqual(vibrationFor("arrived"), VIBRATION_ARRIVED);
    const total = (p: number[]) => p.reduce((a, b) => a + b, 0);
    assert.ok(total(VIBRATION_ARRIVED) > total(VIBRATION_APPROACHING));
    assert.ok(total(VIBRATION_ARRIVED) < 5000);
  });
});

describe("alert copy", () => {
  for (const lang of LANGS) {
    const t = strings[lang];
    const phases: AlertPhase[] = [
      { kind: "asking" }, { kind: "denied", canAskAgain: true }, { kind: "denied", canAskAgain: false }, { kind: "unavailable" },
      { kind: "waiting" }, { kind: "paused" }, watching("far", 1500), watching("approaching", 700), watching("arrived", 250),
    ];

    it(`${lang}: every phase has visible text, off has none, and only approaching/arrived are announced assertively`, () => {
      assert.equal(alertText({ kind: "off" }, "Baclaran", t), null);
      for (const phase of phases) {
        const text = alertText(phase, "Baclaran", t)!;
        assert.ok(text.title.trim().length > 0);
        const expectAnnounce = phase.kind === "watching" && phase.state !== "far";
        assert.equal(text.announce, expectAnnounce);
      }
    });

    it(`${lang}: names the stop and shows the straight-line distance`, () => {
      const approaching = alertText(watching("approaching", 700), "Baclaran", t)!;
      assert.match(approaching.title, /Baclaran/);
      assert.ok(approaching.lines.some((l) => l.includes("700")));
      const arrived = alertText(watching("arrived", 250), "Baclaran", t)!;
      assert.match(arrived.title, /Baclaran/);
      assert.equal(arrived.tone, "success");
      assert.equal(approaching.tone, "warning");
    });

    it(`${lang}: points to phone settings only when the system cannot ask again`, () => {
      assert.deepEqual(alertText({ kind: "denied", canAskAgain: true }, "X", t)!.lines, []);
      assert.deepEqual(alertText({ kind: "denied", canAskAgain: false }, "X", t)!.lines, [t.alertDeniedSettings]);
    });

    it(`${lang}: never claims tracking, live data, arrival times or guarantees`, () => {
      const all = [
        t.alertTitle, t.alertIntro, t.alertStart, t.alertExplain, t.alertAllow, t.alertStop, t.alertDeniedSettings,
        t.alertUnverified, t.alertNoDropoff, t.alertLimits,
        ...phases.flatMap((p) => {
          const x = alertText(p, "Baclaran", t)!;
          return [x.title, ...x.lines];
        }),
      ];
      const forbidden = /\bfastest\b|\bquickest\b|pinakamabilis|real[- ]?time|\blive\b|guarantee|garantisado|arriving now|darating na|\bETA\b|will arrive|(?<!not )track(s|ing)? your (ride|vehicle|bus|train)/i;
      for (const s of all) assert.doesNotMatch(s, forbidden, s);
      assert.match(t.alertIntro, lang === "en" ? /does not track your vehicle/ : /Hindi nito sinusubaybayan/);
      assert.match(t.alertExplain, lang === "en" ? /stays on this phone/ : /Nananatili sa phone/);
    });
  }
});
