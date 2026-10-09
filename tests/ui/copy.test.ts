// Member 3 (UI-006): copy audit against docs/planning/05-edge-case-matrix.md and AGENTS.md claims.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strings, type UiLanguage } from "../../src/ui/i18n";

const LANGUAGES: UiLanguage[] = ["en", "fil"];

/** Every user-facing string, with string templates rendered from sample arguments. */
function render(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    for (const args of [[2, 600], ["₱10.00", 2], [["Walk", "LRT"]], ["Sample", "Sample revision", "Sample"]]) {
      try {
        const out: unknown = value(...args);
        if (typeof out === "string") return [out];
      } catch {
        // Try the next argument shape.
      }
    }
    assert.fail(`Could not render a string template: ${String(value)}`);
  }
  if (value && typeof value === "object") return Object.values(value).flatMap(render);
  return [];
}

describe("copy audit (UI-006)", () => {
  for (const lang of LANGUAGES) {
    const t = strings[lang];
    const all = render(t);

    it(`${lang}: has no empty strings`, () => {
      assert.ok(all.length > 150);
      for (const s of all) assert.notEqual(s.trim(), "");
    });

    it(`${lang}: never claims fastest travel, real-time data or guarantees`, () => {
      const forbidden = /\bfastest\b|\bquickest\b|pinakamabilis|real[- ]?time|guarantee|garantisado|arriving now|darating na/i;
      for (const s of all) assert.doesNotMatch(s, forbidden);
    });

    it(`${lang}: mentions "live" only to say there is none`, () => {
      for (const s of all.filter((x) => /\blive\b/i.test(x))) {
        assert.match(s, /\bno live\b|walang live/i, s);
      }
    });

    it(`${lang}: uses one message for "no verified complete journey" (EC-023, EC-138)`, () => {
      assert.equal(t.noOptions, t.errorMessages.NO_VERIFIED_JOURNEY);
    });
  }

  it("uses the edge-case matrix wording for an unsupported journey", () => {
    assert.equal(strings.en.errorMessages.NO_VERIFIED_JOURNEY, "No verified complete journey available.");
  });

  it("does not claim a journey exists when preferences cannot be met (EC-033)", () => {
    // The controller also returns CONSTRAINT_UNSATISFIED for conflicting modes before any search.
    assert.doesNotMatch(strings.en.errorMessages.CONSTRAINT_UNSATISFIED, /exists/i);
    assert.doesNotMatch(strings.fil.errorMessages.CONSTRAINT_UNSATISFIED, /may beripikadong biyahe/i);
  });

  it("does not present a search limit as a missing route (EC-043)", () => {
    assert.match(strings.en.errorMessages.SEARCH_LIMIT_REACHED, /does not mean there is no route/);
    assert.match(strings.en.errorMessages.SEARCH_LIMIT_REACHED, /narrower/);
    assert.match(strings.fil.errorMessages.SEARCH_LIMIT_REACHED, /Hindi ibig sabihin/);
  });

  it("labels the manual fallback as AI unavailable", () => {
    assert.equal(strings.en.aiUnavailable, "AI unavailable");
    assert.notEqual(strings.fil.aiUnavailable, strings.en.aiUnavailable);
  });

  it("only calls a complete fare a total", () => {
    for (const lang of LANGUAGES) {
      const t = strings[lang];
      const partial = t.farePartial("₱10.00", 1);
      assert.ok(!partial.includes(t.fareComplete("₱10.00")), lang);
      assert.ok(!t.fareKnownSubtotal("₱10.00").includes(t.fareComplete("₱10.00")), lang);
    }
  });
});
