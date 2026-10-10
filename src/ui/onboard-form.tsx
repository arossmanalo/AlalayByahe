// Member 3 (UI-005): pick service, direction and the next stop ahead (design artboard "Already riding").
// The app never claims to know where the vehicle is; the user's confirmation is the only position input.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Direction, Service, TransitPack } from "../contracts";
import { Icon } from "./components/icons";
import { DirectionSign, GroupFooterText, IconNote, ListGroup, ListRow, ModeTile, SearchField, text } from "./components/primitives";
import { SheetModal } from "./components/SheetModal";
import { filterServices, nextStopChoices, selectableDirections, type NextStopChoice } from "./onboard-logic";
import { useUi } from "./services";
import { colors, modeColors, spacing } from "./theme";

export interface OnboardSelection {
  service: Service | null;
  direction: Direction | null;
  nextStop: NextStopChoice | null;
  confirmed: boolean;
}

/** Stops shown before "Show all": a short window around the chosen stop. */
const STOP_WINDOW = 5;

export function OnboardForm({
  pack,
  value,
  onChange,
}: {
  pack: TransitPack;
  value: OnboardSelection;
  onChange: (value: OnboardSelection) => void;
}) {
  const { t } = useUi();
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("");
  const [allStops, setAllStops] = useState(false);
  const services = filterServices(pack, filter);
  const directions = value.service ? selectableDirections(pack, value.service.id) : [];
  const stops = value.direction ? nextStopChoices(pack, value.direction.id) : [];
  const line = value.service ? modeColors[value.service.mode].line : colors.primary;

  const selectedIndex = stops.findIndex((c) => c.stop.id === value.nextStop?.stop.id);
  const windowed = !allStops && stops.length > STOP_WINDOW + 1;
  const start = windowed ? Math.min(Math.max(0, selectedIndex - 2), stops.length - STOP_WINDOW) : 0;
  const shown = windowed ? stops.slice(start, start + STOP_WINDOW) : stops;

  return (
    <>
      <ListGroup header={t.vehicleSection} footer={value.service ? undefined : t.onboardServiceHint}>
        {value.service ? (
          <ListRow
            minHeight={50}
            leading={<ModeTile kind={value.service.mode} />}
            title={value.service.name}
            detail={t.change}
            accessory="chevron"
            accessibilityLabel={`${t.vehicleSection}: ${t.modeNames[value.service.mode]} ${value.service.name}. ${t.change}`}
            onPress={() => setPicking(true)}
          />
        ) : (
          <ListRow minHeight={50} title={t.chooseVehicle} tinted accessory="chevron" onPress={() => setPicking(true)} />
        )}
      </ListGroup>

      {value.service ? (
        <ListGroup
          header={t.directionSection}
          accessibilityRole="radiogroup"
          accessibilityLabel={t.directionSection}
          footer={
            <IconNote icon="warning" iconColor={colors.warning}>
              {t.onboardWrongDirection}
            </IconNote>
          }
        >
          {directions.length === 0 ? <ListRow title={t.onboardNoDirections} /> : null}
          {directions.map((d) => (
            <ListRow
              key={d.id}
              role="radio"
              minHeight={50}
              title={<DirectionSign headsign={d.headsign} size="medium" />}
              subtitle={d.availability === "unknown" ? t.directionUnknownAvailability : undefined}
              accessibilityLabel={d.availability === "unknown" ? `${d.headsign} (${t.directionUnknownAvailability})` : d.headsign}
              selected={value.direction?.id === d.id}
              accessory="check"
              onPress={() => {
                setAllStops(false);
                onChange({ ...value, direction: d, nextStop: null, confirmed: false });
              }}
            />
          ))}
        </ListGroup>
      ) : null}

      {value.direction ? (
        <ListGroup
          header={t.nextStopSection}
          footer={`${t.onboardNextStopHint} ${t.stopsOrderNote}`}
        >
          {stops.length === 0 ? (
            <ListRow title={t.onboardNoStops} />
          ) : (
            <View accessibilityRole="radiogroup" accessibilityLabel={t.nextStopSection}>
              {shown.map((choice) => {
                const i = stops.indexOf(choice);
                return (
                  <StopRow
                    key={`${choice.routeStop.sequence}_${choice.stop.id}`}
                    label={choice.stop.label}
                    tag={t.nextStopTag}
                    color={line}
                    first={i === 0}
                    last={i === stops.length - 1}
                    selected={i === selectedIndex}
                    onPress={() => onChange({ ...value, nextStop: choice, confirmed: false })}
                  />
                );
              })}
            </View>
          )}
          {stops.length > STOP_WINDOW + 1 ? (
            <ListRow title={allStops ? t.showFewerStops : t.showAllStops(stops.length)} tinted minHeight={46} onPress={() => setAllStops((a) => !a)} />
          ) : null}
        </ListGroup>
      ) : null}

      <SheetModal
        visible={picking}
        title={t.onboardService}
        cancelLabel={t.cancel}
        onCancel={() => setPicking(false)}
        header={
          <SearchField
            label={t.searchServices}
            placeholder={t.searchServicesHint}
            value={filter}
            onChangeText={setFilter}
            clearLabel={t.clear}
            strong
          />
        }
      >
        <ListGroup footer={t.onboardServiceHint}>
          {pack.services.length === 0 ? <ListRow title={t.noServices} /> : null}
          {services.map((s) => (
            <ListRow
              key={s.id}
              role="radio"
              minHeight={56}
              leading={<ModeTile kind={s.mode} />}
              title={s.name}
              subtitle={[t.modeNames[s.mode], ...s.signboardAliases].join(" · ")}
              selected={value.service?.id === s.id}
              accessory="check"
              onPress={() => {
                if (value.service?.id !== s.id) {
                  setAllStops(false);
                  onChange({ service: s, direction: null, nextStop: null, confirmed: false });
                }
                setPicking(false);
              }}
            />
          ))}
        </ListGroup>
      </SheetModal>
    </>
  );
}

