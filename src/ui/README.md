# src/ui: Member 3 native frontend

Screens live in `app/` (except `app/_layout.tsx`, owned by Member 4). Components, presentation logic and theme live here. Nothing in `app/` or `src/ui/` touches the native model, SQLite, files or network directly. The UI only calls the contract v1.0 ports passed in through `UiServices`.

## Integration (Member 4)

1. Build a `UiServices` object from the real adapters:

   ```ts
   import type { UiServices } from "../src/ui/services";

   const services: UiServices = {
     kind: "real",                       // "dev_fixture" shows a DEV FIXTURE banner on every screen
     controller,                         // JourneyController (INT-003)
     ai,                                 // AiPort: only getState, ensureModel and initialize are used
     repository,                         // TransitRepository: only getPack and resolvePlace are used
     modelManifest,                      // public config ModelManifest, or null
     onlineHelpersEnabled: false,        // config enableOnlineHelpers
   };
   ```

2. Mount it once in `app/_layout.tsx`, outside render-time work:

   ```tsx
   import { Stack } from "expo-router";
   import { UiProvider } from "../src/ui/services";

   export default function RootLayout() {
     return (
       <UiProvider services={services}>
         <Stack />
       </UiProvider>
     );
   }
   ```

   Screens set their own titles with `<Stack.Screen options={{ title }} />`. This is now mounted by NativeUiBridge inside Member 4's ApplicationProvider; use the actual app/_layout.tsx composition.

3. Expo-required peers used by the UI: `expo-router` and `react-native-safe-area-context` (`useSafeAreaInsets`). No other packages are imported.

## What the UI assumes about the ports

- `ai.getState()` is synchronous and cheap. The provider polls it once per second so boot-time initialization by the app layer shows up without a subscription API.
- `ai.ensureModel()` runs only from the explicit "Download and set up" button. Progress is the normalized 0–1 value from the contract. `initialize()` is called afterwards only if the state is not already `ready`.
- `repository.getPack()` is loaded once at mount. The UI uses it for coverage labels, source titles, onboard service/direction/stop lists and up to 30 `knownPlaceLabels`.
- `controller.interpret()` is called with `locale: "taglish"` and a fresh `queryId`. AI confirmation/edits retain that draft's query ID; manual submissions create a fresh ID. Results for a superseded job are dropped.
- Manual and onboard trips call `submitManual`. Confirmed AI drafts call `submitConfirmed`.

## UI-006 status (October 10, 2026)

Branch `feat/ui/ui-006`. Physical-device verification is **Not Run**. The Member 3 workstation used for this pass has no Android SDK or ADB, no phone attached, and no copy of Member 4's rebuilt APK. No iPhone build exists. Install, cold launch, the per-flow device walk, TalkBack/VoiceOver, 200% text scaling, IME behaviour and safe areas on hardware still need a device session. [tests/ui/manual.md](../../tests/ui/manual.md) lists every check with its current status. It also records an October 10 react-native-web walk with the DEV FIXTURE services, which checks layout and flow but not native behaviour.

Changed in `src/ui/` and `app/`. These are verified by `npm run typecheck` and the pure tests in `tests/ui/` only, not on a device:

- **Coverage.** The results screen states the loaded pack's `coverageLabels` under "Supported coverage" on every outcome, including errors, with "Only trips within this coverage can be planned." An unsupported corridor shows "No verified complete journey available." beside the subset that is supported. With no pack loaded it says "No verified coverage is loaded." Engine coverage warnings that only repeat a pack label are dropped (`coverageSummary`). About lists the same labels and says the app plans only covered trips.
- **AI unavailable.** Home titles the not-ready notice "AI unavailable". The manual trip form shows the same label when the model is not ready.
- **Copy audit** against the edge-case matrix:
  - CONSTRAINT_UNSATISFIED no longer claims "a verified journey exists". The controller also returns it for conflicting modes before any search (EC-033).
  - SEARCH_LIMIT_REACHED says a limit is not proof of no route and suggests a narrower search. It now offers both "Change preferences" and "Change places" (EC-043).
  - AI_NOT_READY points to setup when connected (EC-085).
  - CANCELLED says "You can try again" (EC-102).
  - An unknown ride fare asks the user to confirm it with the driver or operator (EC-051). A partial fare with no unknown legs reads "Known subtotal …" instead of a bare amount (EC-057).
  - About no longer implies coverage of every mode.
  - Filipino walking total reads "… na lakad".
  - `tests/ui/copy.test.ts` rejects fastest, real-time or guarantee claims, and any "live" wording that is not a negation, in both languages.
- **Cancellation feedback.** A query cancelled by the app (for example, backgrounding) now shows "Cancelled. You can try again." with a retry. The user's own Cancel and superseded jobs stay silent. Recovery rules moved to the pure `error-logic.ts` (re-exported from `error-card.tsx`).
- **Accessibility:**
  - Notice titles are announced as "Warning: …" or "Problem: …" instead of glyph names.
  - Label/status rows are read as one phrase, for example "Local AI: Ready" or "Fare: ₱15.00 (verified)".
  - The mode sequence is read as "Walk, then LRT, then Walk".
  - Radio chip groups (language, priority, passenger) are named, and the language chips have a visible label.
  - Field errors are part of the input's hint, so they are read on focus.
  - The swap glyph is not read aloud, and the onboard service filter is labelled "Search services".
  - Place and service search disable autocorrect and use a search return key. Scrolling dismisses the keyboard, because iOS number pads have no return key.
  - Buttons and chips have a 48 dp minimum width as well as height.
  - Input and chip borders now meet 3:1 non-text contrast (they were 1.65:1). `tests/ui/contrast.test.ts` checks every color pair the screens draw against WCAG AA.

