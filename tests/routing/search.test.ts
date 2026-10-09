import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Result, RouteRequest, RouteResult, TransitPack } from "../../src/contracts/index";
import { parsePackJson } from "../../src/data/validatePack";
import { createRoutePort, planRoute } from "../../src/routing/routePort";
import { NOW, mini, okValue, req, rides, trace, walks, type MiniSpec } from "./helpers";

const fixtureReport = parsePackJson(readFileSync(new URL("../fixtures/transit-pack.json", import.meta.url), "utf8"), { target: "development" });
if (!fixtureReport.ok || !fixtureReport.pack) throw new Error("fixture pack must validate");
const FIXTURE: TransitPack = fixtureReport.pack;

const plan = (r: RouteRequest, pack: TransitPack, opts: { labelLimit?: number } = {}): Result<RouteResult> =>
  planRoute(r, pack, { now: () => NOW, ...opts });

function expectError(result: Result<RouteResult>, code: string): { message: string; field: string | undefined } {
  assert.equal(result.ok, false, "expected a failure");
  if (result.ok) throw new Error("unreachable");
  assert.equal(result.error.code, code, result.error.message);
  return { message: result.error.message, field: result.error.detail?.field };
}

const T = (s: string): string => s; // readability marker for trace strings

describe("synthetic fixture: zero and one transfer", () => {
  it("returns the walk-ride-walk journey from the contract example, bus first, van as a distinct alternative", () => {
    const r = okValue(plan(req("a", "b"), FIXTURE));
    assert.deepEqual(r.options.map(trace), [
      T("W100 R(001:board>alight) W100"),
      T("W100 R(006:board>alight) W100"),
    ]);
    const bus = r.options[0]!;
    assert.equal(bus.transfers, 0);
    assert.equal(bus.walkMeters, 200);
    assert.equal(bus.fare.status, "unknown");
    assert.equal(bus.fare.unknownRideLegs, 1);
    assert.equal(bus.datasetVersion, "test_fixture_1");
    const van = r.options[1]!;
    assert.equal(van.fare.status, "complete");
    assert.equal(van.fare.knownMinCentavos, 6000);
    assert.ok(van.warnings.some((w) => /estimate/i.test(w)));
    assert.deepEqual(rides(bus)[0]!.headsign, "TEST ONLY Eastbound");
    assert.equal(r.queryId, "test_query");
    assert.ok(r.coverageWarnings.some((w) => /documented, not live/.test(w)));
  });

  it("finds the one-transfer journey with walking evidence at every join and charges once per boarding", () => {
    const r = okValue(plan(req("a", "c"), FIXTURE));
    assert.deepEqual(r.options.map(trace), [
      T("W100 R(001:board>alight) W150 R(003:xfer>dest_drop) W100"),
      T("W100 R(006:board>alight) W150 R(003:xfer>dest_drop) W100"),
    ]);
    const viaBus = r.options[0]!;
    assert.equal(viaBus.transfers, 1);
    assert.equal(viaBus.walkMeters, 350);
    assert.equal(viaBus.fare.status, "partial");
    assert.equal(viaBus.fare.knownMinCentavos, 1300);
    assert.equal(viaBus.fare.unknownRideLegs, 1);
    assert.ok(viaBus.warnings.some((w) => /Known subtotal only/.test(w)));
    const viaVan = r.options[1]!;
    assert.equal(viaVan.fare.status, "complete");
    assert.equal(viaVan.fare.knownMinCentavos, 7300);
    assert.equal(viaVan.fare.knownMaxCentavos, 7300);
  });

  it("applies the documented student discount to the correct ride only", () => {
    const r = okValue(plan(req("a", "c", { passenger: "student" }), FIXTURE));
    const jeep = rides(r.options[1]!)[1]!;
    assert.equal(jeep.fare.minCentavos, 1040);
    const van = rides(r.options[1]!)[0]!;
    assert.match(van.fare.basis, /No student discount is documented/);
    assert.equal(van.fare.status, "estimated");
  });

  it("keeps a documented tricycle range as a range", () => {
    const r = okValue(plan(req("a", "trike_drop"), FIXTURE));
    const trike = rides(r.options[1]!)[1]!;
    assert.equal(trike.mode, "tricycle");
    assert.equal(trike.fare.minCentavos, 1500);
    assert.equal(trike.fare.maxCentavos, 2500);
    assert.equal(r.options[1]!.fare.knownMinCentavos, 7500);
    assert.equal(r.options[1]!.fare.knownMaxCentavos, 8500);
  });

  it("finds a two-transfer journey that needs a longer transfer walk only when the user allows it", () => {
    const strictResult = plan(req("a", "lrt_3"), FIXTURE);
    const blocked = expectError(strictResult, "CONSTRAINT_UNSATISFIED");
    assert.match(blocked.message, /allow longer walks/);
    assert.equal(blocked.field, "preferences.maxWalkMeters");
    const r = okValue(plan(req("a", "lrt_3", { maxTransferWalkMeters: 1300, maxEgressWalkMeters: 1300 }), FIXTURE));
    assert.equal(r.options[0]!.transfers, 2);
    assert.deepEqual(rides(r.options[0]!).map((x) => x.mode), ["bus", "jeepney", "lrt"]);
    assert.equal(rides(r.options[0]!)[2]!.fare.minCentavos, 2000);
  });
});

