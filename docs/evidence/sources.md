# Source register (ROUTE-001)

Retrieved 2026-10-09 by Member 2 (assistant-run web lookup, not yet reviewed by a second teammate).
Nothing here has been converted into a `TransitPack` record. A source only enters the pack as a `SourceRef` once a
specific fact is transcribed from it and a teammate has checked that transcription.

Reliability key: **Primary** = operator or government publication. **Secondary** = news or aggregator. **Not usable** = cannot support a pack fact.

| ID | Source | Publisher | Type | Retrieved | What it can support | What it cannot support | Status |
|---|---|---|---|---|---|---|---|
| S-01 | [LRT-1 Fare Matrix page](https://lrmc.ph/our-business-featured/fare-matrix/) | Light Rail Manila Corporation (LRMC) | Primary | 2026-10-09 | Existence of an official station-to-station matrix for single journey (SJT) and stored value (SVC), file names say effective 2025-04-02 | Any peso amount: the page has **no text fares**, the matrices are images only. No publication date on the page. | Partly resolved: stored value matrix transcribed (S-02); see the swapped-file-name note there |
| S-02 | [Image at the file name containing SJT](https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SJT-fare-matrix-effective-April-2-2025-1.png) | LRMC | Primary | 2026-10-09 | **Titled "New LRT-1 Stored Value Fare Matrix" inside the image**, effective April 2, 2025. Stored value fare for every station pair. | The file name says SJT but the image content is stored value: LRMC's file names are swapped. | **Transcribed in full** (all 25 stations, Dr. Santos to Fernando Poe Jr., 600 ordered pairs) by viewing it in the browser pane (nothing saved to disk). Each pair was read in both triangles from different screenshots and all agreed. **Independently reviewed by Aryl Manalo on 2026-10-10** (order, two full rows, 24 pairs, all matched). |
| S-03 | [Image at the file name containing SVC](https://i0.wp.com/lrmc.ph/wp-content/uploads/2025/03/New-SVC-fare-matrix-effective-April-2-2025-1.png) | LRMC | Primary | 2026-10-09 | **Titled "New LRT-1 Single Journey Fare Matrix" inside the image**, effective April 2, 2025: 25 stations Dr. Santos to Fernando Poe Jr., fares P20 to P55. | Not transcribed. Whether single journey tickets are still sold is unconfirmed (S-07 says no). | Open: viewed only; no values recorded. |
| S-04 | [LRT-1 Train Route page](https://lrmc.ph/our-business-featured/train-route/) | LRMC | Primary | 2026-10-09 | Existence of an official route map (image) | Station order: the page has no station text, only a map image | Open: not read. Station order was instead taken from the row order of the S-02 matrix and cross-checked with Wikipedia (S-12) and by increasing latitude. |
| S-05 | [Inquirer: LRT-1 fare hike approved, to take effect April 2](https://newsinfo.inquirer.net/2035749/fwd-lrt-1-fare-hike-approved-to-take-effect-april-2/amp) | Philippine Daily Inquirer | Secondary | 2026-10-09 (search summary only; page returned HTTP 403 to the fetch) | Corroborates a 2025-04-02 LRT-1 fare change | Cannot be cited for specific amounts until read directly | Open |
| S-06 | [LRT-1 minimum fare up from P15 to P20 in April](https://newsinfo.inquirer.net/2035902/lrt-1-minimum-fare-upfrom-p15-to-p20-in-april) | Philippine Daily Inquirer | Secondary | 2026-10-09 (search summary only) | Search summary reports: formula boarding fee P16.25 + P1.47 per km; stored value min P16 / max P52; single journey min P20 / max P55 | **Do not use as release data.** Not read directly; single journey tickets may have been phased out (see S-07). | Open: needs primary confirmation (S-01 to S-03) |
| S-07 | [expressway.ph LRT-1 line guide](https://www.expressway.ph/transit/lrt1-line-guide) | expressway.ph | Secondary, unofficial | 2026-10-09 (search summary only) | Nothing | Its summarized fares (P15 / P20 / P30 bands) **contradict** S-05/S-06; it also says single journey tickets were phased out in 2023. A conflicting, unofficial source. | Not usable; conflict recorded for fares |
| S-08 | [Philkotse: LRT 1 stations](https://philkotse.com/safe-driving/expats-guide-lrt-1-stations-in-the-philippines-3371/amp) | Philkotse | Secondary | 2026-10-09 (search summary only) | Search summary reports station order Baclaran, EDSA, Libertad, Gil Puyat, Vito Cruz, Quirino ... Fernando Poe Jr. (formerly Roosevelt) | Not read directly; needs confirmation against S-04 | Open |
| S-09 | [LTFRB FOI: public transit list for San Pablo City](https://foi.gov.ph/requests/public-transit-map-or-list-bus-jeepney-tricycles-taxi-of-san-pablo-city-laguna) | Philippine FOI portal (LTFRB) | Primary record of a request | 2026-10-09 (search summary only; **not opened**) | Search summary says a request for a San Pablo route list exists and a 2023 request for a transit map was denied | The route list itself was not seen | Open: open the request and any attached list |
| S-10 | Rome2Rio pages (Candelaria to Batangas / Cubao / Alabang) | Rome2Rio | Secondary aggregator | 2026-10-09 (search summaries only) | Nothing for the pack | Aggregator estimates of buses, fares and times; no stop-level or boarding-point evidence | Not usable as pack evidence; hints only |
| S-11 | LTFRB P2P route announcements (Lipa to Alabang, Lipa to PITx) | LTFRB via news | Secondary | 2026-10-09 (search summaries only) | Hint that point-to-point services exist from Lipa City | Boarding points, current operation, fares, directions, stops; and none of them is a Lipa to San Pablo or Candelaria service | Hint only |

## What was and was not done

- Searches were run; the official LRMC pages were opened; the Inquirer page returned 403 and was not read.
- The LRMC fare and route **images were not downloaded or read**. Downloading a file needs your explicit approval (filename, source and size are listed above). Reading those two matrices is the quickest real progress available.
- No operator, LGU or LTFRB document for any jeepney, van, UV Express, bus or tricycle service on the three corridors was found. Nothing was assumed from town names, terminal names or aggregator output.

## Not allowed to count as evidence

Town lists, terminal addresses, map pins, aggregator routes, a blog saying "ride from X then transfer", and a signboard seen once without a dated, checked record. Those can point to where to look; they cannot make a leg of a journey.

## Added after the first pass (2026-10-09, browser reading)

| ID | Source | Publisher | Type | What it supports | Limits | Status |
|---|---|---|---|---|---|---|
| S-12 | [LRT Line 1 (Metro Manila)](https://en.wikipedia.org/wiki/LRT_Line_1_(Metro_Manila)) | Wikipedia contributors, CC BY-SA 4.0 | Secondary | Station list and order, terminals, that the station the LRMC matrix calls "EDSA" is also called Taft Avenue, Cavite extension phase 1 opened November 2024 | Not authoritative; its city labels are approximate | Used only to cross-check |
| S-13 | Wikipedia station articles, coordinates via the MediaWiki API | Wikipedia contributors, CC BY-SA 4.0 | Secondary | Approximate station coordinates | **The Baclaran point is identical to the EDSA point and is wrong; it was rejected.** Coordinates are approximate, not entrances. | Used for 24 of 25 stations, flagged `estimated` |
| S-14 | OpenStreetMap via Nominatim | OpenStreetMap contributors, ODbL 1.0 (attribution required) | Secondary | Cross-check of coordinates; Baclaran coordinate; Gil Puyat is also called Buendia | Returned bus-stop nodes beside stations, not platforms; MIA Road, Redemptorist-Aseana and Central were not returned | Used, flagged `estimated`. Two bounded queries (south and north), within the usage policy. |

## Pack outcome

`assets/data/release.json` (built by `scripts/build-lrt1-pack.ts`) contains the S-02 fares and S-12 to S-14 coordinates for all 25 stations. Routing facts are `verified` after the 2026-10-10 review; station coordinates remain `estimated`. See `pack-status.md`.

## Leads for road services (second search round, 2026-10-09)

None of these is usable as pack evidence. They only tell teammates where to look first.

| ID | Source | Type | What it says | Why it is not evidence |
|---|---|---|---|---|
| S-15 | [SM Lipa Grand Terminal page](https://ph.commutetour.com/ph/terminal/sm-lipa-grand-terminal/) (page says "Updated: Jan 19, 2026") | Commercial travel site | Lists a "Van" route Lipa City to San Pablo with **no operator, fare or schedule**; Lucena options go via other towns; Candelaria is not mentioned | No source named, no boarding bay, no fare. Page says fares and schedules may change without notice. |
| S-16 | [San Pablo terminal page](https://ph.commutetour.com/ph/terminal/san-pablo/) (updated Jan 18, 2026) | Commercial travel site | PNR "San Pablo to Candelaria", P25, no schedule; no San Pablo to Lipa service listed | No source, no address, PNR operation not confirmed, and PNR rail is not a mode this app supports. |
| S-17 | LTFRB route announcements (news, 2020 to 2024) | News | Official UV Express/jeepney route lists found are Metro Manila focused. A 2024 policy lets unconsolidated operators run existing routes on low-consolidation routes. | No CALABARZON list for Lipa, San Pablo or Candelaria found. |
| S-18 | LTFRB Regional Office IV-A, Lipa City | Government office (contact only, details from third-party listings) | The office that can supply authorized route lists and fare matrices for these corridors | Details on the web were third-party; confirm the address and contacts on ltfrb.gov.ph before relying on them. |
| S-19 | Research paper on a proposed Candelaria central terminal | Academic | A proposal, not an operating terminal | Does not establish any service. |

### What this means

- The **only** corridor-relevant road leads are an unlabelled Lipa to San Pablo van line on a commercial site and an unconfirmed PNR line. Neither names an operator, boarding point, stop, fare or direction.
- The practical route to real data is a written request to LTFRB Region IV-A (Lipa City) for current authorized UV Express and jeepney routes and fare matrices for Lipa, San Pablo and Candelaria, plus dated observations by teammates who ride and photograph the signboards and terminals.

## Teammate observations (2026-10-10)

| ID | Source | Type | Status |
|---|---|---|---|
| S-20 | Route and fare reports for all three corridors relayed in chat by the user (Member 4) | Teammate-reported, undated, no named recorder, no coordinates | Recorded in `teammate-observations.md`. **Not evidence yet.** Conflicts with the LRMC matrix on the Pedro Gil to Vito Cruz LRT fare (P25 reported, P19 stored value / P20 single journey documented). |

## Operator research for the road corridors (2026-10-10)

| ID | Source | Type | What it supports | What it does not |
|---|---|---|---|---|
| S-21 | [JAC Liner: Terminals and Routes](https://jacliner.com/terminals-and-routes) (JAC Liner Inc.; footer 2026, no page date) | Operator (primary) | Candelaria is a pick-up and drop-off point on its Lucena route, in the sequence Kamias, Sto. Tomas, Alaminos, San Pablo, Tiaong, Candelaria, Sariaya, Lucena City, Dalahican. It has a **JAC Liner Buendia terminal at Sen. Gil J. Puyat Ave. corner Donada St., Pasay**. JAC Liner also owns Lucena Lines and JAM Liner. | No fares, no schedules, no stop pins, and no statement that a Candelaria to Buendia trip is sold as such. Lipa, PITX and Cubao are not on the page. |
| S-22 | [PITX passenger guide: transport](https://pitx.ph/passengers-guide/transport/) (PITX; page dated 9 Oct 2026) | Operator (primary) | Gate list: Gate 5 (ground floor) Batangas, Laguna, Quezon; Gate 3 Route 6 Quezon Avenue; Gate 7 includes Buendia and Taft; **Gate 9 lists no routes**; city buses include "Fairview via East Ave" with no gate shown; Route 7 is not mentioned. | **It does not confirm the reported "Gate 9 for the Fairview bus" or the reported Route 7 timetable.** |
| S-23 | [Greenline Express](https://en.wikipedia.org/wiki/Greenline_Express) (Wikipedia, CC BY-SA 4.0) | Secondary | A city bus plies SM Fairview to PITX via Taft Ave. and Quezon Ave., which supports the reported Taft Avenue stop near DLSU. | Not the operator; no fares, gates or schedule. |
| S-24 | Search listings for Route 7 (NAT Transpo Group, Fairview to PITX via Quezon Avenue) and the user's own Route 7 notes (4am to 10pm, Gate 9, second level) | Secondary and unverified | A Route 7 city line to SM Fairview exists in listings. | The 4am to 10pm hours and Gate 9 are from an unnamed source and conflict with S-22. They are not used as data. |
| S-25 | Commercial listings (commutetour.com, bustickets.ph, Rome2Rio) for JAM Liner, Lucena Lines and DLTB | Secondary aggregators | Hints that JAM Liner and Lucena Lines run PITX, Cubao and Buendia to Lucena through Tiaong, Candelaria and Sariaya; one listing gives Buendia to Lucena about P257. | Old, inconsistent, no stop-level data. No DLTB route was found for Candelaria to Lipa or Candelaria to Buendia. Not used as data. |
| S-26 | Valhalla pedestrian routing on OpenStreetMap data (FOSSGIS server, ODbL) | Computed route | Walking distances and turns for three short walks: Lipa town stop to the Tiaong terminal, 150 m; Mixue (Gil Puyat) to Gil Puyat LRT, 790 m; DLSU drop to Vito Cruz LRT, 234 m. | Computed, not walked; ends at the station's approximate map point, not an entrance. |
| S-27 | Google Maps short links sent by the user | User-supplied pins | Coordinates for Hacienda Inn stop, Mixue Gil Puyat, PITX, DLSU and the Candelaria jeep stop. | A pin names a place, not necessarily the exact boarding spot. |

## Attempt to add more bus routes from online sources (2026-10-10)

Looked for stop-level locations of the operator routes that serve these corridors (JAC Liner / Lucena Lines / JAM Liner Buendia terminal at Sen. Gil J. Puyat Ave. corner Donada St., Pasay; their Candelaria pick-up and drop-off; PITX bays). Result: **no source gives coordinates or an exact stop for any of them.** OpenStreetMap search returned nothing for the Buendia terminal or Donada Street; Rome2Rio's map markers for the "Jam Liner Buendia Bus Terminal" page equal the Gil Puyat LRT station point and an EDSA point, so they are not the terminal. Fares found online are Buendia to Lucena only (about P257, commercial site) and nothing for Candelaria. Adding these routes would require inventing their boarding points, which the project rules forbid, so **no new bus route was added to the draft**. The operator facts stay recorded in S-21 and S-25 as corroboration only.
