import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface UsoData {
  procesosUsados: number;
  procesosMax: number;
  clientesUsados: number;
  clientesMax: number;
  storageUsadoMb: number;
  storageMaxMb: number;
}

interface UsageBarsProps {
  uso: UsoData;
  planNombre?: string;
  onUpgrade?: () => void;
}

interface RecursoBarProps {
  label: string;
  usado: number;
  maximo: number;
  formatValor?: (v: number) => string;
  formatMax?: (v: number) => string;
}

function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

function getBarColor(porcentaje: number): string {
  if (porcentaje > 80) return Colors.danger;
  if (porcentaje >= 60) return Colors.warning;
  return Colors.success;
}

function RecursoBar({ label, usado, maximo, formatValor, formatMax }: RecursoBarProps) {
  if (maximo === -1) {
    return (
      <View style={styles.recursoRow}>
        <Text style={styles.recursoLabel}>{label}</Text>
        <View style={styles.ilimitadoRow}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.ilimitadoText}>Ilimitado</Text>
        </View>
      </View>
    );
  }

  if (maximo === 0) {
    return (
      <View style={styles.recursoRow}>
        <Text style={styles.recursoLabel}>{label}</Text>
        <View style={styles.ilimitadoRow}>
          <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          <Text style={styles.noIncluidoText}>No incluido</Text>
        </View>
      </View>
    );
  }

  const porcentaje = Math.min((usado / maximo) * 100, 100);
  const barColor = getBarColor(porcentaje);
  const valorTexto = formatValor ? formatValor(usado) : String(usado);
  const maxTexto = formatMax ? formatMax(maximo) : String(maximo);

  return (
    <View style={styles.recursoRow}>
      <View style={styles.recursoHeader}>
        <Text style={styles.recursoLabel}>{label}</Text>
        <Text style={[styles.recursoContador, { color: barColor }]}>
          {valorTexto} / {maxTexto}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${porcentaje}%` as `${number}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

export function UsageBars({ uso, planNombre, onUpgrade }: UsageBarsProps) {
  const mostrarBotonUpgrade =
    onUpgrade !== undefined &&
    (uso.procesosMax !== -1 &&
      uso.procesosMax > 0 &&
      (uso.procesosUsados / uso.procesosMax) * 100 > 80 ||
      uso.clientesMax !== -1 &&
      uso.clientesMax > 0 &&
      (uso.clientesUsados / uso.clientesMax) * 100 > 80 ||
      uso.storageMaxMb > 0 &&
      (uso.storageUsadoMb / uso.storageMaxMb) * 100 > 80);

  return (
    <View style={styles.container}>
      {planNombre !== undefined && (
        <Text style={styles.planNombre}>{planNombre}</Text>
      )}

      <RecursoBar
        label="Procesos"
        usado={uso.procesosUsados}
        maximo={uso.procesosMax}
      />

      <RecursoBar
        label="Clientes"
        usado={uso.clientesUsados}
        maximo={uso.clientesMax}
      />

      <RecursoBar
        label="Almacenamiento"
        usado={uso.storageUsadoMb}
        maximo={uso.storageMaxMb}
        formatValor={formatStorage}
        formatMax={formatStorage}
      />

      {mostrarBotonUpgrade && (
        <Pressable
          style={({ pressed }) => [
            styles.upgradeButton,
            pressed && styles.upgradeButtonPressed,
          ]}
          onPress={onUpgrade}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.upgradeButtonText}>Mejorar plan</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  planNombre: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  recursoRow: {
    gap: 6,
  },
  recursoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recursoLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  recursoContador: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  ilimitadoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ilimitadoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
  noIncluidoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 4,
  },
  upgradeButtonPressed: {
    opacity: 0.85,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
