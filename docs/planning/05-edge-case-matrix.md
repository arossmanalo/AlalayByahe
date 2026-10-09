# Edge-Case Matrix

> **Scope change (2026-10-10): iOS is excluded.** The team dropped iPhone because of limited resources, so Android is the only target platform. Read every iOS/iPhone requirement below as out of scope; it is kept as history. No iOS native build, signing, install or inference has been done or claimed.

This matrix includes every category required by the pasted master prompt. Severity: Critical = possible fabricated/unsafe physical guidance or false core proof; High = core correctness/recovery; Medium = usability. P0 applies to release; scanner P1 cases apply only if scanner is enabled. Test IDs are planned cases, **not executed passes**. User text is suggested copy, localized in implementation. Normal cases need not display extra warnings.

## A. Natural language

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-001 | Destination only | Ask origin; retain destination | Draft missingFields origin | Where are you starting? | High | P0 |
| EC-002 | Origin only | Ask destination | Draft missingFields destination | Where do you want to go? | High | P0 |
| EC-003 | Same origin/destination | Confirm already at selected place; no invented ride | Compare resolved IDs; distinguish similar labels | These places match. Did you mean another branch? | Medium | P0 |
| EC-004 | Misspelled destination | Offer labeled candidate, require selection | Normalized alias/fuzzy matching, never silent fuzzy pick | Did you mean this place? | High | P0 |
| EC-005 | Local abbreviation | Resolve documented alias within locality | Alias register and unique candidate check | Confirm this location. | Medium | P0 |
| EC-006 | Unfamiliar Taglish | Clarify unresolved field or offer manual form | Schema+semantic validation; no freeform instructions | I could not identify that place. Choose it manually. | High | P0 |
| EC-007 | Language switches mid-sentence | Preserve roles and exclusions | Held-out mixed-language cases; editable draft | Check your origin and destination. | Medium | P0 |
| EC-008 | Ambiguous place name | Show distinct locality candidates | Multiple candidate IDs, confirmation | Which San Pablo do you mean? | High | P0 |
| EC-009 | Landmark with many branches | Require branch/locality | Branch labels in Place records | Choose the branch. | High | P0 |
| EC-010 | Slang | Extract only understood grounded fields | Short prompt; alias only for documented place names | Please confirm these places. | Medium | P0 |
| EC-011 | Unsupported location | Explain coverage and stored-place options | PLACE_NOT_FOUND or OUTSIDE_COVERAGE | This place is outside our verified coverage. | High | P0 |
| EC-012 | Contradictory modes/preferences | Ask user to choose; no relaxation | Nonempty allowed-minus-excluded validation | Your mode preferences conflict. Which should apply? | High | P0 |
| EC-013 | Unrelated text | No routing or fabricated chat answer | kind unrelated => INVALID_INPUT | Enter an origin and destination. | Medium | P0 |
| EC-014 | Extremely long text | Reject over600 chars, retain editable input | Client/controller length check before model | Please shorten your query to 600 characters. | Medium | P0 |
| EC-015 | Prompt injection | Treat as data; no arbitrary execution/route facts | Fixed system prompt/schema; no tools/SQL from LLM | Confirm the journey fields. | High | P0 |
| EC-016 | Invalid JSON/extra keys | Reject extraction, offer retry/manual | JSON.parse and strict validator; AI_INVALID_OUTPUT | AI could not read that request. Try again or choose places. | High | P0 |
| EC-017 | Origin/destination reversed | Show extracted fields before routing; user corrects | Held-out exact-role tests; mandatory confirmation | Check which place you are leaving and going to. | High | P0 |
| EC-018 | Inference timeout | Stop native completion; manual/retry available | AI_TIMEOUT; await stop; queryId guard | AI took too long. You can choose places manually. | High | P0 |
| EC-019 | Uwi/home without saved selected home | Ask destination | No guessed home/history | Which place is home for this trip? | High | P0 |
| EC-020 | Negative/NaN walk or fare preference | Reject; explain valid units | Finite nonnegative integer validation | Enter a valid walking limit or budget. | Medium | P0 |
| EC-021 | Truncated/context-full completion | Reject even if fragment resembles JSON | Runtime flags plus schema validation | AI response was incomplete. Retry or choose manually. | High | P0 |
| EC-022 | AI claims unsupported confidence | Do not show probabilistic certainty | No confidence percentage in extraction contract | Please confirm the extracted places. | Medium | P0 |

