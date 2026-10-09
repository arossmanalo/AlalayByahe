import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { ApplicationServices } from "./services";
import { createNativeApplication } from "./native-services";

interface ApplicationContextValue {
  services: ApplicationServices;
  status: { data: string; ai: string; initializing: boolean };
}
const ApplicationContext = createContext<ApplicationContextValue | null>(null);
// One app-owned manager/repository, constructed outside React render. Native
// database initialization and model loading still run only from the effect.
const application = createNativeApplication();

export function ApplicationProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState({
    data: "Checking stored transit data…", ai: "Checking local AI…", initializing: true,
  });
  useEffect(() => {
    let alive = true;
    void application.initialize().then(result => {
      if (alive) setStatus({
        data: result.data.ok ? "Transit pack ready" : result.data.error.message,
        ai: result.ai.ok ? "Local AI ready" : result.ai.error.message,
        initializing: false,
      });
    }).catch(() => {
      if (alive) setStatus({ data: "Storage is unavailable.", ai: "AI is unavailable.", initializing: false });
    });
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") void application.controller.cancelActive().catch(() => undefined);
    });
    return () => {
      alive = false; subscription.remove();
      void application.close().catch(() => undefined);
    };
  }, [application]);
  return <ApplicationContext.Provider value={{ services: application, status }}>{children}</ApplicationContext.Provider>;
}
export function useApplication(): ApplicationContextValue {
  const context = useContext(ApplicationContext);
  if (!context) throw new Error("ApplicationProvider is missing.");
  return context;
}
