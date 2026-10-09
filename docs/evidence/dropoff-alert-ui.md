# Near-drop-off alert UI (ALERT-003) and optional map (MAP-001): Member 3 record

Status 2026-10-10 04:50 PHT, branch `feat/ui/alert-003`. **Device behaviour: Not Run.** Alert distances are untested proposals until someone walks or rides with a real phone.

## What the alert is (and is not)

A convenience alert from the phone's own location while the app is open. It never tracks a vehicle, never shows an arrival time, and never runs in the background. The user starts it from the journey screen with "Notify me near my stop" after confirming the journey, and "Stop alerts" is always visible while it is on.

- The target is the final ride's alight stop. It is offered **only** when the reviewed release pack (`kind: "release"`) has a verified coordinate for that stop, which today means LRT-1 platforms. Demo or other unverified drop-offs get no alert; the card explains why ("unverified (demo data)").
- Location permission is requested only on that tap, after a plain explanation. Denied or unavailable location leaves the journey fully usable ("Alerts are off: location not allowed").
- Location is read with expo-location (foreground, balanced accuracy, about every 5 s or 10 m). Fixes are passed in memory to the watcher, and are never logged, stored or sent.
- When the watcher reports `approaching`: a banner and one short vibration. On `arrived`: a prominent banner and a longer vibration pattern. Each banner is also visible text and is announced to TalkBack (`AccessibilityInfo.announceForAccessibility`), never vibration alone.
- The watch stops on "Stop alerts", when the journey screen closes, and when the app leaves the foreground ("Alerts paused: app in background", with "Resume alerts").

## Files (Member 3)

| File | Purpose |
|---|---|
| `src/ui/dropoff-alert.ts` | Pure: port types, target selection, state machine, vibration patterns, presenter |
| `src/ui/dropoff-alert-card.tsx` | Journey-screen card: permission, foreground watch, AppState pause, vibration, TalkBack |
| `src/ui/expo-location-watch.ts` | expo-location adapter implementing `LocationWatchPort` |
| `src/ui/services.tsx` | `UiServices.location?` and `UiServices.createDropoffWatcher?` (optional ports) |
| `src/ui/i18n.ts` | Alert copy in English and Filipino |
| `app/journey.tsx` | Shows `<DropoffAlertCard option={option} />` |
| `tests/ui/dropoff-alert.test.ts` | Every state (off, asking, denied, unavailable, no fix, far, approaching, arrived, paused) in both languages, target rules, copy audit |

Until both ports are wired, the card shows "Alerts near your stop are not available in this version of the app", so nothing pretends to work.

## Needs from Member 2 (ALERT-001)

`src/routing/dropoffProximity.ts` → `createDropoffWatcher({ target, radiusMeters?, warnMeters?, minAccuracyMeters?, debounceFixes? })` with `update(fix)` → `{ state, distanceMeters, event? }`, exactly as in the round 4 prompt. The UI's `DropoffWatcherFactory` type mirrors that signature. It had not been pushed to any branch at 04:50. Tests use a local stub.

When Member 2's `tripPins` (ALERT-002) merges, `alertTargetFor` can use its final `alight` pin instead of reading the pack directly. The behaviour is the same: verified pins only.

## Exact change for Member 4 (after Member 2's PR merges)

No new dependency and **no `app.config.ts` change** are needed for the alert. `expo-location` (already installed, 57.0.20) declares `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` in its own Android manifest, and runtime permission is requested from the card. In `src/application/ui-bridge.tsx`:

```ts
import { createDropoffWatcher } from "../routing/dropoffProximity";
import { createExpoLocationWatch } from "../ui/expo-location-watch";
// inside the useMemo<UiServices> object:
    location: createExpoLocationWatch(),
    createDropoffWatcher,
```

This changes runtime sources, so it **needs a rebuild and makes every earlier phone result stale** for release evidence. Coordinate it with the release build rather than after it.

## MAP-001 decision: deferred to roadmap (decided 04:50, ahead of the 05:30 checkpoint)

It cannot be working on a phone by 06:00. It needs a new native dependency, its config plugin, a key decision and a full native rebuild, with only one build machine already busy with release, benchmark and demo APKs. The stored-place journey text stays the main result, and nothing in the core flow depends on a map.

Written request for Member 4, for after the release:
- **Dependency:** MapLibre React Native (`@maplibre/maplibre-react-native`). Pick the exact version against Expo 57 / RN 0.86.3 at install time; v11 requires the new architecture, which Expo 57 uses. Install with `npx expo install`, add its Expo config plugin to `app.config.ts`, then prebuild and do a full native rebuild.
- **Android minimum:** MapLibre documents API 23; our `minSdkVersion` is 24, so that's fine. Build compatibility is unverified until it actually builds.
- **Tiles and key:** Geoapify styles and tiles, with Geoapify and OpenStreetMap (and OpenMapTiles where applicable) attribution on the map, per `docs/evidence/maps-options.md`. Project rule: provider keys stay server-side behind a quota-limited proxy, not in the mobile bundle. If a restricted free key in the bundle is the only option under a deadline, that is **the user's decision**, and the disclosure must say so.
- **Fallbacks:** when offline, with no key, or when tiles fail, the screen shows the journey text only; the map is never required for a core-flow test.

## Manual tests

See `tests/ui/manual.md`, section "ALERT-003 near-drop-off alert". Every device column is **Not Run**.


## Wiring and follow-up fixes (2026-10-10, Member 2's assistant at the user's request)

Done after ALERT-001/002 and this UI merged. Branch `feat/ui/alert-wiring-and-fixes`. **Device behaviour: Not Run.**

- **Wired:** `src/application/ui-bridge.tsx` now passes `location: createExpoLocationWatch()` and `createDropoffWatcher` (the adapter in `src/ui/dropoff-watcher.ts`, which wraps `src/routing/dropoffProximity.ts`). The card no longer shows "not available in this version".
- **Ride-sized distances:** `alertTargetFor` sizes the radius and warning distance to the final ride (`thresholdsForRide`): a quarter and a half of the straight-line ride, clamped to 100..400 m and 200..800 m. A ride under 300 m gets no alert ("too short"). Every adjacent LRT-1 pair is at least 616 m apart, so no LRT-1 ride is excluded. Without a board coordinate the 400/800 defaults apply.
- **Approximate-only location (Android 12+):** `requestPermission` returns `"approximate"` when the user allowed only approximate location; the card says precise location is needed and does not start.
- **Weak GPS:** about 30 s (6 fixes) of consecutive low-accuracy fixes shows a weak-signal message; with an earlier reading showing, the distance is marked possibly out of date.
- **Screen:** `expo-keep-awake` (pinned `57.0.2`, already in the lockfile as a dependency of `expo`; now declared in `package.json`) holds the screen awake only while the alert is watching, because the alert pauses in the background. This costs battery and does not help if the user presses the power button. It is a mitigation, not background alerts.
- **No `app.config.ts` change:** `expo-location` declares the Android location permissions in its own manifest and React Native's template includes VIBRATE; confirm both in the generated manifest after the next prebuild.
- **Tests:** `tests/ui/dropoff-alert-fixes.test.ts` plus the routing tests for `thresholdsForRide` and `finalRideBoard`. Device checks AL-18 to AL-22 are added to `tests/ui/manual.md`, all Not Run.
- A new APK is needed; earlier phone results do not apply to it.
