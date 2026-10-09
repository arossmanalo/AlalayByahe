// Member 3 (UI-003, ALERT-003): full journey detail: diagram, ordered steps, fares, sources, warnings
// and the optional near-drop-off alert.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { Point } from "../src/contracts";
import { AppButton, Body, Heading, Notice, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { DropoffAlertCard } from "../src/ui/dropoff-alert-card";
import { FareSummary, LegSequence } from "../src/ui/journey-card";
import { optionIssues } from "../src/ui/journey-presenter";
import { JourneySteps, RouteDiagram } from "../src/ui/journey-steps";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";
import { TripMap } from "../src/ui/trip-map";
import { TripSummaryCard } from "../src/ui/trip-summary";

export default function JourneyScreen() {
  const router = useRouter();
  const { optionId } = useLocalSearchParams<{ optionId?: string }>();
  const { t } = useUi();
  const { session } = useJourneySession();
  const { pack } = useReadiness();
  const loadedPack = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;
  const [position, setPosition] = useState<Point | null>(null);
  const options = session.result?.ok ? session.result.value.options : [];
  const index = options.findIndex((o) => o.id === optionId);
  const option = index >= 0 ? options[index] : null;

  if (!option || optionIssues(option).length > 0) {
    // Missing or stale selection (e.g. the trip was edited), or incomplete data: never render partial steps.
    return (
      <Screen title={t.journeyTitle}>
        <Notice
          tone="danger"
          title={option ? t.incompleteAll : t.staleResult}
          actions={<AppButton label={t.back} onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen title={t.optionLabel(index + 1)}>
      <Heading>{t.optionLabel(index + 1)}</Heading>
      {session.request ? (
        <Body style={{ fontWeight: "700" }}>
          {session.request.origin.label} → {session.request.destination.label}
        </Body>
      ) : null}
      <LegSequence option={option} />
      <FareSummary option={option} />
      <TripSummaryCard option={option} request={session.request} />

      <Notice tone="warning" title={t.checkDirection}>
        <Body>{t.confirmServiceFare}</Body>
        <Body>{t.noTracking}</Body>
      </Notice>

      <DropoffAlertCard option={option} onPosition={setPosition} />

      {loadedPack ? <TripMap option={option} pack={loadedPack} position={position} /> : null}

      {option.warnings.length > 0 ? (
        <Notice tone="warning" title={t.warningsHeading}>
          {option.warnings.map((w) => (
            <Body key={w}>• {w}</Body>
          ))}
        </Notice>
      ) : null}

      <RouteDiagram option={option} request={session.request} />
      <JourneySteps
        option={option}
        request={session.request}
        onOnboard={(leg) =>
          router.push({ pathname: "/onboard", params: { serviceId: leg.serviceId, directionId: leg.directionId } })
        }
      />

      <Small>
        {t.whyThisOption}: {option.rankReason}
      </Small>
      <Small>{t.datasetLabel(option.datasetVersion)}</Small>
    </Screen>
  );
}
