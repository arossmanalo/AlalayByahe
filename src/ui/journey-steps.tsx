// Member 3 (UI-003): numbered steps and a route diagram built only from RouteResult fields.
// Boarding, direction and dropoff are separately labeled so the user can name each one (EC-104).
import { StyleSheet, Text, View } from "react-native";
import type { Evidence, JourneyOption, RideLeg, RouteRequest, SourceRef } from "../contracts";
import { AppButton, Body, Card, Heading, LegBadge, Row, Small } from "./components/primitives";
import { formatDate, formatMeters } from "./format";
import { LegFare } from "./journey-card";
import { journeySteps, type JourneyStep } from "./journey-presenter";
import { useReadiness, useUi } from "./services";
import { colors, legColors, radius, spacing, type } from "./theme";

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
    <Small>
      {t.reliabilityLabel(t.fareReliability[evidence.reliability])} · {t.checkedOn(formatDate(evidence.checkedAt))}
      {cited.length > 0 ? ` · ${t.sourcesLabel}: ${cited.join("; ")}` : ""}
      {evidence.note ? ` · ${evidence.note}` : ""}
    </Small>
  );
}

function WalkStepCard({ step }: { step: Extract<JourneyStep, { kind: "walk" }> }) {
  const { t } = useUi();
  const { leg, fromLabel, toLabel } = step;
  return (
    <Card>
      <Row>
        <Heading level={3}>{t.stepN(step.number)}</Heading>
        <LegBadge kind="walk" label={t.walkName} />
      </Row>
      <Body style={styles.strong}>{t.walkStep(formatMeters(leg.meters))}</Body>
      {fromLabel && toLabel ? <Body>{t.walkFromTo(fromLabel, toLabel)}</Body> : null}
      {!fromLabel && toLabel ? <Body>{t.walkTo(toLabel)}</Body> : null}
      {leg.instructions.map((line, i) => (
        <Body key={i}>
          {step.number}.{i + 1} {line}
        </Body>
      ))}
      <EvidenceLine evidence={leg.evidence} />
    </Card>
  );
}

function RideStepCard({
  step,
  onOnboard,
}: {
  step: Extract<JourneyStep, { kind: "ride" }>;
  onOnboard?: (leg: RideLeg) => void;
}) {
  const { t } = useUi();
  const { leg } = step;
  return (
    <Card>
      <Row>
        <Heading level={3}>{t.stepN(step.number)}</Heading>
        <LegBadge kind={leg.mode} label={t.modeNames[leg.mode]} />
      </Row>

      <View style={styles.labelBlock}>
        <Small>{leg.alreadyOnboard ? t.stayOnboard : t.boardHere}</Small>
        {!leg.alreadyOnboard ? <Text style={styles.place}>{leg.boardLabel}</Text> : null}
      </View>

      <Body>
        {t.rideOn} {t.modeNames[leg.mode]}: {leg.serviceName}
      </Body>

      <View style={[styles.signboard, { borderColor: legColors[leg.mode] }]}>
        <Small>{t.directionSign}</Small>
        <Text style={styles.signText}>{leg.headsign}</Text>
      </View>

      <View style={styles.labelBlock}>
        <Small>{t.getOffHere}</Small>
        <Text style={styles.place}>{leg.alightLabel}</Text>
      </View>

      <LegFare fare={leg.fare} />
      <EvidenceLine evidence={leg.evidence} />
      {onOnboard && !leg.alreadyOnboard ? (
        <AppButton label={t.imOnThisVehicle} variant="link" onPress={() => onOnboard(leg)} />
      ) : null}
    </Card>
  );
}

/** Vertical overview. Hidden from screen readers in favor of one summary label; the steps follow in full. */
export function RouteDiagram({ option, request }: { option: JourneyOption; request: RouteRequest | null }) {
  const { t } = useUi();
  const steps = journeySteps(option, request);
  const first = steps[0];
  const startLabel =
    request?.origin.label ??
    (first?.kind === "ride" ? first.leg.boardLabel : first?.kind === "walk" ? first.fromLabel : null);

  const summary = steps
    .map((s) =>
      s.kind === "walk"
        ? t.walkStep(formatMeters(s.leg.meters))
        : `${t.modeNames[s.leg.mode]} ${s.leg.boardLabel} → ${s.leg.alightLabel} (${s.leg.headsign})`,
    )
    .join("; ");

  return (
    <Card>
      <Heading level={2}>{t.diagramHeading}</Heading>
      <View accessible accessibilityLabel={t.diagramA11y(summary)}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {startLabel ? <Node label={startLabel} /> : null}
          {steps.map((s) =>
            s.kind === "walk" ? (
              <View key={s.number}>
                <Segment color={legColors.walk} dashed text={`${t.walkName} ${formatMeters(s.leg.meters)}`} />
                <Node label={s.toLabel ?? (s.number === steps.length ? request?.destination.label ?? "" : "")} />
              </View>
            ) : (
              <View key={s.number}>
                <Segment
                  color={legColors[s.leg.mode]}
                  text={`${t.modeNames[s.leg.mode]} · ${s.leg.headsign}`}
                />
                <Node label={`${t.getOffHere}: ${s.leg.alightLabel}`} />
              </View>
            ),
          )}
        </View>
      </View>
    </Card>
  );
}

function Node({ label }: { label: string }) {
  return (
    <View style={styles.nodeRow}>
      <View style={styles.rail}>
        <View style={styles.dot} />
      </View>
      <Text style={styles.nodeText}>{label}</Text>
    </View>
  );
}

function Segment({ color, text, dashed = false }: { color: string; text: string; dashed?: boolean }) {
  return (
    <View style={styles.segmentRow}>
      <View style={styles.rail}>
        <View style={[styles.line, { borderColor: color, borderStyle: dashed ? "dashed" : "solid" }]} />
      </View>
      <Text style={styles.segmentText}>{text}</Text>
    </View>
  );
}

export function JourneySteps({
  option,
  request,
  onOnboard,
}: {
  option: JourneyOption;
  request: RouteRequest | null;
  onOnboard?: (leg: RideLeg) => void;
}) {
  const { t } = useUi();
  const steps = journeySteps(option, request);
  return (
    <>
      <Heading level={2}>{t.stepsHeading}</Heading>
      <Small>{t.followSteps}</Small>
      {steps.map((step) =>
        step.kind === "walk" ? (
          <WalkStepCard key={step.number} step={step} />
        ) : (
          <RideStepCard key={step.number} step={step} onOnboard={onOnboard} />
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  strong: { fontWeight: "700" },
  labelBlock: { gap: 2 },
  place: { fontSize: type.subheading, fontWeight: "700", color: colors.text },
  signboard: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    gap: 2,
  },
  signText: { fontSize: type.heading, fontWeight: "800", color: colors.text },
  nodeRow: { flexDirection: "row", alignItems: "center", minHeight: 28 },
  segmentRow: { flexDirection: "row", alignItems: "stretch", minHeight: 44 },
  rail: { width: 28, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.text },
  line: { flex: 1, width: 0, borderLeftWidth: 5 },
  nodeText: { flex: 1, fontSize: type.body, fontWeight: "600", color: colors.text },
  segmentText: { flex: 1, alignSelf: "center", fontSize: type.small, color: colors.textMuted, paddingVertical: spacing.sm },
});
