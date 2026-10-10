// Member 3 (UI-004): Get ready (design artboard "Get ready"): language, model download and verification,
// transit data and the online helpers as they really are in this build.
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { AppButton, ListGroup, SegmentedControl, Small } from "../src/ui/components/primitives";
import { Screen } from "../src/ui/components/Screen";
import type { UiLanguage } from "../src/ui/i18n";
import { LocalAiGroup, OnlineHelpersGroup, TransitDataGroup } from "../src/ui/readiness";
import { useJourneySession, useUi } from "../src/ui/services";
import { mapPicturesAvailable } from "../src/ui/trip-map";

const LANGUAGES: UiLanguage[] = ["en", "fil"];

export default function SetupScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { t, language, setLanguage, dismissWelcome } = useUi();
  const { startManual } = useJourneySession();
  const fromWelcome = from === "welcome";

  const onManual = () => {
    if (fromWelcome) dismissWelcome();
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };

  const onContinue = () => {
    if (fromWelcome) dismissWelcome();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <Screen title={t.setupTitle} backLabel={fromWelcome ? t.welcomeTitle : t.mapBack}>
      <Small style={{ marginTop: -16 }}>{t.setupIntro}</Small>

      <ListGroup header={t.languageLabel}>
        <View style={{ padding: 8 }}>
          <SegmentedControl
            label={t.languageLabel}
            options={LANGUAGES.map((lang) => ({ value: lang, label: t.languageNames[lang] }))}
            value={language}
            onChange={setLanguage}
          />
        </View>
      </ListGroup>

      <LocalAiGroup onManual={onManual} />
      <TransitDataGroup />
      <OnlineHelpersGroup mapPicturesAvailable={mapPicturesAvailable} />

      <AppButton label={t.continue} onPress={onContinue} />
    </Screen>
  );
}
