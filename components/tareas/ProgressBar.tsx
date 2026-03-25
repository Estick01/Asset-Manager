import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  total: number;
  completadas: number;
  porcentaje: number;
}

export function ProgressBar({ total, completadas, porcentaje }: Props) {
  const color =
    porcentaje === 100 ? Colors.success :
    porcentaje >= 60   ? Colors.info :
    porcentaje >= 30   ? Colors.warning : Colors.textTertiary;

  const restantes = total - completadas;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.label}>Progreso del caso</Text>
          <Text style={styles.sub}>
            {completadas}/{total} completadas
            {restantes > 0 ? ` · ${restantes} pendiente${restantes > 1 ? "s" : ""}` : ""}
          </Text>
        </View>
        <View style={[styles.pctRing, { borderColor: color }]}>
          <Text style={[styles.pct, { color }]}>{porcentaje}%</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${porcentaje}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerLeft: { flex: 1, gap: 3 },
  label: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  sub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  pctRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  pct: { fontSize: 13, fontFamily: "Inter_700Bold" },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  fill: {
    height: 10,
    borderRadius: 5,
  },
});
