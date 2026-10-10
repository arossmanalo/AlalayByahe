// Member 3 (ALERT-003): "Notify me near my stop" card on the journey screen.
// Foreground only: location is requested only when the user taps the button, the watch
// stops on "Stop alerts", when the screen closes and when the app leaves the foreground.
// Alerts are always visible text and announced to TalkBack, never vibration alone.
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, Text, View, Vibration } from "react-native";
import type { JourneyOption, Point } from "../contracts";
import { createPreviewWatch } from "./alert-preview";
import { AppButton, GroupFooterText, IconTile, ListGroup, ListRow, SwitchControl, text } from "./components/primitives";
import {
  alertTargetFor,
  isWatching,
  isWeakSignal,
  nextAlertStatus,
  nextWeakCount,
  presentAlert,
  presentNoTarget,
  vibrationFor,
  type AlertTarget,
  type AlertView,
  type DropoffWatcherFactory,
  type LocationWatchPort,
} from "./dropoff-alert";
import { useReadiness, useUi } from "./services";
import { colors, spacing, tileColors, toneColors } from "./theme";

/** The near-stop message shown over the map while the phone is approaching or at the stop. */
export interface AlertBanner {
  title: string;
  body: string | null;
  onStop: () => void;
}

export function DropoffAlertCard({
  option,
  onPosition,
  onBanner,
}: {
  option: JourneyOption;
  onPosition?: (position: Point | null) => void;
  onBanner?: (banner: AlertBanner | null) => void;
}) {
  const { t, services } = useUi();
  const { pack } = useReadiness();
  const loaded = pack.status === "loaded" && pack.result.ok ? pack.result.value : null;
  const target = useMemo(
    () => alertTargetFor(option, loaded, { allowUnverified: services.allowUnverifiedAlerts }),
    [option, loaded, services.allowUnverifiedAlerts],
  );

  if (!services.location || !services.createDropoffWatcher) {
    return <AlertNotice view={{ tone: "neutral", title: t.alertTitle, body: t.alertNotInBuild, primary: null, showStop: false, announce: null }} />;
  }
  if (!target.ok) return <AlertNotice view={presentNoTarget(target.reason, t)} />;
  return (
    <ActiveAlert
      key={target.target.stopId}
      target={target.target}
      location={services.location}
      createWatcher={services.createDropoffWatcher}
      onPosition={onPosition}
      onBanner={onBanner}
    />
  );
}

function ActiveAlert({
  target,
  location,
  createWatcher,
  onPosition,
  onBanner,
}: {
  target: AlertTarget;
  location: LocationWatchPort;
  createWatcher: DropoffWatcherFactory;
  onPosition?: (position: Point | null) => void;
  onBanner?: (banner: AlertBanner | null) => void;
}) {
  const { t } = useUi();
  const [status, dispatch] = useReducer(nextAlertStatus, { phase: "off" });
  const subscription = useRef<{ stop(): void } | null>(null);
  // Bumped on every start/stop so a late permission answer or watch cannot revive a stopped alert.
  const generation = useRef(0);
  const [weakCount, setWeakCount] = useState(0);
  // True while the simulated preview walk is running (invented positions, not GPS).
  const [previewing, setPreviewing] = useState(false);

  const stopWatch = useCallback(() => {
    generation.current++;
    subscription.current?.stop();
    subscription.current = null;
    Vibration.cancel();
    onPosition?.(null);
  }, [onPosition]);

  const start = useCallback(async (mode: "real" | "preview" = "real") => {
    stopWatch();
    const mine = generation.current;
    setPreviewing(mode === "preview");
    const port = mode === "preview" ? createPreviewWatch(target) : location;
    dispatch({ type: "start" });
    const outcome = await port.requestPermission();
    if (mine !== generation.current) return;
    dispatch({ type: "permission", outcome });
    if (outcome !== "granted") return;
    setWeakCount(0);
    const created = createWatcher({ target: target.point, ...target.thresholds });
    if (!created.ok) {
      dispatch({ type: "watch_failed" });
      return;
    }
    const watcher = created.value;
    try {
      const sub = await port.watch(
        (fix) => {
          if (mine !== generation.current) return;
          const reading = watcher.update(fix);
          onPosition?.({ latitude: fix.latitude, longitude: fix.longitude });
          setWeakCount((count) => nextWeakCount(count, reading.ignored));
          dispatch({ type: "reading", state: reading.state, distanceMeters: reading.distanceMeters });
          const pattern = vibrationFor(reading.event);
          if (pattern) Vibration.vibrate(pattern);
        },
        () => {
          if (mine === generation.current) dispatch({ type: "watch_failed" });
        },
      );
      if (mine !== generation.current) sub.stop();
      else subscription.current = sub;
    } catch {
      if (mine === generation.current) dispatch({ type: "watch_failed" });
    }
  }, [createWatcher, location, onPosition, stopWatch, target]);

  const stop = useCallback(() => {
    stopWatch();
    setPreviewing(false);
    dispatch({ type: "stop" });
  }, [stopWatch]);

  // Pause when the app leaves the foreground; never keep using location in the background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        stopWatch();
        dispatch({ type: "background" });
      }
    });
    return () => sub.remove();
  }, [stopWatch]);

  // The alert pauses when the app is in the background, so hold the screen awake only while it is watching.
  const watching = isWatching(status);
  useEffect(() => {
    if (!watching) return;
    activateKeepAwakeAsync("stop-alert").catch(() => undefined);
    return () => {
      deactivateKeepAwake("stop-alert").catch(() => undefined);
    };
  }, [watching]);

  // Leaving the journey screen (cancel, new search) stops the watch.
  useEffect(() => stopWatch, [stopWatch]);

  const view = presentAlert(status, target.name, t);
  useEffect(() => {
    if (view.announce) AccessibilityInfo.announceForAccessibility(view.announce);
  }, [view.announce]);

  // Approaching and arrived are also shown over the map, with their own "Stop alerts" button.
  const near = status.phase === "approaching" || status.phase === "arrived";
  useEffect(() => {
    onBanner?.(near ? { title: view.title, body: view.body, onStop: stop } : null);
  }, [near, view.title, view.body, stop, onBanner]);
  useEffect(() => () => onBanner?.(null), [onBanner]);

  return (
    <AlertNotice
      view={view}
      onPrimary={() => void start()}
      onPreview={() => void start("preview")}
      previewing={previewing && isWatching(status)}
      sample={target.verified === false}
      onStop={stop}
      showLimits={isWatching(status) || status.phase === "off"}
      weakSignal={isWatching(status) && isWeakSignal(weakCount) ? (status.phase === "waiting_fix" ? t.alertWeakSignal : t.alertWeakSignalShort) : null}
    />
  );
}

