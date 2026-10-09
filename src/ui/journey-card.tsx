// Member 3 (UI-003): option summary card and honest fare presentation.
import { View } from "react-native";
import type { FareQuote, JourneyOption } from "../contracts";
import { AppButton, Body, Card, Heading, LabeledStatus, LegBadge, Notice, Row, Small, StatusPill } from "./components/primitives";
import { formatCentavosRange, formatMeters } from "./format";
import { fareText, firstRide, firstRideLine, legSequence } from "./journey-presenter";
import { useUi } from "./services";

/** Option-level fare: a total says verified or estimated; a partial subtotal is never a total. */
export function FareSummary({ option }: { option: JourneyOption }) {
  const { t } = useUi();
  const text = fareText(option, t);
  if (text.kind === "complete") {
    return <LabeledStatus label={text.label} tone={text.reliability === "verified" ? "success" : "info"} value={text.value} />;
  }
  return (
    <Notice tone="warning" title={text.title}>
      {text.lines.map((line) => (
        <Body key={line}>{line}</Body>
      ))}
    </Notice>
  );
}

/** Per-ride fare quote with reliability and basis. Unknown is never rendered as an amount. */
export function LegFare({ fare }: { fare: FareQuote }) {
  const { t } = useUi();
  const amount =
    fare.status !== "unknown" && fare.minCentavos !== null && fare.maxCentavos !== null
      ? formatCentavosRange(fare.minCentavos, fare.maxCentavos)
      : null;
  return (
    <>
      <LabeledStatus
        label={t.fareLabel}
        tone={amount === null ? "warning" : fare.status === "verified" ? "success" : "info"}
        value={amount === null ? t.fareUnknown : `${amount} (${t.fareReliability[fare.status]})`}
      />
      {fare.basis ? <Small>{t.fareBasis(fare.basis)}</Small> : null}
    </>
  );
}

export function LegSequence({ option }: { option: JourneyOption }) {
  const { t } = useUi();
  const seq = legSequence(option);
  const names = seq.map((kind) => (kind === "walk" ? t.walkName : t.modeNames[kind]));
  // Read as one sentence ("Walk, then LRT, then Walk") instead of badges and arrow glyphs.
  return (
    <View accessible accessibilityLabel={t.legSequenceA11y(names)}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Row>
          {seq.map((kind, i) => (
            <Row key={i} wrap={false}>
              <LegBadge kind={kind} label={names[i]!} />
              {i < seq.length - 1 ? <Small>→</Small> : null}
            </Row>
          ))}
        </Row>
      </View>
    </View>
  );
}

export function JourneyCard({
  option,
  index,
  onOpen,
}: {
  option: JourneyOption;
  index: number;
  onOpen: () => void;
}) {
  const { t } = useUi();
  const ride = firstRide(option);
  const rideLine = firstRideLine(option, t);
  return (
    <Card>
      <Heading level={2}>{t.optionLabel(index + 1)}</Heading>
      <LegSequence option={option} />
      {ride ? (
        <>
          <Body style={{ fontWeight: "700" }}>{rideLine}</Body>
          <Small>
            {t.directionSign}: {ride.headsign}
          </Small>
        </>
      ) : null}
      <Row>
        <StatusPill tone="neutral" label={t.transfers(option.transfers)} />
        <StatusPill tone="neutral" label={t.walkTotal(formatMeters(option.walkMeters))} />
      </Row>
      <FareSummary option={option} />
      <Small>
        {t.whyThisOption}: {option.rankReason}
      </Small>
      {option.warnings.length > 0 ? (
        <Notice tone="warning" title={t.warningsHeading}>
          {option.warnings.map((w) => (
            <Body key={w}>• {w}</Body>
          ))}
        </Notice>
      ) : null}
      <AppButton label={t.viewSteps} onPress={onOpen} />
    </Card>
  );
}
