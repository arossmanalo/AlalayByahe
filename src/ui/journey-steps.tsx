// Member 3 (UI-003): ordered steps as a timeline (design artboards "Steps"), built only from RouteResult
// fields and the pack's stop order. Boarding, direction and drop-off are separately labelled so the user can
// name each one (EC-104).
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Evidence, JourneyLeg, JourneyOption, RideLeg, RouteRequest, SourceRef, TransitPack } from "../contracts";
import { Icon } from "./components/icons";
import { AppButton, badgeLabel, DirectionSign, LegBadge, text } from "./components/primitives";
import { formatDate, formatMeters } from "./format";
import { legFareLine } from "./journey-card";
import { journeySteps, type JourneyStep } from "./journey-presenter";
import { rideStopLabels, stationName } from "./map-geometry";
import { useReadiness, useUi } from "./services";
import { colors, modeColors, radius, spacing } from "./theme";

/** Source records from the loaded pack, keyed by ID, for readable citations. */
export function useSources(): Map<string, SourceRef> {
  const { pack } = useReadiness();
  const map = new Map<string, SourceRef>();
  if (pack.status === "loaded" && pack.result.ok) {
    for (const s of pack.result.value.sources) map.set(s.id, s);
  }
  return map;
}

export function EvidenceLine({ evidence }: { evidence: Evidence }) {
  const { t } = useUi();
  const sources = useSources();
  const cited = evidence.sourceIds.map((id) => {
    const s = sources.get(id);
    return s ? `${s.title} (${s.publisher})` : id;
  });
  return (
    <Text style={text.footnote}>
      {t.reliabilityLabel(t.fareReliability[evidence.reliability])} · {t.checkedOn(formatDate(evidence.checkedAt))}
      {cited.length > 0 ? ` · ${t.sourcesLabel}: ${cited.join("; ")}` : ""}
      {evidence.note ? ` · ${evidence.note}` : ""}
    </Text>
  );
}

type Segment = "ride" | "walk" | "none";

function segmentOf(leg: JourneyLeg | undefined): { kind: Segment; color: string } {
  if (!leg) return { kind: "none", color: "transparent" };
  return leg.kind === "walk" ? { kind: "walk", color: modeColors.walk.line } : { kind: "ride", color: modeColors[leg.mode].line };
}

function RailPiece({ segment, flex, height }: { segment: { kind: Segment; color: string }; flex?: boolean; height?: number }) {
  const size = flex ? { flex: 1 } : { height };
  if (segment.kind === "ride") return <View style={[size, styles.rideRail, { backgroundColor: segment.color }]} />;
  if (segment.kind === "walk") return <View style={[size, styles.walkRail, { borderColor: segment.color }]} />;
  return <View style={size} />;
}