## B. Routing

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-023 | No complete known connection | Return no verified journey; separate known terminal facts | NO_VERIFIED_JOURNEY; do not join unknown edges | No verified complete journey available. | High | P0 |
| EC-024 | No direct route but transfer exists | Offer transfer only if directOnly false | Directed search with boarding state | This option requires a transfer. | High | P0 |
| EC-025 | Multiple routes | Return up to 3 distinct valid options and rank reasons | Pareto prune + dedup; stable sort | Choose an option. | Medium | P0 |
| EC-026 | Transfer stops disconnected | Reject connection | No validated directed WalkLink => no transfer | This transfer connection is not verified. | Critical | P0 |
| EC-027 | Graph cycles | Terminate without fabricated extra rides | Dominance pruning and computation guard | No valid journey found within the search limit. | High | P0 |
| EC-028 | Reverse direction requested | Use separately validated direction or fail | Increasing sequence; no inferred reverse edges | No verified service in that direction. | Critical | P0 |
| EC-029 | Coordinate between known stops | Use legal accessible stop via real walking path | No mid-road boarding from GPS snap | Choose a verified boarding point. | High | P0 |
| EC-030 | Journey requires walking | Respect actual path and limit | Access/transfer/egress separate cap | This journey needs a longer walk than your limit. | High | P0 |
| EC-031 | Refused mode | Exclude strictly | Filter service mode before accepting path | No verified option matches your selected modes. | High | P0 |
| EC-032 | Cheapest vs fewest transfers | Compare only supported costs; qualify cheapest | Completeness-aware ranking | Some fares are unknown, so cheapest cannot be confirmed. | High | P0 |
| EC-033 | Preference cannot be met | Explain and ask whether user wants edit | CONSTRAINT_UNSATISFIED, no auto-relax | No matching option. Change your preferences to see others. | High | P0 |
| EC-034 | Incomplete transport records | Exclude incomplete path, report gap | Release validator and path completeness | A connection is missing from our verified data. | High | P0 |
| EC-035 | Suspended/rerouted service | Exclude suspension; stale route not live promise | Direction availability and source-date review | This service is excluded or needs confirmation. | High | P0 |
| EC-036 | Outdated source | Display date; require review before release claim | Validity policy and source audit | Service information may have changed. | High | P0 |
| EC-037 | Impractical interchange | Reject without pedestrian access evidence | No aerial proximity transfer | This transfer path is not verified. | Critical | P0 |
| EC-038 | Similar names far apart | Distinguish IDs/locality/coordinates | Place candidates require confirmation | Choose the correct location. | High | P0 |
| EC-039 | Duplicate stop records | Reject import or merge only after evidence review | Stable IDs and duplicate/ref tests | Transit data could not be validated. | High | P0 |
| EC-040 | Inconsistent coordinates | Reject impossible records/path | Finite lat/lon bounds; locality/path audit | This location data needs review. | High | P0 |
| EC-041 | Nearest terminal disconnected | Search other useful terminals within walk cap | Rank only complete feasible journeys | The closest terminal has no verified connection for this trip. | High | P0 |
| EC-042 | Journey needs3+ transfers | Allow if graph/constraints support it | No transfer-count cap; guard on computation only | This option has several transfers. | Medium | P0 |
| EC-043 | Computation guard exceeded | Return explicit limited-search failure | SEARCH_LIMIT_REACHED, not no-route conclusion | Search limit reached. Try a narrower journey. | High | P0 |
| EC-044 | Route lines cross | Do not infer interchange | Legal stops + directed walking evidence required | A crossing alone is not a verified transfer. | Critical | P0 |
| EC-045 | Current vehicle wrong immediate direction but useful downstream stop | Evaluate whole continuation+transfer path | Onboard current-direction state and later legal stops | You may continue to this verified transfer point. | High | P0 |
| EC-046 | Onboard service/direction/next stop unknown | Require manual confirmation or pre-trip from known stop | OnboardContext validator | Confirm your current service and next stop. | High | P0 |
| EC-047 | Selected next stop already passed/not on service | Reject stale context | Membership/order and user confirmation | Select a stop ahead in this direction. | Critical | P0 |
| EC-048 | Tricycle arbitrary origin/destination | No invented service-area edge | Documented stand/service area only | No verified tricycle connection is available. | High | P0 |
| EC-049 | Budget with unknown fares | Do not certify affordable option | Unknown fares fail strict-budget certification | This option cannot be confirmed within your budget. | High | P0 |
| EC-050 | Station/terminal entrance closed or inaccessible | Do not use unverified access path | Entrance/walk evidence and availability note | Confirm access; this path is not currently verified. | Critical | P0 |

