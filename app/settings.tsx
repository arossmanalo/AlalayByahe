// Member 3 (UI-001): Settings (design artboard "Settings"): language, local AI, transit data and coverage,
// online helpers, location, how it works, fare labels and the product disclosures that were on About.
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon, Icon } from "../src/ui/components/icons";
import { GroupFooterText, IconTile, ListGroup, ListRow, StatusText, text } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import { SheetModal } from "../src/ui/components/SheetModal";
import { formatDate } from "../src/ui/format";
import type { UiLanguage } from "../src/ui/i18n";
import { CoverageGroup, formatBytes, modelTone, networkLabel, OnlineHelpersGroup, useLoadedPack } from "../src/ui/readiness";
import { useReadiness, useUi } from "../src/ui/services";
import { colors, spacing, tileColors } from "../src/ui/theme";
import { mapPicturesAvailable } from "../src/ui/trip-map";

const LANGUAGES: UiLanguage[] = ["en", "fil"];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, services, language, setLanguage } = useUi();
  const { modelState } = useReadiness();
  const pack = useLoadedPack();
  const [languageOpen, setLanguageOpen] = useState(false);
  const manifest = services.modelManifest;
  const version = Constants.expoConfig?.version ?? null;

  return (
    <Screen title={t.settingsTitle} backLabel={t.mapBack}>
      <View style={styles.identity} accessible accessibilityLabel={`${t.appName}. ${version ? t.versionLine(version) : ""}`}>
        <AppIcon size={60} />
        <View style={styles.identityText}>
          <Text style={styles.appName}>{t.appName}</Text>
          {version ? <Text style={text.footnote}>{t.versionLine(version)}</Text> : null}
        </View>
      </View>

      <ListGroup>
        <ListRow
          leading={<IconTile icon="globe" color={tileColors.other} />}
          title={t.languageLabel}
          detail={t.languageNames[language]}
          accessory="chevron"
          accessibilityLabel={`${t.languageLabel}: ${t.languageNames[language]}`}
          onPress={() => setLanguageOpen(true)}
        />
      </ListGroup>

      <ListGroup
        header={t.aiLabel}
        footer={
          <>
            <GroupFooterText>{t.aiSettingsFooter}</GroupFooterText>
            {manifest ? <GroupFooterText>{t.modelDetails(manifest.id, manifest.revision, manifest.license)}</GroupFooterText> : null}
          </>
        }
      >
        <ListRow
          leading={<IconTile icon="chip" color={tileColors.ai} />}
          title={t.statusLabel}
          detail={<StatusText tone={modelTone(modelState)} label={t.aiPhase[modelState.phase]} />}
          accessibilityLabel={`${t.aiLabel}: ${t.aiPhase[modelState.phase]}`}
        />
        {manifest ? <ListRow leading={<View style={styles.tileSpace} />} title={t.modelLabel} detail={<Text style={[text.subhead, text.muted]}>{manifest.id}</Text>} /> : null}
        {manifest ? <ListRow leading={<View style={styles.tileSpace} />} title={t.sizeLabel} detail={formatBytes(manifest.bytes)} /> : null}
        {modelState.phase !== "ready" ? (
          <ListRow leading={<View style={styles.tileSpace} />} title={t.setUpAi} tinted accessory="chevron" onPress={() => router.push("/setup")} />
        ) : null}
      </ListGroup>

      <ListGroup
        header={t.dataSection}
        footer={pack?.kind === "test_fixture" ? t.testPackWarning : t.aboutCoverageNote}
      >
        <ListRow
          leading={<IconTile icon="lrt" color={tileColors.transit} />}
          title={t.coverageLabel}
          detail={pack ? networkLabel(pack, t) : t.dataNotReady}
        />
        {pack ? <ListRow leading={<View style={styles.tileSpace} />} title={t.versionLabel} detail={<Text style={[text.subhead, text.muted]}>{pack.version}</Text>} /> : null}
        {pack ? <ListRow leading={<View style={styles.tileSpace} />} title={t.createdLabel} detail={formatDate(pack.createdAt)} /> : null}
      </ListGroup>

      <CoverageGroup labels={pack?.coverageLabels ?? []} pack={pack} />

      <OnlineHelpersGroup mapPicturesAvailable={mapPicturesAvailable} />

      <ListGroup header={t.locationSection} footer={t.locationFooter}>
        <ListRow leading={<IconTile icon="locate" color={tileColors.location} iconSize={16} />} title={t.locationRow} detail={t.locationValue} />
      </ListGroup>

      <ListGroup header={t.howItWorks} footer={t.aboutTracking}>
        {t.howSteps.map((step, i) => (
          <ListRow
            key={step}
            leading={
              <View style={styles.number}>
                <Text style={[text.footnoteDark, styles.semibold]}>{i + 1}</Text>
              </View>
            }
            title={<Text style={text.subhead}>{step}</Text>}
          />
        ))}
      </ListGroup>

      <ListGroup
        header={t.fareLabelsSection}
        footer={
          <>
            <GroupFooterText>{t.fareLabelsFooter}</GroupFooterText>
            <GroupFooterText>{t.aboutFares}</GroupFooterText>
          </>
        }
      >
        {(["verified", "estimated", "unknown"] as const).map((r) => (
          <ListRow
            key={r}
            accessibilityLabel={`${t.fareTitle[r]}: ${t.fareDefinition[r]}`}
            leading={
              <View style={styles.fareKey}>
                <Icon
                  name={r === "verified" ? "check" : r === "estimated" ? "estimate" : "question"}
                  size={14}
                  color={r === "verified" ? colors.success : r === "estimated" ? colors.warning : colors.textMuted}
                  strokeWidth={2.6}
                />
                <Text style={[text.subhead, styles.semibold, { color: r === "verified" ? colors.success : r === "estimated" ? colors.warning : colors.textMuted }]}>
                  {t.fareTitle[r]}
                </Text>
              </View>
            }
            title={<Text style={text.subhead}>{t.fareDefinition[r]}</Text>}
          />
        ))}
      </ListGroup>

      <ListGroup header={t.aboutTitle}>
        {[t.aboutWhat, t.aboutAi, t.aboutRoutes, t.aboutOffline, t.aboutPrivacy].map((line) => (
          <ListRow key={line} title={<Text style={text.subhead}>{line}</Text>} />
        ))}
      </ListGroup>

      <SheetModal visible={languageOpen} title={t.languageLabel} cancelLabel={t.close} onCancel={() => setLanguageOpen(false)}>
        <ListGroup accessibilityRole="radiogroup" accessibilityLabel={t.languageLabel}>
          {LANGUAGES.map((lang) => (
            <ListRow
              key={lang}
              role="radio"
              title={t.languageNames[lang]}
              selected={language === lang}
              accessory="check"
              onPress={() => {
                setLanguage(lang);
                setLanguageOpen(false);
              }}
            />
          ))}
        </ListGroup>
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  semibold: { fontWeight: "600" },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: 10 },
  identityText: { flex: 1, gap: 2 },
  appName: { fontSize: 20, lineHeight: 25, fontWeight: "600", color: colors.text },
  tileSpace: { width: 30 },
  number: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  fareKey: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 96 },
});
