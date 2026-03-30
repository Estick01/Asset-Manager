import React from "react";
import { View, Text, Pressable, StyleSheet, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type TipoLimite = "procesos" | "clientes" | "storage";

interface PlanGateProps {
  visible: boolean;
  onClose: () => void;
  onVerPlanes: () => void;
  tipo: TipoLimite;
  actual: number;
  maximo: number;
}

function getMensaje(tipo: TipoLimite, actual: number, maximo: number): string {
  switch (tipo) {
    case "procesos":
      return `Has usado ${actual} de ${maximo} procesos de tu plan`;
    case "clientes":
      return `Has usado ${actual} de ${maximo} clientes de tu plan`;
    case "storage":
      return "Has alcanzado el límite de almacenamiento";
  }
}

function getIcono(tipo: TipoLimite): string {
  switch (tipo) {
    case "procesos":
      return "document-text-outline";
    case "clientes":
      return "people-outline";
    case "storage":
      return "cloud-offline-outline";
  }
}

export function PlanGate({
  visible,
  onClose,
  onVerPlanes,
  tipo,
  actual,
  maximo,
}: PlanGateProps) {
  if (!visible) {
    return null;
  }

  const mensaje = getMensaje(tipo, actual, maximo);
  const icono = getIcono(tipo);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessible={false}>
        <Pressable style={styles.container} accessible={false}>
          {/* Ícono principal */}
          <View style={styles.iconoContainer}>
            <View style={styles.iconoFondo}>
              <Ionicons name="lock-closed" size={32} color={Colors.primary} />
            </View>
            <View style={styles.iconoSecundario}>
              <Ionicons name={icono as any} size={18} color={Colors.textSecondary} />
            </View>
          </View>

          {/* Contenido */}
          <Text style={styles.titulo}>Has alcanzado tu límite</Text>
          <Text style={styles.mensaje}>{mensaje}</Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.infoText}>
              Mejora tu plan para continuar usando todas las funciones sin restricciones.
            </Text>
          </View>

          {/* Botones */}
          <View style={styles.botonesContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.boton,
                styles.botonCancelar,
                pressed && styles.botonPressed,
              ]}
              onPress={onClose}
            >
              <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.boton,
                styles.botonPrimario,
                pressed && styles.botonPressed,
              ]}
              onPress={onVerPlanes}
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.white} />
              <Text style={[styles.botonTexto, styles.botonPrimarioTexto]}>
                Ver planes
              </Text>
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
    backgroundColor: Colors.overlay,
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
      web: {
        boxShadow: "0 20px 40px -8px rgba(0,0,0,0.15)",
      },
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  iconoContainer: {
    position: "relative",
    width: 72,
    height: 72,
    marginBottom: 4,
  },
  iconoFondo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF3FA",
    justifyContent: "center",
    alignItems: "center",
  },
  iconoSecundario: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: Colors.surface,
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
  botonPressed: {
    opacity: 0.82,
  },
  botonCancelar: {
    backgroundColor: Colors.surfaceSecondary,
  },
  botonPrimario: {
    backgroundColor: Colors.primary,
  },
  botonTexto: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  botonCancelarTexto: {
    color: Colors.textSecondary,
  },
  botonPrimarioTexto: {
    color: Colors.white,
  },
});
