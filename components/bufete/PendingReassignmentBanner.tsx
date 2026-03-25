// components/bufete/PendingReassignmentBanner.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

interface PendingReassignmentBannerProps {
  count: number;
  firmId: string;
}

export function PendingReassignmentBanner({ count, firmId }: PendingReassignmentBannerProps) {
  const router = useRouter();
  if (count === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {count} proceso(s) sin abogado asignado tras una salida reciente.
      </Text>
      <TouchableOpacity onPress={() => router.push(`/(firm-tabs)/cases?filter=sin_asignar` as any)}>
        <Text style={styles.action}>Ver procesos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text:   { flex: 1, color: "#92400E", fontSize: 13 },
  action: { color: "#D97706", fontWeight: "600", marginLeft: 8 },
});
