// Member 3 (ALERT-003): optional "Notify me near my stop" card for the journey detail screen.
// A reminder from the phone's own location while the app is open. It is not vehicle tracking, never
// states an arrival time, and never blocks the journey. Location is read only after the user taps,
// stays in memory, and is never stored, logged or sent anywhere.
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Vibration, View } from "react-native";
import type { JourneyOption, TransitPack } from "../contracts";
import { createDropoffWatcher, type DropoffWatcher } from "../routing/dropoffProximity";
import { buildTripPins } from "../routing/tripPins";
import { AppButton, Body, Card, Heading, Notice, Small } from "./components/primitives";
import {
  alertText,
  isListening,
  phaseAfterPermission,
  phaseAfterUpdate,
  phaseOnAppState,
  vibrationFor,
  type AlertPhase,
} from "./dropoff-alert-logic";
import { useUi } from "./services";

const FIX_INTERVAL_MS = 5000;

export function DropoffAlert({ option, pack }: { option: JourneyOption; pack: TransitPack }) {
  const { t } = useUi();
  const dropoff = useMemo(() => buildTripPins(option, pack).dropoff, [option, pack]);
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
      const created = createDropoffWatcher({ target: dropoff.point });
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
  }, [dropoff, go, stopWatch]);

  const start = useCallback(async () => {
    go({ kind: "asking" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const servicesEnabled = permission.granted ? await Location.hasServicesEnabledAsync() : false;
      const next = phaseAfterPermission({
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled,
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
      {explaining && !active ? <Body>{t.alertExplain}</Body> : null}
      {!active && !explaining ? <AppButton label={t.alertStart} onPress={() => setExplaining(true)} /> : null}
      {!active && explaining ? <AppButton label={t.alertAllow} onPress={() => void start()} /> : null}
      {phase.kind === "denied" || phase.kind === "unavailable" ? (
        <AppButton label={t.retry} variant="secondary" onPress={() => void start()} />
      ) : null}
      {active ? <AppButton label={t.alertStop} variant="secondary" onPress={stop} /> : null}
      <Small>{t.alertLimits}</Small>
    </Card>
  );
}