describe("direction is never inferred", () => {
  it("rides the separately documented westbound record", () => {
    const r = okValue(plan(req("alight", "board"), FIXTURE));
    assert.deepEqual(r.options.map(trace), [T("R(002:alight>board)")]);
    assert.equal(r.options.length, 1, "the suspended van direction must not appear");
    assert.equal(rides(r.options[0]!)[0]!.headsign, "TEST ONLY Westbound");
    assert.equal(rides(r.options[0]!)[0]!.directionId, "dir_test_002");
  });

  it("alights mid-route only where the westbound record permits it", () => {
    const r = okValue(plan(req("alight", "mid"), FIXTURE));
    assert.equal(rides(r.options[0]!)[0]!.alightStopId, "stop_test_mid");
  });

  it("does not reverse a documented walk or ride", () => {
    expectError(plan(req("b", "a"), FIXTURE), "NO_VERIFIED_JOURNEY");
    // The transfer walk alight -> xfer is documented one way only.
    expectError(plan(req("xfer", "alight"), FIXTURE), "NO_VERIFIED_JOURNEY");
  });
});

describe("strict preferences are never relaxed silently", () => {
  it("applies a mode allow-list and explains what would change the outcome", () => {
    const vanOnly = okValue(plan(req("a", "b", { allowedModes: ["van"] }), FIXTURE));
    assert.deepEqual(vanOnly.options.map(trace), [T("W100 R(006:board>alight) W100")]);
    const none = expectError(plan(req("a", "b", { allowedModes: ["jeepney"] }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.match(none.message, /allow other transport modes/);
    assert.equal(none.field, "preferences.allowedModes");
  });

  it("direct-only never adds a transfer", () => {
    okValue(plan(req("a", "b", { directOnly: true }), FIXTURE));
    const blocked = expectError(plan(req("a", "c", { directOnly: true }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.match(blocked.message, /allow transfers/);
  });

  it("walking limits are inclusive and checked per access, transfer and egress", () => {
    okValue(plan(req("a", "b", { maxAccessWalkMeters: 100, maxEgressWalkMeters: 100 }), FIXTURE));
    expectError(plan(req("a", "b", { maxAccessWalkMeters: 99 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    expectError(plan(req("a", "b", { maxEgressWalkMeters: 99 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    okValue(plan(req("a", "c", { maxTransferWalkMeters: 150 }), FIXTURE));
    expectError(plan(req("a", "c", { maxTransferWalkMeters: 149 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
  });

  it("separates transfer and egress limits", () => {
    // Egress to c is 100 m and the transfer walk is 150 m; each limit applies only to its own walk.
    okValue(plan(req("a", "c", { maxTransferWalkMeters: 150, maxEgressWalkMeters: 100 }), FIXTURE));
    expectError(plan(req("a", "c", { maxTransferWalkMeters: 150, maxEgressWalkMeters: 99 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
  });

  it("a budget cannot be certified against unknown fares", () => {
    // Only the van variant has a fully known fare (6000).
    const ok = okValue(plan(req("a", "b", { budgetCentavos: 6000 }), FIXTURE));
    assert.deepEqual(ok.options.map(trace), [T("W100 R(006:board>alight) W100")]);
    const over = expectError(plan(req("a", "b", { budgetCentavos: 5999 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.equal(over.field, "preferences.budgetCentavos");
    // Bus-only has an unknown fare, so no budget can be certified. Either allowing the van
    // or dropping the budget would give a journey, so both are named and no single field is blamed.
    const unknownOnly = expectError(plan(req("a", "b", { allowedModes: ["bus"], budgetCentavos: 100000 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    assert.match(unknownOnly.message, /allow other transport modes or remove the budget/);
    assert.equal(unknownOnly.field, undefined);
  });

  it("reports NO_VERIFIED_JOURNEY, not a constraint failure, when the data never connects the places", () => {
    expectError(plan(req("a", "lrt_1", { maxAccessWalkMeters: 10 }), FIXTURE), "CONSTRAINT_UNSATISFIED");
    expectError(plan(req("lrt_1", "a"), FIXTURE), "NO_VERIFIED_JOURNEY");
  });
});

describe("graph shapes", () => {
  const conn = (spec: MiniSpec, from: string, to: string, over = {}) => plan(req(from, to, over), mini(spec));

  it("prefers the nearest terminal that actually connects, not the nearest terminal", () => {
    const spec: MiniSpec = {
      lines: [{ svc: "a", mode: "bus", stops: ["t1", "x"] }, { svc: "b", mode: "bus", stops: ["t2", "d"] }],
      walks: [["o", "t1", 100], ["o", "t2", 400]],
    };
    const r = okValue(conn(spec, "o", "d"));
    assert.deepEqual(r.options.map(trace), [T("W400 R(b:t2_b>d_b)")]);
  });

  it("trades access walk against transfers according to priority", () => {
    const spec: MiniSpec = {
      lines: [
        { svc: "e", mode: "jeepney", stops: ["p", "m"] },
        { svc: "f", mode: "jeepney", stops: ["m", "d"] },
        { svc: "dd", mode: "bus", stops: ["q", "d"] },
      ],
      walks: [["o", "p", 100], ["o", "q", 600]],
    };
    const near = okValue(conn(spec, "o", "d", { priority: "nearest_useful" }));
    assert.deepEqual(near.options.map(trace), [
      T("W100 R(e:p_e>m_e) R(f:m_f>d_f)"),
      T("W600 R(dd:q_dd>d_dd)"),
    ]);
    const few = okValue(conn(spec, "o", "d", { priority: "fewest_transfers" }));
    assert.deepEqual(few.options.map(trace), [
      T("W600 R(dd:q_dd>d_dd)"),
      T("W100 R(e:p_e>m_e) R(f:m_f>d_f)"),
    ]);
    assert.equal(near.options[0]!.transfers, 1);
    assert.equal(few.options[0]!.transfers, 0);
  });

  it("does not cap the number of transfers", () => {
    const lines = [1, 2, 3, 4, 5, 6].map((i) => ({ svc: `s${i}`, mode: "jeepney" as const, stops: [`c${i - 1}`, `c${i}`] }));
    const r = okValue(conn({ lines }, "c0", "c6"));
    assert.equal(r.options.length, 1);
    assert.equal(r.options[0]!.transfers, 5);
    assert.equal(rides(r.options[0]!).length, 6);
  });

  it("allows a zero-meter transfer only between stops that share a place", () => {
    const shared = okValue(conn({ lines: [{ svc: "a", mode: "bus", stops: ["p", "m"] }, { svc: "b", mode: "bus", stops: ["m", "d"] }] }, "p", "d"));
    assert.equal(shared.options[0]!.transfers, 1);
    assert.equal(walks(shared.options[0]!).length, 0);
  });

  it("does not treat crossing route lines as a transfer without a directed walk", () => {
    const base: MiniSpec = {
      lines: [{ svc: "a", mode: "bus", stops: ["a1", "a2", "a3"] }, { svc: "b", mode: "bus", stops: ["b1", "b2", "b3"] }],
    };
    expectError(conn(base, "a1", "b3"), "NO_VERIFIED_JOURNEY");
    const linked: MiniSpec = { ...base, walks: [["a2", "b2", 100]] };
    const r = okValue(conn(linked, "a1", "b3"));
    assert.deepEqual(r.options.map(trace), [T("R(a:a1_a>a2_a) W100 R(b:b2_b>b3_b)")]);
    expectError(conn(linked, "b1", "a3"), "NO_VERIFIED_JOURNEY");
  });

  it("respects board and alight permissions at the route-stop level", () => {
    const noBoard: MiniSpec = { lines: [{ svc: "a", mode: "bus", stops: [{ at: "p", board: false }, "q", "r"] }] };
    expectError(conn(noBoard, "p", "r"), "NO_VERIFIED_JOURNEY");
    okValue(conn(noBoard, "q", "r"));
    const noAlight: MiniSpec = { lines: [{ svc: "a", mode: "bus", stops: ["p", { at: "q", alight: false }, "r"] }] };
    expectError(conn(noAlight, "p", "q"), "NO_VERIFIED_JOURNEY");
    okValue(conn(noAlight, "p", "r"));
  });

  it("never rides backwards along a direction", () => {
    const spec: MiniSpec = { lines: [{ svc: "a", mode: "bus", stops: ["p", "q", "r"] }] };
    okValue(conn(spec, "p", "r"));
    expectError(conn(spec, "r", "p"), "NO_VERIFIED_JOURNEY");
  });

  it("handles a loop route without riding backwards or repeating legs", () => {
    const loop: MiniSpec = { lines: [{ svc: "l", mode: "jeepney", stops: ["a", "b", "c", "a", "d"] }] };
    const toD = okValue(conn(loop, "a", "d"));
    assert.equal(toD.options.length, 1);
    assert.equal(rides(toD.options[0]!).length, 1);
    okValue(conn(loop, "a", "c"));
    // From c the only way to b is to ride on round to a and board the loop again: a new boarding.
    const again = okValue(conn(loop, "c", "b"));
    assert.equal(again.options[0]!.transfers, 1);
    assert.equal(rides(again.options[0]!).length, 2);
  });

  it("terminates on walk cycles", () => {
    const spec: MiniSpec = {
      lines: [{ svc: "a", mode: "bus", stops: ["q", "d"] }],
      walks: [["o", "p", 100], ["p", "q", 100], ["q", "p", 100], ["q", "o", 100], ["p", "o", 100]],
    };
    const r = okValue(conn(spec, "o", "d"));
    assert.deepEqual(r.options.map(trace), [T("W100 W100 R(a:q_a>d_a)")]);
  });

  it("chains several walk links into one access segment and limits the segment total", () => {
    const spec: MiniSpec = { lines: [{ svc: "a", mode: "bus", stops: ["q", "d"] }], walks: [["o", "p", 300], ["p", "q", 300]] };
    okValue(conn(spec, "o", "d", { maxAccessWalkMeters: 600 }));
    expectError(conn(spec, "o", "d", { maxAccessWalkMeters: 599 }), "CONSTRAINT_UNSATISFIED");
  });

  it("excludes suspended and unknown-availability directions", () => {
    for (const availability of ["suspended", "unknown"] as const) {
      expectError(conn({ lines: [{ svc: "a", mode: "bus", stops: ["p", "q"], availability }] }, "p", "q"), "NO_VERIFIED_JOURNEY");
    }
  });

  it("returns at most three options with distinct routes", () => {
    const lines = ["a", "b", "c", "d", "e"].map((s) => ({ svc: s, mode: "bus" as const, stops: ["p", "q"] }));
    const r = okValue(conn({ lines }, "p", "q"));
    assert.equal(r.options.length, 3);
    assert.equal(new Set(r.options.map((o) => rides(o)[0]!.directionId)).size, 3);
  });
});

describe("fare-aware ranking is honest", () => {
  const lines = [
    { svc: "x", mode: "bus" as const, stops: ["p", "d"], fare: { flat: 1500 } },
    { svc: "y", mode: "van" as const, stops: ["p", "d"], fare: { unknown: true as const } },
    { svc: "z", mode: "jeepney" as const, stops: ["p", "m"], fare: { flat: 400 } },
    { svc: "w", mode: "jeepney" as const, stops: ["m", "d"], fare: { flat: 400 } },
  ];
  const spec: MiniSpec = { lines, walks: [["o", "p", 100]] };

  it("ranks fully known fares first and never lets an unknown fare look cheapest", () => {
    const r = okValue(plan(req("o", "d", { priority: "lowest_known_fare" }), mini(spec)));
    assert.deepEqual(r.options.map((o) => o.fare.status), ["complete", "complete", "unknown"]);
    assert.equal(r.options[0]!.fare.knownMaxCentavos, 800, "two boardings are charged separately");
    assert.equal(r.options[1]!.fare.knownMaxCentavos, 1500);
    assert.equal(r.options[2]!.fare.knownMaxCentavos, 0);
    assert.equal(r.options[2]!.fare.unknownRideLegs, 1);
    assert.match(r.options[2]!.rankReason, /cannot be compared on price/);
    assert.ok(r.coverageWarnings.includes("Some fares are unknown, so cheapest cannot be confirmed."));
  });

  it("ranks by transfers when asked, regardless of price", () => {
    const r = okValue(plan(req("o", "d", { priority: "fewest_transfers" }), mini(spec)));
    assert.deepEqual(r.options.map((o) => o.transfers), [0, 0, 1]);
  });

  it("does not use fare to break nearest_useful ties", () => {
    const r = okValue(plan(req("o", "d"), mini(spec)));
    assert.equal(r.options[0]!.transfers, 0);
    assert.ok(!r.coverageWarnings.includes("Some fares are unknown, so cheapest cannot be confirmed."));
  });

  it("applies a strict budget only to journeys whose whole fare is known and within it", () => {
    const within = okValue(plan(req("o", "d", { budgetCentavos: 1000 }), mini(spec)));
    assert.deepEqual(within.options.map((o) => o.fare.knownMaxCentavos), [800]);
    assert.equal(within.options[0]!.fare.status, "complete");
    const blocked = expectError(plan(req("o", "d", { budgetCentavos: 700 }), mini(spec)), "CONSTRAINT_UNSATISFIED");
    assert.equal(blocked.field, "preferences.budgetCentavos");
    assert.match(blocked.message, /Change your preferences/);
  });

  it("a zero budget cannot be met by an unknown fare", () => {
    const only = mini({ lines: [{ svc: "y", mode: "van", stops: ["p", "d"], fare: { unknown: true } }] });
    expectError(plan(req("p", "d", { budgetCentavos: 0 }), only), "CONSTRAINT_UNSATISFIED");
  });

  it("charges one fare per boarding even when the ride passes several stops", () => {
    const r = okValue(plan(req("a", "d"), mini({ lines: [{ svc: "t", mode: "bus", stops: ["a", "b", "c", "d"], fare: { flat: 1000 } }] })));
    assert.equal(r.options[0]!.fare.knownMaxCentavos, 1000);
    assert.equal(r.options[0]!.fare.status, "complete");
  });
});

describe("guards and input checks", () => {
  const chain = mini({
    lines: [1, 2, 3, 4, 5, 6].map((i) => ({ svc: `s${i}`, mode: "jeepney" as const, stops: [`c${i - 1}`, `c${i}`] })),
  });

  it("reports SEARCH_LIMIT_REACHED instead of claiming there is no route", () => {
    expectError(plan(req("c0", "c6"), chain, { labelLimit: 5 }), "SEARCH_LIMIT_REACHED");
    okValue(plan(req("c0", "c6"), chain, { labelLimit: 10_000 }));
  });

  it("rejects same origin and destination, unknown places, and malformed preferences", () => {
    expectError(plan(req("c0", "c0"), chain), "INVALID_INPUT");
    expectError(plan(req("c0", "nowhere"), chain), "PLACE_NOT_FOUND");
    expectError(plan(req("nowhere", "c1"), chain), "PLACE_NOT_FOUND");
    expectError(plan(req("c0", "c1", { allowedModes: [] }), chain), "INVALID_INPUT");
    expectError(plan(req("c0", "c1", { maxAccessWalkMeters: -1 }), chain), "INVALID_INPUT");
    expectError(plan(req("c0", "c1", { maxAccessWalkMeters: 10.5 }), chain), "INVALID_INPUT");
    expectError(plan(req("c0", "c1", { budgetCentavos: 1.5 }), chain), "INVALID_INPUT");
  });

  it("is deterministic and leaves the frozen pack untouched", () => {
    const a = plan(req("a", "c"), FIXTURE);
    const b = plan(req("a", "c"), FIXTURE);
    assert.deepEqual(a, b);
    assert.ok(Object.isFrozen(FIXTURE));
  });

  it("is available through the RoutePort contract", async () => {
    const port = createRoutePort({ now: () => NOW });
    const result = await port.plan(req("a", "b"), FIXTURE);
    assert.equal(result.ok, true);
  });

  it("emits stable journey IDs and ordered, evidence-bearing legs", () => {
    const first = okValue(plan(req("a", "c"), FIXTURE)).options[0]!;
    const second = okValue(plan(req("a", "c"), FIXTURE)).options[0]!;
    assert.equal(first.id, second.id);
    assert.match(first.id, /^journey_[0-9a-f]{8}$/);
    for (const leg of first.legs) {
      assert.ok(leg.evidence.sourceIds.length > 0);
      assert.ok(leg.evidence.checkedAt.length > 0);
    }
  });
});
