# Requirements check (INT-007), 2026-10-10

**This is not a compliance claim.** The participant briefing PDF is still missing. Below, every requirement is marked **Verified** (checked directly against a named source today), **Repo fact** (true of this repository, but not proof that it satisfies the rule), or **Unverified, needs the official brief**. Do not tick "compliant" on this page.

Source of the event rules: the public event page, `https://cerebralvalley.ai/e/appbuildersph-hackathon-2026` ("AppBuildersPH Devin Hackathon 2026"), fetched on 2026-10-10. The team's pasted rules (rubric weights, 5-minute pitch, 3-minute Q&A, one submission, 25/25/20/15/15 scoring) came from the team's own prompts, not from this page.

## A. Stated on the public event page (Verified)

| Requirement | What the page says |
|---|---|
| Team size | 1 to 4 people; solo allowed |
| Built during the event | Everything must be built during the hackathon |
| Tools | Open-source libraries and AI coding tools are allowed but **must be disclosed** |
| Submission contents | A code repository and a demo video, submitted before "the deadline" |
| Demo Day | Saturday 2026-10-10, 1:00 to 7:00 PM, in person at Cyberzone, SM Makati; finalists must be physically present |
| Build window | Listed event window 2026-10-09 1:00 PM to 2026-10-10 7:00 PM (GMT+8); described as 24 hours; kickoff 1:00 PM on Oct 9 |
| Social posts | Participants are asked to post on X and LinkedIn and tag @cognition and Devin |
| Awards | Hackathon Champion, sponsor awards, People's Choice, Best Product Experience |

## B. Not stated on the page (Unverified, needs the official brief)

| Item | Status |
|---|---|
| **Exact submission deadline** | **Not stated.** Our internal 10:00 AM PHT on 2026-10-10 comes from the team's pasted prompts. The page's own event window runs to 7:00 PM, so 10:00 AM may be earlier than the real deadline. Keep it as the conservative internal target; do not call it official. |
| Where and how to submit (portal, form) | Not stated |
| Judging criteria and weights | Not stated (the team's 25/25/20/15/15 split is unconfirmed) |
| Pitch length, Q&A length | Not stated (the 5-minute/3-minute figures are unconfirmed) |
| Required hashtag and exact post format | Hashtag **not stated**; only "tag @cognition and Devin" |
| Video length and format | "~1 minute" is the team's assumption; the page says only "a demo video" |
| Whether the repository must be public | Not stated on the page (see "Repo fact" below) |
| One submission per team | Not stated |
| Whether using a tool other than Devin is acceptable | The page allows "AI coding tools" with disclosure; it does not require Devin. The team used Claude Code and other assistants; disclose them. |
| Rule on outside human help | Not stated on the page |
| Registration deadline | Not stated |

## C. Facts about this repository (Repo fact)

| Item | Finding | Caveat |
|---|---|---|
| Repository visibility | Public: an unauthenticated GitHub API request for `arossmanalo/AlalayByahe` returned HTTP 200 on 2026-10-10 | Visibility may change; recheck before submitting |
| Built during the event | First commit on `main` is 2026-10-09 20:51 +0800, after the 1:00 PM kickoff | The file layout and documents were planned in the same window; a clean history does not prove nothing pre-existed, so the team should confirm |
| Open-source and AI-tool disclosure | `docs/disclosures.md` lists libraries, licences, the model and, as reported by the team on 2026-10-10, the AI assistants: Claude (Members 1, 3 and 4, with Member 4 using Claude Code) and Claude plus Codex (Member 2) | Based on the team's statement, not independently checked. Add versions only if accurate. The page requires disclosure; the exact form it takes is not stated |
| Licence file | **There is no `LICENSE` file** in the repository | Choosing a licence is the team's decision. Dependencies are MIT/Apache-2.0 (see disclosures). Not created here |
| Team size | `git log` shows five author names on `main`: Aryl Manalo, Aryl Ross A. Manalo, Yohann Joachim Zapata, Allen, EnzoGRosas | Two names are probably one person on two git identities, but the page limits teams to 4. The team should confirm the registered members. Do not assume |
| Demo video | None exists | Not Run |
| Social posts | None published; draft only in `docs/submission.md` | Needs the user's authorization and the missing format details |
| Secrets, signing material, model files | `.gitignore` excludes `*.gguf`, `*.apk`, keystores, `.env`; `release:check` fails if such files are tracked | Passing today; rechecked by `npm run release:check` |
| No paid services | None configured in the code; online helpers disabled | Confirmed in `docs/disclosures.md` |

## D. Open items for the user

1. Get the official briefing and fill section B. Until then no document should say "compliant".
2. Confirm the real submission deadline and where to submit. If it is later than 10:00 AM the team has more time, but the internal target is safer.
3. Confirm the registered team (at most 4) against the five git author names.
4. Decide on a licence and add a `LICENSE` file.
5. Confirm the AI-tool list in `docs/disclosures.md` (Claude; Codex for Member 2) is complete and correct, since it is based on a verbal report.
6. Decide whether the team will present at Demo Day (finalists must attend in person) and what runs on the demo phone.
