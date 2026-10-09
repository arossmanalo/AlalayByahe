import type { AppError, Point, Result } from "../contracts/index";
import { aerialMeters } from "../data/geo";

/**
 * Pure proximity logic for the optional "notify me near my stop" alert.
 *
 * This is a convenience alert driven by phone location fixes the caller feeds in. It is NOT vehicle
 * tracking: it knows nothing about the vehicle, the route or arrival times, only how far the phone
 * is from one target point. Aerial distance is used on purpose here (it only decides when to nudge
 * the user) and never to choose a route or a walking path.
 *
 * Thresholds are untested proposals until walked with a real phone; see docs/evidence/dropoff-alert.md.
 */

export type ProximityState = "far" | "approaching" | "arrived";
export type ProximityEvent = "approaching" | "arrived";
export type IgnoredReason = "invalid_fix" | "low_accuracy" | "stale_fix";

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestampMs: number;
}

export interface DropoffWatcherOptions {
  target: Point;
  /** Inside this distance the user counts as arrived. Integer meters. */
  radiusMeters?: number;
  /** Inside this distance the user counts as approaching. Integer meters, at least radiusMeters. */
  warnMeters?: number;
  /** Fixes with a worse (larger) accuracy radius are ignored. */
  minAccuracyMeters?: number;
  /** Consecutive good fixes inside the radius needed before "arrived". At least 1. */
  debounceFixes?: number;
}

export interface ProximityUpdate {
  state: ProximityState;
  /** Whole meters to the target, or null when the fix was ignored before the first accepted one. */
  distanceMeters: number | null;
  /** Set only on the update that crosses a threshold; each event fires once until re-armed. */
  event?: ProximityEvent;
  /** Set when this fix was not used. The state and distance then repeat the last accepted values. */
  ignored?: IgnoredReason;
}

export interface DropoffWatcher {
  update(fix: LocationFix): ProximityUpdate;
  /** Forget everything, for example when the user starts a new journey. */
  reset(): void;
}

export const DEFAULT_RADIUS_METERS = 400;
export const DEFAULT_WARN_METERS = 800;
export const DEFAULT_MIN_ACCURACY_METERS = 100;
export const DEFAULT_DEBOUNCE_FIXES = 2;
/** After the user moves this far beyond warnMeters, the watcher forgets earlier events and re-arms. */
export const REARM_MARGIN_METERS = 200;

const bad = (field: string, message: string): Result<never> => ({
  ok: false,
  error: { code: "INVALID_INPUT", message, retryable: false, detail: { field } } satisfies AppError,
});

const validPoint = (p: Point | undefined): p is Point =>
  !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
  Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

const wholePositive = (n: number): boolean => Number.isInteger(n) && n > 0;

export function createDropoffWatcher(options: DropoffWatcherOptions): Result<DropoffWatcher> {
  const radius = options.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const warn = options.warnMeters ?? DEFAULT_WARN_METERS;
  const minAccuracy = options.minAccuracyMeters ?? DEFAULT_MIN_ACCURACY_METERS;
  const debounce = options.debounceFixes ?? DEFAULT_DEBOUNCE_FIXES;

  if (!validPoint(options.target)) return bad("target", "The drop-off point needs a valid latitude and longitude.");
  if (!wholePositive(radius)) return bad("radiusMeters", "radiusMeters must be a positive whole number of meters.");
  if (!wholePositive(warn) || warn < radius) return bad("warnMeters", "warnMeters must be a whole number of meters, at least radiusMeters.");
  if (!Number.isFinite(minAccuracy) || minAccuracy <= 0) return bad("minAccuracyMeters", "minAccuracyMeters must be positive.");
  if (!wholePositive(debounce)) return bad("debounceFixes", "debounceFixes must be a positive whole number.");

  const target = options.target;
  let state: ProximityState = "far";
  let lastDistance: number | null = null;
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  let insideRadiusRun = 0;
  let approachingSent = false;
  let arrivedSent = false;

  const reset = (): void => {
    state = "far";
    lastDistance = null;
    lastTimestamp = Number.NEGATIVE_INFINITY;
    insideRadiusRun = 0;
    approachingSent = false;
    arrivedSent = false;
  };

  const ignored = (reason: IgnoredReason): ProximityUpdate => ({ state, distanceMeters: lastDistance, ignored: reason });

  const update = (fix: LocationFix): ProximityUpdate => {
    if (
      !fix || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude) ||
      !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters < 0 || !Number.isFinite(fix.timestampMs) ||
      Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180
    ) return ignored("invalid_fix");
    if (fix.accuracyMeters > minAccuracy) return ignored("low_accuracy");
    // A repeated or older timestamp is not new information and must not count toward debounce.
    if (fix.timestampMs <= lastTimestamp) return ignored("stale_fix");
    lastTimestamp = fix.timestampMs;

    const distance = Math.round(aerialMeters({ latitude: fix.latitude, longitude: fix.longitude }, target));
    lastDistance = distance;

    // Re-arm only after the user has clearly left the warning area (hysteresis, so jitter cannot repeat alerts).
    if (distance > warn + REARM_MARGIN_METERS) {
      state = "far";
      insideRadiusRun = 0;
      approachingSent = false;
      arrivedSent = false;
      return { state, distanceMeters: distance };
    }

    let event: ProximityEvent | undefined;

    if (distance <= radius) insideRadiusRun += 1;
    else insideRadiusRun = 0;

    if (arrivedSent) {
      // Arrived is sticky until re-armed, even if GPS drifts back outside the radius.
      state = "arrived";
    } else if (insideRadiusRun >= debounce) {
      state = "arrived";
      arrivedSent = true;
      event = "arrived";
    } else if (distance <= warn) {
      state = "approaching";
      if (!approachingSent) {
        approachingSent = true;
        event = "approaching";
      }
    }
    // Between warn and warn + margin with nothing sent yet: stay in the previous state ("far" at the start).

    return event ? { state, distanceMeters: distance, event } : { state, distanceMeters: distance };
  };

  return { ok: true, value: { update, reset } };
}

/** A final ride shorter than this (straight-line meters) cannot be given a useful alert: it would fire at boarding. */
export const MIN_ALERT_RIDE_METERS = 300;

export interface AlertThresholds { radiusMeters: number; warnMeters: number }

/**
 * Sizes the alert distances to the final ride so a short ride does not trigger at the boarding stop.
 * radius = a quarter of the ride, warn = half of it, clamped to 100..400 m and 200..800 m. The warn
 * distance is always shorter than the ride, so the boarding stop itself is outside it. Returns null
 * when the ride is too short (or the length is not a finite number): offer no alert rather than a bad one.
 * The fractions and clamps are untested proposals until walked with a phone.
 */
export function thresholdsForRide(rideMeters: number): AlertThresholds | null {
  if (!Number.isFinite(rideMeters) || rideMeters < MIN_ALERT_RIDE_METERS) return null;
  const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
  const radiusMeters = clamp(Math.round(rideMeters * 0.25), 100, DEFAULT_RADIUS_METERS);
  const warnMeters = clamp(Math.round(rideMeters * 0.5), 200, DEFAULT_WARN_METERS);
  return { radiusMeters, warnMeters: Math.max(warnMeters, radiusMeters) };
}
