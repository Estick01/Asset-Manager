// components/proceso/LeaveConfirmModal.tsx
import React from "react";
import { Text, StyleSheet } from "react-native";
import { StyledModal } from "@/components/StyledModal";

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
    <StyledModal
      visible={visible}
      onClose={onCancel}
      title="¿Salir del bufete?"
      onConfirm={onConfirm}
      confirmText="Salir del bufete"
      cancelText="Cancelar"
    >
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
    </StyledModal>
  );
}

const styles = StyleSheet.create({
  body:   { fontSize: 14, color: "#374151", marginBottom: 8 },
  bullet: { fontSize: 13, color: "#374151", paddingLeft: 4, marginBottom: 6 },
});
