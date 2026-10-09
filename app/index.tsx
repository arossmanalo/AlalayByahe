// Temporary Member 4 bootstrap screen. Member 3 replaces this file with the
// agreed commute UI; keep useApplication() as the integration boundary.
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useApplication } from "../src/application/react-context";

export default function FoundationScreen() {
  const { status } = useApplication();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>AlalayByahe</Text>
      <Text style={styles.subtitle}>Integration foundation</Text>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Local AI</Text>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{status.ai}</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Transit data</Text>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{status.data}</Text>
      </View>
      <Text style={styles.body}>This build checks native integration. Journey planning will become available after the AI, verified data, routing and commute screens are connected.</Text>
      <Text style={styles.note}>No verified corridor or working phone-local inference is claimed by this foundation build.</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: "#f3f6f5" },
  title: { fontSize: 32, fontWeight: "700", color: "#123e34" },
  subtitle: { fontSize: 17, color: "#36544b" },
  card: { padding: 20, gap: 8, borderRadius: 16, backgroundColor: "#ffffff" },
  heading: { fontSize: 20, fontWeight: "600", color: "#123e34" },
  body: { fontSize: 16, lineHeight: 25, color: "#233c34" },
  note: { fontSize: 14, lineHeight: 22, color: "#50675e" },
});

