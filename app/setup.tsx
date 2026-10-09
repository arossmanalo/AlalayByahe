// Member 3 (UI-004): setup and status: model download/verification, data pack, offline boundary.
import { useRouter } from "expo-router";
import { Screen } from "../src/ui/components/Screen";
import { OfflineStatus } from "../src/ui/offline-status";
import { DataReadinessCard, ModelReadinessCard } from "../src/ui/readiness";
import { useJourneySession, useUi } from "../src/ui/services";

export default function SetupScreen() {
  const router = useRouter();
  const { t } = useUi();
  const { startManual } = useJourneySession();

  const onManual = () => {
    startManual();
    router.push({ pathname: "/confirm", params: { manual: "1" } });
  };

  return (
    <Screen title={t.setupTitle}>
      <ModelReadinessCard onManual={onManual} />
      <DataReadinessCard />
      <OfflineStatus />
    </Screen>
  );
}
