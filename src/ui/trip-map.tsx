// Optional journey map (MAP-001). A picture from Geoapify's Static Maps API showing the stops and the
// drop-off pin, refreshed with the phone's position while an alert runs. It needs internet and a key set at
// build time (EXPO_PUBLIC_GEOAPIFY_KEY); without either, the journey text is the result and nothing is
// requested. No request is made until the user taps "Show map". It is not a pannable live map.
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { Point, TransitPack, JourneyOption } from "../contracts";
import { buildTripPins } from "../routing/tripPins";
import { AppButton, Footnote, GroupFooterText, ListGroup, Small } from "./components/primitives";
import { useUi } from "./services";
import { buildStaticMapUrl, shouldRefreshMap } from "./trip-map-url";
import { spacing } from "./theme";

const API_KEY: string = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? "";

/** Whether this build can request map pictures at all (a key was set at build time). */
export const mapPicturesAvailable = API_KEY.trim() !== "";

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
      <ListGroup header={t.mapTitle}>
        <View style={styles.block}>
          <Small>{t.mapNotInBuild}</Small>
        </View>
      </ListGroup>
    );
  }
  if (trip.pins.length === 0) return null;

  return (
    <ListGroup header={t.mapTitle} footer={shown ? <GroupFooterText>{t.mapAttribution}</GroupFooterText> : undefined}>
      <View style={styles.block}>
        {!shown ? (
          <>
            <Small muted={false}>{t.mapDisclosure}</Small>
            <AppButton label={t.mapShow} variant="secondary" onPress={() => setShown(true)} />
          </>
        ) : (
          <>
            {url && !failed ? (
              <Image
                source={{ uri: url }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel={t.mapA11y}
                onError={() => setFailed(true)}
              />
            ) : (
              <Small muted={false}>{t.mapFailed}</Small>
            )}
            <Footnote>{t.mapLegend}</Footnote>
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
      </View>
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 10 },
  image: { width: "100%", aspectRatio: 640 / 400, borderRadius: 8 },
});
