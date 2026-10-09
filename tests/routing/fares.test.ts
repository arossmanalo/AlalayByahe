import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FarePolicy, FareQuote, TransitPack } from "../../src/contracts/index";
import { aggregateFares, applyRatio, buildFareBook, currentRideQuote, quoteRideFare, type Passenger } from "../../src/routing/fares";
import { CHECKED, NOW, mini, okValue, req, rides, serviceId, stopId, dirId } from "./helpers";
import { planRoute } from "../../src/routing/routePort";

const ev = { sourceIds: ["source_test_fixture"], checkedAt: CHECKED, reliability: "verified" as const };

type PolicyBody = Omit<FarePolicy, "id" | "serviceId" | "evidence">;

/** One service "s" with stops a, b, c, d on one direction and the given fare policy. */
function oneLine(policy: PolicyBody, extra: Partial<FarePolicy> = {}): TransitPack {
  return mini({ lines: [{ svc: "s", mode: "jeepney", stops: ["a", "b", "c", "d"], fare: { policy: { ...policy, ...extra } } }] });
}

function quote(pack: TransitPack, from: number, to: number, passenger: Passenger = "regular", nowMs = NOW): FareQuote {
  const names = ["a", "b", "c", "d"];
  return quoteRideFare(buildFareBook(pack), {
    serviceId: serviceId("s"), directionId: dirId("s"),
    boardStopId: stopId(names[from]!, "s"), alightStopId: stopId(names[to]!, "s"),
    boardIndex: from, alightIndex: to, directionStopIds: names.map((n) => stopId(n, "s")),
    passenger, nowMs,
  });
}

describe("unknown is never zero", () => {
  it("returns null amounts for a service with no policy, an unknown policy, or a missing pair", () => {
    const none = mini({ lines: [{ svc: "s", mode: "bus", stops: ["a", "b", "c", "d"] }] });
    for (const q of [
      quote(none, 0, 3),
      quote(mini({ lines: [{ svc: "s", mode: "bus", stops: ["a", "b", "c", "d"], fare: { unknown: true } }] }), 0, 3),
      quote(oneLine({ kind: "matrix", matrix: [{ fromStopId: stopId("a", "s"), toStopId: stopId("b", "s"), centavos: 1300 }] }), 0, 3),
    ]) {
      assert.equal(q.status, "unknown");
      assert.equal(q.minCentavos, null);
      assert.equal(q.maxCentavos, null);
      assert.ok(q.basis.length > 0);
    }
  });

  it("the ride already in progress has an unknown fare, not a free one", () => {
    const q = currentRideQuote();
    assert.equal(q.status, "unknown");
    assert.equal(q.minCentavos, null);
    assert.match(q.basis, /not confirmed/);
  });

  it("aggregate never presents a partial subtotal as a total", () => {
    const known: FareQuote = { status: "verified", minCentavos: 1300, maxCentavos: 1300, sourceIds: ["source_b", "source_a"], basis: "x" };
    const unknown = currentRideQuote();
    assert.deepEqual(aggregateFares([known, unknown]), {
      status: "partial", knownMinCentavos: 1300, knownMaxCentavos: 1300, unknownRideLegs: 1, sourceIds: ["source_a", "source_b"],
    });
    assert.equal(aggregateFares([unknown]).status, "unknown");
    assert.equal(aggregateFares([unknown]).knownMaxCentavos, 0);
    assert.equal(aggregateFares([known, known]).status, "complete");
    assert.equal(aggregateFares([known, known]).knownMaxCentavos, 2600);
  });
});

