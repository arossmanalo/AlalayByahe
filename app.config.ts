import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AlalayByahe",
  slug: "alalaybyahe",
  version: "0.1.0",
  scheme: "alalaybyahe",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["android", "ios"],
  updates: { enabled: false },
  android: {
    package: "ph.alalaybyahe.app",
    allowBackup: false,
    // Foreground location only (optional stop alert) and vibration. No background location.
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "VIBRATE"],
  },
  ios: {
    bundleIdentifier: "ph.alalaybyahe.app",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Use your location to choose a starting point when you request it.",
    },
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    ["expo-location", {
      locationWhenInUsePermission:
        "Use your location only while the app is open, to remind you when you are near your stop.",
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
      isIosBackgroundLocationEnabled: false,
    }],
    ["expo-build-properties", {
      android: { compileSdkVersion: 36, targetSdkVersion: 36 },
      ios: { deploymentTarget: "16.4" },
    }],
    ["llama.rn", {
      enableEntitlements: false,
      enableOpenCLAndHexagon: false,
      forceCxx20: true,
    }],
  ],
};
export default config;
