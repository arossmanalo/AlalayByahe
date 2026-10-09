// Member 3 (UI-001): accessible building blocks. Font scaling stays enabled; nothing truncates text.
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, legColors, minTouch, radius, spacing, toneColors, toneGlyph, type, type LegVisual, type Tone } from "../theme";

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return (
    <Text accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, muted && styles.muted, style]}>{children}</Text>;
}

export function Small({ children, muted = true }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.small, muted && styles.muted]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Gap({ size = "md" }: { size?: keyof typeof spacing }) {
  return <View style={{ height: spacing[size] }} />;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "link";

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  hint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
}) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        variant === "link" && styles.buttonLink,
        pressed && !inactive && (variant === "primary" ? styles.buttonPrimaryPressed : styles.buttonPressed),
        inactive && variant !== "link" && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? colors.onPrimary : colors.primary} style={styles.spinner} />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && styles.buttonTextPrimary,
          variant === "danger" && styles.buttonTextDanger,
          variant === "link" && styles.buttonTextLink,
          inactive && styles.buttonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Tone is always paired with a glyph and a written title so meaning never relies on color. */
export function Notice({
  tone,
  title,
  children,
  actions,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const c = toneColors[tone];
  const urgent = tone === "danger" || tone === "warning";
  return (
    <View
      accessibilityRole={urgent ? "alert" : undefined}
      accessibilityLiveRegion={urgent ? "polite" : "none"}
      style={[styles.notice, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={[styles.noticeTitle, { color: c.fg }]}>
        {toneGlyph[tone]} {title}
      </Text>
      {typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children}
      {actions ? <View style={styles.noticeActions}>{actions}</View> : null}
    </View>
  );
}

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>
        {toneGlyph[tone]} {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ progress, label }: { progress: number | null; label: string }) {
  const pct = progress === null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={pct === null ? undefined : { min: 0, max: 100, now: pct }}
      style={styles.progressTrack}
    >
      {pct === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      )}
    </View>
  );
}

/** Checkbox or radio chip. Selection shows a check mark and thicker border, not only color. */
export function ChoiceChip({
  label,
  selected,
  onPress,
  kind = "checkbox",
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  kind?: "checkbox" | "radio";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {selected ? (kind === "radio" ? "◉ " : "☑ ") : kind === "radio" ? "○ " : "☐ "}
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function LabeledInput({
  label,
  value,
  onChangeText,
  hint,
  error,
  tag,
  keyboardType,
  multiline = false,
  placeholder,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string | null;
  tag?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  placeholder?: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {tag ? <Text style={styles.tag}> ({tag})</Text> : null}
      </Text>
      {hint ? <Text style={[styles.small, styles.muted]}>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, multiline && styles.inputMultiline, error ? styles.inputError : null]}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {toneGlyph.danger} {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Mode label with a colored edge; the text name is always present. */
export function LegBadge({ kind, label }: { kind: LegVisual; label: string }) {
  return (
    <View style={[styles.legBadge, { borderLeftColor: legColors[kind] }]}>
      <Text style={styles.legBadgeText}>{label}</Text>
    </View>
  );
}

export function Row({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <View style={[styles.row, wrap && styles.rowWrap]}>{children}</View>;
}

const styles = StyleSheet.create({
  h1: { fontSize: type.title, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  h2: { fontSize: type.heading, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  h3: { fontSize: type.subheading, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
  body: { fontSize: type.body, lineHeight: type.body * 1.4, color: colors.text },
  small: { fontSize: type.small, lineHeight: type.small * 1.4, color: colors.text },
  muted: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  button: {
    minHeight: minTouch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 2,
    borderColor: "transparent",
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonPrimaryPressed: { backgroundColor: colors.primaryPressed },
  buttonSecondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  buttonDanger: { backgroundColor: colors.surface, borderColor: colors.danger },
  buttonLink: { paddingHorizontal: spacing.xs, alignSelf: "flex-start" },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { backgroundColor: colors.disabledSurface, borderColor: colors.disabledSurface },
  buttonText: { fontSize: type.body, fontWeight: "600", color: colors.primary, textAlign: "center", flexShrink: 1 },
  buttonTextPrimary: { color: colors.onPrimary },
  buttonTextDanger: { color: colors.danger },
  buttonTextLink: { textDecorationLine: "underline" },
  buttonTextDisabled: { color: colors.textMuted },
  spinner: { marginRight: spacing.sm },
  notice: { borderWidth: 1, borderLeftWidth: 6, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  noticeTitle: { fontSize: type.body, fontWeight: "700" },
  noticeActions: { gap: spacing.sm, marginTop: spacing.xs },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: type.small, fontWeight: "600" },
  progressTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  chip: {
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, borderWidth: 3, backgroundColor: colors.infoSurface },
  chipText: { fontSize: type.body, color: colors.text },
  chipTextSelected: { fontWeight: "700", color: colors.primaryPressed },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  field: { gap: spacing.xs },
  label: { fontSize: type.body, fontWeight: "600", color: colors.text },
  tag: { fontSize: type.small, fontWeight: "400", color: colors.textMuted },
  input: {
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: type.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 120 },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  errorText: { fontSize: type.small, color: colors.danger, fontWeight: "600" },
  legBadge: {
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  legBadgeText: { fontSize: type.small, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowWrap: { flexWrap: "wrap" },
});
