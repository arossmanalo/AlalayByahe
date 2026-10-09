import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApplicationProvider } from "../src/application/react-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ApplicationProvider>
        <Stack screenOptions={{ headerTitle: "AlalayByahe" }} />
      </ApplicationProvider>
    </SafeAreaProvider>
  );
}

