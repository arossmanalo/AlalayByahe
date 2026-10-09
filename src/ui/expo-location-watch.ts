// Member 3 (ALERT-003): expo-location adapter for the near-stop alert. Foreground only,
// balanced accuracy, about every 5 s. Fixes are handed to the caller in memory and are
// never logged, stored or sent. Member 4 passes this into UiServices.location.
import * as Location from "expo-location";
import type { LocationWatchPort, PermissionOutcome } from "./dropoff-alert";

export function createExpoLocationWatch(): LocationWatchPort {
  return {
    async requestPermission(): Promise<PermissionOutcome> {
      try {
        if (!(await Location.hasServicesEnabledAsync())) return "unavailable";
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === "granted" ? "granted" : "denied";
      } catch {
        return "unavailable";
      }
    },
    async watch(onFix, onError) {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5_000, distanceInterval: 10 },
        (position) =>
          onFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy ?? Number.POSITIVE_INFINITY,
            timestampMs: position.timestamp,
          }),
        () => onError(),
      );
      return { stop: () => subscription.remove() };
    },
  };
}
