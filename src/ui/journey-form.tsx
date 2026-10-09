// Member 3 (UI-002): strict, visible journey preferences. Defaults are labeled; nothing is relaxed silently.
import type { JourneyPreferences, Mode } from "../contracts";
import { Card, ChipRow, ChoiceChip, Heading, LabeledInput, Notice, Small } from "./components/primitives";
import {
  ALL_MODES,
  ALL_PASSENGERS,
  ALL_PRIORITIES,
  DEFAULT_PREFERENCES,
  type ExplicitField,
  type PreferenceErrors,
  type PreferenceForm,
} from "./form-logic";
import { useUi } from "./services";

export function PreferencesForm({
  form,
  onChange,
  errors,
  explicit,
}: {
  form: PreferenceForm;
  onChange: (form: PreferenceForm) => void;
  errors: PreferenceErrors;
  explicit: Set<ExplicitField>;
}) {
  const { t } = useUi();
  const set = <K extends keyof PreferenceForm>(key: K, value: PreferenceForm[K]) => onChange({ ...form, [key]: value });

  const tag = (field: ExplicitField, isDefault: boolean): string | null => {
    if (explicit.has(field)) return t.fromYourWords;
    return isDefault ? t.defaultTag : null;
  };

  const toggleMode = (mode: Mode) =>
    set(
      "allowedModes",
      form.allowedModes.includes(mode) ? form.allowedModes.filter((m) => m !== mode) : [...form.allowedModes, mode],
    );

  const d = DEFAULT_PREFERENCES;
  const allModes = ALL_MODES.every((m) => form.allowedModes.includes(m));

  return (
    <Card>
      <Heading level={2}>{t.preferencesHeading}</Heading>
      <Notice tone="info" title={t.preferencesStrict} />

      <Heading level={3}>
        {t.modesLabel}
        {tag("allowedModes", allModes) ? ` (${tag("allowedModes", allModes)})` : ""}
      </Heading>
      <ChipRow>
        {ALL_MODES.map((mode) => (
          <ChoiceChip
            key={mode}
            label={t.modeNames[mode]}
            selected={form.allowedModes.includes(mode)}
            onPress={() => toggleMode(mode)}
          />
        ))}
      </ChipRow>
      {errors.allowedModes ? <Notice tone="danger" title={t.modesNoneError} /> : null}

      <Heading level={3}>
        {t.priorityLabel}
        {tag("priority", form.priority === d.priority) ? ` (${tag("priority", form.priority === d.priority)})` : ""}
      </Heading>
      <ChipRow>
        {ALL_PRIORITIES.map((p) => (
          <ChoiceChip
            key={p}
            kind="radio"
            label={t.priorityNames[p]}
            selected={form.priority === p}
            onPress={() => set("priority", p)}
          />
        ))}
      </ChipRow>

      <ChoiceChip
        label={t.directOnlyLabel}
        selected={form.directOnly}
        onPress={() => set("directOnly", !form.directOnly)}
      />

      <LabeledInput
        label={t.accessWalkLabel}
        value={form.accessText}
        onChangeText={(v) => set("accessText", v)}
        keyboardType="number-pad"
        tag={tag("maxAccessWalkMeters", form.accessText === String(d.maxAccessWalkMeters))}
        error={errors.access ? t.walkInvalid : null}
      />
      <LabeledInput
        label={t.transferWalkLabel}
        value={form.transferText}
        onChangeText={(v) => set("transferText", v)}
        keyboardType="number-pad"
        tag={tag("maxTransferWalkMeters", form.transferText === String(d.maxTransferWalkMeters))}
        error={errors.transfer ? t.walkInvalid : null}
      />
      <LabeledInput
        label={t.egressWalkLabel}
        value={form.egressText}
        onChangeText={(v) => set("egressText", v)}
        keyboardType="number-pad"
        tag={tag("maxEgressWalkMeters", form.egressText === String(d.maxEgressWalkMeters))}
        error={errors.egress ? t.walkInvalid : null}
      />

      <LabeledInput
        label={t.budgetLabel}
        hint={t.budgetHint}
        value={form.budgetText}
        onChangeText={(v) => set("budgetText", v)}
        keyboardType="decimal-pad"
        tag={explicit.has("budgetCentavos") ? t.fromYourWords : null}
        error={errors.budget ? t.budgetInvalid : null}
      />
      {form.budgetText.trim() !== "" ? <Small>{t.budgetUnknownNote}</Small> : null}

      <Heading level={3}>{t.passengerLabel}</Heading>
      <ChipRow>
        {ALL_PASSENGERS.map((p: JourneyPreferences["passenger"]) => (
          <ChoiceChip
            key={p}
            kind="radio"
            label={t.passengerNames[p]}
            selected={form.passenger === p}
            onPress={() => set("passenger", p)}
          />
        ))}
      </ChipRow>
    </Card>
  );
}
