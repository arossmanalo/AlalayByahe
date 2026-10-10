// Member 3 (UI-003): up to three grounded options, or an explained failure with recovery
// (design artboards "Route options" and "Outside coverage").
// UI-006: the loaded pack's actual coverage is stated on every outcome, so an unsupported corridor
// reads as "No verified complete journey available." next to the subset that is supported.
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Priority } from "../src/contracts";
import { AppButton, Footnote, IconNote, MapButton, Notice, SegmentedControl, text } from "../src/ui/components/primitives";
import { MAP_PALETTE, SchematicMap } from "../src/ui/components/SchematicMap";
import { Screen } from "../src/ui/components/Screen";
import { recoveriesFor, type Recovery } from "../src/ui/error-logic";
import { ALL_PRIORITIES, newQueryId } from "../src/ui/form-logic";
import { OptionCard } from "../src/ui/journey-card";
import { coverageSummary, partitionOptions } from "../src/ui/journey-presenter";
import { endpointLayers, stationName, tripLayers } from "../src/ui/map-geometry";
import { CoverageGroup, useLoadedPack } from "../src/ui/readiness";
import { useJourneySession, useUi } from "../src/ui/services";
import { colors, spacing } from "../src/ui/theme";
import { TripSummaryCard } from "../src/ui/trip-summary";

