// Member 3 (UI-001): accessible building blocks, styled after the AlalayByahe UI kit.
// Font scaling stays enabled; nothing truncates text, and heights are minimums so large text grows.
import { createContext, Children, Fragment, isValidElement, useContext, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useUi } from "../services";
import {
  colors,
  lineHeight,
  minTouch,
  modeColors,
  radius,
  spacing,
  toneColors,
  type,
  type LegVisual,
  type Tone,
} from "../theme";
import { Icon, modeIcon, type IconName } from "./icons";

// ---- Surfaces: groups contrast with the sheet or page they sit on. ----

/** "grouped": gray page with white groups. "plain": white sheet with gray groups. */
export type Surface = "grouped" | "plain";
const SurfaceContext = createContext<Surface>("grouped");
// Rows in a "plain" list (no group background) line up with the sheet edge instead of the group's inset.
const RowInsetContext = createContext<number>(spacing.lg);

export function SurfaceProvider({ surface, children }: { surface: Surface; children: ReactNode }) {
  return <SurfaceContext.Provider value={surface}>{children}</SurfaceContext.Provider>;
}

export function useGroupColor(): string {
  return useContext(SurfaceContext) === "plain" ? colors.surfaceMuted : colors.surface;
}

function useSeparatorColor(): string {
  return useContext(SurfaceContext) === "plain" ? colors.separatorOnMuted : colors.separator;
}

// ---- Text ----

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const style = level === 1 ? text.title : level === 2 ? text.headline : text.subheadStrong;
  return (
    <Text accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}

export function LargeTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={text.largeTitle}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[text.body, muted && text.muted, style]}>{children}</Text>;
}

/** Subhead (15/20). */
export function Small({ children, muted = true, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[text.subhead, muted && text.muted, style]}>{children}</Text>;
}

/** Footnote (13/18), muted. */
export function Footnote({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[text.footnote, style]}>{children}</Text>;
}

/** A footnote line that starts with an icon, such as the lock beside "Strict." */
export function IconNote({ icon, iconColor = colors.textMuted, children }: { icon: IconName; iconColor?: string; children: ReactNode }) {
  return (
    <View style={styles.iconNote}>
      <Icon name={icon} size={14} color={iconColor} strokeWidth={2.2} style={styles.iconNoteIcon} />
      <Text style={[text.footnote, styles.flex]}>{children}</Text>
    </View>
  );
}

// ---- Containers ----

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const bg = useGroupColor();
  return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
}

export function Gap({ size = "md" }: { size?: keyof typeof spacing }) {
  return <View style={{ height: spacing[size] }} />;
}

/** Inset grouped list section: uppercase header, rounded group with hairlines between rows, footer. */
export function ListGroup({
  header,
  footer,
  children,
  style,
  accessibilityRole,
  accessibilityLabel,
  plain = false,
  separatorInset,
}: {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  /** No group background: rows sit directly on the sheet, as in the Home sheet's shortcuts. */
  plain?: boolean;
  /** Left inset of the hairlines, to line up with row text after a tile. */
  separatorInset?: number;
}) {
  const bg = useGroupColor();
  const separator = useSeparatorColor();
  const rows = Children.toArray(children).filter((c) => isValidElement(c) || typeof c === "string");
  return (
    <View style={style}>
      {header ? (
        <Text accessibilityRole="header" style={[styles.groupHeader, plain && styles.groupHeaderPlain]}>
          {plain ? header : header.toLocaleUpperCase()}
        </Text>
      ) : null}
      <View
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={[styles.group, { backgroundColor: plain ? "transparent" : bg }]}
      >
        <RowInsetContext.Provider value={plain ? 0 : spacing.lg}>
          {rows.map((row, i) => {
            // Hairlines start where the text of the row above starts: after its tile when it has one.
            const above = rows[i - 1];
            const hasLeading = isValidElement<{ leading?: unknown }>(above) && above.props.leading !== undefined;
            const inset = separatorInset ?? (hasLeading ? (plain ? 48 : 58) : plain ? 0 : spacing.lg);
            return (
              <Fragment key={i}>
                {i > 0 ? <View style={[styles.hairline, { backgroundColor: plain ? colors.separator : separator, marginLeft: inset }]} /> : null}
                {row}
              </Fragment>
            );
          })}
        </RowInsetContext.Provider>
      </View>
      {typeof footer === "string" ? <Text style={styles.groupFooter}>{footer}</Text> : footer ? <View style={styles.groupFooterBox}>{footer}</View> : null}
    </View>
  );
}

