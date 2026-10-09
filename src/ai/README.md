# src/ai — Local AI (Member 1)

Phone-local Taglish/Filipino/English intent extraction for AlalayByahe, implementing `AiPort` from shared contract v1.0. The model interprets language only. It never produces routes, stops, fares or instructions, and its output is validated before anyone sees it.

**Status (2026-10-09, branch `feat/ai/ai-001-ai-004`):** pure logic and native adapters are written, typechecked against the real pinned package typings and covered by Node tests using fake adapters. **No physical-device run has happened yet.** Native inference, real downloads, Hermes hashing speed and offline behavior are still unproven (see `docs/evidence/native-gate.md`).

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
| `evaluation.ts` | AI-003/005 | Held-out corpus scoring (exact critical slots, silent role swaps, median/p95) and `runCorpus` | no |
| `index.ts` | — | Pure exports (safe in Node tests) | no |
| `phone.ts` | — | Native wiring: `createPhoneAi()` | yes |

Tests: `tests/ai/*.test.ts` (75 tests) and `tests/ai/corpus.json` (26 held-out cases). `tests/ai/fakes.ts` is a **DEV FIXTURE**: fake runtime and in-memory files. Passing tests prove the logic and lifecycle rules, not native inference.

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

## Coordination items (need Member 4 decision)

1. **`src/contracts/index.ts`** is a verbatim transcription of contract v1.0 §3, so this branch compiles before INT-001 lands. A test fails if it drifts from the doc. Replace it with your INT-001 file (it should be identical).
2. **Structural RawIntent validator** lives in `src/ai/validateIntent.ts`. If you want all validators in `src/contracts/validators.ts`, re-export `validateRawIntent` from there instead of duplicating it.
3. **`ModelState` "installed" phase** (above). It is additive, so it would be a minor version bump (v1.1).
4. `AiManager` adds `subscribe`, `cancelActive` and `cancelModelSetup` on top of `AiPort`. They are additive on the implementation; the `AiPort` contract is unchanged.

## Running checks

After INT-001 provides `package.json`/`tsconfig.json`:

```bash
npx tsx --test tests/ai/*.test.ts
```

Before INT-001 these were run from tooling installed outside the repo, so no repo dependency files changed. That means tsx 4.23.15, typescript 6.0.3, llama.rn 0.12.9, expo-file-system 57.0.7 and @noble/hashes 2.4.0 in a scratch folder, plus a strict scratch tsconfig with `paths` pointing at those typings.

## Not yet verified (blocks any phone-local claim)

- Expo 57 + llama.rn 0.12.9 native build/install on Android and iPhone (AI-001).
- Real schema-constrained completion and its `stopped_eos`/`tokens_cached` behavior with Qwen's chat template. The output check requires `stopped_eos`; if a real device reports otherwise for clean JSON, revisit `interpretCompletion`.
- expo `DownloadTask` behavior with Hugging Face's redirecting `resolve` URL, HTTP error statuses and backgrounding.
- @noble/hashes speed on Hermes for 491 MB (hash time is recorded in the probe report).
- Accuracy and latency of the 26-case corpus on real phones (AI-005); offline cold-launch proof (AI-006).
