# Android physical test script (INT-006)

**Status: every step is Not Run.** No APK from current `main` exists yet and no one has run the app on a phone. This page is the script and the form. Fill a cell only after a person has watched the result on the phone.

Android only. iOS is out of scope. Test the **release APK only** (no flags, frozen pack `lrt1_2026_10_10_1`, LRT-1 stations only). The benchmark and demo builds are never release evidence. Do not mix builds: they share one package name, so installing one replaces another. Record which build is installed before every session.

How to use it: do the step, look at the phone, write **Pass**, **Fail** or **Not Run** in the Result column, and put anything unexpected in Notes. For a Fail, write what the screen showed. Never write Pass for a step you did not see. Then copy the step results into `docs/evidence/physical-release.json` using the mapping at the end.

## Session record (fill in once per session)

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

## A. Install the right file

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-01 | On the build machine run `Get-FileHash <release apk> -Algorithm SHA256`. Compare with the entry in `docs/evidence/native-artifacts.json`. | The two hashes are identical and the entry is labelled `release`. If not, stop. | Session record | Not Run |
| P-02 | `adb devices`, then `adb install -r <release apk>`. | `Success`. Then `adb shell pm path ph.alalaybyahe.app` and `adb pull <that path> installed.apk`; `Get-FileHash installed.apk` equals the P-01 hash. | Session record | Not Run |
| P-03 | Open the app from the launcher. | The Home screen appears. About shows coverage "LRT-1 only" and **no** test-data banner on any screen. If a banner or a Luzon place appears, this is the demo build: stop. | Notes | Not Run |

## B. Cold launch without Metro or USB

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-04 | Make sure no Metro/dev server is running on the laptop. Unplug USB. Force-quit the app (recents, swipe away). Launch it from the home screen. | It opens to Home with no red/yellow error screen, no "Unable to load script", no dev menu. | standaloneColdLaunch | Not Run |
| P-05 | Open **Setup and status**. | "Transit data: Loaded", pack version `lrt1_2026_10_10_1`, coverage "LRT-1 only". AI is shown separately and says "Not downloaded" (first run). | Notes | Not Run |

## C. Model download, hash and persistence

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-06 | On Wi-Fi with at least 600 MB free, tap **Download and set up** once. Note the start time. | Progress rises from 0 to 100% ("Downloading the model"). Cancel is offered. It never starts without the tap. | Notes (minutes, MB/s) | Not Run |
| P-07 | Wait for the file check. | "Checking the downloaded file (SHA-256)", then "Starting the model", then **Ready (qwen2.5-0.5b-q4_k_m)**. Expected file size 491,400,032 bytes. A hash failure must show an error and **not** Ready. | Notes (time to Ready) | Not Run |
| P-08 | Force-quit and relaunch (still online or offline). | AI becomes Ready again without downloading. Free storage dropped by about 0.5 GB and not by 1 GB (no duplicate file). | Notes | Not Run |
| P-09 | Optional, on a spare install or after clearing app data: start the download, then turn Wi-Fi off partway. | The download stops with a retryable message, no partial file is used, and the app does **not** show Ready. Turn Wi-Fi back on and retry. | Notes | Not Run |

## D. Data persists across restart

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-10 | Force-quit, relaunch, open Setup. | Transit data still **Loaded**, same pack version and date. | nativeSqliteRestart | Not Run |
| P-11 | Reboot the phone, open the app, open Setup. | Same as P-10. | nativeSqliteRestart | Not Run |

Limit of this test: the release build can reinstall its bundled pack when the database is empty, and the screen looks the same. These steps show the pack is available after restart, not that it was read from a previously saved file. Do not describe them as more than that.

