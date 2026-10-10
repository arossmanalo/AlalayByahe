// Schematic map behind the bottom sheet, drawn on the phone from stored coordinates (src/ui/map-geometry.ts).
// No tiles, roads or water: nothing is requested from a map service and it works offline.
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { fitProjection, pathData, type MapLayers, type MapPalette, type MapPin, type MapPoint } from "../map-geometry";
import { colors, legColors, mapColors, modeColors } from "../theme";

const LABEL_FONT = 13;
const SIDE_PADDING = 56;
// SVG text has no inherited font; native uses the system font, the web preview needs a stack.
const LABEL_FAMILY = Platform.select({ web: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", default: undefined });

export const MAP_PALETTE: MapPalette = {
  line: legColors,
  rest: {
    lrt: modeColors.lrt.rest,
    jeepney: modeColors.jeepney.rest,
    bus: modeColors.bus.rest,
    van: modeColors.van.rest,
    tricycle: modeColors.tricycle.rest,
    walk: modeColors.walk.rest,
  },
  unverified: mapColors.unverified,
};

export function SchematicMap({
  width,
  height,
  fitTop,
  fitBottom,
  layers,
  accessibilityLabel,
  caption,
  badge,
}: {
  width: number;
  height: number;
  fitTop: number;
  fitBottom: number;
  layers: MapLayers;
  accessibilityLabel: string;
  /** Short note above the sheet edge, such as "lines are straight, not the track". */
  caption?: string;
  /** Pill over the map, such as "LRT-1 · covered". */
  badge?: ReactNode;
}) {
  const project = fitProjection(layers.fit, { width, height, top: fitTop, bottom: fitBottom, side: SIDE_PADDING });
  const proj = (pins: MapPin[]) => (project ? pins.map((p) => ({ pin: p, at: project(p.point) })) : []);
  const pinned = proj(layers.pins);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[StyleSheet.absoluteFill, { backgroundColor: mapColors.land }]}
    >
      <Svg width={width} height={height}>
        {project ? (
          <>
            {layers.lines.map((line, i) => {
              const d = pathData(line.points.map(project));
              const dash = line.style === "dotted" ? "0.5 7.5" : line.style === "dashed" ? "7 6" : undefined;
              return (
                <G key={`l${i}`}>
                  {line.casing ? <Path d={d} fill="none" stroke={mapColors.casing} strokeWidth={line.width + 4} strokeLinecap="round" strokeLinejoin="round" /> : null}
                  <Path d={d} fill="none" stroke={line.color} strokeWidth={line.width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
                </G>
              );
            })}
            {pinned.filter(({ pin }) => pin.kind === "station").map(({ pin, at }, i) => (
              <Circle key={`s${i}`} cx={at.x} cy={at.y} r={2.6} fill="#FFFFFF" stroke={pin.color} strokeWidth={1.8} />
            ))}
            {pinned.filter(({ pin }) => pin.kind !== "station").map(({ pin, at }, i) => (
              <PinMark key={`p${i}`} pin={pin} at={at} />
            ))}
            {pinned.filter(({ pin }) => pin.label).map(({ pin, at }, i) => (
              <Label key={`t${i}`} text={pin.label!} at={at} width={width} big={pin.kind !== "station"} />
            ))}
          </>
        ) : null}
      </Svg>
      {badge ? <View style={[styles.badge, { top: Math.round((fitTop + fitBottom) / 2) - 16 }]}>{badge}</View> : null}
      {caption ? (
        <Text style={[styles.caption, { top: fitBottom + 8 }]} importantForAccessibility="no">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function PinMark({ pin, at }: { pin: MapPin; at: MapPoint }) {
  switch (pin.kind) {
    case "alight":
      return (
        <G>
          <Circle cx={at.x} cy={at.y} r={10} fill={colors.getOff} stroke="#FFFFFF" strokeWidth={3} />
          <Circle cx={at.x} cy={at.y} r={3.4} fill="#FFFFFF" />
        </G>
      );
    case "board":
      return <Circle cx={at.x} cy={at.y} r={8} fill="#FFFFFF" stroke={pin.color} strokeWidth={4.5} />;
    case "transfer":
      return <Circle cx={at.x} cy={at.y} r={6.5} fill="#FFFFFF" stroke={pin.color} strokeWidth={3.5} />;
    case "unverified":
      return <Circle cx={at.x} cy={at.y} r={6.5} fill="#FFFFFF" stroke={pin.color} strokeWidth={3.5} strokeDasharray="3 2.4" />;
    case "origin":
      return <Circle cx={at.x} cy={at.y} r={7} fill="#FFFFFF" stroke={colors.you} strokeWidth={4} />;
    case "you":
      return (
        <G>
          <Circle cx={at.x} cy={at.y} r={16} fill="rgba(0,102,204,0.16)" />
          <Circle cx={at.x} cy={at.y} r={8} fill={colors.you} stroke="#FFFFFF" strokeWidth={3} />
        </G>
      );
    default:
      return null;
  }
}

function Label({ text, at, width, big }: { text: string; at: MapPoint; width: number; big: boolean }) {
  // Labels sit to the right of the point unless that would run off the screen.
  const rightRoom = width - at.x;
  const anchor = rightRoom < text.length * 7.5 + 24 ? "end" : "start";
  const x = anchor === "start" ? at.x + (big ? 14 : 10) : at.x - (big ? 14 : 10);
  const y = at.y + 4.5;
  const common = { x, y, fontSize: LABEL_FONT, fontWeight: "600" as const, fontFamily: LABEL_FAMILY, textAnchor: anchor as "start" | "end" };
  return (
    <G>
      <SvgText {...common} fill="none" stroke={mapColors.labelHalo} strokeWidth={3.5} strokeLinejoin="round">
        {text}
      </SvgText>
      <SvgText {...common} fill={mapColors.label}>
        {text}
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  // Middle of the map, right side, beside the line as in the design.
  badge: { position: "absolute", right: 16 },
  caption: {
    position: "absolute",
    left: 12,
    right: 12,
    fontSize: 11,
    lineHeight: 14,
    color: mapColors.caption,
    textShadowColor: "#FFFFFF",
    textShadowRadius: 3,
  },
});

/** White pill over the map, with an icon. */
export function MapPill({ children }: { children: ReactNode }) {
  return <View style={pill.box}>{children}</View>;
}

const pill = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    boxShadow: "0 1px 6px rgba(0,0,0,0.16)",
  },
});
