# ROUTE-006 device checklist (Member 2)

**Status: every Result cell is Not Run.** No APK from current `main` exists yet (the only recorded artifact is the stale `34236a5`), and no one has run the app on a phone. This page is only the answer key and the form to fill in once the APKs arrive.

Expected values come from running the real engine, the real bundled pack and Member 3's presentation code in Node (`tests/integration/release-pack*.test.ts`, `tests/ui/real-pack-ui.test.ts`, `tests/routing/*`). The LRMC source is the official Stored Value matrix, effective 2025-04-02 (see `sources.md` S-02; the lrmc.ph file names are swapped).

Fill in: device and OS, build commit, APK file name and SHA-256 (must equal `docs/evidence/native-artifacts.json`), pack version shown in the app, reviewer name, date. Attach screenshots without personal data.

## A. Release APK (no flags): frozen pack `lrt1_2026_10_10_1`, LRT-1 stations only

| ID | Enter (origin to destination, passenger) | Expected on screen | LRMC check | Result |
|---|---|---|---|---|
| A-01 | Vito Cruz to Baclaran, regular | One LRT-1 ride, sign "Dr. Santos", board "Vito Cruz (LRT-1 platform)", get off "Baclaran (LRT-1 platform)", 0 transfers, 0 m walking, **"₱21.00 total (verified)"** | Vito Cruz row, Baclaran column = 21 | Not Run |
| A-02 | Taft to Vito Cruz, regular ("Taft" is an alias of the EDSA station) | One ride, sign "Fernando Poe Jr.", **₱20.00 (verified)** | EDSA to Vito Cruz = 20 | Not Run |
| A-03 | Vito Cruz to Taft, regular | One ride, sign "Dr. Santos", **₱20.00 (verified)** | symmetric = 20 | Not Run |
| A-04 | Dr. Santos to Fernando Poe Jr., regular | One ride, sign "Fernando Poe Jr.", 0 transfers, **₱52.00 (verified)** | corner cell = 52 | Not Run |
| A-05 | Fernando Poe Jr. to Dr. Santos, regular | One ride, sign "Dr. Santos", **₱52.00 (verified)** | symmetric = 52 | Not Run |
| A-06 | Pedro Gil to Vito Cruz, **student** | Ride fare shows the regular amount as an **estimate** with the basis "No student discount is documented"; total **"₱19.00 total (estimated)"**; warning that some fares are estimates | Pedro Gil to Vito Cruz = 19 (stored value). The reported P25/P12 is superseded | Not Run |
| A-07 | Gil Puyat ("Buendia") to Vito Cruz, regular | One ride, sign "Fernando Poe Jr.", **₱18.00 (verified)** | Gil Puyat to Vito Cruz = 18 | Not Run |
| A-08 | Lipa to Candelaria (type the words) | No stored place matches; the picker states the supported coverage ("LRT-1 only..."); **nothing is routed** | none (unsupported) | Not Run |
| A-09 | Vito Cruz to Baclaran with only "bus" allowed (rail excluded) | Strict failure: "No matching option. Change your preferences to see others." plus "A verified journey exists if you allow other transport modes."; no made-up fallback. (With "Direct only" instead, the journey is still found, because it is one ride.) | none | Not Run |
| A-10 | Onboard: southbound LRT-1, next stop Vito Cruz, destination Baclaran | "Stay on your current vehicle"; fare **unknown** with "Confirm the fare..."; warning that the vehicle position is not tracked | current ride fare is never zero | Not Run |
| A-11 | Any result | The coverage line reads "LRT-1 only..." exactly once; every text says routes are documented, not live; no "fastest", "real-time" or "guaranteed" | n/a | Not Run |
| A-12 | Release APK only | **No** place named Baguio, Legazpi, Laoag, Mixue, PITX terminal or Hacienda Inn can be found | n/a | Not Run |

## B. Demo APK (`EXPO_PUBLIC_DEMO_BUILD=1`): never release evidence

Every screen must show the banner "This transit data is a test fixture, not real transport information." The first coverage label reads "DEMO BUILD: this pack contains INVENTED routes ... Do not rely on it to travel."

| ID | Enter | Expected | Result |
|---|---|---|---|
| B-01 | Any screen | Test-pack banner visible; About screen says it too | Not Run |
| B-02 | Vito Cruz to Baclaran | Same as A-01 (real LRT-1 is inside the demo) | Not Run |
| B-03 | "McDonald's near De La Salle Lipa" to "Candelaria town proper (Mang Inasal stop)", transfer walk limit 500 m | Three jeepneys ("Lipa Palengke", "Tiaong / Bantayan", "Candelaria"), one 150 m walk, 2 transfers, total **₱104.00**, estimated reliability shown | Not Run |
| B-04 | "Bus stop in front of Hacienda Inn" to "Vito Cruz Station", default limits | Bus "PITX", bus "SM Fairview", walk 234 m; **₱230.00**; the "Buendia" bus option appears only after raising the transfer walk limit to at least 790 m | Not Run |
| B-05 | "Lipa van terminal" to "Puregold San Pablo" | One van, **₱130.00**, estimated | Not Run |
| B-06 | Laoag to Legazpi | Three buses (Laoag to Cubao, Cubao to PITX, PITX to Legazpi), 2 transfers, **₱1,662.00** | Not Run |
| B-07 | Lipa to Baguio | Bus to PITX, EDSA Carousel to Cubao, bus to Baguio, 2 transfers, **₱639.00** | Not Run |
| B-08 | Candelaria to Vito Cruz hub (demo place) | A partial total: "Known subtotal ... not the full total" with one unknown ride fare | Not Run |
| B-09 | A reverse of a road draft, for example Candelaria town proper back to the McDonald's stop | "No verified complete journey available" (return trips are not in the data) | Not Run |

B-06 to B-08 use the invented Luzon network and its invented fares.

## C. How to record the result

Replace "Not Run" with Pass or Fail per cell. For a Fail write what the screen showed and the expected value. Then update `docs/evidence/route-audit.md` with the table, the reviewer's name and the date, and set the ROUTE-006 row in `docs/planning/04-team-execution.md` to what actually happened. Do not mark anything Pass for an outcome nobody saw on a phone.
