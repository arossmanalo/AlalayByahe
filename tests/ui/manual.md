# Member 3 manual UI checklist

Status values: Pass, Fail, Not Run, Deferred. Record the device, OS version, font scale and build (dev fixture or real controller) for every run. A run against `createDevFixtureServices()` checks layout and flow only. It is not evidence of real inference, routing or transit data.

| ID | Check | Edge cases | Fixture run | Real run (Android) | Real run (iPhone) |
|---|---|---|---|---|---|
| M-01 | Every P0 screen is reachable: home, setup, confirm, manual, results, journey, onboard, about | UI-001 | Not Run | Not Run | Not Run |
| M-02 | DEV FIXTURE banner shows on every screen with fixture services or a test_fixture pack, and never with real wiring | UI-006 | Not Run | Not Run | Not Run |
| M-03 | Text over 600 characters shows an error and keeps the full text editable; nothing is truncated | EC-014 | Not Run | Not Run | Not Run |
| M-04 | Double-tapping "Read my trip" or "Find verified routes" starts one job; Cancel stops it | EC-117 | Not Run | Not Run | Not Run |
| M-05 | AI not ready: home shows the warning, a setup link and manual entry; manual trip reaches results | EC-018, AI_NOT_READY | Not Run | Not Run | Not Run |
| M-06 | Confirm: a fuzzy or ambiguous candidate is never preselected; the user must choose | EC-004, EC-008, EC-009 | Not Run | Not Run | Not Run |
| M-07 | Swap exchanges places and their "AI read this as" text | EC-017 | Not Run | Not Run | Not Run |
| M-08 | The same place for origin and destination is blocked with "These places match" | EC-003 | Not Run | Not Run | Not Run |
| M-09 | Unselecting every mode shows the conflict error; no automatic relaxation | EC-012 | Not Run | Not Run | Not Run |
| M-10 | Invalid walk or budget input (`-1`, `1.5`, `abc`) is rejected with a message | EC-020 | Not Run | Not Run | Not Run |
| M-11 | Default preferences are labeled "default"; preferences from the user's words are labeled as such | UI-002 | Not Run | Not Run | Not Run |
| M-12 | Results show at most 3 options; an option with a missing required field is hidden and counted | EC-111 | Not Run | Not Run | Not Run |
| M-13 | Unknown fare reads "Fare unknown", never ₱0; a partial fare says "not the full total" | Fare rules | Not Run | Not Run | Not Run |
| M-14 | Journey detail: the user can name the boarding point, signboard/direction and dropoff for each ride | EC-104, EC-135 | Not Run | Not Run | Not Run |
| M-15 | NO_VERIFIED_JOURNEY and CONSTRAINT_UNSATISFIED explain the problem and offer edits, not a fallback route | EC-138 | Not Run | Not Run | Not Run |
| M-16 | Editing after results then re-planning replaces the old result; an old journey detail shows "Your trip changed" | EC-113 | Not Run | Not Run | Not Run |
| M-17 | Onboard: suspended directions are hidden; only legal alighting stops are listed; Plan stays hidden until the user confirms | UI-005 | Not Run | Not Run | Not Run |
| M-18 | Onboard "I don't know" never tells the user to get off; it offers a plan from a known stop | UI-005 | Not Run | Not Run | Not Run |
| M-19 | Setup: download progress, checking and ready states; a failure shows retry and manual entry | UI-004 | Not Run | Not Run | Not Run |
| M-20 | Largest system font: no clipped boarding or dropoff text; every control still reachable by scrolling | EC-108, EC-109 | Not Run | Not Run | Not Run |
| M-21 | Screen reader (TalkBack/VoiceOver): headings, buttons, checkboxes and radios are announced with state; the diagram reads as one summary | EC-106 | Not Run | Not Run | Not Run |
| M-22 | Small screen with the keyboard open: inputs and the submit button stay reachable | EC-108 | Not Run | Not Run | Not Run |
| M-23 | Filipino toggle switches the interface labels; place and service names are unchanged | EC-107 | Not Run | Not Run | Not Run |

## Fixture triggers

With `createDevFixtureServices()`:

- Typing `timeout` returns AI_TIMEOUT. Typing `unrelated` returns INVALID_INPUT.
- Typing `mall` gives two branch candidates. `ayoko ng bus` excludes bus. `lipat` sets fewest transfers. `diretso` sets direct only.
- Searching `Unconnected` or `Bus-Only` as the destination returns NO_VERIFIED_JOURNEY or CONSTRAINT_UNSATISFIED.
- The model starts as "Not downloaded"; "Download and set up" simulates progress. No file is downloaded.