## C. Fares

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-051 | Missing fare | Unknown, null values | No default zero | Confirm fare with the driver/operator. | High | P0 |
| EC-052 | Outdated schedule | Unknown pending review; date visible | ValidFrom/validTo and source check | Fare information needs updating. | High | P0 |
| EC-053 | Distance unavailable | No distance fare computation | Require documented service-meter record | Fare cannot be calculated from available distance data. | High | P0 |
| EC-054 | Discount requested | Apply only documented eligibility/rounding | FarePolicy discount rules | Discount applicability must be confirmed. | Medium | P0 |
| EC-055 | Transfers separate fares | Charge once per new boarding | Ride-level fare policy, not graph-edge cost | Each ride may have a separate fare. | High | P0 |
| EC-056 | Fare range | Show range and basis | Integer min/max aggregation | Estimated fare range shown. | Medium | P0 |
| EC-057 | Total incomplete | Known subtotal plus unknown legs | partial status; UI wording test | Known subtotal; some ride fares are unknown. | High | P0 |
| EC-058 | Conflicting sources | Mark unresolved, no favored fictional value | Conflict review excludes policy | Fare sources disagree. Please confirm. | High | P0 |
| EC-059 | Adjustment not documented | No inferred surcharge/discount | Policy availability check | This fare adjustment is not verified. | High | P0 |
| EC-060 | Current ride payment unknown | Do not assume zero/already paid | Onboard quote remains unknown if unsupported | Current ride fare/payment is not confirmed. | High | P0 |
| EC-061 | Money rounding/units wrong | Reject invalid and use integer centavos | Policy-specific documented rounding; no float accumulation | Fare data could not be validated. | High | P0 |

## D. Scanner — deferred

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-062 | Blurry image | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Retake when safely stopped | High | P1 |
| EC-063 | Low lighting | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Use better light when safely stopped | High | P1 |
| EC-064 | Glare | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Change angle safely | High | P1 |
| EC-065 | Moving vehicle | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Do not capture while moving or near traffic | High | P1 |
| EC-066 | Rotated signboard | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Try a clearer upright image | High | P1 |
| EC-067 | Partial obstruction | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Some destinations are hidden | High | P1 |
| EC-068 | Text too small | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Move closer only when safe | High | P1 |
| EC-069 | Multiple signboards | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Select/crop one signboard | High | P1 |
| EC-070 | Handwritten labels | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Confirm recognized text manually | High | P1 |
| EC-071 | Mixed fonts | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Confirm recognized text | High | P1 |
| EC-072 | Filipino/English abbreviations | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Choose the matched service | High | P1 |
| EC-073 | Similar OCR characters | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Correct the text | High | P1 |
| EC-074 | Ambiguous extracted destination | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Choose the intended place/service | High | P1 |
| EC-075 | Unknown route | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | No verified service matches this sign | High | P1 |
| EC-076 | Correct text but misleading direction | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Confirm service direction | High | P1 |
| EC-077 | No signboard | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | No readable signboard found | High | P1 |
| EC-078 | Camera permission denied | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Allow camera or enter sign text manually | High | P1 |
| EC-079 | Camera unavailable | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Enter sign text manually | High | P1 |
| EC-080 | Unsupported image file | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Choose a supported image | High | P1 |
| EC-081 | OCR/model timeout | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Retry or enter sign text manually | High | P1 |
| EC-082 | Device OOM | Do not recommend an unconfirmed route; offer safe retake/manual service selection | If enabled: local OCR quality gate, candidate matching and confirmation; same RoutePort | Scanner unavailable; use manual service selection | High | P1 |

