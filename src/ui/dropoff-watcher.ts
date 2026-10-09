// Member 2 + Member 3 (ALERT-003): adapts the routing module's createDropoffWatcher (a Result-returning
// function with nullable distances) to the UI's DropoffWatcherFactory shape. Pure; no React or native code.
import { createDropoffWatcher as createRoutingWatcher } from "../routing/dropoffProximity";
import type { DropoffWatcherFactory } from "./dropoff-alert";

/** Invalid options throw an Error; the card catches it and shows "Alerts are off", never a guessed alert. */
export const createDropoffWatcher: DropoffWatcherFactory = (options) => {
  const created = createRoutingWatcher(options);
  if (!created.ok) throw new Error(created.error.message);
  const watcher = created.value;
  return {
    update(fix) {
      const u = watcher.update(fix);
      return {
        state: u.state,
        distanceMeters: u.distanceMeters ?? Number.NaN,
        ...(u.event ? { event: u.event } : {}),
        ...(u.ignored ? { ignored: u.ignored } : {}),
      };
    },
  };
};
