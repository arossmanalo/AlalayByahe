# src/ai — Local AI (Member 1)

Phone-local Taglish/Filipino/English intent extraction for AlalayByahe, implementing `AiPort` from shared contract v1.0. The model interprets language only. It never produces routes, stops, fares or instructions, and its output is validated before anyone sees it.

**Status (2026-10-10 ~03:20 PHT, `main` `69536ea`, branch `feat/ai/round3-device-results`):** Android only; iOS is descoped. Logic and native adapters are integrated, typechecked and covered by Node tests with fake adapters (490 total). Device tooling is merged, and every diagnostics report now records which build produced it (diagnostics flag, demo flag, loaded pack). The screen refuses to run on a demo build. **No physical-device run has happened yet.** AI-001, AI-005 and AI-006 are **Not Run**, waiting for Member 4's benchmark and release APKs. The Honor X9b 5G (Android 15) is authorized but was unplugged at 03:09. Evidence: `docs/evidence/native-gate.md`, `ai-benchmarks.md`, `offline-ai.md`.

## Files

| File | Task | Purpose | Native imports |
|---|---|---|---|
| `modelManifest.ts` | AI-002 | Pinned Qwen2.5 0.5B Q4_K_M manifest, 1.5B candidate (not downloaded), expected runtime, inference settings | no |
| `modelStore.ts` | AI-002 | Explicit download to `.part`, size check, bounded incremental SHA256, atomic promote, verification marker | no (ports) |
| `expoModelFiles.ts` | AI-002 | `ModelFiles` port over expo-file-system 57 (`File`, `Directory`, `Paths`, `createDownloadTask`, `FileHandle.readBytes`) | expo-file-system |
| `nobleSha256.ts` | AI-002 | `@noble/hashes` 2.4.0 incremental `sha256.create()/update()/digest()` | @noble/hashes |
| `extractionSchema.ts` | AI-003 | Canonical RawIntent JSON Schema (test-enforced identical to the contract doc) | no |
| `prompt.ts` | AI-003 | Short fixed system prompt + 2 examples (stable, cacheable prefix); query delimited as data | no |
| `validateIntent.ts` | AI-003 | Structural RawIntent validation + deterministic semantic notes | no |
| `extract.ts` | AI-003 | Input limits, completion request, rejection of truncated/interrupted/limit-hit output | no |
| `runtime.ts` | AI-001/004 | `LlamaRuntime`/`LlamaSession` port | no |
| `llamaRnRuntime.ts` | AI-001 | llama.rn 0.12.9 adapter: `initLlama`, `completion` with `response_format: json_schema`, `stopCompletion`, `release` | llama.rn |
| `manager.ts` | AI-004 | `AiPort` implementation: one context, one active completion, queryId correlation, timeout/cancel with awaited native stop | no |
| `nativeProbe.ts` | AI-001 | One-shot load → schema-constrained completion → release report for the native gate | no |
| `evaluation.ts` | AI-003/005 | Held-out corpus scoring (exact critical slots, silent role swaps, cold vs warm median/p95) and `runCorpus` | no |
| `corpus.json`, `corpus.ts` | AI-003/005 | 42 held-out cases (v2) and typed loader; evaluation inputs, not transit data | no |
| `diagnostics.ts` | AI-001/004/005 | Device runners: probe (releases/reloads the app model), corpus benchmark with raw output for misses, lifecycle checks | no |
| `index.ts` | — | Pure exports (safe in Node tests) | no |
| `phone.ts` | — | Native wiring: `createPhoneAi()` | yes |

The development-only screen `app/dev-ai.tsx` (deep link `alalaybyahe://dev-ai`) drives `diagnostics.ts` on a phone. It is enabled in development builds, and in release builds only when built with `EXPO_PUBLIC_AI_DIAGNOSTICS=1`. Reports are shown on screen and logged with `[AI-DIAG]`; nothing is uploaded or persisted. `AiManager.observeCompletions` exposes raw completion results to this screen only.

