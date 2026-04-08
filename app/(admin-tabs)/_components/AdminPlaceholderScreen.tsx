import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";

interface AdminPlaceholderScreenProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

export function AdminPlaceholderScreen({
  title,
  icon,
  description,
}: AdminPlaceholderScreenProps) {
  return (
    <AdminShell title={title}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={26} color="#2563EB" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.notice}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <Text style={styles.noticeText}>Sección en preparación.</Text>
        </View>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
    gap: 12,
    maxWidth: 720,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "#475569",
  },
  notice: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
  },
});

export default AdminPlaceholderScreen;
