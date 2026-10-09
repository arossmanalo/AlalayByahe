# Member 3 manual UI checklist

Status values: Pass, Fail, Not Run, Deferred. Record the device, OS version, font scale and build (dev fixture or real controller) for every run. A run against `createDevFixtureServices()` checks layout and flow only. It is not evidence of real inference, routing or transit data.

| ID | Check | Edge cases | Fixture run (web preview) | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|---|
| M-01 | Every P0 screen is reachable: home, setup, confirm, manual, results, journey, onboard, about | UI-001 | Partial: home, setup, confirm, results, journey, onboard reached; manual and about not opened | Not Run | Not Run |
| M-02 | DEV FIXTURE banner shows on every screen with fixture services or a test_fixture pack, and never with real wiring | UI-006 | Pass (every screen visited; real wiring not available) | Not Run | Not Run |
| M-03 | Text over 600 characters shows an error and keeps the full text editable; nothing is truncated | EC-014 | Not Run (unit test only) | Not Run | Not Run |
| M-04 | Double-tapping "Read my trip" or "Find verified routes" starts one job; Cancel stops it | EC-117 | Partial: busy state shown while reading; double tap and cancel not exercised | Not Run | Not Run |
| M-05 | AI not ready: home shows the warning, a setup link and manual entry; manual trip reaches results | EC-018, AI_NOT_READY | Partial: warning and setup link shown; manual trip not run | Not Run | Not Run |
| M-06 | Confirm: a fuzzy or ambiguous candidate is never preselected; the user must choose | EC-004, EC-008, EC-009 | Pass (two "mall" branches, none preselected; unique exact origin preselected) | Not Run | Not Run |
| M-07 | Swap exchanges places and their "AI read this as" text | EC-017 | Not Run | Not Run | Not Run |
| M-08 | The same place for origin and destination is blocked with "These places match" | EC-003 | Not Run | Not Run | Not Run |
| M-09 | Unselecting every mode shows the conflict error; no automatic relaxation | EC-012 | Not Run (unit test only) | Not Run | Not Run |
| M-10 | Invalid walk or budget input (`-1`, `1.5`, `abc`) is rejected with a message | EC-020 | Not Run (unit test only) | Not Run | Not Run |
| M-11 | Default preferences are labeled "default"; preferences from the user's words are labeled as such | UI-002 | Pass ("ayoko ng bus" unchecked bus, labeled "from your words"; others "default") | Not Run | Not Run |
| M-12 | Results show at most 3 options; an option with a missing required field is hidden and counted | EC-111 | Pass (3 shown, "1 option was hidden") | Not Run | Not Run |
| M-13 | Unknown fare reads "Fare unknown", never ₱0; a partial fare says "not the full total" | Fare rules | Pass | Not Run | Not Run |
| M-14 | Journey detail: the user can name the boarding point, signboard/direction and dropoff for each ride | EC-104, EC-135 | Pass (separate Board here / Direction / Get off here per ride) | Not Run | Not Run |
| M-15 | NO_VERIFIED_JOURNEY and CONSTRAINT_UNSATISFIED explain the problem and offer edits, not a fallback route | EC-138 | Partial: NO_VERIFIED_JOURNEY Pass; CONSTRAINT_UNSATISFIED not run | Not Run | Not Run |
| M-16 | Editing after results then re-planning replaces the old result; an old journey detail shows "Your trip changed" | EC-113 | Not Run | Not Run | Not Run |
| M-17 | Onboard: suspended directions are hidden; only legal alighting stops are listed; Plan stays hidden until the user confirms | UI-005 | Pass (Plan hidden until confirmation; suspended/legal-stop filtering covered by unit tests) | Not Run | Not Run |
| M-18 | Onboard "I don't know" never tells the user to get off; it offers a plan from a known stop | UI-005 | Pass (copy reviewed on screen) | Not Run | Not Run |
| M-19 | Setup: download progress, checking and ready states; a failure shows retry and manual entry | UI-004 | Partial: downloading 50% → ready shown; failure state not run | Not Run | Not Run |
| M-20 | Largest system font: no clipped boarding or dropoff text; every control still reachable by scrolling | EC-108, EC-109 | Not Run (needs device font scaling) | Not Run | Not Run |
| M-21 | Screen reader (TalkBack/VoiceOver): headings, buttons, checkboxes and radios are announced with state; the diagram reads as one summary | EC-106 | Not Run (roles verified in accessibility tree only) | Not Run | Not Run |
| M-22 | Small screen with the keyboard open: inputs and the submit button stay reachable | EC-108 | Not Run | Not Run | Not Run |
| M-23 | Filipino toggle switches the interface labels; place and service names are unchanged | EC-107 | Pass | Not Run | Not Run |

## Run log

- 2026-10-09, about 22:20–22:37 PHT, Member 3. Scratch harness outside the repo: Expo 57.0.27, expo-router 57.0.25, React Native 0.86.3, react-native-web 0.21, TypeScript 6.0.3, contract v1.0 types copied verbatim from the planning docs, `createDevFixtureServices()`. Rendered with `expo start --web` in a Chromium pane emulating 375×812. This is react-native-web, not a native build, simulator or phone. Native rendering, font scaling, keyboard and screen readers remain Not Run until Member 4's baseline (INT-001) builds.
- Fixes found during the run and committed: model "ready" text no longer claims the phone ran inference (the confirm screen shows `Extraction.engine.kind` instead); editing an onboard result returns to the onboard flow so `OnboardContext` is not dropped; onboard trips are not offered for repeat because the confirmed next stop goes stale.

## Fixture triggers

With `createDevFixtureServices()`:

- Typing `timeout` returns AI_TIMEOUT. Typing `unrelated` returns INVALID_INPUT.
- Typing `mall` gives two branch candidates. `ayoko ng bus` excludes bus. `lipat` sets fewest transfers. `diretso` sets direct only.
- Searching `Unconnected` or `Bus-Only` as the destination returns NO_VERIFIED_JOURNEY or CONSTRAINT_UNSATISFIED.
- The model starts as "Not downloaded"; "Download and set up" simulates progress. No file is downloaded.
