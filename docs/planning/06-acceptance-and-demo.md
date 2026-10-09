# Integration, Acceptance, Evidence and Demo

> **Scope change (2026-10-10): iOS is excluded.** The team dropped iPhone because of limited resources, so Android is the only target platform. Read every iOS/iPhone requirement below as out of scope; it is kept as history. No iOS native build, signing, install or inference has been done or claimed.

All checks below are **planned / not run**. Passing pure fixture tests cannot establish a real service. Passing the real-data audit cannot establish physical local inference. Both are needed.

## Release acceptance checklist
- [ ] Plan approved for implementation; one baseline/contract version and lockfile.
- [ ] Actual briefing obtained/reviewed or missing requirements clearly flagged.
- [ ] Signed native installed app works on Android without ExpoGo/Metro/USB. (iPhone descoped 2026-10-10.)
- [ ] Phone-local Qwen inference performs a fresh query on both platforms.
- [ ] Model integrity/version/license verified; no weights/secrets in Git.
- [ ] AI output parsed/schema checked/semantically checked; every extracted journey field shown for confirmation.
- [ ] AI unavailable/timeout offers manual search with honest label.
- [ ] Release uses real adapters and kind release pack; no synthetic fixture source.
- [ ] Every advertised complete path has evidenced directed service/boarding/alighting/walking connection.
- [ ] Actual supported subset of three corridor targets stated; unsupported targets remain explicit.
- [ ] Useful terminal is selected by feasible pedestrian access + complete onward journey.
- [ ] Transfer count variable; legal downstream onboard transfer; no guessed vehicle position.
- [ ] Strict mode/direct/walk/budget constraints never automatically relaxed.
- [ ] Fare source/date/basis visible; unknown null, ranges preserved, subtotal distinct from total.
- [ ] No fastest/live arrival claim without supporting data.
- [ ] Stored-place local search/routing/fare works offline after setup.
- [ ] New uncached addresses/walking paths clearly require optional connectivity.
- [ ] Repeated/cancel/background/restart requests do not show stale results.
- [ ] Failed pack/model update preserves previous valid resource.
- [ ] Small screen, large type, screen reader and keyboard flows checked.
- [ ] Both primary phones cold-launch/new-query proof; extra Androids labeled tested/untested.
- [ ] No critical unsafe/fabricated path or hidden cloud-AI dependency.
- [ ] README, attribution/licenses/model+runtime+AI-tool disclosures reflect actual build.
- [ ] Demo recording and backup build prepared; timed pitch rehearsal.
- [ ] Repository visibility/remote commit verified and submission receipt captured when performed.

