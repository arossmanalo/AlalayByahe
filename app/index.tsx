// Member 3 (UI-001/UI-002): home: typed trip, readiness, manual and onboard entry points.
import { useRouter } from "expo-router";
import { useState } from "react";
import type { AppError } from "../src/contracts";
import { AppButton, Body, ChipRow, ChoiceChip, Heading, LabeledInput, Notice, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { checkQueryText, MAX_QUERY_CHARS, newQueryId } from "../src/ui/form-logic";
import type { UiLanguage } from "../src/ui/i18n";
import { ReadinessSummary } from "../src/ui/readiness";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";

const LANGUAGES: UiLanguage[] = ["en", "fil"];

export default function HomeScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useUi();
  const { modelState } = useReadiness();
  const { session, setQueryText, interpret, startManual, cancelPending, planRoute } = useJourneySession();
  const [error, setError] = useState<AppError | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const aiReady = modelState.phase === "ready";
  const reading = session.pending?.kind === "interpret";
  const text = session.queryText;

  const onRead = async () => {
    setError(null);
    const check = checkQueryText(text);
    if (!check.ok) {
      setInputError(check.reason === "too_long" ? t.queryTooLong(MAX_QUERY_CHARS) : t.queryEmpty);
      return;
    }
    setInputError(null);
    const result = await interpret(check.text);
    if (result.ok) router.push("/confirm");
    else if (result.error.code !== "CANCELLED") setError(result.error);
  };

  const onManual = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };

  const onRepeat = async () => {
    if (!session.request || !session.via) return;
    const result = await planRoute({ ...session.request, queryId: newQueryId() }, session.via);
    if (result.ok || result.error.code !== "CANCELLED") router.push("/results");
  };

  return (
    <Screen title={t.appName}>
      <ChipRow>
        {LANGUAGES.map((lang) => (
          <ChoiceChip
            key={lang}
            kind="radio"
            label={t.languageNames[lang]}
            selected={language === lang}
            onPress={() => setLanguage(lang)}
          />
        ))}
      </ChipRow>

      <Heading>{t.homeTitle}</Heading>
      <Body muted>{t.homeIntro}</Body>

      <ReadinessSummary onOpenSetup={() => router.push("/setup")} />

      <LabeledInput
        label={t.queryLabel}
        hint={t.queryHint}
        value={text}
        onChangeText={(next) => {
          setQueryText(next);
          if (inputError) setInputError(null);
        }}
        placeholder={t.queryPlaceholder}
        multiline
        error={inputError ?? (text.length > MAX_QUERY_CHARS ? t.queryTooLong(MAX_QUERY_CHARS) : null)}
      />
      <Small>{t.charCount(text.length, MAX_QUERY_CHARS)}</Small>

      {aiReady ? (
        <>
          <AppButton
            label={reading ? t.readingTrip : t.readTrip}
            busy={reading}
            disabled={text.length > MAX_QUERY_CHARS}
            onPress={() => void onRead()}
          />
          {reading ? <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} /> : null}
        </>
      ) : (
        <Notice
          tone="warning"
          title={t.aiUnavailableHome}
          actions={<AppButton label={t.setUpAi} variant="secondary" onPress={() => router.push("/setup")} />}
        />
      )}

      {error ? (
        <ErrorCard
          error={error}
          handlers={{
            retry: () => void onRead(),
            manual: onManual,
            setup: () => router.push("/setup"),
            edit_places: onManual,
          }}
        />
      ) : null}

      <AppButton label={t.chooseManually} variant={aiReady ? "secondary" : "primary"} onPress={onManual} />
      <AppButton label={t.alreadyRiding} variant="secondary" onPress={() => router.push("/onboard")} />

      {/* An onboard trip is never repeated: its confirmed next stop is stale once the vehicle moves. */}
      {session.request && session.via && !session.request.onboard ? (
        <AppButton
          label={`${t.repeatLast}: ${session.request.origin.label} → ${session.request.destination.label}`}
          variant="secondary"
          busy={session.pending?.kind === "route"}
          onPress={() => void onRepeat()}
        />
      ) : null}

      <AppButton label={t.aboutLink} variant="link" onPress={() => router.push("/about")} />
    </Screen>
  );
}
