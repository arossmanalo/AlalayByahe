// Member 3 (UI-003): option summary card and honest fare presentation.
import type { FareQuote, JourneyOption } from "../contracts";
import { AppButton, Body, Card, Heading, LegBadge, Notice, Row, Small, StatusPill } from "./components/primitives";
import { formatCentavosRange, formatMeters } from "./format";
import { fareDisplay, firstRide, legSequence } from "./journey-presenter";
import { useUi } from "./services";

/** Option-level fare: a partial subtotal is always labeled as not the full total. */
export function FareSummary({ fare }: { fare: JourneyOption["fare"] }) {
  const { t } = useUi();
  const d = fareDisplay(fare);
  switch (d.kind) {
    case "complete":
      return (
        <Row>
          <Small>{t.fareLabel}:</Small>
          <StatusPill tone="success" label={t.fareCompleteRange(formatCentavosRange(d.minCentavos, d.maxCentavos))} />
        </Row>
      );
    case "partial": {
      const subtotal = formatCentavosRange(d.knownMinCentavos, d.knownMaxCentavos);
      return (
        <Notice tone="warning" title={`${t.fareLabel}: ${t.fareNotTotal}`}>
          <Body>
            {d.unknownRideLegs > 0 ? t.farePartial(subtotal, d.unknownRideLegs) : `${subtotal}`}
          </Body>
        </Notice>
      );
    }
    case "unknown":
      return (
        <Notice tone="warning" title={`${t.fareLabel}: ${t.fareUnknown}`}>
          {d.unknownRideLegs > 0 ? <Body>{t.fareUnknownLegs(d.unknownRideLegs)}</Body> : null}
        </Notice>
      );
  }
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
      <Row>
        <Small>{t.fareLabel}:</Small>
        <StatusPill
          tone={amount === null ? "warning" : fare.status === "verified" ? "success" : "info"}
          label={amount === null ? t.fareUnknown : `${amount} (${t.fareReliability[fare.status]})`}
        />
      </Row>
      {fare.basis ? <Small>{t.fareBasis(fare.basis)}</Small> : null}
    </>
  );
}

export function LegSequence({ option }: { option: JourneyOption }) {
  const { t } = useUi();
  const seq = legSequence(option);
  return (
    <Row>
      {seq.map((kind, i) => (
        <Row key={i} wrap={false}>
          <LegBadge kind={kind} label={kind === "walk" ? t.walkName : t.modeNames[kind]} />
          {i < seq.length - 1 ? <Small>→</Small> : null}
        </Row>
      ))}
    </Row>
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
  return (
    <Card>
      <Heading level={2}>{t.optionLabel(index + 1)}</Heading>
      <LegSequence option={option} />
      {ride ? (
        <>
          <Body style={{ fontWeight: "700" }}>{t.boardFirst(ride.boardLabel)}</Body>
          <Small>
            {t.directionSign}: {ride.headsign}
          </Small>
        </>
      ) : null}
      <Row>
        <StatusPill tone="neutral" label={t.transfers(option.transfers)} />
        <StatusPill tone="neutral" label={t.walkTotal(formatMeters(option.walkMeters))} />
      </Row>
      <FareSummary fare={option.fare} />
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
