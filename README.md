# AlalayByahe
A native Android/iPhone commute assistant for Filipino, English and Taglish requests. Local Qwen extracts journey fields; users confirm them; deterministic routing uses documented services, pedestrian links and fare evidence. Scanner/maps are deferred.

**Development status:** real AI, routing and UI adapters are integrated. The bundled transit pack is **LRT-1 stations only** (25 stations, stored value fares, no walking links, no road services). The Android test APK recorded in `docs/evidence/native-artifacts.json` predates it and is stale; rebuild before any device test. Phone inference, offline operation and iOS signing are not yet verified. The three requested corridors remain targets and none is supported end to end: Lipa–Candelaria, Lipa–San Pablo and Candelaria–Vito Cruz/Taft.

## Get the installed baseline

Use Node 24 and npm 11 with the committed lockfile:

```powershell
git clone https://github.com/arossmanalo/AlalayByahe.git
Set-Location AlalayByahe
npm ci
npm run typecheck
npm test
npm run doctor
npm run data:validate
npm run release:check
```

`release:check` intentionally fails until a reviewed pack is bundled and matching Android/iOS physical evidence exists. A passing fixture validation or build cannot make a release ready.

Build identities belong in `docs/evidence/native-artifacts.json`; completed acceptance reports belong in `docs/evidence/physical-release.json` using the example template. Reports must match the actual APK/IPA hash, build source commit, pack and model. Runtime changes invalidate old artifacts; documentation-only changes do not.

The installed core is Expo 57.0.27, React Native 0.86.3, React 19.2.3, llama.rn 0.12.9, TypeScript 6.0.3 and expo-sqlite 57.0.4. Dependency compatibility corrections and the full model manifest are in the [shared contract](docs/planning/02-shared-integration-contract.md).

## Android build on Windows

Use a **physical checkout in a short path without spaces**, such as `D:\ab-native`. Junctions alone did not shorten all Gradle/CMake paths on the observed machine. Keep the SDK and Gradle cache paths short too. This host uses `D:\AlalaySdk` (a junction to the installed SDK) and `D:\ab-g` (a fresh physical cache).

```powershell
Set-Location D:\ab-native
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'D:\AlalaySdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = 'D:\ab-g'
npm ci
npm run build:android:foundation
```

The PowerShell build helper generates Android, sets a writable Java/Expo temp directory, and runs `assembleRelease` without requiring a connected phone. Gradle provisions the generated project's missing SDK/NDK components under already accepted SDK licenses. On another host use its actual JDK/SDK paths.

The generated APK is `android/app/build/outputs/apk/release/app-release.apk`. It is a local test build using the generated debug signing key. Keep APKs, keys, models and native folders out of Git. Install with the SDK's `adb install -r <APK>`, disconnect Metro/USB, then run the physical checklist. See [build evidence](docs/evidence/builds.md) for what actually succeeded.

For development only: `npm start` starts a dev client. The intended installed demo must run without Expo Go or Metro.

## iPhone build on the Mac

Use the same branch/lockfile on the Mac with Xcode. Run `npm ci`, `npx expo prebuild --platform ios`, then open `ios/AlalayByahe.xcworkspace`. Select the actual Personal Team and connected iPhone, enable the required device trust/developer settings, and build the **Release** configuration. The paid Apple Developer Program is not required for the planned local device test; verify the Personal Team's current limits in Xcode. Windows cannot generate/build this iOS native project.

No iPhone native build, signing, install or inference has been verified in this chat. Record it separately from the successful iOS Hermes export.

## Connect verified data

Member 2 supplies `assets/data/release.json` with actual source-backed coverage (currently `pack_lrt1`, LRT-1 stations only). Run `npm run data:validate -- assets/data/release.json --release`. `src/application/bundled-pack.ts` imports that reviewed JSON; any pack change is a runtime change and requires a rebuild and a new physical test.

On an empty database, application startup installs the validated bundled release pack transactionally. Existing installed data is retained; updates go through `TransitRepository.replacePack`. Corrupt metadata, indexes, aliases and payloads fail validation. Test fixtures are never loaded into the native composition.

Mode, walking, direct-only and budget preferences remain strict. Unknown fare is null; a known subtotal is not a complete total. Onboard planning starts at a manually confirmed legal next stop and evaluates the full onward journey. It does not track the vehicle.

## Local AI setup and offline boundary

The setup screen explicitly downloads Qwen2.5 0.5B Instruct Q4_K_M: **491,400,032 bytes**, pinned revision and SHA-256. It downloads to a private partial file, hashes bounded chunks, and promotes only a verified file. Setup can be cancelled/retried. Boot never silently downloads the model. Download speed, peak RAM and phone accuracy remain unmeasured.

After setup, the target is local extraction plus offline journeys for stored places and a verified installed graph. New arbitrary addresses/walking paths may need an explicit online helper. Helpers are disabled; no cloud AI or paid service is wired. Scanner/OCR and maps are outside the overnight P0 baseline.

## Team integration

- Member 1: `src/ai/`; real model acquisition, extraction and lifecycle.
- Member 2: `src/data/`, `src/routing/`; pack/source validation and deterministic search/fares.
- Member 3: `app/`, `src/ui/`; native screens and presentation.
- Member 4: contracts, lock/config, `src/storage/`, `src/application/`, build/release checks and merges.

The actual Member 4 editing checkout is `.worktrees/member4`, isolated from the concurrently used Member 2 branch. Screens receive real ports through `NativeUiBridge`/`UiProvider`; the shared application owns initialization and background cancellation. AI confirmation keeps its draft query ID, including explicit edits.

See [integration handoff](docs/evidence/integration.md), [execution dashboard](docs/planning/04-team-execution.md), [acceptance plan](docs/planning/06-acceptance-and-demo.md) and [submission draft](docs/submission.md). No post, video upload or event submission has been performed.
