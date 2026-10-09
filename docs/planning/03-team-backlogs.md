# Detailed Team Backlogs

All tasks are Not Started. Estimates exclude build/download waiting and unresolved data verification. P1 is outside the baseline; cut it if P0 slips. Each task lists all 17 required handoff fields. Paths are future implementation files, not existing production code.

## Member 1 — Local AI

### AI-001 — Prove real native inference on both platforms

- **Task ID:** AI-001
- **Task title:** Prove real native inference on both platforms
- **Priority:** P0
- **Objective:** Resolve the largest implementation risk before expanding AI work.
- **Functional requirements:** Install signed native apps on iPhone14Pro and an available Android; run one fresh schema-constrained completion from publisher GGUF.
- **Technical requirements:** llama.rn0.12.9, proposed Expo 57 baseline; CPU first; plugin optional entitlements disabled for Personal Team.
- **Files/modules involved:** src/ai/nativeProbe.ts; docs/evidence/native-gate.md; native config edits coordinated with Member 4.
- **Dependencies:** INT-001; may use small local development probe before final UI.
- **Inputs:** Verified model file path; ExtractInput; device OS/RAM/storage; generated native project.
- **Outputs:** Actual JSON text and parsed validity result; per-platform build/install/inference evidence.
- **Implementation steps:** Inspect installed APIs; coordinate NDK/cmake/signing; load file; issue short completion; capture engine/device/runtime; stop/release; repeat on other OS. For this probe, manually acquire the publisher-pinned file into private app storage and verify its size/hash; AI-002 later automates acquisition, so this task does not wait on AI-002.
- **Edge cases:** Unsupported ABI, build failure, signing entitlements, missing model, context initialization/OOM.
- **Acceptance criteria:** Both builds install and perform actual native inference; failures explicitly block phone-local claim.
- **Testing requirements:** Manual physical test on both platforms; no simulator or mocked inference substitute.
- **Estimated effort:** 90–120 min shared with INT-001; early gate
- **Integration instructions:** Expose experiment results to Member 4; retain one pinned dependency set before UI imports.
- **Completion evidence:** Build commands/results, anonymized device table and actual output/timing; identify untested platforms.

### AI-002 — Implement verified model acquisition and readiness

- **Task ID:** AI-002
- **Task title:** Implement verified model acquisition and readiness
- **Priority:** P0
- **Objective:** Make one-time model setup durable and recoverable.
- **Functional requirements:** Explicit download, progress/cancel/retry, byte/hash validation and offline reuse; report separate AI state.
- **Technical requirements:** ExpoFS installed File/DownloadTask/FileHandle APIs; @noble/hashes2.4.0 incremental sha256.create/update/digest with bounded chunks and yielding; no full-file JS buffer.
- **Files/modules involved:** src/ai/modelStore.ts; src/ai/modelManifest.ts; tests/ai/model-store.test.ts
- **Dependencies:** AI-001, INT-001; storage adapter cooperation.
- **Inputs:** ModelManifest pinned URL/revision/bytes/SHA; private file paths.
- **Outputs:** Result<void> from ensureModel; ModelState progress; verified final GGUF path.
- **Implementation steps:** Check space; download .part; hash incrementally; atomic promote; persist manifest; validate existing file; keep prior valid model during replacement.
- **Edge cases:** Interrupted download, wrong bytes/hash, storage full, repeated setup, offline first launch, app killed during promotion.
- **Acceptance criteria:** Only verified complete file initializes; restart reuses it; setup never downloads silently.
- **Testing requirements:** Adapter tests for corruption/retry; real interrupted/restart download on one phone; verify second phone preload.
- **Estimated effort:** 60–90 min plus network transfer
- **Integration instructions:** UiPort consumes state; Member 4 wires private storage; do not write model into repository.
- **Completion evidence:** Hash/byte evidence, state transitions, transfer time and restart results; actual Metro/Hermes hash adapter test.

### AI-003 — Implement structured Taglish extraction

- **Task ID:** AI-003
- **Task title:** Implement structured Taglish extraction
- **Priority:** P0
- **Objective:** Turn free text into validated journey slots without generating routes.
- **Functional requirements:** Support English/Filipino/Taglish, strict mode exclusions, walk preferences, origin/destination and onboard kind; return clarification for missing/conflicting fields.
- **Technical requirements:** RawIntent schema, response_format JSON grammar, JSON.parse + shared validators; short prompt; all modes enum.
- **Files/modules involved:** src/ai/extract.ts; src/ai/prompt.ts; tests/ai/extraction.test.ts; docs/evidence/taglish-cases.md
- **Dependencies:** AI-001; shared validators INT-001; AI-002 for installed runtime.
- **Inputs:** ExtractInput with max600 chars and scoped place labels.
- **Outputs:** Result<Extraction>; truthful engine model/revision/time; AI_INVALID_OUTPUT on malformed/incomplete output.
- **Implementation steps:** Define schema/prompt; test literal roles/negation; validate every key; never infer coordinates/fares; surface ambiguities; evaluate held-out cases.
- **Edge cases:** Swapped roles, slang, repeated names, missing origin, home unknown, injection, unsupported location, contradictory modes.
- **Acceptance criteria:** At least20 held-out cases; target ≥90% exact critical slots/preferences, no silent wrong role accepted; state misses and require confirmation.
- **Testing requirements:** Pure validator tests plus actual fresh inference corpus on Android/iPhone; no prompt examples counted as held-out.
- **Estimated effort:** 90 min
- **Integration instructions:** Member 4 resolves raw texts into place candidates; Member 3 confirms fields; never return journey instructions.
- **Completion evidence:** Case inputs, expected slots, actual outputs and accuracy calculation by device/model.

