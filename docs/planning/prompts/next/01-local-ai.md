# NEXT PROMPT 1: Member 1, Local AI (AI-001 gate, AI-005, AI-006)

> **Scope change (2026-10-10): iOS is excluded.** The team dropped iPhone because of limited resources, so Android is the only target platform. Read every iOS/iPhone requirement below as out of scope; it is kept as history. No iOS native build, signing, install or inference has been done or claimed.

You are the AI coding assistant for **Member 1**, owner of `src/ai/`, `tests/ai/` and model evaluation in AlalayByahe. Plan first, then execute. Implementation is authorized.

## State of `main` (verify, do not trust)
- Repo https://github.com/arossmanalo/AlalayByahe, `main` at merge `8ae8c16` or later. `git switch main && git pull && npm ci`. Expect `npm run typecheck` clean and `npm test` 442 passing (about 80 are AI tests).
- Your branch `feat/ai/ai-005-006` is **merged** (inside PR #6): `src/ai/diagnostics.ts`, development screen `app/dev-ai.tsx` (deep link `alalaybyahe://dev-ai`; enabled in development builds, and in release builds only when built with `EXPO_PUBLIC_AI_DIAGNOSTICS=1`), 42-case held-out corpus v2 at `src/ai/corpus.json`, procedures in `docs/evidence/native-gate.md`, `ai-benchmarks.md`, `offline-ai.md`.
- The app now bundles the reviewed LRT-1 pack (stations only), so a fresh query can produce a real journey between LRT-1 stations. Everything else says "No verified complete journey available."
- `npm run release:check` is blocked by three items: no Android physical evidence, no iOS physical evidence, and a stale Android artifact (the recorded APK predates the pack and your diagnostics). **Nothing has run on a phone yet.** Your gates AI-001, AI-005 and AI-006 are all Not Run.

## What you need first (do not try to build around it)
Member 4 must give you a **freshly built Android APK from current `main`**. Two different builds are needed and they must not be confused:
1. a **benchmark build** with `EXPO_PUBLIC_AI_DIAGNOSTICS=1` (for the probe, corpus run and lifecycle checks), and
2. the **release build without that flag** (for the AI-006 offline proof, and the build that physical evidence is recorded against).
Ask Member 4 for each APK's file name, source commit and SHA-256. A phone report must match the artifact hash and commit in `docs/evidence/native-artifacts.json`.

## Do this (Android first; iPhone only after Member 4's Mac build)
1. Install the benchmark APK (`adb install -r`), connect the phone, enable USB debugging. Record anonymized device label, OS, free storage, battery state.
2. **AI-001 gate:** download the model through the setup screen (Wi-Fi), watch size and SHA-256 verification, force-quit and relaunch to confirm it persists. Run the probe from `alalaybyahe://dev-ai` and fill the results table in `native-gate.md` with the raw report: load ms, completion ms, valid JSON, any error. A failure is a Fail; record the exact error and stop.
3. **AI-005:** run the corpus benchmark from the diagnostics screen twice back to back and capture the `[AI-DIAG]` JSON (`adb logcat -d -s ReactNativeJS`). Fill `ai-benchmarks.md`: exact critical-slot rate (target >= 90% on >= 20 cases, which is a target and not a result), every miss with raw output and failed slots, silent role swaps (must be 0 or reported), cold ms, warm median and p95 (targets warm p95 <= 10 s, timeout 15 s, cold <= 30 s soft). Record whether the second run was slower (thermals). Measure memory only if profiled (`adb shell dumpsys meminfo ph.alalaybyahe.app` before load, after load, during a completion); otherwise write Not Run.
4. **Model decision:** keep Qwen2.5-0.5B unless the measured rate misses the target and the 1.5B candidate fits storage and latency on that phone. A model change goes through Member 4's manifest and a contract note, before the freeze, and needs its own measured run.
5. **Lifecycle on the device:** cancel mid-completion, background the app mid-completion, rapid repeated queries, force-quit and relaunch. Confirm stale results are ignored and the next query works.
6. **AI-006 offline proof (with Member 4):** install the **release** build (no diagnostics flag). Stop Metro, unplug USB, airplane mode on and Wi-Fi and Bluetooth off, force-quit, relaunch, type a **fresh** query not in the corpus (for example a Taglish sentence naming two LRT-1 stations such as "Paano pumunta mula Vito Cruz papuntang Baclaran?"), and confirm local extraction feeds the editable confirmation screen, then the journey. Submit a second fresh query. Also run "Pauwi na ako." and expect a request for a place, not a guess. Record elapsed ms and take screenshots without personal data.
7. Update `native-gate.md`, `ai-benchmarks.md`, `offline-ai.md`, the `src/ai/README.md` status line and the AI rows of `docs/planning/04-team-execution.md` with actual Pass/Fail/Not Run only.
8. Only if a measured failure demands it: fix `src/ai/` (prompt, grammar, validation) and re-measure. Do not tune on the held-out corpus; add new held-out cases instead.

## Small decisions waiting on you
- `ExtractInput.locale` is currently fixed to `"taglish"` by the UI. Tell Member 3 and Member 4 whether the model prefers another value, and show evidence from a measured comparison if you change it.
- Member 3 proposes localizing engine text; that needs stable codes from Members 2 and 4. Say whether the AI side has any need for it (probably not).

## Rules
- Never claim inference, accuracy, latency or memory you did not measure, and label every laptop result with the device that produced it.
- The model never supplies routes, stops, fares or instructions. Keep validation and the confirmation step.
- Do not change dependencies, contracts, `app.config.ts` or the manifest yourself; propose to Member 4.
- No `*.gguf`, keys or personal logs in Git. Do not edit `app/_layout.tsx`.
- Git: branch `feat/ai/ai-005-006-results` from `main`, small commits, push, open a PR to `main`; Member 4 merges. Verify the remote SHA.

## Report format
Tasks and IDs; devices, OS, build commit, artifact SHA-256, pack version; exact commands and results; Pass/Fail/Not Run table; every miss; blockers with owner; remote SHA.
