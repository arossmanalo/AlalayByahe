# AI-003 / AI-005 Taglish extraction cases — evidence log

Owner: Member 1. **Device accuracy: Not Run.** No real model output has been scored yet.

## Corpus

`tests/ai/corpus.json` has 26 hand-labelled held-out cases (version 1): 11 Taglish, 9 Filipino and 6 English.

- Coverage: role order (`galing`/`papunta`, "to X from Y"), negation (`ayoko`, `ayaw`, `walang`, "no", "avoid"), allowed-only modes, slang (`tryk`, UV Express, `byahe`), current location, home/`uwi`, direct-only, walk limits (general and transfer-only), budgets (`200 pesos`, `₱150`), priorities, onboard, unrelated text, prompt injection, contradictory modes, and missing origin/both.
- Held-out rule: no case text equals a prompt example in `src/ai/prompt.ts`. `tests/ai/corpus.test.ts` enforces this.
- Labels are expected **slots**, not model output. `requiresClarification: true` marks cases where a correct extraction must carry an ambiguity note (c07 home, c16 contradictory modes).
- Place names are text only. This file is not transit data and implies no route coverage.

## Scoring (`src/ai/evaluation.ts`)

- A case is **exact** when all 12 critical slots match: kind, originText, destinationText, useCurrentLocation, allowedModes (set), excludedModes (set), priority, the 3 walk limits, budgetCentavos and directOnly. Places compare after case, diacritic and punctuation normalization.
- `exactRate = exact / cases`. Errors, timeouts and invalid output count as misses.
- A **silent wrong role** is a swapped origin/destination with no ambiguity note. It must be 0.
- Latency is the median/p95 of `Extraction.elapsedMs` over completed runs. Cold runs (the first after load) are reported separately.
- Target, not result: ≥ 90% exact over ≥ 20 cases per primary phone, warm p95 ≤ 10 s.

## Executed so far

| Check | Command | Result |
|---|---|---|
| Corpus integrity, held-out rule, labels valid as RawIntent, deterministic notes silent on correct labels and present on c07/c16 | `tsx --test tests/ai/*.test.ts` (Node 24.14.0, tsx 4.23.15) | Pass (part of 75/75 tests, 2026-10-09) |
| Scorer exact/swap/percentile behavior and `runCorpus` through the real manager with the **fake** runtime | same | Pass. This does not measure model accuracy. |

## Device runs (AI-005) — to fill in

From a development build, after AI-001 passes:

```ts
import corpus from "../tests/ai/corpus.json";
import { runCorpus, summarize } from "../src/ai";
const records = await runCorpus(ai, corpus.cases, `bench_${Date.now()}`);
console.log(JSON.stringify({ summary: summarize(records), records }, null, 2));
```

| Device (anonymized) | OS | Model | Runtime | Cases | Exact | Exact rate | Silent role swaps | Errors | Warm median ms | Warm p95 ms | Cold ms | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| iPhone 14 Pro | — | qwen2.5-0.5b-q4_k_m @9217f5d | llama.rn 0.12.9 | 26 | — | — | — | — | — | — | — | **Not Run** |
| Android primary | — | qwen2.5-0.5b-q4_k_m @9217f5d | llama.rn 0.12.9 | 26 | — | — | — | — | — | — | — | **Not Run** |

Publish every miss with its raw output. If 0.5B misses the target, record it honestly. Only consider the 1.5B candidate if storage and latency measurements allow it (AI-005).
