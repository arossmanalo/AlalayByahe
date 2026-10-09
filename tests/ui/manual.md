# Member 3 manual UI checklist

Status values: Pass, Fail, Not Run, Deferred. Record the device, OS version, font scale and build (dev fixture or real controller) for every run. A run against `createDevFixtureServices()` checks layout and flow only. It is not evidence of real inference, routing or transit data.

| ID | Check | Edge cases | Fixture run (web preview) | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|---|
| M-01 | Every P0 screen is reachable: home, setup, confirm, manual, results, journey, onboard, about | UI-001 | Pass (Oct 9 run reached the AI confirm screen; Oct 10 run reached manual and about) | Not Run | Not Run |
| M-02 | DEV FIXTURE banner shows on every screen with fixture services or a test_fixture pack, and never with real wiring | UI-006 | Pass (every screen visited; real wiring not available) | Not Run | Not Run |
| M-03 | Text over 600 characters shows an error and keeps the full text editable; nothing is truncated | EC-014 | Not Run (unit test only) | Not Run | Not Run |
| M-04 | Double-tapping "Read my trip" or "Find verified routes" starts one job; Cancel stops it | EC-117 | Partial: busy state shown while reading; double tap and cancel not exercised | Not Run | Not Run |
| M-05 | AI not ready: home shows the warning, a setup link and manual entry; manual trip reaches results | EC-018, AI_NOT_READY | Pass (Oct 10: "AI unavailable" on home and on the manual form; manual trip reached results) | Not Run | Not Run |
| M-06 | Confirm: a fuzzy or ambiguous candidate is never preselected; the user must choose | EC-004, EC-008, EC-009 | Pass (two "mall" branches, none preselected; unique exact origin preselected) | Not Run | Not Run |
| M-07 | Swap exchanges places and their "AI read this as" text | EC-017 | Not Run | Not Run | Not Run |
| M-08 | The same place for origin and destination is blocked with "These places match" | EC-003 | Not Run | Not Run | Not Run |
| M-09 | Unselecting every mode shows the conflict error; no automatic relaxation | EC-012 | Not Run (unit test only) | Not Run | Not Run |
| M-10 | Invalid walk or budget input (`-1`, `1.5`, `abc`) is rejected with a message | EC-020 | Not Run (unit test only) | Not Run | Not Run |
| M-11 | Default preferences are labeled "default"; preferences from the user's words are labeled as such | UI-002 | Pass ("ayoko ng bus" unchecked bus, labeled "from your words"; others "default") | Not Run | Not Run |
| M-12 | Results show at most 3 options; an option with a missing required field is hidden and counted | EC-111 | Pass (3 shown, "1 option was hidden") | Not Run | Not Run |
| M-13 | Unknown fare reads "Fare unknown", never ₱0; a partial fare says "not the full total" | Fare rules | Pass | Not Run | Not Run |
| M-14 | Journey detail: the user can name the boarding point, signboard/direction and dropoff for each ride | EC-104, EC-135 | Pass (separate Board here / Direction / Get off here per ride) | Not Run | Not Run |
| M-15 | NO_VERIFIED_JOURNEY and CONSTRAINT_UNSATISFIED explain the problem and offer edits, not a fallback route | EC-138 | Pass (Oct 10: both show supported coverage beneath; CONSTRAINT_UNSATISFIED offers Change preferences and Change places) | Not Run | Not Run |
| M-16 | Editing after results then re-planning replaces the old result; an old journey detail shows "Your trip changed" | EC-113 | Not Run | Not Run | Not Run |
| M-17 | Onboard: suspended directions are hidden; only legal alighting stops are listed; Plan stays hidden until the user confirms | UI-005 | Pass (Plan hidden until confirmation; suspended/legal-stop filtering covered by unit tests) | Not Run | Not Run |
| M-18 | Onboard "I don't know" never tells the user to get off; it offers a plan from a known stop | UI-005 | Pass (copy reviewed on screen) | Not Run | Not Run |
| M-19 | Setup: download progress, checking and ready states; a failure shows retry and manual entry | UI-004 | Partial: downloading 50% → ready shown; failure state not run | Not Run | Not Run |
| M-20 | Largest system font: no clipped boarding or dropoff text; every control still reachable by scrolling | EC-108, EC-109 | Not Run (needs device font scaling) | Not Run | Not Run |
| M-21 | Screen reader (TalkBack/VoiceOver): headings, buttons, checkboxes and radios are announced with state; the diagram reads as one summary | EC-106 | Not Run (Oct 10: labels checked in the web accessibility tree only, see A-01) | Not Run | Not Run |
| M-22 | Small screen with the keyboard open: inputs and the submit button stay reachable | EC-108 | Not Run | Not Run | Not Run |
| M-23 | Filipino toggle switches the interface labels; place and service names are unchanged | EC-107 | Pass | Not Run | Not Run |