### AI-004 — Add cancellation and lifecycle safety

- **Task ID:** AI-004
- **Task title:** Add cancellation and lifecycle safety
- **Priority:** P0
- **Objective:** Keep repeated queries and app backgrounding consistent.
- **Functional requirements:** One active completion; stop on cancel/timeout/background; old results cannot overwrite new query.
- **Technical requirements:** AiPort manager, queryId guard, stopCompletion and release promises; no native context in React state.
- **Files/modules involved:** src/ai/manager.ts; tests/ai/lifecycle.test.ts
- **Dependencies:** AI-003; INT-003 orchestration integration.
- **Inputs:** queryId, ExtractInput, app lifecycle event.
- **Outputs:** Result errors AI_TIMEOUT/CANCELLED; stable ModelState; safe release.
- **Implementation steps:** Serialize jobs; correlate IDs; stop native completion; await stop before new job; cancel on background; tear down safely; allow reinit.
- **Edge cases:** Cancel before init, double cancel, timeout then new request, release while running, resume after memory pressure.
- **Acceptance criteria:** No stale result, duplicate context or concurrent generation; next request works after cancel.
- **Testing requirements:** Fake native adapter state tests then real timeout/background/repeat physical tests.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Controller and UI invoke cancel; Member 4 owns app-level lifecycle listener.
- **Completion evidence:** Actual repeated/cancel tests, failure codes and observed recovery; no crash claim without device run.

### AI-005 — Measure accuracy, speed and memory; choose final model

- **Task ID:** AI-005
- **Task title:** Measure accuracy, speed and memory; choose final model
- **Priority:** P0
- **Objective:** Select smallest useful model from real evidence.
- **Functional requirements:** Compare cold/warm runs, difficult Taglish roles/negation; upgrade only if 0.5B inadequate and 1.5B usable.
- **Technical requirements:** Same runtime/context/output settings recorded; profiling tools; sample counts, median/p95; memory readings only if available.
- **Files/modules involved:** docs/evidence/ai-benchmarks.md; tests/ai/corpus.json; src/ai/modelManifest.ts if coordinated
- **Dependencies:** AI-002–AI-004; native builds INT-005.
- **Inputs:** Held-out corpus, phone specs, timers, profiler observations.
- **Outputs:** Final model choice and real benchmark table; explicit unknowns/failed cases.
- **Implementation steps:** Run20+ unique queries per primary phone; separate cold start; record errors; profile; inspect thermal behavior; make measured keep/upgrade decision before freeze.
- **Edge cases:** Model bigger than storage, slower 1.5B, thermal throttling, no memory tool, partial JSON truncation.
- **Acceptance criteria:** Targets: warm p95≤10 s, warm timeout 15 s; otherwise report actual and recovery; no unsupported accuracy/performance claims.
- **Testing requirements:** Physical both OS; extra Androids if available after primary pass.
- **Estimated effort:** 60–90 min; optional upgrade adds transfer/validation time
- **Integration instructions:** Member 4 release manifest locked; Member 3 displays honest state; no late model swap after regression.
- **Completion evidence:** Raw anonymized runs and aggregate formula; license/runtime/model revision.

### AI-006 — Prove offline AI and hand off

- **Task ID:** AI-006
- **Task title:** Prove offline AI and hand off
- **Priority:** P0
- **Objective:** Deliver reproducible real phone-local inference integrated with routing.
- **Functional requirements:** New query works after forcequit/relaunch in airplane mode; manual fallback when model absent.
- **Technical requirements:** Release bundled JS; no Metro/USB/laptop endpoint; current AiPort contract.
- **Files/modules involved:** docs/evidence/offline-ai.md; src/ai/README.md; tests/ai/
- **Dependencies:** AI-004, INT-003, INT-005, ROUTE-006.
- **Inputs:** Installed release, verified model+pack, fresh query not precomputed.
- **Outputs:** Per-device offline evidence and complete AI handoff.
- **Implementation steps:** Stop Metro; disconnect USB; disable radios; relaunch; run new query; demonstrate clarification; verify no hidden network dependency; document setup.
- **Edge cases:** Absent model, offline first launch, restart, version mismatch, fallback mistaken for AI.
- **Acceptance criteria:** At least one true new phone-local extraction on Android and iPhone; unsupported cases clear.
- **Testing requirements:** Coordinate acceptance T-OFF-01 and T-AI-01 on physical devices.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 archives evidence for video/README; all actual adapter imports connected.
- **Completion evidence:** Commands/setup, actual outputs, timings, offline clip/screens, tests executed and known limitations.

### AI-101 — Prototype local signboard OCR only after P0

- **Task ID:** AI-101
- **Task title:** Prototype local signboard OCR only after P0
- **Priority:** P1
- **Objective:** Add scanner only if the core is stable and ample time remains.
- **Functional requirements:** Quality gating, tokens, candidates and manual correction; route relevance via deterministic planner.
- **Technical requirements:** Runtime/package not selected; must research exact local OCR native compatibility first; contract v1.1.
- **Files/modules involved:** src/ai/scanner/; tests/ai/scanner/; UI/native edits coordinated.
- **Dependencies:** All P0 integrated and tested; Member 4 approval before feature freeze.
- **Inputs:** LocalImageUri and verified service aliases.
- **Outputs:** ScanResult with rawText/candidates/quality/warnings.
- **Implementation steps:** Select/test local OCR; sanitize image; extract; match aliases; confirm direction; never infer route solely from token.
- **Edge cases:** All scanner rows in edge matrix; privacy, permission, bad image, OOM.
- **Acceptance criteria:** Real offline OCR and correct candidate confirmation; otherwise cut scanner.
- **Testing requirements:** Physical images and airplane-mode test; no cloud OCR.
- **Estimated effort:** 2–4h; outside baseline, likely cut
- **Integration instructions:** Member 3 optional screen and Member 2 aliases; contract change first.
- **Completion evidence:** Exact library/license/model, actual OCR runs and unsupported images.