Tests: `tests/ai/*.test.ts` (80 tests). `tests/ai/fakes.ts` is a **DEV FIXTURE**: fake runtime and in-memory files. Passing tests prove the logic and lifecycle rules, not native inference.

## Integration (Member 4)

Create exactly one manager per app, outside React render, in `src/application/providers.ts`:

```ts
import { createPhoneAi } from "../ai/phone";

export const ai = createPhoneAi();          // AiManager (AiPort + extras below)

// Boot: initialize independently of the transit repository.
// The model is already on disk → verifies the marker, loads → ready.
// No model → AI_NOT_READY, state "absent" → offer setup + manual planning.
await ai.initialize();

// Setup screen, explicit user action only (never on boot, never silently on cellular):
const setup = await ai.ensureModel((state) => {/* progress */});
if (setup.ok) await ai.initialize();

// Controller:
const result = await ai.extract({ queryId, text, locale, knownPlaceLabels });
await ai.cancel(queryId);

// App lifecycle listener (Member 4 owns it):
//   AppState "background" → ai.cancelActive()
//   memory warning / teardown → ai.release()   (initialize() again later)
// UI readiness: ai.subscribe(listener) returns an unsubscribe function.
// Download cancel button: ai.cancelModelSetup().
```

Native config needed at INT-001 (Member 4 owns; I have not edited it):

- Dependencies, exact: `llama.rn@0.12.9`, `expo-file-system@57.0.7`, `@noble/hashes@2.4.0`; dev: `tsx@4.23.15`, `typescript@6.0.3`, `@types/node` (for the Node tests).
- `app.config.ts` plugins: `["llama.rn", { enableEntitlements: false }]`. This is the option name in the installed `withLlamaRN.d.ts`, and Personal Team signing needs it.
- llama.rn's `postinstall` downloads SHA-pinned prebuilt Android JNI libs and the iOS xcframework from its GitHub release. Do **not** install with `--ignore-scripts`, and allow network access during `npm install`.
- Android ABIs default to `x86_64,arm64-v8a`. llama.rn's gradle requires NDK ≥ 24 (`ndkVersion`). iOS podspec minimum is 13.0.

## Behavior summary

