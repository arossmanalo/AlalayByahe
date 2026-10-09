# Unblock kit for ROUTE-001 / ROUTE-006

Prepared by Member 2. Nothing here has been sent to anyone. These are drafts for people to use.

## A. Reviewer checklist: LRT-1 candidate pack (needs one registered teammate, about 20 minutes)

Goal: let the evidence in `data/candidates/lrt1-candidate.json` be raised from `estimated` to `verified`.
Reviewer is not the person who transcribed it (Member 2).

Open the official image: <https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SJT-fare-matrix-effective-April-2-2025-1.png>
(The file name says SJT but the image is titled **"New LRT-1 Stored Value Fare Matrix"**, effective April 2, 2025. LRMC's two file names are swapped.)

| # | Check | Where in the repo | Pass? |
|---|---|---|---|
| 1 | The image title says Stored Value and "Effective April 2, 2025" | n/a | |
| 2 | The 25 stations in the image's row order equal the `STATIONS` order in `scripts/build-lrt1-candidate.ts` (Dr. Santos, Ninoy Aquino Avenue, PITX, MIA Road, Redemptorist-Aseana, Baclaran, EDSA, Libertad, Gil Puyat, Vito Cruz, Quirino, Pedro Gil, UN Avenue, Central, Carriedo, D. Jose, Bambang, Tayuman, Blumentritt, Abad Santos, R. Papa, 5th Avenue, Monumento, Balintawak, Fernando Poe Jr.) | `scripts/build-lrt1-candidate.ts` | |
| 3 | Check the **Vito Cruz row** and the **EDSA row** cell by cell against `TOP_LEFT`/`TOP_RIGHT` (rows 10 and 7) | same file | |
| 4 | Check at least 20 other cells at random, including the four corners (Dr. Santos to Fernando Poe Jr. = 52, Dr. Santos to Dr. Santos = 16) | same file | |
| 5 | Compare the LRMC route map (<https://lrmc.ph/our-business-featured/train-route/>) with the station order, and confirm every station serves both directions | n/a | |
| 6 | Confirm the stored value card, not single journey tickets, is what you want the app to quote | n/a | |
| 7 | Open the coordinates of Vito Cruz, EDSA (Taft) and Baclaran on a map. Each must be within about 200 m of the station | `places` in the JSON | |
| 8 | Run `npm test` and `npx tsx scripts/validate-data.ts data/candidates/lrt1-candidate.json` and note the output | repo root | |

Record: reviewer name, date, cells checked, any disagreement. If every row passes, tell Member 2 to regenerate with `verified` evidence
(`checkedBy` set to the reviewer's name) and run `npx tsx scripts/validate-data.ts --release assets/data/release.json`.

## B. Teammate observation template (for each road-service leg)

One record per leg, per direction. Do not copy from an app or website; record what was actually seen. Reverse direction is a separate record.

```
Date and time (with timezone):
Recorded by (registered teammate):
Mode (van/UV, jeepney, bus, tricycle):
Operator / signboard text exactly as shown:
Headsign / destination board:
Boarding place name and where exactly passengers board (street side, landmark, bay):
GPS point of the boarding spot (lat, lon):
Alighting place name and exact drop-off spot:
GPS point of the drop-off:
Stops in order between them (if any), and where passengers may NOT board or alight:
Fare paid in pesos, who it was paid to, regular or discounted:
Walking path from the previous stop (street names, turns, landmarks) and measured meters:
Photo filenames (signboard, boarding spot):
Anything unusual (terminal fee, loading rules, hours):
```

Rule of thumb from the plan: a terminal address, a signboard token or a town name is not a journey. Each leg needs both ends, the direction, and the walk to the next leg.

## C. Draft request to LTFRB Region IV-A (not sent)

To: LTFRB Regional Office IV-A, Lipa City (confirm the address and email on ltfrb.gov.ph before sending; the details found online were third-party).

> Subject: Request for current authorized routes and fares: Lipa City, San Pablo City, Candelaria (Quezon)
>
> Good day. We are a student hackathon team building a free commuter guidance app. We would like to request, for public reference:
> 1. The current list of authorized public utility jeepney and UV Express routes (with terminals, route descriptions and directions) between Lipa City, San Pablo City and Candelaria, Quezon.
> 2. The current approved fare matrix for those routes, and the date it took effect.
> 3. Any published list of authorized bus routes serving Candelaria toward Metro Manila.
> We will cite the document and its date in the app. Please let us know if a written FOI request through foi.gov.ph is preferred.
> Thank you. [Name, contact]

A teammate or Member 4 should review and send it from their own account. An FOI request is also possible at foi.gov.ph (an earlier request for a San Pablo route list is visible there; see sources.md S-09).

## D. Optional extra evidence I can add on request

- Transcribe the single journey matrix (sources.md S-03). Low value unless tickets are confirmed to be sold.
- Re-read any section of the stored value matrix a second time for the reviewer to compare.