## Member 2 — Transportation data and routing

### ROUTE-001 — Establish corridor evidence and source register

- **Task ID:** ROUTE-001
- **Task title:** Establish corridor evidence and source register
- **Priority:** P0
- **Objective:** Determine which real journeys can be supported.
- **Functional requirements:** Research all three target corridors; record exact direction/stops/permissions/walks; distinguish terminal facts from complete service chain.
- **Technical requirements:** Primary operator/LGU/LRMC sources and legal map facts; SourceRef/Evidence; no synthetic release data.
- **Files/modules involved:** docs/evidence/sources.md; docs/evidence/corridor-status.md
- **Dependencies:** None; start parallel with native gate.
- **Inputs:** Published sources, dated teammate observations only if rules permit; requested corridors.
- **Outputs:** Source register and per-corridor missing/confirmed connection list.
- **Implementation steps:** Inspect source limits; collect fact-specific evidence; verify coordinate separately; check reverse independently; identify tricycle areas/fares; set data gate status.
- **Edge cases:** Town list mistaken for stop sequence, stale/contradictory fare, geocode mistaken for service, inaccessible source.
- **Acceptance criteria:** No corridor called supported until each ride/walk/legal stop is evidenced; unresolved sources transparent.
- **Testing requirements:** Paper trace/review by another registered teammate; source dates/usage basis checked.
- **Estimated effort:** 120 min first pass; continue only useful verification
- **Integration instructions:** Send clear coverage status at M1/M2; Member 3 can show actual limits; do not block pure graph tests.
- **Completion evidence:** URLs/dates/facts/license, outstanding gaps and explicit verified subset.

### ROUTE-002 — Build and validate separate release/test packs

- **Task ID:** ROUTE-002
- **Task title:** Build and validate separate release/test packs
- **Priority:** P0
- **Objective:** Make source-backed transit data queryable and safe to import.
- **Functional requirements:** Stable place/stop/service/direction IDs, directed walks, ordered stops, fare/source records; test pack kept separate.
- **Technical requirements:** TransitPack1.0, shared validation; schema mapping to SQLite; integrity/coordinate bounds.
- **Files/modules involved:** src/data/validatePack.ts; assets/data/release.json; tests/fixtures/transit-pack.json; tests/routing/data.test.ts
- **Dependencies:** ROUTE-001 for release evidence; INT-001 schema; INT-002 import collaboration.
- **Inputs:** Source register and validated fact records.
- **Outputs:** Release TransitPack only if real evidence; explicitly synthetic test_fixture pack; validation Result.
- **Implementation steps:** Normalize aliases; encode mode/direction; attach evidence; validate refs/sequences; reject fixtures from release; document coverage.
- **Edge cases:** Duplicate IDs/stops, dangling refs, invalid lat/lon, impossible paths, missing board/alight evidence.
- **Acceptance criteria:** Valid real pack imports; invalid pack rejected; synthetic pack cannot pass release gate.
- **Testing requirements:** Automated all-reference/schema tests, intentionally corrupt packs, manual source-to-record audit.
- **Estimated effort:** 60–90 min plus verification gaps
- **Integration instructions:** Member 4 importer reads exact TransitPack; routing receives immutable validated pack.
- **Completion evidence:** Validation output, pack version/hash and actual covered journeys; no fabricated placeholder release.json.

### ROUTE-003 — Implement directed multimodal journey search

- **Task ID:** ROUTE-003
- **Task title:** Implement directed multimodal journey search
- **Priority:** P0
- **Objective:** Return valid full journeys and nearest useful boarding point.
- **Functional requirements:** Strict modes/walk limits, no arbitrary transfer cap, legal stop order, up to 3 distinct options; no-route vs computationlimit distinct.
- **Technical requirements:** Pure TS expanded graph, nonnegative Pareto label-setting; stop+active direction state; computation guard.
- **Files/modules involved:** src/routing/graph.ts; src/routing/search.ts; tests/routing/search.test.ts
- **Dependencies:** ROUTE-002 test pack; INT-001 interfaces.
- **Inputs:** RouteRequest, validated TransitPack.
- **Outputs:** Result<RouteResult> with complete ordered JourneyLegs, transfers, rankReason or precise error.
- **Implementation steps:** Build directed connections; walk evidence only; board/alight checks; track new boarding; prune cycles; rank feasible full paths; reject unknown link.
- **Edge cases:** Disconnected closest terminal, reverse route, 3+transfers, cycles, similar stop names, walk cap, search guard.
- **Acceptance criteria:** Correct paper-oracle paths on small graphs; no illegal direction/boarding; nearest candidate useful for entire journey.
- **Testing requirements:** Fixtures: zero/one/two/three transfers, loop, disconnected, forbidden mode, guard; mutate graph to expose failures.
- **Estimated effort:** 90–120 min
- **Integration instructions:** RoutePort pure; Member 4 invokes after resolution; UI receives normalized legs.
- **Completion evidence:** Executed behavioral tests and worked path trace; complexity/label guard explained.

### ROUTE-004 — Implement fare calculation and honest ranking

