# AGENTS.md — AlalayByahe

These instructions apply throughout this workspace. Follow the user's current instructions and preserve the agreed product scope.

## Start here

Read the relevant planning documents before changing application code:

- [Planning index](docs/planning/README.md)
- [Master plan](docs/planning/01-master-plan.md)
- [Shared integration contract](docs/planning/02-shared-integration-contract.md)
- [Detailed task backlogs](docs/planning/03-team-backlogs.md)
- [Execution dashboard and Git workflow](docs/planning/04-team-execution.md)
- [Edge-case matrix](docs/planning/05-edge-case-matrix.md)
- [Acceptance and demo checklist](docs/planning/06-acceptance-and-demo.md)

The planning package is complete; production implementation has not yet been authorized. Creating or editing this instruction file does not authorize building the app. When the user explicitly approves implementation, proceed without repeatedly requesting the same approval and update the planning status accordingly.

Inspect the actual workspace, Git state, installed dependencies and available devices. Treat current evidence as authoritative. Do not present planning assumptions or proposed package pins as installed, tested functionality.

## Product requirements

AlalayByahe is a standalone native Android and iPhone commute assistant. Users ask in Filipino, English or Taglish and receive a grounded journey.

- Meaningful intent extraction runs locally on the phone.
- Route search, fare calculation and instruction rendering use deterministic logic and source-backed local data.
- The language model must never be the authoritative source for routes, boarding points, directions, walking paths, availability or fares.
- Support pre-trip planning and manually confirmed onboard replanning. Do not claim automatic vehicle tracking.
- Mode types are van/UV, jeepney, bus, tricycle and LRT. Only recommend services supported by evidence.
- Target corridors are Lipa to Candelaria Quezon, Lipa to San Pablo Laguna, and Candelaria to Vito Cruz/Taft. They remain targets until verified end to end; advertise only actual supported coverage.
- Scanner and street maps are optional. They must not delay the core local-AI journey flow.
- Avoid paid services. Do not introduce a paid tier or automatic upgrade.

## Architecture and shared contracts

The planning baseline is Expo 57, React Native, TypeScript, llama.rn, Qwen2.5 0.5B Instruct Q4_K_M, and SQLite. Use the exact versions, model revision, byte count, SHA256 and interfaces in the shared integration contract. Compatibility remains unverified until native builds and real inference pass.

Do not independently change dependencies, schemas, modes, IDs, units, function signatures or error shapes. Member 4 owns shared contracts and configuration. Propose material changes with the reason, affected modules, tests and migration; coordinate approval and version the contract before dependent work.

Keep routing/data logic independent of React and native APIs. Validate model output and imported data at module boundaries. Use structured errors, stable IDs, integer meters/centavos and explicit source references.

AI extraction produces an editable draft. Confirm extracted origin, destination and preferences before routing. Missing, ambiguous or contradictory information requires clarification. Never silently swap place roles or guess a home destination.

## Grounding and journey correctness

- A terminal address, matching signboard token or crossing route line does not establish a complete journey.
- Select the nearest useful legal boarding point with a real pedestrian path and a valid onward journey.
- Select a legal dropoff connected to the destination by a documented pedestrian path.
- Respect service direction, ordered stops and explicit boarding/alighting permissions. Reverse journeys need separate evidence.
- Transfers require usable stops and documented directed walking links. Do not treat aerial distance as walking distance.
- Allow the transfer count required by the journey; do not impose an artificial two-transfer cap.
- Default access and egress walking limits are 1 km; transfer walking is 500 m. Users can adjust them.
- Explicit mode exclusions, direct-only requests, walking limits and budgets are strict. Explain an unsatisfied constraint and let the user decide whether to change it.
- Evaluate the full downstream path during onboard replanning. Require confirmation of the current service, direction and next stop; do not advise immediate alighting from compass direction alone.
- Tricycle legs require documented stands/service areas. Do not invent arbitrary tricycle connections.
- Missing ride, walking or boarding evidence means no verified complete journey. Show known facts separately, not a complete-looking fabricated fallback.

Maintain source, date, usage basis and verification status for release data. Review tester contributions before publishing them. Synthetic fixtures belong only in tests/development and must never ship as verified demo data.

## Fares and claims

