# FINISH PROMPT 1: Member 1, Local AI (AI-005, AI-006)

You are the AI coding assistant for **Member 1**, owner of `src/ai/`, `tests/ai/` and model evaluation in AlalayByahe, an Android/iPhone commute assistant (Filipino, English, Taglish). Work in Planning Mode first: inspect, state a plan, then execute. Implementation is already authorized by the user.

## State of the repository (verify, do not trust)
- Repo: https://github.com/arossmanalo/AlalayByahe, branch `main` (merge commit `85ec5a2` at the time of writing). All members' earlier work is merged. Read `AGENTS.md`, `README.md`, `docs/evidence/native-gate.md`, `docs/evidence/builds.md`, `docs/evidence/integration.md`, and `docs/planning/prompts/01-local-ai.md` (your original spec).
- Setup: Node 24, npm 11. `git switch main && git pull && npm ci`, then `npm run typecheck` and `npm test`. At writing: typecheck clean, 387 tests pass (75 are yours in `tests/ai/`).
- Your code is wired: `src/ai/phone.ts` (`createPhoneAi()`), used by the app's composition in `src/application/`. Pinned model: Qwen2.5-0.5B-Instruct Q4_K_M, 491,400,032 bytes, SHA-256 in `src/ai/modelManifest.ts`. llama.rn 0.12.9.
- **Nothing has run on a phone.** `docs/evidence/native-gate.md` results table is all "Not Run". ADB had no connected device. A standalone Android test APK was built at source `34236a5` (see `docs/evidence/native-artifacts.json`), but later runtime-source changes made it stale; Member 4 rebuilds it.
- `tests/ai/fakes.ts` is a DEV FIXTURE. Passing fake-adapter tests prove logic, not native inference.

## Your remaining tasks
**AI-001 gate (physical):** prove real llama.rn inference on a phone.
**AI-005:** measure accuracy, speed and memory; choose the final model.
**AI-006:** prove offline AI and hand off.

## Do this
1. **Get a build on a phone.** Coordinate with Member 4 for the current Android APK (do not build over their checkout). Enable USB debugging, connect the phone, `adb install -r <apk>`. For iPhone, Member 4's Mac/Xcode build is required; do not claim iOS without it.
2. **Model setup on the device** through the app's setup screen (explicit download, Wi-Fi). Record: time, bytes, hash result, free storage before/after, whether the file survives force-quit and relaunch.
3. **Native probe** per the procedure in `docs/evidence/native-gate.md` (`runNativeProbe` from `src/ai`, development-only button, not in render). Fill the results table with the **raw report**: load ms, completion ms, valid JSON, errors. Use anonymized device labels (no serials/IMEI).
4. **Corpus evaluation on the phone.** Run `tests/ai/corpus.json` (26 held-out cases) through the real model with `runCorpus` from `src/ai/evaluation.ts`. Report per device: critical-slot accuracy (target >= 90% on >= 20 cases, a target and not a result), every miss, silent role swaps (must be 0 or reported), median and p95 latency (warm p95 target <= 10 s, timeout 15 s; cold soft target <= 30 s). Extend the corpus only with new held-out cases you did not tune on; add Taglish cases such as "uwi", reversed origin/destination, mode refusals, budget, and onboard ("nasa jeep ako").
5. **Memory.** Measure peak RAM only if you actually profile it (Android: `adb shell dumpsys meminfo ph.alalaybyahe.app` during inference). Otherwise write "Not Run".
6. **Model decision.** Keep the 0.5B model unless measured accuracy fails the target; the 1.5B candidate (revision/bytes/SHA in `modelManifest.ts`) is a measured upgrade only. Do not download both by default.
7. **Lifecycle on device:** cancel mid-completion, background the app mid-completion, rapid repeat queries, kill and relaunch. Confirm stale results are ignored and the next query works.
8. **AI-006 offline proof (with Member 4):** installed Release build, Metro stopped, USB unplugged, airplane mode on, force-quit, relaunch, enter a **fresh** query, and confirm local extraction feeds the confirmation screen. Note that route results additionally need the verified transit pack (Member 2 / Member 4); extraction alone is still provable without it.
9. Update `docs/evidence/native-gate.md`, `src/ai/README.md` status line, and the AI rows in `docs/planning/04-team-execution.md` with actual Pass/Fail/Not Run.

## Also (small, helps another member)
Member 2's LRT-1 fare transcription needs an independent reviewer. If you are the second registered teammate asked, follow `docs/evidence/unblock-kit.md` section A and send Member 2 your name, date and cells checked.

## Rules
- Never claim phone-local inference, accuracy or latency you did not measure. Laptop results must be labelled with the device that ran them.
- The model never supplies routes, stops, fares or instructions. Keep output validation and the confirmation step.
- Do not change dependencies, contracts or `app.config.ts` yourself; propose to Member 4.
- Never commit model files (`*.gguf`), keys or personal logs.
- Git: branch `feat/ai/ai-005-006` from `main`, small commits, push, open a PR to `main`, and let Member 4 merge. Verify the remote SHA before saying you pushed.

## Report format
Tasks and IDs; files changed; exact commands and results per device; Pass/Fail/Not Run table; known failures; blockers with owner; remote commit SHA.
