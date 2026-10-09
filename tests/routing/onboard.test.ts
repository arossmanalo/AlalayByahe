import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { OnboardContext, Result, RouteRequest, RouteResult, TransitPack } from "../../src/contracts/index";
import { parsePackJson } from "../../src/data/validatePack";
import { planRoute } from "../../src/routing/routePort";
import { NOW, dirId, mini, okValue, req, rides, stopId, trace, walks, type MiniSpec } from "./helpers";

const report = parsePackJson(readFileSync(new URL("../fixtures/transit-pack.json", import.meta.url), "utf8"), { target: "development" });
if (!report.ok || !report.pack) throw new Error("fixture pack must validate");
const FIXTURE: TransitPack = report.pack;

function onboardReq(from: string, to: string, directionId: string, nextStop: string, over = {}, confirmedAt = "2026-10-09T12:00:00+08:00"): RouteRequest {
  const base = req(from, to, over);
  const onboard: OnboardContext = { directionId, confirmedNextStopId: nextStop, confirmedAt };
  return { ...base, onboard };
}
const plan = (r: RouteRequest, pack: TransitPack): Result<RouteResult> => planRoute(r, pack, { now: () => NOW });

function expectError(result: Result<RouteResult>, code: string): { message: string; field: string | undefined } {
  assert.equal(result.ok, false, "expected a failure");
  if (result.ok) throw new Error("unreachable");
  assert.equal(result.error.code, code, result.error.message);
  return { message: result.error.message, field: result.error.detail?.field };
}

describe("continuing the current ride", () => {
  it("rides on to the legal alighting stop and walks the documented egress", () => {
    const r = okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid"), FIXTURE));
    assert.equal(r.options.length, 1);
    const o = r.options[0]!;
    assert.equal(trace(o), "R(001:mid>alight) W100");
    const ride = rides(o)[0]!;
    assert.equal(ride.alreadyOnboard, true);
    assert.match(ride.boardLabel, /^Currently onboard; next stop: /);
    assert.equal(o.transfers, 0);
  });

  it("never treats the current ride as free or already paid", () => {
    const o = okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid"), FIXTURE)).options[0]!;
    assert.equal(o.fare.status, "unknown");
    assert.equal(o.fare.unknownRideLegs, 1);
    assert.equal(rides(o)[0]!.fare.minCentavos, null);
    assert.match(rides(o)[0]!.fare.basis, /not confirmed/);
  });

  it("says the vehicle is not tracked", () => {
    const o = okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid"), FIXTURE)).options[0]!;
    assert.ok(o.warnings.some((w) => /not tracked/.test(w)));
  });

  it("transfers to another service downstream when the whole path is verified", () => {
    const o = okValue(plan(onboardReq("a", "c", "dir_test_001", "stop_test_mid"), FIXTURE)).options[0]!;
    assert.equal(trace(o), "R(001:mid>alight) W150 R(003:xfer>dest_drop) W100");
    assert.equal(o.transfers, 1, "the current ride plus one switch");
    assert.equal(o.fare.status, "partial");
    assert.equal(o.fare.knownMinCentavos, 1300);
    assert.equal(o.fare.unknownRideLegs, 1);
  });

  it("can alight at the very next stop when that is the destination", () => {
    const o = okValue(plan(onboardReq("a", "mid", "dir_test_001", "stop_test_mid"), FIXTURE)).options[0]!;
    assert.equal(trace(o), "R(001:mid>mid)");
  });

  it("chooses a later alighting stop over the next one when only the later one connects", () => {
    // Dropping at mid is possible but leads nowhere; the verified path continues to the end of the line.
    const o = okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_board"), FIXTURE)).options[0]!;
    assert.equal(rides(o)[0]!.alightStopId, "stop_test_alight");
  });
});

