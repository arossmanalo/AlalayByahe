// Member 3 (UI-005): manual onboard replanning through the same RouteRequest/results screens
// (design artboard "Already riding").
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RouteRequest } from "../src/contracts";
import { AppButton, CloseButton, GroupFooterText, Heading, ListGroup, ListRow, Notice, SwitchControl, text } from "../src/ui/components/primitives";
import { MAP_PALETTE, SchematicMap } from "../src/ui/components/SchematicMap";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { shouldShowError } from "../src/ui/error-logic";
import {
  DEFAULT_PREFERENCES,
  formToPreferences,
  newQueryId,
  preferencesToForm,
  type PreferenceForm,
} from "../src/ui/form-logic";
import { PreferencesSheet } from "../src/ui/journey-form";
import { coverageLayers, directionLayers, EMPTY_LAYERS } from "../src/ui/map-geometry";
import { OnboardForm, type OnboardSelection } from "../src/ui/onboard-form";
import { onboardOrigin } from "../src/ui/onboard-logic";
import { PlacePickerSheet, type PlaceSelection } from "../src/ui/place-picker";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";
import { colors, spacing } from "../src/ui/theme";

const NO_EXPLICIT = new Set<never>();

export default function OnboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string; directionId?: string }>();
  const { t } = useUi();
  const { pack, reloadPack } = useReadiness();
  const { session, planRoute, startManual, cancelPending } = useJourneySession();
  const loaded = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;

  const [selection, setSelection] = useState<OnboardSelection>(() => {
    const service = loaded?.services.find((s) => s.id === params.serviceId) ?? null;
    const direction =
      service && loaded
        ? loaded.directions.find(
            (d) => d.id === params.directionId && d.serviceId === service.id && d.availability !== "suspended",
          ) ?? null
        : null;
    return { service, direction, nextStop: null, confirmed: false };
  });
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [form, setForm] = useState<PreferenceForm>(() => preferencesToForm(DEFAULT_PREFERENCES));
  const [prefsInvalid, setPrefsInvalid] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const planning = session.pending?.kind === "route";
  const changedPrefs = JSON.stringify(form) !== JSON.stringify(preferencesToForm(DEFAULT_PREFERENCES));

  const planFromKnownStop = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const submit = async () => {
    const { direction, nextStop, confirmed } = selection;
    if (!direction || !nextStop || !confirmed) return;
    const prefs = formToPreferences(form);
    setPrefsInvalid(!prefs.ok);
    setDestinationError(destination ? null : t.destinationMissing);
    if (!destination || !prefs.ok) return;
    const { origin, onboard } = onboardOrigin(nextStop, direction.id, new Date().toISOString());
    if (origin.placeId === destination.endpoint.placeId) {
      setDestinationError(t.samePlace);
      return;
    }
    const request: RouteRequest = {
      queryId: newQueryId(),
      origin,
      destination: destination.endpoint,
      preferences: prefs.value,
      onboard,
    };
    const result = await planRoute(request, "manual");
    if (result.ok || shouldShowError(result.error)) router.push("/results");
  };

  const { service, direction, nextStop } = selection;
  const ready = direction !== null && nextStop !== null && selection.confirmed;

  return (
    <Screen layout="map"
      title={t.onboardTitle}
      sheet="grouped"
      sheetRatio={254 / 844}
      renderMap={(size) => (
        <SchematicMap
          {...size}
          layers={
            loaded && service && direction
              ? directionLayers(loaded, direction.id, service.mode, nextStop?.stop.id ?? null, MAP_PALETTE, t.mapNextStop)
              : loaded
                ? coverageLayers(loaded, MAP_PALETTE)
                : EMPTY_LAYERS
          }
          accessibilityLabel={t.onboardMapA11y}
        />
      )}
    >
      <View>
        <View style={styles.titleRow}>
          <Heading>{t.onboardTitle}</Heading>
          <CloseButton label={t.close} onPress={close} />
        </View>
        <Text style={[text.subhead, text.muted, styles.intro]}>{t.onboardIntro}</Text>
      </View>

      {pack.status === "loading" ? <Notice tone="info" title={t.loading} /> : null}
      {pack.status === "loaded" && !pack.result.ok ? (
        <ErrorCard error={pack.result.error} handlers={{ retry: () => void reloadPack() }} />
      ) : null}

      {loaded ? <OnboardForm pack={loaded} value={selection} onChange={setSelection} /> : null}

      {service && direction && nextStop ? (
        <ListGroup
          header={t.confirmSection}
          footer={
            destinationError || prefsInvalid ? (
              <GroupFooterText style={styles.error}>{[destinationError, prefsInvalid ? t.prefsInvalid : null].filter(Boolean).join(" ")}</GroupFooterText>
            ) : undefined
          }
        >
          <ListRow
            minHeight={60}
            title={<Text style={text.subhead}>{t.iChecked(service.name, direction.headsign, nextStop.stop.label)}</Text>}
            accessory={
              <SwitchControl
                label={t.onboardConfirm(direction.headsign, nextStop.stop.label)}
                value={selection.confirmed}
                onValueChange={(confirmed) => setSelection({ ...selection, confirmed })}
              />
            }
          />
          <ListRow
            minHeight={50}
            title={t.toLabel}
            titleStyle={text.muted}
            detail={<Text style={[text.body, styles.value, !destination && styles.tint]}>{destination ? destination.endpoint.label : t.onboardDestination}</Text>}
            accessory="chevron"
            accessibilityLabel={`${t.toLabel}: ${destination ? destination.endpoint.label : t.onboardDestination}`}
            onPress={() => setPicking(true)}
          />
          <ListRow
            minHeight={50}
            title={t.preferencesHeading}
            titleStyle={text.muted}
            detail={<Text style={[text.body, styles.value]}>{changedPrefs ? t.changedValue : t.defaultsValue}</Text>}
            accessory="chevron"
            onPress={() => setPrefsOpen(true)}
          />
        </ListGroup>
      ) : null}

      <View style={styles.actions}>
        {service && direction && nextStop ? (
          <AppButton label={planning ? t.planning : t.onboardPlan} busy={planning} disabled={!ready} onPress={() => void submit()} />
        ) : null}
        {planning ? <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} /> : null}
        <AppButton label={t.onboardUnsure} variant="link" onPress={planFromKnownStop} />
        <Text style={[text.footnote, styles.unsure]}>{t.onboardUnsureBody}</Text>
      </View>

      <PlacePickerSheet
        visible={picking}
        title={t.onboardDestination}
        aiText={null}
        showAiText={false}
        candidates={[]}
        selected={destination}
        onSelect={(s) => {
          setDestination(s);
          setDestinationError(null);
        }}
        onClose={() => setPicking(false)}
      />
      <PreferencesSheet
        visible={prefsOpen}
        form={form}
        explicit={NO_EXPLICIT}
        onCancel={() => setPrefsOpen(false)}
        onDone={(next) => {
          setForm(next);
          setPrefsInvalid(false);
          setPrefsOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: 4, marginHorizontal: spacing.xs },
  intro: { marginTop: 2, marginHorizontal: spacing.xs },
  value: { flexShrink: 1, textAlign: "right" },
  tint: { color: colors.primary },
  error: { color: colors.danger, fontWeight: "600" },
  actions: { gap: spacing.xs, marginTop: 6 },
  unsure: { textAlign: "center", marginHorizontal: spacing.lg },
});