## Planned tests
| ID | Behavior | Method and objective evidence |
|---|---|---|
| T-CON-01 | Exact shared contracts and error shape | Typecheck; serialize/validate positive and malicious inputs |
| T-AI-01 | Actual local inference | Fresh physical-phone output and model/runtime revision |
| T-AI-02 | Taglish roles/preferences | ≥20 held-out cases/device, exact-slot comparison; target ≥90%, publish actual misses |
| T-AI-03 | Invalid/truncated/injection output | Reject schema/flags; never route from partial JSON |
| T-AI-04 | Missing/ambiguous fields | JourneyDraft candidates/missingFields; no route before confirmation |
| T-AI-05 | Cancellation and timeout | Native stop awaited; next request succeeds; no stale result |
| T-AI-06 | Model integrity/restart | Wrong bytes/hash rejected; .part not loaded; final verified file reused |
| T-DATA-01 | Pack integrity | IDs/ref/sequence/coordinates/fare/evidence validation; intentional invalid packs |
| T-DATA-02 | Fixture exclusion | Release rejects test_fixture/test_ source/provider |
| T-DATA-03 | Real corridor audit | Each ride/walk/permission independently traced to source; unsupportedgap explicit |
| T-DATA-04 | Reverse direction | Separate evidence and paths; no automatic symmetric route |
| T-ROUTE-01 | Direct and transfers | Tiny synthetic paper-oracle paths, 0/1/2/3+ transfers |
| T-ROUTE-02 | Useful terminal | Nearby disconnected stop loses to farther reachable useful stop within cap |
| T-ROUTE-03 | Direction/legal stops | Wrong sequence/board/alight forbidden |
| T-ROUTE-04 | Walking | Directed real path required, independent access/transfer/egress caps |
| T-ROUTE-05 | Strict constraints | No silent exclusion/direct/budget relaxation; distinct no-route/constraint error |
| T-ROUTE-06 | Cycles/search guard | Termination; SEARCH_LIMIT_REACHED distinct from no verified route |
| T-ROUTE-07 | Onboard downstream connection | Continue current service to legal future transfer; reject crossing-only connection |
| T-FARE-01 | Per-boarding fares | No per edge/double charge; flat/matrix/distance-policy examples |
| T-FARE-02 | Unknown/range/partial | Unknown null; known subtotal and count of unknowns; no fake cheapest |
| T-FARE-03 | Discount/expiry/conflict | Only documented eligibility/rounding; stale/conflicting fare unknown |
| T-STOR-01 | Import persistence | Native SQLite transaction rollback/restart with valid existing pack |
| T-STOR-02 | Resource failure | Missing/corrupt DB/model/full storage gracefully reports readiness |
| T-INT-01 | Real vertical slice | Actual extraction→draftconfirm→real complete journey→UI with versions |
| T-INT-02 | Failure distinction | AI error vs data error vs no journey vs permission/networklimit preserve recovery |
| T-INT-03 | Repeat and lifecycle | Rapid submit/edit/cancel/background/resume has correct queryId |
| T-OFF-01 | Phone-local cold proof | Forcequit, airplane, all radios off, Metro stopped, USB removed, new query on Android (iOS descoped) |
| T-OFF-02 | Device restart | Reboot primary phone, offline relaunch, persisted resources + new query |
| T-OFF-03 | First-use boundary | No model => explicit setup/manual; no false offline-ready claim |
| T-OFF-04 | Optional helper outage | Offline stored workflow still works; new address/path asks connectivity |
| T-PERF-01 | Warm extraction | ≥20 fresh cases/device; actual median/p95/timeouts and settings |
| T-PERF-02 | Cold init/memory/thermal | Separate init timing; profiler available readings and observed failure |
| T-PERF-03 | Small-pack search | Actual engine timings; target≤500 ms; labelcount/packsize |
| T-UI-01 | Boarding/dropoff comprehension | Teammate states service/direction/board/alight from screen; no prompthelp |
| T-UI-02 | Accessibility | Large font/small viewport/reader/keyboard actions and step order |
| T-UI-03 | Readiness/error/manual flow | Download retry/cancel and AI unavailable manual journey |
| T-UI-04 | Fare/coverage wording | Partial subtotal not total; sources/dates/unsupported corridor clear |
| T-REL-01 | Standalone native build | Installed Release, bundled JS; no Metro URL dependency |
| T-REL-02 | Secret/license/fixture review | No .env/model weights/signing data; license notices; provider attribution |
| T-REL-03 | Reproducible handoff | README current, actual build versions/commit/pack/model; fresh clone review if time |
| T-REL-04 | Submission evidence | Actual public visibility/video links/receipt, no invented completed post |

The 140 EC cases in the edge matrix refine these tests. Record each as Pass/Fail/Not Run with reason. Do not mass-mark scanner P1 tests passed when scanner is omitted: mark Deferred/Not Applicable.

## Test execution approach
Member 4 defines package scripts during bootstrap:
- typecheck: TypeScript noEmit;
- test:pure: Node node:test through tsx for pure modules, no native/React imports;
- data:validate: shared/schema/release-pack integrity and source checks;
- release:check: no fixture adapter/pack, no secret/model artifacts, required configuration;
- lint only after configuring compatible rules; don't claim a missing script ran.

Run typecheck, relevant behavior tests and validator at merge. Broaden after new failures or integration changes, not repeated ceremonial test runs. Native SQLite/llama/signing/storage require installed-device checks in addition to pure adapters. No gratuitous tests for static planning-document edits.

Build routes: local Expo prebuild/Android Gradle and Mac Xcode Release. Member 4 checks installed CLI flags/toolchain before execution and records exact command. Do not depend on paid EAS/Apple memberships. Android APK installation is local; iOS test signing is Personal Team with seven-day expiry. User must enable trust/developer mode where required.

## Offline proof procedure
1. Before isolation, record app commit/version, pack version, manifest SHA/model revision, OS/device and successful setup. Warm and cold timings separate.
2. Choose a new short Taglish query not precomputed in UI; teammate can change a preference or use another supported place pair.
3. Stop Metro/dev server. Disconnect USB and any laptop tether. Force-stop app.
4. Enable airplane mode; explicitly turn WiFi/Bluetooth off. Do not enable LAN fallback.
5. Launch installed release. Show separate model/data readiness.
6. Enter new query, let actual native extraction run, inspect engine/model identifier in debug evidence, confirm fields and compute journey.
7. Show grounded boarding/dropoff/transfer and one fare-source/unknown detail.
8. Cancel/repeat/edit once; repeat offline after app restart. Reboot at least one phone.
9. Record no helper-network requirement. Screenshots alone of previously rendered result do not prove fresh inference.
10. Repeat on additional Android phones if available; disclose failures. (iPhone descoped.) Optional network profiler/packet evidence helps but must not be invented.

