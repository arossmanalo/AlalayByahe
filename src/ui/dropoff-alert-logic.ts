// Member 3 (ALERT-003): pure state and copy logic for the optional stop alert. No React or native imports.
// The alert is a reminder driven by the phone's own location while the app is open. It is not vehicle
// tracking and never states an arrival time. Distances are straight-line and approximate.
import type { ProximityEvent, ProximityState, ProximityUpdate } from "../routing/dropoffProximity";
import type { Strings } from "./i18n";
import type { Tone } from "./theme";

export type AlertPhase =
  | { kind: "off" }
  | { kind: "asking" }
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "unavailable" }
  | { kind: "waiting" }
  | { kind: "watching"; state: ProximityState; distanceMeters: number }
  | { kind: "paused" };

export interface PermissionOutcome {
  granted: boolean;
  canAskAgain: boolean;
  servicesEnabled: boolean;
}

/** After the system permission answer. Denied or unavailable location never blocks the journey itself. */
export function phaseAfterPermission(outcome: PermissionOutcome): AlertPhase {
  if (!outcome.granted) return { kind: "denied", canAskAgain: outcome.canAskAgain };
  if (!outcome.servicesEnabled) return { kind: "unavailable" };
  return { kind: "waiting" };
}

export function isListening(phase: AlertPhase): boolean {
  return phase.kind === "waiting" || phase.kind === "watching";
}

/** Only a listening phase reacts to proximity updates; an ignored fix leaves the last good reading. */
export function phaseAfterUpdate(prev: AlertPhase, update: ProximityUpdate): AlertPhase {
  if (!isListening(prev)) return prev;
  if (update.distanceMeters === null) return { kind: "waiting" };
  return { kind: "watching", state: update.state, distanceMeters: update.distanceMeters };
}

/** Background pauses a listening alert (no background location); returning resumes it from "waiting". */
export function phaseOnAppState(prev: AlertPhase, appState: string): AlertPhase {
  if (appState === "active") return prev.kind === "paused" ? { kind: "waiting" } : prev;
  return isListening(prev) ? { kind: "paused" } : prev;
}

export const VIBRATION_APPROACHING: number[] = [0, 400];
export const VIBRATION_ARRIVED: number[] = [0, 600, 250, 600, 250, 900];

export function vibrationFor(event: ProximityEvent): number[] {
  return event === "arrived" ? [...VIBRATION_ARRIVED] : [...VIBRATION_APPROACHING];
}

export interface AlertText {
  tone: Tone;
  title: string;
  lines: string[];
  /** Approaching and arrived changes are announced assertively to screen readers. */
  announce: boolean;
}

/** The visible, TalkBack-readable message for a phase. Vibration is never the only signal. */
export function alertText(phase: AlertPhase, place: string, t: Strings): AlertText | null {
  switch (phase.kind) {
    case "off":
      return null;
    case "asking":
      return { tone: "info", title: t.alertAsking, lines: [], announce: false };
    case "denied":
      return {
        tone: "warning",
        title: t.alertDenied,
        lines: phase.canAskAgain ? [] : [t.alertDeniedSettings],
        announce: false,
      };
    case "unavailable":
      return { tone: "warning", title: t.alertUnavailable, lines: [], announce: false };
    case "waiting":
      return { tone: "info", title: t.alertWaiting, lines: [], announce: false };
    case "paused":
      return { tone: "warning", title: t.alertPaused, lines: [], announce: false };
    case "watching": {
      const distance = t.alertDistance(phase.distanceMeters);
      if (phase.state === "arrived") return { tone: "success", title: t.alertArrived(place), lines: [distance], announce: true };
      if (phase.state === "approaching") return { tone: "warning", title: t.alertApproaching(place), lines: [distance], announce: true };
      return { tone: "info", title: t.alertFar(place), lines: [distance], announce: false };
    }
  }
}