export function GroupFooterText({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.groupFooterInline, style]}>{children}</Text>;
}

/** Decorative rounded square (or circle) behind a white icon, beside a text label. */
export function IconTile({ icon, color, size = 30, round = false, iconSize }: { icon: IconName; color: string; size?: number; round?: boolean; iconSize?: number }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.tile, { width: size, height: size, borderRadius: round ? size / 2 : radius.tile, backgroundColor: color }]}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.6)} color="#FFFFFF" strokeWidth={1.9} />
    </View>
  );
}

export function ModeTile({ kind, size = 30, round = false }: { kind: LegVisual; size?: number; round?: boolean }) {
  return <IconTile icon={modeIcon[kind]} color={modeColors[kind].tile} size={size} round={round} />;
}

type Accessory = "chevron" | "check" | "none" | ReactNode;

/** One row of a list group. Pressable when onPress is given; otherwise static text. */
export function ListRow({
  leading,
  title,
  subtitle,
  detail,
  accessory = "none",
  onPress,
  selected,
  disabled,
  role,
  accessibilityLabel,
  accessibilityHint,
  titleStyle,
  minHeight = 48,
  tinted = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  accessory?: Accessory;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  role?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  titleStyle?: StyleProp<TextStyle>;
  minHeight?: number;
  /** Title in the tint colour, for action rows such as "Browse stations". */
  tinted?: boolean;
}) {
  const content = (
    <>
      {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
      <View style={styles.rowText}>
        {typeof title === "string" ? <Text style={[text.body, tinted && styles.tintText, disabled && text.muted, titleStyle]}>{title}</Text> : title}
        {typeof subtitle === "string" ? <Text style={text.footnote}>{subtitle}</Text> : subtitle}
      </View>
      {detail !== undefined ? (
        typeof detail === "string" ? <Text style={[text.body, text.muted, styles.rowDetail]}>{detail}</Text> : detail
      ) : null}
      {accessory === "chevron" ? (
        <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={3} />
      ) : accessory === "check" ? (
        <View style={styles.checkSlot}>{selected ? <Icon name="check" size={18} color={colors.primary} strokeWidth={2.8} /> : null}</View>
      ) : accessory === "none" ? null : (
        accessory
      )}
    </>
  );
  const inset = useContext(RowInsetContext);
  const rowStyle = [styles.row, { minHeight, paddingHorizontal: inset }];
  if (!onPress) {
    return (
      <View style={rowStyle} accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  const checkable = role === "radio" || role === "checkbox";
  return (
    <Pressable
      accessibilityRole={role ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={checkable ? { checked: !!selected, disabled: !!disabled } : { disabled: !!disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

// ---- Buttons ----

type ButtonVariant = "primary" | "secondary" | "danger" | "link";

/** primary: filled tint. secondary: gray fill with tint text. danger: gray fill with red text. link: plain tint text. */
export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  hint,
  icon,
  trailingIcon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  /** Decorative icon before the label; screen readers hear only the label. */
  icon?: IconName;
  trailingIcon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || busy;
  const fg =
    inactive && variant !== "link"
      ? colors.textMuted
      : variant === "primary"
        ? colors.onPrimary
        : variant === "danger"
          ? colors.danger
          : inactive
            ? colors.disabled
            : colors.primary;
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
        (variant === "secondary" || variant === "danger") && styles.buttonGray,
        variant === "link" && styles.buttonLink,
        pressed && !inactive && (variant === "primary" ? styles.buttonPrimaryPressed : styles.buttonPressed),
        inactive && variant !== "link" && styles.buttonDisabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={variant === "primary" ? colors.onPrimary : colors.primary} style={styles.spinner} /> : null}
      {icon && !busy ? <Icon name={icon} size={20} color={fg} strokeWidth={2.2} style={styles.buttonIcon} /> : null}
      <Text style={[styles.buttonText, variant === "link" && styles.buttonTextLink, { color: fg }]}>{label}</Text>
      {trailingIcon ? <Icon name={trailingIcon} size={18} color={fg} strokeWidth={2.4} style={styles.buttonTrailing} /> : null}
    </Pressable>
  );
}

/** White circle floating over the map: back, settings. */
export function MapButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.mapButton, pressed && styles.buttonPressed]}
    >
      <Icon name={icon} size={icon === "gear" ? 21 : 20} color={colors.primary} strokeWidth={icon === "gear" ? 1.9 : 2.4} />
    </Pressable>
  );
}

/** Gray round close button in a 48 dp target. */
export function CloseButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.closeTarget} hitSlop={4}>
      {({ pressed }) => (
        <View style={[styles.closeCircle, pressed && styles.buttonPressed]}>
          <Icon name="close" size={12} color={colors.textMuted} strokeWidth={3.4} />
        </View>
      )}
    </Pressable>
  );
}

