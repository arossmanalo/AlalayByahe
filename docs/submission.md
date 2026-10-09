# Submission preparation — pending release acceptance

**Draft only.** Nothing has been published, posted, deployed or submitted, no video exists and no receipt exists. The participant briefing PDF is still missing, so official mandatory items remain unconfirmed (see the [event requirements check](../README.md#event-requirements-check) in the README). The user decides what is published and submitted.

**Platform:** Android only. iPhone/iOS was excluded on 2026-10-10 because of limited resources; do not claim or imply iOS support in the video, post or README.

Every `{{placeholder}}` below is a fact that must come from real evidence (`docs/evidence/native-artifacts.json`, `physical-release.json`, the physical test script). Do not fill one from memory or from a unit test. Where evidence does not exist, use the fallback wording in "If a gate fails".

The approved product pitch is: “Ask in Taglish, confirm the details, and receive a commute plan grounded in documented routes.” Only advertise actual verified coverage and measured local inference.

## Submission outline

### 1. Problem
A commuter who knows the destination often does not know which terminal to use, which direction to board, where to get off or what the fare is. Information is scattered and often not stop-level.

### 2. What works today (verified in software only)
- A request in Filipino, English or Taglish is read into editable fields: origin, destination and preferences. The user confirms them before anything is planned.
- A deterministic engine plans from stored, source-checked data: directed rides, legal board/alight stops, ordered stops, walking links where they exist, and no invented connections.
- Fares are shown as verified, estimated or unknown. Unknown is never zero; a partial subtotal is labelled as not the full total.
- Preferences are strict (mode limits, direct-only, walking limits, budget). If nothing matches, the app explains why and lets the user change the setting.
- Manual place picking works when the AI is unavailable and is labelled as such. Manual planning is not proof that the AI works.
- Manual "I'm already on a vehicle" replanning from a user-confirmed next stop. The app does not track the vehicle.

### 3. How it works
Typed request → on-device model (Qwen2.5-0.5B-Instruct, Q4_K_M, Apache-2.0, via llama.rn) → structured fields, validated → user confirmation → deterministic search over a SQLite transit pack → numbered steps with board, direction sign and get-off. The model never supplies routes, stops, directions, walking paths or fares.

### 4. What is verified (fill from evidence; otherwise Not Run)

| Claim | Evidence | Status |
|---|---|---|
| Release pack is LRT-1 stations only, validated, independently reviewed | `data:validate --release`, `docs/evidence/pack-status.md` | Verified in software and by a reviewer on 2026-10-10 |
| Planning engine and fares behave as specified | `npm test` (Node, synthetic and real-pack tests) | Verified in software only |
| Release APK built; contains no demo data | `check-bundle-clean` PASS on {{apk file name}}, SHA-256 {{sha256}}, commit {{commit}} | {{Not Run / Pass}} |
| Installs and cold-launches without Metro or USB on {{phone, Android version}} | physical script P-01 to P-05 | {{Not Run / Pass}} |
| Model downloads and passes SHA-256 on the phone, {{minutes}} to Ready | P-06 to P-08 | {{Not Run / Pass}} |
| Fresh Taglish request read by the on-device model, {{n}} s | P-12 to P-14 | {{Not Run / Pass}} |
| Works in airplane mode after setup | P-21 to P-25 | {{Not Run / Pass}} |
| Model accuracy on held-out cases, latency | `docs/evidence/ai-benchmarks.md` | {{Not Run / n cases, x% exact, p95 y ms}} |

### 5. Limits (say these plainly)
No target corridor is supported end to end. The release build is LRT-1 stations only, with no walking links, so journeys start and end at stations. No live arrivals, tracking or "fastest" claim. Android only. Phone inference accuracy and speed are {{measured as … / unmeasured}}. Full list: [disclosures](../README.md#disclosures-attribution-and-limitations).

## Video script (about 60 seconds, shows only verified flows)

Rule for every clip: a clip is either the **release build** (title card "Release build, LRT-1 stations only") or the **demo build** (title card and caption "DEMO BUILD: invented and unverified routes, not real coverage" for the whole clip). Never cut a demo clip into a release sequence without the caption. Do not edit a jump so it looks like uninterrupted timing. Do not show a pre-computed result as a fresh query.

| # | Seconds | Shot | On-screen text / voice | Build | Needs |
|---|---|---|---|---|---|
| 1 | 0–8 | Commuter problem: a simple title card (no real people unless they consent) | "Where do I board? Which way? How much?" | none | nothing |
| 2 | 8–16 | Phone screen: airplane mode on, radios off, the app's Setup screen showing AI Ready and Data Loaded | "Local AI on this phone. Transit data stored. Offline." | release | P-21, P-22 pass |
| 3 | 16–28 | Type a fresh Taglish request, tap Read my trip, show the confirm screen with the editable fields and the label that the phone read it | Caption the model name; say the query is fresh. Show elapsed {{n}} s only if measured. | release | P-12, P-23 pass |
| 4 | 28–42 | Confirm; show the numbered steps: board, direction sign, get off, fare with its basis | "Verified stored-value fare {{₱…}}. Unknown fares are never zero." | release | P-14 pass |
| 5 | 42–50 | Change a strict preference (for example exclude rail) and show the honest "no matching option" with the edit button | "Strict preferences are never relaxed silently." | release | A-09 in the ROUTE-006 checklist |
| 6 | 50–60 | Coverage and limits card: LRT-1 stations only, Android only, sources, AI-assisted development disclosure, repository link | "Verified coverage: LRT-1 stations only. Road routes are not verified." | release | nothing |

Optional extra clip (only if the user wants it): the demo build with its test-data banner visible, captioned as above, to show how the planner handles transfers and partial fares. It must never be described as real coverage.

## If a gate fails

| What failed | What to present instead |
|---|---|
| No APK could be built or installed | Show passing Node tests and the written evidence honestly; do not show an app recording. State that no installed build was verified. |
| APK runs but phone inference fails or is too slow | Show manual planning on the release build, labelled "AI unavailable, manual place picker". State that phone inference was not verified. Do not present manual planning as local AI. |
| Inference works but offline proof not completed | Show the on-device extraction online and say the offline test was not completed. |
| Release build works, nothing else | Claim exactly that: "Android release build, LRT-1 stations only, as verified in {{evidence}}". |

A laptop-local fallback is allowed only if it actually ran and is labelled "AI runs on this laptop". It is not phone inference and cannot be used for the airplane-mode claim.

## Post draft (not published)

> {{Project name}}: an Android commute assistant for Filipino, English and Taglish. Ask in your own words, confirm the details, and get a plan from documented routes. Local AI model on the phone ({{verified / not yet verified}}). Release data covers LRT-1 stations only; road routes are not verified. Built with AI coding assistants. {{repo link}} {{event hashtag and tags, from the official brief}}

Do not post. The exact tags, hashtag and format come from the official brief, which is missing.

## Materials to finish

- Record artifact hash, source commit, pack version, model/runtime and anonymized device evidence in `docs/evidence/physical-release.json` (script: [Phone test script](../README.md#phone-test-script-android) in the README).
- Verify the actual event rules against the missing briefing before claiming compliance.
- Review source/model/dependency attribution and repository visibility ([README disclosures](../README.md#disclosures-attribution-and-limitations)).
- Record and inspect the final video; verify its URL.
- Prepare the public post with only measured claims; publish and submit only when the user authorizes it.
- Save the actual receipt, link and timestamp after submission.
