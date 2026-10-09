# ROUND 4 PROMPT B: Member 3, near-drop-off alert screen and optional live map (ALERT-003, MAP-001)

You are the AI coding assistant for **Member 3** (`app/` screens except `app/_layout.tsx`, `src/ui/`, `tests/ui/`). Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md`, `AGENTS.md` and `docs/evidence/maps-options.md` first; they are part of this prompt. Branch from the latest `main`; small commits; push; open a PR; Member 4 merges. Check the clock: release gate 06:00, hard stop 10:00 PHT. **Do the alert first; the map is a stretch.**

## Needs from others
- **Member 2** supplies pure modules `src/routing/dropoffProximity.ts` (`createDropoffWatcher`) and `src/routing/tripPins.ts` (pins, leg polylines). Code against the signatures in `docs/evidence/dropoff-alert.md`; until they merge, use a local stub in tests.
- **Member 4** owns dependencies, `app.config.ts`, native projects, the Geoapify key decision and the rebuild. You send them the exact change; you do not edit those.

## Hard rules
- It is a **convenience alert, not vehicle tracking**. Copy says things like "You are near Vito Cruz station" and "Alerts need your phone's location while the app is open". Never "we are tracking your ride", "arriving now", "live", or any arrival time. The user starts the alert after confirming the journey, and a "Stop alerts" button is always visible.
- Foreground only for now. No background location, no push notifications, no new notification library.
- Ask for location permission **only** when the user taps "Notify me near my stop", after a plain explanation. Denied or unavailable location must leave the journey fully usable ("Alerts are off: location not allowed"). Location data stays on the phone, is not logged or stored, and is never sent anywhere.
- Vibration uses React Native's built-in `Vibration` (no new dependency). `expo-location` is already installed. The UI talks to ports through `UiServices` only; no raw SQLite, model or network code in `app/` or `src/ui/`.
- Only verified pins (LRT-1 stations) look verified. A pin flagged `unverified` shows an "Unverified (demo data)" label, and the demo-build banner stays. Never show a model-generated place or route.
- Accessibility: the alert must also be visible text and announced to TalkBack, not vibration alone, since vibration may be off or unsupported.

## Do this
1. **ALERT-003 alert flow.** On the results/journey screen, add "Notify me near my stop" for the final drop-off. Flow: explain, request permission, start a foreground location watch (balanced accuracy, 5 to 10 s interval), feed fixes to `createDropoffWatcher`. On `approaching`, show a banner and one short vibration. On `arrived`, show a prominent banner and a longer vibration pattern, then offer "Stop alerts". Stop the watch on stop, on journey cancel and when the app goes to the background ("Alerts paused: app in background"). Put pure presenter functions in `src/ui/` with tests for every state: off, asking, denied, no GPS fix, far, approaching, arrived, paused.
2. **Honest copy audit.** Re-run your copy checks so no new text implies tracking, live data or speed.
3. **MAP-001 (stretch).** Decide at 05:30; if it is not working on the phone by 06:00, drop it and record it as roadmap. Optional "Show on map" screen using `tripPins` output: pins for board, transfer and drop-off, the approximate leg lines, and the user's position if permission was granted. Tiles come from Geoapify through MapLibre React Native per `maps-options.md`, with Geoapify and OpenStreetMap attribution on the map. The **stored-place journey text remains the main result** and the fallback when offline, when there is no key, or when tiles fail. The map must never delay the core journey and is not required for any core-flow test. Send Member 4 in writing: the dependency (MapLibre React Native), its config plugin, the Android minimum, and the key handling. The project rule says provider keys belong in server secrets, not the mobile bundle; if a restricted free key in the bundle is the only option under the deadline, the user must decide and the disclosure must say so. Say that the change needs a rebuild and makes earlier phone results stale. Do not install or edit these yourself.
4. **Manual tests** in `tests/ui/manual.md` (device columns stay **Not Run** until witnessed): permission denied, permission granted then revoked, airplane mode, indoor GPS, vibration disabled, TalkBack, 200% text, background and return, stop alerts, and a mock-location walk if available. State plainly that alert distances are **untested** until walked with a real phone.
5. Update `src/ui/README.md` and the UI rows of `docs/planning/04-team-execution.md` with actual status only. Run `npm run typecheck` and `npm test`.

## Report
Task IDs; files; exact commands and results; what needs Member 4 (exact dependency and config change); Pass/Fail/Not Run per manual test; map decision at 05:30; remote SHA.
