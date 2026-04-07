import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (tipoDocumento: "PROCESAL" | "PROBATORIO") => void;
}

export default function DocumentUploadModal({
  visible,
  onClose,
  onUpload,
}: DocumentUploadModalProps) {
  const [tipoDocumento, setTipoDocumento] = useState<"PROCESAL" | "PROBATORIO">("PROCESAL");

  const handleUpload = () => {
    onUpload(tipoDocumento);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Subir Documento</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Tipo de documento</Text>
            <View style={styles.typeSelector}>
              <Pressable
                style={[styles.typeOption, tipoDocumento === "PROCESAL" && styles.typeOptionSelected]}
                onPress={() => setTipoDocumento("PROCESAL")}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={tipoDocumento === "PROCESAL" ? Colors.white : Colors.primary}
                />
                <Text style={[styles.typeText, tipoDocumento === "PROCESAL" && styles.typeTextSelected]}>
                  Procesal
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeOption, tipoDocumento === "PROBATORIO" && styles.typeOptionSelected]}
                onPress={() => setTipoDocumento("PROBATORIO")}
              >
                <Ionicons
                  name="folder"
                  size={20}
                  color={tipoDocumento === "PROBATORIO" ? Colors.white : Colors.primary}
                />
                <Text style={[styles.typeText, tipoDocumento === "PROBATORIO" && styles.typeTextSelected]}>
                  Probatorio
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.uploadBtn} onPress={handleUpload}>
              <Ionicons name="cloud-upload" size={18} color={Colors.white} />
              <Text style={styles.uploadText}>Seleccionar archivo</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  typeOptionSelected: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  typeTextSelected: {
    color: Colors.white,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  uploadText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});