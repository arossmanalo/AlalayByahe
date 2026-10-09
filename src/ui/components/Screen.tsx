// Member 3 (UI-001): scrollable, safe-area-aware screen body.
// The native stack header comes from Member 4's app/_layout.tsx; screens only set their title.
import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { testDataBanner } from "../banner-logic";
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
        // Number pads have no return key on iOS; scrolling closes the keyboard so the buttons stay reachable.
        keyboardDismissMode="on-drag"
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
  const banner = testDataBanner(
    services.kind,
    pack.status === "loaded" && pack.result.ok ? pack.result.value.kind : null,
    services.hideTestPackBanner,
  );
  if (!banner) return null;
  const c = toneColors.fixture;
  const body = banner === "dev_fixture" ? t.devFixtureBody : t.testPackWarning;
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${t.devFixtureTitle}. ${body}`}
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={[styles.bannerTitle, { color: c.fg }]}>
        {toneGlyph.fixture} {t.devFixtureTitle}
      </Text>
      <Text style={styles.bannerBody}>{body}</Text>
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
