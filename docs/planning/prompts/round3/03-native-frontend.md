# ROUND 3 PROMPT 3: Member 3, Native frontend (UI-006 device verification)

You are the AI coding assistant for **Member 3**, owner of `app/` screens (except `app/_layout.tsx`), `src/ui/` and `tests/ui/`. Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md` first; it is part of this prompt.

## Where you are
UI-006's code changes are merged (PRs #5 and #10): coverage on every results outcome, copy audit, accessibility fixes, honest "(verified)" / "(estimated)" totals, coverage hint for unmatched places, "Stay on your current vehicle" for onboard rides. `tests/ui/real-pack-ui.test.ts` runs your journeys on the real pack in software. **Every device column in `tests/ui/manual.md` is Not Run.** Your workstation has no `adb`, and the phone you used was in file-transfer mode only. `app.config.ts` now has `userInterfaceStyle: "light"`; orientation stays portrait. The iPhone column is out of scope.

## You need
- A phone with **USB debugging** and Android platform-tools (install them, or use Member 1's connected Honor X9b with them), and from Member 4 the **release APK** (and, for step 3, the **demo APK**) with file name, source commit and SHA-256. Check the hash, then `adb install -r`.

## Do this
1. **Walk every flow on the release APK** with the real LRT-1 pack: `D-01` to `D-14` and `M-01` to `M-23` in `tests/ui/manual.md`, plus `R-01` to `R-05` (Vito Cruz to Baclaran; Taft to Vito Cruz both ways; Pedro Gil to Vito Cruz as a student shows "(estimated)"; Lipa to Candelaria shows no stored place and the supported coverage, never a route; onboard "Stay on your current vehicle"). Record device, OS, font scale, build commit, artifact hash and pack version, with screenshots that contain no personal data.
2. **Accessibility on hardware:** TalkBack, 200% text scale, 48 dp targets, contrast outdoors, keyboard and IME, safe areas, and the now light-only status bar and keyboard in system dark mode (confirm `light` fixed it).
3. **Demo APK checks (separate section, never mixed with release results):** the test-pack banner ("This transit data is a test fixture, not real transport information.") shows on every screen; search finds Baguio, Legazpi, Laoag; a Laoag to Legazpi journey and the three-jeepney Lipa to Candelaria journey render with their fare statuses; the About screen says so. Record these under a "Demo build" heading in `tests/ui/manual.md`.
4. Fix defects in `app/` and `src/ui/` only, with pure tests where logic changes. Do not display model-generated routes, fares or instructions.
5. Be present when Member 2 compares the rendered fares and instructions with the LRMC matrix (ROUTE-006); give them the screenshots.
6. Update `src/ui/README.md`, `tests/ui/manual.md` and the UI rows of `docs/planning/04-team-execution.md` with actual Pass/Fail/Not Run only.

## Rules
- UI talks to the contract ports through `UiServices` only; no direct model, SQLite, file or network code in `app/` or `src/ui/`.
- Never imply live arrivals, fastest travel or coverage beyond the pack's labels. Do not edit `app/_layout.tsx`, contracts, dependencies or `app.config.ts`; send Member 4 the exact change.

## Report
Tasks and IDs; devices, OS, build commit, artifact SHA-256, pack version; per-flow Pass/Fail/Not Run with screenshots; accessibility findings and fixes; remaining defects with owner; remote SHA.
