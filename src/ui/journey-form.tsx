// Member 3 (UI-002): strict, visible journey preferences (design artboard "Preferences sheet").
// Defaults and preferences from the user's words are labelled; nothing is relaxed silently.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { JourneyPreferences, Mode } from "../contracts";
import { Icon } from "./components/icons";
import {
  AppButton,
  GroupFooterText,
  IconNote,
  ListGroup,
  ListRow,
  ModeTile,
  SegmentedControl,
  Stepper,
  SwitchControl,
  text,
  useGroupColor,
} from "./components/primitives";
import { SheetModal } from "./components/SheetModal";
import { formatCentavos, formatMeters, parseMeters } from "./format";
import {
  ALL_MODES,
  ALL_PASSENGERS,
  ALL_PRIORITIES,
  DEFAULT_PREFERENCES,
  formToPreferences,
  preferenceSummary,
  preferencesToForm,
  stepMeters,
  type ExplicitField,
  type PreferenceErrors,
  type PreferenceForm,
} from "./form-logic";
import { useUi } from "./services";
import { colors, radius, spacing, type } from "./theme";

type WalkField = "access" | "transfer" | "egress";
const WALK_TEXT: Record<WalkField, "accessText" | "transferText" | "egressText"> = {
  access: "accessText",
  transfer: "transferText",
  egress: "egressText",
};
const WALK_DEFAULT: Record<WalkField, number> = {
  access: DEFAULT_PREFERENCES.maxAccessWalkMeters,
  transfer: DEFAULT_PREFERENCES.maxTransferWalkMeters,
  egress: DEFAULT_PREFERENCES.maxEgressWalkMeters,
};
const WALK_EXPLICIT: Record<WalkField, ExplicitField> = {
  access: "maxAccessWalkMeters",
  transfer: "maxTransferWalkMeters",
  egress: "maxEgressWalkMeters",
};

