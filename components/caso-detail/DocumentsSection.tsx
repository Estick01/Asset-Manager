import React from "react";
import { View, Text, Pressable, StyleSheet, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Documento } from "@/shared/schema";

interface DocumentsSectionProps {
  rol: string | undefined;
  documentos: Documento[];
  onUpload: () => void;
  onDelete: (doc: Documento) => void;
  onDownload: (doc: Documento) => void;
}

function getFileIcon(tipo: string): keyof typeof Ionicons.glyphMap {
  if (tipo.includes("pdf")) return "document-text";
  if (tipo.includes("image")) return "image";
  if (tipo.includes("word") || tipo.includes("doc")) return "document";
  if (tipo.includes("sheet") || tipo.includes("excel") || tipo.includes("csv")) return "grid";
  return "attach";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function DocumentsSection({
  rol,
  documentos,
  onUpload,
  onDelete,
  onDownload,
}: DocumentsSectionProps) {
  const canUpload = rol === "abogado" || rol === "bufete";
  const canDelete = rol === "abogado" || rol === "bufete";
  const canDownload = rol === "abogado" || rol === "bufete" || rol === "cliente";

  const handleDeleteDoc = (doc: Documento) => {
    Alert.alert("Eliminar Documento", `Eliminar "${doc.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          onDelete(doc);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Archivos{documentos.length > 0 ? ` (${documentos.length})` : ""}
        </Text>
        {canUpload && (
          <Pressable style={styles.uploadBtn} onPress={onUpload}>
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.white} />
            <Text style={styles.uploadBtnText}>Subir</Text>
          </Pressable>
        )}
      </View>

      {documentos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={36} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Sin documentos</Text>
          {canUpload && (
            <>
              <Text style={styles.emptySubtext}>Sube el primer archivo del proceso</Text>
              <Pressable style={styles.uploadEmptyBtn} onPress={onUpload}>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
                <Text style={styles.uploadEmptyText}>Subir documento</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        documentos.map((doc) => (
          <Pressable
            key={doc.id}
            style={({ pressed }) => [styles.docCard, pressed && styles.docCardPressed]}
            onLongPress={() => canDelete && handleDeleteDoc(doc)}
          >
            <View style={[styles.docIconWrap, { backgroundColor: Colors.primary + "12" }]}>
              <Ionicons name={getFileIcon(doc.tipo)} size={24} color={Colors.primary} />
            </View>

            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>{doc.nombre}</Text>
              <View style={styles.docMeta}>
                <Text style={styles.docMetaText}>{formatFileSize(doc.tamano)}</Text>
                <View style={styles.docMetaDot} />
                <Text style={styles.docMetaText}>
                  {new Date(doc.fechaSubida).toLocaleDateString("es-CO", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              {doc.descripcion && (
                <Text style={styles.docDescription} numberOfLines={2}>
                  {doc.descripcion}
                </Text>
              )}
            </View>

            <View style={styles.docActions}>
              {canDownload && (
                <Pressable
                  onPress={() => onDownload(doc)}
                  hitSlop={8}
                  style={styles.docActionButton}
                >
                  <Ionicons name="download-outline" size={20} color={Colors.primary} />
                </Pressable>
              )}
              {canDelete && (
                <Pressable onPress={() => handleDeleteDoc(doc)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </Pressable>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  uploadEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },
  uploadEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  docCardPressed: { opacity: 0.9 },
  docIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: { flex: 1 },
  docName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  docMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  docMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  docMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  docDescription: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  docActionButton: { padding: 4 },
});