// ---- Status ----

const toneIcon: Record<Tone, IconName> = {
  info: "info",
  success: "check",
  warning: "warning",
  danger: "problem",
  neutral: "info",
  fixture: "warning",
};

/** Tone is always paired with an icon and a written title so meaning never relies on color. */
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
  const { t } = useUi();
  const c = toneColors[tone];
  const groupBg = useGroupColor();
  const urgent = tone === "danger" || tone === "warning";
  const bg = tone === "neutral" ? groupBg : c.bg;
  return (
    <View
      accessibilityRole={urgent ? "alert" : undefined}
      accessibilityLiveRegion={urgent ? "polite" : "none"}
      style={[styles.notice, { backgroundColor: bg }]}
    >
      <Icon name={toneIcon[tone]} size={20} color={c.fg} strokeWidth={2.1} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        <Text accessibilityLabel={`${t.toneNames[tone]}: ${title}`} style={[styles.noticeTitle, { color: tone === "neutral" ? colors.text : c.fg }]}>
          {title}
        </Text>
        {typeof children === "string" ? <Text style={text.subhead}>{children}</Text> : children}
        {actions ? <View style={styles.noticeActions}>{actions}</View> : null}
      </View>
    </View>
  );
}

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Icon name={toneIcon[tone]} size={12} color={c.fg} strokeWidth={3} />
      <Text accessibilityLabel={label} style={[styles.pillText, { color: c.fg }]}>
        {label}
      </Text>
    </View>
  );
}

/** A label and its status, read by screen readers as one phrase such as "Local AI: Ready". */
export function LabeledStatus({ label, tone, value }: { label: string; tone: Tone; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.inlineRow, styles.wrap]}>
        <Text style={[text.subhead, text.muted]}>{label}:</Text>
        <StatusPill tone={tone} label={value} />
      </View>
    </View>
  );
}

