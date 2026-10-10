// Welcome (design artboard "Welcome"): shown at launch until local AI is set up, once per app session.
// Illustration, logo lockup and "Get started", which opens Get ready.
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Icon, LogoMark } from "./components/icons";
import { AppButton, text } from "./components/primitives";
import { FixtureBanners } from "./components/Screen";
import { WELCOME_ILLUSTRATION, WELCOME_ILLUSTRATION_HEIGHT, WELCOME_ILLUSTRATION_WIDTH } from "./components/welcome-illustration";
import { useUi } from "./services";
import { colors, spacing } from "./theme";

export function Welcome({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  const { t } = useUi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artHeight = Math.round((width / WELCOME_ILLUSTRATION_WIDTH) * WELCOME_ILLUSTRATION_HEIGHT);
  return (
    <View style={styles.root}>
      <View style={styles.art} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
        <SvgXml xml={WELCOME_ILLUSTRATION} width={width} height={artHeight} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.settingsTitle}
        onPress={onSettings}
        hitSlop={4}
        style={({ pressed }) => [styles.settings, { top: insets.top + spacing.sm, right: insets.right + spacing.lg }, pressed && styles.pressed]}
      >
        <Icon name="gear" size={21} color={colors.primary} strokeWidth={1.9} />
      </Pressable>

      <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
        <LogoMark size={64} />
        <Text accessibilityRole="header" style={styles.wordmark}>
          Alalay<Text style={styles.wordmarkTint}>Byahe</Text>
        </Text>
        <Text style={styles.tagline}>{t.tagline}</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 34, paddingLeft: insets.left + spacing.xl, paddingRight: insets.right + spacing.xl }]}>
        <FixtureBanners />
        <AppButton label={t.getStarted} trailingIcon="arrowRight" onPress={onStart} style={styles.start} />
        <View style={styles.privacy}>
          <Icon name="lock" size={13} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={[text.footnote, styles.privacyText]}>{t.welcomePrivacy}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  art: { position: "absolute", left: 0, top: 0 },
  pressed: { opacity: 0.6 },
  settings: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.9)",
    zIndex: 1,
  },
  header: { alignItems: "center", paddingHorizontal: 60 },
  wordmark: { marginTop: 10, fontSize: 34, lineHeight: 41, fontWeight: "800", letterSpacing: -0.8, color: colors.text, textAlign: "center" },
  wordmarkTint: { color: colors.primary },
  tagline: { marginTop: 4, fontSize: 17, lineHeight: 22, color: colors.textTertiary, textAlign: "center" },
  bottom: { marginTop: "auto", gap: 14 },
  start: { minHeight: 56, borderRadius: 28, boxShadow: "0 8px 20px rgba(0,102,204,0.30)" },
  privacy: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  privacyText: { textAlign: "center", flexShrink: 1 },
});
