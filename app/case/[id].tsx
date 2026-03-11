import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import {
  getProceso,
  getActualizaciones,
  getDocumentos,
  deleteProceso,
  deleteActualizacion,
  deleteDocumento,
  uploadDocument,
  saveActualizacion,
  getDocumentoDownloadUrl,
} from "@/lib/services/procesoService";
import { type Actualizacion, type Documento, type ProcesoDTO, type TareasProgresoDTO } from "@/shared/schema";
import {
  HeaderActions,
  ClienteInfoSection,
  LawyersSection,
  TimelineSection,
  DocumentsSection,
} from "../../components/caso-detail";
import { ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";
import { TareasList } from "@/components/tareas/TareasList";
import { getTareasByProceso } from "@/lib/services/tareaService";

const ACTUALIZACIONES_LIMIT = 10;

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const rol = user?.user?.rol?.nombre;

  const [proceso, setProceso] = useState<ProcesoDTO | null>(null);
  const [actualizaciones, setActualizaciones] = useState<ActualizacionRelations[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents" | "tareas">("tareas");
  const [tareasData, setTareasData] = useState<TareasProgresoDTO | null>(null);
  const [actualizacionesOffset, setActualizacionesOffset] = useState(0);
  const [actualizacionesLoading, setActualizacionesLoading] = useState(false);
  const [hasMoreActualizaciones, setHasMoreActualizaciones] = useState(true);

  const isLoadingMoreRef = useRef(false);

  // ============================================
  // Data fetching
  // ============================================
  const loadData = useCallback(async () => {
    if (!id) return;
    // Prevent resetting data while we're in the middle of loading more
    if (isLoadingMoreRef.current) return;
    const p: ProcesoDTO = await getProceso(id);
    setProceso(p);

    if (p) {
      const acts = await getActualizaciones(p.id, ACTUALIZACIONES_LIMIT, 0);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === ACTUALIZACIONES_LIMIT);

      const docs = await getDocumentos(p.id);
      setDocumentos(docs);

      try {
        const td = await getTareasByProceso(p.id);
        setTareasData(td);
      } catch {
        // tareas are non-critical — don't block the rest of the screen
      }
    }
  }, [id]);

  const loadMoreActualizaciones = useCallback(async () => {
    if (!proceso || isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) return;
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
  }, [proceso, hasMoreActualizaciones, actualizacionesOffset, actualizacionesLoading]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ============================================
  // Handlers
  // ============================================
  const handleGoBack = () => router.replace("/cases");

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

  const handleDeleteActualizacion = async (act: Actualizacion) => {
    await deleteActualizacion(act.id);
    loadData();
  };

  const handleDeleteDocumento = async (doc: Documento) => {
    await deleteDocumento(doc.id);
    loadData();
  };

  const handleDownloadDocumento = async (doc: Documento) => {
    try {
      const url = await getDocumentoDownloadUrl(doc.id);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "No se puede abrir el documento");
      }
    } catch {
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

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const doc = await uploadDocument({
          procesoId: proceso.id,
          nombre: file.name,
          tipo: file.mimeType || "application/octet-stream",
          tamano: file.size || 0,
          uri: file.uri,
        });

        await saveActualizacion({
          procesoId: proceso.id,
          fecha: new Date(),
          titulo: "Documento agregado",
          descripcion: `Se agrego el documento "${file.name}"`,
          tipoId: 2,
          documentoId: doc.id,
          tipo: "documento",
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch {
      Alert.alert("Error", "No se pudo agregar el documento");
    }
  };

  // ============================================
  // Render
  // ============================================
  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <HeaderActions
        proceso={proceso}
        rol={rol}
        onDelete={handleDelete}
        onGoBack={handleGoBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) => {
          if (isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) return;
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom) loadMoreActualizaciones();
        }}
        scrollEventThrottle={400}
      >
        <ClienteInfoSection proceso={proceso} rol={rol} />

        <LawyersSection
          proceso={proceso}
          rol={rol}
          currentLawyerId={user?.profile?.id!}
          onAddAsistente={() => router.push({
            pathname: "/case/add-asistente",
            params: { procesoId: proceso.id }
          })}
          onTransferirCaso={() => router.push({
            pathname: "/case/transferir" as any,
            params: { procesoId: proceso.id }
          })}
        />

        {/* Tabs */}
        <View style={styles.tabBar}>
          <View style={[styles.tab, activeTab === "tareas" && styles.tabActive]}>
            <Text
              style={[styles.tabText, activeTab === "tareas" && styles.tabTextActive]}
              onPress={() => setActiveTab("tareas")}
            >
              Tareas{tareasData ? ` (${tareasData.progreso.total})` : ""}
            </Text>
          </View>
          <View style={[styles.tab, activeTab === "timeline" && styles.tabActive]}>
            <Text
              style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}
              onPress={() => setActiveTab("timeline")}
            >
              Linea de Tiempo
            </Text>
          </View>
          <View style={[styles.tab, activeTab === "documents" && styles.tabActive]}>
            <Text
              style={[styles.tabText, activeTab === "documents" && styles.tabTextActive]}
              onPress={() => setActiveTab("documents")}
            >
              Documentos{documentos.length > 0 ? ` (${documentos.length})` : ""}
            </Text>
          </View>
        </View>

        {activeTab === "timeline" && (
          <TimelineSection
            proceso={proceso}
            rol={rol}
            actualizaciones={actualizaciones}
            actualizacionesLoading={actualizacionesLoading}
            onDelete={handleDeleteActualizacion}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsSection
            rol={rol}
            documentos={documentos}
            onUpload={handlePickDocument}
            onDelete={handleDeleteDocumento}
            onDownload={handleDownloadDocumento}
          />
        )}
        {activeTab === "tareas" && tareasData && (
          <TareasList
            procesoId={proceso.id}
            data={tareasData}
            onRefresh={loadData}
            canCreate={rol !== "cliente"}
            canEdit={rol === "bufete" || rol === "abogado"}
            currentProfileId={user?.profile?.id}
          />
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  content: { padding: 20, paddingBottom: 40 },
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.primary + "12" },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
});