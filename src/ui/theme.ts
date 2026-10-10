// Member 3 (UI-001): shared visual tokens, from the AlalayByahe UI kit (design canvas "iOS map redesign").
// System type, one tint for actions, no gradients. Colour always carries meaning: each transport mode has
// its own colour family, direction signs are yellow, and where you get off is red.
// Contrast targets WCAG AA for text on every surface it is drawn on, and 3:1 for map lines and status
// marks (WCAG 1.4.11). tests/ui/contrast.test.ts checks every pair the screens use.
// Meaning is never carried by color alone: every tone also has a text label or icon.
import type { Mode } from "../contracts";

export const colors = {
  // Grouped background (pages and sheets with white groups).
  background: "#F2F2F7",
  // Plain sheets, list groups on the grouped background, cards.
  surface: "#FFFFFF",
  // Groups drawn on a plain (white) sheet.
  surfaceMuted: "#F2F2F7",
  // Fills: search fields, segmented control track, gray buttons, steppers.
  fill: "#EEEEF0",
  fillStrong: "#E3E3E8",
  text: "#000000",
  textMuted: "#636366",
  textTertiary: "#3C3C43",
  separator: "#E1E1E6",
  separatorOnMuted: "#DCDCE0",
  // Kept for decorative card edges.
  border: "#E1E1E6",
  // Edges of inputs drawn on white. Filled fields rely on their icon and label instead.
  controlBorder: "#8A8A8E",
  chevron: "#C4C4C7",
  grabber: "#C7C7CC",
  primary: "#0066CC",
  primaryPressed: "#004E9E",
  onPrimary: "#FFFFFF",
  // Selected list row tint and highlighted words.
  selectedSurface: "#EAF2FC",
  highlight: "#DCE9F9",
  info: "#0066CC",
  infoSurface: "#EAF2FC",
  success: "#1E7A34",
  successSurface: "#E6F4EA",
  switchOn: "#34C759",
  warning: "#A04A00",
  warningSurface: "#FFF1DF",
  danger: "#D70015",
  dangerSurface: "#FFEDEE",
  fixture: "#55267F",
  fixtureSurface: "#F0E6F9",
  disabled: "#8A8A8E",
  disabledSurface: "#E9E9EB",
  // Direction signboards: black text on sign yellow.
  sign: "#FFD60A",
  onSign: "#000000",
  // Pin where you get off, and "you" on the map.
  getOff: "#FF3B30",
  you: "#0066CC",
  backdrop: "rgba(0,0,0,0.45)",
} as const;

// Map palette. The schematic map is drawn from stored stop coordinates only (no roads or water data).
export const mapColors = {
  land: "#F4F1E8",
  label: "#000000",
  labelHalo: "#FFFFFF",
  caption: "#3C3C43",
  casing: "#FFFFFF",
  unverified: "#D9640A",
} as const;

export type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "fixture";

export const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  info: { fg: colors.info, bg: colors.infoSurface, border: colors.info },
  success: { fg: colors.success, bg: colors.successSurface, border: colors.success },
  warning: { fg: colors.warning, bg: colors.warningSurface, border: colors.warning },
  danger: { fg: colors.danger, bg: colors.dangerSurface, border: colors.danger },
  neutral: { fg: colors.textMuted, bg: colors.surfaceMuted, border: colors.separator },
  fixture: { fg: colors.fixture, bg: colors.fixtureSurface, border: colors.fixture },
};

// Text glyphs accompany tone colors where an icon cannot be drawn, so status survives color blindness.
export const toneGlyph: Record<Tone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  danger: "✕",
  neutral: "•",
  fixture: "⚑",
};

export type LegVisual = Mode | "walk";

/** One colour family per mode: tiles use the bright system colour, map lines a deeper shade, badges the deepest. */
export const modeColors: Record<LegVisual, { tile: string; line: string; badge: string | null; rest: string }> = {
  lrt: { tile: "#34C759", line: "#179846", badge: "#0E7C3A", rest: "#8FD1A8" },
  jeepney: { tile: "#FF9500", line: "#D9640A", badge: "#C2410C", rest: "#EDB98C" },
  bus: { tile: "#32ADE6", line: "#0A84B8", badge: "#0369A1", rest: "#94CBE4" },
  van: { tile: "#AF52DE", line: "#9A3FD0", badge: "#7E2DB0", rest: "#D2B0EA" },
  tricycle: { tile: "#FF2D55", line: "#D81B60", badge: "#B0124B", rest: "#EEA3BE" },
  walk: { tile: "#007AFF", line: "#0066CC", badge: null, rest: "#0066CC" },
};

/** Lines drawn on cards and the map: the deeper map-line shade of each mode. */
export const legColors: Record<LegVisual, string> = {
  walk: modeColors.walk.line,
  van: modeColors.van.line,
  jeepney: modeColors.jeepney.line,
  bus: modeColors.bus.line,
  tricycle: modeColors.tricycle.line,
  lrt: modeColors.lrt.line,
};

/** Decorative icon tiles beside a text label, as in iOS Settings. Never used for text. */
export const tileColors = {
  ai: "#5856D6",
  transit: "#34C759",
  maps: "#32ADE6",
  location: "#007AFF",
  alert: "#FF3B30",
  place: "#FF3B30",
  session: "#AF52DE",
  other: "#8E8E93",
  disabled: "#C7C7CC",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, field: 12, tile: 7, pill: 999 } as const;

// Font sizes are base sizes; system font scaling stays enabled everywhere.
// SF Pro scale from the UI kit: Large Title 34/41, Title 2 22/28, Headline and Body 17/22,
// Subhead 15/20, Footnote 13/18, Caption 2 11/14 (map attribution only).
export const type = {
  largeTitle: 34,
  title: 22,
  heading: 20,
  subheading: 17,
  body: 17,
  small: 15,
  caption: 13,
  tiny: 11,
} as const;

export const lineHeight = {
  largeTitle: 41,
  title: 28,
  heading: 25,
  body: 22,
  small: 20,
  caption: 18,
  tiny: 14,
} as const;

// Minimum touch target (Android 48dp, iOS 44pt).
export const minTouch = 48;
