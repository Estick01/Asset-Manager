/**
 * ChangeStageModal
 * Permite al abogado confirmar el avance a la siguiente etapa procesal.
 * Muestra la etapa actual, la siguiente, y la fecha de vencimiento calculada.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO } from "@/shared/schema";

interface Props {
  visible: boolean;
  etapaActual: EtapaProcesoDTO | null;
  siguienteEtapa: EtapaProcesoDTO | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ChangeStageModal({
  visible,
  etapaActual,
  siguienteEtapa,
  onConfirm,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!siguienteEtapa) return null;

  // Calcular fecha estimada de vencimiento si la siguiente etapa tiene días legales
  const diasLegales = siguienteEtapa.diasLegales;
  let fechaEstimadaStr: string | null = null;
  if (diasLegales > 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasLegales);
    fechaEstimadaStr = fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Ionicons name="arrow-forward-circle" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Avanzar etapa procesal</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Transición */}
          <View style={styles.transitionRow}>
            {/* Etapa actual */}
            <View style={styles.stageBox}>
              <Text style={styles.stageBoxLabel}>Etapa actual</Text>
              <View style={[styles.stagePill, { backgroundColor: Colors.surfaceSecondary }]}>
                <Ionicons name="remove-circle-outline" size={14} color={Colors.textSecondary} />
                <Text style={[styles.stagePillText, { color: Colors.textSecondary }]}>
                  {etapaActual?.nombre ?? "—"}
                </Text>
              </View>
            </View>

            {/* Flecha */}
            <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} style={styles.arrow} />

            {/* Siguiente etapa */}
            <View style={styles.stageBox}>
              <Text style={styles.stageBoxLabel}>Nueva etapa</Text>
              <View style={[styles.stagePill, { backgroundColor: Colors.primary + "15" }]}>
                <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                <Text style={[styles.stagePillText, { color: Colors.primary }]}>
                  {siguienteEtapa.nombre}
                </Text>
              </View>
            </View>
          </View>

          {/* Vencimiento estimado */}
          {fechaEstimadaStr && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.warning} />
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Vencimiento estimado: </Text>
                {fechaEstimadaStr}
                {" "}({diasLegales} días hábiles)
              </Text>
            </View>
          )}

          {/* Advertencia */}
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={14} color={Colors.warning} />
            <Text style={styles.warningText}>
              Esta acción registrará la transición en el historial y notificará al cliente.
            </Text>
          </View>

          {/* Botones */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.7 }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnConfirm, pressed && { opacity: 0.8 }, loading && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                  <Text style={styles.btnConfirmText}>Confirmar avance</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    gap: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  transitionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stageBox: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stageBoxLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  arrow: {
    marginTop: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  infoLabel: {
    fontWeight: "600",
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  btnConfirm: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