## E. Fresh phone-local extraction into real routing

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-12 | With the model Ready, type a new sentence not used before, for example: `Paano pumunta mula Vito Cruz papuntang Baclaran?` and tap **Read my trip**. | The confirm screen opens in a few seconds. It states the trip was read by AI on this phone with the model name. Origin Vito Cruz and destination Baclaran are shown as editable fields. **Nothing is routed yet.** Write the elapsed time (stopwatch). | phoneLocalInference | Not Run |
| P-13 | Check the roles. | Origin is Vito Cruz, destination Baclaran, not swapped. If swapped or wrong, record Fail with a photo; it must have been flagged for confirmation. | Notes | Not Run |
| P-14 | Confirm and tap **Find verified routes**. | One LRT-1 ride, board "Vito Cruz (LRT-1 platform)", sign "Dr. Santos", get off "Baclaran (LRT-1 platform)", 0 transfers, **₱21.00 total (verified)**, warnings that routes are documented not live. | phoneLocalInference | Not Run |
| P-15 | Type `Pauwi na ako.` and read it. | A request to choose a destination/home. No guessed place, no route. | Notes | Not Run |
| P-16 | Type `Lipa papuntang Candelaria` and confirm if offered. | No stored match or "No verified complete journey available". **No route is shown.** The supported coverage is stated. | Notes | Not Run |

## F. Cancel and background recovery

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-17 | Tap **Read my trip** and immediately tap **Cancel**. | The reading stops; no stale result appears afterwards. A new query then works. | cancellationAndRecovery | Not Run |
| P-18 | Tap **Read my trip**, then press Home to background the app before the result. Return after 10 seconds. | No crash. No result from the abandoned query is shown. A fresh query works. | cancellationAndRecovery | Not Run |
| P-19 | On a confirmed draft, background and return. | The completed draft is still editable. | cancellationAndRecovery | Not Run |
| P-20 | Double-tap **Read my trip** quickly. | One job runs; no duplicate results. | cancellationAndRecovery | Not Run |

## G. Offline proof (the headline claim)

| ID | Do | Observe | Record in | Result |
|---|---|---|---|---|
| P-21 | Stop Metro. Unplug USB. Turn on airplane mode, then turn **off** Wi-Fi and Bluetooth individually. Force-quit the app. Take a photo or screenshot showing airplane mode. | Radios are off. | airplaneModeFreshQuery | Not Run |
| P-22 | Launch the installed release app. Open Setup. | Data Loaded, AI Ready, no network needed. The offline note is shown. | airplaneModeFreshQuery | Not Run |
| P-23 | Type a **new** sentence not used in P-12 (for example `Gil Puyat hanggang Quirino, ayoko ng bus`), read it, confirm, route it. | AI-read fields, then a real LRT-1 journey with a fare, all offline. Write the query, the elapsed time, and attach a screen recording. | airplaneModeFreshQuery | Not Run |
| P-24 | Repeat once more with another new sentence. | Works again, so it was not a one-off. | airplaneModeFreshQuery | Not Run |
| P-25 | Reboot the phone with airplane mode still on, repeat P-23. | Works after reboot. | airplaneModeFreshQuery | Not Run |

A screenshot of an old result is not evidence of fresh inference. The query text and a recording are.

## H. Result summary

| Group | Steps | Result |
|---|---|---|
| Install by hash | P-01 to P-03 | Not Run |
| Cold launch | P-04, P-05 | Not Run |
| Model download and hash | P-06 to P-09 | Not Run |
| Data persistence | P-10, P-11 | Not Run |
| Fresh extraction into routing | P-12 to P-16 | Not Run |
| Cancel and recovery | P-17 to P-20 | Not Run |
| Offline proof | P-21 to P-25 | Not Run |

## Mapping to `physical-release.json`

Set a flag to `true` only when every listed step is Pass and was witnessed. Leave it `false` otherwise. `release:check` requires all five, plus the artifact hash, source commit, pack version and model revision to match the entry in `native-artifacts.json`.

| Flag | Requires |
|---|---|
| standaloneColdLaunch | P-01, P-02, P-03, P-04, P-05 |
| nativeSqliteRestart | P-10, P-11 |
| phoneLocalInference | P-07, P-12, P-13, P-14 |
| airplaneModeFreshQuery | P-21 to P-25 |
| cancellationAndRecovery | P-17 to P-20 |

Set `checkedAt` to the time you finished (ISO 8601 with +08:00). Fill `artifactSha256`, `sourceCommit` and `packVersion` from the actual installed release APK, not from memory.