/** Coloured status text with an icon, such as a green "Ready" at the end of a row. */
export function StatusText({ tone, label, size = "body" }: { tone: Tone; label: string; size?: "body" | "small" }) {
  const c = toneColors[tone];
  const fg = tone === "neutral" ? colors.textMuted : c.fg;
  return (
    <View style={styles.statusText}>
      <Icon name={toneIcon[tone]} size={size === "body" ? 15 : 13} color={fg} strokeWidth={2.8} />
      <Text style={[size === "body" ? text.body : text.footnote, styles.semibold, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ progress, label }: { progress: number | null; label: string }) {
  const pct = progress === null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  if (pct === null) {
    return (
      <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.progressIndeterminate}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={styles.progressTrack}
    >
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

// ---- Controls ----

/** iOS-style switch. State is read as "on/off" from accessibilityState, never from colour alone. */
export function SwitchControl({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[
        styles.switchTrack,
        { backgroundColor: disabled ? colors.disabledSurface : value ? colors.switchOn : colors.fillStrong },
        { justifyContent: value ? "flex-end" : "flex-start" },
        disabled && styles.switchDisabled,
      ]}
    >
      <View style={styles.switchThumb} />
    </Pressable>
  );
}

/** Segmented control acting as a radio group. Selection shows by fill and weight, not colour alone. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  compact = false,
}: {
  options: { value: T; label: string; accessibilityLabel?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmentTrack}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[compact ? text.footnoteDark : styles.segmentText, selected && styles.semibold, styles.center]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − / + stepper with labelled buttons. */
export function Stepper({
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  canDecrement = true,
  canIncrement = true,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  canDecrement?: boolean;
  canIncrement?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        accessibilityState={{ disabled: !canDecrement }}
        disabled={!canDecrement}
        onPress={onDecrement}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.buttonPressed]}
      >
        <Icon name="minus" size={16} color={canDecrement ? colors.text : colors.disabled} strokeWidth={2.6} />
      </Pressable>
      <View style={styles.stepperDivider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        accessibilityState={{ disabled: !canIncrement }}
        disabled={!canIncrement}
        onPress={onIncrement}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.buttonPressed]}
      >
        <Icon name="plus" size={16} color={canIncrement ? colors.text : colors.disabled} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

/** Checkbox or radio chip. Selection shows a check mark and border, not only color. */
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
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.buttonPressed, disabled && styles.buttonDisabled]}
    >
      {selected ? <Icon name="check" size={16} color={colors.primary} strokeWidth={2.8} /> : null}
      <Text style={[text.subhead, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Pass radioGroupLabel when the chips are radios so screen readers announce what is being chosen. */
export function ChipRow({ children, radioGroupLabel }: { children: ReactNode; radioGroupLabel?: string }) {
  return (
    <View accessibilityRole={radioGroupLabel ? "radiogroup" : undefined} accessibilityLabel={radioGroupLabel} style={styles.chipRow}>
      {children}
    </View>
  );
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
  autoCorrect,
  returnKeyType,
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
  /** Turn off for place and service names so the keyboard does not "correct" them. */
  autoCorrect?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
}) {
  // The error is part of the hint so a screen reader hears it when the field is focused.
  const a11yHint = [error, hint].filter(Boolean).join(". ") || undefined;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {tag ? <Text style={styles.tag}> ({tag})</Text> : null}
      </Text>
      {hint ? <Text style={text.footnote}>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={a11yHint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCorrect === false ? "none" : undefined}
        returnKeyType={returnKeyType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, multiline && styles.inputMultiline, error ? styles.inputError : null]}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Filled search field with a magnifier and a clear button, as on the map sheet and place picker. */
export function SearchField({
  value,
  onChangeText,
  label,
  placeholder,
  onSubmitEditing,
  clearLabel,
  autoFocus,
  multiline = false,
  returnKeyType = "search",
  error,
  editable = true,
  strong = false,
}: {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder: string;
  onSubmitEditing?: () => void;
  clearLabel: string;
  autoFocus?: boolean;
  multiline?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  error?: string | null;
  editable?: boolean;
  /** Darker fill for fields on a gray modal sheet. */
  strong?: boolean;
}) {
  return (
    <View>
      <View style={[styles.search, { backgroundColor: strong ? colors.fillStrong : colors.fill }, error ? styles.inputError : null]}>
        <Icon name="search" size={19} color={colors.textMuted} strokeWidth={2.1} style={styles.searchIcon} />
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
          editable={editable}
          multiline={multiline}
          submitBehavior={multiline ? "submit" : undefined}
          returnKeyType={returnKeyType}
          style={styles.searchInput}
          textAlignVertical="center"
        />
        {value.length > 0 && editable ? (
          <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} onPress={() => onChangeText("")} hitSlop={10} style={styles.clearButton}>
            <View style={styles.clearCircle}>
              <Icon name="close" size={8} color="#FFFFFF" strokeWidth={4.5} />
            </View>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.errorText, styles.searchError]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ---- Transit marks ----

/** Short line name for a badge: the service name when it is short (LRT-1), else the mode name. */
export function badgeLabel(serviceName: string, modeName: string): string {
  return serviceName.length <= 8 ? serviceName : modeName;
}

/** Line badge in the mode's deepest colour with white text. A walk has no badge: it shows the walk icon. */
export function LegBadge({ kind, label, small = false }: { kind: LegVisual; label: string; small?: boolean }) {
  const bg = modeColors[kind].badge;
  if (!bg) {
    return (
      <View style={styles.walkBadge}>
        <Icon name="walk" size={small ? 14 : 16} color={colors.text} strokeWidth={2} />
        <Text style={[small ? text.footnoteDark : text.subhead, styles.semibold]}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, small && styles.badgeTextSmall]}>{label}</Text>
    </View>
  );
}

/** Direction signboard: black text on sign yellow with an arrow. Always written out, never colour alone. */
export function DirectionSign({ headsign, size = "small" }: { headsign: string; size?: "small" | "medium" }) {
  return (
    <View style={[styles.sign, size === "medium" && styles.signMedium]}>
      <Icon name="arrowRight" size={size === "medium" ? 13 : 11} color={colors.onSign} strokeWidth={2.8} />
      <Text style={[styles.signText, size === "medium" && styles.signTextMedium]}>{headsign}</Text>
    </View>
  );
}

export type FareKind = "verified" | "estimated" | "partial" | "unknown";

/** Fare reliability label: icon plus words, coloured green, orange, red or gray. */
export function FareTag({ kind, label, pill = false }: { kind: FareKind; label: string; pill?: boolean }) {
  const map: Record<FareKind, { icon: IconName; fg: string; bg: string }> = {
    verified: { icon: "check", fg: colors.success, bg: colors.successSurface },
    estimated: { icon: "estimate", fg: colors.warning, bg: colors.warningSurface },
    partial: { icon: "problem", fg: colors.danger, bg: colors.dangerSurface },
    unknown: { icon: "question", fg: colors.textMuted, bg: colors.fill },
  };
  const m = map[kind];
  return (
    <View style={[styles.fareTag, pill && [styles.fareTagPill, { backgroundColor: m.bg }]]}>
      <Icon name={m.icon} size={12} color={m.fg} strokeWidth={kind === "verified" ? 3 : 2.6} />
      <Text style={[text.footnote, styles.semibold, { color: m.fg }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, wrap = true, style }: { children: ReactNode; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.inlineRow, wrap && styles.wrap, style]}>{children}</View>;
}

// ---- Type scale ----

export const text = StyleSheet.create({
  largeTitle: { fontSize: type.largeTitle, lineHeight: lineHeight.largeTitle, fontWeight: "700", letterSpacing: -0.8, color: colors.text },
  title: { fontSize: type.title, lineHeight: lineHeight.title, fontWeight: "700", letterSpacing: -0.4, color: colors.text },
  headline: { fontSize: type.body, lineHeight: lineHeight.body, fontWeight: "600", color: colors.text },
  body: { fontSize: type.body, lineHeight: lineHeight.body, color: colors.text },
  subhead: { fontSize: type.small, lineHeight: lineHeight.small, color: colors.text },
  subheadStrong: { fontSize: type.small, lineHeight: lineHeight.small, fontWeight: "600", color: colors.text },
  footnote: { fontSize: type.caption, lineHeight: lineHeight.caption, color: colors.textMuted },
  footnoteDark: { fontSize: type.caption, lineHeight: lineHeight.caption, color: colors.text },
  caption2: { fontSize: type.tiny, lineHeight: lineHeight.tiny, color: colors.textTertiary },
  muted: { color: colors.textMuted },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  semibold: { fontWeight: "600" },
  tintText: { color: colors.primary },
  wrap: { flexWrap: "wrap" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconNote: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  iconNoteIcon: { marginTop: 2 },
  card: { borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: spacing.md, gap: spacing.sm },
  groupHeader: {
    marginHorizontal: spacing.lg,
    marginBottom: 7,
    fontSize: type.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
  groupHeaderPlain: { marginHorizontal: 0, marginBottom: 2, fontWeight: "600" },
  group: { borderRadius: radius.md, overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth },
  groupFooter: { marginHorizontal: spacing.lg, marginTop: 7, fontSize: type.caption, lineHeight: lineHeight.caption, color: colors.textMuted },
  groupFooterBox: { marginHorizontal: spacing.lg, marginTop: 7, gap: 6 },
  groupFooterInline: { fontSize: type.caption, lineHeight: lineHeight.caption, color: colors.textMuted },
  tile: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowPressed: { backgroundColor: "rgba(0,0,0,0.06)" },
  rowLeading: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 1, minWidth: 0 },
  rowDetail: { textAlign: "right", flexShrink: 1 },
  checkSlot: { width: 20, alignItems: "center" },
  button: {
    minHeight: 50,
    minWidth: minTouch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.field,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonPrimaryPressed: { backgroundColor: colors.primaryPressed },
  buttonGray: { backgroundColor: colors.fill },
  buttonLink: { minHeight: minTouch, paddingVertical: spacing.sm },
  buttonPressed: { opacity: 0.6 },
  buttonDisabled: { backgroundColor: colors.disabledSurface },
  buttonText: { fontSize: type.body, lineHeight: lineHeight.body, fontWeight: "600", textAlign: "center", flexShrink: 1 },
  buttonTextLink: { fontWeight: "400" },
  buttonIcon: { marginRight: spacing.sm },
  buttonTrailing: { marginLeft: 10 },
  spinner: { marginRight: spacing.sm },
  mapButton: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
  },
  closeTarget: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center", marginRight: -spacing.sm },
  closeCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", gap: 10, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: spacing.md },
  noticeIcon: { marginTop: 1 },
  noticeBody: { flex: 1, gap: 6 },
  noticeTitle: { fontSize: type.small, lineHeight: lineHeight.small, fontWeight: "600" },
  noticeActions: { gap: spacing.sm, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingLeft: 6,
    paddingRight: spacing.sm,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: type.caption, lineHeight: lineHeight.caption, fontWeight: "600" },
  statusText: { flexDirection: "row", alignItems: "center", gap: 4 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#E5E5EA", overflow: "hidden" },
  progressIndeterminate: { minHeight: 24, alignItems: "flex-start", justifyContent: "center" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 2 },
  switchTrack: { width: 51, height: 31, borderRadius: 16, padding: 2, flexDirection: "row" },
  switchThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)" },
  switchDisabled: { opacity: 0.6 },
  segmentTrack: { flexDirection: "row", padding: 2, backgroundColor: colors.fill, borderRadius: 9 },
  segment: { flex: 1, minHeight: 34, borderRadius: 7, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 6 },
  segmentSelected: { backgroundColor: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)" },
  segmentText: { fontSize: type.small, lineHeight: lineHeight.small, color: colors.text },
  stepper: { flexDirection: "row", alignItems: "center", minHeight: 36, backgroundColor: colors.fill, borderRadius: 9 },
  stepperButton: { width: 50, minHeight: minTouch, alignItems: "center", justifyContent: "center" },
  stepperDivider: { width: 1, height: 18, backgroundColor: colors.grabber },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: minTouch,
    minWidth: minTouch,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.selectedSurface },
  chipTextSelected: { fontWeight: "600", color: colors.primaryPressed },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  field: { gap: spacing.xs },
  label: { fontSize: type.small, lineHeight: lineHeight.small, fontWeight: "600", color: colors.text },
  tag: { fontSize: type.caption, fontWeight: "400", color: colors.textMuted },
  input: {
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: type.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 120 },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  errorText: { fontSize: type.caption, lineHeight: lineHeight.caption, color: colors.danger, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", minHeight: minTouch, borderRadius: radius.field, paddingLeft: spacing.md, paddingRight: spacing.sm },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, minHeight: 44, fontSize: type.body, color: colors.text, paddingVertical: 10 },
  searchError: { marginTop: 6, marginHorizontal: spacing.xs },
  clearButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  clearCircle: { width: 17, height: 17, borderRadius: 9, backgroundColor: "#8E8E93", alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: "#FFFFFF" },
  badgeTextSmall: { fontSize: type.caption, lineHeight: lineHeight.caption },
  walkBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  sign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.sign,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
  },
  signMedium: { paddingHorizontal: spacing.sm, paddingVertical: 3, gap: 5 },
  signText: { fontSize: type.caption, lineHeight: lineHeight.caption, fontWeight: "600", color: colors.onSign, flexShrink: 1 },
  signTextMedium: { fontSize: 14, lineHeight: 18 },
  fareTag: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start" },
  fareTagPill: { borderRadius: radius.pill, paddingLeft: 6, paddingRight: spacing.sm, paddingVertical: 2, gap: 4 },
});