export default function ResultsScreen() {
  const router = useRouter();
  const { t } = useUi();
  const pack = useLoadedPack();
  const { session, planRoute, startManual } = useJourneySession();
  const { result, request, via } = session;
  const planning = session.pending?.kind === "route";
  const coverage = coverageSummary(pack?.coverageLabels ?? [], result?.ok ? result.value.coverageWarnings : []);
  const { shown, hiddenIncomplete } = result?.ok ? partitionOptions(result.value.options) : { shown: [], hiddenIncomplete: 0 };

  // An onboard trip is edited in the onboard flow so its OnboardContext is never silently dropped.
  const edit = () =>
    request?.onboard
      ? router.push("/onboard")
      : router.push({ pathname: "/confirm", params: { edit: "1", ...(via === "manual" ? { manual: "1" } : {}) } });
  const retry = () => {
    if (request && via) void planRoute({ ...request, queryId: newQueryId() }, via);
  };
  const manual = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };
  // "Show first" re-plans the same trip with the ranking the user picks; nothing else changes.
  const reorder = (priority: Priority) => {
    if (request && via && priority !== request.preferences.priority) {
      void planRoute({ ...request, queryId: newQueryId(), preferences: { ...request.preferences, priority } }, via);
    }
  };

  const handlers: Partial<Record<Recovery, () => void>> = {
    retry,
    manual,
    edit_places: edit,
    edit_preferences: edit,
    setup: () => router.push("/setup"),
  };
  const recoveryLabels: Record<Recovery, string> = {
    retry: t.retry,
    manual: t.chooseManually,
    edit_places: t.editPlaces,
    edit_preferences: t.editPreferences,
    setup: t.setupLink,
  };
  const error = result && !result.ok ? result.error : null;
  const recoveries = error ? recoveriesFor(error.code, error.retryable).filter((r) => handlers[r]) : [];

  const title = planning
    ? t.planning
    : !result
      ? t.noOptions
      : error
        ? t.errorMessages[error.code]
        : shown.length === 0
          ? hiddenIncomplete > 0
            ? t.incompleteAll
            : t.noOptions
          : t.routesCount(shown.length);
  const subtitle = request
    ? `${t.routeTo(request.origin.label, request.destination.label)}${request.preferences.directOnly ? ` · ${t.directOnlyShort}` : ""}`
    : null;
  const first = shown[0] ?? null;

  return (
    <Screen layout="map"
      title={t.resultsTitle}
      sheetRatio={(error || shown.length === 0 ? 392 : 404) / 844}
      floatingLeft={<MapButton icon="chevronLeft" label={t.backToTrip} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />}
      renderMap={(size) => (
        <SchematicMap
          {...size}
          layers={
            pack && first
              ? tripLayers(pack, first, MAP_PALETTE, { board: stationName, alight: stationName })
              : endpointLayers(pack, request?.origin ?? null, request?.destination ?? null, MAP_PALETTE)
          }
          accessibilityLabel={t.resultsMapA11y(request?.origin.label ?? "", request?.destination.label ?? "")}
          caption={pack ? t.mapSchematicNote : undefined}
        />
      )}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={text.title}>
            {title}
          </Text>
          {subtitle ? <Text style={[text.subhead, text.muted]}>{subtitle}</Text> : null}
        </View>
        {request ? <AppButton label={t.edit} variant="link" onPress={edit} style={styles.edit} /> : null}
      </View>

      {result?.ok && request && shown.length > 0 ? (
        <SegmentedControl
          label={t.priorityLabel}
          compact
          disabled={planning}
          options={ALL_PRIORITIES.map((p) => ({ value: p, label: t.priorityTab[p], accessibilityLabel: t.priorityNames[p] }))}
          value={request.preferences.priority}
          onChange={reorder}
        />
      ) : null}

      {planning ? <Notice tone="info" title={t.planning} /> : null}

      {!planning && error ? (
        <>
          {error.message && error.message !== t.errorMessages[error.code] ? (
            <Text style={[text.subhead, text.muted]}>
              {t.engineMessage}: {error.message}
            </Text>
          ) : null}
          {error.detail?.missingConnection ? <Text style={[text.subhead, text.muted]}>{error.detail.missingConnection}</Text> : null}
          {error.code === "NO_VERIFIED_JOURNEY" || error.code === "OUTSIDE_COVERAGE" || error.code === "PLACE_NOT_FOUND" ? (
            <Text style={[text.subhead, text.muted]}>{t.notCoveredBody}</Text>
          ) : null}
        </>
      ) : null}

      {!planning && result?.ok ? (
        <>
          {coverage.notes.length > 0 ? (
            <Notice tone="warning" title={t.coverageWarnings}>
              {coverage.notes.map((w) => `• ${w}`).join("\n")}
            </Notice>
          ) : null}
          {shown.length === 0 ? (
            // An empty option list is an error, never an apparently successful journey.
            <Notice tone="danger" title={hiddenIncomplete > 0 ? t.incompleteAll : t.noOptions} actions={<AppButton label={t.editJourney} onPress={edit} />} />
          ) : (
            shown.map((option, i) => (
              <OptionCard
                key={option.id}
                option={option}
                index={i}
                pack={pack}
                onOpen={() => router.push({ pathname: "/journey", params: { optionId: option.id } })}
              />
            ))
          )}
          {shown.length > 0 && hiddenIncomplete > 0 ? <Notice tone="warning" title={t.incompleteHidden(hiddenIncomplete)} /> : null}
          {first ? <TripSummaryCard option={first} request={request} /> : null}
        </>
      ) : null}

      {!planning && (error || !result?.ok || shown.length === 0) ? <CoverageGroup labels={coverage.labels} pack={pack} /> : null}

      {!planning && error && recoveries.length > 0 ? (
        <View style={styles.actions}>
          {recoveries.map((r, i) => (
            <AppButton key={r} label={recoveryLabels[r]} variant={i === 0 ? "primary" : "secondary"} onPress={handlers[r]!} />
          ))}
        </View>
      ) : null}

      {!planning && result?.ok && shown.length > 0 ? (
        <View style={styles.notes}>
          <IconNote icon="info">
            {t.resultsIntro} {t.checkDirection} {t.coverageInline(coverage.labels.join(" ") || t.coverageNone)}
          </IconNote>
          {first ? <Footnote style={styles.dataset}>{t.datasetLabel(first.datasetVersion)}</Footnote> : null}
        </View>
      ) : null}

      <AppButton label={t.newSearch} variant="link" onPress={() => router.dismissTo("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md, marginTop: 4 },
  edit: { minHeight: 44, marginTop: -8, paddingHorizontal: 4, alignSelf: "flex-start" },
  actions: { gap: spacing.sm },
  notes: { gap: 6, marginHorizontal: spacing.xs },
  dataset: { color: colors.textMuted, marginLeft: 20 },
});
