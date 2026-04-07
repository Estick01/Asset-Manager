import React from "react";
import { View, Text, Pressable, StyleSheet, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { FEATURE_LABELS, FEATURE_MIN_PLAN } from "@/lib/subscription-context";

interface FeatureLockedModalProps {
  visible: boolean;
  featureCode: string;
  onClose: () => void;
  onVerPlanes: () => void;
}

export function FeatureLockedModal({
  visible,
  featureCode,
  onClose,
  onVerPlanes,
}: FeatureLockedModalProps) {
  if (!visible) return null;

  const nombre   = FEATURE_LABELS[featureCode]   ?? featureCode;
  const minPlan  = FEATURE_MIN_PLAN[featureCode]  ?? "Pro";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessible={false}>
        <Pressable style={styles.container} accessible={false}>
          {/* Ícono */}
          <View style={styles.iconoContainer}>
            <View style={styles.iconoFondo}>
              <Ionicons name="lock-closed" size={32} color={Colors.primary} />
            </View>
          </View>

          {/* Contenido */}
          <Text style={styles.titulo}>Función bloqueada</Text>
          <Text style={styles.mensaje}>
            <Text style={styles.featureName}>{nombre}</Text>
            {" está disponible desde el plan "}
            <Text style={styles.planName}>{minPlan}</Text>.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.infoText}>
              Mejora tu plan para desbloquear esta funcionalidad y muchas más.
            </Text>
          </View>

          {/* Botones */}
          <View style={styles.botonesContainer}>
            <Pressable
              style={({ pressed }) => [styles.boton, styles.botonCancelar, pressed && { opacity: 0.8 }]}
              onPress={onClose}
            >
              <Text style={[styles.botonTexto, { color: Colors.textSecondary }]}>Cerrar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.boton, styles.botonPrimario, pressed && { opacity: 0.9 }]}
              onPress={onVerPlanes}
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.white} />
              <Text style={[styles.botonTexto, { color: Colors.white }]}>Ver planes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 16,
    ...Platform.select({
      web: { boxShadow: "0 20px 40px -8px rgba(0,0,0,0.15)" },
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  iconoContainer: { marginBottom: 4 },
  iconoFondo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF3FA",
    justifyContent: "center",
    alignItems: "center",
  },
  titulo: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  mensaje: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  featureName: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  planName: {
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    padding: 12,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.info,
    lineHeight: 18,
  },
  botonesContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  boton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
  },
  botonCancelar: { backgroundColor: Colors.surfaceSecondary },
  botonPrimario: { backgroundColor: Colors.primary },
  botonTexto: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
