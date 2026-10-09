# NEXT PROMPT 3: Member 3, Native frontend (UI-006 device verification)

You are the AI coding assistant for **Member 3**, owner of `app/` screens (except `app/_layout.tsx`), `src/ui/` and `tests/ui/`. Plan first, then execute. Implementation is authorized.

## State of `main` (verify, do not trust)
- Repo https://github.com/arossmanalo/AlalayByahe, `main` at merge `8ae8c16` or later. `git switch main && git pull && npm ci`, `npm run typecheck` (clean), `npm test` (442 pass).
- Your UI-006 branch is **merged** (PR #5): coverage on every results outcome, copy audit, accessibility fixes, EC-102 cancel feedback, contrast tests. Your `src/ui/README.md` status and `tests/ui/manual.md` list every check and its status.
- **The app now bundles a real pack:** LRT-1 stations only (25 stations, stored value fares, no walking links, no road services; version `lrt1_2026_10_10_1`). So on a real build the supported journeys are station to station. Everything else must end in "No verified complete journey available." with the coverage stated. Expect the results screen's "Supported coverage" to read the pack's coverage label.
- **Nothing has run on a phone.** Your fixture web-preview run is layout evidence only. All Android and iPhone columns in `tests/ui/manual.md` are Not Run. `release:check` is blocked by no Android evidence, no iOS evidence and a stale Android artifact.

## What you need first
A freshly built **Android release APK from current `main`** from Member 4 (file name, source commit, SHA-256), and a phone with USB debugging (`adb install -r`). Ask Member 4. For iPhone you need Member 4's Mac build. Do not build native code yourself or edit `app.config.ts`.

## Do this
1. Install and cold launch with no Metro and no Expo Go. Record device, OS, font scale, build commit, artifact hash and pack version.
2. **Walk every flow on the device** (D-01 to D-14 and M-01 to M-23 in `tests/ui/manual.md`). Use real journeys on the real pack:
   - Vito Cruz to Baclaran: one ride, "Fare: PHP 21.00 (verified)" or equivalent, headsign "Dr. Santos", no walking.
   - Taft (alias) to Vito Cruz and back: P20, opposite directions.
   - Pedro Gil to Vito Cruz as a student: the regular fare shown as an **estimate** with the basis text; P19.
   - Lipa to Candelaria: unsupported with the coverage subset stated; never a made-up route.
   - Onboard: confirm the service, direction and next stop manually; the "Plan" action stays hidden until confirmed; no tracking claim.
   - Model setup: progress, cancel, retry, offline failure; AI-unavailable fallback to manual planning.
   - Cancel, background and return ("Cancelled. You can try again."), long text over 600 characters, rotation, small screen with keyboard open.
3. **Accessibility on hardware:** TalkBack (Android) and VoiceOver (iPhone): headings, buttons, radio groups and state announced; text scaling to 200% with no clipped boarding or drop-off text; 48 dp targets; contrast outdoors; safe areas; IME behaviour.
4. Fix defects you find in `app/` and `src/ui/` only, with pure tests where logic changes. Do not display model-generated routes, fares or instructions.
5. Decide, with evidence from the phone, the proposals you raised to Member 4 (`orientation` portrait lock, `userInterfaceStyle: "automatic"` vs a light-only palette, English-only engine text). State which are real defects on a device. Do not edit `app.config.ts`; send Member 4 the exact change.
6. Be present when Member 2 compares the rendered instructions and fares with the LRMC matrix (ROUTE-006); give them screenshots with no personal data.
7. Update `src/ui/README.md`, `tests/ui/manual.md` and the UI rows of `docs/planning/04-team-execution.md` with actual Pass/Fail/Not Run, never anticipated results.

## Rules
- UI talks to contract ports through `UiServices` only; no direct model, SQLite, file or network code in `app/` or `src/ui/`.
- Never imply live arrivals, fastest travel, guaranteed availability or coverage beyond the pack's labels.
- Do not edit `app/_layout.tsx`, contracts, dependencies or `app.config.ts`.
- Git: branch `feat/ui/ui-006-device` from `main`, small commits, push, open a PR to `main`; Member 4 merges. Verify the remote SHA.

## Report format
Tasks and IDs; devices, OS, build commit, artifact SHA-256, pack version; per-flow Pass/Fail/Not Run with screenshots; accessibility findings and fixes; remaining defects with owner; remote SHA.
