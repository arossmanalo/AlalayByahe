// Member 3 (ALERT-003): near-drop-off alert, pure logic. A convenience alert from the
// phone's own location while the app is open; it never tracks a vehicle, never
// predicts an arrival time and runs in the foreground only. No React or native code.
import type { JourneyOption, Point, Result, RideLeg, TransitPack } from "../contracts";
import { aerialMeters } from "../data/geo";
import { thresholdsForRide, type AlertThresholds } from "../routing/dropoffProximity";
import type { Strings } from "./i18n";
import type { Tone } from "./theme";

// ---- Ports (supplied through UiServices; see docs/evidence/dropoff-alert-ui.md) ----

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestampMs: number;
}

/** "approximate": Android 12+ user allowed only approximate location, too coarse for this alert. */
export type PermissionOutcome = "granted" | "denied" | "unavailable" | "approximate";

/** Foreground location only. Fixes stay in memory on the phone; never logged, stored or sent. */
export interface LocationWatchPort {
  requestPermission(): Promise<PermissionOutcome>;
  watch(onFix: (fix: LocationFix) => void, onError: () => void): Promise<{ stop(): void }>;
}

export type WatcherState = "far" | "approaching" | "arrived";

/** Structural match for Member 2's `createDropoffWatcher` (src/routing/dropoffProximity.ts, ALERT-001). */
export interface DropoffWatcher {
  /** An ignored fix (`ignored` says why) repeats the last accepted state and distance. */
  update(fix: LocationFix): {
    state: WatcherState;
    /** null when the fix was ignored before any accepted fix. */
    distanceMeters: number | null;
    event?: "approaching" | "arrived";
    ignored?: "invalid_fix" | "low_accuracy" | "stale_fix";
  };
}

export type DropoffWatcherFactory = (options: {
  target: Point;
  radiusMeters?: number;
  warnMeters?: number;
  minAccuracyMeters?: number;
  debounceFixes?: number;
}) => Result<DropoffWatcher>;

// ---- Alert target: the final drop-off stop ----

export interface AlertTarget {
  stopId: string;
  name: string;
  point: Point;
  /** Distances sized to the final ride; undefined means the watcher defaults apply (board point unknown). */
  thresholds?: AlertThresholds;
}

export type TargetResult =
  | { ok: true; target: AlertTarget }
  | { ok: false; reason: "no_ride" | "no_coordinate" | "unverified" | "too_short" };

function finiteCoordinate(p: Point | undefined): p is Point {
  return !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 && !(p.latitude === 0 && p.longitude === 0);
}

/**
 * Final alight stop of the journey, only when the reviewed release pack documents its
 * coordinates. Demo or other unverified data never gets an alert (Member 2's rule).
 * Replace with Member 2's tripPins final `alight` pin once ALERT-002 merges.
 */
export function alertTargetFor(option: JourneyOption, pack: TransitPack | null): TargetResult {
  const rides = option.legs.filter((leg): leg is RideLeg => leg.kind === "ride");
  const last = rides[rides.length - 1];
  if (!last) return { ok: false, reason: "no_ride" };
  const stop = pack?.stops.find((s) => s.id === last.alightStopId);
  if (!stop || !finiteCoordinate(stop.point)) return { ok: false, reason: "no_coordinate" };
  if (pack?.kind !== "release" || stop.evidence.reliability !== "verified") return { ok: false, reason: "unverified" };
  // Size the alert to the final ride so a short ride cannot fire at the boarding stop.
  const board = pack.stops.find((x) => x.id === last.boardStopId);
  if (board && finiteCoordinate(board.point)) {
    const thresholds = thresholdsForRide(aerialMeters(board.point, stop.point));
    if (!thresholds) return { ok: false, reason: "too_short" };
    return { ok: true, target: { stopId: stop.id, name: last.alightLabel, point: stop.point, thresholds } };
  }
  return { ok: true, target: { stopId: stop.id, name: last.alightLabel, point: stop.point } };
}

// ---- Alert status (state machine) ----

export type AlertStatus =
  | { phase: "off" }
  | { phase: "asking" }
  | { phase: "denied" }
  | { phase: "unavailable" }
  | { phase: "approximate" }
  | { phase: "waiting_fix" }
  | { phase: "far"; distanceMeters: number }
  | { phase: "approaching"; distanceMeters: number }
  | { phase: "arrived"; distanceMeters: number }
  | { phase: "paused" };

export type AlertEvent =
  | { type: "start" }
  | { type: "permission"; outcome: PermissionOutcome }
  | { type: "watch_failed" }
  | { type: "reading"; state: WatcherState; distanceMeters: number | null }
  | { type: "background" }
  | { type: "stop" };

