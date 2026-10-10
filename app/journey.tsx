// Member 3 (UI-003, ALERT-003): full journey detail (design artboards "Steps" and "Stop alert: near your
// stop"): schematic map, fare, ordered steps, the optional near-drop-off alert, sources and warnings.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Point, RideLeg } from "../src/contracts";
import { Icon } from "../src/ui/components/icons";
import { AppButton, DirectionSign, FareTag, Footnote, ListGroup, ListRow, MapButton, Notice, text, useGroupColor } from "../src/ui/components/primitives";
import { MAP_PALETTE, MapPill, SchematicMap } from "../src/ui/components/SchematicMap";
import { Screen } from "../src/ui/components/Screen";
import { AlertBannerCard, DropoffAlertCard, type AlertBanner } from "../src/ui/dropoff-alert-card";
import { formatDate, formatMeters } from "../src/ui/format";
import { FareAmount, fareFigure } from "../src/ui/journey-card";
import { optionIssues } from "../src/ui/journey-presenter";
import { JourneyTimeline, SourcesList, useSources } from "../src/ui/journey-steps";
import { EMPTY_LAYERS, hasUnverified, optionStopCount, stationName, tripLayers } from "../src/ui/map-geometry";
import { useLoadedPack } from "../src/ui/readiness";
import { useJourneySession, useUi } from "../src/ui/services";
import { colors, legColors, radius, spacing } from "../src/ui/theme";
import { TripMap } from "../src/ui/trip-map";
import { TripSummaryCard } from "../src/ui/trip-summary";