## E. Offline/resources

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-083 | Internet drops midquery | Local AI/stored routing continue; optional lookup errors separately | Local ports independent of GeoPort | Offline stored-place planning is available. | High | P0 |
| EC-084 | Cold launch without internet | Use verified persisted model/pack | Installed release JS; boot readiness | Ready for supported stored-place trips. | High | P0 |
| EC-085 | Model missing | Manual route form; explicit setup needed | AI_NOT_READY | Download the AI model when connected, or choose places manually. | High | P0 |
| EC-086 | Model init failure | Do not crash/fake AI; retry/manual | AI_INIT_FAILED with safe teardown | AI is unavailable. Manual planning is available. | High | P0 |
| EC-087 | DB missing/corrupt | Use valid bundled pack/recovery only if validated | DATA_NOT_READY/DATA_INVALID; preserve backup | Transit data could not be loaded. | High | P0 |
| EC-088 | Storage full | Stop download/update, preserve valid resources | STORAGE_FULL; .part cleanup on safe retry | Free storage, then retry. | High | P0 |
| EC-089 | Offline map absent | Instructions/diagram continue; no tile promise | P1 map disabled offline | Street map needs connectivity. | Medium | P0 |
| EC-090 | Never downloaded model | Explain first-time setup; no AI claim | Absent ModelState; manual route if data ready | One-time AI setup needs internet. | High | P0 |
| EC-091 | GPS unavailable | Pick stored origin | Optional foreground permission/result failure | Choose your starting place. | High | P0 |
| EC-092 | GPS inaccurate | Ask confirmation; no blind snap | Accuracy shown if available; legal walk path required | Confirm this location or select a place. | High | P0 |
| EC-093 | Permissions revoked | Recover with manual paths | Read permission state on action/resume | Permission is unavailable; choose manually. | High | P0 |
| EC-094 | Restart offline | Persist model/pack; new query works | Private documents + SQLite, no Metro dependency | Offline resources are ready. | High | P0 |
| EC-095 | Low-power mode | Short inference; allow cancel/manual | Measured timeout, no promised speed | AI may take longer; manual planning is available. | Medium | P0 |
| EC-096 | Inference slow | Cancel/timeout and retry/manual | Single job and stopCompletion | AI took too long. | High | P0 |
| EC-097 | Model/app incompatibility | Reject manifest version; safe model reset | Runtime/model compatibility check | AI resources need a compatible update. | High | P0 |
| EC-098 | Download interrupted | Never initialize partial file; resume/retry | .part + integrity + atomic promotion | Download paused or interrupted. | High | P0 |
| EC-099 | Hash mismatch | Delete/quarantine partial; never initialize | SHA256/bytes check | Model integrity check failed. Retry download. | Critical | P0 |
| EC-100 | Pack update interrupted | Old valid pack still works | Transactional import/rollback | Previous transit data remains available. | High | P0 |
| EC-101 | New offline address/walking link missing | Offer stored endpoint, not invented walking | No offline arbitrary geocode promise | This new address/path needs internet or a stored place. | High | P0 |
| EC-102 | App backgrounds during inference | Stop and ignore late completion | Lifecycle cancel/queryId guard | Query cancelled. You can try again. | Medium | P0 |

## F. UX/accessibility

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-103 | Origin unknown | Offer location permission or stored picker | No required GPS | Choose a starting place. | Medium | P0 |
| EC-104 | Board/dropoff confusing | Different explicit labels and step order | JourneyLeg-derived templates | Board here. Get off here. | High | P0 |
| EC-105 | Unknown transport term | Plain label and optional explanation | Mode display names | Van/UV, jeepney, bus, tricycle or LRT. | Medium | P0 |
| EC-106 | Poor vision | Contrast, screen reader, noncolor warnings | Accessible roles/labels, scalable type | Warnings include text, not just color. | High | P0 |
| EC-107 | Filipino preference | Use translated labels/fallback | Locale enum; names preserved | Mga hakbang sa biyahe. | Medium | P0 |
| EC-108 | Small screen | Scrollable safe layout and accessible actions | Safe area, responsive widths, keyboard handling | All controls remain reachable. | Medium | P0 |
| EC-109 | Large text overflow | Wrap and scroll; no truncation of critical stops | Font-scaling manual test | Full boarding/dropoff text remains visible. | High | P0 |
| EC-110 | Many journey steps | Ordered readable scroll/diagram | Stable keys and step order | Follow the numbered steps. | Medium | P0 |
| EC-111 | Incomplete instructions | Reject incomplete journey; no UI invented step | Required leg fields + validation | Complete instructions are unavailable. | Critical | P0 |
| EC-112 | Entry mistake | Edit/swap/reset without losing everything | Controlled confirmation form | Edit your origin or destination. | Medium | P0 |
| EC-113 | Edit journey after result | Invalidate stale result and replan | New queryId; cancellation | Plan updated journey. | Medium | P0 |
| EC-114 | Repeat earlier search | Explicit repeat action; don't imply automatic history | Current-session selection or optional consented history P2 | Run this search again. | Medium | P0 |
| EC-115 | Connectivity changes | Update onlinehelper status; core stays separate | Readiness independent of connectivity | Online lookup unavailable; stored places still work. | Medium | P0 |
| EC-116 | Camera/location permission denied | No permission loop; manual alternative | Action-based permissions | Choose places/services manually. | Medium | P0 |
| EC-117 | Rapid submit doubletap | One active job; cancel/replace deliberately | Disabled submit/loading+queryId | Planning your journey. | Medium | P0 |

