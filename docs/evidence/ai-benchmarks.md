# AI-005 Accuracy, speed, memory and model choice — evidence log

Owner: Member 1. **Status: Not Run.** No real model output has been measured on any device or laptop. Targets below are targets, not results.

## Method

- **Corpus:** `src/ai/corpus.json` v2, 42 held-out cases (15 Taglish, 18 Filipino, 9 English). Definition and scoring are in [taglish-cases.md](taglish-cases.md). No case has been tuned on model output.
- **Runner:** *Run corpus benchmark* on the diagnostics screen (`alalaybyahe://dev-ai`, see [native-gate.md](native-gate.md)). It releases and cold-loads the app's model (`initMs`), then runs every case sequentially through the real `AiPort` manager with the production prompt, grammar, 15 s warm / 30 s cold timeouts and output validation. Case 1 is reported as the cold run (`coldElapsedMs`); the rest give warm median/p95. Misses carry their failed slots and the raw model output.
- **Locale:** the app sends every query with `locale: "taglish"` (`src/ui/services.tsx`), so *Run corpus benchmark* does the same (`localeMode: "app"`). *Compare: per-case locale* sends each case with its own `en`/`fil`/`taglish` value (`localeMode: "per_case"`). It exists only to decide whether the app should send a different value, and is not the headline result.
- **Capture:** `adb logcat -d -s ReactNativeJS | findstr AI-DIAG` → paste the JSON under "Raw runs" below.
- **Settings recorded with every run:** model `qwen2.5-0.5b-q4_k_m` @ `9217f5d`, runtime `llama.rn@0.12.9 (llama.cpp b10256)`, CPU (`n_gpu_layers 0`), `n_ctx 2048`, `n_predict 256`, temperature 0, seed 42.
- **Thermals:** run the app-locale benchmark twice back to back and note whether the second run is slower. Note battery level and charging state.

## Targets (not results)

Exact critical slots ≥ 90% on ≥ 20 cases per primary phone; silent role swaps = 0; warm p95 ≤ 10 s (timeout 15 s); cold soft target ≤ 30 s.

## Results per device

| Device (anonymized) | OS | Run | Cases | Exact | Exact rate | Silent swaps | Clarification misses | Errors | Init ms | Cold ms | Warm median ms | Warm p95 ms | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Honor X9b 5G (ALI-NX1) | Android 15 | 1 (app locale) | 42 | — | — | — | — | — | — | — | — | — | **Not Run** |
| Honor X9b 5G (ALI-NX1) | Android 15 | 2 (app locale, back to back: thermals) | 42 | — | — | — | — | — | — | — | — | — | **Not Run** |
| Honor X9b 5G (ALI-NX1) | Android 15 | 3 (per-case locale, comparison) | 42 | — | — | — | — | — | — | — | — | — | **Not Run** |
| iPhone 14 Pro | — | 1 | 42 | — | — | — | — | — | — | — | — | — | **Not Run** |

Publish every miss with its raw output, failed slots and device.

## Memory

Measure only if actually profiled. On Android, run this during a benchmark:

```bash
adb shell dumpsys meminfo ph.alalaybyahe.app
```

Record TOTAL PSS / RSS before load, after load and during a completion. On iPhone, use the Xcode memory gauge or Instruments.

| Device | Before load | After load | During completion | Tool | Result |
|---|---|---|---|---|---|
| Honor X9b 5G (ALI-NX1) | — | — | — | — | **Not Run** |
| iPhone 14 Pro | — | — | — | — | **Not Run** |

## Model decision

**Current: keep Qwen2.5-0.5B-Instruct Q4_K_M (the pinned default).** This is the planned default, not a measured choice; no accuracy result exists. The 1.5B candidate (1,117,320,736 bytes, revision `91cad51`) is considered only if the measured 0.5B exact rate misses the target **and** storage and latency on the same phone allow it. It would then be downloaded on its own, measured on the same corpus and settings, and switched only through Member 4's manifest change before freeze. Both models are never downloaded by default.

## Raw runs

_None yet._
