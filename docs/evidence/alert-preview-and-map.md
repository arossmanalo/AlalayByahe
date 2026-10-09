# Alert preview and optional journey map (2026-10-10)

Status: software tests only (`tests/ui/preview-and-map.test.ts`). **Not run on a phone. No request has been made to Geoapify.**

## Preview the alert (simulated walk)

Why: nobody can ride to a stop to test the alert. The card has a **"Preview the alert (simulated walk)"** button (every build). It replays 16 invented GPS fixes, one every 1.5 s (about 24 s), from twice the warning distance down to a third of the arrival radius, due north of the drop-off. They go through the **same** watcher, status machine, banner, TalkBack announcement, keep-awake and `Vibration` code as real fixes. So you can see and feel the alert at a desk.

What it proves: the UI and the phone's vibration motor work. What it does not prove: real GPS accuracy, indoor or underground signal, permission prompts, battery use, or whether the distances suit riders. The card says "this is a simulated walk, not your real location" while it runs. Never report a preview as location evidence. The real path (tap "Notify me near my stop", grant location) still needs a person to walk or ride with a phone.

Expected on the phone: banner "Alerts are on", then "You are near ..." with one short buzz, then "You are at or very close to ..." with a longer buzz. Stop alerts ends it. Needs vibration enabled on the phone.

The demo build also shows the alert on its sample locations (marked "sample location for the demonstration network"). The release build offers it only for verified LRT-1 stops.

## Optional journey map (Geoapify Static Maps)

A picture, not a pannable live map: a Geoapify Static Maps image of the stops (green board, orange transfer, red drop-off), approximate straight lines, and a blue dot for the phone's (or the preview's) position, refreshed at most every 20 s and after about 40 m of movement. It sits under the alert on the journey detail screen.

- **Needs a key at build time.** Set `EXPO_PUBLIC_GEOAPIFY_KEY` in the shell before building (PowerShell: `$env:EXPO_PUBLIC_GEOAPIFY_KEY = "<your key>"`), then build as usual. Without it the card says the map is not set up and nothing is requested. **Never commit the key or print it in chat.** An `EXPO_PUBLIC_` value is compiled into the APK, so anyone with the APK can extract it. Project rules say provider keys belong in a server; for a hackathon build the user decides to accept that. Use a free-tier key made for this project and rotate it afterwards.
- **Explicit online action.** No request is made until the user taps "Show map (uses internet)". The disclosure says it sends the stop locations, and the position while an alert runs, to Geoapify. It never blocks the journey; offline or on error the text says so.
- **Cost.** Per the Geoapify docs, a static map request costs 1 credit plus about a quarter of a credit per 256 px tile plus 1 per marker, roughly 6 to 9 credits per image here. The free tier is 3,000 credits a day, so about 300 to 500 images a day. The throttle keeps a live trip to a few per minute.
- **Attribution** is shown under the map: Geoapify, OpenMapTiles, OpenStreetMap contributors.
- **Not a live tile map.** A real pannable map would need MapLibre (a new native dependency, a rebuild and device tests). Not done.
- **Limits:** lines are straight segments between stop coordinates, not roads. The request format follows https://apidocs.geoapify.com/docs/maps/static/. A GET URL over about 1,900 characters is thinned or the lines are dropped. The URL has not been exercised against the live API.

Disclosure for the submission: optional online helper; Geoapify receives stop coordinates (and the position during an alert) only after the user taps "Show map". Core journeys and the local AI do not need it.
