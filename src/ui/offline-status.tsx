// Member 3 (UI-004): explains the offline boundary. Connectivity is never presented as route proof.
import { Body, Card, Heading, Small } from "./components/primitives";
import { useUi } from "./services";

export function OfflineStatus() {
  const { t, services } = useUi();
  return (
    <Card>
      <Heading level={2}>{t.offlineSection}</Heading>
      <Body>{t.offlineBody}</Body>
      <Body>{services.onlineHelpersEnabled ? t.onlineHelpersOn : t.onlineHelpersOff}</Body>
      <Small>{t.connectivityNote}</Small>
    </Card>
  );
}
