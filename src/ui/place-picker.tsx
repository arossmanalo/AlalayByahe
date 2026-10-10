// Member 3 (UI-002): choose a stored place from AI candidates or a repository search
// (design artboard "Choose a place"). Never auto-picks fuzzy or multiple matches; the user always sees and
// confirms the choice. Only stored places are offered: this build has no online address search.
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Place, PlaceCandidate, ResolvedEndpoint, ResolveResult, Result } from "../contracts";
import { ListGroup, ListRow, Notice, SearchField, IconTile, text } from "./components/primitives";
import { SheetModal } from "./components/SheetModal";
import { ErrorCard } from "./error-card";
import { endpointFromPlace, needsCoverageHint, placeDisplayName } from "./form-logic";
import type { Strings } from "./i18n";
import { CoverageList, useLoadedPack } from "./readiness";
import { useUi } from "./services";
import { tileColors } from "./theme";

export interface PlaceSelection {
  endpoint: ResolvedEndpoint;
  display: string;
  /** How the place matched the user's words, when it came from them. */
  match?: PlaceCandidate["match"];
}

export function selectionFromPlace(place: Place, match?: PlaceCandidate["match"]): PlaceSelection {
  return { endpoint: endpointFromPlace(place), display: placeDisplayName(place), ...(match ? { match } : {}) };
}

const SEARCH_DELAY_MS = 300;

/** A place to offer: matched against the user's words or a search, or just listed (no match kind). */
type PlaceItem = { place: Place; match?: PlaceCandidate["match"] };

/** One list row per place; returned as an array so the list group draws a hairline between rows. */
function placeRows(items: PlaceItem[], selectedId: string | null, onSelect: (item: PlaceItem) => void, t: Strings) {
  return items.map((item) => (
    <ListRow
      key={item.place.id}
      role="radio"
      minHeight={56}
      leading={<IconTile icon="pin" color={tileColors.place} round iconSize={16} />}
      title={item.place.name}
      subtitle={item.match ? `${item.place.locality} · ${t.matchKind[item.match]}` : item.place.locality}
      accessibilityLabel={item.match ? `${placeDisplayName(item.place)} (${t.matchKind[item.match]})` : placeDisplayName(item.place)}
      selected={selectedId === item.place.id}
      accessory="check"
      onPress={() => onSelect(item)}
    />
  ));
}

export function PlacePickerSheet({
  visible,
  title,
  aiText,
  showAiText,
  candidates,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  /** The text the AI extracted for this field, shown so the user can spot role mistakes. */
  aiText: string | null;
  showAiText: boolean;
  candidates: PlaceCandidate[];
  selected: PlaceSelection | null;
  onSelect: (selection: PlaceSelection) => void;
  onClose: () => void;
}) {
  const { t, services } = useUi();
  const pack = useLoadedPack();
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [search, setSearch] = useState<
    { status: "idle" } | { status: "searching" } | { status: "done"; result: Result<ResolveResult> }
  >({ status: "idle" });
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setBrowsing(false);
      setSearch({ status: "idle" });
    }
  }, [visible]);

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    const seq = ++searchSeq.current;
    if (trimmed === "") {
      setSearch({ status: "idle" });
      return;
    }
    setSearch({ status: "searching" });
    const result = await services.repository.resolvePlace(trimmed);
    if (seq === searchSeq.current) setSearch({ status: "done", result });
  };

  // Stored-place search is local, so it runs as the user types (debounced) as well as on the search key.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => void runSearch(query), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const selectedId = selected?.endpoint.placeId ?? null;
  const pick = (item: PlaceItem) => {
    onSelect(selectionFromPlace(item.place, item.match));
    onClose();
  };
  const searchCount = search.status === "done" && search.result.ok ? search.result.value.candidates.length : null;
  const showCoverage = needsCoverageHint(showAiText ? aiText : null, candidates.length, searchCount);
  const allPlaces = useMemo(
    () => (pack ? [...pack.places].sort((a, b) => a.name.localeCompare(b.name)).map((place): PlaceItem => ({ place })) : []),
    [pack],
  );

  const aiNote = showAiText ? (aiText ? t.aiReadAs(aiText) : t.aiReadNothing) : null;
  const candidateNote =
    candidates.length > 1 ? (aiText ? t.whichPlace(aiText) : t.chooseOne) : candidates.length === 1 && candidates[0]?.match !== "exact" ? t.didYouMean : null;

  return (
    <SheetModal
      visible={visible}
      title={title}
      cancelLabel={t.cancel}
      onCancel={onClose}
      header={
        <SearchField
          label={t.searchPlaces}
          placeholder={t.searchPlacesHint}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch(query)}
          clearLabel={t.clear}
          strong
        />
      }
    >
      {showAiText ? (
        candidates.length > 0 ? (
          <ListGroup header={t.fromYourWords} footer={[aiNote, candidateNote].filter(Boolean).join(" ")}>
            {placeRows(candidates, selectedId, pick, t)}
          </ListGroup>
        ) : (
          <View style={{ marginHorizontal: 16, gap: 4 }}>
            {aiNote ? <Text style={text.footnote}>{aiNote}</Text> : null}
            <Text style={text.footnote}>{t.noCandidates}</Text>
          </View>
        )
      ) : null}

      {query.trim() !== "" ? (
        <ListGroup header={t.storedSection}>
          {search.status === "searching" || search.status === "idle" ? (
            <ListRow title={<Text style={[text.subhead, text.muted]}>{t.searching}</Text>} />
          ) : search.result.ok ? (
            search.result.value.candidates.length === 0 ? (
              <ListRow title={<Text style={[text.subhead, text.muted]}>{t.noSearchResults}</Text>} />
            ) : (
              placeRows(search.result.value.candidates, selectedId, pick, t)
            )
          ) : (
            <View style={{ padding: 12 }}>
              <ErrorCard error={search.result.error} handlers={{ retry: () => void runSearch(query) }} />
            </View>
          )}
        </ListGroup>
      ) : (
        <ListGroup header={t.storedSection} footer={pack ? t.storedCount(pack.places.length) : undefined}>
          <ListRow title={browsing ? t.hideList : t.browsePlaces} tinted accessory="chevron" onPress={() => setBrowsing((b) => !b)} />
          {browsing ? placeRows(allPlaces, selectedId, pick, t) : null}
        </ListGroup>
      )}

      {showCoverage ? (
        <Notice tone="info" title={t.placeCoverageNote}>
          <CoverageList labels={pack?.coverageLabels ?? []} />
        </Notice>
      ) : null}
    </SheetModal>
  );
}
