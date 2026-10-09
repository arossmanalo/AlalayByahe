# AI-001 Native Inference Gate — evidence log

Owner: Member 1. Gate M1. **Status: Blocked / Not Run** (rechecked 2026-10-10 on branch `feat/ai/ai-005-006`). No phone has run llama.rn inference for this project yet. Nothing below is a pass.

## Current blockers

| Blocker | Evidence (2026-10-10) | Next owner / action |
|---|---|---|
| No Android phone connected to Member 1's laptop | `adb devices -l` lists no devices | Member 1: enable Developer options + USB debugging, connect the phone, accept the RSA prompt |
| No current APK on Member 1's laptop | No `alalaybyahe*.apk` or `.native-builds/` under Downloads, Desktop, Documents, projects or source. The recorded APK (`34236a5`) is stale for current runtime sources (`npm run release:check`), and the diagnostics screen added on this branch needs a new build anyway | Member 4: build from `feat/ai/ai-005-006` (see "Build for the device session" below), or Member 1 builds locally from a short no-space checkout |
| iOS needs the Mac | Windows cannot build iOS | **Descoped 2026-10-10**; no iOS build planned |
| Model not on any phone | Never downloaded on a device | Done in step 3 below through the app's setup screen |

Resolved earlier: app scaffold and real native ports (INT-001, merged); Android SDK/NDK/CMake on Member 1's laptop (2026-10-09). `npm ci` on Windows must run from **PowerShell or cmd**, not Git Bash: llama.rn's postinstall calls `tar`, and Git Bash's GNU tar fails on `C:\` paths (`Cannot connect to C: resolve failed`).

## What is ready

- `src/ai/llamaRnRuntime.ts`: llama.rn 0.12.9 adapter (`initLlama`, `completion` with `response_format: json_schema`, `stopCompletion`, `release`, `BuildInfo.number = 10256`).
- `src/ai/nativeProbe.ts`: one-shot verify → load → schema-constrained completion → parse/validate → release. Returns raw text, flags and timings.
- `src/ai/diagnostics.ts` + **`app/dev-ai.tsx`**: development-only screen that runs the probe (AI-001), the 42-case corpus benchmark (AI-005) and on-device lifecycle checks (AI-004). It keeps one native context at a time: it releases the app's model before the probe and reloads it afterwards. Reports are shown on screen and written to the device log with the tag `[AI-DIAG]`; nothing is uploaded or stored. It is enabled in development builds, and in a release build only if `EXPO_PUBLIC_AI_DIAGNOSTICS=1` was set at build time. It is not linked from product screens.

## Build for the device session

Member 4's procedure in `README.md` ("Android build on Windows"), from branch `feat/ai/ai-005-006`. Use a short physical checkout without spaces, and short SDK/Gradle cache paths. Use a release build so JS runs without Metro, and enable diagnostics for this benchmark APK:

```powershell
$env:EXPO_PUBLIC_AI_DIAGNOSTICS = "1"
npm run build:android:foundation
```

Do not distribute that APK. The AI-006 offline proof and release evidence should use a build **without** the flag.

## Procedure per phone

1. `adb install -r <apk>`. Record APK filename, SHA-256 and source commit.
2. Record free storage before setup: `adb shell df -h /data`.
3. **Model setup** (AI-002 on device): on Wi‑Fi, open Setup, tap download, then record start/end time, bytes, the hash result shown, and free storage afterwards. Then `adb shell am force-stop ph.alalaybyahe.app`, relaunch, and confirm the model shows ready without downloading again.
4. Open diagnostics: `adb shell am start -a android.intent.action.VIEW -d "alalaybyahe://dev-ai"`. Enter an anonymized device label (no serials or IMEI).
5. **Probe:** type a fresh query on the phone and tap *Run native probe*. Capture the report with `adb logcat -d -s ReactNativeJS | findstr AI-DIAG`.
6. If `probe.error` is set, or `probe.parsed.ok` is false, the gate **fails** for this platform. Record the exact error.

## Results

| Platform (anonymized) | OS | Build (commit, type) | Install | Model setup (bytes / hash / time) | Load ms | Completion ms | Valid JSON | Result |
|---|---|---|---|---|---|---|---|---|
| iPhone 14 Pro | — | — | — | — | — | — | — | **Out of scope** (iOS descoped 2026-10-10) |
| Android (Realme 10 Pro+ 5G / Honor X9b / Huawei) | — | — | Not Run | Not Run | — | — | — | **Not Run** |

Phone-local inference must not be claimed until a row shows a real pass with the raw report attached. iOS is out of scope; no iOS result exists or is claimed.
