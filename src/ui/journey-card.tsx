// Member 3 (UI-003): option card (design artboard "Route options") and honest fare presentation.
// A total is called verified only when every ride fare is verified; a partial subtotal is never a total;
// an unknown fare is never shown as an amount.
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FareQuote, JourneyOption, TransitPack } from "../contracts";
import { Icon } from "./components/icons";
import { badgeLabel, DirectionSign, FareTag, IconNote, LegBadge, ModeTile, text, useGroupColor, type FareKind } from "./components/primitives";
import { formatCentavosRange, formatMeters } from "./format";
import type { Strings } from "./i18n";
import { fareDisplay, fareText, firstRide, firstRideLine, totalReliability } from "./journey-presenter";
import { optionStopCount } from "./map-geometry";
import { useUi } from "./services";
import { colors, radius, spacing } from "./theme";

export interface FareFigure {
  amount: string;
  kind: FareKind;
  tag: string | null;
  /** Extra lines for partial and unknown fares (unknown rides, confirm with the operator). */
  lines: string[];
}

/** The option fare as shown in large type: amount, reliability tag and the honest extra lines. */
export function fareFigure(option: Pick<JourneyOption, "fare" | "legs">, t: Strings): FareFigure {
  const d = fareDisplay(option.fare);
  const text = fareText(option, t);
  const lines = text.kind === "complete" ? [] : text.lines;
  switch (d.kind) {
    case "complete": {
      const verified = totalReliability(option.legs) === "verified";
      return {
        amount: formatCentavosRange(d.minCentavos, d.maxCentavos),
        kind: verified ? "verified" : "estimated",
        tag: verified ? t.verifiedTotal : t.estimatedTotal,
        lines,
      };
    }
    case "partial":
      return {
        amount: `${formatCentavosRange(d.knownMinCentavos, d.knownMaxCentavos)}${d.unknownRideLegs > 0 ? " + ?" : ""}`,
        kind: "partial",
        tag: t.notFullTotal,
        lines,
      };
    case "unknown":
      return { amount: t.fareUnknown, kind: "unknown", tag: null, lines };
  }
}

/** Per-ride fare in words: "₱14.00 · estimated", or "Fare unknown". */
export function legFareLine(fare: FareQuote, t: Strings): string {
  if (fare.status === "unknown" || fare.minCentavos === null || fare.maxCentavos === null) return t.fareUnknown;
  return `${formatCentavosRange(fare.minCentavos, fare.maxCentavos)} · ${t.fareReliability[fare.status]}`;
}

/** "13 stops · 0 transfers · 0 m walk"; the stop count is left out when the pack cannot give it. */
export function optionFacts(option: JourneyOption, pack: TransitPack | null, t: Strings): string {
  const stops = pack ? optionStopCount(pack, option) : null;
  return [stops !== null ? t.stopsCount(stops) : null, t.transfers(option.transfers), t.walkTotal(formatMeters(option.walkMeters))]
    .filter(Boolean)
    .join(" · ");
}

/** Mode tiles, line badges and walks in order. Read as one sentence: "Walk, then LRT, then Walk". */
export function LegSequence({ option, tiles = true }: { option: JourneyOption; tiles?: boolean }) {
  const { t } = useUi();
  const names = option.legs.map((leg) => (leg.kind === "walk" ? t.walkName : t.modeNames[leg.mode]));
  let firstRideSeen = false;
  return (
    <View accessible accessibilityLabel={t.legSequenceA11y(names)}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.sequence}>
        {option.legs.map((leg, i) => {
          const showTile = tiles && leg.kind === "ride" && !firstRideSeen;
          if (leg.kind === "ride") firstRideSeen = true;
          return (
            <Fragment key={i}>
              {i > 0 ? <Icon name="chevronRight" size={11} color={colors.chevron} strokeWidth={3} /> : null}
              {leg.kind === "walk" ? (
                <Icon name="walk" size={18} color={colors.textMuted} strokeWidth={2} />
              ) : (
                <View style={styles.ride}>
                  {showTile ? <ModeTile kind={leg.mode} /> : null}
                  <LegBadge kind={leg.mode} label={badgeLabel(leg.serviceName, t.modeNames[leg.mode])} />
                </View>
              )}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

export function FareAmount({ figure, size = "card" }: { figure: FareFigure; size?: "card" | "large" }) {
  return (
    <Text style={[size === "large" ? styles.amountLarge : styles.amount, figure.kind === "unknown" && text.muted]}>{figure.amount}</Text>
  );
}

export function OptionCard({ option, index, pack, onOpen }: { option: JourneyOption; index: number; pack: TransitPack | null; onOpen: () => void }) {
  const { t } = useUi();
  const bg = useGroupColor();
  const ride = firstRide(option);
  const rideLine = firstRideLine(option, t);
  const figure = fareFigure(option, t);
  const facts = optionFacts(option, pack, t);
  const names = option.legs.map((leg) => (leg.kind === "walk" ? t.walkName : t.modeNames[leg.mode]));
  const a11y = [
    t.optionLabel(index + 1),
    t.legSequenceA11y(names),
    ride ? `${t.directionSign}: ${ride.headsign}` : null,
    rideLine,
    facts,
    `${t.fareLabel}: ${figure.amount}${figure.tag ? `, ${figure.tag}` : ""}`,
    ...figure.lines,
    t.viewSteps,
  ]
    .filter(Boolean)
    .join(". ");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onOpen} style={({ pressed }) => [styles.card, { backgroundColor: bg }, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <LegSequence option={option} />
        </View>
        <View style={styles.fare}>
          <FareAmount figure={figure} />
          {figure.tag ? <FareTag kind={figure.kind} label={figure.tag} /> : null}
        </View>
      </View>
      {ride ? (
        <View style={styles.boardRow}>
          <DirectionSign headsign={ride.headsign} size="medium" />
          {rideLine ? <Text style={[text.subhead, { color: colors.textTertiary }]}>{rideLine}</Text> : null}
        </View>
      ) : null}
      {figure.lines.map((line) => (
        <Text key={line} style={text.footnote}>
          {line}
        </Text>
      ))}
      {option.warnings.map((w) => (
        <IconNote key={w} icon="warning" iconColor={colors.warning}>
          {w}
        </IconNote>
      ))}
      <View style={styles.bottom}>
        <Text style={[text.subhead, text.muted, styles.flex]}>{facts}</Text>
        <View style={styles.steps}>
          <Text style={[text.subhead, styles.stepsText]}>{t.stepsLink}</Text>
          <Icon name="chevronRight" size={13} color={colors.primary} strokeWidth={3} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  sequence: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  ride: { flexDirection: "row", alignItems: "center", gap: 6 },
  fare: { alignItems: "flex-end", gap: 1 },
  amount: { fontSize: 20, lineHeight: 24, fontWeight: "700", letterSpacing: -0.3, color: colors.text, textAlign: "right" },
  amountLarge: { fontSize: 22, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3, color: colors.text },
  boardRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, columnGap: spacing.sm },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  steps: { flexDirection: "row", alignItems: "center", gap: 2 },
  stepsText: { fontWeight: "600", color: colors.primary },
});
