// Member 3 (UI-005): manual onboard replanning through the same RouteRequest/results screens.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { RouteRequest } from "../src/contracts";
import { AppButton, Body, Heading, Notice } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import {
  DEFAULT_PREFERENCES,
  formToPreferences,
  newQueryId,
  preferencesToForm,
  type PreferenceErrors,
  type PreferenceForm,
} from "../src/ui/form-logic";
import { PreferencesForm } from "../src/ui/journey-form";
import { OnboardForm, type OnboardSelection } from "../src/ui/onboard-form";
import { onboardOrigin } from "../src/ui/onboard-logic";
import { PlacePicker, type PlaceSelection } from "../src/ui/place-picker";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";

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
  const [prefErrors, setPrefErrors] = useState<PreferenceErrors>({});
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const planning = session.pending?.kind === "route";

  const planFromKnownStop = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };

  const submit = async () => {
    const { direction, nextStop, confirmed } = selection;
    if (!direction || !nextStop || !confirmed) return;
    const prefs = formToPreferences(form);
    setPrefErrors(prefs.ok ? {} : prefs.errors);
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
    if (result.ok || result.error.code !== "CANCELLED") router.push("/results");
  };

  const ready = selection.direction !== null && selection.nextStop !== null && selection.confirmed;

  return (
    <Screen title={t.onboardTitle}>
      <Heading>{t.onboardTitle}</Heading>
      <Body muted>{t.onboardIntro}</Body>
      <Notice tone="info" title={t.noTracking} />

      {pack.status === "loading" ? <Notice tone="info" title={t.loading} /> : null}
      {pack.status === "loaded" && !pack.result.ok ? (
        <ErrorCard error={pack.result.error} handlers={{ retry: () => void reloadPack() }} />
      ) : null}

      {loaded ? (
        <>
          <OnboardForm pack={loaded} value={selection} onChange={setSelection} />
          {ready ? (
            <>
              <PlacePicker
                heading={t.onboardDestination}
                missingPrompt={t.chooseOne}
                aiText={null}
                showAiText={false}
                candidates={[]}
                selected={destination}
                onSelect={(s) => {
                  setDestination(s);
                  setDestinationError(null);
                }}
                error={destinationError}
              />
              <PreferencesForm form={form} onChange={setForm} errors={prefErrors} explicit={new Set()} />
              <AppButton
                label={planning ? t.planning : t.onboardPlan}
                busy={planning}
                onPress={() => void submit()}
              />
              {planning ? (
                <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <Notice
        tone="neutral"
        title={t.onboardUnsure}
        actions={<AppButton label={t.planFromKnownStop} variant="secondary" onPress={planFromKnownStop} />}
      >
        <Body>{t.onboardUnsureBody}</Body>
      </Notice>
    </Screen>
  );
}