export default function JourneyScreen() {
  const router = useRouter();
  const { optionId } = useLocalSearchParams<{ optionId?: string }>();
  const { t } = useUi();
  const { session } = useJourneySession();
  const pack = useLoadedPack();
  const sources = useSources();
  const groupBg = useGroupColor();
  const [position, setPosition] = useState<Point | null>(null);
  const [banner, setBanner] = useState<AlertBanner | null>(null);
  const [open, setOpen] = useState<{ sources: boolean; why: boolean }>({ sources: false, why: false });
  const options = session.result?.ok ? session.result.value.options : [];
  const index = options.findIndex((o) => o.id === optionId);
  const option = index >= 0 ? options[index] : null;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!option || optionIssues(option).length > 0) {
    // Missing or stale selection (e.g. the trip was edited), or incomplete data: never render partial steps.
    return (
      <Screen title={t.journeyTitle}>
        <Notice
          tone="danger"
          title={option ? t.incompleteAll : t.staleResult}
          actions={<AppButton label={t.back} onPress={back} />}
        />
      </Screen>
    );
  }

  const request = session.request;
  const rides = option.legs.filter((l): l is RideLeg => l.kind === "ride");
  const figure = fareFigure(option, t);
  const stops = pack ? optionStopCount(pack, option) : null;
  const subtitle = [
    t.optionLabel(index + 1),
    stops !== null ? t.stopsCount(stops) : null,
    option.transfers === 0 ? t.noTransfers : t.transfers(option.transfers),
    option.walkMeters === 0 ? t.noWalking : t.walkTotal(formatMeters(option.walkMeters)),
  ]
    .filter(Boolean)
    .join(" · ");
  const title = request ? `${stationName(request.origin.label)} → ${stationName(request.destination.label)}` : t.optionLabel(index + 1);

  // "Sources and checks" names the first ride's source and check date; the full list opens below it.
  const firstEvidence = (rides[0] ?? option.legs[0])?.evidence;
  const firstSource = firstEvidence?.sourceIds.map((id) => sources.get(id)?.title).find(Boolean);
  const sourcesSubtitle = firstEvidence
    ? [firstSource, t.checkedOn(formatDate(firstEvidence.checkedAt))].filter(Boolean).join(" · ")
    : undefined;
  // With one ride the onboard link sits below the steps; with several, each ride in the steps has its own.
  const onboardLeg = rides.length === 1 && !rides[0]!.alreadyOnboard ? rides[0]! : null;
  const openOnboard = (leg: RideLeg) =>
    router.push({ pathname: "/onboard", params: { serviceId: leg.serviceId, directionId: leg.directionId } });

  const summary = rides
    .map((leg) => `${t.boardAt(stationName(leg.boardLabel))}, ${t.modeNames[leg.mode]} ${leg.serviceName}, ${t.getOffAt(stationName(leg.alightLabel))}`)
    .join("; ");

  const layers = pack ? tripLayers(pack, option, MAP_PALETTE, { board: t.mapBoard, alight: t.mapGetOff }) : EMPTY_LAYERS;
  // The phone's own position while a stop alert runs; it says nothing about where the vehicle is.
  const pins = position ? [...layers.pins, { point: position, kind: "you" as const, color: legColors.walk }] : layers.pins;

  return (
    <Screen layout="map"
      title={t.optionLabel(index + 1)}
      sheet="grouped"
      sheetRatio={306 / 844}
      floatingLeft={<MapButton icon="chevronLeft" label={t.backToOptions} onPress={back} />}
      overlay={banner ? <AlertBannerCard banner={banner} /> : undefined}
      renderMap={(size) => (
        <SchematicMap
          {...size}
          layers={{ ...layers, pins }}
          accessibilityLabel={t.journeyMapA11y(summary)}
          badge={
            pack && hasUnverified(pack, option) ? (
              <MapPill>
                <Icon name="warning" size={14} color={colors.warning} strokeWidth={2.2} />
                <Text style={[text.footnoteDark, styles.semibold]}>{t.unverifiedMapBadge}</Text>
              </MapPill>
            ) : undefined
          }
        />
      )}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={text.title}>
          {title}
        </Text>
        <Text style={[text.subhead, text.muted]}>{subtitle}</Text>
      </View>

      <View
        accessible
        accessibilityLabel={[`${t.fareLabel}: ${figure.amount}`, figure.tag, rides.length > 1 ? t.paidPerRide : null, ...figure.lines].filter(Boolean).join(". ")}
        style={[styles.fareCard, { backgroundColor: groupBg }]}
      >
        <View style={styles.fareTop}>
          <FareAmount figure={figure} size="large" />
          {figure.tag ? <FareTag kind={figure.kind} label={figure.tag} pill /> : null}
          {rides.length > 1 ? <Text style={[text.footnote, styles.fareNote]}>{t.paidPerRide}</Text> : null}
        </View>
        {figure.lines.map((line) => (
          <Text key={line} style={text.footnote}>
            {line}
          </Text>
        ))}
      </View>

      <TripSummaryCard option={option} request={request} />

      <ListGroup header={t.beforeBoard} separatorInset={52}>
        <ListRow
          minHeight={50}
          leading={<Icon name="signboard" size={20} color={colors.warning} strokeWidth={1.9} />}
          title={
            rides.length === 1 ? (
              <View style={styles.signRow} accessible accessibilityLabel={`${t.checkSignSays} ${rides[0]!.headsign}`}>
                <Text style={text.subhead}>{t.checkSignSays}</Text>
                <DirectionSign headsign={rides[0]!.headsign} size="medium" />
              </View>
            ) : (
              <Text style={text.subhead}>{t.checkEachSign}</Text>
            )
          }
        />
        <ListRow
          minHeight={50}
          leading={<Icon name="noTracking" size={20} color={colors.textMuted} strokeWidth={1.9} />}
          title={<Text style={text.subhead}>{`${t.noLiveTracking} ${t.noTracking}`}</Text>}
        />
        <ListRow
          minHeight={50}
          leading={<Icon name="info" size={20} color={colors.textMuted} strokeWidth={1.9} />}
          title={<Text style={text.subhead}>{t.confirmServiceFare}</Text>}
        />
      </ListGroup>

      {option.warnings.length > 0 ? (
        <Notice tone="warning" title={t.warningsHeading}>
          {option.warnings.map((w) => `• ${w}`).join("\n")}
        </Notice>
      ) : null}

      <ListGroup header={t.stepsHeading}>
        <JourneyTimeline option={option} request={request} pack={pack} onOnboard={openOnboard} />
      </ListGroup>

      <DropoffAlertCard option={option} onPosition={setPosition} onBanner={setBanner} />

      {pack ? <TripMap option={option} pack={pack} position={position} /> : null}

      <ListGroup>
        <ListRow
          minHeight={58}
          title={t.evidenceHeading}
          subtitle={sourcesSubtitle}
          accessory={<Icon name={open.sources ? "chevronUp" : "chevronDown"} size={14} color={colors.chevron} strokeWidth={3} />}
          selected={open.sources}
          onPress={() => setOpen((o) => ({ ...o, sources: !o.sources }))}
        />
        {open.sources ? <SourcesList option={option} /> : null}
        <ListRow
          title={t.whyThisOption}
          accessory={<Icon name={open.why ? "chevronUp" : "chevronDown"} size={14} color={colors.chevron} strokeWidth={3} />}
          selected={open.why}
          onPress={() => setOpen((o) => ({ ...o, why: !o.why }))}
        />
        {open.why ? <Text style={[text.subhead, styles.why]}>{option.rankReason}</Text> : null}
        {onboardLeg ? <ListRow title={t.imOnThisVehicle} tinted onPress={() => openOnboard(onboardLeg)} /> : null}
      </ListGroup>

      <Footnote style={styles.dataset}>
        {t.mapSchematicNote} {t.datasetLabel(option.datasetVersion)}.
      </Footnote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  semibold: { fontWeight: "600" },
  header: { gap: 2, marginTop: 6, marginHorizontal: spacing.xs },
  fareCard: { borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: spacing.md, gap: 4 },
  fareTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  fareNote: { marginLeft: "auto" },
  signRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  why: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, color: colors.text },
  dataset: { marginHorizontal: spacing.lg, marginTop: -4 },
});
