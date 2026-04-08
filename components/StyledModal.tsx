import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type StyledModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  hideConfirm?: boolean;
  fullHeight?: boolean;
  confirmVariant?: "primary" | "danger";
};

export function StyledModal({
  visible,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  hideConfirm = false,
  fullHeight = false,
  confirmVariant = "danger",
}: StyledModalProps) {
  const insets = useSafeAreaInsets();

  // Return null when not visible to avoid aria-hidden accessibility issues
  // This prevents focus being trapped in hidden elements from assistive technology
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Tap on overlay dismisses keyboard only, does NOT close the modal */}
      <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, fullHeight && styles.modalContainerFullHeight]}
        >
          <Pressable accessible={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <Ionicons name="close-outline" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalContent}
              nestedScrollEnabled={true}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{cancelText}</Text>
              </Pressable>
              {!hideConfirm && onConfirm && (
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.button,
                    confirmVariant === "primary" ? styles.confirmButtonPrimary : styles.confirmButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>{confirmText}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
      },
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }
    })
  },
  modalContainerFullHeight: {
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  modalContent: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.danger,
  },
  confirmButtonPrimary: {
    backgroundColor: Colors.primaryLight,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelButtonText: {
    color: Colors.textSecondary,
  },
  confirmButtonText: {
    color: Colors.white,
  },
});
