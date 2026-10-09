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
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") return "denied";
        // Android 12+ lets the user share only approximate location, which is too coarse for this alert.
        return permission.android?.accuracy === "coarse" ? "approximate" : "granted";
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