- **Task ID:** ROUTE-004
- **Task title:** Implement fare calculation and honest ranking
- **Priority:** P0
- **Objective:** Show grounded costs without fictional totals.
- **Functional requirements:** Flat/matrix/documented-distance fares once per ride; ranges/discount basis; unknown and subtotal handling.
- **Technical requirements:** Integer centavos; FarePolicy/FareQuote; completeness-aware ranking; invalid/expired/conflicting policy unknown.
- **Files/modules involved:** src/routing/fares.ts; src/routing/rank.ts; tests/routing/fares.test.ts
- **Dependencies:** ROUTE-002, ROUTE-003.
- **Inputs:** Ride legs, policies, passenger preference, budget.
- **Outputs:** FareQuote per ride and aggregate complete/partial/unknown; lowest-known-fare qualification.
- **Implementation steps:** Lookup board/alight pair; apply documented rounding/discount; aggregate known min/max; retain unknown count; strict budget cannot assume unknown0.
- **Edge cases:** Expired policy, conflicting sources, missing distance, transfer double charge, range, onboard fare unknown.
- **Acceptance criteria:** Unknown never zero; subtotal labeled; no cheapest/within budget claim against unknown cost.
- **Testing requirements:** Fixtures for partial total, multiple boardings, missing pair, expiry/conflict, documented discount rounding.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 3 displays precise status/basis; Member 4 validates result shape.
- **Completion evidence:** Actual test output and formula/source trace; unresolved fare policies list.

### ROUTE-005 — Add manual onboard downstream transfer planning

- **Task ID:** ROUTE-005
- **Task title:** Add manual onboard downstream transfer planning
- **Priority:** P0
- **Objective:** Evaluate whether current service can contribute to destination path.
- **Functional requirements:** Confirmed direction and next legal stop; continue current ride to useful alighting/transfer, then another service if valid.
- **Technical requirements:** OnboardContext state, route sequence, legal transfer WalkLinks; same RoutePort and source evidence.
- **Files/modules involved:** src/routing/onboard.ts; tests/routing/onboard.test.ts
- **Dependencies:** ROUTE-003, ROUTE-004; frozen OnboardContext contract. UI-005 may develop in parallel with labeled adapters; it is not a prerequisite for routing logic.
- **Inputs:** RouteRequest.onboard with known directionId and confirmedNextStopId.
- **Outputs:** Continuation/transfer options or clarification; correct transfer count and unknowncurrent fare.
- **Implementation steps:** Check next stop belongs to direction; seed current-service state; enumerate later legal alighting; find complete onward path; avoid compass-only rejection.
- **Edge cases:** Current wrong way but useful downstream interchange, no legal alighting, passed stop, route crossing without walk, unknown service/direction.
- **Acceptance criteria:** No unsafe immediate dropoff or invented transfer; full path decides relevance.
- **Testing requirements:** Behavior tests with downstream connection and false intersection; physical/manual confirmation flow.
- **Estimated effort:** 60 min
- **Integration instructions:** Member 3 confirms context; Member 4 validates timestamps and avoids claiming tracking.
- **Completion evidence:** Worked fixture traces, actual test output, clear no-live-position boundary.

### ROUTE-006 — Audit real routes and integration correctness

- **Task ID:** ROUTE-006
- **Task title:** Audit real routes and integration correctness
- **Priority:** P0
- **Objective:** Prove algorithm results match current supported data.
- **Functional requirements:** Every demo path traced to evidence; release pack excludes fixture data; gaps shown explicitly.
- **Technical requirements:** Data validation, real engine run, forward/reverse separate; no fare amount inferred by AI.
- **Files/modules involved:** docs/evidence/route-audit.md; tests/routing/real-pack.test.ts if pack exists
- **Dependencies:** ROUTE-002–ROUTE-005; INT-003; sources complete for supported subset.
- **Inputs:** Final real pack and planned demo queries.
- **Outputs:** Per-corridor verified/unsupported status, expected journey traces and result comparisons.
- **Implementation steps:** Run validator; compare each leg to source; test exact role swap/reverse; verify walks/permissions; record unknown fares; lock dataset version.
- **Edge cases:** Model chooses unsupported place, incomplete chain, stale data, test case accidentally fixture, invalid walk path.
- **Acceptance criteria:** All advertised supported paths independently reviewed; unsupported corridors not marketed as functional.
- **Testing requirements:** Pure tests and source audit; manual route instructions review by teammate; no physical travel claim without it.
- **Estimated effort:** 60–90 min
- **Integration instructions:** Member 4 locks pack before regression/video; Member 3 displays actual coverage.
- **Completion evidence:** Executed output, source-linked audit, pack version and unresolved gaps.

### ROUTE-101 — Expand verified dataset after core freeze only by approval

- **Task ID:** ROUTE-101
- **Task title:** Expand verified dataset after core freeze only by approval
- **Priority:** P1
- **Objective:** Add more genuine routes/fare support without disrupting demo.
- **Functional requirements:** Tester-proposed data is reviewed; additional modes/places carry evidence.
- **Technical requirements:** Same pack version/schema and source review; no automatic publication.
- **Files/modules involved:** assets/data/; docs/evidence/
- **Dependencies:** ROUTE-006 and user-approved time available before freeze.
- **Inputs:** Draft verified facts from team/public sources.
- **Outputs:** New validated pack version and regression evidence.
- **Implementation steps:** Review each fact; add directed records; run full pack/route audit; coordinate atomic update; freeze again.
- **Edge cases:** Unreviewed tester route, mixed versions, missing reverse, license unclear.
- **Acceptance criteria:** No expanded coverage claim before end-to-end pass.
- **Testing requirements:** Validator+affected routes+release regression.
- **Estimated effort:** Variable, 60–120 min per bounded addition
- **Integration instructions:** Member 4 approves pack swap and QA; Member 3 labels coverage.
- **Completion evidence:** New sources, diff, actual validation and regressions.

