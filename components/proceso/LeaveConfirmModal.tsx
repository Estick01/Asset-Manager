// components/proceso/LeaveConfirmModal.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";

interface LeaveConfirmModalProps {
  visible: boolean;
  impactSummary: {
    sharedToBeRevoked: number;
    firmProcessesLost: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveConfirmModal({
  visible,
  impactSummary,
  onConfirm,
  onCancel,
}: LeaveConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>¿Salir del bufete?</Text>
          <Text style={styles.body}>Al salir del bufete ocurrirá lo siguiente:</Text>
          <Text style={styles.bullet}>
            • {impactSummary.sharedToBeRevoked} proceso(s) dejará(n) de estar compartidos con el bufete.
          </Text>
          <Text style={styles.bullet}>
            • Perderás acceso a {impactSummary.firmProcessesLost} proceso(s) del bufete donde estás asignado.
          </Text>
          <Text style={styles.bullet}>
            • Esta acción no se puede deshacer directamente; el bufete deberá reinvitarte.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Salir del bufete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  container:   { backgroundColor: "#fff", borderRadius: 16, padding: 24, gap: 12 },
  title:       { fontSize: 18, fontWeight: "700", color: "#111827" },
  body:        { fontSize: 14, color: "#374151" },
  bullet:      { fontSize: 13, color: "#374151", paddingLeft: 4 },
  actions:     { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  cancelBtn:   { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#D1D5DB" },
  cancelText:  { color: "#6B7280", fontWeight: "600", fontSize: 14 },
  confirmBtn:  { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#EF4444" },
  confirmText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
