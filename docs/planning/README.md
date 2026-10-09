# AlalayByahe Planning Package

**Status: complete planning proposal; production implementation awaits approval.**

Start with [Master plan — 18 requested parts and 8 delegation deliverables](01-master-plan.md).

| File | Purpose |
|---|---|
| [Shared integration contract](02-shared-integration-contract.md) | Exact proposed stack/model, types/schema, module examples, SQLite, lifecycle and ownership |
| [Detailed team backlogs](03-team-backlogs.md) | 28 tasks, including 24 P0, each with 17 required handoff fields |
| [Execution and dashboard](04-team-execution.md) | Parallel overnight timeline, Git workflow, milestones, critical path and status table |
| [Edge-case matrix](05-edge-case-matrix.md) | 140 planned cases across NLP, routing, fares, scanner, offline, UX, reliability and safety |
| [Acceptance and demo](06-acceptance-and-demo.md) | Release gates, actual-device proof, test plan, pitch/video/Q&A and submission checklist |

## Four independently usable prompts
Copy the entire relevant file into that member's AI assistant. Each includes sections A–L, full assigned task specifications, the full common integration contract and role-specific edge cases. Each starts in Planning Mode; implementation begins only after approval.

1. [Member 1 — Local AI](prompts/01-local-ai.md)
2. [Member 2 — Transportation data and routing](prompts/02-routing-data.md)
3. [Member 3 — Native frontend](prompts/03-native-frontend.md)
4. [Member 4 — User: integration, offline and QA](prompts/04-integration-qa.md)

## Review before implementation
The agreed product is native Android/iPhone, phone-local Qwen extraction, deterministic verified routing, truthful fares, manual onboard replanning and offline stored-place journeys after setup. Scanner/maps are optional. Arbitrary new addresses/walk paths may require optional connectivity.

Important gates: Expo 57+llama.rn compatibility and free iOS signing need actual native tests; all three corridor targets need real source-backed end-to-end data. No implementation, benchmark, verified corridor pack, deployment or submission has been performed. The missing participant briefing PDF leaves some pasted event rules unconfirmed. Treat Oct 10,10 AM Manila as the conservative internal deadline.

No Git repository is connected to this workspace, so no commit/push could be performed for these planning documents. Once connected, the user's standing commit/push instruction applies to task-owned changes.

This package creates planning Markdown only. It does not create production application files.