export function nextAlertStatus(status: AlertStatus, event: AlertEvent): AlertStatus {
  switch (event.type) {
    case "start":
      return { phase: "asking" };
    case "permission":
      if (status.phase !== "asking") return status;
      return event.outcome === "granted" ? { phase: "waiting_fix" } : { phase: event.outcome };
    case "watch_failed":
      return status.phase === "off" ? status : { phase: "unavailable" };
    case "reading":
      // A fix the watcher ignored (poor accuracy, stale) has no usable distance: keep the last status.
      if (!isWatching(status) || event.distanceMeters === null || !Number.isFinite(event.distanceMeters)) return status;
      return { phase: event.state, distanceMeters: Math.max(0, Math.round(event.distanceMeters)) };
    case "background":
      return isWatching(status) || status.phase === "asking" ? { phase: "paused" } : status;
    case "stop":
      return { phase: "off" };
  }
}

export function isWatching(status: AlertStatus): boolean {
  return ["waiting_fix", "far", "approaching", "arrived"].includes(status.phase);
}

/** Vibration only on the watcher's one-time events; patterns in ms for React Native Vibration. */
export function vibrationFor(event: "approaching" | "arrived" | undefined): number[] | null {
  if (event === "approaching") return [0, 400];
  if (event === "arrived") return [0, 700, 300, 700, 300, 900];
  return null;
}

// ---- Weak GPS signal ----

/** About 30 s of consecutive fixes that are too imprecise (at the 5 s fix interval). */
export const WEAK_SIGNAL_FIXES = 6;

/** Low-accuracy fixes accumulate; a usable fix resets; other ignored fixes change nothing. */
export function nextWeakCount(count: number, ignored: "invalid_fix" | "low_accuracy" | "stale_fix" | undefined): number {
  if (ignored === "low_accuracy") return count + 1;
  return ignored ? count : 0;
}

export function isWeakSignal(count: number): boolean {
  return count >= WEAK_SIGNAL_FIXES;
}

// ---- Presenter ----

export interface AlertView {
  tone: Tone;
  title: string;
  body: string | null;
  primary: { label: string; action: "start" | "stop" | "resume" } | null;
  /** "Stop alerts" stays visible whenever location is in use or an alert is showing. */
  showStop: boolean;
  /** Spoken to TalkBack when it changes; alerts are never vibration-only. */
  announce: string | null;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function presentAlert(status: AlertStatus, targetName: string, t: Strings): AlertView {
  const stopOnly = { primary: null, showStop: true };
  switch (status.phase) {
    case "off":
      return { tone: "info", title: t.alertTitle, body: t.alertExplain(targetName), primary: { label: t.alertStart, action: "start" }, showStop: false, announce: null };
    case "asking":
      return { tone: "info", title: t.alertTitle, body: t.alertAsking, ...stopOnly, announce: t.alertAsking };
    case "denied":
      return { tone: "warning", title: t.alertDenied, body: t.alertJourneyStillWorks, primary: { label: t.alertStart, action: "start" }, showStop: false, announce: t.alertDenied };
    case "unavailable":
      return { tone: "warning", title: t.alertUnavailable, body: t.alertJourneyStillWorks, primary: { label: t.alertStart, action: "start" }, showStop: false, announce: t.alertUnavailable };
    case "approximate":
      return { tone: "warning", title: t.alertApproximate, body: t.alertApproximateHelp, primary: { label: t.alertStart, action: "start" }, showStop: false, announce: t.alertApproximate };
    case "waiting_fix":
      return { tone: "info", title: t.alertOn, body: t.alertNoFix, ...stopOnly, announce: t.alertOn };
    case "far":
      return { tone: "info", title: t.alertOn, body: t.alertFar(formatDistance(status.distanceMeters), targetName), ...stopOnly, announce: null };
    case "approaching":
      return { tone: "warning", title: t.alertApproaching(targetName), body: t.alertApproachingBody, ...stopOnly, announce: t.alertApproaching(targetName) };
    case "arrived":
      return { tone: "danger", title: t.alertArrived(targetName), body: t.alertArrivedBody, ...stopOnly, announce: t.alertArrived(targetName) };
    case "paused":
      return { tone: "warning", title: t.alertPaused, body: t.alertPausedBody, primary: { label: t.alertResume, action: "resume" }, showStop: true, announce: t.alertPaused };
  }
}

export function presentNoTarget(reason: Exclude<TargetResult, { ok: true }>["reason"], t: Strings): AlertView {
  const body = reason === "too_short" ? t.alertNoTargetShort : reason === "unverified" ? t.alertNoTargetUnverified : reason === "no_coordinate" ? t.alertNoTargetCoordinate : t.alertNoTargetRide;
  return { tone: "neutral", title: t.alertTitle, body, primary: null, showStop: false, announce: null };
}