## Member 3 — Native frontend and UX

### UI-001 — Build native shell and accessible visual system

- **Task ID:** UI-001
- **Task title:** Build native shell and accessible visual system
- **Priority:** P0
- **Objective:** Provide usable phone screens while modules are built.
- **Functional requirements:** Setup/home/confirm/results/detail/about native navigation, safe areas, readable hierarchy.
- **Technical requirements:** ExpoRouter native stack, StyleSheet, stable hooks/Pressable/Text; no new major UI library.
- **Files/modules involved:** app/index.tsx; app/setup.tsx; src/ui/theme.ts; src/ui/components/; rootlayout coordinated.
- **Dependencies:** INT-001; contract frozen.
- **Inputs:** Labeled mock readiness and valid test fixtures.
- **Outputs:** Native navigation shell and reusable status/step/button components.
- **Implementation steps:** Inspect baseline; create readable theme; build layouts; label dev fixtures; avoid render-heavy work; test small/large fonts.
- **Edge cases:** Small screen, clipped keyboard, safe area, font scaling, accessibility focus.
- **Acceptance criteria:** Every P0 screen reachable; primary actions labeled; no fixture presented as real data.
- **Testing requirements:** Physical/simulator layout and screen reader manual checks; actual device before freeze.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 supplies controller/context only; UI components don'tinitialize native engine.
- **Completion evidence:** Screen captures, tested sizes/OS and documented accessibility issues.

### UI-002 — Build text/manual entry and confirmation

- **Task ID:** UI-002
- **Task title:** Build text/manual entry and confirmation
- **Priority:** P0
- **Objective:** Let user correct AI fields and choose explicit constraints.
- **Functional requirements:** 600-character text limit; editable origin/destination; branch/locality candidates; strict modes/walk/direct/budget; manual route flow.
- **Technical requirements:** JourneyController.interpret returns JourneyDraft; confirm fields then submitConfirmed; manual selections call submitManual. Controlled stable form state; no direct raw model call.
- **Files/modules involved:** app/confirm.tsx; src/ui/journey-form.tsx; src/ui/place-picker.tsx
- **Dependencies:** UI-001; contract; mock repository/controller permitted until INT-003.
- **Inputs:** AI extraction candidates or manual place selections.
- **Outputs:** Confirmed RouteRequest; missing/ambiguous field recovery.
- **Implementation steps:** Build input form; preserve query; show candidates; enable swap/edit; apply defaults visibly; parse centavos/meters; confirm explicit exclusions.
- **Edge cases:** Destination only, home unknown, exact ambiguous name, invalid number, empty modes, same endpoint.
- **Acceptance criteria:** No hidden default origin; no automatic relaxation; all essential fields editable.
- **Testing requirements:** Manual scenarios for ambiguous branch, role correction, direct restriction and manual AI unavailable.
- **Estimated effort:** 60–75 min
- **Integration instructions:** Use JourneyController APIs; no raw generation/geocode in screen.
- **Completion evidence:** Actual form test steps/results and contract-conforming fixtures.

### UI-003 — Render grounded options and step instructions

- **Task ID:** UI-003
- **Task title:** Render grounded options and step instructions
- **Priority:** P0
- **Objective:** Make boarding, direction and dropoff obvious.
- **Functional requirements:** Up to 3 options with rank reason/transfers/fare status; ordered walk/ride steps; diagram; sources/date/warnings.
- **Technical requirements:** RouteResult/JourneyLeg templates, localized labels; no generated instructions or fastest badges.
- **Files/modules involved:** app/results.tsx; app/journey.tsx; src/ui/journey-card.tsx; src/ui/journey-steps.tsx
- **Dependencies:** UI-001; contract; ROUTE-003/004 later integration.
- **Inputs:** RouteResult or explicit test fixtures.
- **Outputs:** Accessible journey cards/detail; complete/partial/unknown fare presentation.
- **Implementation steps:** Distinguish board/dropoff; headsign prominent; show walking meters/steps; subtotal+unknown legs; evidence details; long journey scroll.
- **Edge cases:** Many transfers, unknown fare, no result, missing required leg field, range, misleading partial total.
- **Acceptance criteria:** User can name boarding point/direction/dropoff from screen; partial total never shown as total.
- **Testing requirements:** Manual fixture walkthrough then real pack journey; screen reader order and large font checks.
- **Estimated effort:** 75–90 min
- **Integration instructions:** Member 2 owns result semantics; report gaps rather than fill fields in UI.
- **Completion evidence:** Screens for complete/partial/unknown and actual route; manual results.

### UI-004 — Implement setup, offline and recovery states

- **Task ID:** UI-004
- **Task title:** Implement setup, offline and recovery states
- **Priority:** P0
- **Objective:** Make readiness and limitations actionable.
- **Functional requirements:** Model download state/progress/retry; separate pack readiness; AI unavailable manual action; unsupported/no journey/constraint errors.
- **Technical requirements:** ModelState/AppError; public readiness adapter; connectivity display not route proof.
- **Files/modules involved:** app/setup.tsx; src/ui/readiness.tsx; src/ui/error-card.tsx; src/ui/offline-status.tsx
- **Dependencies:** UI-001; AI-002; INT-002/003.
- **Inputs:** ModelState, dataset version, Result failures.
- **Outputs:** Preserved inputs and correct recovery actions; no false offline-ready label.
- **Implementation steps:** Render states; add retry/cancel; show download size; known-place offline explanation; optional online consent; specific constraint recovery.
- **Edge cases:** Offline first launch, missing model/data, full storage, GPS denied, network quota, corrupted pack.
- **Acceptance criteria:** Recovery works without restart where possible; manual flow accessible when AI fails.
- **Testing requirements:** Manual state matrix with mocks, then real interrupted download/offline test.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 4 wires adapters; Member 1 owns model state; no uncontrolled file access in UI.
- **Completion evidence:** State screenshots/results, verified readiness behavior and remaining limitations.

