# AI-003 / AI-005 Taglish extraction cases — evidence log

Owner: Member 1. **Device accuracy: Not Run.** No real model output has been scored yet. Results go in [ai-benchmarks.md](ai-benchmarks.md).

## Corpus

`src/ai/corpus.json` (moved from `tests/ai/` on 2026-10-10 so a device build can load it without importing test files) has 42 hand-labelled held-out cases, version 2: 15 Taglish, 18 Filipino and 9 English.

- **v1, c01–c26:** role order (`galing`/`papunta`, "to X from Y"), negation (`ayoko`, `ayaw`, `walang`, "no", "avoid"), allowed-only modes, slang (`tryk`, UV Express, `byahe`), current location, home/`uwi`, direct-only, walk limits (general and transfer-only), budgets (`200 pesos`, `₱150`), priorities, onboard, unrelated text, prompt injection, contradictory modes, missing origin/both.
- **v2, c27–c42 (added 2026-10-10, before any model run):**
  - `uwi` with an explicit place (c27), `pauwi` with no place (c28)
  - onboard "nasa jeep ako" and "I am already on a van" (c29, c30, c42)
  - reversed roles: "Going to X, I am coming from Y" and "Sa X ang punta ko, nandito ako sa Y" (c31, c32)
  - mode refusals with `bawal` and `wag` (c33, c34)
  - budgets: `singkwenta pesos`, `P120`, `under 100 pesos` (c35–c37)
  - a 2 km walking limit (c38), unrelated text (c39), "from here" (c40), Filipino prompt injection (c41)
- Held-out rule: no case text equals a prompt example in `src/ai/prompt.ts`, and no case was tuned on model output. `tests/ai/corpus.test.ts` enforces the first rule. Any future case must be written before seeing the model's answer to it.
- Labels are expected **slots**, not model output. `requiresClarification: true` marks cases where a correct extraction must carry an ambiguity note (c07 and c28 home, c16 contradictory modes).
- Place names are text only. This file is not transit data and implies no route coverage.

## Scoring (`src/ai/evaluation.ts`)

- A case is **exact** when all 12 critical slots match: kind, originText, destinationText, useCurrentLocation, allowedModes (set), excludedModes (set), priority, the 3 walk limits, budgetCentavos and directOnly. Places compare after case, diacritic and punctuation normalization.
- `exactRate = exact / cases`. Errors, timeouts and invalid output count as misses.
- A **silent wrong role** is a swapped origin/destination with no ambiguity note. It must be 0.
- Latency: the first case after a cold load is reported separately (`coldElapsedMs`). Warm median/p95 cover the rest.
- Target, not result: ≥ 90% exact over ≥ 20 cases per primary phone, warm p95 ≤ 10 s.

## Executed so far (laptop, fake runtime only)

| Check | Command | Result |
|---|---|---|
| Corpus integrity (42 cases): held-out rule, labels valid as RawIntent, deterministic notes silent on correct labels and present on c07/c16/c28 | `npm test` (Node 24.14.0, tsx 4.23.15), 2026-10-10 | Pass (392/392 tests) |
| Scorer and benchmark plumbing: exact, swap and percentile behavior; cold/warm split; raw output on misses; `runCorpus` through the real manager with the **fake** runtime | same | Pass. This does not measure model accuracy. |

The c35 case exposed that the deterministic "limit not in your message" note did not count Spanish-derived numerals. `singkwenta`, `bente` and the like are now counted as numbers.
