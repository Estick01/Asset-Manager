import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking, Platform,
  Modal, TouchableOpacity, FlatList,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
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
import { linkProcesoToPost, getPosts, type PostDTO } from "@/lib/services/communityService";
import { type Actualizacion, type Documento, type ProcesoDTO, type TareasProgresoDTO, type LegalStagesResponseDTO, type EtapaProcesoDTO, type StageEventResponseDTO } from "@/shared/schema";
import { getStageEvents } from "@/lib/services/stageEventService";
import {
  HeaderActions,
  ClienteInfoSection,
  LawyersSection,
  TimelineSection,
  DocumentsSection,
} from "../../components/caso-detail";
import { ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";
import { TareasList } from "@/components/tareas/TareasList";
import { CrearTareaModal } from "@/components/tareas/CrearTareaModal";
import { getTareasByProceso } from "@/lib/services/tareaService";
import { getLegalStages, updateLegalStage } from "@/lib/services/legalStageService";
import { ConfirmDialog, type ConfirmDialogConfig } from "@/components/ConfirmDialog";
import { LegalStageStepper } from "@/components/proceso/LegalStageStepper";
import { ChangeStageModal } from "@/components/proceso/ChangeStageModal";
import { StageDetailSheet } from "@/components/proceso/StageDetailSheet";

const ACTUALIZACIONES_LIMIT = 10;

type Tab = "tareas" | "timeline" | "documents";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "tareas",    label: "Tareas",         icon: "checkmark-circle-outline" },
  { key: "timeline",  label: "Línea de tiempo", icon: "time-outline" },
  { key: "documents", label: "Documentos",      icon: "document-text-outline" },
];

