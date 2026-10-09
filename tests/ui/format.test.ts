// Member 3: run with `npx tsx --test tests/ui/*.test.ts` once Member 4's baseline provides tsx.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  centavosToInput,
  formatCentavos,
  formatCentavosRange,
  formatDate,
  formatMeters,
  parseMeters,
  parsePesosToCentavos,
} from "../../src/ui/format";

describe("formatCentavos", () => {
  it("formats integer centavos with peso sign and grouping", () => {
    assert.equal(formatCentavos(0), "₱0.00");
    assert.equal(formatCentavos(1250), "₱12.50");
    assert.equal(formatCentavos(100000), "₱1,000.00");
    assert.equal(formatCentavos(123456789), "₱1,234,567.89");
  });
  it("rejects non-integer or negative amounts instead of guessing", () => {
    assert.throws(() => formatCentavos(12.5));
    assert.throws(() => formatCentavos(-1));
    assert.throws(() => formatCentavos(Number.NaN));
  });
  it("keeps ranges as ranges", () => {
    assert.equal(formatCentavosRange(1300, 1300), "₱13.00");
    assert.equal(formatCentavosRange(1300, 1500), "₱13.00–₱15.00");
  });
});

describe("formatMeters / formatDate", () => {
  it("shows exact meters", () => {
    assert.equal(formatMeters(0), "0 m");
    assert.equal(formatMeters(1250), "1,250 m");
    assert.throws(() => formatMeters(-5));
  });
  it("shows the date part of ISO timestamps", () => {
    assert.equal(formatDate("2026-10-09T21:00:00+08:00"), "2026-10-09");
    assert.equal(formatDate("not a date"), "not a date");
  });
});

describe("parsePesosToCentavos", () => {
  it("treats empty input as no budget", () => {
    assert.deepEqual(parsePesosToCentavos("  "), { ok: true, value: null });
  });
  it("parses pesos without floating point error", () => {
    assert.deepEqual(parsePesosToCentavos("50"), { ok: true, value: 5000 });
    assert.deepEqual(parsePesosToCentavos("50.5"), { ok: true, value: 5050 });
    assert.deepEqual(parsePesosToCentavos("0.29"), { ok: true, value: 29 });
    assert.deepEqual(parsePesosToCentavos("₱1,000.10"), { ok: true, value: 100010 });
    assert.deepEqual(parsePesosToCentavos("PHP 20"), { ok: true, value: 2000 });
  });
  it("rejects invalid, negative and over-precise amounts (EC-020)", () => {
    for (const bad of ["-5", "abc", "1.234", "NaN", "1e3", "12..5", "99999999"]) {
      assert.deepEqual(parsePesosToCentavos(bad), { ok: false }, bad);
    }
  });
  it("round-trips through the editable form", () => {
    assert.equal(centavosToInput(null), "");
    assert.equal(centavosToInput(5000), "50");
    assert.equal(centavosToInput(5005), "50.05");
  });
});

describe("parseMeters", () => {
  it("accepts whole nonnegative meters", () => {
    assert.deepEqual(parseMeters("1000"), { ok: true, value: 1000 });
    assert.deepEqual(parseMeters("1,000"), { ok: true, value: 1000 });
    assert.deepEqual(parseMeters("0"), { ok: true, value: 0 });
    assert.deepEqual(parseMeters("500 m"), { ok: true, value: 500 });
  });
  it("rejects empty, decimal, negative and absurd values", () => {
    for (const bad of ["", "-1", "1.5", "abc", "999999"]) {
      assert.deepEqual(parseMeters(bad), { ok: false }, bad);
    }
  });
});
