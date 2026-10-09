// Optional journey map (MAP-001). A picture from Geoapify's Static Maps API showing the stops and the
// drop-off pin, refreshed with the phone's position while an alert runs. It needs internet and a key set at
// build time (EXPO_PUBLIC_GEOAPIFY_KEY); without either, the journey text is the result and nothing is
// requested. No request is made until the user taps "Show map". It is not a pannable live map.
import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "react-native";
import type { Point, TransitPack, JourneyOption } from "../contracts";
import { buildTripPins } from "../routing/tripPins";
import { AppButton, Body, Card, Heading, Small } from "./components/primitives";
import { useUi } from "./services";
import { buildStaticMapUrl, shouldRefreshMap } from "./trip-map-url";

const API_KEY: string = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? "";

export function TripMap({ option, pack, position }: { option: JourneyOption; pack: TransitPack; position: Point | null }) {
  const { t } = useUi();
  const trip = useMemo(() => buildTripPins(option, pack), [option, pack]);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mapPosition, setMapPosition] = useState<Point | null>(null);
  const last = useRef({ at: 0, point: null as Point | null });

  useEffect(() => {
    if (!shown) return;
    const now = Date.now();
    if (shouldRefreshMap(last.current.point, position, last.current.at, now)) {
      last.current = { at: now, point: position };
      setMapPosition(position);
    }
  }, [position, shown]);

  const url = useMemo(
    () => (shown ? buildStaticMapUrl({ apiKey: API_KEY, pins: trip.pins, lines: trip.legs, position: mapPosition }) : null),
    [shown, trip, mapPosition],
  );

  if (!API_KEY) {
    return (
      <Card>
        <Heading level={2}>{t.mapTitle}</Heading>
        <Small>{t.mapNotInBuild}</Small>
      </Card>
    );
  }
  if (trip.pins.length === 0) return null;

  return (
    <Card>
      <Heading level={2}>{t.mapTitle}</Heading>
      {!shown ? (
        <>
          <Body>{t.mapDisclosure}</Body>
          <AppButton label={t.mapShow} onPress={() => setShown(true)} />
        </>
      ) : (
        <>
          {url && !failed ? (
            <Image
              source={{ uri: url }}
              style={{ width: "100%", aspectRatio: 640 / 400, borderRadius: 8 }}
              resizeMode="contain"
              accessibilityLabel={t.mapA11y}
              onError={() => setFailed(true)}
            />
          ) : (
            <Body>{t.mapFailed}</Body>
          )}
          <Small>{t.mapLegend}</Small>
          <Small>{t.mapAttribution}</Small>
          <AppButton
            label={t.mapHide}
            variant="secondary"
            onPress={() => {
              setShown(false);
              setFailed(false);
              setMapPosition(null);
              last.current = { at: 0, point: null };
            }}
          />
        </>
      )}
    </Card>
  );
}
