// Member 3 (UI-005): pick service, direction and the next stop ahead, with explicit confirmation.
// The app never claims to know where the vehicle is; the user's confirmation is the only position input.
import { useState } from "react";
import type { Direction, Service, TransitPack } from "../contracts";
import { Body, Card, ChoiceChip, Heading, LabeledInput, Notice, Small } from "./components/primitives";
import { filterServices, nextStopChoices, selectableDirections, type NextStopChoice } from "./onboard-logic";
import { useUi } from "./services";

export interface OnboardSelection {
  service: Service | null;
  direction: Direction | null;
  nextStop: NextStopChoice | null;
  confirmed: boolean;
}

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
  const [filter, setFilter] = useState("");
  const services = filterServices(pack, filter);
  const directions = value.service ? selectableDirections(pack, value.service.id) : [];
  const stops = value.direction ? nextStopChoices(pack, value.direction.id) : [];

  return (
    <>
      <Card>
        <Heading level={2}>{t.onboardService}</Heading>
        <Small>{t.onboardServiceHint}</Small>
        <LabeledInput
          label={t.searchServices}
          hint={t.searchServicesHint}
          value={filter}
          onChangeText={setFilter}
          autoCorrect={false}
          returnKeyType="search"
        />
        {pack.services.length === 0 ? <Body>{t.noServices}</Body> : null}
        {services.map((s) => (
          <ChoiceChip
            key={s.id}
            kind="radio"
            label={`${t.modeNames[s.mode]}: ${s.name}${s.signboardAliases.length ? ` (${s.signboardAliases.join(", ")})` : ""}`}
            selected={value.service?.id === s.id}
            onPress={() => onChange({ service: s, direction: null, nextStop: null, confirmed: false })}
          />
        ))}
      </Card>

      {value.service ? (
        <Card>
          <Heading level={2}>{t.onboardDirection}</Heading>
          {directions.length === 0 ? <Body>{t.onboardNoDirections}</Body> : null}
          {directions.map((d) => (
            <ChoiceChip
              key={d.id}
              kind="radio"
              label={d.availability === "unknown" ? `${d.headsign} (${t.directionUnknownAvailability})` : d.headsign}
              selected={value.direction?.id === d.id}
              onPress={() => onChange({ ...value, direction: d, nextStop: null, confirmed: false })}
            />
          ))}
          <Notice tone="warning" title={t.onboardCheckSign}>
            <Body>{t.onboardWrongDirection}</Body>
          </Notice>
        </Card>
      ) : null}

      {value.direction ? (
        <Card>
          <Heading level={2}>{t.onboardNextStop}</Heading>
          <Small>{t.onboardNextStopHint}</Small>
          {stops.length === 0 ? <Body>{t.onboardNoStops}</Body> : null}
          {stops.map((choice) => (
            <ChoiceChip
              key={`${choice.routeStop.sequence}_${choice.stop.id}`}
              kind="radio"
              label={`${choice.routeStop.sequence}. ${choice.stop.label}`}
              selected={value.nextStop?.stop.id === choice.stop.id}
              onPress={() => onChange({ ...value, nextStop: choice, confirmed: false })}
            />
          ))}
        </Card>
      ) : null}

      {value.direction && value.nextStop ? (
        <ChoiceChip
          label={t.onboardConfirm(value.direction.headsign, value.nextStop.stop.label)}
          selected={value.confirmed}
          onPress={() => onChange({ ...value, confirmed: !value.confirmed })}
        />
      ) : null}
    </>
  );
}