/** "Preferences" row on Check your trip: one summary line, then the sheet on tap. */
export function PreferencesRow({
  form,
  explicit,
  invalid,
  onPress,
}: {
  form: PreferenceForm;
  explicit: Set<ExplicitField>;
  invalid: boolean;
  onPress: () => void;
}) {
  const { t } = useUi();
  const bg = useGroupColor();
  const summary = preferenceSummary(form, explicit, t, formatCentavos, formatMeters);
  const plain = [...(summary.fromWords.length ? [`${summary.fromWords.join(", ")} ${t.fromYourWords}`] : []), ...summary.others].join(" · ");
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.preferencesHeading}: ${plain}`}
        onPress={onPress}
        style={({ pressed }) => [styles.prefRow, { backgroundColor: bg }, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <Text style={text.body}>{t.preferencesHeading}</Text>
          <Text style={text.footnote}>
            {summary.fromWords.length ? (
              <>
                <Text style={styles.fromWords}>{summary.fromWords.join(", ")}</Text> {t.fromYourWords}
                {summary.others.length ? " · " : ""}
              </>
            ) : null}
            {summary.others.join(" · ")}
          </Text>
        </View>
        <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={3} />
      </Pressable>
      {invalid ? (
        <Text accessibilityLiveRegion="polite" style={styles.invalid}>
          {t.prefsInvalid}
        </Text>
      ) : null}
    </View>
  );
}

/** The Preferences sheet. Edits stay in a draft until Done; Done validates and keeps the sheet open on errors. */
export function PreferencesSheet({
  visible,
  form,
  explicit,
  onCancel,
  onDone,
}: {
  visible: boolean;
  form: PreferenceForm;
  explicit: Set<ExplicitField>;
  onCancel: () => void;
  onDone: (form: PreferenceForm) => void;
}) {
  const { t } = useUi();
  const [draft, setDraft] = useState<PreferenceForm>(form);
  const [errors, setErrors] = useState<PreferenceErrors>({});

  // Each time the sheet opens it starts from the confirmed form.
  useEffect(() => {
    if (visible) {
      setDraft(form);
      setErrors({});
    }
  }, [visible, form]);

  const set = <K extends keyof PreferenceForm>(key: K, value: PreferenceForm[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const toggleMode = (mode: Mode) =>
    set("allowedModes", draft.allowedModes.includes(mode) ? draft.allowedModes.filter((m) => m !== mode) : [...draft.allowedModes, mode]);

  const d = DEFAULT_PREFERENCES;
  const tag = (field: ExplicitField, isDefault: boolean): string | null => (explicit.has(field) ? t.tagFromWords : isDefault ? t.tagDefault : null);
  const allModes = ALL_MODES.every((m) => draft.allowedModes.includes(m));

  const done = () => {
    const result = formToPreferences(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onDone(draft);
  };

  return (
    <SheetModal visible={visible} title={t.preferencesHeading} cancelLabel={t.cancel} onCancel={onCancel} doneLabel={t.done} onDone={done}>
      <View style={styles.strict}>
        <IconNote icon="lock">{t.strictShort}</IconNote>
      </View>

      <ListGroup
        header={t.transportSection}
        footer={
          <GroupFooterText style={errors.allowedModes ? styles.errorText : undefined}>
            {errors.allowedModes ? t.modesNoneError : t.chooseAtLeastOne}
            {tag("allowedModes", allModes) ? ` ${tag("allowedModes", allModes)}` : ""}
          </GroupFooterText>
        }
      >
        {ALL_MODES.map((mode) => (
          <ListRow
            key={mode}
            role="checkbox"
            leading={<ModeTile kind={mode} />}
            title={t.modeNames[mode]}
            selected={draft.allowedModes.includes(mode)}
            accessory="check"
            onPress={() => toggleMode(mode)}
          />
        ))}
      </ListGroup>

      <ListGroup
        header={t.priorityLabel}
        accessibilityRole="radiogroup"
        accessibilityLabel={t.priorityLabel}
        footer={`${t.lowestFareNote}${tag("priority", draft.priority === d.priority) ? ` ${tag("priority", draft.priority === d.priority)}` : ""}`}
      >
        {ALL_PRIORITIES.map((p) => (
          <ListRow key={p} role="radio" title={t.priorityNames[p]} selected={draft.priority === p} accessory="check" onPress={() => set("priority", p)} />
        ))}
      </ListGroup>

      <ListGroup>
        <ListRow
          minHeight={64}
          title={t.directOnlyTitle}
          subtitle={
            <Text style={text.footnote}>
              {t.directOnlySub}
              {tag("directOnly", draft.directOnly === d.directOnly) ? (
                <Text style={explicit.has("directOnly") ? styles.tint : undefined}> · {tag("directOnly", draft.directOnly === d.directOnly)}</Text>
              ) : null}
            </Text>
          }
          accessory={<SwitchControl label={t.directOnlyLabel} value={draft.directOnly} onValueChange={(v) => set("directOnly", v)} />}
        />
      </ListGroup>

      <ListGroup header={t.walkingSection} footer={t.walkFooter}>
        {(["access", "transfer", "egress"] as const).map((which) => {
          const key = WALK_TEXT[which];
          const parsed = parseMeters(draft[key]);
          const value = parsed.ok ? parsed.value : null;
          const label = tag(WALK_EXPLICIT[which], draft[key] === String(WALK_DEFAULT[which]));
          const invalid = errors[which] !== undefined;
          return (
            <ListRow
              key={which}
              minHeight={56}
              accessibilityLabel={`${t.walkWhich[which]}: ${value !== null ? formatMeters(value) : t.walkInvalid}`}
              title={<Text style={[text.body, invalid && styles.errorText]}>{value !== null ? formatMeters(value) : draft[key]}</Text>}
              subtitle={
                <Text style={[text.footnote, invalid && styles.errorText]}>
                  {invalid ? t.walkInvalid : t.walkWhich[which]}
                  {label && !invalid ? ` · ${label}` : ""}
                </Text>
              }
              accessory={
                <Stepper
                  decrementLabel={t.walkLess[which]}
                  incrementLabel={t.walkMore[which]}
                  canDecrement={value === null || value > 0}
                  canIncrement={value === null || value < 50_000}
                  onDecrement={() => set(key, String(stepMeters(draft[key], -1, WALK_DEFAULT[which])))}
                  onIncrement={() => set(key, String(stepMeters(draft[key], 1, WALK_DEFAULT[which])))}
                />
              }
            />
          );
        })}
      </ListGroup>

      <ListGroup
        header={t.budgetSection}
        footer={
          <GroupFooterText style={errors.budget ? styles.errorText : undefined}>
            {errors.budget ? t.budgetInvalid : t.budgetUnknownNote}
            {explicit.has("budgetCentavos") ? ` ${t.tagFromWords}` : ""}
          </GroupFooterText>
        }
      >
        <ListRow
          title={t.budgetRow}
          accessory={
            <View style={styles.budget}>
              <Text style={[text.body, text.muted]}>₱</Text>
              <TextInput
                accessibilityLabel={`${t.budgetRow}, ${t.budgetHint}`}
                accessibilityHint={errors.budget ? t.budgetInvalid : undefined}
                value={draft.budgetText}
                onChangeText={(v) => set("budgetText", v)}
                keyboardType="decimal-pad"
                placeholder={t.budgetPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={styles.budgetInput}
              />
            </View>
          }
        />
      </ListGroup>

      <ListGroup header={t.passengerLabel} footer={t.discountNote}>
        <View style={styles.segmentWrap}>
          <SegmentedControl
            label={t.passengerLabel}
            options={ALL_PASSENGERS.map((p: JourneyPreferences["passenger"]) => ({
              value: p,
              label: t.passengerShort[p],
              accessibilityLabel: t.passengerNames[p],
            }))}
            value={draft.passenger}
            onChange={(p) => set("passenger", p)}
          />
        </View>
      </ListGroup>

      <AppButton
        label={t.resetDefaults}
        variant="link"
        style={styles.reset}
        onPress={() => {
          setDraft(preferencesToForm(DEFAULT_PREFERENCES));
          setErrors({});
        }}
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.field },
  fromWords: { color: colors.text, fontWeight: "600" },
  invalid: { marginTop: 6, marginHorizontal: spacing.xs, fontSize: type.caption, color: colors.danger, fontWeight: "600" },
  strict: { marginHorizontal: spacing.lg, marginBottom: -8 },
  errorText: { color: colors.danger },
  tint: { color: colors.primary },
  budget: { flexDirection: "row", alignItems: "center", gap: 2 },
  budgetInput: { minWidth: 72, minHeight: 44, textAlign: "right", fontSize: type.body, color: colors.text },
  segmentWrap: { padding: spacing.sm },
  reset: { backgroundColor: colors.surface, borderRadius: radius.md },
});
