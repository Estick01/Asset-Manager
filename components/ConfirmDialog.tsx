/**
 * ConfirmDialog
 *
 * Modal de confirmación reutilizable para web y móvil.
 * Reemplaza Alert.alert / window.confirm en toda la app.
 *
 * Uso:
 *   const [dialog, setDialog] = useState<ConfirmDialogConfig | null>(null);
 *
 *   <ConfirmDialog
 *     config={dialog}
 *     onClose={() => setDialog(null)}
 *   />
 *
 *   // Para abrir:
 *   setDialog({
 *     title: "Eliminar",
 *     message: "¿Seguro que deseas eliminar este elemento?",
 *     confirmText: "Eliminar",
 *     variant: "danger",
 *     onConfirm: async () => { await deleteItem(); },
 *   });
 */

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  /** Texto del botón de confirmación. Default: "Confirmar" */
  confirmText?: string;
  /** Texto del botón de cancelar. Default: "Cancelar" */
  cancelText?: string;
  /** "danger" (rojo) | "primary" (teal). Default: "danger" */
  variant?: "danger" | "primary";
  /** Callback async ejecutado al confirmar. El botón muestra spinner mientras corre. */
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  config: ConfirmDialogConfig | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmDialog({ config, onClose }: ConfirmDialogProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  if (!config) return null;

  const {
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
    onConfirm,
  } = config;

  const accentColor = variant === "danger" ? Colors.danger : Colors.primary;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCancel = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable
          style={[
            styles.dialog,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={() => {}} // evita cerrar al tocar el contenido
        >
          {/* Ícono */}
          <View style={[styles.iconWrap, { backgroundColor: accentColor + "15" }]}>
            <Ionicons
              name={variant === "danger" ? "warning-outline" : "help-circle-outline"}
              size={28}
              color={accentColor}
            />
          </View>

          {/* Textos */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Botones */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: accentColor },
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      },
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1B2B3B",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7B8D",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#F4F6F8",
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7B8D",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
