// Member 3 (ALERT-003): "Notify me near my stop" card on the journey screen.
// Foreground only: location is requested only when the user taps the button, the watch
// stops on "Stop alerts", when the screen closes and when the app leaves the foreground.
// Alerts are always visible text and announced to TalkBack, never vibration alone.
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Vibration } from "react-native";
import type { JourneyOption, Point } from "../contracts";
import { createPreviewWatch } from "./alert-preview";
import { AppButton, Body, Notice, Small } from "./components/primitives";
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

export function DropoffAlertCard({ option, onPosition }: { option: JourneyOption; onPosition?: (position: Point | null) => void }) {
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
    />
  );
}

function ActiveAlert({
  target,
  location,
  createWatcher,
  onPosition,
}: {
  target: AlertTarget;
  location: LocationWatchPort;
  createWatcher: DropoffWatcherFactory;
  onPosition?: (position: Point | null) => void;
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
  const actions =
    view.primary || view.showStop || onPreview ? (
      <>
        {view.primary && onPrimary ? <AppButton label={view.primary.label} onPress={onPrimary} /> : null}
        {view.showStop && onStop ? <AppButton label={t.alertStop} variant="secondary" onPress={onStop} /> : null}
        {!view.showStop && onPreview ? <AppButton label={t.alertPreview} variant="secondary" onPress={onPreview} /> : null}
      </>
    ) : undefined;
  return (
    <Notice tone={view.tone} title={view.title} actions={actions}>
      {view.body ? <Body>{view.body}</Body> : null}
      {previewing ? <Body>{t.alertPreviewRunning}</Body> : null}
      {sample ? <Small>{t.alertSampleLocation}</Small> : null}
      {weakSignal ? <Body>{weakSignal}</Body> : null}
      {showLimits ? <Small>{t.alertLimits}</Small> : null}
      {showLimits ? <Small>{t.alertScreenOn}</Small> : null}
    </Notice>
  );
}