- **States (`getState`, `subscribe`).** The states are `absent` → `downloading` (0–1) → `checking` (0–1, hashing) → `initializing` (0–1, llama.rn's 0–100 is normalized) → `ready`, or `failed` with an `AppError`. Contract v1.0 has no "verified but not loaded" phase, so that case reports `VERIFIED_NOT_LOADED = { phase: "checking", progress: 1 }`. **Proposed v1.1:** add `{ phase: "installed" }`.
- **Integrity.** A model is used only after its byte count and SHA256 match the pinned manifest. Hashing reads 4 MiB chunks, yields between chunks and never holds the 491 MB file in JS. After a full verification, a marker file records the manifest. Later launches check size + marker instead of rehashing 491 MB on each launch. A file without a valid marker, for example a manually preloaded one, is fully rehashed during `initialize()`. A corrupt final file is deleted, never loaded.
- **Download.** `ensureModel` is the only path that touches the network. It checks free space first (`STORAGE_FULL`), downloads to `<file>.part`, rejects a wrong size or hash, then moves the file into place and writes the marker. Interruptions return `NETWORK_UNAVAILABLE`, and the next attempt restarts from zero. Resuming across app restarts is not implemented.
- **Runtime pin.** `initialize()` refuses a llama.cpp build other than `EXPECTED_RUNTIME.llamaCppBuild` (`10256` for llama.rn 0.12.9) with a non-retryable `AI_INIT_FAILED`.
- **One completion.** A new `extract()` stops the active one and waits for native settlement before starting, so the older call returns `CANCELLED`. `cancel(queryId)` only affects that query. If a timeout fires (15 s warm, 30 s for the first run after load), the manager stops native generation, waits for it to settle, then returns `AI_TIMEOUT`. A native completion that ignores stop for 5 s is released and the state becomes `failed`.
- **Output handling.** Output is rejected (`AI_INVALID_OUTPUT`) if it is truncated, context-full, interrupted, hits the 256-token limit, lacks EOS, isn't JSON, has extra or missing keys, or has bad enums or numbers. Valid output also gets deterministic notes appended to `intent.ambiguities`. These cover places not literally in the message, same origin and destination, home without a saved place, conflicting or emptied modes, modes, limits or direct-only not found in the message, and peso-vs-centavo slips. The notes **never change** roles, places or limits. Model-written notes are capped at 3 and 120 chars, and notes containing digits or peso words are replaced, so model text cannot carry amounts or route numbers to the UI. Show `ambiguities` on the confirmation screen as "please check" hints, never as instructions.
- **Engine label.** `Extraction.engine` reports `phone_local`, model id/revision and `llama.rn@0.12.9 (llama.cpp b<build>)` from the runtime actually used.

## Decisions (Member 1, 2026-10-10)

- **`ExtractInput.locale`:** keep the UI's fixed `"taglish"` for now. The model sees it only as a `Language:` hint line, and the prompt examples are Taglish. There is no measured reason to change it. The benchmark sends `"taglish"` like the app does, and *Compare: per-case locale* on the diagnostics screen measures the alternative on the same phone. If the per-case run is clearly better on the same corpus, I will propose a change to Members 3 and 4 with both reports attached; otherwise it stays.
- **Localizing engine text (Member 3's proposal):** the AI side does not need it. Two AI strings reach users in English only: `AI_MESSAGES` in `errors.ts`, which the UI can key off the stable `AppError.code` it already receives, and the deterministic ambiguity notes from `validateIntent.ts`, which are free text in `RawIntent.ambiguities: string[]`. Localizing those notes would need stable note codes, which is a contract change. I suggest deferring it past P0. Whenever notes exist, the controller (`src/application/controller.ts`) also adds one generic English warning ("Some parts of your request need clarification."), which Member 3 can map to a localized string without any AI change.

## Coordination items (need Member 4 decision)

Updated 2026-10-10 against `main` `3aabd53`.

1. ~~`src/contracts/index.ts` transcription~~ **Resolved.** Member 4 owns the file since INT-001 (`bec4f16`). `tests/ai/extraction.test.ts` still fails if it drifts from contract v1.0 §3.
2. **Two RawIntent validators exist.** `src/ai/validateIntent.ts` validates model output inside the AI layer. `src/contracts/validators.ts` has its own `validateRawIntent`, which the controller runs again through `validateExtraction`. Both are strict today, but they already differ slightly. The contracts version caps `ambiguities` at 20 entries and place text at 600 characters. The AI version does not cap place text, and produces at most 18 notes: 15 deterministic plus 3 model notes. Decide whether to keep both as defense in depth (and add a shared test fixture so they agree), or to have one delegate to the other.
3. **`ModelState` "installed" phase** is still open. A verified model that isn't loaded yet reports `{ phase: "checking", progress: 1 }`. Adding `{ phase: "installed" }` is additive, so it would be a minor bump to v1.1.
4. `AiManager` adds `subscribe`, `cancelActive`, `cancelModelSetup` and `observeCompletions` (diagnostics only) on top of `AiPort`. All are additive; the `AiPort` contract is unchanged.

## Open items (what is left, by owner)

Every result below is **Not Run** until it is measured on a phone. Evidence goes in the linked files.

**Member 4**

> **Merge timing:** `feat/ai/round3-device-results` changes runtime code (`app/dev-ai.tsx`, `src/ai/diagnostics.ts`). `release:check` marks an APK stale after any later runtime change, so merge this **before** building the benchmark and release APKs, or hold it until the release evidence is recorded.

- [ ] Build the **benchmark APK** from current `main` with `EXPO_PUBLIC_AI_DIAGNOSTICS=1`. Send the file name, source commit and SHA-256 ([native-gate.md](../../docs/evidence/native-gate.md)).
- [ ] Build the **release APK** from the same commit without the flag, and record both in `docs/evidence/native-artifacts.json`. AI-006 and the physical release evidence use this one.
- [ ] ~~iPhone build~~: out of scope (iOS descoped 2026-10-10).
- [ ] Decide coordination items 2 and 3 above.
- [ ] Review and merge `feat/ai/ai-005-006-results` once results are in. It is a draft until then.

**Member 1, once the benchmark APK arrives** (Honor X9b 5G, Android 15, already connected)
- [ ] Check the APK's SHA-256 against Member 4's record, then `adb install -r`.
- [ ] Model setup on Wi‑Fi through the Setup screen: record the time, bytes, hash result and free storage before and after; force-quit, relaunch, and confirm no re-download (AI-002 on device).
- [ ] AI-001 probe → [native-gate.md](../../docs/evidence/native-gate.md). A failure is a Fail; stop and record the exact error.
- [ ] AI-005: two app-locale benchmark runs back to back (thermals), then the per-case locale comparison → [ai-benchmarks.md](../../docs/evidence/ai-benchmarks.md). Record memory with `dumpsys meminfo` only if actually profiled.
- [ ] Locale decision and model decision (keep 0.5B unless the measured rate misses the target), from those runs.
- [ ] AI-004 on device: the automatic lifecycle checks, plus manual background mid-query and force-quit/relaunch.
- [ ] AI-006 offline proof with the **release** APK → [offline-ai.md](../../docs/evidence/offline-ai.md).
- [ ] ~~iPhone repeats~~: out of scope (iOS descoped 2026-10-10). A second Android phone is a bonus only.
- [ ] Update the status line above and the AI rows in `docs/planning/04-team-execution.md` with actual Pass/Fail.

**Anyone with GitHub access**
- [ ] Open the draft PR for `feat/ai/ai-005-006-results`. The GitHub CLI isn't installed on Member 1's laptop: https://github.com/arossmanalo/AlalayByahe/pull/new/feat/ai/ai-005-006-results

**Member 3 (FYI, no action needed for P0)**
- The AI's clarification notes (`RawIntent.ambiguities`) are English only. The controller's generic "Some parts of your request need clarification." can be localized without any AI change.

## Running checks

```bash
npm run typecheck
npx tsx --test tests/ai/*.test.ts
```

On Windows, run `npm ci` from PowerShell or cmd, not Git Bash. llama.rn's postinstall calls `tar`, and Git Bash's GNU tar fails on `C:` paths.

Before INT-001 these were run from tooling installed outside the repo, so no repo dependency files changed. That means tsx 4.23.15, typescript 6.0.3, llama.rn 0.12.9, expo-file-system 57.0.7 and @noble/hashes 2.4.0 in a scratch folder, plus a strict scratch tsconfig with `paths` pointing at those typings.

## Not yet verified (blocks any phone-local claim)

- Expo 57 + llama.rn 0.12.9 native build/install and real inference on Android (AI-001). iOS is out of scope.
- Real schema-constrained completion and its `stopped_eos`/`tokens_cached` behavior with Qwen's chat template. The output check requires `stopped_eos`; if a real device reports otherwise for clean JSON, revisit `interpretCompletion`.
- expo `DownloadTask` behavior with Hugging Face's redirecting `resolve` URL, HTTP error statuses and backgrounding.
- @noble/hashes speed on Hermes for 491 MB (hash time is recorded in the probe report).
- Accuracy and latency of the 26-case corpus on real phones (AI-005); offline cold-launch proof (AI-006).

## Trip summary and place hints (2026-10-10, Member 4 integration change)

- `summary.ts` + `AiManager.summarize`: user-approved exception to "no model-written travel text" (contract §4 amendment). The model writes a short summary of one verified option from its facts only; `checkSummary` rejects any number, fare, time, speed or "live" claim not in the facts, or stops out of order, and the deterministic `templateSummary` is shown instead. It shares the single active completion (cancel, timeout, supersede) through the new internal `runCompletion`, which `extract` also uses; extraction behaviour is unchanged (all lifecycle tests pass). Tests: `tests/ai/summary.test.ts` (fake runtime). Phone quality and speed: Not Run.
- Place hints are no longer the first 30 places of the pack: `src/ui/place-hints.ts` sends the stored places the request mentions (typo-tolerant), so every demo place is treated alike.