### UI-005 — Build manual onboard replan flow

- **Task ID:** UI-005
- **Task title:** Build manual onboard replan flow
- **Priority:** P0
- **Objective:** Support user's current-vehicle scenario without pretending automatic tracking.
- **Functional requirements:** Pick service/direction, confirm next known stop, destination; explain continue/transfer options and uncertainty.
- **Technical requirements:** OnboardContext and same RouteRequest/result screens; no background GPS.
- **Files/modules involved:** app/onboard.tsx; src/ui/onboard-form.tsx
- **Dependencies:** UI-002/003; ROUTE-005.
- **Inputs:** Service/direction lists and user-confirmed next stop.
- **Outputs:** Valid OnboardContext or clarification; readable downstream transfer instructions.
- **Implementation steps:** Show mode/service/headsign; filter stops by direction; require confirmation; route with context; offer pre-trip known stop fallback if uncertain.
- **Edge cases:** Unknown vehicle, passed stop, wrong direction, transfer crossing without connection.
- **Acceptance criteria:** No assertion that app knows vehicle location or arrival; no immediate unsafe dropoff prompt.
- **Testing requirements:** Manual wrong direction/useful transfer and unknown service tests; compare engine output.
- **Estimated effort:** 45–60 min
- **Integration instructions:** Member 2 validates continuation; Member 4 controller accepts context.
- **Completion evidence:** Actual flow results and screenshots, tested source/fixture boundary.

### UI-006 — Verify native UX and integrate real adapters

- **Task ID:** UI-006
- **Task title:** Verify native UX and integrate real adapters
- **Priority:** P0
- **Objective:** Remove demo mocks and make flow dependable on both phones.
- **Functional requirements:** Real controller only in release; complete query→confirm→result; edit/cancel/retry; localized warnings; accessible small screen.
- **Technical requirements:** Current contracts; release flag forbids mock providers; RN best practice review.
- **Files/modules involved:** src/ui/; app/; docs/evidence/ui-qa.md; tests/ui/manual.md
- **Dependencies:** UI-002–UI-005; INT-003/005; AI-006; ROUTE-006.
- **Inputs:** Actual installed app, real pack/model and device settings.
- **Outputs:** UX QA report and fixed P0 presentation defects.
- **Implementation steps:** Switch dependency injection once; remove fixture imports; test keyboard/scaling/reader; repeated queries; record coverage/readiness; finish polish before freeze.
- **Edge cases:** Stale results, rapid tap, suspended app, giant text, incomplete instructions.
- **Acceptance criteria:** No release fixture or raw AI instructions; users can recover/modify queries; real both OS flow tested.
- **Testing requirements:** Physical Android/iPhone smoke plus accessibility manual cases.
- **Estimated effort:** 60–90 min
- **Integration instructions:** Member 4 owns wiring/release gate; UI reports semantically missing data instead of patching.
- **Completion evidence:** Executed manual checklist, OS/screen sizes, real flow clip and defects.

### UI-101 — Add optional map/scanner screens after core

- **Task ID:** UI-101
- **Task title:** Add optional map/scanner screens after core
- **Priority:** P1
- **Objective:** Improve convenience only if underlying modules are real.
- **Functional requirements:** Map requires attribution; scanner requires confirmed tokens/service; manual correction; no false offline map claim.
- **Technical requirements:** Frozen v1.1 ScanPort or verified map provider; no new paid dependency.
- **Files/modules involved:** app/scan.tsx; app/map.tsx; src/ui/ optional modules.
- **Dependencies:** All UI P0; AI-101 real OCR; Member 4 approval before freeze.
- **Inputs:** Real ScanResult or attributed map coordinates.
- **Outputs:** Optional screen with clear quality/offline limitations.
- **Implementation steps:** Confirm data/runtime; build screen; permissions; connect same route planner; test unavailable feature states.
- **Edge cases:** All scanner edge cases, unavailable tiles, dangerous camera use.
- **Acceptance criteria:** Optional feature can be disabled; core unchanged; no fake OCR.
- **Testing requirements:** Physical local OCR/offline and map attribution checks.
- **Estimated effort:** 90–180 min; outside baseline
- **Integration instructions:** Coordinate contract/native changes; never start if gates are failing.
- **Completion evidence:** Actual results/providers/attribution or explicit cut.

## Member 4 — Integration, offline architecture, QA and release — user

### INT-001 — Bootstrap repo, contracts and native toolchains

