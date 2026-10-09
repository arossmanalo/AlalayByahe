// Member 3 (UI-001): shared visual tokens.
// Contrast targets WCAG AA for body text on `surface` and `background`, and 3:1 for input and chip
// boundaries (WCAG 1.4.11). tests/ui/contrast.test.ts checks every pair the screens use.
// Meaning is never carried by color alone: every tone also has a text label.
import type { Mode } from "../contracts";

export const colors = {
  background: "#F5F6F4",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF0F3",
  text: "#14181F",
  textMuted: "#47505E",
  border: "#C3CAD4",
  // Edges of inputs and unselected chips. `border` is for decorative card edges only.
  controlBorder: "#6E7783",
  primary: "#0A5A87",
  primaryPressed: "#073F60",
  onPrimary: "#FFFFFF",
  info: "#0A5A87",
  infoSurface: "#E4F0F7",
  success: "#1D6331",
  successSurface: "#E5F3E8",
  warning: "#6E4500",
  warningSurface: "#FFF3D6",
  danger: "#9E2318",
  dangerSurface: "#FBE9E7",
  fixture: "#55267F",
  fixtureSurface: "#F0E6F9",
  disabled: "#8A929E",
  disabledSurface: "#E2E5E9",
} as const;

export type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "fixture";

export const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  info: { fg: colors.info, bg: colors.infoSurface, border: colors.info },
  success: { fg: colors.success, bg: colors.successSurface, border: colors.success },
  warning: { fg: colors.warning, bg: colors.warningSurface, border: colors.warning },
  danger: { fg: colors.danger, bg: colors.dangerSurface, border: colors.danger },
  neutral: { fg: colors.textMuted, bg: colors.surfaceMuted, border: colors.border },
  fixture: { fg: colors.fixture, bg: colors.fixtureSurface, border: colors.fixture },
};

// Text glyphs accompany tone colors so status survives color blindness and grayscale.
export const toneGlyph: Record<Tone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  danger: "✕",
  neutral: "•",
  fixture: "⚑",
};

export type LegVisual = Mode | "walk";

export const legColors: Record<LegVisual, string> = {
  walk: "#47505E",
  van: "#5E3A99",
  jeepney: "#9A4300",
  bus: "#0A5A87",
  tricycle: "#256B2C",
  lrt: "#8F1D55",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

// Font sizes are base sizes; system font scaling stays enabled everywhere.
export const type = {
  title: 26,
  heading: 21,
  subheading: 18,
  body: 17,
  small: 15,
  caption: 13,
} as const;

// Minimum touch target (Android 48dp, iOS 44pt).
export const minTouch = 48;
