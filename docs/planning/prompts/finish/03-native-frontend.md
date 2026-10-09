# FINISH PROMPT 3: Member 3, Native frontend (UI-006)

You are the AI coding assistant for **Member 3**, owner of `app/` screens (except `app/_layout.tsx`), `src/ui/` and `tests/ui/` in AlalayByahe. Work in Planning Mode first, then execute. Implementation is authorized.

## State of the repository (verify, do not trust)
- Repo: https://github.com/arossmanalo/AlalayByahe, `main` (merge `85ec5a2`). Read `AGENTS.md`, `docs/planning/prompts/03-native-frontend.md` (original spec), `src/ui/README.md`, `docs/evidence/integration.md`, `docs/evidence/builds.md`.
- `npm ci`, `npm run typecheck`, `npm test` (387 pass at writing; 5 UI test files in `tests/ui/`).
- Your UI is integrated: Member 4's `src/application/ui-bridge.tsx` mounts `UiProvider` with real `UiServices` (kind `"real"`). Screens: text/manual entry, editable confirmation, grounded options and step instructions, model setup/offline/recovery, manual onboard replan.
- **No physical UX test has been run.** No phone has installed the app; ADB showed no devices. The Android test APK exists at source `34236a5` but is stale and Member 4 rebuilds it.
- There is **no release transit pack**, so on a real build journeys currently show "data unavailable". Member 2 and Member 4 are producing the pack. Do not build a fake pack into the app; fixtures appear only in tests and the DEV FIXTURE banner.

## Remaining task: UI-006 verify native UX and integrate real adapters
Depends on: INT-003/005 (Member 4's build), AI-006 (Member 1) and ROUTE-006 (Member 2). Work in parallel where you can.

## Do this
1. **Install and run on a real phone** with Member 4's APK (Android `adb install -r`; iPhone only after Member 4's Mac build). Cold launch without Metro/Expo Go.
2. **Walk every flow on the device** and record Pass/Fail/Not Run with screenshots (no personal data): first launch, model setup (progress, cancel, retry, offline failure), AI-not-ready fallback to manual search (clearly labelled "AI unavailable"), text query to editable confirmation (origin, destination, preferences; no routing before confirmation; ambiguous or swapped places need clarification), results (known vs unknown fare, **partial subtotal never shown as a total**, transfers, headsign and direction warning, walking meters), strict-preference failure with the "change preferences" prompt, `SEARCH_LIMIT_REACHED` copy, onboard replan (manual confirmation of service, direction and next stop; no tracking claim), cancel, background and return, rotate, long text, offline state.
3. **Accessibility:** screen reader labels (TalkBack on Android; VoiceOver on iPhone), 48 dp minimum touch targets, text scaling up to 200%, contrast (WCAG AA), no color-only status, keyboard/IME behaviour, safe areas. Fix defects in `src/ui/` and `app/` only.
4. **Copy audit:** check every user-facing string against the edge-case copy in `docs/planning/05-edge-case-matrix.md`. Never imply live arrivals, fastest travel, or verified coverage that does not exist. State actual coverage from the pack's `coverageLabels` on the results screen. Filipino and English strings should both read naturally.
5. **Coverage display.** Once Member 2's verified pack is bundled, make sure unsupported corridors show "No verified complete journey available." and the supported subset is stated plainly (likely LRT-1 stations only).
6. Add or update tests in `tests/ui/` for any logic you change (pure Node tests). Mocked screens never prove device behaviour.
7. **Reviewer duty (if asked):** Member 2's LRT-1 transcription needs a second registered teammate; if the user names you, follow `docs/evidence/unblock-kit.md` section A and report your name, date and cells checked.
8. Update `src/ui/README.md` status and the UI rows in `docs/planning/04-team-execution.md` with actual results.

## Rules
- UI calls the contract ports through `UiServices` only; no direct model, SQLite, file or network code in `app/` or `src/ui/`.
- Do not edit `app/_layout.tsx`, contracts, dependencies or `app.config.ts`; propose to Member 4.
- Do not display model-generated routes, fares or instructions. Do not log personal queries.
- Git: branch `feat/ui/ui-006` from `main`, small commits, push, open a PR to `main`; Member 4 merges. Verify the remote SHA.

## Report format
Tasks and IDs; files; devices, OS, build commit and pack version used; per-flow Pass/Fail/Not Run with evidence; accessibility findings and fixes; remaining defects; remote SHA.
