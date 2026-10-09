// Member 3 (UI-003): up to three grounded options, or an explained failure with recovery.
// UI-006: the loaded pack's actual coverage is stated on every outcome, so an unsupported corridor
// reads as "No verified complete journey available." next to the subset that is supported.
import { useRouter } from "expo-router";
import { AppButton, Body, Card, Heading, Notice, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { newQueryId } from "../src/ui/form-logic";
import { JourneyCard } from "../src/ui/journey-card";
import { coverageSummary, partitionOptions } from "../src/ui/journey-presenter";
import { CoverageList } from "../src/ui/readiness";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";

export default function ResultsScreen() {
  const router = useRouter();
  const { t } = useUi();
  const { pack } = useReadiness();
  const { session, planRoute, startManual } = useJourneySession();
  const { result, request, via } = session;
  const planning = session.pending?.kind === "route";
  const coverage = coverageSummary(
    pack.status === "loaded" && pack.result.ok ? pack.result.value.coverageLabels : [],
    result?.ok ? result.value.coverageWarnings : [],
  );

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

  let content;
  if (!result) {
    content = <Notice tone="info" title={t.noOptions} />;
  } else if (!result.ok) {
    content = (
      <ErrorCard
        error={result.error}
        handlers={{
          retry,
          manual,
          edit_places: edit,
          edit_preferences: edit,
          setup: () => router.push("/setup"),
        }}
      />
    );
  } else {
    const { shown, hiddenIncomplete } = partitionOptions(result.value.options);
    content = (
      <>
        {coverage.notes.length > 0 ? (
          <Notice tone="warning" title={t.coverageWarnings}>
            {coverage.notes.map((w) => (
              <Body key={w}>• {w}</Body>
            ))}
          </Notice>
        ) : null}
        {shown.length === 0 ? (
          // An empty option list is an error, never an apparently successful journey.
          <Notice
            tone="danger"
            title={hiddenIncomplete > 0 ? t.incompleteAll : t.noOptions}
            actions={<AppButton label={t.editJourney} onPress={edit} />}
          />
        ) : (
          shown.map((option, i) => (
            <JourneyCard
              key={option.id}
              option={option}
              index={i}
              onOpen={() => router.push({ pathname: "/journey", params: { optionId: option.id } })}
            />
          ))
        )}
        {shown.length > 0 && hiddenIncomplete > 0 ? (
          <Notice tone="warning" title={t.incompleteHidden(hiddenIncomplete)} />
        ) : null}
        {shown[0] ? <Small>{t.datasetLabel(shown[0].datasetVersion)}</Small> : null}
      </>
    );
  }

  return (
    <Screen title={t.resultsTitle}>
      <Heading>{t.resultsTitle}</Heading>
      {request ? (
        <Body style={{ fontWeight: "700" }}>
          {request.origin.label} → {request.destination.label}
        </Body>
      ) : null}
      <Small>{t.resultsIntro}</Small>
      {planning ? <Notice tone="info" title={t.planning} /> : content}
      <Card>
        <Heading level={2}>{t.coverageHeading}</Heading>
        <CoverageList labels={coverage.labels} />
        <Small>{t.coverageOnlyNote}</Small>
      </Card>
      <AppButton label={t.editJourney} variant="secondary" onPress={edit} disabled={!request} />
      <AppButton label={t.newSearch} variant="link" onPress={() => router.dismissTo("/")} />
    </Screen>
  );
}
