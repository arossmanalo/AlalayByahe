import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { TransitPack } from "../../src/contracts/index";
import { APP_LIMITS } from "../../src/application/config";
import { defaultPreferences } from "../../src/contracts/defaults";
import { validatePack } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";

// DEMO BUILD ONLY. scripts/build-demo-app-pack.ts refuses to write the pack unless all ordered pairs plan;
// this test re-checks a spread of pairs (every place as origin and as destination) and the pairs that used
// to fail before the islands were joined, with the demo build's computation guard.
const result = validatePack(JSON.parse(readFileSync("assets/demo/demo-pack.json", "utf8")), { target: "development" });
if (!result.ok) throw new Error("demo pack must validate");
const pack: TransitPack = result.value;
const byId = new Map(pack.places.map(p => [p.id, p] as const));
const endpoint = (id: string) => {
  const p = byId.get(id)!;
  return { placeId: id, label: p.name, point: p.point, provenance: "stored" as const };
};
const plan = (from: string, to: string) => planRoute(
  { queryId: "demo_pair", origin: endpoint(from), destination: endpoint(to), preferences: defaultPreferences() },
  pack, { now: () => Date.parse("2026-10-10T12:00:00+08:00"), labelLimit: APP_LIMITS.demoRoutingLabelLimit });

test("every demo place reaches and is reached from places across the whole demo network", () => {
  const ids = pack.places.map(p => p.id);
  const failures: string[] = [];
  ids.forEach((from, i) => {
    for (const step of [1, 7, 23, 41]) {
      const to = ids[(i + step) % ids.length]!;
      const r = plan(from, to);
      if (!r.ok) failures.push(`${from} -> ${to}: ${r.error.code}`);
    }
  });
  assert.deepEqual(failures, []);
});

test("pairs that were separate islands now have a journey", () => {
  for (const [from, to] of [
    ["place_candelaria_town_proper", "place_lipa_mcdo_la_salle"],   // reverse of a one-way road draft
    ["place_lrt1_dr_santos", "place_test_baguio"],                   // real LRT-1 to the invented network
    ["place_test_baguio", "place_lrt1_vito_cruz"],
    ["place_san_pablo_puregold", "place_lipa_van_terminal"],         // reverse of the van draft
    ["place_lrt1_pitx", "place_pitx_terminal"],
  ] as const) {
    assert.ok(byId.has(from) && byId.has(to), `${from} and ${to} exist`);
    const r = plan(from, to);
    assert.equal(r.ok, true, `${from} -> ${to}: ${r.ok ? "" : r.error.code}`);
  }
});

test("demo connectors are labelled invented, estimated, and never in the release pack", () => {
  const connectorServices = pack.services.filter(s => s.id.startsWith("service_test_demo_link_"));
  const connectorWalks = pack.walkLinks.filter(w => w.id.startsWith("walk_test_demo_link_"));
  assert.ok(connectorServices.length + connectorWalks.length > 0);
  for (const s of connectorServices) {
    assert.match(s.name, /^DEMO connector \(invented\)/);
    assert.equal(s.evidence.reliability, "estimated");
  }
  for (const w of connectorWalks) {
    assert.match(w.steps[0]!, /^DEMO connector \(invented\)/);
    assert.equal(w.evidence.reliability, "estimated");
  }
  const release = readFileSync("assets/data/release.json", "utf8");
  assert.doesNotMatch(release, /demo_link|DEMO connector/);
});
