import { test } from "node:test";
import assert from "node:assert/strict";
import { validateExtractInput, validateRawIntent, validateRouteRequest, validateRouteResult, validateTransitPack } from "../../src/contracts/validators";
import { planRoute } from "../../src/routing/routePort";
import { mini } from "../routing/helpers";
import { errorCode, intent, NOW, pack, request, value } from "./helpers";
test("strict RawIntent accepts the canonical object", () => assert.equal(validateRawIntent(intent()).ok, true));
for (const [name, change] of [
  ["unknown field", (v: Record<string, unknown>) => { v.routes = []; }],
  ["missing nullable field", (v: Record<string, unknown>) => { delete v.budgetCentavos; }],
  ["string boolean", (v: Record<string, unknown>) => { v.directOnly = "false"; }],
  ["unknown mode", (v: Record<string, unknown>) => { v.allowedModes = ["taxi"]; }],
  ["duplicate modes", (v: Record<string, unknown>) => { v.excludedModes = ["bus", "bus"]; }],
  ["fractional centavos", (v: Record<string, unknown>) => { v.budgetCentavos = 10.5; }],
  ["negative walking limit", (v: Record<string, unknown>) => { v.maxAccessWalkMeters = -1; }],
] as const) test("RawIntent rejects " + name, () => {
  const v = intent() as unknown as Record<string, unknown>; change(v);
  assert.equal(errorCode(validateRawIntent(v)), "AI_INVALID_OUTPUT");
});
test("input limits reject blank, long, and excess context before inference", () => {
  const v = { queryId: "q", text: "x", locale: "taglish", knownPlaceLabels: [] };
  for (const bad of [{ ...v, text: " " }, { ...v, text: "x".repeat(601) }, { ...v, knownPlaceLabels: Array(31).fill("place") }]) {
    assert.equal(errorCode(validateExtractInput(bad)), "INVALID_INPUT");
  }
});
test("release validation rejects synthetic data and broken references", () => {
  assert.equal(errorCode(validateTransitPack(pack())), "DATA_INVALID");
  const broken = structuredClone(pack()); broken.stops[0]!.placeId = "place_missing";
  assert.equal(errorCode(validateTransitPack(broken, { allowTestFixtures: true })), "DATA_INVALID");
});
test("stored endpoint coordinates must match the installed pack", () => {
  const data = pack(), req = request(data); req.origin.point.latitude += 0.1;
  assert.equal(errorCode(validateRouteRequest(req, data)), "INVALID_INPUT");
});
test("onboard origin must be the manually confirmed next legal stop", () => {
  const data = pack(), req = request(data);
  req.onboard = { directionId: "dir_test_bus", confirmedNextStopId: "stop_test_b_bus", confirmedAt: "2026-10-09T21:00:00+08:00" };
  assert.equal(errorCode(validateRouteRequest(req, data)), "INVALID_INPUT");
  req.origin = request(data, "b").origin; assert.equal(validateRouteRequest(req, data).ok, true);
});
test("real routing output passes the shared output boundary", () => {
  const data = pack(), req = request(data), out = value(planRoute(req, data, { now: () => NOW }));
  assert.equal(validateRouteResult(out, req, data).ok, true);
});
for (const name of ["query", "dataset", "incomplete", "unknown fare as zero", "subtotal", "excluded mode", "direct", "budget"]) {
  test("output guard rejects " + name, () => {
    const data = pack(), req = request(data), out = structuredClone(value(planRoute(req, data, { now: () => NOW })));
    const option = out.options[0]!;
    if (name === "query") out.queryId = "other";
    if (name === "dataset") option.datasetVersion = "other";
    if (name === "incomplete") option.legs.pop();
    if (name === "unknown fare as zero") {
      const ride = option.legs.find(l => l.kind === "ride" && l.fare.status === "unknown");
      if (ride?.kind === "ride") ride.fare.minCentavos = 0;
    }
    if (name === "subtotal") option.fare.knownMinCentavos++;
    if (name === "excluded mode") req.preferences.allowedModes = ["bus"];
    if (name === "direct") req.preferences.directOnly = true;
    if (name === "budget") req.preferences.budgetCentavos = 10000;
    assert.equal(errorCode(validateRouteResult(out, req, data)), "DATA_INVALID");
  });
}
test("output guard verifies directed walks and combined walking limits", () => {
  const data = mini({ lines: [{ svc: "bus", mode: "bus", stops: ["a", "b"], fare: { flat: 100 } }],
    places: ["origin", "dest"], walks: [["origin", "a", 50], ["b", "dest", 70]] });
  const req = request(data, "origin", "dest"), out = value(planRoute(req, data, { now: () => NOW }));
  assert.equal(validateRouteResult(out, req, data).ok, true);
  req.preferences.maxAccessWalkMeters = 49;
  assert.equal(errorCode(validateRouteResult(out, req, data)), "DATA_INVALID");
});
test("onboard continuation passes even when its mode is excluded from future boardings", () => {
  const data = mini({ lines: [{ svc: "bus", mode: "bus", stops: ["a", "b", "c"] }] });
  const req = request(data, "b", "c"); req.preferences.allowedModes = ["jeepney"];
  req.onboard = { directionId: "dir_test_bus", confirmedNextStopId: "stop_test_b_bus", confirmedAt: "2026-10-09T21:00:00+08:00" };
  const out = value(planRoute(req, data, { now: () => NOW }));
  assert.equal(validateRouteRequest(req, data).ok, true);
  assert.equal(validateRouteResult(out, req, data).ok, true);
});
test("loop rides use a forward occurrence pair", () => {
  const data = mini({ lines: [{ svc: "loop", mode: "bus", stops: ["a", "b", "c", "a"] }] });
  const req = request(data, "c", "a"), out = value(planRoute(req, data, { now: () => NOW }));
  assert.equal(validateRouteResult(out, req, data).ok, true);
  req.onboard = { directionId: "dir_test_loop", confirmedNextStopId: "stop_test_a_loop", confirmedAt: "2026-10-09T21:00:00+08:00" };
  assert.equal(errorCode(validateRouteRequest(req, data)), "INVALID_INPUT");
});
