import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Linking, FlatList, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import Colors from "@/constants/colors";
import {
  getProceso, getCliente, getActualizaciones, getDocumentos,
  deleteProceso, deleteActualizacion, deleteDocumento,
  uploadDocument, saveActualizacion, getDocumentoDownloadUrl,
  type Proceso, type Cliente, type Actualizacion, type Documento,
} from "@/lib/storage";

const ESTADO_COLORS: Record<string, string> = {
  activo: Colors.success,
  en_tramite: Colors.warning,
  finalizado: Colors.info,
  archivado: Colors.textTertiary,
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  en_tramite: "En Tramite",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

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

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents">("timeline");
  const [actualizacionesOffset, setActualizacionesOffset] = useState(0);
  const [actualizacionesLoading, setActualizacionesLoading] = useState(false);
  const [hasMoreActualizaciones, setHasMoreActualizaciones] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const ACTUALIZACIONES_LIMIT = 10;

  const handleGoBack = () => {
    router.replace("/cases");
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsInitialLoad(true);
    const p = await getProceso(id);
    setProceso(p);
    if (p) {
      const c = await getCliente(p.clienteId);
      setCliente(c);
      // Initial load with pagination - newest first
      const acts = await getActualizaciones(p.id, ACTUALIZACIONES_LIMIT, 0);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === ACTUALIZACIONES_LIMIT);
      setIsInitialLoad(false);
      const docs = await getDocumentos(p.id);
      setDocumentos(docs);
    }
  }, [id]);

  const loadMoreActualizaciones = useCallback(async () => {
    if (!proceso || isLoadingMoreRef.current || !hasMoreActualizaciones) return;
    isLoadingMoreRef.current = true;
    setActualizacionesLoading(true);
    try {
      const newActs = await getActualizaciones(proceso.id, ACTUALIZACIONES_LIMIT, actualizacionesOffset);
      if (newActs.length > 0) {
        setActualizaciones(prev => [...prev, ...newActs]);
        setActualizacionesOffset(prev => prev + newActs.length);
        setHasMoreActualizaciones(newActs.length === ACTUALIZACIONES_LIMIT);
      } else {
        setHasMoreActualizaciones(false);
      }
    } catch (error) {
      console.error("Error loading more actualizaciones:", error);
    } finally {
      setActualizacionesLoading(false);
      isLoadingMoreRef.current = false;
    }
  }, [proceso, hasMoreActualizaciones, actualizacionesOffset]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDelete = () => {
    if (!proceso) return;
    Alert.alert("Eliminar Proceso", "Estas seguro de eliminar este proceso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteProceso(proceso.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleGoBack();
        },
      },
    ]);
  };

  const handleDeleteUpdate = (act: Actualizacion) => {
    Alert.alert("Eliminar Actualizacion", "Estas seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteActualizacion(act.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const handleDeleteDoc = (doc: Documento) => {
    Alert.alert("Eliminar Documento", `Eliminar "${doc.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteDocumento(doc.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const handleDownloadDoc = async (doc: Documento) => {
    try {
      const url = await getDocumentoDownloadUrl(doc.id);
      // Open the download URL directly
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "No se puede abrir el documento");
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "No se pudo descargar el documento");
    }
  };

  const handleDownloadFromUpdate = async (documentoId: string) => {
    try {
      const url = await getDocumentoDownloadUrl(documentoId);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "No se puede abrir el documento");
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "No se pudo descargar el documento");
    }
  };

  const handlePickDocument = async () => {
    if (!proceso) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Upload document to server (which saves to S3)
        const { uploadDocument } = await import("@/lib/storage");
        const doc = await uploadDocument({
          procesoId: proceso.id,
          nombre: file.name,
          tipo: file.mimeType || "application/octet-stream",
          tamano: file.size || 0,
          uri: file.uri,
        });

        await saveActualizacion({
          procesoId: proceso.id,
          fecha: new Date().toISOString(),
          titulo: "Documento agregado",
          descripcion: `Se agrego el documento "${file.name}"`,
          tipo: "documento",
          documentoId: doc.id,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch {
      Alert.alert("Error", "No se pudo agregar el documento");
    }
  };

  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const statusColor = ESTADO_COLORS[proceso.estado?.codigo || "archivado"] || Colors.textTertiary;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <Pressable onPress={handleGoBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Proceso</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push({ pathname: "/case/edit/[id]", params: { id } })} hitSlop={8}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) => {
          if (isLoadingMoreRef.current || !hasMoreActualizaciones) return;
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom) {
            loadMoreActualizaciones();
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topCardInfo}>
              <Text style={styles.radicado}>{proceso.radicado}</Text>
              <Text style={styles.tipoProceso}>{proceso.tipoProceso}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: statusColor + "15" }]}>
              <View style={[styles.estadoDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.estadoText, { color: statusColor }]}>{ESTADO_LABELS[proceso.estado?.codigo || "archivado"]}</Text>
            </View>
          </View>
          {!!proceso.descripcionEstado && <Text style={styles.descripcion}>{proceso.descripcionEstado}</Text>}
        </View>

        <View style={styles.infoCard}>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{cliente?.nombre || "Desconocido"}</Text>
            </View>
            {cliente && (
              <Pressable onPress={() => router.push({ pathname: "/client/[id]", params: { id: cliente.id } })}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Juzgado</Text>
              <Text style={styles.infoValue}>{proceso.juzgado}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha de creacion</Text>
              <Text style={styles.infoValue}>{new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
            onPress={() => setActiveTab("timeline")}
          >
            <Ionicons name="time-outline" size={18} color={activeTab === "timeline" ? Colors.primary : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}>Linea de Tiempo</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "documents" && styles.tabActive]}
            onPress={() => setActiveTab("documents")}
          >
            <Ionicons name="folder-outline" size={18} color={activeTab === "documents" ? Colors.primary : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === "documents" && styles.tabTextActive]}>
              Documentos{documentos.length > 0 ? ` (${documentos.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {activeTab === "timeline" && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actualizaciones</Text>
              <Pressable
                style={styles.addUpdateBtn}
                onPress={() => router.push({ pathname: "/update/new", params: { procesoId: proceso.id } })}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.addUpdateText}>Agregar</Text>
              </Pressable>
            </View>

            {actualizaciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={36} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Sin actualizaciones</Text>
                <Text style={styles.emptySubtext}>Agrega la primera actualizacion</Text>
              </View>
            ) : (
              <View>
                {actualizaciones.map((act, idx) => (
                  <Pressable key={act.id} onLongPress={() => handleDeleteUpdate(act)} style={styles.timelineItem}>
                    <View style={styles.timelineLine}>
                      <View style={[
                        styles.timelineDot,
                        idx === 0 && styles.timelineDotActive,
                        act.tipo === "documento" && styles.timelineDotDocument,
                      ]} />
                      {idx < actualizaciones.length - 1 && <View style={styles.timelineConnector} />}
                    </View>
                    <View style={[styles.timelineCard, idx === 0 && styles.timelineCardActive]}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={styles.timelineDate}>
                          {new Date(act.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                        </Text>
                        {act.tipo === "documento" && (
                          <View style={styles.docBadge}>
                            <Ionicons name="attach" size={12} color={Colors.accent} />
                            <Text style={styles.docBadgeText}>Documento</Text>
                            {act.documentoId && (
                              <Pressable 
                                onPress={() => handleDownloadFromUpdate(act.documentoId!)} 
                                hitSlop={4}
                                style={styles.docDownloadBadge}
                              >
                                <Ionicons name="download-outline" size={12} color={Colors.accent} />
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineTitle}>{act.titulo}</Text>
                      {!!act.descripcion && <Text style={styles.timelineDesc}>{act.descripcion}</Text>}
                    </View>
                  </Pressable>
                ))}
                {/* Sentinel for infinite scroll */}
                <View 
                  onLayout={(event) => {
                    // Only load more if initial load is complete and not already loading
                    if (isInitialLoad || isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) {
                      return;
                    }
                    loadMoreActualizaciones();
                  }}
                  style={{ height: 20 }}
                />
                {actualizacionesLoading && (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === "documents" && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Archivos</Text>
              <Pressable style={styles.addUpdateBtn} onPress={handlePickDocument}>
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.white} />
                <Text style={styles.addUpdateText}>Subir</Text>
              </Pressable>
            </View>

            {documentos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={36} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Sin documentos</Text>
                <Text style={styles.emptySubtext}>Sube el primer archivo del proceso</Text>
                <Pressable style={styles.uploadEmptyBtn} onPress={handlePickDocument}>
                  <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
                  <Text style={styles.uploadEmptyText}>Subir documento</Text>
                </Pressable>
              </View>
            ) : (
              documentos.map((doc) => (
                <Pressable
                  key={doc.id}
                  style={({ pressed }) => [styles.docCard, pressed && styles.docCardPressed]}
                  onLongPress={() => handleDeleteDoc(doc)}
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
                        {new Date(doc.fechaSubida).toLocaleDateString("es-CO", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    {doc.descripcion && (
                      <Text style={styles.docDescription} numberOfLines={2}>{doc.descripcion}</Text>
                    )}
                  </View>
                  <View style={styles.docActions}>
                    <Pressable 
                      onPress={() => handleDownloadDoc(doc)} 
                      hitSlop={8}
                      style={styles.docActionButton}
                    >
                      <Ionicons name="download-outline" size={20} color={Colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteDoc(doc)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  content: { padding: 20, paddingBottom: 40 },
  topCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topCardInfo: { flex: 1, marginRight: 12 },
  radicado: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  tipoProceso: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
  estadoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  descripcion: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 16,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.primary + "12",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  addUpdateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addUpdateText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  loadingMore: { paddingVertical: 16, alignItems: "center" },
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
  uploadEmptyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row" },
  timelineLine: { width: 24, alignItems: "center" },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.surfaceSecondary,
    marginTop: 18,
  },
  timelineDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary + "30" },
  timelineDotDocument: { backgroundColor: Colors.accent, borderColor: Colors.accent + "30" },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
  },
  timelineCardActive: {
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  docBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  docBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  docDownloadBadge: { marginLeft: 4, padding: 2 },
  timelineTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 4 },
  timelineDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
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
  docName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  docMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  docMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textTertiary },
  docDescription: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  docActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  docActionButton: { padding: 4 },
});
