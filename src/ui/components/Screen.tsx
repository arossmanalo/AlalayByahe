// Member 3 (UI-001): screen chrome, after the AlalayByahe UI kit. Every screen renders through <Screen> so the
// test-data banner is drawn on every screen (tests/ui/demo-pack-ui.test.ts).
// layout "page": large-title grouped page with a back button (Get ready, Settings).
// layout "map": schematic map on top and a bottom sheet over it (Home, Check your trip, Route options, Steps).
// layout "bare": full-bleed content (Welcome).
// The native stack header is hidden; each layout draws its own navigation.
import { Stack, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { testDataBanner } from "../banner-logic";
import { useReadiness, useUi } from "../services";
import { colors, mapColors, radius, spacing, toneColors, type } from "../theme";
import { Icon } from "./icons";
import { LargeTitle, SurfaceProvider, text, type Surface } from "./primitives";

/** How far the map runs under the rounded top of the sheet. */
export const SHEET_OVERLAP = 36;

/** Sheet top for a design ratio (measured on an 844 pt screen), kept usable on short screens. */
export function sheetTopFor(windowHeight: number, ratio: number, min = 200): number {
  return Math.max(min, Math.round(windowHeight * ratio));
}

type ScreenProps =
  | {
      layout?: "page";
      title: string;
      children: ReactNode;
      /** Label beside the back chevron, normally the previous screen's title. */
      backLabel?: string;
      onBack?: () => void;
    }
  | {
      layout: "map";
      title: string;
      children: ReactNode;
      /** Map drawn behind the sheet; receives its size. */
      renderMap: (size: { width: number; height: number; fitTop: number; fitBottom: number }) => ReactNode;
      /** Design ratio of the sheet top to the screen height. */
      sheetRatio: number;
      /** "plain": white sheet with gray groups. "grouped": gray sheet with white groups. */
      sheet?: Surface;
      /** Floating controls over the map (back, settings). */
      floatingLeft?: ReactNode;
      floatingRight?: ReactNode;
      /** Absolutely positioned layer over everything, such as the near-stop alert. */
      overlay?: ReactNode;
    }
  | { layout: "bare"; title: string; children: ReactNode };

export function Screen(props: ScreenProps) {
  if (props.layout === "map") return <MapLayout {...props} />;
  if (props.layout === "bare") return <BareLayout {...props} />;
  return <PageLayout {...props} />;
}

function PageLayout({ title, children, backLabel, onBack }: Extract<ScreenProps, { layout?: "page" }>) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useUi();
  const back = onBack ?? (router.canGoBack() ? () => router.back() : null);
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        // Number pads have no return key on iOS; scrolling closes the keyboard so the buttons stay reachable.
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.pageContent,
          {
            paddingTop: insets.top + (back ? 0 : spacing.lg),
            paddingBottom: insets.bottom + 34,
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel ?? t.back}
            onPress={back}
            hitSlop={4}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Icon name="chevronLeft" size={22} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.backText}>{backLabel ?? t.back}</Text>
          </Pressable>
        ) : null}
        <LargeTitle>{title}</LargeTitle>
        <SurfaceProvider surface="grouped">
          <FixtureBanners />
          {children}
        </SurfaceProvider>
      </ScrollView>
    </View>
  );
}

function MapLayout({
  title,
  children,
  renderMap,
  sheetRatio,
  sheet = "plain",
  floatingLeft,
  floatingRight,
  overlay,
}: Extract<ScreenProps, { layout: "map" }>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sheetTop = sheetTopFor(height, sheetRatio);
  const mapHeight = sheetTop + SHEET_OVERLAP;
  const sheetBg = sheet === "plain" ? colors.surface : colors.background;
  return (
    <View style={styles.mapRoot}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.mapScroll}
      >
        <View style={{ height: mapHeight }}>
          {renderMap({ width, height: mapHeight, fitTop: insets.top + 64, fitBottom: sheetTop - 30 })}
          {floatingLeft ? <View style={[styles.floating, { top: insets.top + spacing.sm, left: insets.left + spacing.md }]}>{floatingLeft}</View> : null}
          {floatingRight ? <View style={[styles.floating, { top: insets.top + spacing.sm, right: insets.right + spacing.md }]}>{floatingRight}</View> : null}
        </View>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              minHeight: height - sheetTop,
              paddingBottom: insets.bottom + 34,
              paddingLeft: insets.left + spacing.lg,
              paddingRight: insets.right + spacing.lg,
            },
          ]}
        >
          <View style={styles.grabber} importantForAccessibility="no" accessibilityElementsHidden />
          <SurfaceProvider surface={sheet}>
            <FixtureBanners />
            {children}
          </SurfaceProvider>
        </View>
      </ScrollView>
      {overlay ? <View style={[styles.overlay, { top: insets.top + spacing.sm, left: insets.left + 10, right: insets.right + 10 }]}>{overlay}</View> : null}
    </View>
  );
}

function BareLayout({ title, children }: Extract<ScreenProps, { layout: "bare" }>) {
  return (
    <View style={styles.bare}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <SurfaceProvider surface="plain">{children}</SurfaceProvider>
    </View>
  );
}

/** Shown on every screen whenever fixture services or a test_fixture pack are wired in. */
export function FixtureBanners() {
  const { services, t } = useUi();
  const { pack } = useReadiness();
  const banner = testDataBanner(
    services.kind,
    pack.status === "loaded" && pack.result.ok ? pack.result.value.kind : null,
    services.hideTestPackBanner,
  );
  if (!banner) return null;
  const c = banner === "dev_fixture" ? toneColors.fixture : toneColors.warning;
  const title = banner === "dev_fixture" ? t.devFixtureTitle : t.testDataTitle;
  const body = banner === "dev_fixture" ? t.devFixtureBody : t.testPackWarning;
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title} ${body}`}
      style={[styles.banner, { backgroundColor: c.bg }]}
    >
      <Icon name="warning" size={20} color={c.fg} strokeWidth={2.1} style={styles.bannerIcon} />
      <Text style={[text.subhead, styles.flex]}>
        <Text style={[styles.bannerTitle, { color: c.fg }]}>{title}</Text> {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { gap: spacing.xl },
  backButton: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 48, alignSelf: "flex-start", marginLeft: -spacing.sm, marginBottom: -spacing.md, paddingRight: spacing.sm },
  backText: { fontSize: type.body, color: colors.primary },
  mapRoot: { flex: 1, backgroundColor: mapColors.land },
  mapScroll: { flexGrow: 1 },
  floating: { position: "absolute", gap: spacing.sm },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 6,
    gap: 14,
    boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -6px 24px rgba(0,0,0,0.10)",
  },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber, marginBottom: -2 },
  overlay: { position: "absolute" },
  bare: { flex: 1, backgroundColor: colors.surface },
  banner: { flexDirection: "row", gap: 10, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: spacing.md },
  bannerIcon: { marginTop: 1 },
  bannerTitle: { fontWeight: "700" },
});
