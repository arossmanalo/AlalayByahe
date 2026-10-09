// ALERT-003 preview: a SIMULATED walk toward the drop-off so the alert (banner, vibration, TalkBack
// announcement) can be tried at a desk. It feeds the same watcher, state machine and vibration code as
// real GPS fixes, but the positions are invented. It proves nothing about real GPS, accuracy or timing,
// and must never be reported as location evidence. Pure: no React or native imports.
import type { LocationFix, LocationWatchPort } from "./dropoff-alert";
import type { AlertTarget } from "./dropoff-alert";

const METERS_PER_DEGREE_LATITUDE = 111_195;
const DEFAULT_WARN_METERS = 800;
const DEFAULT_RADIUS_METERS = 400;

export interface PreviewOptions {
  /** Time between simulated fixes. */
  intervalMs?: number;
  /** Number of simulated fixes (at least 10 so far, approaching and arrived all appear). */
  steps?: number;
  /** Test hook: schedule a callback and return a canceller. Defaults to setTimeout. */
  schedule?: (callback: () => void, delayMs: number) => () => void;
}

/**
 * Straight-line approach from twice the warning distance down to a third of the arrival radius,
 * due north of the target, with good accuracy and increasing timestamps.
 */
export function previewFixes(target: AlertTarget, steps = 16, intervalMs = 1500, startMs = 1): LocationFix[] {
  const n = Math.max(10, Math.floor(steps));
  const warn = target.thresholds?.warnMeters ?? DEFAULT_WARN_METERS;
  const radius = target.thresholds?.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const from = warn * 2;
  const to = radius / 3;
  return Array.from({ length: n }, (_, i) => {
    const distance = from + ((to - from) * i) / (n - 1);
    return {
      latitude: target.point.latitude + distance / METERS_PER_DEGREE_LATITUDE,
      longitude: target.point.longitude,
      accuracyMeters: 10,
      timestampMs: startMs + i * intervalMs,
    };
  });
}

const defaultSchedule = (callback: () => void, delayMs: number): (() => void) => {
  const id = setTimeout(callback, delayMs);
  return () => clearTimeout(id);
};

/** A location port that replays the simulated approach instead of reading the phone's GPS. */
export function createPreviewWatch(target: AlertTarget, options: PreviewOptions = {}): LocationWatchPort {
  const intervalMs = options.intervalMs ?? 1500;
  const schedule = options.schedule ?? defaultSchedule;
  return {
    async requestPermission() {
      return "granted";
    },
    async watch(onFix) {
      const fixes = previewFixes(target, options.steps, intervalMs);
      const cancels: (() => void)[] = [];
      fixes.forEach((fix, i) => cancels.push(schedule(() => onFix(fix), (i + 1) * intervalMs)));
      return { stop: () => cancels.forEach((cancel) => cancel()) };
    },
  };
}
