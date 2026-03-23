/**
 * LegalStageStepper
 * Muestra el progreso jurídico de un proceso como una barra de etapas horizontal.
 * - Completadas: círculo verde con ✔
 * - Actual:      círculo azul destacado + badge de vencimiento
 * - Futuras:     círculo gris
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO, LegalStagesResponseDTO } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: etapa individual
// ─────────────────────────────────────────────────────────────────────────────

interface StepProps {
  etapa: EtapaProcesoDTO;
  isLast: boolean;
}

function Step({ etapa, isLast }: StepProps) {
  const isDone    = etapa.completada;
  const isCurrent = etapa.esActual;

  const circleStyle = isDone
    ? styles.circleDone
    : isCurrent
    ? styles.circleCurrent
    : styles.circleFuture;

  const labelStyle = isCurrent
    ? styles.labelCurrent
    : isDone
    ? styles.labelDone
    : styles.labelFuture;

  // badge de vencimiento solo en etapa actual
  const diasRestantes = etapa.diasRestantes ?? null;
  let urgencyColor: string | null = null;
  let urgencyText = "";
  if (isCurrent && diasRestantes !== null) {
    if (diasRestantes <= 0) {
      urgencyColor = Colors.danger;
      urgencyText  = diasRestantes === 0 ? "Vence hoy" : `Venció hace ${Math.abs(diasRestantes)}d`;
    } else if (diasRestantes <= 3) {
      urgencyColor = Colors.warning;
      urgencyText  = `${diasRestantes}d restantes`;
    } else {
      urgencyColor = Colors.success;
      urgencyText  = `${diasRestantes}d restantes`;
    }
  }

  return (
    <View style={styles.stepWrapper}>
      {/* Conector izquierdo */}
      <View style={styles.connectorRow}>
        <View style={[styles.connectorLine, isDone ? styles.connectorDone : styles.connectorFuture]} />

        {/* Círculo */}
        <View style={[styles.circle, circleStyle]}>
          {isDone ? (
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          ) : isCurrent ? (
            <View style={styles.circleDot} />
          ) : null}
        </View>

        {/* Conector derecho (oculto si es último) */}
        {!isLast && (
          <View style={[styles.connectorLine, isDone ? styles.connectorDone : styles.connectorFuture]} />
        )}
        {isLast && <View style={styles.connectorLineSpacer} />}
      </View>

      {/* Etiqueta */}
      <Text style={[styles.label, labelStyle]} numberOfLines={2}>
        {etapa.nombre}
      </Text>

      {/* Badge de urgencia */}
      {isCurrent && urgencyColor && (
        <View style={[styles.badge, { backgroundColor: urgencyColor + "22" }]}>
          <Text style={[styles.badgeText, { color: urgencyColor }]}>{urgencyText}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  data: LegalStagesResponseDTO;
  /** Muestra botón "Avanzar etapa" si se pasa el handler */
  onAdvance?: () => void;
  canAdvance?: boolean;
}

export function LegalStageStepper({ data, onAdvance, canAdvance = false }: Props) {
  const { etapas, etapaActual, siguienteEtapa } = data;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Etapa procesal</Text>
        {etapaActual && (
          <View style={[styles.currentBadge, { backgroundColor: (etapaActual as any).color + "22" }]}>
            <Text style={[styles.currentBadgeText, { color: (etapaActual as any).color || Colors.primary }]}>
              {etapaActual.nombre}
            </Text>
          </View>
        )}
      </View>

      {/* Stepper horizontal scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepsRow}
      >
        {etapas.map((etapa, idx) => (
          <Step key={etapa.codigo} etapa={etapa} isLast={idx === etapas.length - 1} />
        ))}
      </ScrollView>

      {/* Botón avanzar etapa */}
      {canAdvance && onAdvance && siguienteEtapa && (
        <Pressable
          style={({ pressed }) => [styles.advanceBtn, pressed && { opacity: 0.8 }]}
          onPress={onAdvance}
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.advanceBtnText}>Avanzar a: {siguienteEtapa.nombre}</Text>
        </Pressable>
      )}

      {!siguienteEtapa && etapaActual && (
        <View style={styles.finalizedRow}>
          <Ionicons name="checkmark-done-circle" size={16} color={Colors.success} />
          <Text style={styles.finalizedText}>Proceso en etapa final</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 24;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Stepper row
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 4,
  },
  stepWrapper: {
    alignItems: "center",
    width: 72,
  },

  // Connector + circle row
  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  connectorLine: {
    flex: 1,
    height: 2,
  },
  connectorLineSpacer: {
    flex: 1,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  connectorFuture: {
    backgroundColor: Colors.border,
  },

  // Circles
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: Colors.success,
  },
  circleCurrent: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  circleFuture: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },

  // Labels
  label: {
    marginTop: 6,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  labelDone: {
    color: Colors.textSecondary,
  },
  labelCurrent: {
    color: Colors.primary,
    fontWeight: "700",
  },
  labelFuture: {
    color: Colors.textTertiary,
  },

  // Urgency badge
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
  },

  // Advance button
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  advanceBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Finalized row
  finalizedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 12,
  },
  finalizedText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500",
  },
});
