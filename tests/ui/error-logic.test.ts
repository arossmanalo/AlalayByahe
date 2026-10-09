import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppError, ErrorCode } from "../../src/contracts";
import { recoveriesFor, shouldShowError, supersededError } from "../../src/ui/error-logic";

const ALL_CODES: ErrorCode[] = [
  "AI_NOT_READY", "AI_INIT_FAILED", "AI_INVALID_OUTPUT", "AI_TIMEOUT", "CANCELLED",
  "INVALID_INPUT", "NEEDS_CLARIFICATION", "PLACE_NOT_FOUND", "OUTSIDE_COVERAGE", "NO_VERIFIED_JOURNEY",
  "CONSTRAINT_UNSATISFIED", "SEARCH_LIMIT_REACHED", "DATA_NOT_READY", "DATA_INVALID", "STORAGE_FULL",
  "NETWORK_UNAVAILABLE", "NETWORK_LIMIT", "PERMISSION_DENIED",
];

describe("recoveriesFor (UI-004/UI-006)", () => {
  it("offers retry only for retryable errors", () => {
    for (const code of ALL_CODES) {
      assert.equal(recoveriesFor(code, false).includes("retry"), false, code);
    }
  });
  it("never offers a plain retry for an unsatisfied strict preference (EC-033)", () => {
    assert.deepEqual(recoveriesFor("CONSTRAINT_UNSATISFIED", true), ["edit_preferences", "edit_places"]);
  });
  it("offers a narrower search when the search limit is reached (EC-043)", () => {
    assert.deepEqual(recoveriesFor("SEARCH_LIMIT_REACHED", false), ["edit_preferences", "edit_places"]);
  });
  it("sends AI_NOT_READY to setup or manual planning (EC-085)", () => {
    assert.deepEqual(recoveriesFor("AI_NOT_READY", true), ["setup", "manual"]);
  });
  it("lets a cancelled query be tried again (EC-102)", () => {
    assert.deepEqual(recoveriesFor("CANCELLED", true), ["retry"]);
  });
  it("offers manual planning whenever AI fails", () => {
    for (const code of ["AI_INIT_FAILED", "AI_INVALID_OUTPUT", "AI_TIMEOUT"] as const) {
      assert.ok(recoveriesFor(code, false).includes("manual"), code);
    }
  });
});

describe("shouldShowError (EC-102)", () => {
  it("stays silent for the user's own cancel or a superseded job", () => {
    assert.equal(shouldShowError(supersededError().error), false);
  });
  it("reports a cancellation the user did not ask for, such as backgrounding", () => {
    const backgrounded: AppError = { code: "CANCELLED", message: "Query cancelled.", retryable: true };
    assert.equal(shouldShowError(backgrounded), true);
  });
  it("reports every other error", () => {
    for (const code of ALL_CODES.filter((c) => c !== "CANCELLED")) {
      assert.equal(shouldShowError({ code, message: "Superseded by a newer request.", retryable: false }), true, code);
    }
  });
});
