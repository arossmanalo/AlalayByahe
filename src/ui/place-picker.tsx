// Member 3 (UI-002): choose a stored place from AI candidates or a repository search.
// Never auto-picks fuzzy or multiple matches; the user always sees and confirms the choice.
import { useRef, useState } from "react";
import type { Place, PlaceCandidate, ResolvedEndpoint, ResolveResult, Result } from "../contracts";
import { AppButton, Body, Card, ChoiceChip, Heading, LabeledInput, Notice, Small } from "./components/primitives";
import { ErrorCard } from "./error-card";
import { endpointFromPlace, needsCoverageHint, placeDisplayName } from "./form-logic";
import { CoverageList } from "./readiness";
import { useReadiness, useUi } from "./services";

export interface PlaceSelection {
  endpoint: ResolvedEndpoint;
  display: string;
}

export function selectionFromPlace(place: Place): PlaceSelection {
  return { endpoint: endpointFromPlace(place), display: placeDisplayName(place) };
}

function CandidateList({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: PlaceCandidate[];
  selectedId: string | null;
  onSelect: (place: Place) => void;
}) {
  const { t } = useUi();
  return (
    <>
      {candidates.map(({ place, match }) => (
        <ChoiceChip
          key={place.id}
          kind="radio"
          label={`${placeDisplayName(place)} (${t.matchKind[match]})`}
          selected={selectedId === place.id}
          onPress={() => onSelect(place)}
        />
      ))}
    </>
  );
}

export function PlacePicker({
  heading,
  missingPrompt,
  aiText,
  showAiText,
  candidates,
  selected,
  onSelect,
  error,
}: {
  heading: string;
  missingPrompt: string;
  /** The text the AI extracted for this field, shown so the user can spot role mistakes. */
  aiText: string | null;
  showAiText: boolean;
  candidates: PlaceCandidate[];
  selected: PlaceSelection | null;
  onSelect: (selection: PlaceSelection) => void;
  error?: string | null;
}) {
  const { t, services } = useUi();
  const { pack } = useReadiness();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<
    { status: "idle" } | { status: "searching" } | { status: "done"; result: Result<ResolveResult> }
  >({ status: "idle" });
  const searchSeq = useRef(0);

  const runSearch = async () => {
    const text = query.trim();
    if (text === "") return;
    const seq = ++searchSeq.current;
    setSearch({ status: "searching" });
    const result = await services.repository.resolvePlace(text);
    if (seq === searchSeq.current) setSearch({ status: "done", result });
  };

  const selectedId = selected?.endpoint.placeId ?? null;
  const pick = (place: Place) => onSelect(selectionFromPlace(place));
  const searchCount = search.status === "done" && search.result.ok ? search.result.value.candidates.length : null;
  const coverageLabels = pack.status === "loaded" && pack.result.ok ? pack.result.value.coverageLabels : [];
  const showCoverage = needsCoverageHint(showAiText ? aiText : null, candidates.length, searchCount);

  return (
    <Card>
      <Heading level={2}>{heading}</Heading>
      {showAiText ? <Small>{aiText ? t.aiReadAs(aiText) : t.aiReadNothing}</Small> : null}

      {selected ? (
        <Notice tone="success" title={`${t.selected}: ${selected.display}`} />
      ) : (
        <Body>{missingPrompt}</Body>
      )}
      {error ? <Notice tone="danger" title={error} /> : null}

      {candidates.length > 1 ? <Small>{aiText ? t.whichPlace(aiText) : t.chooseOne}</Small> : null}
      {candidates.length === 1 && candidates[0]?.match !== "exact" ? <Small>{t.didYouMean}</Small> : null}
      <CandidateList candidates={candidates} selectedId={selectedId} onSelect={pick} />
      {showAiText && candidates.length === 0 ? <Small>{t.noCandidates}</Small> : null}

      <LabeledInput
        label={t.searchPlaces}
        hint={t.searchPlacesHint}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void runSearch()}
        autoCorrect={false}
        returnKeyType="search"
      />
      <AppButton
        label={search.status === "searching" ? t.searching : t.searchButton}
        variant="secondary"
        busy={search.status === "searching"}
        disabled={query.trim() === ""}
        onPress={() => void runSearch()}
      />
      {search.status === "done" ? (
        search.result.ok ? (
          search.result.value.candidates.length === 0 ? (
            <Small>{t.noSearchResults}</Small>
          ) : (
            <CandidateList candidates={search.result.value.candidates} selectedId={selectedId} onSelect={pick} />
          )
        ) : (
          <ErrorCard error={search.result.error} handlers={{ retry: () => void runSearch() }} />
        )
      ) : null}
      {showCoverage ? (
        <Notice tone="info" title={t.placeCoverageNote}>
          <CoverageList labels={coverageLabels} />
        </Notice>
      ) : null}
    </Card>
  );
}
