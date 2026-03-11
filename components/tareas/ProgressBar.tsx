import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  total: number;
  completadas: number;
  porcentaje: number;
}

export function ProgressBar({ total, completadas, porcentaje }: Props) {
  const color =
    porcentaje === 100 ? "#22C55E" :
    porcentaje >= 60   ? "#3B82F6" :
    porcentaje >= 30   ? "#F59E0B" : "#6B7280";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Progreso del caso</Text>
        <Text style={[styles.pct, { color }]}>{porcentaje}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${porcentaje}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.sub}>
        {completadas} de {total} tareas completadas
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1F2937" },
  pct:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" },
});
