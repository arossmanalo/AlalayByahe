// Member 3 (UI-004): AI and transit-data readiness, shown separately (AGENTS.md: separate readiness).
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ModelState, TransitPack } from "../contracts";
import { Icon } from "./components/icons";
import {
  AppButton,
  GroupFooterText,
  IconTile,
  ListGroup,
  ListRow,
  ProgressBar,
  StatusText,
  text,
} from "./components/primitives";
import { ErrorCard } from "./error-card";
import { ALL_MODES } from "./form-logic";
import { formatDate } from "./format";
import type { Strings } from "./i18n";
import { modesWithoutService, networkShortName } from "./map-geometry";
import { useReadiness, useUi } from "./services";
import { colors, spacing, tileColors, type Tone } from "./theme";

export function modelTone(state: ModelState): Tone {
  if (state.phase === "ready") return "success";
  if (state.phase === "failed") return "danger";
  if (state.phase === "absent") return "warning";
  return "info";
}

export function formatBytes(bytes: number): string {
  // Decimal megabytes, matching the contract's "491.4 MB".
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** The loaded pack, or null while loading or when it failed. */
export function useLoadedPack(): TransitPack | null {
  const { pack } = useReadiness();
  return pack.status === "loaded" && pack.result.ok ? pack.result.value : null;
}

/** "LRT-1", or "44 services" for a large network. */
export function networkLabel(pack: TransitPack, t: Strings): string {
  const short = networkShortName(pack);
  return short.kind === "names" ? short.text : t.networkCount(short.count);
}

/** The loaded pack's coverage labels, or an explicit "none loaded". Target corridors are never listed here. */
export function CoverageList({ labels }: { labels: readonly string[] }) {
  const { t } = useUi();
  if (labels.length === 0) return <Text style={text.subhead}>{t.coverageNone}</Text>;
  return (
    <>
      {labels.map((label) => (
        <View key={label} style={styles.coverageRow} accessible accessibilityLabel={`${t.coveredPrefix}: ${label}`}>
          <Icon name="check" size={18} color={colors.success} strokeWidth={2.6} style={styles.coverageIcon} />
          <Text style={[text.subhead, styles.flex]}>{label}</Text>
        </View>
      ))}
    </>
  );
}

/** Covered labels with check marks, then the modes with no service in the pack, as on "Outside coverage". */
export function CoverageGroup({ labels, pack }: { labels: readonly string[]; pack: TransitPack | null }) {
  const { t } = useUi();
  const missing = pack ? modesWithoutService(pack, ALL_MODES) : [];
  return (
    <ListGroup header={t.coverageHeading} footer={t.coverageOnlyNote}>
      {labels.length === 0 ? (
        <ListRow title={t.coverageNone} />
      ) : (
        labels.map((label) => (
          <ListRow
            key={label}
            accessibilityLabel={`${t.coveredPrefix}: ${label}`}
            leading={<Icon name="check" size={20} color={colors.success} strokeWidth={2.6} />}
            title={<Text style={text.subhead}>{label}</Text>}
          />
        ))
      )}
      {missing.length > 0 ? (
        <ListRow
          accessibilityLabel={`${t.notCoveredPrefix}: ${missing.map((m) => t.modeNames[m]).join(", ")}`}
          leading={<Icon name="close" size={18} color={colors.textMuted} strokeWidth={2.6} />}
          title={<Text style={[text.subhead, { color: colors.textTertiary }]}>{t.notCoveredModes(missing.map((m) => t.modeNames[m]).join(", "))}</Text>}
        />
      ) : null}
    </ListGroup>
  );
}

/** Home footer: "Local AI ready · LRT-1 data loaded", opening Get ready. The dot is never the only signal. */
export function HomeStatusLink({ onPress }: { onPress: () => void }) {
  const { t } = useUi();
  const { modelState, pack } = useReadiness();
  const loaded = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;
  const data = pack.status === "loading" ? t.statusDataLoading : loaded ? t.statusDataLoaded(networkLabel(loaded, t)) : t.statusDataMissing;
  const allReady = modelState.phase === "ready" && loaded !== null;
  const label = t.homeStatus(t.statusAi[modelState.phase], data);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t.setupTitle} onPress={onPress} style={({ pressed }) => [styles.statusLink, pressed && styles.pressed]}>
      <View style={[styles.dot, { backgroundColor: allReady ? colors.switchOn : "#FF9500" }]} />
      <Text style={[text.footnote, styles.center]}>{label}</Text>
    </Pressable>
  );
}