describe("policy kinds", () => {
  it("flat amount and flat range", () => {
    const flat = quote(oneLine({ kind: "flat", flatCentavos: 1500 }), 0, 2);
    assert.deepEqual([flat.status, flat.minCentavos, flat.maxCentavos], ["verified", 1500, 1500]);
    const range = quote(oneLine({ kind: "flat", flatRange: { minCentavos: 1500, maxCentavos: 2500 } }), 0, 2);
    assert.deepEqual([range.minCentavos, range.maxCentavos], [1500, 2500]);
    assert.deepEqual(range.sourceIds, ["source_test_fixture"]);
  });

  it("matrix looks up the exact board and alight pair", () => {
    const pack = oneLine({
      kind: "matrix",
      matrix: [
        { fromStopId: stopId("a", "s"), toStopId: stopId("c", "s"), centavos: 2000 },
        { fromStopId: stopId("a", "s"), toStopId: stopId("d", "s"), centavos: 2500 },
      ],
    });
    assert.equal(quote(pack, 0, 2).minCentavos, 2000);
    assert.equal(quote(pack, 0, 3).minCentavos, 2500);
    assert.equal(quote(pack, 1, 3).status, "unknown", "b to d is not in the table");
  });

  const dist = (segments: { from: string; to: string; meters: number }[], over: Partial<NonNullable<FarePolicy["distanceRule"]>> = {}): TransitPack =>
    oneLine({
      kind: "distance",
      distanceRule: {
        baseCentavos: 1300, includedMeters: 4000, incrementMeters: 1000, incrementCentavos: 180,
        verifiedSegmentMeters: segments.map((s) => ({ directionId: dirId("s"), fromStopId: stopId(s.from, "s"), toStopId: stopId(s.to, "s"), meters: s.meters })),
        ...over,
      },
    });

  it("distance within the included meters costs the base fare", () => {
    const q = quote(dist([{ from: "a", to: "d", meters: 4000 }]), 0, 3);
    assert.deepEqual([q.status, q.minCentavos, q.maxCentavos], ["verified", 1300, 1300]);
  });

  it("whole increments are exact", () => {
    const q = quote(dist([{ from: "a", to: "d", meters: 6000 }]), 0, 3);
    assert.deepEqual([q.status, q.minCentavos, q.maxCentavos], ["verified", 1660, 1660]);
  });

  it("a partial increment is a range because the data does not say how it is charged", () => {
    const q = quote(dist([{ from: "a", to: "d", meters: 6500 }]), 0, 3);
    assert.deepEqual([q.status, q.minCentavos, q.maxCentavos], ["estimated", 1660, 1840]);
    assert.match(q.basis, /range/);
  });

  it("chains documented adjacent segments but never guesses a gap", () => {
    const chained = dist([{ from: "a", to: "b", meters: 2000 }, { from: "b", to: "c", meters: 3000 }]);
    assert.equal(quote(chained, 0, 2).minCentavos, 1300 + 180, "5000 m is one increment over the 4000 m included");
    const gap = dist([{ from: "a", to: "b", meters: 2000 }, { from: "c", to: "d", meters: 3000 }]);
    const q = quote(gap, 0, 3);
    assert.equal(q.status, "unknown");
    assert.match(q.basis, /distance data/);
  });

  it("never falls back to aerial distance when no segment is documented", () => {
    const q = quote(dist([{ from: "a", to: "b", meters: 1000 }]), 1, 3);
    assert.equal(q.status, "unknown");
    assert.equal(q.minCentavos, null);
  });
});

describe("validity and conflicts", () => {
  const flatPolicy: PolicyBody = { kind: "flat", flatCentavos: 1500 };

  it("an expired policy gives an unknown fare that says it needs updating", () => {
    const pack = oneLine(flatPolicy, { validTo: "2026-06-30" });
    const q = quote(pack, 0, 1);
    assert.equal(q.status, "unknown");
    assert.match(q.basis, /needs updating/);
  });

  it("a policy that has not started is not used", () => {
    const q = quote(oneLine(flatPolicy, { validFrom: "2027-01-01" }), 0, 1);
    assert.equal(q.status, "unknown");
  });

  it("date-only bounds are inclusive Philippine calendar days", () => {
    const pack = oneLine(flatPolicy, { validFrom: "2026-10-09", validTo: "2026-10-09" });
    const at = (iso: string): FareQuote => quote(pack, 0, 1, "regular", Date.parse(iso));
    assert.equal(at("2026-10-09T00:00:00+08:00").status, "verified");
    assert.equal(at("2026-10-09T23:59:59+08:00").status, "verified");
    assert.equal(at("2026-10-08T23:59:59+08:00").status, "unknown");
    assert.equal(at("2026-10-10T00:00:00+08:00").status, "unknown");
  });

  it("two current policies that disagree make the fare unknown, and ones that agree do not", () => {
    const disagree = mini({
      lines: [{ svc: "s", mode: "jeepney", stops: ["a", "b", "c", "d"], fare: { policy: { kind: "flat", flatCentavos: 1500 } } }],
    });
    const second: FarePolicy = { id: "fare_test_s2", serviceId: serviceId("s"), kind: "flat", flatCentavos: 1600, evidence: ev };
    const conflicting = { ...disagree, fares: [...disagree.fares, second] };
    const q = quote(conflicting, 0, 1);
    assert.equal(q.status, "unknown");
    assert.match(q.basis, /disagree/);
    const agreeing = { ...disagree, fares: [...disagree.fares, { ...second, flatCentavos: 1500 }] };
    assert.equal(quote(agreeing, 0, 1).minCentavos, 1500);
  });

  it("a current policy wins over an expired one for the same service", () => {
    const base = mini({ lines: [{ svc: "s", mode: "jeepney", stops: ["a", "b", "c", "d"], fare: { policy: { kind: "flat", flatCentavos: 1500, validTo: "2025-12-31" } } }] });
    const current: FarePolicy = { id: "fare_test_s2", serviceId: serviceId("s"), kind: "flat", flatCentavos: 1700, validFrom: "2026-01-01", evidence: ev };
    assert.equal(quote({ ...base, fares: [...base.fares, current] }, 0, 1).minCentavos, 1700);
  });

  it("an unknown policy marker cannot be priced even if a number would be convenient", () => {
    const q = quote(mini({ lines: [{ svc: "s", mode: "bus", stops: ["a", "b", "c", "d"], fare: { unknown: true } }] }), 0, 1);
    assert.equal(q.minCentavos, null);
  });
});