Distinguish verified, estimated and unknown fares. Provide the source or calculation basis. Unknown values are not zero. Show known subtotals and unknown ride segments separately; do not label a partial subtotal as the full total.

Apply discounts, distance formulas and rounding only when documented. Unknown costs cannot establish a strict budget or prove the cheapest overall option. Do not claim fastest travel, live arrivals or current vehicle availability without dependable supporting data.

## Offline AI and resources

Verify the publisher-pinned model's bytes and SHA256 before initialization. Download into private persistent storage, use bounded incremental hashing, and promote only a complete verified file. Do not load the entire model into a JavaScript buffer or commit model weights to Git.

Use one native inference context, one active completion and correlated query IDs. Cancel timed-out/backgrounded work, ignore stale results and clean up safely. Keep expensive initialization out of React render.

AI and transit-data readiness are separate. If AI is missing or fails, offer manual place/preference search and label AI unavailable. Manual routing does not prove local AI works.

Offline core means stored-place journeys after initial model/data setup. New arbitrary addresses and uncached pedestrian paths may need optional internet. Disclose that boundary and provide stored-place selection when offline.

A laptop-local fallback is acceptable only when clearly labeled with the device executing inference. A phone calling a laptop is not phone-local inference.

## Team ownership

| Member | Owned modules | Boundary |
|---|---|---|
| 1 — Local AI | src/ai/, tests/ai/, model evaluation | Coordinate native configuration and dependency changes |
| 2 — Data/routing | src/data/, src/routing/, assets/data/, tests/routing/ | Coordinate storage, contracts and pack changes |
| 3 — Frontend | app/ screens except root layout, src/ui/, tests/ui/ | Use shared controller/results; no direct raw-model or database logic |
| 4 — User/integration | Contracts, storage, application, network, configuration, native projects, release and merges | Coordinate integration fixes with module owners |

Use the assigned task IDs. Respect ownership while making coordinated integration fixes. Deliver small working slices at checkpoints, not one large final untested branch. Update the dashboard with actual status and evidence.

## Verification and handoff

Run checks appropriate to the actual changes and available project scripts. Do not claim nonexistent scripts or unexecuted tests passed.

Application verification requires meaningful pure-module tests, type checks, pack validation and physical-device checks where applicable. Mocked native adapters cannot prove native inference, signing, SQLite persistence or device performance.

Before claiming offline phone-local functionality, test an installed release on Android and iPhone: stop Metro, disconnect USB/laptop bridges, disable radios, force-quit, relaunch and enter a fresh query. Verify persisted resources and real extraction feeding real routing.

Record actual devices, OS, runtime/model/pack versions, sample counts, timings, errors and limitations. Proposed targets are not benchmarks. Report Pass, Fail, Not Run or Deferred honestly.

A handoff includes task IDs, changed files, actual tests/results, interfaces, dependency changes, unresolved blockers, integration steps and verified Git status.

For hackathon execution, the provisional internal deadline is October 10, 2026 at 10:00 AM Philippine time. The participant briefing PDF was not provided; verify official requirements before claiming compliance. Recheck current time and the latest user-approved schedule when execution starts.

## Git and GitHub

User instruction: **"After every prompt and change I want you to commit the change in github if there is a repository connected."**

When a repository is connected, inspect status/diff, commit the task-owned changes and push to its configured GitHub remote. Verify the local commit and remote result before claiming completion. Preserve unrelated changes and do not create empty commits for read-only prompts.

If there is no repository or remote, report that clearly. Do not invent a successful commit/push or initialize/publish a repository solely to hide that limitation.

Use the agreed feature branches. Member 4 owns shared-main merges; coordinate conflicts and dependency/lockfile changes. Do not force-push shared main.

## Privacy and external actions

Never commit or print secrets, .env values, signing material, private device identifiers or personal journey logs. Optional provider keys belong in server secrets, not the mobile bundle.

Local inference keeps queries on the executing device. Optional geocoding/walking services receive selected addresses/coordinates; disclose this and require an explicit online action. Do not promise blanket privacy for online helpers.

Do not send messages to other people, publish social posts, deploy external services or submit the event entry without direct user authorization. Prepare concrete reviewable materials first. Do not ask again for authorization already given.

