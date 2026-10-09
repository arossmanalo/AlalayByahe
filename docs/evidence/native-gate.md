# AI-001 Native Inference Gate — evidence log

Owner: Member 1. Gate M1. **Status: Blocked / Not Run.** No phone has run llama.rn inference for this project yet. Nothing below is a pass.

## Blockers (as of 2026-10-09 ~22:30 PHT)

| Blocker | Evidence | Next owner / action |
|---|---|---|
| No app scaffold (INT-001) | `main` holds only `README.md`, `AGENTS.md`, `docs/planning/`; no `package.json`, `app.config.ts` or native folders | Member 4: scaffold Expo 57 app, install the pins, add the llama.rn plugin, then rebase this branch |
| No Android toolchain on Member 1's Windows laptop | `adb` not on PATH; `%LOCALAPPDATA%\Android` does not exist | Build Android on a machine with Android SDK + NDK ≥ 24, or install them here |
| iOS needs a Mac | Windows host cannot run Xcode | Member with the Mac (Xcode 26.6, Personal Team) builds and installs on iPhone 14 Pro |
| Model file not yet on a phone | The 491,400,032-byte GGUF has not been downloaded in this session | Download on the phone via `ai.ensureModel` (AI-002), or preload the pinned file into the app's `Documents/models/` folder; `initialize()` will rehash it |

## What is ready for the gate

Member 4 integration update: scaffold/lockfile and real native ports now exist on feat/integration/int-001-foundation. The Member 4 Windows host has Android SDK/NDK/CMake; its actual native build attempts are in [builds.md](builds.md). The earlier blocker table describes Member 1's original host/checkpoint. Physical inference on either platform remains Not Run.

- `src/ai/llamaRnRuntime.ts` — adapter written against the **installed** llama.rn 0.12.9 typings (`initLlama`, `LlamaContext.completion` with `response_format: { type: "json_schema", json_schema: { strict: true, schema } }`, `stopCompletion`, `release`, `BuildInfo.number`). It typechecks under TypeScript 6.0.3 strict mode.
- `src/ai/nativeProbe.ts` — `runNativeProbe({ runtime, store, platformLabel, text })` verifies the model (marker or full SHA256), loads it, runs one fresh schema-constrained completion, parses and validates it, and releases. It returns raw text, completion flags, load/completion/verification times and the runtime/model labels.
- Pinned llama.rn facts read from the installed package: `BuildInfo.number = 10256`, commit `6c8dcaa`. The postinstall downloads prebuilt Android JNI libs and the iOS xcframework (SHA-pinned). The Expo plugin options are `enableEntitlements`, `entitlementsProfile`, `forceCxx20`, `enableOpenCL`, `enableOpenCLAndHexagon`. Default Android ABIs are `x86_64,arm64-v8a`.

## Procedure (run once per platform)

1. Member 4 finishes INT-001. Add `["llama.rn", { enableEntitlements: false }]` to plugins, and do not pass `--ignore-scripts` during install.
2. Build a dev client or release build and install it on the physical phone (no simulator, no Expo Go).
3. Get the verified model onto the phone with `createPhoneAi().ensureModel(...)` over Wi‑Fi, or preload the pinned file.
4. From a development-only button handler (not render), run:
   ```ts
   import { runNativeProbe } from "../src/ai";
   import { createPhoneModelStore, createPhoneRuntime } from "../src/ai/phone";
   const report = await runNativeProbe({
     runtime: createPhoneRuntime(),
     store: createPhoneModelStore(),
     platformLabel: "Android 15 / Realme 10 Pro+ 5G", // anonymized, no serials/IMEI
     text: "<type a fresh query on the device>",
   });
   console.log(JSON.stringify(report, null, 2));
   ```
5. Paste the report below, removing nothing except personal data. If `report.error` is set or `parsed.ok` is false, the gate **fails** for that platform. Record the exact error.

## Results

| Platform (anonymized) | OS | Build type | Install | Model verified | Load ms | Completion ms | Valid JSON | Result |
|---|---|---|---|---|---|---|---|---|
| iPhone 14 Pro | — | — | Not Run | Not Run | — | — | — | **Not Run** |
| Android (Realme 10 Pro+ 5G / Honor X9b / Huawei) | — | — | Not Run | Not Run | — | — | — | **Not Run** |

Phone-local inference must not be claimed until both rows show a real pass with the raw report attached.
