import { useEffect, useMemo, type PropsWithChildren } from "react";
import { createDropoffWatcher } from "../routing/dropoffProximity";
import { createExpoLocationWatch } from "../ui/expo-location-watch";
import { UiProvider, useReadiness, type UiServices } from "../ui/services";
import { APP_LIMITS, MODEL_MANIFEST } from "./config";
import { DEMO_BUILD } from "./demo-build";
import { useApplication } from "./react-context";

function SyncPackAfterBoot() {
  const { status } = useApplication();
  const { reloadPack } = useReadiness();
  useEffect(() => {
    if (!status.initializing) void reloadPack();
  }, [status.initializing, reloadPack]);
  return null;
}
export function NativeUiBridge({ children }: PropsWithChildren) {
  const { services } = useApplication();
  const ui = useMemo<UiServices>(() => ({
    kind: "real", hideTestPackBanner: DEMO_BUILD, controller: services.controller, ai: services.ai,
    repository: services.repository, modelManifest: MODEL_MANIFEST,
    onlineHelpersEnabled: APP_LIMITS.enableOnlineHelpers,
    cancelModelSetup: services.cancelModelSetup,
    summarizeTrip: services.summarizeTrip,
    // ALERT-003: foreground-only near-stop alert (docs/evidence/dropoff-alert-ui.md).
    location: createExpoLocationWatch(),
    createDropoffWatcher,
  }), [services]);
  return <UiProvider services={ui}>
    <SyncPackAfterBoot />
    {children}
  </UiProvider>;
}