- **Task ID:** INT-001
- **Task title:** Bootstrap repo, contracts and native toolchains
- **Priority:** P0
- **Objective:** Give all members one reproducible base and early build gate.
- **Functional requirements:** Create/connect authorized team repo, scaffold native Expo app, freeze contracts, install pins once; verify Windows Android and Mac signing.
- **Technical requirements:** Node 24, npm lockfile, Expo 57/RN0863, JDK 17, compileSDK36/NDK/cmake as required by the generated project; Xcode 26.6 reported.
- **Files/modules involved:** package.json/lock; app.config.ts; tsconfig; .gitignore; app/_layout.tsx; src/contracts/; native folders; README.
- **Dependencies:** Plan implementation approval; repo availability/credentials required for remote.
- **Inputs:** Empty workspace,approved contract, target device/toolchain.
- **Outputs:** One base commit/lockfile, shared types/validators, booting native baseline; actual repo evidence.
- **Implementation steps:** Inspect repo; preserve existing work; scaffold; pins; validate Expo; generate build; install missing tool versions; Personal Team config; publish base branch for clones.
- **Edge cases:** Missing NDK, no exact Android36, signing/entitlements, incompatible llama, no GitHub auth.
- **Acceptance criteria:** Both native build paths documented; all members share one base; secrets/models ignored; connectivity not assumed.
- **Testing requirements:** Typecheck, expo-doctor; native build/install with AI-001; auth read checks before claiming push.
- **Estimated effort:** 75–120 min; first gate
- **Integration instructions:** User owns contract/config; others branch only after base; coordinate AI native changes.
- **Completion evidence:** Actual commands/results, package versions, commit+remote SHA if connected; explicit blocked auth.

### INT-002 — Implement durable local storage and pack import

- **Task ID:** INT-002
- **Task title:** Implement durable local storage and pack import
- **Priority:** P0
- **Objective:** Make offline data persistence independent of AI.
- **Functional requirements:** Validated transactional SQLite import; version readiness; preserve old pack; bound SQL; private file adapter coordination.
- **Technical requirements:** ExpoSQLite57, TransitRepository schema, foreign keys/integrity; validated payload matches index columns.
- **Files/modules involved:** src/storage/; tests/integration/storage.test.ts; shared validator coordination.
- **Dependencies:** INT-001; ROUTE-002 test pack initially.
- **Inputs:** TransitPack, schema/version metadata.
- **Outputs:** TransitRepository initialize/getPack/resolvePlace/getPlace/replacePack/close Results.
- **Implementation steps:** Build migration; bind queries; normalize aliases; import transaction; rollback invalid; index search; check release fixture exclusion; persist after restart.
- **Edge cases:** Corrupt DB, bad ref, storage full, failed pack update, schema mismatch, ambiguous alias.
- **Acceptance criteria:** Last valid pack survives failed import/restart; invalid release pack rejected.
- **Testing requirements:** Adapter pure tests plus native SQLite import/rollback/restart test.
- **Estimated effort:** 60–90 min
- **Integration instructions:** Member 2 provides pack; controller/route consumes repository; no separate data format.
- **Completion evidence:** Actual native persistence and integrity output; schema/version and failure cases.

### INT-003 — Wire AI, place confirmation and deterministic routing

- **Task ID:** INT-003
- **Task title:** Wire AI, place confirmation and deterministic routing
- **Priority:** P0
- **Objective:** Deliver an early real end-to-end slice.
- **Functional requirements:** Controller extracts/validates/resolves/confirms; manual route path; strict preferences; cancel correlation; no raw AI text result.
- **Technical requirements:** JourneyController/AiPort/TransitRepository/RoutePort dependency injection; AppError contract.
- **Files/modules involved:** src/application/controller.ts; src/application/providers.ts; tests/integration/controller.test.ts
- **Dependencies:** INT-001/002; AI-003; ROUTE-003; UI-002; mock adapters only development.
- **Inputs:** ExtractInput or confirmed RouteRequest.
- **Outputs:** interpret returns Result<JourneyDraft> with editable candidates/preferences; submitConfirmed and submitManual return Result<RouteResult> or typed error after confirmation.
- **Implementation steps:** Wire dependency injection; initialize AI/data separately; interpret and resolve raw text into draft candidates; show every AI-derived field for confirmation; validate confirmed RouteRequest; call route engine; correlate query IDs; return warnings; require manually confirmed onboard context.
- **Edge cases:** Swapped roles, repeated query, route unavailable vs AI unavailable, malformed extraction, outside coverage.
- **Acceptance criteria:** One actual phone query feeds actual verified pack; ambiguous fields block routing until confirmation.
- **Testing requirements:** Contract fixtures fault injection then actual inference+real pack; test cancel/error boundaries.
- **Estimated effort:** 90–120 min
- **Integration instructions:** Member 3 real UI adapter switch; never automatically replace failed AI with fake extraction.
- **Completion evidence:** Trace with engine/pack version and actual results; integration smoke check.

### INT-004 — Gate optional zero-cost address and walking helpers

- **Task ID:** INT-004
- **Task title:** Gate optional zero-cost address and walking helpers
- **Priority:** P1
- **Objective:** Enable arbitrary endpoints only when real paths and free service exist.
- **Functional requirements:** Explicit online action/consent; ORS key server secret; candidates/walk links attributed; offline stored-place fallback.
- **Technical requirements:** GeoPort optional Cloudflare Worker Free; request validation/rate/quota; no paid tier, no Nominatim autocomplete default.
- **Files/modules involved:** src/network/; services/geo-proxy/; tests/integration/geo.test.ts
- **Dependencies:** INT-003 stable; free account/key/no-card terms verified; user authorizes external deployment when ready.
- **Inputs:** Address query/Point endpoints inside pilot areas.
- **Outputs:** Result<PlaceCandidate[]> or Result<WalkLink> with Evidence; precise outage/quota errors.
- **Implementation steps:** Check actual free account; implement reviewable proxy; configure secret without printing; validate boundaries; disclose provider; cache validated paths; disable if gate fails.
- **Edge cases:** Key leak, quota, provider outage, GPS inaccuracy, nonsensical walk, unsupported area.
- **Acceptance criteria:** No hidden online core dependency; no secrets in bundle/Git; path distance real; manual mode continues.
- **Testing requirements:** Mock outage/quota pure tests; actual online geocode/walk if enabled; no-network manual test.
- **Estimated effort:** 45–90 min; cut if core late
- **Integration instructions:** Controller requests helper only on explicit action; Member 2 reviews walk paths; Member 3 shows connectivity.
- **Completion evidence:** Provider terms/quota/attribution, actual calls result, deployed URL only if authorized and performed.

