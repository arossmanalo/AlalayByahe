// Member 3 (ALERT-003): optional "Notify me near my stop" card for the journey detail screen.
// A reminder from the phone's own location while the app is open. It is not vehicle tracking, never
// states an arrival time, and never blocks the journey. Location is read only after the user taps,
// stays in memory, and is never stored, logged or sent anywhere.
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Vibration, View } from "react-native";
import type { JourneyOption, TransitPack } from "../contracts";
import { aerialMeters } from "../data/geo";
import { createDropoffWatcher, thresholdsForRide, type DropoffWatcher } from "../routing/dropoffProximity";
import { buildTripPins } from "../routing/tripPins";
import { AppButton, Body, Card, Heading, Notice, Small } from "./components/primitives";
import {
  alertText,
  isListening,
  needsScreenOn,
  phaseAfterPermission,
  phaseAfterUpdate,
  phaseOnAppState,
  vibrationFor,
  type AlertPhase,
} from "./dropoff-alert-logic";
import { useUi } from "./services";

const FIX_INTERVAL_MS = 5000;
const KEEP_AWAKE_TAG = "stop-alert";

export function DropoffAlert({ option, pack }: { option: JourneyOption; pack: TransitPack }) {
  const { t } = useUi();
  const pins = useMemo(() => buildTripPins(option, pack), [option, pack]);
  const dropoff = pins.dropoff;
  // Alert distances are sized to the final ride so a short ride cannot fire at the boarding stop.
  // Null means the ride is too short for a useful alert. Without a board coordinate, defaults apply.
  const sizing = useMemo(() => {
    if (!pins.dropoff || !pins.finalRideBoard) return { tooShort: false, thresholds: {} };
    const thresholds = thresholdsForRide(aerialMeters(pins.finalRideBoard.point, pins.dropoff.point));
    return thresholds ? { tooShort: false, thresholds } : { tooShort: true, thresholds: {} };
  }, [pins]);
  const [phase, setPhase] = useState<AlertPhase>({ kind: "off" });
  const [explaining, setExplaining] = useState(false);

  const phaseRef = useRef<AlertPhase>(phase);
  const watcherRef = useRef<DropoffWatcher | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  // Bumped whenever a watch is stopped or replaced, so late async results are ignored.
  const runRef = useRef(0);

  const go = useCallback((next: AlertPhase | ((prev: AlertPhase) => AlertPhase)) => {
    const value = typeof next === "function" ? next(phaseRef.current) : next;
    phaseRef.current = value;
    setPhase(value);
  }, []);

  const stopWatch = useCallback(() => {
    runRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const beginWatch = useCallback(async () => {
    if (!dropoff) return;
    stopWatch();
    const run = runRef.current;
    if (!watcherRef.current) {
      const created = createDropoffWatcher({ target: dropoff.point, ...sizing.thresholds });
      if (!created.ok) {
        go({ kind: "unavailable" });
        return;
      }
      watcherRef.current = created.value;
    }
    try {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: FIX_INTERVAL_MS, distanceInterval: 0 },
        (location) => {
          const watcher = watcherRef.current;
          if (runRef.current !== run || !watcher) return;
          const update = watcher.update({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracyMeters: location.coords.accuracy ?? Number.POSITIVE_INFINITY,
            timestampMs: location.timestamp,
          });
          if (update.event) Vibration.vibrate(vibrationFor(update.event));
          go((prev) => phaseAfterUpdate(prev, update));
        },
      );
      if (runRef.current !== run) {
        subscription.remove();
        return;
      }
      subscriptionRef.current = subscription;
    } catch {
      if (runRef.current === run) go({ kind: "unavailable" });
    }
  }, [dropoff, go, sizing, stopWatch]);

  const start = useCallback(async () => {
    go({ kind: "asking" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const servicesEnabled = permission.granted ? await Location.hasServicesEnabledAsync() : false;
      const next = phaseAfterPermission({
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled,
        approximateOnly: permission.android?.accuracy === "coarse",
      });
      go(next);
      if (next.kind === "waiting") await beginWatch();
    } catch {
      go({ kind: "unavailable" });
    }
  }, [beginWatch, go]);

  const stop = useCallback(() => {
    stopWatch();
    Vibration.cancel();
    watcherRef.current = null;
    setExplaining(false);
    go({ kind: "off" });
  }, [go, stopWatch]);

  // No background location: pause when the app leaves the foreground, resume when it returns.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      const current = phaseRef.current;
      if (next !== "active") {
        if (isListening(current)) {
          stopWatch();
          go(phaseOnAppState(current, next));
        }
        return;
      }
      if (current.kind !== "paused") return;
      void (async () => {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          const servicesEnabled = permission.granted ? await Location.hasServicesEnabledAsync() : false;
          const resumed = phaseAfterPermission({
            granted: permission.granted,
            canAskAgain: permission.canAskAgain,
            servicesEnabled,
            approximateOnly: permission.android?.accuracy === "coarse",
          });
          go(resumed);
          if (resumed.kind === "waiting") await beginWatch();
        } catch {
          go({ kind: "unavailable" });
        }
      })();
    });
    return () => subscription.remove();
  }, [beginWatch, go, stopWatch]);

  // The alert pauses when the app leaves the foreground, so the screen is held awake only while listening.
  const screenOn = needsScreenOn(phase);
  useEffect(() => {
    if (!screenOn) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [screenOn]);

  // Leaving the screen ends the alert.
  useEffect(
    () => () => {
      runRef.current += 1;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      Vibration.cancel();
    },
    [],
  );

  if (!dropoff) {
    return (
      <Card>
        <Heading level={2}>{t.alertTitle}</Heading>
        <Small>{t.alertNoDropoff}</Small>
      </Card>
    );
  }

  if (sizing.tooShort) {
    return (
      <Card>
        <Heading level={2}>{t.alertTitle}</Heading>
        <Small>{t.alertTooShort}</Small>
      </Card>
    );
  }

  const text = alertText(phase, dropoff.name, t);
  const active = phase.kind !== "off";
  return (
    <Card>
      <Heading level={2}>{t.alertTitle}</Heading>
      <Body>{t.alertIntro}</Body>
      {dropoff.verification === "unverified" ? <Notice tone="fixture" title={t.alertUnverified} /> : null}
      {text ? (
        <View accessibilityLiveRegion={text.announce ? "assertive" : "polite"}>
          <Notice tone={text.tone} title={text.title}>
            {text.lines.map((line) => (
              <Body key={line}>{line}</Body>
            ))}
          </Notice>
        </View>
      ) : null}
      {explaining && !active ? (
        <>
          <Body>{t.alertExplain}</Body>
          <Body>{t.alertScreenOn}</Body>
        </>
      ) : null}
      {!active && !explaining ? <AppButton label={t.alertStart} onPress={() => setExplaining(true)} /> : null}
      {!active && explaining ? <AppButton label={t.alertAllow} onPress={() => void start()} /> : null}
      {phase.kind === "denied" || phase.kind === "unavailable" || phase.kind === "approximate" ? (
        <AppButton label={t.retry} variant="secondary" onPress={() => void start()} />
      ) : null}
      {needsScreenOn(phase) ? <Small>{t.alertScreenOn}</Small> : null}
      {active ? <AppButton label={t.alertStop} variant="secondary" onPress={stop} /> : null}
      <Small>{t.alertLimits}</Small>
    </Card>
  );
}