Proposals for Member 4 (not changed here; owner files):

- `app.config.ts` sets `orientation: "portrait"`, so the "rotate" check cannot run. Screens already apply left and right safe-area insets if rotation is wanted.
- `app.config.ts` sets `userInterfaceStyle: "automatic"`, but the UI palette is light only. Check status bar, header and keyboard legibility in system dark mode on a device. Use `"light"` until a dark palette exists.
- Engine text such as error details, `rankReason`, option warnings and coverage notes is English only, so Filipino users see English details. Localizing it needs stable codes from Members 2 and 4.

## UI-006 device verification, second pass (October 10, 2026)

Branch `feat/ui/ui-006-device` from `main` `3aabd53`. Device verification is still **Not Run**. It is blocked on prerequisites outside `app/` and `src/ui/`:

- **No APK from current `main`.** The only recorded Android artifact is `34236a5`. It was built before the LRT-1 pack was bundled, and it is on Member 4's machine.
- **No `adb`.** This workstation has no Android platform-tools. A phone was attached over USB in file-transfer (MTP) mode only, without USB debugging, so nothing was installed.
- **No iPhone build exists.**

### Verified in software instead

`tests/ui/real-pack-ui.test.ts` runs the walk's journeys on the real bundled pack `lrt1_2026_10_10_1`. Each journey goes through the real install path (Node SQLite, production mode), the controller and RoutePort, then the UI presenters. Only the AI is a test double. This proves the text the screens receive, not what a phone renders.

### Defects found and fixed

- **Estimated totals looked verified.** A student's Pedro Gil to Vito Cruz trip showed "✓ ₱19.00 total" in success styling, although its only ride fare is an estimate because no student discount is documented. A total now says "(verified)" only when every ride fare is verified. This trip reads "₱19.00 total (estimated)" in the info tone, and Vito Cruz to Baclaran reads "₱21.00 total (verified)" (`totalReliability`, `fareText`).
- **Unsupported places were not explained.** "Lipa" and "Candelaria" match no stored place, and the picker said only "No matching stored place". When the user's words or a search match nothing, the picker now lists the supported coverage (`needsCoverageHint`, EC-011). Nothing is routed.
- **Onboard results showed engine text as a boarding point.** They read "First ride from Currently onboard; next stop: …". A ride the user is already on now reads "Stay on your current vehicle" (`firstRideLine`).

### Proposals for Member 4 (undecided)

Step 5 asks for these to be decided with phone evidence, so they are still open. These are the exact changes to send if a device shows the defect:

- `app.config.ts`: set `userInterfaceStyle: "light"` if system dark mode makes the header, status bar or keyboard hard to read against the light-only palette.
- `app.config.ts`: leave `orientation: "portrait"` as is, unless the team wants rotation; in that case set `"default"`. Until then the rotation check is Not Applicable.
- Engine text: provide stable codes for `rankReason`, option warnings and error details so they can be localized. Today Filipino users see these details in English.

## Gaps to resolve with owners

- Model setup cancellation is now supplied as an optional UiServices capability from Member 1's existing AiManager extension. Canonical AiPort remains unchanged; the real setup screen offers cancellation during download/checking.
- Onboard: the origin endpoint for an onboard request is the confirmed next stop's place (`stop.placeId`, `stop.label`, `stop.point`). Member 2 should confirm this is the origin ROUTE-005 expects alongside `OnboardContext`.
- `ExtractInput.locale` is fixed to `"taglish"` because the UI cannot know the query language. Member 1 may prefer another value.
- The UI language toggle (English/Filipino) is session-only. Persisting it needs storage owned by Member 4.

## Development fixtures

`tests/ui/fixtures/dev-services.ts` exports `createDevFixtureServices()` (kind `dev_fixture`). Its pack is `kind: "test_fixture"` with `test_` namespaced IDs and "TEST ONLY" labels. It does no inference or routing; it returns canned, contract-shaped results. Release wiring must not import anything from `tests/`. The release check should reject `createDevFixtureServices`, `devPack` and `kind: "dev_fixture"`.

## Tests

Pure logic (`format.ts`, `form-logic.ts`, `journey-presenter.ts`, `onboard-logic.ts`) has no React imports and is covered by `tests/ui/*.test.ts` (node:test). Once the baseline provides `tsx`, run:

```bash
npx tsx --test tests/ui/format.test.ts tests/ui/form-logic.test.ts tests/ui/journey-presenter.test.ts tests/ui/onboard-logic.test.ts
```

TypeScript 6 defaults `compilerOptions.types` to `[]`, so a config that typechecks `tests/` needs `"types": ["node"]` and `@types/node`.

Manual device checks are in [tests/ui/manual.md](../../tests/ui/manual.md).
