// Member 3 (UI-002): editable confirmation of AI extraction, or the manual (AI-free) trip form.
// Nothing is routed until the user confirms; manual entry calls submitManual with the same RouteRequest shape.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { AppError, RouteRequest } from "../src/contracts";
import { AppButton, Body, Card, Heading, Notice, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { shouldShowError } from "../src/ui/error-logic";
import {
  DEFAULT_PREFERENCES,
  explicitFields,
  formToPreferences,
  initialCandidate,
  newQueryId,
  preferencesToForm,
  type PreferenceErrors,
  type PreferenceForm,
} from "../src/ui/form-logic";
import { PreferencesForm } from "../src/ui/journey-form";
import { PlacePicker, selectionFromPlace, type PlaceSelection } from "../src/ui/place-picker";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string; edit?: string }>();
  const { t } = useUi();
  const { session, planRoute, cancelPending } = useJourneySession();
  const { modelState } = useReadiness();

  const draft = params.manual === "1" ? null : session.draft;
  const editing = params.edit === "1" && session.request !== null ? session.request : null;
  const manual = draft === null;
  const intent = draft?.extraction.intent ?? null;

  const initialOrigin = (): PlaceSelection | null => {
    if (editing) return { endpoint: editing.origin, display: editing.origin.label };
    const place = draft ? initialCandidate(draft.originCandidates) : null;
    return place ? selectionFromPlace(place) : null;
  };
  const initialDestination = (): PlaceSelection | null => {
    if (editing) return { endpoint: editing.destination, display: editing.destination.label };
    const place = draft ? initialCandidate(draft.destinationCandidates) : null;
    return place ? selectionFromPlace(place) : null;
  };
  const initialForm = (): PreferenceForm =>
    preferencesToForm(editing?.preferences ?? draft?.preferences ?? DEFAULT_PREFERENCES);

  const [origin, setOrigin] = useState<PlaceSelection | null>(initialOrigin);
  const [destination, setDestination] = useState<PlaceSelection | null>(initialDestination);
  const [form, setForm] = useState<PreferenceForm>(initialForm);
  const [prefErrors, setPrefErrors] = useState<PreferenceErrors>({});
  const [placeErrors, setPlaceErrors] = useState<{ origin?: string; destination?: string }>({});
  const [routeError, setRouteError] = useState<AppError | null>(null);

  const planning = session.pending?.kind === "route";
  const explicit = explicitFields(intent);

  // Original AI text is shown with each picker. After a swap the texts swap too, so roles stay visible.
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

  return (
    <Screen title={manual ? t.manualTitle : t.confirmTitle}>
      <Heading>{manual ? t.manualTitle : t.confirmTitle}</Heading>
      <Body muted>{manual ? t.manualIntro : t.confirmIntro}</Body>
      {manual && modelState.phase !== "ready" ? (
        <Notice tone="warning" title={t.aiUnavailable}>
          <Body>{t.aiUnavailableManual}</Body>
        </Notice>
      ) : null}

      {!manual && session.queryText ? (
        <Card>
          <Small>{t.yourWords}</Small>
          <Body>“{session.queryText}”</Body>
          {draft ? (
            <Small>
              {t.engineLabel[draft.extraction.engine.kind]} ({draft.extraction.engine.modelId})
            </Small>
          ) : null}
        </Card>
      ) : null}

      {draft?.warnings.map((w) => <Notice key={w} tone="warning" title={w} />)}
      {intent && intent.ambiguities.length > 0 ? (
        <Notice tone="warning" title={t.ambiguitiesHeading}>
          {intent.ambiguities.map((a) => (
            <Body key={a}>• {a}</Body>
          ))}
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

      <PlacePicker
        heading={t.originHeading}
        missingPrompt={t.originMissing}
        aiText={originText}
        showAiText={!manual}
        candidates={originCandidates}
        selected={origin}
        onSelect={(s) => {
          setOrigin(s);
          setPlaceErrors((e) => ({ ...e, origin: undefined }));
        }}
        error={placeErrors.origin}
      />

      <AppButton label={t.swapPlaces} icon="⇅" variant="secondary" onPress={swap} />

      <PlacePicker
        heading={t.destinationHeading}
        missingPrompt={t.destinationMissing}
        aiText={destinationText}
        showAiText={!manual}
        candidates={destinationCandidates}
        selected={destination}
        onSelect={(s) => {
          setDestination(s);
          setPlaceErrors((e) => ({ ...e, destination: undefined }));
        }}
        error={placeErrors.destination}
      />

      <PreferencesForm form={form} onChange={setForm} errors={prefErrors} explicit={explicit} />

      {routeError ? <ErrorCard error={routeError} handlers={{ retry: () => void submit() }} /> : null}

      <AppButton
        label={planning ? t.planning : t.findRoutes}
        busy={planning}
        onPress={() => void submit()}
      />
      {planning ? <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} /> : null}
      <AppButton label={t.resetForm} variant="link" onPress={reset} />
    </Screen>
  );
}