/** One timeline row: the rail on the left (line, marker, line) and the content on the right. */
function TimelineRow({
  above,
  below,
  marker,
  children,
}: {
  above: { kind: Segment; color: string };
  below: { kind: Segment; color: string };
  marker: ReactNode | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rail} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {marker ? (
          <>
            <RailPiece segment={above} height={6} />
            {marker}
            <RailPiece segment={below} flex />
          </>
        ) : (
          <RailPiece segment={below} flex />
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function Ring({ color, size, border }: { color: string; size: number; border: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: border, borderColor: color, backgroundColor: "#FFFFFF" }} />;
}

function GetOffPin() {
  return (
    <View style={styles.getOff}>
      <View style={styles.getOffDot} />
    </View>
  );
}

function RideStops({ leg, pack }: { leg: RideLeg; pack: TransitPack | null }) {
  const { t } = useUi();
  const [open, setOpen] = useState(false);
  const labels = pack ? rideStopLabels(pack, leg) : null;
  if (!labels) return null;
  const between = labels.slice(1, -1).map(stationName);
  const count = labels.length - 1;
  const preview = between.length > 3 ? `${between.slice(0, 2).join(", ")} … ${between[between.length - 1]}` : between.join(", ");
  return (
    <View style={styles.rideBox}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t.rideStops(count)}${preview ? `: ${preview}` : ""}`}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.rideButton, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <Text style={[text.subhead, styles.semibold]}>{t.rideStops(count)}</Text>
          {preview ? <Text style={text.footnote}>{preview}</Text> : null}
        </View>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} color={colors.textMuted} strokeWidth={3} />
      </Pressable>
      {open
        ? labels.slice(1).map((label, i) => (
            <Text key={`${label}_${i}`} style={[text.footnoteDark, styles.stopLine]}>
              {i + 1}. {label}
            </Text>
          ))
        : null}
    </View>
  );
}

/** The whole journey as one timeline: board, ride, get off, walk, in order. */
export function JourneyTimeline({
  option,
  request,
  pack,
  onOnboard,
}: {
  option: JourneyOption;
  request: RouteRequest | null;
  pack: TransitPack | null;
  onOnboard?: (leg: RideLeg) => void;
}) {
  const { t } = useUi();
  const steps = journeySteps(option, request);
  const legs = option.legs;
  const rides = legs.filter((l): l is RideLeg => l.kind === "ride");
  const lastRideIndex = legs.reduce((last, leg, i) => (leg.kind === "ride" ? i : last), -1);

  return (
    <View style={styles.timeline}>
      {steps.map((step: JourneyStep, i) => {
        const above = segmentOf(legs[i - 1]);
        const here = segmentOf(legs[i]);
        const below = segmentOf(legs[i + 1]);
        if (step.kind === "walk") {
          const { leg, fromLabel, toLabel } = step;
          return (
            <TimelineRow key={step.number} above={here} below={here} marker={null}>
              <View style={styles.walkTitle}>
                <Icon name="walk" size={16} color={colors.text} strokeWidth={2} />
                <Text style={[text.subhead, styles.semibold]}>{t.walkStep(formatMeters(leg.meters))}</Text>
              </View>
              {fromLabel && toLabel ? <Text style={text.subhead}>{t.walkFromTo(fromLabel, toLabel)}</Text> : null}
              {!fromLabel && toLabel ? <Text style={text.subhead}>{t.walkTo(toLabel)}</Text> : null}
              {leg.instructions.length > 0 ? (
                <View style={styles.instructions}>
                  {leg.instructions.map((line, n) => (
                    <View key={n} style={styles.instruction}>
                      <Text style={[styles.instructionText, text.muted, styles.instructionNumber]}>
                        {step.number}.{n + 1}
                      </Text>
                      <Text style={[styles.instructionText, styles.flex]}>{line}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <EvidenceLine evidence={leg.evidence} />
            </TimelineRow>
          );
        }
        const { leg } = step;
        const final = i === lastRideIndex;
        const color = modeColors[leg.mode].line;
        const count = pack ? rideStopLabels(pack, leg) : null;
        return (
          <View key={step.number}>
            <TimelineRow above={above} below={here} marker={<Ring color={color} size={18} border={4} />}>
              <Text style={[text.body, styles.semibold]}>{leg.alreadyOnboard ? t.stayOnboard : t.boardAt(leg.boardLabel)}</Text>
              <View
                style={styles.badges}
                accessible
                accessibilityLabel={[`${t.rideOn} ${t.modeNames[leg.mode]}: ${leg.serviceName}`, `${t.directionSign}: ${leg.headsign}`, rides.length > 1 ? `${t.fareLabel}: ${legFareLine(leg.fare, t)}` : null].filter(Boolean).join(". ")}
              >
                <LegBadge kind={leg.mode} label={badgeLabel(leg.serviceName, t.modeNames[leg.mode])} small />
                <DirectionSign headsign={leg.headsign} />
                {rides.length > 1 ? <Text style={text.footnote}>{legFareLine(leg.fare, t)}</Text> : null}
              </View>
              {badgeLabel(leg.serviceName, t.modeNames[leg.mode]) !== leg.serviceName ? <Text style={text.footnote}>{leg.serviceName}</Text> : null}
              {onOnboard && rides.length > 1 && !leg.alreadyOnboard ? (
                <AppButton label={t.imOnThisVehicle} variant="link" onPress={() => onOnboard(leg)} style={styles.inlineLink} />
              ) : null}
            </TimelineRow>
            <TimelineRow above={here} below={here} marker={null}>
              <RideStops leg={leg} pack={pack} />
            </TimelineRow>
            <TimelineRow above={here} below={below} marker={final ? <GetOffPin /> : <Ring color={color} size={14} border={3} />}>
              <Text style={[text.body, styles.semibold]}>{t.getOffAt(leg.alightLabel)}</Text>
              {count && !leg.alreadyOnboard ? <Text style={text.footnote}>{t.stopsAfter(count.length - 1, stationName(leg.boardLabel))}</Text> : null}
            </TimelineRow>
          </View>
        );
      })}
    </View>
  );
}

/** Per-leg sources, check dates and fare basis, for the "Sources and checks" row. */
export function SourcesList({ option }: { option: JourneyOption }) {
  const { t } = useUi();
  return (
    <View style={styles.sources}>
      {option.legs.map((leg, i) => (
        <View key={i} style={styles.sourceItem}>
          <Text style={[text.footnoteDark, styles.semibold]}>
            {t.stepN(i + 1)} · {leg.kind === "walk" ? t.walkName : `${t.modeNames[leg.mode]} ${leg.serviceName}`}
          </Text>
          <EvidenceLine evidence={leg.evidence} />
          {leg.kind === "ride" ? (
            <Text style={text.footnote}>
              {t.fareLabel}: {legFareLine(leg.fare, t)}
              {leg.fare.basis ? ` · ${t.fareBasis(leg.fare.basis)}` : ""}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  semibold: { fontWeight: "600" },
  pressed: { opacity: 0.6 },
  timeline: { paddingTop: 14, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  rail: { width: 28, alignItems: "center" },
  rideRail: { width: 5 },
  walkRail: { width: 0, borderLeftWidth: 4, borderStyle: "dotted" },
  content: { flex: 1, minWidth: 0, gap: 6, paddingBottom: 14 },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  getOff: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.getOff, alignItems: "center", justifyContent: "center" },
  getOffDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  rideBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  rideButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stopLine: { paddingHorizontal: spacing.md, paddingBottom: 4 },
  walkTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  instructions: { gap: 6, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  instruction: { flexDirection: "row", gap: 6 },
  instructionText: { fontSize: 14, lineHeight: 19, color: colors.text },
  instructionNumber: { minWidth: 26 },
  inlineLink: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 0, paddingVertical: 0 },
  sources: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sourceItem: { gap: 2 },
});