/** One stop on the line, in riding order; the rail runs through the dots like the steps timeline. */
function StopRow({
  label,
  tag,
  color,
  first,
  last,
  selected,
  onPress,
}: {
  label: string;
  tag: string;
  color: string;
  first: boolean;
  last: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const height = selected ? 50 : 46;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.stopRow, { minHeight: height }, selected && styles.stopSelected, pressed && styles.pressed]}
    >
      <View style={[styles.railCell, { minHeight: height }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={[styles.rail, { backgroundColor: color, top: first ? "50%" : 0, bottom: last ? "50%" : 0 }]} />
        {selected ? <View style={styles.youDot} /> : <View style={[styles.stopDot, { borderColor: color }]} />}
      </View>
      <View style={styles.stopText}>
        <Text style={[text.body, selected && styles.semibold]}>{label}</Text>
        {selected ? <Text style={styles.tag}>{tag}</Text> : null}
      </View>
      <View style={styles.check}>{selected ? <Icon name="check" size={18} color={colors.primary} strokeWidth={2.8} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  semibold: { fontWeight: "600" },
  pressed: { opacity: 0.6 },
  stopRow: { flexDirection: "row", alignItems: "center", paddingRight: spacing.lg },
  stopSelected: { backgroundColor: colors.selectedSurface },
  railCell: { width: 40, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  rail: { position: "absolute", width: 4 },
  stopDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.5, backgroundColor: "#FFFFFF" },
  youDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.you, borderWidth: 3, borderColor: "#FFFFFF" },
  stopText: { flex: 1, minWidth: 0, paddingVertical: 4 },
  tag: { fontSize: 13, lineHeight: 17, color: colors.primary },
  check: { width: 24, alignItems: "flex-end" },
});
