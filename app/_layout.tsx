import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApplicationProvider } from "../src/application/react-context";
import { NativeUiBridge } from "../src/application/ui-bridge";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ApplicationProvider>
        <NativeUiBridge>
          <Stack screenOptions={{ headerTitle: "AlalayByahe" }} />
        </NativeUiBridge>
      </ApplicationProvider>
    </SafeAreaProvider>
  );
}
