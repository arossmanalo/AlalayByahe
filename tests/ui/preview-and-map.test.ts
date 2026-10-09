// Software tests for the alert preview (simulated walk) and the optional Geoapify map picture.
// The preview replays invented positions through the real watcher; it proves nothing about real GPS.
// The map URL builder is checked against the documented request format only: no request to Geoapify
// was made in these tests, so a real key and a phone are still needed to see a map.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Evidence, JourneyOption, RideLeg, TransitPack } from "../../src/contracts";
import { validatePack } from "../../src/data/validatePack";
import { createDropoffWatcher } from "../../src/routing/dropoffProximity";
import { planRoute } from "../../src/routing/routePort";
import { buildTripPins } from "../../src/routing/tripPins";
import { createPreviewWatch, previewFixes } from "../../src/ui/alert-preview";
import { alertTargetFor, nextAlertStatus, vibrationFor, type AlertStatus, type AlertTarget, type LocationFix } from "../../src/ui/dropoff-alert";
import { strings, type UiLanguage } from "../../src/ui/i18n";
import { buildStaticMapUrl, shouldRefreshMap, STATIC_MAP_BASE } from "../../src/ui/trip-map-url";
import { NOW, prefs } from "../routing/helpers";

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const release = (() => {
  const r = validatePack(read("../../assets/data/release.json"), { target: "release" });
  if (!r.ok) throw new Error("release pack");
  return r.value;
})();
const demo = (() => {
  const r = validatePack(read("../../assets/demo/demo-pack.json"), { target: "development" });
  if (!r.ok) throw new Error("demo pack");
  return r.value;
})();

const evidence: Evidence = { sourceIds: [], checkedAt: "2026-10-10T00:00:00+08:00", reliability: "verified" };
const ride = (board: string, alight: string): RideLeg => ({
  kind: "ride", serviceId: "service_lrt1", directionId: "dir_lrt1_sb", mode: "lrt", serviceName: "LRT-1", headsign: "x",
  boardStopId: `stop_lrt1_${board}`, alightStopId: `stop_lrt1_${alight}`, boardLabel: board, alightLabel: alight,
  alreadyOnboard: false, fare: { status: "verified", minCentavos: 1500, maxCentavos: 1500, sourceIds: [], basis: "t" }, evidence,
});
const option = (...legs: RideLeg[]): JourneyOption => ({
  id: "o", legs, transfers: 0, walkMeters: 0,
  fare: { status: "complete", knownMinCentavos: 0, knownMaxCentavos: 0, unknownRideLegs: 0, sourceIds: [] },
  rankReason: "t", warnings: [], datasetVersion: "v",
});

const targetOf = (o: JourneyOption, pack: TransitPack, allowUnverified = false): AlertTarget => {
  const t = alertTargetFor(o, pack, { allowUnverified });
  assert.ok(t.ok, JSON.stringify(t));
  return (t as { ok: true; target: AlertTarget }).target;
};

