// Member 3 (UI-006): WCAG 2.2 AA contrast for every color pair the screens draw.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colors, legColors, toneColors } from "../../src/ui/theme";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // 1.4.3 normal-size text
const NON_TEXT = 3; // 1.4.11 control boundaries and graphics

function expectAtLeast(fg: string, bg: string, min: number, what: string) {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= min, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
}

describe("theme contrast (EC-106)", () => {
  it("body and muted text are readable on every page surface", () => {
    for (const bg of [colors.background, colors.surface, colors.surfaceMuted]) {
      expectAtLeast(colors.text, bg, TEXT, "text");
      expectAtLeast(colors.textMuted, bg, TEXT, "muted text");
    }
  });
  it("notice titles and body text are readable on their tone surface", () => {
    for (const [tone, c] of Object.entries(toneColors)) {
      expectAtLeast(c.fg, c.bg, TEXT, `${tone} title`);
      expectAtLeast(colors.text, c.bg, TEXT, `${tone} body`);
    }
  });
  it("buttons, links, errors and selected chips are readable", () => {
    expectAtLeast(colors.onPrimary, colors.primary, TEXT, "primary button");
    expectAtLeast(colors.onPrimary, colors.primaryPressed, TEXT, "pressed primary button");
    for (const bg of [colors.background, colors.surface]) {
      expectAtLeast(colors.primary, bg, TEXT, "secondary button and link");
      expectAtLeast(colors.danger, bg, TEXT, "field error");
    }
    expectAtLeast(colors.primaryPressed, colors.infoSurface, TEXT, "selected chip");
  });
  it("input and chip edges are visible against the page (WCAG 1.4.11)", () => {
    for (const bg of [colors.background, colors.surface]) {
      expectAtLeast(colors.controlBorder, bg, NON_TEXT, "control border");
      expectAtLeast(colors.primary, bg, NON_TEXT, "selected chip border");
      expectAtLeast(colors.danger, bg, NON_TEXT, "invalid field border");
    }
    expectAtLeast(colors.primary, colors.surfaceMuted, NON_TEXT, "progress bar");
  });
  it("route diagram lines are visible on cards", () => {
    for (const [kind, color] of Object.entries(legColors)) {
      expectAtLeast(color, colors.surface, NON_TEXT, `${kind} line`);
    }
  });
});
