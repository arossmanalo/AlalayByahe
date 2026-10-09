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

   Screens set their own titles with `<Stack.Screen options={{ title }} />`.

3. Expo-required peers used by the UI: `expo-router` and `react-native-safe-area-context` (`useSafeAreaInsets`). No other packages are imported.

## What the UI assumes about the ports

- `ai.getState()` is synchronous and cheap. The provider polls it once per second so boot-time initialization by the app layer shows up without a subscription API.
- `ai.ensureModel()` runs only from the explicit "Download and set up" button. Progress is the normalized 0–1 value from the contract. `initialize()` is called afterwards only if the state is not already `ready`.
- `repository.getPack()` is loaded once at mount. The UI uses it for coverage labels, source titles, onboard service/direction/stop lists and up to 30 `knownPlaceLabels`.
- `controller.interpret()` is called with `locale: "taglish"` and a fresh `queryId`. Every route submission uses a new `queryId`; results for a superseded ID are dropped.
- Manual and onboard trips call `submitManual`. Confirmed AI drafts call `submitConfirmed`.

## Gaps to resolve with owners

- `AiPort` has no download-cancel method, so the setup screen offers retry but not cancel (UI-004 asks for both). Member 1/4 decide whether to add one in a contract version bump.
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