/** Local AI group: the model, its state and the actions that state allows. */
export function LocalAiGroup({ onManual }: { onManual: () => void }) {
  const { t, services } = useUi();
  const { modelState, startModelSetup } = useReadiness();
  const manifest = services.modelManifest;
  const start = () => void startModelSetup();
  const cancel =
    (modelState.phase === "downloading" || modelState.phase === "checking") && services.cancelModelSetup ? services.cancelModelSetup : null;

  let state = null;
  switch (modelState.phase) {
    case "absent":
      state = (
        <View style={styles.stateBlock}>
          <Text style={text.subhead}>{manifest ? t.modelAbsentBody(formatBytes(manifest.bytes)) : t.modelAbsentBodyUnknownSize}</Text>
          <AppButton label={t.downloadModel} onPress={start} />
          <AppButton label={t.chooseManually} variant="secondary" onPress={onManual} />
        </View>
      );
      break;
    case "downloading":
      state = (
        <View style={styles.stateBlock}>
          <View style={styles.stateHeader}>
            <Text style={[text.subhead, styles.flex]}>
              {modelState.progress !== null ? t.downloadingPercent(Math.floor(modelState.progress * 100)) : t.modelDownloading}
            </Text>
            {cancel ? <AppButton label={t.cancel} variant="link" onPress={cancel} style={styles.inlineCancel} /> : null}
          </View>
          <ProgressBar progress={modelState.progress} label={t.modelDownloading} />
        </View>
      );
      break;
    case "checking":
      state = (
        <View style={styles.stateBlock}>
          <View style={styles.stateHeader}>
            <Text style={[text.subhead, styles.flex]}>{t.modelChecking}</Text>
            {cancel ? <AppButton label={t.cancel} variant="link" onPress={cancel} style={styles.inlineCancel} /> : null}
          </View>
          <ProgressBar progress={modelState.progress} label={t.modelChecking} />
        </View>
      );
      break;
    case "initializing":
      state = (
        <View style={styles.stateBlock}>
          <Text style={text.subhead}>{t.modelInitializing}</Text>
          <ProgressBar progress={modelState.progress} label={t.modelInitializing} />
        </View>
      );
      break;
    case "ready":
      state = null;
      break;
    case "failed":
      state = (
        <View style={styles.stateBlock}>
          <ErrorCard error={modelState.error} handlers={{ retry: start, setup: start, manual: onManual }} />
        </View>
      );
      break;
  }

  return (
    <ListGroup
      header={t.aiLabel}
      footer={
        <>
          <GroupFooterText>{t.aiSetupFooter}</GroupFooterText>
          {manifest ? <GroupFooterText>{t.modelDetails(manifest.id, manifest.revision, manifest.license)}</GroupFooterText> : null}
        </>
      }
    >
      <ListRow
        minHeight={56}
        leading={<IconTile icon="chip" color={tileColors.ai} />}
        title={t.languageModel}
        subtitle={manifest ? t.languageModelSub(formatBytes(manifest.bytes)) : t.languageModelSubNoSize}
        detail={<StatusText tone={modelTone(modelState)} label={t.aiPhase[modelState.phase]} size="small" />}
        accessibilityLabel={`${t.languageModel}: ${t.aiPhase[modelState.phase]}`}
      />
      {state}
    </ListGroup>
  );
}

/** Transit pack status, independent of AI. A test fixture pack is labeled as such. */
export function TransitDataGroup() {
  const { t, services } = useUi();
  const { pack, reloadPack } = useReadiness();
  const loaded = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;
  const fixture = loaded?.kind === "test_fixture" && !services.hideTestPackBanner;
  return (
    <ListGroup
      header={t.dataSection}
      footer={
        loaded ? (
          <>
            <GroupFooterText>{t.dataVersion(loaded.version, formatDate(loaded.createdAt))}</GroupFooterText>
            {fixture ? <GroupFooterText>{t.testPackWarning}</GroupFooterText> : null}
          </>
        ) : undefined
      }
    >
      <ListRow
        minHeight={52}
        leading={<IconTile icon="lrt" color={tileColors.transit} />}
        title={loaded ? networkLabel(loaded, t) : t.dataLabel}
        detail={
          pack.status === "loading" ? (
            <StatusText tone="info" label={t.loading} size="small" />
          ) : loaded ? (
            <StatusText tone={fixture ? "fixture" : "success"} label={t.dataReady} size="small" />
          ) : (
            <StatusText tone="danger" label={t.dataNotReady} size="small" />
          )
        }
      />
      {pack.status === "loaded" && !pack.result.ok ? (
        <View style={styles.stateBlock}>
          <ErrorCard error={pack.result.error} handlers={{ retry: () => void reloadPack() }} />
        </View>
      ) : null}
    </ListGroup>
  );
}

/** Online helpers as they really are in this build: off unless configured, and on request only. */
export function OnlineHelpersGroup({ mapPicturesAvailable }: { mapPicturesAvailable: boolean }) {
  const { t, services } = useUi();
  return (
    <ListGroup
      header={t.mapsSection}
      footer={
        <>
          <GroupFooterText>{t.offlineBody}</GroupFooterText>
          <GroupFooterText>{services.onlineHelpersEnabled ? t.onlineHelpersOn : t.onlineHelpersOff}</GroupFooterText>
          <GroupFooterText>{t.connectivityNote}</GroupFooterText>
        </>
      }
    >
      <ListRow
        leading={<IconTile icon="map" color={tileColors.maps} />}
        title={t.onlineLookupRow}
        detail={services.onlineHelpersEnabled ? t.onlineLookupOnRequest : t.onlineLookupOff}
        accessibilityLabel={`${t.onlineLookupRow}: ${services.onlineHelpersEnabled ? t.onlineLookupOnRequest : t.onlineLookupOff}`}
      />
      <ListRow
        leading={<IconTile icon="pin" color={tileColors.place} />}
        title={t.mapPicturesRow}
        detail={mapPicturesAvailable ? t.mapPicturesOnRequest : t.mapPicturesNotInBuild}
        accessibilityLabel={`${t.mapPicturesRow}: ${mapPicturesAvailable ? t.mapPicturesOnRequest : t.mapPicturesNotInBuild}`}
      />
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  pressed: { opacity: 0.6 },
  coverageRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  coverageIcon: { marginTop: 1 },
  statusLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, alignSelf: "center", paddingHorizontal: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stateBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 10 },
  stateHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  inlineCancel: { minHeight: 44, paddingHorizontal: spacing.sm, marginVertical: -spacing.sm },
});
