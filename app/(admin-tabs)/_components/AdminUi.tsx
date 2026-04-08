import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StatCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "amber" | "slate" | "red";
}) {
  const toneStyles = tones[tone];
  return (
    <View style={[styles.statCard, { borderLeftColor: toneStyles.border }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "blue" | "green" | "amber" | "slate" | "red";
}) {
  const toneStyles = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyles.soft }]}>
      <Text style={[styles.badgeText, { color: toneStyles.text }]}>{label}</Text>
    </View>
  );
}

export function TableHeader({ columns }: { columns: { label: string; flex?: number }[] }) {
  return (
    <View style={styles.tableHeader}>
      {columns.map((column) => (
        <Text key={column.label} style={[styles.tableHeaderText, { flex: column.flex ?? 1 }]}>
          {column.label}
        </Text>
      ))}
    </View>
  );
}

export function EmptyState({
  label,
  icon = "folder-open-outline",
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "muted" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "primary" && styles.actionPrimary,
        tone === "muted" && styles.actionMuted,
        tone === "danger" && styles.actionDanger,
        pressed && styles.actionPressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          tone === "muted" && styles.actionMutedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const tones = {
  blue: { border: "#2563EB", soft: "#DBEAFE", text: "#1D4ED8" },
  green: { border: "#16A34A", soft: "#DCFCE7", text: "#15803D" },
  amber: { border: "#D97706", soft: "#FEF3C7", text: "#B45309" },
  red: { border: "#DC2626", soft: "#FEE2E2", text: "#B91C1C" },
  slate: { border: "#64748B", soft: "#E2E8F0", text: "#475569" },
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tableHeader: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableHeaderText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
  },
  actionButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionPrimary: {
    backgroundColor: "#2563EB",
  },
  actionMuted: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  actionDanger: {
    backgroundColor: "#DC2626",
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  actionMutedText: {
    color: "#334155",
  },
});
