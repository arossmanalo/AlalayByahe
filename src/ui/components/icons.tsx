// Stroke icons and the logo mark from the AlalayByahe UI kit (24 x 24 grid, round caps and joins).
// Icons are decoration next to a text label: they are hidden from screen readers.
import type { ReactElement } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import type { LegVisual } from "../theme";

export type IconName =
  | "gear"
  | "search"
  | "lrt"
  | "jeepney"
  | "bus"
  | "van"
  | "tricycle"
  | "walk"
  | "pin"
  | "locate"
  | "clock"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "chevronUp"
  | "close"
  | "swap"
  | "check"
  | "lock"
  | "info"
  | "warning"
  | "problem"
  | "bell"
  | "chip"
  | "map"
  | "globe"
  | "refresh"
  | "signboard"
  | "noTracking"
  | "phone"
  | "minus"
  | "plus"
  | "question"
  | "estimate"
  | "arrowRight";

type Shape = (props: { stroke: string; fill: string }) => ReactElement;

const ICONS: Record<IconName, Shape> = {
  gear: () => (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  search: () => (
    <>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="M15.5 15.5L20 20" />
    </>
  ),
  lrt: () => (
    <>
      <Rect x="6" y="3" width="12" height="13" rx="3" />
      <Path d="M6 9.5h12" />
      <Path d="M9 16l-2 4.5" />
      <Path d="M15 16l2 4.5" />
    </>
  ),
  jeepney: () => (
    <>
      <Path d="M2.5 16.5v-7L5 7h12.5l2 2.5h2v7" />
      <Path d="M2.5 11.5h19" />
      <Circle cx="7" cy="17" r="1.8" />
      <Circle cx="17" cy="17" r="1.8" />
    </>
  ),
  bus: () => (
    <>
      <Rect x="4.5" y="3" width="15" height="14" rx="3" />
      <Path d="M4.5 10h15" />
      <Path d="M7.5 17v3" />
      <Path d="M16.5 17v3" />
    </>
  ),
  van: () => (
    <>
      <Path d="M3.5 16V9.5a2 2 0 0 1 2-2H15l4 4.5V16" />
      <Path d="M3.5 12h15.5" />
      <Circle cx="7.5" cy="16.5" r="1.8" />
      <Circle cx="16" cy="16.5" r="1.8" />
    </>
  ),
  tricycle: () => (
    <>
      <Path d="M3 14V8.5h7.5V14" />
      <Circle cx="6" cy="17.5" r="1.8" />
      <Circle cx="18" cy="17.5" r="1.8" />
      <Path d="M10.5 14H15l2-5h2.5" />
      <Path d="M3 14h7.5" />
    </>
  ),
  walk: () => (
    <>
      <Circle cx="12.5" cy="4.5" r="1.8" />
      <Path d="M10 21l2.2-6.2" />
      <Path d="M15.5 21l-1.6-4.6-1.7-1.8.8-4.6" />
      <Path d="M7.5 12l1.6-3.4 3.3-.9 2.1 2.9 2.5.9" />
    </>
  ),
  pin: () => (
    <>
      <Path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
      <Circle cx="12" cy="10" r="2.3" />
    </>
  ),
  locate: ({ stroke }) => <Path d="M20.5 3.5L3.5 11l7.2 2.3L13 20.5z" fill={stroke} />,
  clock: () => (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  chevronRight: () => <Path d="M9 5.5l6.5 6.5L9 18.5" />,
  chevronLeft: () => <Path d="M15 5l-7 7 7 7" />,
  chevronDown: () => <Path d="M6 9l6 6 6-6" />,
  chevronUp: () => <Path d="M6 15l6-6 6 6" />,
  close: () => (
    <>
      <Path d="M6 6l12 12" />
      <Path d="M18 6L6 18" />
    </>
  ),
  swap: () => (
    <>
      <Path d="M7.5 4v16" />
      <Path d="M3.5 8l4-4 4 4" />
      <Path d="M16.5 20V4" />
      <Path d="M12.5 16l4 4 4-4" />
    </>
  ),
  check: () => <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: () => (
    <>
      <Rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  info: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5.5" />
      <Path d="M12 7.5h.01" />
    </>
  ),
  warning: () => (
    <>
      <Path d="M12 3.5L2.5 20h19z" />
      <Path d="M12 10v4.5" />
      <Path d="M12 17.3h.01" />
    </>
  ),
  problem: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7.5v5.5" />
      <Path d="M12 16.5h.01" />
    </>
  ),
  bell: () => (
    <>
      <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <Path d="M10 21h4" />
    </>
  ),
  chip: () => (
    <>
      <Rect x="6" y="6" width="12" height="12" rx="2" />
      <Rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <Path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  map: () => (
    <>
      <Path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z" />
      <Path d="M9 4.5v13" />
      <Path d="M15 6.5v13" />
    </>
  ),
  globe: () => (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M3.5 12h17" />
      <Path d="M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5z" />
    </>
  ),
  refresh: () => (
    <>
      <Path d="M20 12a8 8 0 0 1-14.2 5" />
      <Path d="M4 12a8 8 0 0 1 14.2-5" />
      <Path d="M18.5 3.5V7H15" />
      <Path d="M5.5 20.5V17H9" />
    </>
  ),
  signboard: () => (
    <>
      <Rect x="3" y="5.5" width="18" height="9" rx="1.5" />
      <Path d="M8 14.5v5" />
      <Path d="M16 14.5v5" />
    </>
  ),
  noTracking: () => (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
      <Path d="M4 4l16 16" />
    </>
  ),
  phone: () => (
    <>
      <Rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <Path d="M11 18.5h2" />
    </>
  ),
  minus: () => <Path d="M5 12h14" />,
  plus: () => (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  question: () => (
    <>
      <Path d="M9 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
      <Path d="M12 18.5h.01" />
    </>
  ),
  estimate: () => (
    <>
      <Path d="M5 9.5c2-2 4.5-2 7 0s5 2 7 0" />
      <Path d="M5 15.5c2-2 4.5-2 7 0s5 2 7 0" />
    </>
  ),
  arrowRight: () => (
    <>
      <Path d="M4 12h15" />
      <Path d="M13 6l6 6-6 6" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
  style,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Shape = ICONS[name];
  return (
    <View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <Shape stroke={color} fill="none" />
        </G>
      </Svg>
    </View>
  );
}

/** Icon shown in a mode's tile and badge row. */
export const modeIcon: Record<LegVisual, IconName> = {
  lrt: "lrt",
  jeepney: "jeepney",
  bus: "bus",
  van: "van",
  tricycle: "tricycle",
  walk: "walk",
};

/**
 * The AlalayByahe mark: a pin on a winding road. "plain" is blue on white (tagline lockups), "onTint" is
 * the app icon artwork (white pin, yellow road) drawn on a tint square.
 */
export function LogoMark({ size, variant = "plain", haloColor = "#FFFFFF" }: { size: number; variant?: "plain" | "onTint"; haloColor?: string }) {
  const road = variant === "plain" ? "#0066CC" : "#FFD60A";
  const dash = variant === "plain" ? "#FFD60A" : "#0066CC";
  const pinFill = variant === "plain" ? "#0066CC" : "#FFFFFF";
  const pinStroke = variant === "plain" ? haloColor : "#0066CC";
  const hole = variant === "plain" ? "#FFFFFF" : "#0066CC";
  const mark = (
    <>
      <Path d="M12 76C22 66 40 66 48 76S74 86 84 74" fill="none" stroke={road} strokeWidth={11} strokeLinecap="round" />
      <Path d="M12 76C22 66 40 66 48 76S74 86 84 74" fill="none" stroke={dash} strokeWidth={2.2} strokeDasharray="4 4.5" />
      <Path d="M48 72C44 66 27 52 27 34A21 21 0 1 1 69 34C69 52 52 66 48 72Z" fill={pinFill} stroke={pinStroke} strokeWidth={4} strokeLinejoin="round" />
      <Circle cx="48" cy="34" r="8" fill={hole} />
    </>
  );
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 96 96">
        {variant === "onTint" ? <G transform="translate(10.6 8.2) scale(0.78)">{mark}</G> : mark}
      </Svg>
    </View>
  );
}

/** The app icon: the mark on a rounded tint square. */
export function AppIcon({ size }: { size: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.2167, backgroundColor: "#0066CC", overflow: "hidden" }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <LogoMark size={size} variant="onTint" />
    </View>
  );
}
