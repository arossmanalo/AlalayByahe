# ROUND 3 PROMPT 1: Member 1, Local AI (AI-001, AI-005, AI-006 on the Android phone)

You are the AI coding assistant for **Member 1**, owner of `src/ai/`, `tests/ai/` and model evaluation in AlalayByahe. Plan first, then execute. Read `docs/planning/prompts/round3/00-shared-state.md` first; it is part of this prompt.

## Where you are
Your tooling is merged: `src/ai/diagnostics.ts`, `app/dev-ai.tsx` (deep link `alalaybyahe://dev-ai`, enabled in development builds, or in a release build only with `EXPO_PUBLIC_AI_DIAGNOSTICS=1`), the 42-case corpus v2, and your locale decision (keep `"taglish"`; the *Compare: per-case locale* button measures the alternative). Your Honor X9b 5G (Android 15) is connected and authorized. **AI-001, AI-005 and AI-006 are all Not Run**, waiting on Member 4's APKs. Evidence logs: `docs/evidence/native-gate.md`, `ai-benchmarks.md`, `offline-ai.md`. iPhone rows are marked out of scope.

## You need from Member 4
- the **benchmark APK** (diagnostics flag) and the **release APK** (no flags), each with file name, source commit and SHA-256 (check the hash before `adb install -r`). You do not need the demo APK, but if you receive it do not use it for any measurement.

## Do this (Honor X9b first; any second Android phone only as a bonus)
1. **AI-001 gate.** Install the benchmark APK. Model setup on Wi-Fi through the Setup screen: record time, bytes, hash result, free storage before and after; force-quit, relaunch, confirm it is not downloaded again. Run the probe from `alalaybyahe://dev-ai`; paste the raw report into `native-gate.md`. A failure is a Fail: record the exact error and stop that gate.
2. **AI-005.** Two corpus runs back to back with the app locale (thermals), then one per-case locale comparison. Capture `adb logcat -d -s ReactNativeJS` lines tagged `[AI-DIAG]`. Fill `ai-benchmarks.md`: exact critical-slot rate (target >= 90% on >= 20 cases is a target, not a result), silent role swaps (must be 0 or reported), cold ms, warm median and p95 (targets warm p95 <= 10 s, timeout 15 s, cold <= 30 s soft), every miss with raw output. Memory only if you actually profiled it (`adb shell dumpsys meminfo ph.alalaybyahe.app`).
3. **Decisions from data.** Keep Qwen2.5 0.5B unless the measured rate misses the target and the 1.5B candidate fits the phone's storage and latency. Keep `taglish` unless the per-case comparison is clearly better on the same corpus; if you want a change, send Members 3 and 4 both reports.
4. **AI-004 on the device:** the automatic lifecycle checks, plus manual background mid-query and force-quit and relaunch.
5. **AI-006 offline proof with the release APK** (no diagnostics flag): Metro stopped, USB unplugged, airplane mode on, Wi-Fi and Bluetooth off, force-quit, relaunch, a **fresh** query not in the corpus (for example a Taglish sentence naming two LRT-1 stations), then a second fresh query, then "Pauwi na ako." (must ask for a place, not guess). Screen recording or screenshots, no personal data. Extraction feeding the real journey also needs the frozen LRT-1 pack, which is bundled.
6. Update the status line in `src/ai/README.md` and the AI rows of `docs/planning/04-team-execution.md` with actual Pass, Fail or Not Run only. Open the PR from `feat/ai/ai-005-006-results` (or a new branch) after real results exist.

## Rules
- Never claim inference, accuracy, latency or memory you did not measure; label laptop results with the device that produced them.
- The model never supplies routes, stops, fares or instructions. Keep validation and the confirmation step.
- Do not change dependencies, contracts, `app.config.ts` or the manifest; propose to Member 4. No `*.gguf`, keys or personal logs in Git.

## Report
Tasks and IDs; device, OS, build commit, artifact SHA-256, pack version; exact commands and results; Pass/Fail/Not Run table; every miss; blockers with owner; remote SHA.
