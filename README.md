# AlalayByahe

An Android commute assistant for Filipino, English and Taglish requests. A small language model running on the phone reads the typed request into editable fields; the user confirms them; a deterministic engine then plans a journey from stored, source-checked data (documented rides, legal boarding and drop-off stops, walking links where they exist, and fare evidence). The model never supplies routes, stops, directions or fares. iOS is out of scope (decision of 2026-10-10). Scanner and street maps are deferred.

**Status (2026-10-10):** the real AI, routing and UI adapters are integrated and tested in Node (`npm test`). **Nothing has been run on a phone yet:** phone inference, offline operation, SQLite persistence and cold launch are unverified, and no current APK exists (the one recorded in `docs/evidence/native-artifacts.json` is stale). The release build's data is **LRT-1 stations only**: 25 stations, stored-value fares, no walking links, no road services. None of the three requested corridors is supported end to end: Lipa–Candelaria, Lipa–San Pablo and Candelaria–Vito Cruz/Taft.

## Contents

1. [Verification status](#verification-status)
2. [Get the installed baseline](#get-the-installed-baseline)
3. [Android build on Windows](#android-build-on-windows) and the [three Android builds](#three-android-builds-never-mixed-up)
4. [Phone test script (Android)](#phone-test-script-android)
5. [Data, local AI and offline boundary](#connect-verified-data)
6. [Disclosures, attribution and limitations](#disclosures-attribution-and-limitations)
7. [Event requirements check](#event-requirements-check)
8. [Team, evidence and further reading](#team-integration)

## Verification status

| Item | Status |
|---|---|
| Node tests, typecheck, pack validation | Run and passing on `main` (see the commit's checks) |
| Release APK built and checked clean | Not Run |
| Install, cold launch without Metro/USB | Not Run |
| Model download and SHA-256 on a phone | Not Run |
| Phone-local extraction into real routing | Not Run |
| Offline proof (airplane mode, fresh query) | Not Run |
| AI trip summary (chat and manual trips) | Checks and fallback tested in Node with a fake model; on a phone Not Run |
| Demo build: every pair of demo places plans | Verified in software (all 6,480 ordered pairs); on a phone Not Run |
| Near-stop alert with real GPS, optional map request | Not Run |
| iOS | Out of scope |

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

`release:check` intentionally fails until a reviewed pack is bundled and matching Android physical evidence exists. (The release gate in `src/application/release-gate.ts` now requires Android evidence only, because iOS was excluded from production on 2026-10-10.) A passing fixture validation or build cannot make a release ready.

Build identities belong in `docs/evidence/native-artifacts.json`; completed acceptance reports belong in `docs/evidence/physical-release.json` using the example template. Reports must match the actual APK hash, build source commit, pack and model. Runtime changes invalidate old artifacts; documentation-only changes do not.

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

## iPhone / iOS: out of scope

The team excluded iOS on 2026-10-10 because of limited resources. Android is the only supported and tested platform. The iOS project settings in `app.config.ts` and the iOS libraries pulled in by dependencies remain in the repository but are unused and unverified.

No iOS native build, signing, install or inference has been done. Earlier iOS Hermes bundle exports compile JavaScript only and say nothing about iPhone support.

## Three Android builds (never mixed up)

| Build | How | Contents | Evidence |
|---|---|---|---|
| **Release** | no flags | Frozen pack `lrt1_2026_10_10_1` (LRT-1 stations only) | The only build recorded as release evidence |
| Benchmark | `EXPO_PUBLIC_AI_DIAGNOSTICS=1` | Release pack plus the on-device AI diagnostics screen | Not release evidence |
| Demo | `EXPO_PUBLIC_DEMO_BUILD=1` | Release pack plus **unverified** road-route drafts, an **invented** Luzon network and invented "DEMO connector" links so every pair of demo places plans; own database. The per-screen test-data banner is hidden in this build; About and the coverage notes on every result still say it is a demonstration network | Not release evidence; never present as real coverage |

All three share one package name, so installing one replaces another. Build each from a clean state (Metro caches the flag): [runbook](docs/evidence/android-build-runbook.md), [handoff for whoever builds](docs/evidence/apk-build-handoff.md) and `scripts/build-all-apks.ps1`. After building, check each APK with `npx tsx scripts/check-bundle-clean.ts <apk> --expect release` (or `--expect demo`). Phone steps and the evidence form: [phone test script](#phone-test-script-android).

## Phone test script (Android)

**Status: every step is Not Run.** No APK from current `main` exists yet and no one has run the app on a phone. This page is the script and the form. Fill a cell only after a person has watched the result on the phone.

Android only. iOS is out of scope. Test the **release APK only** (no flags, frozen pack `lrt1_2026_10_10_1`, LRT-1 stations only). The benchmark and demo builds are never release evidence. Do not mix builds: they share one package name, so installing one replaces another. Record which build is installed before every session.

How to use it: do the step, look at the phone, write **Pass**, **Fail** or **Not Run** in the Result column, and put anything unexpected in Notes. For a Fail, write what the screen showed. Never write Pass for a step you did not see. Then copy the step results into [`docs/evidence/physical-release.json`](docs/evidence/physical-release.json) using the mapping at the end.

### Session record (fill in once per session)

| Field | Value |
|---|---|
| Date and time (PHT) | |
| Tester | |
| Phone model, Android version | (`adb shell getprop ro.product.model`, `adb shell getprop ro.build.version.release`) |
| Free storage before | (`adb shell df /data`) |
| APK file name | |
| APK SHA-256 | |
| Source commit | |
| Pack version shown in the app | |
| Model revision | `9217f5db79a29953eb74d5343926648285ec7e67` |

### A. Install the right file

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-01 | On the build machine run `Get-FileHash <release apk> -Algorithm SHA256`. Compare with the entry in `docs/evidence/native-artifacts.json`. | The two hashes are identical and the entry is labelled `release`. If not, stop. | Session record | Not Run |
| P-02 | `adb devices`, then `adb install -r <release apk>`. | `Success`. Then `adb shell pm path ph.alalaybyahe.app` and `adb pull <that path> installed.apk`; `Get-FileHash installed.apk` equals the P-01 hash. | Session record | Not Run |
| P-03 | Open the app from the launcher. | The Home screen appears. About shows coverage "LRT-1 only" and **no** test-data banner on any screen. If a Luzon place appears, this is the demo build: stop. | Notes | Not Run |

### B. Cold launch without Metro or USB

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-04 | Make sure no Metro/dev server is running on the laptop. Unplug USB. Force-quit the app (recents, swipe away). Launch it from the home screen. | It opens to Home with no red/yellow error screen, no "Unable to load script", no dev menu. | standaloneColdLaunch | Not Run |
| P-05 | Open **Setup and status**. | "Transit data: Loaded", pack version `lrt1_2026_10_10_1`, coverage "LRT-1 only". AI is shown separately and says "Not downloaded" (first run). | Notes | Not Run |

### C. Model download, hash and persistence

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-06 | On Wi-Fi with at least 600 MB free, tap **Download and set up** once. Note the start time. | Progress rises from 0 to 100% ("Downloading the model"). Cancel is offered. It never starts without the tap. | Notes (minutes, MB/s) | Not Run |
| P-07 | Wait for the file check. | "Checking the downloaded file (SHA-256)", then "Starting the model", then **Ready (qwen2.5-0.5b-q4_k_m)**. Expected file size 491,400,032 bytes. A hash failure must show an error and **not** Ready. | Notes (time to Ready) | Not Run |
| P-08 | Force-quit and relaunch (still online or offline). | AI becomes Ready again without downloading. Free storage dropped by about 0.5 GB and not by 1 GB (no duplicate file). | Notes | Not Run |
| P-09 | Optional, on a spare install or after clearing app data: start the download, then turn Wi-Fi off partway. | The download stops with a retryable message, no partial file is used, and the app does **not** show Ready. Turn Wi-Fi back on and retry. | Notes | Not Run |

### D. Data persists across restart

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-10 | Force-quit, relaunch, open Setup. | Transit data still **Loaded**, same pack version and date. | nativeSqliteRestart | Not Run |
| P-11 | Reboot the phone, open the app, open Setup. | Same as P-10. | nativeSqliteRestart | Not Run |

Limit of this test: the release build can reinstall its bundled pack when the database is empty, and the screen looks the same. These steps show the pack is available after restart, not that it was read from a previously saved file. Do not describe them as more than that.

### E. Fresh phone-local extraction into real routing

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-12 | With the model Ready, type a new sentence not used before, for example: `Paano pumunta mula Vito Cruz papuntang Baclaran?` and tap **Read my trip**. | The confirm screen opens in a few seconds. It states the trip was read by AI on this phone with the model name. Origin Vito Cruz and destination Baclaran are shown as editable fields. **Nothing is routed yet.** Write the elapsed time (stopwatch). | phoneLocalInference | Not Run |
| P-13 | Check the roles. | Origin is Vito Cruz, destination Baclaran, not swapped. If swapped or wrong, record Fail with a photo; it must have been flagged for confirmation. | Notes | Not Run |
| P-14 | Confirm and tap **Find verified routes**. | One LRT-1 ride, board "Vito Cruz (LRT-1 platform)", sign "Dr. Santos", get off "Baclaran (LRT-1 platform)", 0 transfers, **₱21.00 total (verified)**, warnings that routes are documented not live. | phoneLocalInference | Not Run |
| P-15 | Type `Pauwi na ako.` and read it. | A request to choose a destination/home. No guessed place, no route. | Notes | Not Run |
| P-16 | Type `Lipa papuntang Candelaria` and confirm if offered. | No stored match or "No verified complete journey available". **No route is shown.** The supported coverage is stated. | Notes | Not Run |

### F. Cancel and background recovery

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-17 | Tap **Read my trip** and immediately tap **Cancel**. | The reading stops; no stale result appears afterwards. A new query then works. | cancellationAndRecovery | Not Run |
| P-18 | Tap **Read my trip**, then press Home to background the app before the result. Return after 10 seconds. | No crash. No result from the abandoned query is shown. A fresh query works. | cancellationAndRecovery | Not Run |
| P-19 | On a confirmed draft, background and return. | The completed draft is still editable. | cancellationAndRecovery | Not Run |
| P-20 | Double-tap **Read my trip** quickly. | One job runs; no duplicate results. | cancellationAndRecovery | Not Run |

### G. Offline proof (the headline claim)

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-21 | Stop Metro. Unplug USB. Turn on airplane mode, then turn **off** Wi-Fi and Bluetooth individually. Force-quit the app. Take a photo or screenshot showing airplane mode. | Radios are off. | airplaneModeFreshQuery | Not Run |
| P-22 | Launch the installed release app. Open Setup. | Data Loaded, AI Ready, no network needed. The offline note is shown. | airplaneModeFreshQuery | Not Run |
| P-23 | Type a **new** sentence not used in P-12 (for example `Gil Puyat hanggang Quirino, ayoko ng bus`), read it, confirm, route it. | AI-read fields, then a real LRT-1 journey with a fare, all offline. Write the query, the elapsed time, and attach a screen recording. | airplaneModeFreshQuery | Not Run |
| P-24 | Repeat once more with another new sentence. | Works again, so it was not a one-off. | airplaneModeFreshQuery | Not Run |
| P-25 | Reboot the phone with airplane mode still on, repeat P-23. | Works after reboot. | airplaneModeFreshQuery | Not Run |

A screenshot of an old result is not evidence of fresh inference. The query text and a recording are.

### H. Result summary

| Group | Steps | Result |
|---|---|---|
| Install by hash | P-01 to P-03 | Not Run |
| Cold launch | P-04, P-05 | Not Run |
| Model download and hash | P-06 to P-09 | Not Run |
| Data persistence | P-10, P-11 | Not Run |
| Fresh extraction into routing | P-12 to P-16 | Not Run |
| Cancel and recovery | P-17 to P-20 | Not Run |
| Offline proof | P-21 to P-25 | Not Run |

### Mapping to `physical-release.json`

Set a flag to `true` only when every listed step is Pass and was witnessed. Leave it `false` otherwise. `release:check` requires all five, plus the artifact hash, source commit, pack version and model revision to match the entry in `native-artifacts.json`.

| Flag | Requires |
|---|---|
| standaloneColdLaunch | P-01, P-02, P-03, P-04, P-05 |
| nativeSqliteRestart | P-10, P-11 |
| phoneLocalInference | P-07, P-12, P-13, P-14 |
| airplaneModeFreshQuery | P-21 to P-25 |
| cancellationAndRecovery | P-17 to P-20 |

Set `checkedAt` to the time you finished (ISO 8601 with +08:00). Fill `artifactSha256`, `sourceCommit` and `packVersion` from the actual installed release APK, not from memory.


## Connect verified data

Member 2 supplies `assets/data/release.json` with actual source-backed coverage (currently `pack_lrt1`, LRT-1 stations only). Run `npm run data:validate -- assets/data/release.json --release`. `src/application/bundled-pack.ts` imports that reviewed JSON; any pack change is a runtime change and requires a rebuild and a new physical test.

On an empty database, application startup installs the validated bundled release pack transactionally. Existing installed data is retained; updates go through `TransitRepository.replacePack`. Corrupt metadata, indexes, aliases and payloads fail validation. Test fixtures are never loaded into the native composition.

Mode, walking, direct-only and budget preferences remain strict. Unknown fare is null; a known subtotal is not a complete total. Onboard planning starts at a manually confirmed legal next stop and evaluates the full onward journey. It does not track the vehicle.

## Local AI setup and offline boundary

The setup screen explicitly downloads Qwen2.5 0.5B Instruct Q4_K_M: **491,400,032 bytes**, pinned revision and SHA-256. It downloads to a private partial file, hashes bounded chunks, and promotes only a verified file. Setup can be cancelled/retried. Boot never silently downloads the model. Download speed, peak RAM and phone accuracy remain unmeasured.

After setup, the target is local extraction plus offline journeys for stored places and a verified installed graph. New arbitrary addresses/walking paths may need an explicit online helper. Helpers are disabled; no cloud AI or paid service is wired. Scanner/OCR and maps are outside the overnight P0 baseline.

## Disclosures, attribution and limitations

Draft for the submission and the video. Everything here was checked against the repository on 2026-10-10. It states what the code does and what data it holds. It does **not** state any device result: nothing has been run on a phone yet.

### What the app is

An Android commute assistant for Filipino, English and Taglish requests. A small language model reads the typed request and fills in origin, destination and preferences. The user confirms those fields. A deterministic engine then plans a journey from stored, source-checked data. **iOS was excluded on 2026-10-10 because of limited resources; the app is Android only.**

### What the language model does and does not do

- It runs **on the phone** through llama.rn 0.12.9. It extracts fields (origin, destination, mode limits, walking limits, budget, priority) and, for a route the engine has already planned, writes a short **trip summary**. It never supplies routes, stops, directions, walking paths, fares or instructions.
- **Trip summary** (approved exception to the "no model-written travel text" rule, contract §4 amendment): the model gets only that route's verified facts. Its text is shown only if it contains no number, fare, time, speed or "live" claim that is not in the facts and names the first boarding stop and the final stop in order; otherwise a plain summary from the route data is shown and labelled "the AI was not used". The numbered steps stay on screen and remain the authority. A typed trip and a manually picked trip get the same summary.
- Spelling hints sent to the model are the stored places the request mentions, not a fixed list, so every stored place is treated alike.
- Its output is parsed and validated; truncated or malformed output is rejected. Every extracted field is shown for confirmation before any route is planned. A language model can still mis-read roles or places; that is why confirmation is mandatory.
- Model: Qwen2.5-0.5B-Instruct, Q4_K_M, Apache-2.0, revision `9217f5db79a29953eb74d5343926648285ec7e67`, 491,400,032 bytes, SHA-256 `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`. The weights are not in the repository or the APK.
- **Phone inference has not been verified.** Accuracy, speed and memory on a phone are unmeasured. Tests in the repository use a fake runtime.

### What leaves the phone

| Item | Detail |
|---|---|
| Typed request | Stays on the device. There is no cloud AI endpoint and no analytics. The app contains no `fetch`, XHR or WebSocket calls; the only network requests are the model download and the optional map picture below. |
| Model download | One explicit tap on "Download and set up" downloads the model file from the pinned Hugging Face URL to private app storage, checks size and SHA-256, and only then uses it. Hugging Face can see the phone's IP address and the request. |
| Location | Used only by the optional near-stop alert ("Notify me"), in the foreground, after the user starts it and grants permission. The position stays on the phone, except when the optional map picture is shown while an alert runs (see below). |
| Optional map picture | Off unless the APK was built with `EXPO_PUBLIC_GEOAPIFY_KEY`. Nothing is requested until the user taps "Show map (uses internet)". The request sends the trip's stop coordinates, and the phone's position while an alert runs, to Geoapify (free tier, attribution shown). **A key set at build time is embedded in the APK**, which contract §8 says provider keys must not be; leave it unset for the release build until it goes through a proxy. |
| Online address and walking helpers | **Off by default** (`enableOnlineHelpers: false`) and not wired to any provider. If ever enabled they would need an explicit user action and would send only a selected address or coordinates, never the typed conversation. |
| Build time (not in the app) | The demo build's walking distances were computed by the team on a public Valhalla routing server (FOSSGIS) over OpenStreetMap data, and place coordinates came from Nominatim, while building the data, not from the phone. |

No paid service is used and no paid tier or automatic upgrade exists.

### Data in each build

| Build | Contents | Status |
|---|---|---|
| **Release** (the only build recorded as release evidence) | `pack_lrt1`, version `lrt1_2026_10_10_1`, SHA-256 `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`: LRT-1 only, 25 stations, ride legs in both directions and stored-value fares between every pair. **No walking links, no entrances, no road services.** | Transcription independently reviewed on 2026-10-10 (routing facts `verified`). Station coordinates are `estimated` (approximate). |
| Benchmark | The release pack plus the on-device AI diagnostics screen (`EXPO_PUBLIC_AI_DIAGNOSTICS=1`) | Not release evidence |
| **Demo** | The release pack plus **unverified** road-route drafts from teammate reports, an **invented** Luzon network of 45 places and 33 lines, and invented "DEMO connector" links (9 short walks, 3 sample lines) so all 6,480 ordered pairs of demo places plan; separate database. The per-screen banner is hidden; About and the coverage notes say it is a demonstration network | Not release evidence. Never present as real coverage. |

### Sources and attribution

| Item | Source | Licence / terms |
|---|---|---|
| LRT-1 stored-value fares and station order | LRMC "New LRT-1 Stored Value Fare Matrix", effective April 2, 2025, published on lrmc.ph (the file names on the site are swapped; the title inside the image was used) | Operator publication, transcribed and cited. Fares are for stored-value cards, not single-journey tickets. |
| Station coordinates | Wikipedia station articles (MediaWiki API) and OpenStreetMap via Nominatim | Wikipedia: CC BY-SA 4.0. OpenStreetMap data: ODbL 1.0, **© OpenStreetMap contributors**. Approximate points, not entrances. |
| Demo walks and demo place pins | Valhalla routing on OpenStreetMap data (FOSSGIS server), Nominatim | ODbL 1.0, **© OpenStreetMap contributors**. Computed, not walked. |
| Language model | Qwen2.5-0.5B-Instruct-GGUF by the Qwen team | Apache-2.0 |
| Optional map picture | Geoapify Static Maps (only if built with a key and the user taps Show map) | Free tier; attribution shown under the map: Geoapify, OpenMapTiles, © OpenStreetMap contributors |
| Runtime and libraries | llama.rn 0.12.9, React Native 0.86.3, Expo 57.0.27, expo-sqlite, expo-router, expo-file-system, React 19.2.3, @noble/hashes 2.4.0 | MIT (read from the installed `package.json` files) |

### Known limitations (state these plainly)

- **None of the three target corridors is supported end to end:** Lipa to Candelaria, Lipa to San Pablo, Candelaria to Vito Cruz/Taft. Only the LRT-1 leg has verified data. The road legs exist only as unverified drafts in the demo build.
- The release build routes between LRT-1 stations only. Because it has no walking links, a journey can only start and end at a station.
- No live arrivals, no vehicle tracking, no "fastest" claim, no traffic. Routes are documented, not live availability; users must confirm the service and its direction.
- Fares are stored-value fares. Unknown fares are shown as unknown, never zero; a partial subtotal is labelled as not the full total. No student/senior/PWD discount is documented, so the regular fare is shown as an estimate.
- Offline use depends on the model and data being set up first (one-time download). New addresses and uncached walking paths are not supported offline.
- Android only. iOS was never built or tested.
- **Not yet verified on any phone:** local inference, the AI trip summary's quality and speed, the near-stop alert with real GPS, the optional map request, offline operation, SQLite persistence, cold launch, memory and speed.
- The demo build's connectors and road drafts are invented or unverified; demo journeys are samples, not travel advice.
- 19 high npm advisories remain in build tooling (`braces`, `node-forge`) with no published fix; they are not in the app bundle. See `docs/evidence/dependency-advisories.md`.

### AI-assisted development disclosure

The code and documents were written with AI coding assistants in a four-role workflow. As reported by the team on 2026-10-10:

| Member | Role | AI assistant(s) used |
|---|---|---|
| Member 1 | Local AI | Claude |
| Member 2 | Data and routing | Claude and Codex |
| Member 3 | Frontend | Claude |
| Member 4 | Integration, release and QA | Claude (Claude Code) |

Product names only, as reported; specific model versions are not recorded here and should be added only if the team can state them accurately. These tools were used to write code, tests and documents; the people on the team directed the work, reviewed it, and ran the data review. The language model that runs inside the app (Qwen2.5-0.5B-Instruct) is separate from these development tools.


### Dependency advisories

`npm audit` reports 19 high advisories, all from two root advisories: `braces` (denial of service on deeply nested glob patterns, GHSA-vfj7-8cjw-p6xm) and `node-forge` (RSA signature verification, GHSA-86w9-cpqp-85rv). Both are already at their latest published versions, so no fixed release exists, and the only offered fix is an incompatible downgrade to Expo 44, which was not applied. A source-map check of the Android bundle (1,370 source files, 63 packages) shows neither package, nor Metro or `@expo/cli`, is in the app; they run only on the developer machine at build time. No dependency was changed. Details and method: [docs/evidence/dependency-advisories.md](docs/evidence/dependency-advisories.md).

## Event requirements check

**This is not a compliance claim.** The participant briefing PDF is still missing. Below, every requirement is marked **Verified** (checked directly against a named source today), **Repo fact** (true of this repository, but not proof that it satisfies the rule), or **Unverified, needs the official brief**. Do not tick "compliant" on this page.

Source of the event rules: the public event page, `https://cerebralvalley.ai/e/appbuildersph-hackathon-2026` ("AppBuildersPH Devin Hackathon 2026"), fetched on 2026-10-10. The team's pasted rules (rubric weights, 5-minute pitch, 3-minute Q&A, one submission, 25/25/20/15/15 scoring) came from the team's own prompts, not from this page.

### A. Stated on the public event page (Verified)

| Requirement | What the page says |
|---|---|
| Team size | 1 to 4 people; solo allowed |
| Built during the event | Everything must be built during the hackathon |
| Tools | Open-source libraries and AI coding tools are allowed but **must be disclosed** |
| Submission contents | A code repository and a demo video, submitted before "the deadline" |
| Demo Day | Saturday 2026-10-10, 1:00 to 7:00 PM, in person at Cyberzone, SM Makati; finalists must be physically present |
| Build window | Listed event window 2026-10-09 1:00 PM to 2026-10-10 7:00 PM (GMT+8); described as 24 hours; kickoff 1:00 PM on Oct 9 |
| Social posts | Participants are asked to post on X and LinkedIn and tag @cognition and Devin |
| Awards | Hackathon Champion, sponsor awards, People's Choice, Best Product Experience |

### B. Not stated on the page (Unverified, needs the official brief)

| Item | Status |
|---|---|
| **Exact submission deadline** | **Not stated.** Our internal 10:00 AM PHT on 2026-10-10 comes from the team's pasted prompts. The page's own event window runs to 7:00 PM, so 10:00 AM may be earlier than the real deadline. Keep it as the conservative internal target; do not call it official. |
| Where and how to submit (portal, form) | Not stated |
| Judging criteria and weights | Not stated (the team's 25/25/20/15/15 split is unconfirmed) |
| Pitch length, Q&A length | Not stated (the 5-minute/3-minute figures are unconfirmed) |
| Required hashtag and exact post format | Hashtag **not stated**; only "tag @cognition and Devin" |
| Video length and format | "~1 minute" is the team's assumption; the page says only "a demo video" |
| Whether the repository must be public | Not stated on the page (see "Repo fact" below) |
| One submission per team | Not stated |
| Whether using a tool other than Devin is acceptable | The page allows "AI coding tools" with disclosure; it does not require Devin. The team used Claude Code and other assistants; disclose them. |
| Rule on outside human help | Not stated on the page |
| Registration deadline | Not stated |

### C. Facts about this repository (Repo fact)

| Item | Finding | Caveat |
|---|---|---|
| Repository visibility | Public: an unauthenticated GitHub API request for `arossmanalo/AlalayByahe` returned HTTP 200 on 2026-10-10 | Visibility may change; recheck before submitting |
| Built during the event | First commit on `main` is 2026-10-09 20:51 +0800, after the 1:00 PM kickoff | The file layout and documents were planned in the same window; a clean history does not prove nothing pre-existed, so the team should confirm |
| Open-source and AI-tool disclosure | The Disclosures section above lists libraries, licences, the model and, as reported by the team on 2026-10-10, the AI assistants: Claude (Members 1, 3 and 4, with Member 4 using Claude Code) and Claude plus Codex (Member 2) | Based on the team's statement, not independently checked. Add versions only if accurate. The page requires disclosure; the exact form it takes is not stated |
| Licence file | **There is no `LICENSE` file** in the repository | Choosing a licence is the team's decision. Dependencies are MIT/Apache-2.0 (see disclosures). Not created here |
| Team size | `git log` shows five author names on `main`: Aryl Manalo, Aryl Ross A. Manalo, Yohann Joachim Zapata, Allen, EnzoGRosas | Two names are probably one person on two git identities, but the page limits teams to 4. The team should confirm the registered members. Do not assume |
| Demo video | None exists | Not Run |
| Social posts | None published; draft only in `docs/submission.md` | Needs the user's authorization and the missing format details |
| Secrets, signing material, model files | `.gitignore` excludes `*.gguf`, `*.apk`, keystores, `.env`; `release:check` fails if such files are tracked | Passing today; rechecked by `npm run release:check` |
| No paid services | None configured in the code; online helpers disabled | Confirmed in the Disclosures section above |

### D. Open items for the user

1. Get the official briefing and fill section B. Until then no document should say "compliant".
2. Confirm the real submission deadline and where to submit. If it is later than 10:00 AM the team has more time, but the internal target is safer.
3. Confirm the registered team (at most 4) against the five git author names.
4. Decide on a licence and add a `LICENSE` file.
5. Confirm the AI-tool list in the AI-assisted development disclosure above (Claude; Codex for Member 2) is complete and correct, since it is based on a verbal report.
6. Decide whether the team will present at Demo Day (finalists must attend in person) and what runs on the demo phone.


## Team integration

- Member 1: `src/ai/`; real model acquisition, extraction and lifecycle.
- Member 2: `src/data/`, `src/routing/`; pack/source validation and deterministic search/fares.
- Member 3: `app/`, `src/ui/`; native screens and presentation.
- Member 4: contracts, lock/config, `src/storage/`, `src/application/`, build/release checks and merges.

Screens receive real ports through `NativeUiBridge`/`UiProvider`; the shared application owns initialization and background cancellation. AI confirmation keeps its draft query ID, including explicit edits.

See [integration handoff](docs/evidence/integration.md), [execution dashboard](docs/planning/04-team-execution.md), [acceptance plan](docs/planning/06-acceptance-and-demo.md) and [submission draft](docs/submission.md). No post, video upload or event submission has been performed.

Optional maps: [free provider research](docs/evidence/maps-options.md) recommends Geoapify with MapLibre React Native. It is a proposal; map dependencies and online helpers are not enabled.

Optional maps: [free provider research](docs/evidence/maps-options.md) recommends Geoapify with MapLibre React Native. It is a proposal; map dependencies and online helpers are not enabled.