function AlertNotice({
  view,
  onPrimary,
  onPreview,
  previewing = false,
  sample = false,
  onStop,
  showLimits = false,
  weakSignal = null,
}: {
  view: AlertView;
  onPrimary?: () => void;
  onPreview?: () => void;
  previewing?: boolean;
  sample?: boolean;
  onStop?: () => void;
  showLimits?: boolean;
  weakSignal?: string | null;
}) {
  const { t } = useUi();
  const available = onPrimary !== undefined || onStop !== undefined;
  // The switch is on while location is in use; on starts or resumes, off stops. Paused reads as off.
  const on = view.showStop && view.primary === null;
  const toggle = (next: boolean) => {
    if (next && view.primary && onPrimary) onPrimary();
    else if (!next && onStop) onStop();
  };
  const statusColor = view.tone === "warning" || view.tone === "danger" ? toneColors[view.tone].fg : colors.text;
  // While off, the explanation is the group footer; every other state is a status line inside the group.
  const resting = status(view) === "off";
  const footer = [
    resting || !available ? view.body : null,
    previewing ? t.alertPreviewRunning : null,
    sample ? t.alertSampleLocation : null,
    showLimits ? t.alertLimits : null,
    showLimits ? t.alertScreenOn : null,
  ].filter((line): line is string => line !== null);
  const statusTitle = !resting && available && view.title !== t.alertTitle ? view.title : null;
  const statusBody = !resting && available ? view.body : null;
  return (
    <ListGroup
      header={t.stopAlertSection}
      footer={
        footer.length > 0 ? (
          <>
            {footer.map((line) => (
              <GroupFooterText key={line}>{line}</GroupFooterText>
            ))}
          </>
        ) : undefined
      }
    >
      <ListRow
        minHeight={52}
        leading={<IconTile icon="bell" color={available ? tileColors.alert : tileColors.disabled} />}
        title={t.alertStart}
        disabled={!available}
        accessory={<SwitchControl label={available ? t.alertStart : `${t.alertStart}. ${view.body ?? ""}`} value={on} disabled={!available} onValueChange={toggle} />}
      />
      {statusTitle || statusBody || weakSignal ? (
        <View style={styles.status} accessibilityLiveRegion="polite" accessible>
          {statusTitle ? <Text style={[text.subhead, styles.semibold, { color: statusColor }]}>{statusTitle}</Text> : null}
          {statusBody ? <Text style={text.subhead}>{statusBody}</Text> : null}
          {weakSignal ? <Text style={text.subhead}>{weakSignal}</Text> : null}
        </View>
      ) : null}
      {view.showStop && view.primary !== null && onStop ? <ListRow title={t.alertStop} tinted onPress={onStop} /> : null}
      {!view.showStop && onPreview ? <ListRow title={t.alertPreview} tinted onPress={onPreview} /> : null}
    </ListGroup>
  );
}

/** "off": the resting state that offers to start (its body is the explanation). */
function status(view: AlertView): "off" | "other" {
  return view.primary?.action === "start" && view.tone === "info" ? "off" : "other";
}

/** Floating near-stop message over the map (design artboard "Stop alert: near your stop"). */
export function AlertBannerCard({ banner }: { banner: AlertBanner }) {
  const { t } = useUi();
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.bannerTop}>
        <IconTile icon="bell" color={tileColors.alert} size={38} round iconSize={20} />
        <View style={styles.flex}>
          <Text style={[text.body, styles.semibold]}>{banner.title}</Text>
          {banner.body ? <Text style={[text.subhead, { color: colors.textTertiary }]}>{banner.body}</Text> : null}
        </View>
      </View>
      <AppButton label={t.alertStop} variant="secondary" onPress={banner.onStop} style={styles.bannerButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  semibold: { fontWeight: "600" },
  status: { gap: 4, paddingLeft: 58, paddingRight: spacing.lg, paddingTop: 10, paddingBottom: spacing.md },
  banner: { gap: spacing.md, padding: 14, backgroundColor: colors.surface, borderRadius: 20, boxShadow: "0 10px 32px rgba(0,0,0,0.18)" },
  bannerTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  bannerButton: { minHeight: 44 },
});
