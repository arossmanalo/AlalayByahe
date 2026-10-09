import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlaceCandidate, RawIntent } from "../../src/contracts";
import {
  checkQueryText,
  DEFAULT_PREFERENCES,
  endpointFromPlace,
  explicitFields,
  formToPreferences,
  initialCandidate,
  MAX_QUERY_CHARS,
  newQueryId,
  preferencesToForm,
} from "../../src/ui/form-logic";
import { devPack } from "./fixtures/dev-pack";

const [placeA, placeB] = devPack.places;
assert.ok(placeA && placeB);

describe("checkQueryText (EC-014)", () => {
  it("rejects empty and over-limit text without truncating", () => {
    assert.deepEqual(checkQueryText("   "), { ok: false, reason: "empty" });
    assert.deepEqual(checkQueryText("a".repeat(MAX_QUERY_CHARS + 1)), { ok: false, reason: "too_long" });
    assert.deepEqual(checkQueryText(" Lipa to San Pablo "), { ok: true, text: "Lipa to San Pablo" });
    assert.equal(checkQueryText("a".repeat(MAX_QUERY_CHARS)).ok, true);
  });
});

describe("preference form", () => {
  it("round-trips the contract defaults", () => {
    const result = formToPreferences(preferencesToForm(DEFAULT_PREFERENCES));
    assert.deepEqual(result, { ok: true, value: DEFAULT_PREFERENCES });
  });
  it("rejects empty modes instead of relaxing them (EC-012)", () => {
    const form = { ...preferencesToForm(DEFAULT_PREFERENCES), allowedModes: [] };
    const result = formToPreferences(form);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errors.allowedModes, "empty_modes");
  });
  it("rejects invalid walking and budget input (EC-020)", () => {
    const form = { ...preferencesToForm(DEFAULT_PREFERENCES), accessText: "-1", budgetText: "abc" };
    const result = formToPreferences(form);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.access, "invalid_meters");
      assert.equal(result.errors.budget, "invalid_budget");
    }
  });
  it("keeps strict user values and canonical mode order", () => {
    const form = {
      ...preferencesToForm(DEFAULT_PREFERENCES),
      allowedModes: ["lrt" as const, "jeepney" as const],
      directOnly: true,
      budgetText: "75.50",
      transferText: "200",
    };
    const result = formToPreferences(form);
    assert.ok(result.ok);
    if (result.ok) {
      assert.deepEqual(result.value.allowedModes, ["jeepney", "lrt"]);
      assert.equal(result.value.directOnly, true);
      assert.equal(result.value.budgetCentavos, 7550);
      assert.equal(result.value.maxTransferWalkMeters, 200);
    }
  });
});

describe("explicitFields", () => {
  const base: RawIntent = {
    kind: "journey",
    originText: "Lipa",
    destinationText: "San Pablo",
    useCurrentLocation: false,
    allowedModes: null,
    excludedModes: [],
    priority: null,
    maxAccessWalkMeters: null,
    maxTransferWalkMeters: null,
    maxEgressWalkMeters: null,
    budgetCentavos: null,
    directOnly: false,
    ambiguities: [],
  };
  it("labels nothing explicit when the user stated no preference", () => {
    assert.equal(explicitFields(base).size, 0);
    assert.equal(explicitFields(null).size, 0);
  });
  it("marks exclusions, priority, budget and direct-only as the user's words", () => {
    const fields = explicitFields({
      ...base,
      excludedModes: ["bus"],
      priority: "fewest_transfers",
      budgetCentavos: 5000,
      directOnly: true,
    });
    assert.deepEqual([...fields].sort(), ["allowedModes", "budgetCentavos", "directOnly", "priority"]);
  });
});

describe("initialCandidate (EC-004/EC-008)", () => {
  it("preselects only a single exact match", () => {
    const exact: PlaceCandidate = { place: placeA, match: "exact" };
    const fuzzy: PlaceCandidate = { place: placeB, match: "fuzzy" };
    assert.equal(initialCandidate([exact]), placeA);
    assert.equal(initialCandidate([fuzzy]), null);
    assert.equal(initialCandidate([exact, fuzzy]), null);
    assert.equal(initialCandidate([]), null);
  });
});

describe("endpoint and IDs", () => {
  it("builds a stored endpoint from the place record only", () => {
    assert.deepEqual(endpointFromPlace(placeA), {
      placeId: placeA.id,
      label: placeA.name,
      point: placeA.point,
      provenance: "stored",
    });
  });
  it("creates distinct lower_snake_case query IDs", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newQueryId(0)));
    assert.equal(ids.size, 200);
    for (const id of ids) assert.match(id, /^query_[0-9a-z_]+$/);
  });
});