describe("only the full downstream path decides", () => {
  const crossing: MiniSpec = {
    lines: [{ svc: "a", mode: "bus", stops: ["s1", "s2", "s3"] }, { svc: "b", mode: "bus", stops: ["x1", "x2", "d"] }],
  };

  it("a crossing without a documented walk is not a transfer", () => {
    expectError(plan(onboardReq("s1", "d", dirId("a"), stopId("s2", "a")), mini(crossing)), "NO_VERIFIED_JOURNEY");
  });

  it("the same crossing works once a directed walk is documented, and only in that direction", () => {
    const linked = mini({ ...crossing, walks: [["s2", "x2", 100]] });
    const o = okValue(plan(onboardReq("s1", "d", dirId("a"), stopId("s2", "a")), linked)).options[0]!;
    assert.equal(trace(o), "R(a:s2_a>s2_a) W100 R(b:x2_b>d_b)");
    // Reverse is undocumented: riding b cannot be exchanged for a.
    expectError(plan(onboardReq("x1", "s3", dirId("b"), stopId("x2", "b")), linked), "NO_VERIFIED_JOURNEY");
  });

  it("does not offer a stop behind the confirmed next stop", () => {
    // q is behind the vehicle once the next stop is r; riding backwards is never inferred.
    const line = mini({ lines: [{ svc: "a", mode: "bus", stops: ["p", "q", "r"] }] });
    expectError(plan(onboardReq("p", "q", dirId("a"), stopId("r", "a")), line), "NO_VERIFIED_JOURNEY");
    okValue(plan(onboardReq("p", "q", dirId("a"), stopId("q", "a")), line));
  });

  it("can use an interchange even when the current line first heads away from the destination", () => {
    // Line "away" runs p -> far -> hub; "back" runs hub -> d. The only way to d is downstream via hub.
    const spec: MiniSpec = {
      lines: [{ svc: "away", mode: "bus", stops: ["p", "far", "hub"] }, { svc: "back", mode: "jeepney", stops: ["hub", "d"] }],
    };
    const o = okValue(plan(onboardReq("p", "d", dirId("away"), stopId("far", "away")), mini(spec))).options[0]!;
    assert.equal(trace(o), "R(away:far_away>hub_away) R(back:hub_back>d_back)");
    assert.equal(o.transfers, 1);
    assert.equal(walks(o).length, 0);
  });
});

describe("strict preferences still apply onboard", () => {
  it("direct-only allows continuing the current service but not a transfer", () => {
    okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid", { directOnly: true }), FIXTURE));
    const blocked = expectError(plan(onboardReq("a", "c", "dir_test_001", "stop_test_mid", { directOnly: true }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.match(blocked.message, /allow transfers/);
  });

  it("a budget cannot be certified because the current ride's fare is unknown", () => {
    const blocked = expectError(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid", { budgetCentavos: 1_000_000 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.equal(blocked.field, "preferences.budgetCentavos");
  });

  it("the mode allow-list governs later services, not the vehicle the passenger is already on", () => {
    okValue(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid", { allowedModes: ["jeepney"] }), FIXTURE));
    const c = okValue(plan(onboardReq("a", "c", "dir_test_001", "stop_test_mid", { allowedModes: ["jeepney"] }), FIXTURE)).options[0]!;
    assert.deepEqual(rides(c).map((x) => x.mode), ["bus", "jeepney"]);
    expectError(plan(onboardReq("a", "c", "dir_test_001", "stop_test_mid", { allowedModes: ["van"] }), FIXTURE), "CONSTRAINT_UNSATISFIED");
  });

  it("egress limits apply after the last onboard ride", () => {
    expectError(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid", { maxEgressWalkMeters: 99 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
  });
});

describe("confirmation is required", () => {
  it("asks for the service and next stop when the direction is unknown, suspended, or not documented", () => {
    for (const dir of ["dir_test_999", "dir_test_007"]) {
      const e = expectError(plan(onboardReq("a", "b", dir, "stop_test_mid"), FIXTURE), "NEEDS_CLARIFICATION");
      assert.equal(e.message, "Confirm your current service and next stop.");
      assert.equal(e.field, "onboard.directionId");
    }
  });

  it("asks for a stop ahead in this direction when the stop is not on it", () => {
    const e = expectError(plan(onboardReq("a", "b", "dir_test_001", "stop_test_xfer"), FIXTURE), "NEEDS_CLARIFICATION");
    assert.equal(e.message, "Select a stop ahead in this direction.");
    assert.equal(e.field, "onboard.confirmedNextStopId");
  });

  it("will not guess which pass of a loop the passenger is on", () => {
    const loop = mini({ lines: [{ svc: "l", mode: "jeepney", stops: ["a", "b", "c", "a", "d"] }] });
    const e = expectError(plan(onboardReq("a", "d", dirId("l"), stopId("a", "l")), loop), "NEEDS_CLARIFICATION");
    assert.match(e.message, /more than once/);
    okValue(plan(onboardReq("a", "d", dirId("l"), stopId("b", "l")), loop));
  });

  it("rejects an unusable confirmation time", () => {
    expectError(plan(onboardReq("a", "b", "dir_test_001", "stop_test_mid", {}, "just now"), FIXTURE), "INVALID_INPUT");
  });

  it("does not need a meaningful origin because the vehicle position is the confirmed stop", () => {
    okValue(plan(onboardReq("somewhere_unlisted", "b", "dir_test_001", "stop_test_mid"), FIXTURE));
  });

  it("still requires a known destination", () => {
    expectError(plan(onboardReq("a", "nowhere", "dir_test_001", "stop_test_mid"), FIXTURE), "PLACE_NOT_FOUND");
  });
});
