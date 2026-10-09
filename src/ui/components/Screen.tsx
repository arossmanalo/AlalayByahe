// Member 3 (UI-001): scrollable, safe-area-aware screen body.
// The native stack header comes from Member 4's app/_layout.tsx; screens only set their title.
import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReadiness, useUi } from "../services";
import { colors, spacing, toneColors, toneGlyph, type } from "../theme";

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + spacing.xxl,
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        <FixtureBanners />
        {children}
      </ScrollView>
    </View>
  );
}

/** Shown on every screen whenever fixture services or a test_fixture pack are wired in. */
function FixtureBanners() {
  const { services, t } = useUi();
  const { pack } = useReadiness();
  const fixturePack = pack.status === "loaded" && pack.result.ok && pack.result.value.kind === "test_fixture";
  if (services.kind !== "dev_fixture" && !fixturePack) return null;
  const c = toneColors.fixture;
  return (
    <View
      accessible
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={[styles.bannerTitle, { color: c.fg }]}>
        {toneGlyph.fixture} {t.devFixtureTitle}
      </Text>
      <Text style={styles.bannerBody}>{services.kind === "dev_fixture" ? t.devFixtureBody : t.testPackWarning}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: spacing.lg, gap: spacing.lg },
  banner: { borderWidth: 2, borderStyle: "dashed", borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  bannerTitle: { fontSize: type.body, fontWeight: "800", letterSpacing: 1 },
  bannerBody: { fontSize: type.small, color: colors.text },
});