describe("alert preview (simulated walk)", () => {
  it("walks far -> approaching -> arrived through the real watcher with one event each, for several ride lengths", () => {
    for (const [board, alight] of [["vito_cruz", "baclaran"], ["abad_santos", "r_papa"], ["dr_santos", "fernando_poe_jr"]] as const) {
      const target = targetOf(option(ride(board, alight)), release);
      const created = createDropoffWatcher({ target: target.point, ...target.thresholds });
      assert.ok(created.ok);
      if (!created.ok) return;
      const events: string[] = [];
      const states = new Set<string>();
      for (const fix of previewFixes(target)) {
        const u = created.value.update(fix);
        states.add(u.state);
        if (u.event) events.push(u.event);
        assert.equal(u.ignored, undefined, "every simulated fix is usable");
      }
      assert.deepEqual(events, ["approaching", "arrived"], `${board} to ${alight}`);
      assert.deepEqual([...states].sort(), ["approaching", "arrived", "far"], `${board} to ${alight}`);
    }
  });

  it("fixes are ordered, accurate and start farther than the warning distance", () => {
    const target = targetOf(option(ride("vito_cruz", "baclaran")), release);
    const fixes = previewFixes(target, 12, 1000);
    assert.equal(fixes.length, 12);
    assert.ok(fixes.every((f, i) => i === 0 || f.timestampMs > fixes[i - 1]!.timestampMs));
    assert.ok(fixes.every((f) => f.accuracyMeters <= 10));
    assert.ok(previewFixes(target, 3).length >= 10, "at least 10 steps so all three states appear");
  });

  it("the preview port needs no permission, replays the fixes on a schedule, and stop cancels the rest", async () => {
    const target = targetOf(option(ride("vito_cruz", "baclaran")), release);
    const queued: { fn: () => void; ms: number; cancelled: boolean }[] = [];
    const port = createPreviewWatch(target, {
      intervalMs: 100,
      steps: 10,
      schedule: (fn, ms) => {
        const item = { fn, ms, cancelled: false };
        queued.push(item);
        return () => { item.cancelled = true; };
      },
    });
    assert.equal(await port.requestPermission(), "granted");
    const got: LocationFix[] = [];
    const sub = await port.watch((f) => got.push(f), () => undefined);
    assert.equal(queued.length, 10);
    assert.deepEqual(queued.map((q) => q.ms), [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    queued.slice(0, 4).forEach((q) => q.fn());
    sub.stop();
    assert.ok(queued.slice(4).every((q) => q.cancelled));
    assert.equal(got.length, 4);
  });

  it("drives the alert state machine to arrived and produces the buzz patterns", () => {
    const target = targetOf(option(ride("vito_cruz", "baclaran")), release);
    const created = createDropoffWatcher({ target: target.point, ...target.thresholds });
    assert.ok(created.ok);
    if (!created.ok) return;
    let status: AlertStatus = nextAlertStatus(nextAlertStatus({ phase: "off" }, { type: "start" }), { type: "permission", outcome: "granted" });
    const buzzes: number[][] = [];
    for (const fix of previewFixes(target)) {
      const u = created.value.update(fix);
      status = nextAlertStatus(status, { type: "reading", state: u.state, distanceMeters: u.distanceMeters });
      const pattern = vibrationFor(u.event);
      if (pattern) buzzes.push(pattern);
    }
    assert.equal(status.phase, "arrived");
    assert.equal(buzzes.length, 2);
    assert.ok(buzzes[1]!.reduce((a, b) => a + b, 0) > buzzes[0]!.reduce((a, b) => a + b, 0), "arrival buzzes longer");
  });
});

describe("alert on demo (sample) locations", () => {
  const trip = () => {
    const res = planRoute(
      {
        queryId: "d",
        origin: { placeId: "place_test_cubao", label: "Cubao", point: { latitude: 14, longitude: 121 }, provenance: "stored" },
        destination: { placeId: "place_test_baguio", label: "Baguio", point: { latitude: 14, longitude: 121 }, provenance: "stored" },
        preferences: prefs(),
      },
      demo,
      { now: () => NOW },
    );
    assert.ok(res.ok);
    return (res as { ok: true; value: { options: JourneyOption[] } }).value.options[0]!;
  };

  it("is refused by default and allowed only when the demo build asks, marked as not verified", () => {
    assert.deepEqual(alertTargetFor(trip(), demo), { ok: false, reason: "unverified" });
    const allowed = alertTargetFor(trip(), demo, { allowUnverified: true });
    assert.ok(allowed.ok);
    if (allowed.ok) assert.equal(allowed.target.verified, false);
  });

  it("the release pack target is marked verified, and allowUnverified never relaxes the other refusals", () => {
    assert.equal(targetOf(option(ride("vito_cruz", "baclaran")), release).verified, true);
    assert.deepEqual(alertTargetFor(option(), release, { allowUnverified: true }), { ok: false, reason: "no_ride" });
    assert.deepEqual(alertTargetFor(option(ride("vito_cruz", "baclaran")), null, { allowUnverified: true }), { ok: false, reason: "no_coordinate" });
  });
});

describe("Geoapify static map URL", () => {
  const pins = () => {
    const res = planRoute(
      {
        queryId: "m",
        origin: { placeId: "place_lrt1_vito_cruz", label: "a", point: { latitude: 14, longitude: 121 }, provenance: "stored" },
        destination: { placeId: "place_lrt1_baclaran", label: "b", point: { latitude: 14, longitude: 121 }, provenance: "stored" },
        preferences: prefs(),
      },
      release,
      { now: () => NOW },
    );
    assert.ok(res.ok);
    return buildTripPins((res as { ok: true; value: { options: JourneyOption[] } }).value.options[0]!, release);
  };

  it("builds a documented request: longitude first, encoded colors, markers with | and a polyline", () => {
    const trip = pins();
    const url = buildStaticMapUrl({ apiKey: "KEY123", pins: trip.pins, lines: trip.legs })!;
    assert.ok(url.startsWith(`${STATIC_MAP_BASE}?style=osm-bright&width=640&height=400&marker=`));
    assert.match(url, /marker=lonlat:120\.99468,14\.56348;type:material;color:%232e7d32;size:large\|lonlat:120\.99800,14\.53390;type:material;color:%23c62828;size:x-large/);
    assert.match(url, /geometry=polyline:120\.99468,14\.56348,.*120\.99800,14\.53390;linewidth:5;linecolor:%231f63e6/);
    assert.ok(url.endsWith("&apiKey=KEY123"));
    assert.ok(!url.includes("#"), "colors are percent-encoded");
    assert.ok(url.length < 1900);
  });

  it("adds the position as a circle marker only when given, and drops invalid positions", () => {
    const trip = pins();
    const withYou = buildStaticMapUrl({ apiKey: "K", pins: trip.pins, lines: trip.legs, position: { latitude: 14.55, longitude: 120.996 } })!;
    assert.match(withYou, /\|lonlat:120\.99600,14\.55000;type:circle;color:%231f63e6;size:medium/);
    const bad = buildStaticMapUrl({ apiKey: "K", pins: trip.pins, lines: trip.legs, position: { latitude: Number.NaN, longitude: 1 } })!;
    assert.ok(!bad.includes("type:circle"));
  });

  it("returns null with no key, nothing to draw, or an impossibly long request; never throws on bad points", () => {
    const trip = pins();
    assert.equal(buildStaticMapUrl({ apiKey: "  ", pins: trip.pins, lines: trip.legs }), null);
    assert.equal(buildStaticMapUrl({ apiKey: "K", pins: [], lines: [] }), null);
    const long = buildStaticMapUrl({ apiKey: "K".repeat(2500), pins: trip.pins, lines: trip.legs });
    assert.equal(long, null);
    const noisy = buildStaticMapUrl({ apiKey: "K", pins: trip.pins, lines: [{ ...trip.legs[0]!, polyline: [[Number.NaN, 1], [14, 121]] }] })!;
    assert.ok(!noisy.includes("NaN"));
  });

  it("keeps a long route inside the URL limit by thinning the line", () => {
    const trip = pins();
    const many: [number, number][] = Array.from({ length: 60 }, (_, i) => [14 + i * 0.001, 121 + i * 0.001]);
    const url = buildStaticMapUrl({ apiKey: "K", pins: trip.pins, lines: [{ ...trip.legs[0]!, polyline: many }] })!;
    assert.ok(url.length < 1900);
    assert.equal((url.match(/polyline:([^;]*)/)![1]!.split(",").length) / 2, 12);
  });

  it("refreshes only after enough time and movement", () => {
    const a = { latitude: 14.5, longitude: 121 };
    const near = { latitude: 14.5001, longitude: 121 }; // about 11 m
    const far = { latitude: 14.502, longitude: 121 }; // about 222 m
    assert.equal(shouldRefreshMap(null, a, 0, 0), true, "first position always draws");
    assert.equal(shouldRefreshMap(a, far, 1000, 5000), false, "too soon");
    assert.equal(shouldRefreshMap(a, near, 0, 60_000), false, "barely moved");
    assert.equal(shouldRefreshMap(a, far, 0, 60_000), true);
    assert.equal(shouldRefreshMap(a, null, 0, 60_000), false);
  });
});

describe("copy for the preview and the map", () => {
  for (const lang of ["en", "fil"] as UiLanguage[]) {
    it(`${lang}: honest about simulation, internet use and attribution`, () => {
      const t = strings[lang];
      const all = [t.alertPreview, t.alertPreviewRunning, t.alertSampleLocation, t.mapTitle, t.mapDisclosure, t.mapShow, t.mapHide, t.mapNotInBuild, t.mapFailed, t.mapLegend, t.mapAttribution, t.mapA11y];
      const forbidden = /\bfastest\b|real[- ]?time|\blive\b|guarantee|garantisado|arriving now|darating na|\bETA\b|will arrive/i;
      for (const s of all) {
        assert.ok(s.trim().length > 5);
        assert.doesNotMatch(s, forbidden, s);
      }
      assert.match(t.alertPreviewRunning, lang === "en" ? /simulated.*not your real location/ : /gawa-gawang.*hindi ang tunay/);
      assert.match(t.mapDisclosure, lang === "en" ? /internet.*Geoapify/ : /internet.*Geoapify/);
      assert.match(t.mapAttribution, /Geoapify.*OpenStreetMap/);
      assert.match(t.mapLegend, lang === "en" ? /approximate, not the road/ : /tinatayang.*hindi ang kalsada/);
    });
  }
});
