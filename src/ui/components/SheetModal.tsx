// Modal sheet over a dimmed screen, after the UI kit's "Choose a place" and "Preferences" sheets:
// grabber, Cancel / title / Done bar, gray grouped background.
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type } from "../theme";
import { SurfaceProvider } from "./primitives";

export function SheetModal({
  visible,
  title,
  cancelLabel,
  onCancel,
  doneLabel,
  onDone,
  children,
  header,
}: {
  visible: boolean;
  title: string;
  cancelLabel: string;
  onCancel: () => void;
  doneLabel?: string;
  onDone?: () => void;
  children: ReactNode;
  /** Fixed content under the bar, such as a search field. */
  header?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { marginTop: insets.top + spacing.md }]} accessibilityViewIsModal>
          <View style={styles.grabber} importantForAccessibility="no" accessibilityElementsHidden />
          <View style={styles.bar}>
            <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} hitSlop={4} style={[styles.barButton, styles.barStart]}>
              <Text style={styles.barText}>{cancelLabel}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.barTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={[styles.barButton, styles.barEnd]}>
              {doneLabel && onDone ? (
                <Pressable accessibilityRole="button" accessibilityLabel={doneLabel} onPress={onDone} hitSlop={4} style={styles.barButtonInner}>
                  <Text style={[styles.barText, styles.done]}>{doneLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <SurfaceProvider surface="grouped">
            {header ? <View style={styles.header}>{header}</View> : null}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]}
            >
              {children}
            </ScrollView>
          </SurfaceProvider>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber, marginTop: 6 },
  bar: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: spacing.sm },
  barButton: { flex: 1, minHeight: 48, justifyContent: "center" },
  barStart: { alignItems: "flex-start", paddingHorizontal: spacing.sm },
  barEnd: { alignItems: "flex-end" },
  barButtonInner: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.sm },
  barText: { fontSize: type.body, color: colors.primary },
  done: { fontWeight: "600" },
  barTitle: { flexShrink: 1, maxWidth: "50%", textAlign: "center", fontSize: type.body, lineHeight: 22, fontWeight: "600", color: colors.text },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 10 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: 22 },
});
