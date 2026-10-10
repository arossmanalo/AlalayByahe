// Member 3 (UI-001/UI-002): home: map, typed trip, readiness, manual and onboard entry points.
// Design artboards "Welcome" and "Home: map and trip field". Welcome shows at launch until local AI is set up.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import type { AppError } from "../src/contracts";
import { Icon } from "../src/ui/components/icons";
import { AppButton, Footnote, IconTile, ListGroup, ListRow, MapButton, Notice, SearchField, text } from "../src/ui/components/primitives";
import { MAP_PALETTE, MapPill, SchematicMap } from "../src/ui/components/SchematicMap";
import { Screen } from "../src/ui/components/Screen";
import { ErrorCard } from "../src/ui/error-card";
import { shouldShowError } from "../src/ui/error-logic";
import { checkQueryText, MAX_QUERY_CHARS, newQueryId } from "../src/ui/form-logic";
import { coverageLayers, EMPTY_LAYERS } from "../src/ui/map-geometry";
import { HomeStatusLink, networkLabel, useLoadedPack } from "../src/ui/readiness";
import { useJourneySession, useReadiness, useUi } from "../src/ui/services";
import { colors, legColors, tileColors } from "../src/ui/theme";
import { Welcome } from "../src/ui/welcome";

export default function HomeScreen() {
  const router = useRouter();
  const { t, welcomeDismissed, dismissWelcome } = useUi();
  const { modelState, booting } = useReadiness();
  const pack = useLoadedPack();
  const { session, setQueryText, interpret, startManual, cancelPending, planRoute } = useJourneySession();
  const [error, setError] = useState<AppError | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const aiReady = modelState.phase === "ready";
  const reading = session.pending?.kind === "interpret";
  const query = session.queryText;

  const onRead = async () => {
    setError(null);
    const check = checkQueryText(query);
    if (!check.ok) {
      setInputError(check.reason === "too_long" ? t.queryTooLong(MAX_QUERY_CHARS) : t.queryEmpty);
      return;
    }
    setInputError(null);
    const result = await interpret(check.text);
    if (result.ok) router.push("/confirm");
    else if (shouldShowError(result.error)) setError(result.error);
  };

  const onManual = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };

  const onRepeat = async () => {
    if (!session.request || !session.via) return;
    const result = await planRoute({ ...session.request, queryId: newQueryId() }, session.via);
    if (result.ok || shouldShowError(result.error)) router.push("/results");
  };

  if (!booting && modelState.phase === "absent" && !welcomeDismissed) {
    return (
      <Screen layout="bare" title={t.appName}>
        <Welcome
          onStart={() => {
            dismissWelcome();
            router.push({ pathname: "/setup", params: { from: "welcome" } });
          }}
          onSettings={() => router.push("/settings")}
        />
      </Screen>
    );
  }

  const network = pack ? networkLabel(pack, t) : null;
  const tooLong = query.length > MAX_QUERY_CHARS;

  return (
    <Screen layout="map"
      title={t.appName}
      sheetRatio={446 / 844}
      floatingRight={<MapButton icon="gear" label={t.settingsTitle} onPress={() => router.push("/settings")} />}
      renderMap={(size) => (
        <SchematicMap
          {...size}
          layers={pack ? coverageLayers(pack, MAP_PALETTE) : EMPTY_LAYERS}
          accessibilityLabel={t.homeMapA11y(network ?? t.coverageNone)}
          caption={pack ? t.mapCaption : undefined}
          badge={
            pack && network ? (
              <MapPill>
                <Icon name="lrt" size={14} color={legColors.lrt} strokeWidth={2.2} />
                <Text style={[text.footnoteDark, { fontWeight: "600" }]}>
                  {pack.kind === "test_fixture" ? t.mapSample(network) : t.mapCovered(network)}
                </Text>
              </MapPill>
            ) : undefined
          }
        />
      )}
    >
      <SearchField
        label={t.queryLabel}
        placeholder={t.homeTitle}
        value={query}
        onChangeText={(next) => {
          setQueryText(next);
          if (inputError) setInputError(null);
        }}
        clearLabel={t.clear}
        multiline
        returnKeyType="go"
        onSubmitEditing={aiReady && !reading ? () => void onRead() : undefined}
        error={inputError ?? (tooLong ? t.queryTooLong(MAX_QUERY_CHARS) : null)}
      />
      <Footnote style={{ marginTop: -6, marginHorizontal: 4 }}>
        {query.length > 0 ? t.charCount(query.length, MAX_QUERY_CHARS) : t.homeExample}
      </Footnote>

      {aiReady ? (
        query.trim().length > 0 || reading ? (
          <>
            <AppButton label={reading ? t.readingTrip : t.readTrip} busy={reading} disabled={tooLong} onPress={() => void onRead()} />
            {reading ? <AppButton label={t.cancel} variant="secondary" onPress={() => void cancelPending()} /> : null}
          </>
        ) : null
      ) : (
        <Notice
          tone="warning"
          title={t.aiUnavailable}
          actions={<AppButton label={t.setUpAi} variant="secondary" onPress={() => router.push("/setup")} />}
        >
          {t.aiUnavailableHome}
        </Notice>
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

      <ListGroup plain>
        <ListRow
          minHeight={60}
          leading={<IconTile icon="lrt" color={tileColors.transit} size={36} round iconSize={19} />}
          title={t.onboardTitle}
          subtitle={t.ridingSubtitle}
          accessory="chevron"
          onPress={() => router.push("/onboard")}
        />
        <ListRow
          minHeight={60}
          leading={<IconTile icon="pin" color={tileColors.place} size={36} round iconSize={19} />}
          title={t.choosePlaces}
          subtitle={t.choosePlacesSubtitle}
          accessory="chevron"
          onPress={onManual}
        />
      </ListGroup>

      {/* An onboard trip is never repeated: its confirmed next stop is stale once the vehicle moves. */}
      {session.request && session.via && !session.request.onboard ? (
        <ListGroup plain header={t.thisSession}>
          <ListRow
            minHeight={56}
            leading={<IconTile icon="clock" color={tileColors.session} size={36} round iconSize={19} />}
            title={`${session.request.origin.label} → ${session.request.destination.label}`}
            subtitle={t.repeatLast}
            accessibilityLabel={`${t.repeatLast}: ${session.request.origin.label} → ${session.request.destination.label}`}
            accessory={<Icon name="refresh" size={20} color={colors.primary} strokeWidth={2} />}
            disabled={session.pending?.kind === "route"}
            onPress={() => void onRepeat()}
          />
        </ListGroup>
      ) : null}

      <HomeStatusLink onPress={() => router.push("/setup")} />
    </Screen>
  );
}
