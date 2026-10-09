# Disclosures, attribution and limitations

Draft for the README, the submission and the video. Everything here was checked against the repository on 2026-10-10 (`main` at `053caa3` or later). It states what the code does and what data it holds. It does **not** state any device result: nothing has been run on a phone yet.

## What the app is

An Android commute assistant for Filipino, English and Taglish requests. A small language model reads the typed request and fills in origin, destination and preferences. The user confirms those fields. A deterministic engine then plans a journey from stored, source-checked data. **iOS was excluded on 2026-10-10 because of limited resources; the app is Android only.**

## What the language model does and does not do

- It runs **on the phone** through llama.rn 0.12.9. It only extracts fields (origin, destination, mode limits, walking limits, budget, priority). It never supplies routes, stops, directions, walking paths, fares or instructions.
- Its output is parsed and validated; truncated or malformed output is rejected. Every extracted field is shown for confirmation before any route is planned. A language model can still mis-read roles or places; that is why confirmation is mandatory.
- Model: Qwen2.5-0.5B-Instruct, Q4_K_M, Apache-2.0, revision `9217f5db79a29953eb74d5343926648285ec7e67`, 491,400,032 bytes, SHA-256 `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`. The weights are not in the repository or the APK.
- **Phone inference has not been verified.** Accuracy, speed and memory on a phone are unmeasured. Tests in the repository use a fake runtime.

## What leaves the phone

| Item | Detail |
|---|---|
| Typed request | Stays on the device. There is no cloud AI endpoint and no analytics. The app contains no `fetch`, XHR or WebSocket calls. |
| Model download | One explicit tap on "Download and set up" downloads the model file from the pinned Hugging Face URL to private app storage, checks size and SHA-256, and only then uses it. Hugging Face can see the phone's IP address and the request. |
| Location | The app does not use location. |
| Online address and walking helpers | **Off by default** (`enableOnlineHelpers: false`) and not wired to any provider. If ever enabled they would need an explicit user action and would send only a selected address or coordinates, never the typed conversation. |
| Build time (not in the app) | The demo build's walking distances were computed by the team on a public Valhalla routing server (FOSSGIS) over OpenStreetMap data, and place coordinates came from Nominatim, while building the data, not from the phone. |

No paid service is used and no paid tier or automatic upgrade exists.

## Data in each build

| Build | Contents | Status |
|---|---|---|
| **Release** (the only build recorded as release evidence) | `pack_lrt1`, version `lrt1_2026_10_10_1`, SHA-256 `f2499c546a0b8e495ab41062595c55fc21f3c293410744a640147a3cb44c2931`: LRT-1 only, 25 stations, ride legs in both directions and stored-value fares between every pair. **No walking links, no entrances, no road services.** | Transcription independently reviewed on 2026-10-10 (routing facts `verified`). Station coordinates are `estimated` (approximate). |
| Benchmark | The release pack plus the on-device AI diagnostics screen (`EXPO_PUBLIC_AI_DIAGNOSTICS=1`) | Not release evidence |
| **Demo** | The release pack plus **unverified** road-route drafts from teammate reports and an **invented** Luzon network of 45 places and 33 lines, loaded into a separate database, with a test-data banner on every screen | Not release evidence. Never present as real coverage. |

## Sources and attribution

| Item | Source | Licence / terms |
|---|---|---|
| LRT-1 stored-value fares and station order | LRMC "New LRT-1 Stored Value Fare Matrix", effective April 2, 2025, published on lrmc.ph (the file names on the site are swapped; the title inside the image was used) | Operator publication, transcribed and cited. Fares are for stored-value cards, not single-journey tickets. |
| Station coordinates | Wikipedia station articles (MediaWiki API) and OpenStreetMap via Nominatim | Wikipedia: CC BY-SA 4.0. OpenStreetMap data: ODbL 1.0, **© OpenStreetMap contributors**. Approximate points, not entrances. |
| Demo walks and demo place pins | Valhalla routing on OpenStreetMap data (FOSSGIS server), Nominatim | ODbL 1.0, **© OpenStreetMap contributors**. Computed, not walked. |
| Language model | Qwen2.5-0.5B-Instruct-GGUF by the Qwen team | Apache-2.0 |
| Runtime and libraries | llama.rn 0.12.9, React Native 0.86.3, Expo 57.0.27, expo-sqlite, expo-router, expo-file-system, React 19.2.3, @noble/hashes 2.4.0 | MIT (read from the installed `package.json` files) |

## Known limitations (state these plainly)

- **None of the three target corridors is supported end to end:** Lipa to Candelaria, Lipa to San Pablo, Candelaria to Vito Cruz/Taft. Only the LRT-1 leg has verified data. The road legs exist only as unverified drafts in the demo build.
- The release build routes between LRT-1 stations only. Because it has no walking links, a journey can only start and end at a station.
- No live arrivals, no vehicle tracking, no "fastest" claim, no traffic. Routes are documented, not live availability; users must confirm the service and its direction.
- Fares are stored-value fares. Unknown fares are shown as unknown, never zero; a partial subtotal is labelled as not the full total. No student/senior/PWD discount is documented, so the regular fare is shown as an estimate.
- Offline use depends on the model and data being set up first (one-time download). New addresses and uncached walking paths are not supported offline.
- Android only. iOS was never built or tested.
- **Not yet verified on any phone:** local inference, offline operation, SQLite persistence, cold launch, memory and speed.
- 19 high npm advisories remain in build tooling (`braces`, `node-forge`) with no published fix; they are not in the app bundle. See `docs/evidence/dependency-advisories.md`.

## AI-assisted development disclosure

The code and documents were written with AI coding assistants in a four-role workflow. As reported by the team on 2026-10-10:

| Member | Role | AI assistant(s) used |
|---|---|---|
| Member 1 | Local AI | Claude |
| Member 2 | Data and routing | Claude and Codex |
| Member 3 | Frontend | Claude |
| Member 4 | Integration, release and QA | Claude (Claude Code) |

Product names only, as reported; specific model versions are not recorded here and should be added only if the team can state them accurately. These tools were used to write code, tests and documents; the people on the team directed the work, reviewed it, and ran the data review. The language model that runs inside the app (Qwen2.5-0.5B-Instruct) is separate from these development tools.