## G. Security/reliability

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-118 | Sensitive location retained | No automatic personal content logs/history | Anonymized timing/errors only; clear cache control | Online lookup sends selected address/coordinates. | High | P0 |
| EC-119 | Malicious input | No eval/SQL execution; bound text | Schema validation, parameterized SQL | Input could not be used. | High | P0 |
| EC-120 | Private unrelated photo | Local only; no logging/upload; removable | P1 image lifecycle and optional user selection | Photos stay local during scanning. | High | P1 |
| EC-121 | Hallucinated AI route/fare | Impossible to use as authority | RawIntent omits fares/route facts; deterministic result | Only verified transit data is used. | Critical | P0 |
| EC-122 | External API outage | Optional lookup fails; manual stored continues | NETWORK_UNAVAILABLE | Online lookup is unavailable. | High | P0 |
| EC-123 | Dependency failure | Specific readiness/build error, no mockrelease | Pinned APIs/native first gate | This component is unavailable. | High | P0 |
| EC-124 | Unsupported device architecture | No claim unsupported device works | Native ABI/build/runtime gate | This device has not passed compatibility checks. | High | P0 |
| EC-125 | Demo crash | Use last tested build/second device; disclose | Offline backup, crash/evidence record | Restarting the tested app; backup available. | High | P0 |
| EC-126 | Corrupted browser storage | Native primary storage recovery; only relevant laptop/PWAfallback | No browser core dependency; fallback validates local data | Fallback data could not be loaded. | Medium | P0 |
| EC-127 | Repeated request race | Old result ignored; latest context preserved | Correlated IDs, completion serialization | Showing the current journey. | High | P0 |
| EC-128 | Inconsistent state | Reset transaction/error boundary, preserve draft | Controller state machine | Please retry this journey. | High | P0 |
| EC-129 | Invalid geospatial JSON | Reject before route graph | Finite bounds/ref/path validation | Location data is invalid. | High | P0 |
| EC-130 | API key in mobile bundle | Blockrelease; move toserversecret | Secret scan/manual review; Worker secret | Online helper disabled until configured safely. | Critical | P0 |
| EC-131 | Free tier exhausted | No paid auto-upgrade; disable helper | NETWORK_LIMIT, quota guards | Online lookup limit reached. | High | P0 |
| EC-132 | Personal Team signing expires | Re-sign/reinstall via Mac; disclose7days | Build metadata/provisioning check | This test build needs reinstallation. | High | P0 |
| EC-133 | Release depends on Metro | Block standalone claim | Disconnect USB/stop Metro cold-launch test | Installed release must work independently. | Critical | P0 |

## H. Real-world safety

| Test ID | Trigger/input | Expected behavior | Technical handling | User-facing message | Severity | Scope |
|---|---|---|---|---|---|---|
| EC-134 | Wrong boarding location | Require legal documented board flags | Stop AND route-stop board permission | Confirm this service at the listed boarding point. | Critical | P0 |
| EC-135 | Wrong service direction | Prominent headsign; no inverse edge | Separate Direction and sequence | Check the vehicle direction before boarding. | Critical | P0 |
| EC-136 | Unsafe/nonexistent transfer | Reject unverified link | Documented pedestrian path/access required | No verified safe transfer path is available. | Critical | P0 |
| EC-137 | Unverified dropoff | Cannot make complete journey | Alight flags and downstream path evidence | This dropoff is not verified. | Critical | P0 |
| EC-138 | Insufficient evidence for route claim | Coveragegap explicitly shown | Release audit blocks advertising | No verified complete journey available. | Critical | P0 |
| EC-139 | Outdated fare/service | Show dates and unknown/confirmation | Currentvalidity/source review | Confirm current service and fare. | High | P0 |
| EC-140 | Camera near traffic | Do not prompt dangerouscapture | P1 safetytext; manual service alternative | Use the camera only when safely stopped. | Critical | P1 |

## Release interpretation

A test fixture proves an algorithm response, not a real route. Physical-device tests prove local runtime/offline behavior, not transport availability. Source audits prove the stated data facts, not live arrival. Combine all three before advertising a journey. Unknown fare is acceptable with correct wording; unknown ride/walk/boarding connection cannot support a complete journey. A P0 failure that can invent or misdirect a journey blocks release of that path. Deferred-feature failures require disabling that feature, not disguising a placeholder.