### INT-005 — Build standalone Android and Personal Team iOS releases

- **Task ID:** INT-005
- **Task title:** Build standalone Android and Personal Team iOS releases
- **Priority:** P0
- **Objective:** Ensure demo needs neither ExpoGo nor Metro.
- **Functional requirements:** Android APK install, Mac Xcode Release device install, bundled JS, trust/developer mode; local model/pack persistent.
- **Technical requirements:** Official local native build tools; signing seven-day limit; optional memory entitlements disabled initially.
- **Files/modules involved:** android/; ios/; app.config.ts; docs/evidence/builds.md; README build steps.
- **Dependencies:** INT-001; AI-001 gate; INT-003 real wiring.
- **Inputs:** Integrated source,lockfile,model manifest,pack version, local signing.
- **Outputs:** Installed standalone builds on both primary phones; artifact paths and version/commit.
- **Implementation steps:** Build release; install; disconnect dev tools; cold launch; permissions; inspect no fixtures; retest after restart; retain known stable artifact.
- **Edge cases:** Signing expires, no Mac, native ABI, JS not bundled, development URL, permissions.
- **Acceptance criteria:** Both cold launch and operate without Metro/USB; actual version recorded.
- **Testing requirements:** Physical release install/cold launch on Android/iPhone; no simulator-only pass.
- **Estimated effort:** 75–120 min plus build time
- **Integration instructions:** Members 1/3 run release proof; Members 2/4 lock data; no shared config edits outside owner.
- **Completion evidence:** Commands/results and artifact metadata; signing expiry/install steps; device anonymized.

### INT-006 — Run integration, offline and regression gates

- **Task ID:** INT-006
- **Task title:** Run integration, offline and regression gates
- **Priority:** P0
- **Objective:** Find cross-module failures while time remains.
- **Functional requirements:** Pure tests/typecheck/data validation; physical offline/cancel/restart/failure; no fixtures/secret/cloud AI in release.
- **Technical requirements:** Acceptance plan; node:test via tsx; native profiling/manual scripts; actual Result errors.
- **Files/modules involved:** tests/integration/; scripts/check-release.ts; docs/evidence/acceptance.md
- **Dependencies:** INT-003/005; AI-006; ROUTE-006; UI-006.
- **Inputs:** Release build and locked model/pack; full checklist.
- **Outputs:** Executed results with pass/fail/not run; critical fixes before freeze.
- **Implementation steps:** Run checks; airplane-mode cold launch fresh query; reboot; hash fail/storage cases; inspect network boundaries; compare fare/instruction; two OS; fix only critical after freeze.
- **Edge cases:** Mock adapters in release, stale query, disconnected transfer, partial total, cold load failure, quota reset.
- **Acceptance criteria:** No critical fake/misdirection/crash defect; honest unsupported coverage and untested devices.
- **Testing requirements:** Defined T-AI/T-ROUTE/T-FARE/T-OFF/T-UI/T-REL cases; record actual commands and durations.
- **Estimated effort:** 90–120 min; starts incrementally at M2
- **Integration instructions:** All members own component fixes; Member 4 merges minimal fixes and locks build.
- **Completion evidence:** Actual test logs/manual results, failures/limitations, release commit/pack/model.

### INT-007 — Package documentation, video and submission evidence

- **Task ID:** INT-007
- **Task title:** Package documentation, video and submission evidence
- **Priority:** P0
- **Objective:** Submit a reproducible, honest entry before deadline.
- **Functional requirements:** Public repo if required,README/install/coverage/disclosures/licenses,~1 min video,post draft,final receipt;no external posting without user instruction.
- **Technical requirements:** Verified event rules; exact model/runtime/tool versions; Git remote evidence; internal 10 AM deadline.
- **Files/modules involved:** README.md; LICENSE/NOTICE as appropriate; docs/evidence/; docs/submission.md
- **Dependencies:** INT-006; actual briefing verification; user controls accounts/submission.
- **Inputs:** Stable build,actual benchmarks/source audit,demo footage, event materials.
- **Outputs:** Reviewable submission package and actual submission receipt when user executes/authorizes.
- **Implementation steps:** Update README; label offline boundary; cite attribution; explain all claims; record video; rehearse; verify public repo/commit; prepare post; submit early with user; check receipt.
- **Edge cases:** Missing PDF, conflicting rules, failed video/upload, private remote, unverified performance, code after freeze.
- **Acceptance criteria:** Materials accurately match tested build; all official mandatory items checked; no claimed post/submission without receipt.
- **Testing requirements:** Fresh clone instructions review if time; link/video check; disclosure check; timed rehearsal.
- **Estimated effort:** 60–90 min; finish by 08:30
- **Integration instructions:** Each member provides evidence; user owns merges/visibility/publishing; no assistant messaging others without authorization.
- **Completion evidence:** Final URLs/commit/receipt if actually done; otherwise ready/not performed clearly.

## Estimate and capacity check

P0 estimates total approximately 27–36 person-hours, plus downloads/build waiting and data verification. Four members have roughly 34 available team-hours through the 6 AM release gate (including QA) before release buffers if implementation starts around 9 PM. Preserve release buffers and cut P1 when gates slip. INT-004 is P1; online lookup is not a mandatory dependency of the local stored-place core.
