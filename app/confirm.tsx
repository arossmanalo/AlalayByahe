// Member 3 (UI-002): editable confirmation of AI extraction, or the manual (AI-free) trip form
// (design artboard "Check your trip"). Nothing is routed until the user confirms; manual entry calls
// submitManual with the same RouteRequest shape.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppError, RouteRequest } from "../src/contracts";
import { Icon } from "../src/ui/components/icons";
import { AppButton, Card, CloseButton, Footnote, Heading, IconNote, Notice, text } from "../src/ui/components/primitives";
import { MAP_PALETTE, SchematicMap } from "../src/ui/components/SchematicMap";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { shouldShowError } from "../src/ui/error-logic";
import {
  DEFAULT_PREFERENCES,
  explicitFields,
  formToPreferences,
  highlightSpans,
  initialCandidate,
  newQueryId,
  preferencesToForm,
  type PreferenceErrors,
  type PreferenceForm,
} from "../src/ui/form-logic";
import { PreferencesRow, PreferencesSheet } from "../src/ui/journey-form";
import { endpointLayers } from "../src/ui/map-geometry";
import { PlacePickerSheet, selectionFromPlace, type PlaceSelection } from "../src/ui/place-picker";
import { useLoadedPack } from "../src/ui/readiness";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";
import { colors, radius, spacing } from "../src/ui/theme";

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string; edit?: string }>();
  const { t } = useUi();
  const { session, planRoute, cancelPending } = useJourneySession();
  const { modelState } = useReadiness();
  const pack = useLoadedPack();

  const draft = params.manual === "1" ? null : session.draft;
  const editing = params.edit === "1" && session.request !== null ? session.request : null;
  const manual = draft === null;
  const intent = draft?.extraction.intent ?? null;

  const initialOrigin = (): PlaceSelection | null => {
    if (editing) return { endpoint: editing.origin, display: editing.origin.label };
    const candidates = draft?.originCandidates ?? [];
    const place = initialCandidate(candidates);
    return place ? selectionFromPlace(place, candidates[0]?.match) : null;
  };
  const initialDestination = (): PlaceSelection | null => {
    if (editing) return { endpoint: editing.destination, display: editing.destination.label };
    const candidates = draft?.destinationCandidates ?? [];
    const place = initialCandidate(candidates);
    return place ? selectionFromPlace(place, candidates[0]?.match) : null;
  };
  const initialForm = (): PreferenceForm =>
    preferencesToForm(editing?.preferences ?? draft?.preferences ?? DEFAULT_PREFERENCES);

  const [origin, setOrigin] = useState<PlaceSelection | null>(initialOrigin);
  const [destination, setDestination] = useState<PlaceSelection | null>(initialDestination);
  const [form, setForm] = useState<PreferenceForm>(initialForm);
  const [prefErrors, setPrefErrors] = useState<PreferenceErrors>({});
  const [placeErrors, setPlaceErrors] = useState<{ origin?: string; destination?: string }>({});
  const [routeError, setRouteError] = useState<AppError | null>(null);
  const [picking, setPicking] = useState<"origin" | "destination" | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const planning = session.pending?.kind === "route";
  const explicit = explicitFields(intent);

  // Original AI text is shown with each place. After a swap the texts swap too, so roles stay visible.
  const [swapped, setSwapped] = useState(false);
  const originText = swapped ? intent?.destinationText ?? null : intent?.originText ?? null;
  const destinationText = swapped ? intent?.originText ?? null : intent?.destinationText ?? null;
  const originCandidates = (swapped ? draft?.destinationCandidates : draft?.originCandidates) ?? [];
  const destinationCandidates = (swapped ? draft?.originCandidates : draft?.destinationCandidates) ?? [];

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
    setSwapped((s) => !s);
    setPlaceErrors({});
  };

  const reset = () => {
    setSwapped(false);
    setOrigin(initialOrigin());
    setDestination(initialDestination());
    setForm(initialForm());
    setPrefErrors({});
    setPlaceErrors({});
    setRouteError(null);
  };

  const submit = async () => {
    setRouteError(null);
    const errors: { origin?: string; destination?: string } = {};
    if (!origin) errors.origin = t.originMissing;
    if (!destination) errors.destination = t.destinationMissing;
    if (origin && destination && origin.endpoint.placeId === destination.endpoint.placeId) {
      errors.destination = t.samePlace;
    }
    const prefs = formToPreferences(form);
    setPlaceErrors(errors);
    setPrefErrors(prefs.ok ? {} : prefs.errors);
    if (!origin || !destination || errors.origin || errors.destination || !prefs.ok) return;

    const request: RouteRequest = {
      queryId: draft?.queryId ?? newQueryId(),
      origin: origin.endpoint,
      destination: destination.endpoint,
      preferences: prefs.value,
    };
    const result = await planRoute(request, manual ? "manual" : "confirmed");
    if (result.ok) {
      router.push("/results");
      return;
    }
    if (!shouldShowError(result.error)) return;
    const code = result.error.code;
    if (code === "CANCELLED" || code === "NEEDS_CLARIFICATION" || code === "INVALID_INPUT") {
      setRouteError(result.error);
      return;
    }
    // Routing outcomes (no journey, constraint, coverage, limits) are explained on the results screen.
    router.push("/results");
  };

  // Subtitle under each place: what the user said and how it matched, or where a manual choice came from.
  const placeNote = (selection: PlaceSelection | null, said: string | null): string => {
    if (!selection) return manual ? t.chooseOne : said ? t.aiReadAs(said) : t.aiReadNothing;
    if (!manual && said && selection.match) return t.youSaid(said, t.matchKind[selection.match]);
    return selection.display !== selection.endpoint.label ? selection.display : t.storedPlace;
  };
  const placeRow = (role: "origin" | "destination") => {
    const selection = role === "origin" ? origin : destination;
    const said = role === "origin" ? originText : destinationText;
    const label = role === "origin" ? t.fromLabel : t.toLabel;
    const missing = role === "origin" ? t.originMissing : t.destinationMissing;
    const note = placeNote(selection, manual ? null : said);
    return {
      a11y: `${label}: ${selection ? selection.endpoint.label : missing}. ${note}`,
      label,
      value: selection ? selection.endpoint.label : missing,
      chosen: selection !== null,
      note,
    };
  };
  const from = placeRow("origin");
  const to = placeRow("destination");

  return (
    <Screen layout="map"
      title={manual ? t.manualTitle : t.confirmTitle}
      sheetRatio={204 / 844}
      renderMap={(size) => (
        <SchematicMap
          {...size}
          layers={endpointLayers(pack, origin?.endpoint ?? null, destination?.endpoint ?? null, MAP_PALETTE)}
          accessibilityLabel={t.confirmMapA11y(from.value, to.value)}
        />
      )}
    >
      <View style={styles.titleRow}>
        <Heading>{manual ? t.manualTitle : t.confirmTitle}</Heading>
        <CloseButton label={t.close} onPress={() => router.back()} />
      </View>

      {manual ? <Footnote style={styles.intro}>{t.manualIntro}</Footnote> : null}
      {manual && modelState.phase !== "ready" ? (
        <Notice tone="warning" title={t.aiUnavailable}>
          {t.aiUnavailableManual}
        </Notice>
      ) : null}

      {!manual && session.queryText ? (
        <Card style={styles.typed}>
          <Footnote>{t.yourWords}</Footnote>
          <Text style={styles.quote}>
            “
            {highlightSpans(session.queryText, [intent?.originText ?? null, intent?.destinationText ?? null]).map((part, i) =>
              part.mark ? (
                <Text key={i} style={styles.mark}>
                  {part.text}
                </Text>
              ) : (
                part.text
              ),
            )}
            ”
          </Text>
          {draft ? (
            <IconNote icon="phone">
              {t.engineLabel[draft.extraction.engine.kind]} ({draft.extraction.engine.modelId}). {t.nothingSearched}
            </IconNote>
          ) : null}
        </Card>
      ) : null}

      {draft?.warnings.map((w) => <Notice key={w} tone="warning" title={w} />)}
      {intent && intent.ambiguities.length > 0 ? (
        <Notice tone="warning" title={t.ambiguitiesHeading}>
          {intent.ambiguities.map((a) => `• ${a}`).join("\n")}
        </Notice>
      ) : null}
      {intent?.useCurrentLocation ? <Notice tone="info" title={t.currentLocationNote} /> : null}
      {intent?.kind === "onboard" || draft?.missingFields.includes("onboard_context") ? (
        <Notice
          tone="info"
          title={t.onboardTitle}
          actions={<AppButton label={t.onboardPlan} variant="secondary" onPress={() => router.push("/onboard")} />}
        />
      ) : null}

      <View>
        <View style={styles.places}>
          {[from, to].map((row, i) => (
            <View key={row.label}>
              {i === 1 ? <View style={styles.placeDivider} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.a11y}
                accessibilityHint={t.changeHint}
                onPress={() => setPicking(i === 0 ? "origin" : "destination")}
                style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
              >
                <View style={styles.placeMarker}>{i === 0 ? <View style={styles.originRing} /> : <View style={styles.destinationPin}><View style={styles.destinationDot} /></View>}</View>
                <View style={styles.flex}>
                  <Text style={text.body}>
                    <Text style={text.muted}>{row.label}</Text>{" "}
                    <Text style={row.chosen ? undefined : styles.tint}>{row.value}</Text>
                  </Text>
                  <Text style={text.footnote}>{row.note}</Text>
                </View>
              </Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={t.swapPlaces} onPress={swap} hitSlop={4} style={({ pressed }) => [styles.swap, pressed && styles.pressed]}>
            <Icon name="swap" size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>
        {placeErrors.origin || placeErrors.destination ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {[placeErrors.origin, placeErrors.destination].filter(Boolean).join(" ")}
          </Text>
        ) : null}
      </View>

      <PreferencesRow form={form} explicit={explicit} invalid={Object.keys(prefErrors).length > 0} onPress={() => setPrefsOpen(true)} />
      <View style={styles.strict}>
        <IconNote icon="lock">{t.strictShort}</IconNote>
      </View>

      {routeError ? <ErrorCard error={routeError} handlers={{ retry: () => void submit() }} /> : null}

      <View style={styles.actions}>
        <AppButton label={planning ? t.planning : t.findRoutes} busy={planning} onPress={() => void submit()} />
        {planning ? <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} /> : null}
        <AppButton label={t.resetForm} variant="link" onPress={reset} />
      </View>

      <PlacePickerSheet
        visible={picking !== null}
        title={picking === "destination" ? t.destinationHeading : t.originHeading}
        aiText={picking === "destination" ? destinationText : originText}
        showAiText={!manual}
        candidates={picking === "destination" ? destinationCandidates : originCandidates}
        selected={picking === "destination" ? destination : origin}
        onSelect={(s) => {
          if (picking === "destination") setDestination(s);
          else setOrigin(s);
          setPlaceErrors((e) => ({ ...e, [picking === "destination" ? "destination" : "origin"]: undefined }));
        }}
        onClose={() => setPicking(null)}
      />
      <PreferencesSheet
        visible={prefsOpen}
        form={form}
        explicit={explicit}
        onCancel={() => setPrefsOpen(false)}
        onDone={(next) => {
          setForm(next);
          setPrefErrors({});
          setPrefsOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 1, minWidth: 0 },
  pressed: { opacity: 0.6 },
  tint: { color: colors.primary },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: 4, marginBottom: -4 },
  intro: { marginTop: -6 },
  typed: { gap: 6 },
  quote: { fontSize: 17, lineHeight: 24, color: colors.text },
  mark: { backgroundColor: colors.highlight, borderRadius: 4 },
  // Groups on this white sheet are gray (design: #F2F2F7).
  places: { borderRadius: radius.field, position: "relative", backgroundColor: colors.surfaceMuted },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 66, paddingVertical: 10, paddingLeft: 14, paddingRight: 64 },
  placeDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separatorOnMuted, marginLeft: 52, marginRight: 64 },
  placeMarker: { width: 28, alignItems: "center" },
  originRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 3.5, borderColor: colors.you, backgroundColor: "#FFFFFF" },
  destinationPin: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.getOff, alignItems: "center", justifyContent: "center" },
  destinationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  swap: { position: "absolute", right: 8, top: "50%", marginTop: -24, width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  error: { marginTop: 6, marginHorizontal: spacing.xs, fontSize: 13, lineHeight: 18, color: colors.danger, fontWeight: "600" },
  strict: { marginHorizontal: spacing.xs, marginTop: -6 },
  actions: { gap: spacing.xs, marginTop: spacing.sm },
});