## Benchmark record template
| Device/OS | App commit | Runtime/model/hash | Pack | Cold init ms | n warm cases | Median/p95 ms | Timeouts/errors | Peak memory/tool | Thermal observations |
|---|---|---|---|---:|---:|---|---|---|---|
| Not measured | — | — | — | — | — | — | — | — | — |

Record text lengths/token settings and whether CPU/Metal. Accuracy = exact critical role/preference cases correct / all held-out cases; list failures and clarification strategy. Do not report successful-only latency while hiding timeouts. File size is not peak RAM. Free RAM changes; hardware specs alone do not establish feasibility.

## Five-minute pitch/demo
| Time | Content |
|---|---|
| 0:00–0:35 | A commuter knows a destination but not useful terminal/direction/transfer. State limited verified coverage. |
| 0:35–1:05 | Explain phone-local Taglish extraction and deterministic source-backed routing; model already preloaded. |
| 1:05–2:30 | Airplane-mode fresh query; show extracted fields, confirm, view complete supported journey and board/dropoff. |
| 2:30–3:15 | Change strict mode/walk preference or manually confirmed onboard scenario; show real valid option/no-match. |
| 3:15–3:50 | Fare source/unknown caveat, dataset dates, optional online boundary; no claimed live tracking. |
| 3:50–4:30 | Real measured device/runtime/latency and architecture; no fabricated benchmark. |
| 4:30–5:00 | Actual achieved scope, current gaps and next data expansion; invite questions. |

Prepare an approximately 60-second video: 10 s problem, 10 s local/offline boundary, 30 s fresh actual query and route, 10 s evidence/limits. No edited jump presented as uninterrupted timing. Name model/runtime/build device and disclose preloaded resources.

## Three-minute Q&A preparation
| Likely question | Honest answer basis |
|---|---|
| What runs locally? | Phone-native Qwen extraction, SQLite places, graph/fare calculation and templates. Initial model download/optional new addresses may need internet. |
| Why use AI? | Language roles, mixed Taglish and preferences; graph/fare remain deterministic for correctness. |
| How prevent hallucination? | Strict output shape, semantic/user confirmation, no route/fare fields in extraction, evidence-backed graph. Syntax grammar alone is not correctness. |
| Is this nationwide/live? | No. State actual supported subset; no live arrival/traffic, confirm current operator service. |
| Where are fares/routes from? | Exact published source/audit and date; show unknowns, no guessed totals. |
| Is there an iPhone version? | No. iOS was excluded on 2026-10-10 because of limited resources; the app is Android only and iOS is untested. |
| What if model/device fails? | Manual local routing is useful but not AI proof; tested second phone/disclosed laptop local fallback. |
| Is it private? | Queries/inference local; optional online geocoding sends selected address/coordinates to named provider; no blanket privacy claim. |
| What was measured? | Show actual n, devices, versions, cold/warm, errors and unavailable metrics; never expected results as measurements. |
| Built during event? | Git timestamps/tasks plus disclosure of pretrained model/libraries/AI coding tools; follow actual briefing. |

## Backup demonstration
Keep last tested APK, model+pack, charged primary/secondary devices and local copy of real recorded video. No live network needed for main demo. Laptop-local fallback must perform real inference/route locally and display “AI runs on this laptop”; a phone-LAN client requires network and cannot pass phone airplane proof. Pre-recorded video is labeled backup recording. No static fake result or mock presented as runtime.

## Submission/compliance checklist
- [ ] User checks actual briefing/portal deadline, code freeze, public repo, post format/hashtag and pitching limits.
- [ ] Four registered teammates and no prohibited external human assistance.
- [ ] Code substantially created during event; pretrained models/tools/third-party assets disclosed.
- [ ] GitHub remote and public visibility verified; latest tested commit pushed; repo links valid.
- [ ] README: problem, actual features/coverage, model setup size, offline first-use boundary, manualfallback, build/install, signing limitations.
- [ ] Model Apache-2.0 attribution; llama.rn/runtime/dependencies license notices; @noble/hashes MIT; source/map/provider attributions.
- [ ] AI coding assistant/tool names and actual usage disclosed; no invented tools.
- [ ] Model manifest pinned revision/hash/license, no weights or secrets/signing material in Git.
- [ ] Device/performance/offline evidence real; unsupported phones/corridors clearly labeled.
- [ ] ~1 minute video and backup; 5 minute pitch/3 minute Q&A rehearsal.
- [ ] X/LinkedIn post draft with required tags/hashtag afterrule check; user authorizes actual publishing.
- [ ] One team submission through correct event portal; uploaded repo/video details checked.
- [ ] Receipt/time/link captured; no “submitted” claim without direct confirmation.
- [ ] Submission target 08:30 Manila, buffer to 10:00; no essential post-freeze changes.
- [ ] Finalists' in-person SM Makati attendance/logistics planned by team.

No posting, messages to others, repository-publicity changes or event submission has occurred during this planning turn.