## UI-006 device walk

Required by the UI-006 finish prompt. Android uses Member 4's APK installed with `adb install -r` and cold-launched without Metro or Expo Go. iPhone runs only after Member 4's Mac build. Record device, OS, build commit and pack version, and add screenshots with no personal data.

| ID | Flow | Edge cases | Fixture run (web preview, Oct 10) | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|---|
| D-01 | Install and cold launch without Metro or Expo Go | EC-133 | Not applicable | Not Run: no device, ADB or current APK | Not Run: no iOS build |
| D-02 | First launch: AI and transit data readiness shown separately; with no release pack, "Transit data: Not loaded" and journeys fail as data unavailable | EC-084, EC-087 | Partial: separate readiness shown with fixture pack loaded; missing-pack state not run | Not Run | Not Run |
| D-03 | Model setup: progress, cancel, retry, offline failure | EC-090, EC-098 | Partial: progress to 50% shown; fixture has no cancel or failure trigger | Not Run | Not Run |
| D-04 | AI not ready: manual search clearly labelled "AI unavailable" | EC-085, EC-086 | Pass | Not Run | Not Run |
| D-05 | Text query to editable confirmation; no routing before confirmation; ambiguous or swapped places need clarification | EC-004, EC-008, EC-017 | Not Run on Oct 10 (Oct 9 run: M-06 Pass) | Not Run | Not Run |
| D-06 | Results: known vs unknown fare, a partial subtotal never shown as a total, transfers, headsign and direction warning, walking meters | EC-057, EC-135 | Pass ("Fare: This is not the full total. Known subtotal ₱13.00–₱15.00 plus 1 ride with unknown fare") | Not Run | Not Run |
| D-07 | Strict preference failure with the "change preferences" prompt | EC-033 | Pass | Not Run | Not Run |
| D-08 | SEARCH_LIMIT_REACHED copy | EC-043 | Not Run (no fixture trigger; copy covered by `copy.test.ts`) | Not Run | Not Run |
| D-09 | Unsupported corridor: "No verified complete journey available." with the supported subset stated | EC-023, EC-138 | Pass (fixture "Unconnected" destination); real pack: see R-04 | Not Run: no APK from current `main` | Not Run |
| D-10 | Onboard replan: manual confirmation of service, direction and next stop; no tracking claim | EC-046, EC-047 | Partial: service and direction prefilled from a journey step, no-tracking notice shown; plan not submitted | Not Run | Not Run |
| D-11 | Cancel while reading or planning | EC-117 | Not Run | Not Run | Not Run |
| D-12 | Background and return mid-query: "Cancelled. You can try again." with retry | EC-102 | Not Run (needs app lifecycle; rule covered by `error-logic.test.ts`) | Not Run | Not Run |
| D-13 | Rotate | EC-108 | Not applicable | Not Run: `app.config.ts` locks portrait | Not Run |
| D-14 | Long text over 600 characters | EC-014 | Not Run (unit test only) | Not Run | Not Run |
| D-15 | Offline: airplane mode, force-quit, relaunch, stored-place trip | EC-083, EC-094 | Not applicable | Not Run | Not Run |

| ID | Accessibility check | Fixture run (web preview, Oct 10) | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|
| A-01 | Screen reader labels, roles and states (TalkBack / VoiceOver) | Partial: web tree shows "Warning: …" notice titles, "Local AI: Not downloaded" as one label, named "Language" radio group, "Walk, then Bus, then Walk", swap button without its glyph, "Search services". react-native-web ignores the native-only hide-descendants props, so duplicate reading can only be checked on a device | Not Run | Not Run |
| A-02 | 48 dp minimum touch targets | Code: buttons, chips and inputs have 48 minimum height and width | Not Run | Not Run |
| A-03 | Text scaling up to 200% without clipped stops | Not Run | Not Run | Not Run |
| A-04 | Contrast WCAG AA | Pass: `contrast.test.ts`. Defect fixed: input and chip borders were 1.65:1, now 4.54:1 on white | Not applicable | Not applicable |
| A-05 | No color-only status | Pass: every tone has a glyph and a written title, and screen readers hear the tone as a word | Not Run | Not Run |
| A-06 | Keyboard and IME | Partial: place and service search send `autocorrect="off"` and a search return key; scroll-to-dismiss needs a device | Not Run | Not Run |
| A-07 | Safe areas (notch, gesture bar) | Not applicable | Not Run | Not Run |

