# ROUND 4 PROMPT A: Member 2, drop-off proximity logic and pin data (ALERT-001, ALERT-002)

You are the AI coding assistant for **Member 2** (`src/data/`, `src/routing/`, `assets/data/`, `tests/routing/`). Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md`, `AGENTS.md` and `docs/evidence/maps-options.md` first; they are part of this prompt. Branch from the latest `main`; small commits; push; open a PR; Member 4 merges. Check the clock: release gate 06:00, hard stop 10:00 PHT.

## Goal
Member 3 is adding a "Notify me near my stop" feature (vibration plus an on-screen alert while the app is open) and an optional map with pins. You supply the **pure logic and data** they call. No React, no native APIs, no new dependencies.

## Hard rules
- This is a convenience alert, **not vehicle tracking**. Never claim automatic tracking, live arrivals or that the user is "on" a vehicle. The user starts the alert after confirming their journey.
- Only drop-offs with coordinates in the **verified release pack** get a verified pin and an alert (LRT-1 stations). Draft road drop-offs (demo pack) are unverified: return them only with an `unverified` flag so the UI can label them, never as verified.
- Do not change contracts, `package.json` or the frozen `assets/data/release.json`. If a new exported type is needed, add it in `src/routing/` and tell Member 4.
- Units: integer meters. Stable IDs. Structured errors, no thrown strings.

## Do this
1. **ALERT-001 `src/routing/dropoffProximity.ts` (pure).** `createDropoffWatcher({ target, radiusMeters = 400, warnMeters = 800, minAccuracyMeters = 100, debounceFixes = 2 })` with `update(fix: { latitude, longitude, accuracyMeters, timestampMs })` returning `{ state, distanceMeters, event? }`. States: `far`, `approaching` (inside `warnMeters`), `arrived` (inside `radiusMeters`). Emit each event (`approaching`, `arrived`) **once**. Ignore fixes with accuracy worse than `minAccuracyMeters`, non-finite values, or timestamps older than the last fix. Require `debounceFixes` consecutive fixes before `arrived`, so one GPS jump cannot fire it. Re-arm only after the user moves more than 200 m beyond `warnMeters`; document this. Use the existing haversine in `src/data/geo.ts`.
2. **ALERT-002 `src/routing/tripPins.ts` (pure).** From a `RouteResult` plus the `TransitPack`, return `{ legs: [{ legId, mode, polyline }], pins: [{ id, kind: "board" | "alight" | "transfer", placeId, name, point, verification: "verified" | "unverified" }], bounds }`, built only from stop coordinates in the pack. A leg line is a straight line between its stops, labelled `approximate`; never claim it is the road path. The final `alight` pin is the default alert target. A missing coordinate yields no pin plus a `missingCoordinate` note, never a guessed point.
3. **Tests** in `tests/routing/`: approach and arrive once, jitter near the radius, bad accuracy, out-of-order timestamps, re-arm, NaN, and pins for Vito Cruz to Baclaran, Taft to Vito Cruz both ways, and a demo-pack journey flagged `unverified`.
4. **Docs.** `docs/evidence/dropoff-alert.md`: thresholds and why (state they are **untested proposals** until walked with a phone), the limits (foreground only, poor GPS indoors or underground, battery use) and the exact functions Member 3 should call.
5. Run `npm run typecheck`, `npm test`, `npm run data:validate`. Report real results.

## Report
Task IDs; files; exact commands and results; exported function signatures for Member 3; open gaps; remote SHA.
