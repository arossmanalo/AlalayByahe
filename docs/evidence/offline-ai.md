# AI-006 Offline phone-local AI proof — evidence log

Owner: Member 1 with Member 4. **Status: Not Run.** No installed build has run a query offline yet.

## Preconditions

- Installed **release** APK/IPA built **without** `EXPO_PUBLIC_AI_DIAGNOSTICS`. Record its filename, SHA-256 and source commit.
- Model already set up and verified on the phone (see [native-gate.md](native-gate.md), step 3).
- AI-001 probe passed on the same phone.

## Procedure (T-OFF-01 / T-AI-01)

1. Stop Metro on the laptop. Unplug USB. Turn on airplane mode, and also turn off Wi‑Fi and Bluetooth.
2. Force-quit the app (Android: swipe away from recents; iPhone: swipe up). Relaunch it from the home screen.
3. Type a **fresh** query that is not in the corpus and has not been tried before, e.g. a new Taglish sentence naming two places.
4. Expect the confirmation screen to show origin/destination/preferences extracted by the local model, labelled "Read by AI on this phone (qwen2.5-0.5b-q4_k_m)".
5. Record the query text, the extracted fields, the elapsed time and a screen recording or screenshots. Then submit a second fresh query to show it was not a one-off.
6. **Clarification check:** submit "Pauwi na ako." Expect a request to choose home or a destination, not a guessed place.
7. **Model-absent check** (optional, separate install or after clearing app data): offline first launch must offer setup and manual planning, and must not claim the AI is ready.

Route results also need the verified transit pack (Member 2 / Member 4). Until a reviewed release pack is bundled, this proof covers **extraction feeding the confirmation screen**, not a complete journey.

## Results

| Device (anonymized) | OS | Build (commit) | Airplane / radios off | Metro / USB | Fresh query | Extraction shown | Elapsed ms | Clarification | Result |
|---|---|---|---|---|---|---|---|---|---|
| Android primary | — | — | — | — | — | — | — | — | **Not Run** |
| iPhone 14 Pro | — | — | — | — | — | — | — | — | **Not Run** |