### Real-pack journeys (bundled pack `lrt1_2026_10_10_1`)

The software column runs `tests/ui/real-pack-ui.test.ts`: the real install path, controller and RoutePort, then the UI presenters. Only the AI is a test double. It checks the text the screens receive, not what a phone renders.

| ID | Journey | Expected on screen | Software (real pack, Oct 10) | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|---|
| R-01 | Vito Cruz to Baclaran | One LRT ride, headsign "Dr. Santos", "Fare: ₱21.00 total (verified)", 0 transfers, 0 m walking, Supported coverage shows the LRT-1 label once | Pass | Not Run | Not Run |
| R-02 | Taft (alias for EDSA) to Vito Cruz, and back | ₱20.00 verified each way; headsign "Fernando Poe Jr." then "Dr. Santos" | Pass | Not Run | Not Run |
| R-03 | Pedro Gil to Vito Cruz as a student | "₱19.00 total (estimated)"; ride fare "₱19.00 (estimated)" with the basis "No student discount is documented…" | Pass after fix (the total was shown as "✓ ₱19.00 total") | Not Run | Not Run |
| R-04 | Lipa to Candelaria | No stored place; the picker lists the supported coverage; nothing is routed | Pass after fix (coverage was not stated) | Not Run | Not Run |
| R-05 | Onboard LRT-1 toward Dr. Santos, next stop Vito Cruz, to Baclaran | "Stay on your current vehicle"; fare unknown with "Confirm the fare with the driver or operator."; the warning says vehicle position is not tracked | Pass after fix (read "First ride from Currently onboard; …") | Not Run | Not Run |

## Run log

- 2026-10-09, about 22:20–22:37 PHT, Member 3. Scratch harness outside the repo: Expo 57.0.27, expo-router 57.0.25, React Native 0.86.3, react-native-web 0.21, TypeScript 6.0.3, contract v1.0 types copied verbatim from the planning docs, `createDevFixtureServices()`. Rendered with `expo start --web` in a Chromium pane emulating 375×812. This is react-native-web, not a native build, simulator or phone. Native rendering, font scaling, keyboard and screen readers remain Not Run until Member 4's baseline (INT-001) builds.
- 2026-10-10, Member 3, branch `feat/ui/ui-006` on top of `main` `39dcb6b`. A react-native-web 0.21.4 render of the real `app/` screens with `createDevFixtureServices()` (pack `test_fixture_1`) in a Chromium pane emulating 375×812. Routes were re-exported from a temporary untracked router root, so `app/_layout.tsx` was not changed. react-native-web was installed with `--no-save`. Neither is committed. This is layout and flow evidence only, not a native build, simulator or phone. No Android device, ADB or rebuilt APK was available, and no iPhone build exists.
- Fixes from the Oct 10 pass:
  - The results screen now states pack coverage on every outcome.
  - "AI unavailable" labelling on home and the manual form.
  - CONSTRAINT_UNSATISFIED no longer claims a journey exists.
  - Grouped status and leg-sequence labels, with descendants hidden from native screen readers.
  - Field errors are read on focus.
  - Control borders meet 3:1 contrast.
- Fixes found during the run and committed: model "ready" text no longer claims the phone ran inference (the confirm screen shows `Extraction.engine.kind` instead); editing an onboard result returns to the onboard flow so `OnboardContext` is not dropped; onboard trips are not offered for repeat because the confirmed next stop goes stale.

- 2026-10-10 (second pass), Member 3, branch `feat/ui/ui-006-device` from `main` `3aabd53`, pack `lrt1_2026_10_10_1`. **No device run.** There is no APK built from current `main`, no `adb` on this workstation, and the attached phone was in USB file-transfer mode without debugging. The real-pack software run (R-01 to R-05) found three presentation defects, all fixed in `src/ui/` with pure tests:
  - Estimated totals shown as if verified.
  - No coverage statement for unmatched places.
  - Onboard engine text shown as a boarding point.

## Fixture triggers

With `createDevFixtureServices()`:

- Typing `timeout` returns AI_TIMEOUT. Typing `unrelated` returns INVALID_INPUT.
- Typing `mall` gives two branch candidates. `ayoko ng bus` excludes bus. `lipat` sets fewest transfers. `diretso` sets direct only.
- Searching `Unconnected` or `Bus-Only` as the destination returns NO_VERIFIED_JOURNEY or CONSTRAINT_UNSATISFIED.
- The model starts as "Not downloaded"; "Download and set up" simulates progress. No file is downloaded.
