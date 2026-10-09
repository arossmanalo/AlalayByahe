# Free maps provider research — October 10, 2026

Recommendation: **Geoapify for hosted maps, paired with MapLibre React Native for native rendering.** This is a researched candidate for optional maps/online helpers, not an installed dependency or a change to the approved core contract.

## Current free plans

| Provider | Free allowance | Fit for AlalayByahe |
|---|---|---|
| [Geoapify](https://www.geoapify.com/pricing/) | 3,000 credits/day; no card; commercial/production apps permitted with attribution | Recommended: maps, address search and walking requests can share one account |
| [MapTiler](https://www.maptiler.com/cloud/pricing/) | 100,000 API requests/month or SDK session metering; no card | Good prototype alternative; Free is described for testing, PoC, personal or non-commercial use |
| [Stadia Maps](https://stadiamaps.com/pricing/) | 200,000 credits/month; signup without card | Good demo alternative; Free excludes commercial use and includes only basic APIs |

Geoapify quotas are shared across APIs. Its quota policy is soft and may result in an upgrade request or account restriction; it is not an unlimited service. Keep the Free account, add request budgets, and offer stored-place/instruction fallback when unavailable. [Pricing and quota policy](https://www.geoapify.com/pricing/).

## Cost and capabilities

[Geoapify's credit schedule](https://www.geoapify.com/pricing-details/) charges 0.25 credits per map tile, one credit per geocode, and normally one credit for a two-waypoint route under 500 km. Extra route options can cost more. Theoretical tile-only allowance is 12,000 tiles/day; actual maps share credits with address and walking calls. This is quota arithmetic, not a measured user capacity.

The [map API](https://apidocs.geoapify.com/docs/maps/) supplies raster/vector styles compatible with MapLibre. Show Geoapify, OpenStreetMap and applicable OpenMapTiles attribution. An API key is required.

The [routing API](https://apidocs.geoapify.com/docs/routing/) supports pedestrian routing. Its bus road-access profile and approximate transit mode do not establish verified local jeepney/van/tricycle services, legal boarding or fares. Actual coverage and pedestrian paths for the three corridors have not been tested.

## Native and privacy fit

[MapLibre React Native](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/) wraps Android/iOS maps and has an Expo setup. Current documented minima are RN 0.80 and Android API 23; v11 requires the new architecture. Our RN 0.86.3/API 24 baseline meets those numerical minima. Compatibility with the complete app still needs native builds and device tests; MapLibre provides rendering while Geoapify hosts the map data.

Follow the existing no-provider-key-in-bundle policy: use a protected, quota-limited server adapter and rewrite style/tile/glyph/sprite URLs to keep provider credentials server-side. Send only explicitly selected addresses/coordinates, with online consent. Keep commute planning and local AI independent of the map service.

Treat the first map integration as online. Offline tile storage rights and implementation remain unverified. Do not bulk-download from the [public OpenStreetMap tile server](https://operations.osmfoundation.org/policies/tiles/). Retain the approved offline stored-place/verified-graph workflow.

No account, API key, paid plan, proxy deployment, dependency installation or live provider request was performed in this research.