describe("discounts", () => {
  const rules = (rounding: "floor" | "ceil" | "nearest", numerator = 3, denominator = 4): PolicyBody["discountRules"] =>
    [{ passenger: "student", numerator, denominator, rounding, evidence: ev }];

  it("rounds a documented discount the documented way", () => {
    // 1250 x 3/4 = 937.5 centavos
    const at = (r: "floor" | "ceil" | "nearest"): number | null =>
      quote(oneLine({ kind: "flat", flatCentavos: 1250, discountRules: rules(r) }), 0, 1, "student").minCentavos;
    assert.equal(at("floor"), 937);
    assert.equal(at("ceil"), 938);
    assert.equal(at("nearest"), 938);
  });

  it("applyRatio uses integer arithmetic and handles exact results", () => {
    assert.equal(applyRatio(1300, 4, 5, "floor"), 1040);
    assert.equal(applyRatio(1300, 4, 5, "ceil"), 1040);
    assert.equal(applyRatio(1300, 4, 5, "nearest"), 1040);
    assert.equal(applyRatio(1, 1, 3, "nearest"), 0);
    assert.equal(applyRatio(2, 1, 3, "nearest"), 1);
    assert.equal(applyRatio(0, 1, 3, "ceil"), 0);
  });

  it("applies to both ends of a range", () => {
    const q = quote(oneLine({ kind: "flat", flatRange: { minCentavos: 1000, maxCentavos: 2000 }, discountRules: rules("floor", 4, 5) }), 0, 1, "student");
    assert.deepEqual([q.minCentavos, q.maxCentavos], [800, 1600]);
  });

  it("does not touch a regular passenger's fare", () => {
    const q = quote(oneLine({ kind: "flat", flatCentavos: 1250, discountRules: rules("floor") }), 0, 1, "regular");
    assert.equal(q.minCentavos, 1250);
    assert.equal(q.status, "verified");
  });

  it("without a documented rule it shows the regular fare as an estimate and says so", () => {
    for (const passenger of ["student", "senior", "pwd"] as const) {
      const q = quote(oneLine({ kind: "flat", flatCentavos: 1250 }), 0, 1, passenger);
      assert.equal(q.minCentavos, 1250);
      assert.equal(q.status, "estimated");
      assert.match(q.basis, /discount is documented/);
    }
    // A rule for another passenger type is not a rule for this one.
    const wrong = quote(oneLine({ kind: "flat", flatCentavos: 1250, discountRules: rules("floor") }), 0, 1, "senior");
    assert.equal(wrong.status, "estimated");
    assert.equal(wrong.minCentavos, 1250);
  });

  it("carries the discount's own sources", () => {
    const withOther = oneLine({
      kind: "flat", flatCentavos: 1000,
      discountRules: [{ passenger: "pwd", numerator: 4, denominator: 5, rounding: "floor", evidence: { ...ev, sourceIds: ["source_test_fixture"] } }],
    });
    assert.deepEqual(quote(withOther, 0, 1, "pwd").sourceIds, ["source_test_fixture"]);
  });
});

describe("fares inside planned journeys", () => {
  it("expired fare policy in the pack leaves a ride unknown in the final option", () => {
    const pack = mini({ lines: [{ svc: "s", mode: "bus", stops: ["a", "b"], fare: { policy: { kind: "flat", flatCentavos: 1500, validTo: "2026-01-31" } } }] });
    const r = okValue(planRoute(req("a", "b"), pack, { now: () => NOW }));
    assert.equal(r.options[0]!.fare.status, "unknown");
    assert.equal(rides(r.options[0]!)[0]!.fare.minCentavos, null);
    const earlier = okValue(planRoute(req("a", "b"), pack, { now: () => Date.UTC(2026, 0, 15) }));
    assert.equal(earlier.options[0]!.fare.status, "complete");
  });

  it("discounted passengers change the fare, not the route", () => {
    const pack = mini({
      lines: [{
        svc: "s", mode: "bus", stops: ["a", "b"],
        fare: { policy: { kind: "flat", flatCentavos: 1300, discountRules: [{ passenger: "senior", numerator: 4, denominator: 5, rounding: "nearest", evidence: ev }] } },
      }],
    });
    const regular = okValue(planRoute(req("a", "b"), pack, { now: () => NOW }));
    const senior = okValue(planRoute(req("a", "b", { passenger: "senior" }), pack, { now: () => NOW }));
    assert.equal(regular.options[0]!.fare.knownMaxCentavos, 1300);
    assert.equal(senior.options[0]!.fare.knownMaxCentavos, 1040);
    assert.equal(regular.options[0]!.legs.length, senior.options[0]!.legs.length);
  });
});
