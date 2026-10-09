# AI-001 Native Inference Gate — evidence log

Owner: Member 1. Gate M1. **Status: Blocked / Not Run** (rechecked 2026-10-10 ~01:45 PHT against `main` `3aabd53`, branch `feat/ai/ai-005-006-results`). No phone has run llama.rn inference for this project yet. Nothing below is a pass.

## Current blockers

| Blocker | Evidence (2026-10-10) | Next owner / action |
|---|---|---|
| No APK built from current `main` | `native-artifacts.json` still records only `alalaybyahe-0.1.0-34236a5.apk`, and `npm run release:check` reports it stale; it predates the bundled LRT-1 pack and the diagnostics screen. No newer APK exists on Member 1's laptop. A local Member 1 build from `feat/ai/ai-005-006` was stopped by decision at ~373/840 Gradle tasks, so that APKs come from one owner and one commit | **Member 4:** build two APKs from current `main`: (1) **benchmark**, with `EXPO_PUBLIC_AI_DIAGNOSTICS=1`; (2) **release**, without it. Send each file name, source commit and SHA-256, and record them in `native-artifacts.json` |
| iOS needs the Mac | Windows cannot build iOS | **Descoped 2026-10-10**; no iOS build planned |
| Model not on any phone | Never downloaded on a device | Step 3 below, through the app's setup screen |

Note (2026-10-10 03:09 PHT): `adb devices` was empty because the phone was unplugged. Reconnect it before the session; it was already authorized.

Resolved: the Android phone is connected and authorized over USB (see Device below); app scaffold and real native ports (INT-001, merged). The Android SDK on Member 1's laptop now lives at `C:\Android\Sdk`. The first install had been silently redirected into the Claude app's private storage and was moved on 2026-10-10. `npm ci` on Windows must run from **PowerShell or cmd**, not Git Bash: llama.rn's postinstall calls `tar`, and Git Bash's GNU tar fails on `C:\` paths (`Cannot connect to C: resolve failed`).

## Device (prepared; nothing installed yet)

| Field | Value (`adb shell getprop` / `dumpsys battery`, 2026-10-10 ~01:45 PHT) |
|---|---|
| Label | Honor X9b 5G (model ALI-NX1) |
| OS | Android 15 (API 35), MagicOS build ALI-N21 9.0.0.225 |
| CPU / ABI | Snapdragon SM6450, arm64-v8a |
| RAM | 11.2 GiB (MemTotal 11,732,384 kB) |
| Free storage | 83 GB of 223 GB (`/data`) |
| Battery | 51%, charging over USB, 31.0 °C |
| App installed | No |

No serial number or IMEI is recorded.

## What is ready

- `src/ai/llamaRnRuntime.ts`: llama.rn 0.12.9 adapter (`initLlama`, `completion` with `response_format: json_schema`, `stopCompletion`, `release`, `BuildInfo.number = 10256`).
- `src/ai/nativeProbe.ts`: one-shot verify → load → schema-constrained completion → parse/validate → release. Returns raw text, flags and timings.
- `src/ai/diagnostics.ts` + **`app/dev-ai.tsx`**: development-only screen that runs the probe (AI-001), the 42-case corpus benchmark (AI-005) and on-device lifecycle checks (AI-004). It keeps one native context at a time: it releases the app's model before the probe and reloads it afterwards. Reports are shown on screen and written to the device log with the tag `[AI-DIAG]`; nothing is uploaded or stored. It is enabled in development builds, and in a release build only if `EXPO_PUBLIC_AI_DIAGNOSTICS=1` was set at build time. It is not linked from product screens.

## Build for the device session (Member 4)

Member 4's procedure in `README.md` ("Android build on Windows"), from current `main`. Use a short physical checkout without spaces, and short SDK/Gradle cache paths. Use a release build so JS runs without Metro, and enable diagnostics for this benchmark APK:

```powershell
$env:EXPO_PUBLIC_AI_DIAGNOSTICS = "1"
npm run build:android:foundation
```

Do not distribute that APK. The AI-006 offline proof and release evidence should use a build **without** the flag.

## Procedure per phone

1. Check the APK first: `certutil -hashfile <apk> SHA256` must equal the SHA-256 that Member 4 recorded in `native-artifacts.json` for that file and commit. Use the **benchmark** APK (diagnostics flag), never the demo APK. Then `adb install -r <apk>` and record the APK filename, SHA-256 and source commit.
2. Record free storage before setup: `adb shell df -h /data`.
3. **Model setup** (AI-002 on device): on Wi‑Fi, open Setup, tap download, then record start/end time, bytes, the hash result shown, and free storage afterwards. Then `adb shell am force-stop ph.alalaybyahe.app`, relaunch, and confirm the model shows ready without downloading again.
4. Open diagnostics: `adb shell am start -a android.intent.action.VIEW -d "alalaybyahe://dev-ai"`. Enter an anonymized device label (no serials or IMEI).
5. **Probe:** type a fresh query on the phone and tap *Run native probe*. Capture the report with `adb logcat -d -s ReactNativeJS | findstr AI-DIAG`. Check its `build` block before using it: `diagnosticsFlag: true`, `demoBuild: false`, `packId: pack_lrt1`, `packVersion: lrt1_2026_10_10_1`, and `validForMeasurement: true`. A report with any other value comes from the wrong APK and is not evidence.
6. If `probe.error` is set, or `probe.parsed.ok` is false, the gate **fails** for this platform. Record the exact error.

## Results

| Platform (anonymized) | OS | Build (commit, type) | Install | Model setup (bytes / hash / time) | Load ms | Completion ms | Valid JSON | Result |
|---|---|---|---|---|---|---|---|---|
| iPhone 14 Pro | — | — | Not Run | Not Run | — | — | — | **Out of scope** (iOS descoped 2026-10-10) |
| Honor X9b 5G (ALI-NX1) | Android 15 | — (awaiting Member 4 benchmark APK) | Not Run | Not Run | — | — | — | **Not Run** |

Phone-local inference must not be claimed until a row shows a real pass with the raw report attached. iOS is out of scope; no iOS result exists or is claimed.