export default function CaseDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const rol      = user?.user?.rol?.nombre;

  const [proceso,              setProceso]              = useState<ProcesoDTO | null>(null);
  const [actualizaciones,      setActualizaciones]      = useState<ActualizacionRelations[]>([]);
  const [documentos,           setDocumentos]           = useState<Documento[]>([]);
  const [activeTab,            setActiveTab]            = useState<Tab>("tareas");
  const [tareasData,           setTareasData]           = useState<TareasProgresoDTO | null>(null);
  const [actualizacionesOffset,setActualizacionesOffset]= useState(0);
  const [actualizacionesLoading,setActualizacionesLoading]=useState(false);
  const [hasMoreActualizaciones,setHasMoreActualizaciones]=useState(true);
  const [dialog,               setDialog]              = useState<ConfirmDialogConfig | null>(null);
  const [legalStages,          setLegalStages]          = useState<LegalStagesResponseDTO | null>(null);
  const [showChangeStage,      setShowChangeStage]      = useState(false);
  const [selectedStage,        setSelectedStage]        = useState<EtapaProcesoDTO | null>(null);
  const [stageSheetOpen,       setStageSheetOpen]       = useState(false);
  const [stageFilter,          setStageFilter]          = useState<string | null>(null);
  const [stageEvents,          setStageEvents]          = useState<StageEventResponseDTO[]>([]);
  const [stageCreateTarea,     setStageCreateTarea]     = useState(false);
  const [stageCreateLegalStage,setStageCreateLegalStage]= useState<string | null>(null);
  const stageFilterRef = useRef<string | null>(null);

  // Link community post modal
  const [linkPostModal,  setLinkPostModal]  = useState(false);
  const [clientPosts,    setClientPosts]    = useState<PostDTO[]>([]);
  const [loadingPosts,   setLoadingPosts]   = useState(false);
  const [linkingPost,    setLinkingPost]    = useState<string | null>(null);

  const isLoadingMoreRef = useRef(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id || isLoadingMoreRef.current) return;
    const p: ProcesoDTO = await getProceso(id);
    setProceso(p);
    if (p) {
      const acts = await getActualizaciones(p.id, ACTUALIZACIONES_LIMIT, 0);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === ACTUALIZACIONES_LIMIT);
      const docs = await getDocumentos(p.id, stageFilterRef.current);
      setDocumentos(docs);
      try {
        const td = await getTareasByProceso(p.id, stageFilterRef.current ?? undefined);
        setTareasData(td);
      } catch { /* non-critical */ }
      if (stageFilterRef.current) {
        try {
          const events = await getStageEvents(p.id, stageFilterRef.current);
          setStageEvents(events);
        } catch { /* non-critical */ }
      }
      try {
        const stages = await getLegalStages(p.tipoProceso?.nombre, p.id);
        setLegalStages(stages);
      } catch { /* non-critical */ }
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
    } catch { /* silent */ }
    finally {
      setActualizacionesLoading(false);
      isLoadingMoreRef.current = false;
    }
  }, [proceso, hasMoreActualizaciones, actualizacionesOffset, actualizacionesLoading]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleGoBack = () => router.replace("/cases");

  const handleStageFilter = async (stage: string | null) => {
    setStageFilter(stage);
    stageFilterRef.current = stage;
    if (!proceso) return;
    try {
      const [td, docs] = await Promise.all([
        getTareasByProceso(proceso.id, stage ?? undefined),
        getDocumentos(proceso.id, stage),
      ]);
      setTareasData(td);
      setDocumentos(docs);
    } catch { /* non-critical */ }
    if (stage) {
      try {
        const events = await getStageEvents(proceso.id, stage);
        setStageEvents(events);
      } catch { /* non-critical */ }
    } else {
      setStageEvents([]);
    }
  };

  const handleAdvanceStage = async () => {
    if (!proceso || !legalStages?.siguienteEtapa) return;
    await updateLegalStage(proceso.id, { legalStage: legalStages.siguienteEtapa.codigo });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success(`Etapa avanzada: ${legalStages.siguienteEtapa.nombre}`);
    loadData();
  };

  const handleDelete = () => {
    if (!proceso) return;
    setDialog({
      title: "Eliminar Proceso",
      message: `¿Seguro que deseas eliminar el proceso "${proceso.radicado}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
      onConfirm: async () => {
        await deleteProceso(proceso.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleGoBack();
      },
    });
  };

  const openLinkPostModal = async () => {
    if (!proceso) return;
    setLinkPostModal(true);
    const clientUserId = proceso.clienteUserId ?? (proceso as any).cliente?.userId;
    if (!clientUserId) {
      setClientPosts([]);
      return;
    }
    setLoadingPosts(true);
    try {
      const posts = await getPosts(20, 0, { authorId: clientUserId, clientAccepted: true, unlinkedOnly: true });
      setClientPosts(posts);
    } catch { setClientPosts([]); }
    finally { setLoadingPosts(false); }
  };

  const handleLinkPost = async (postId: string) => {
    if (!proceso) return;
    setLinkingPost(postId);
    try {
      await linkProcesoToPost(proceso.id, postId);
      setLinkPostModal(false);
      setClientPosts([]);
      await loadData();
      toast.success("Publicación vinculada al proceso");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo vincular");
    } finally { setLinkingPost(null); }
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
      const url       = await getDocumentoDownloadUrl(doc.id);
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else toast.error("No se puede abrir el documento");
    } catch {
      toast.error("No se pudo descargar el documento");
    }
  };

  const handlePickDocument = async (legalStage?: string | null) => {
    if (!proceso) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const doc  = await uploadDocument({
          procesoId: proceso.id,
          nombre:    file.name,
          tipo:      file.mimeType || "application/octet-stream",
          tamano:    file.size || 0,
          uri:       file.uri,
          legalStage: legalStage ?? null,
        });
        await saveActualizacion({
          procesoId:   proceso.id,
          fecha:       new Date(),
          titulo:      "Documento agregado",
          descripcion: `Se agrego el documento "${file.name}"`,
          tipoId:      2,
          documentoId: doc.id,
          tipo:        "documento",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch {
      toast.error("No se pudo agregar el documento");
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!proceso) {
    return (
      <View style={styles.screen}>
        {/* Minimal header while loading */}
        <View style={[styles.loadingHeader, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) }]}>
          <Pressable
            onPress={handleGoBack}
            style={styles.loadingBackBtn}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.loadingHeaderTitle}>Proceso</Text>
          <View style={styles.loadingBackBtn} />
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando proceso...</Text>
        </View>
      </View>
    );
  }

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts: Record<Tab, number | null> = {
    tareas:    tareasData?.progreso.total ?? null,
    timeline:  null,
    documents: documentos.length || null,
  };

  return (
    <View style={styles.screen}>
      <ConfirmDialog config={dialog} onClose={() => setDialog(null)} />

      <HeaderActions
        proceso={proceso}
        rol={rol}
        onDelete={handleDelete}
        onGoBack={handleGoBack}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) return;
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 100) {
            loadMoreActualizaciones();
          }
        }}
        scrollEventThrottle={400}
      >
        <ClienteInfoSection proceso={proceso} rol={rol} />

        <LawyersSection
          proceso={proceso}
          rol={rol}
          currentLawyerId={user?.profile?.id!}
          onAddAsistente={() => router.push({ pathname: "/case/add-responsable", params: { procesoId: proceso.id } })}
          onTransferirCaso={() => router.push({ pathname: "/case/transferir" as any, params: { procesoId: proceso.id } })}
        />

        {/* ── Legal Stage Stepper ── */}
        {legalStages && (
          <LegalStageStepper
            data={legalStages}
            canAdvance={rol === "abogado" || rol === "bufete"}
            onAdvance={() => setShowChangeStage(true)}
            onStagePress={(etapa) => {
              setSelectedStage(etapa);
              setStageSheetOpen(true);
            }}
          />
        )}

        {/* ── Community post link ── */}
        {(rol === "abogado" || rol === "bufete") && (
          <View style={styles.communityRow}>
            {proceso.communityPostId ? (
              <Pressable
                style={({ pressed }) => [styles.communityBtn, styles.communityBtnLinked, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/community/${proceso.communityPostId}` as any)}
              >
                <Ionicons name="globe-outline" size={16} color={Colors.primary} />
                <Text style={[styles.communityBtnText, { color: Colors.primary }]}>Ver publicación origen</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.communityBtn, styles.communityBtnUnlinked, pressed && { opacity: 0.8 }]}
                onPress={openLinkPostModal}
              >
                <Ionicons name="link-outline" size={16} color={Colors.textSecondary} />
                <Text style={[styles.communityBtnText, { color: Colors.textSecondary }]}>Vincular publicación de comunidad</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count    = tabCounts[tab.key];
            return (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [
                  styles.tab,
                  isActive && styles.tabActive,
                  pressed && !isActive && { opacity: 0.7 },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? Colors.primary : Colors.textTertiary}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count != null && count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Stage filter chips (visible en las 3 secciones) ── */}
        {legalStages && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageChipsRow}
          >
            <Pressable
              style={[styles.stageChip, stageFilter === null && styles.stageChipActive]}
              onPress={() => handleStageFilter(null)}
            >
              <Text style={[styles.stageChipText, stageFilter === null && styles.stageChipTextActive]}>
                Todas
              </Text>
            </Pressable>
            {legalStages.etapas.map(etapa => (
              <Pressable
                key={etapa.codigo}
                style={[styles.stageChip, stageFilter === etapa.codigo && styles.stageChipActive]}
                onPress={() => handleStageFilter(etapa.codigo)}
              >
                <View style={[styles.chipDot, { backgroundColor: (etapa as any).color ?? Colors.primary }]} />
                <Text style={[styles.stageChipText, stageFilter === etapa.codigo && styles.stageChipTextActive]}>
                  {etapa.nombre}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── Tab Content ── */}
        {activeTab === "timeline" && (
          stageFilter ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {stageEvents.length === 0 ? (
                <Text style={styles.emptyFilter}>Sin eventos en esta etapa</Text>
              ) : (
                stageEvents.map(ev => (
                  <View key={ev.id} style={styles.eventRow}>
                    <View style={styles.eventDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventDesc}>{ev.descripcion}</Text>
                      <Text style={styles.eventTime}>
                        {new Date(ev.createdAt).toLocaleDateString("es-CO", {
                          day: "2-digit", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <TimelineSection
              proceso={proceso}
              rol={rol}
              actualizaciones={actualizaciones}
              actualizacionesLoading={actualizacionesLoading}
              onDelete={handleDeleteActualizacion}
            />
          )
        )}

        {activeTab === "documents" && (
          <DocumentsSection
            rol={rol}
            documentos={documentos}
            onUpload={() => handlePickDocument(stageFilter)}
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
            defaultLegalStage={stageFilter}
          />
        )}
      </ScrollView>

      {/* ── Change Stage Modal ── */}
      {legalStages && (
        <ChangeStageModal
          visible={showChangeStage}
          etapaActual={legalStages.etapaActual}
          siguienteEtapa={legalStages.siguienteEtapa}
          onConfirm={handleAdvanceStage}
          onClose={() => setShowChangeStage(false)}
        />
      )}

      {/* ── Stage Detail Sheet ── */}
      {selectedStage && (
        <StageDetailSheet
          visible={stageSheetOpen}
          procesoId={proceso.id}
          etapa={selectedStage}
          isCurrentStage={selectedStage.esActual}
          onClose={() => setStageSheetOpen(false)}
          onAddTarea={(stage) => {
            setStageSheetOpen(false);
            setStageCreateLegalStage(stage);
            setStageCreateTarea(true);
          }}
          onUploadDoc={(stage) => {
            setStageSheetOpen(false);
            handlePickDocument(stage);
          }}
        />
      )}

      {/* ── Crear tarea desde etapa procesal ── */}
      {proceso && (
        <CrearTareaModal
          visible={stageCreateTarea}
          procesoId={proceso.id}
          legalStage={stageCreateLegalStage}
          onClose={() => { setStageCreateTarea(false); setStageCreateLegalStage(null); }}
          onCreated={() => { setStageCreateTarea(false); setStageCreateLegalStage(null); loadData(); }}
        />
      )}

      {/* ── Link post modal ── */}
      <Modal animationType="slide" transparent visible={linkPostModal} onRequestClose={() => setLinkPostModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLinkPostModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Ionicons name="link-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.modalTitle}>Vincular publicacion</Text>
              <Pressable onPress={() => setLinkPostModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {loadingPosts && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            )}

            {!loadingPosts && clientPosts.length === 0 && (
              <View style={styles.emptyResults}>
                <Ionicons name="document-text-outline" size={28} color={Colors.textTertiary} />
                <Text style={styles.emptyResultsText}>
                  {!proceso?.clienteUserId
                    ? "Este cliente no tiene cuenta en la app"
                    : "El cliente no tiene publicaciones en la comunidad"}
                </Text>
              </View>
            )}

            <FlatList
              data={clientPosts}
              keyExtractor={p => p.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.postRow, pressed && { backgroundColor: Colors.surfaceSecondary }]}
                  onPress={() => handleLinkPost(item.id)}
                  disabled={linkingPost === item.id}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postRowTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.postRowMeta}>
                      {item.caseType ?? "General"} · {item.status === "open" ? "Abierto" : item.status === "in_progress" ? "En progreso" : "Cerrado"}
                    </Text>
                  </View>
                  {linkingPost === item.id
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                  }
                </Pressable>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // ── Loading ──
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  loadingBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  loadingHeaderTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.white,
  },
  loadingBody: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12,
  },
  loadingText: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
  },

  // ── Content ──
  content: { padding: 16, gap: 12 },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.primary + "14",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  tabBadge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.borderLight,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary + "20",
  },
  tabBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.textTertiary,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },

  // ── Community post link ──
  communityRow: {
    marginHorizontal: 16, marginBottom: 8,
  },
  communityBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5,
  },
  communityBtnLinked: {
    backgroundColor: Colors.primary + "0D",
    borderColor: Colors.primary + "30",
  },
  communityBtnUnlinked: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  communityBtnText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_500Medium",
  },

  // ── Link post modal ──
  modalOverlay: {
    flex: 1, backgroundColor: Colors.overlay, justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
  },
  modalTitle: {
    flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primaryDark,
  },
  searchInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  emptyResults: {
    alignItems: "center", paddingVertical: 24, gap: 8,
  },
  emptyResultsText: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
  },
  postRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  postRowTitle: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text,
  },
  postRowMeta: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2,
  },

  // ── Stage filter chips ──
  stageChipsRow: {
    flexDirection: "row", gap: 6, paddingHorizontal: 2, paddingVertical: 4,
  },
  stageChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  stageChipActive: {
    backgroundColor: Colors.primary + "15", borderColor: Colors.primary,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  stageChipText: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
  },
  stageChipTextActive: {
    color: Colors.primary, fontFamily: "Inter_600SemiBold",
  },

  // ── Stage events inline (timeline con filtro activo) ──
  emptyFilter: {
    textAlign: "center", color: Colors.textTertiary,
    fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 24,
  },
  eventRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  eventDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginTop: 5,
  },
  eventDesc: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  eventTime: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2,
  },
});
