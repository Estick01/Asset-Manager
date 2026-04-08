import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking, Platform,
  Modal, TouchableOpacity, FlatList, TextInput,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { FeatureGate } from "@/components/subscription/FeatureGate";
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
import {
  getUltimoEstadoPorEtapa,
  createEtapaHistorial,
} from "@/lib/services/proceso-etapa-historial.service";
import { linkProcesoToPost, getPosts, type PostDTO } from "@/lib/services/communityService";
import { type Actualizacion, type Documento, type ProcesoDTO, type TareasProgresoDTO, type LegalStagesResponseDTO, type StageEventResponseDTO, type EtapaEstado } from "@/shared/schema";
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
import EtapaHistorialTimeline from "@/components/proceso/EtapaHistorialTimeline";
import { ProcessAccessPanel } from "@/components/proceso/ProcessAccessPanel";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

const ACTUALIZACIONES_LIMIT = 10;
const STAGE_EXCEPTION_ACTIONS: { estado: EtapaEstado; label: string; help: string }[] = [
  { estado: "SUSPENDIDA", label: "Suspender etapa", help: "La etapa queda detenida temporalmente." },
  { estado: "APLAZADA", label: "Aplazar etapa", help: "La etapa continúa, pero con demora o reprogramación." },
  { estado: "REINTENTO", label: "Repetir o reintentar", help: "La etapa necesita repetirse o ejecutarse de nuevo." },
  { estado: "SUBSANADA", label: "Registrar subsanacion", help: "Se resolvió una observación o subsanación dentro de la etapa." },
  { estado: "CANCELADA", label: "Cancelar etapa", help: "La etapa se cierra sin seguir su curso normal." },
];
const STAGE_ACTION_LOOKUP: Record<EtapaEstado, { estado: EtapaEstado; label: string; help: string }> = {
  INICIADA: { estado: "INICIADA", label: "Reanudar etapa", help: "La etapa vuelve a quedar activa como flujo principal." },
  EN_PROCESO: { estado: "EN_PROCESO", label: "Marcar en proceso", help: "La etapa se mantiene en trabajo activo." },
  COMPLETADA: { estado: "COMPLETADA", label: "Completar etapa", help: "La etapa queda cerrada formalmente." },
  NO_ADMITIDA: { estado: "NO_ADMITIDA", label: "Marcar no admitida", help: "La etapa fue rechazada formalmente." },
  FALLIDA: { estado: "FALLIDA", label: "Marcar fallida", help: "La etapa no logró completarse correctamente." },
  SUSPENDIDA: STAGE_EXCEPTION_ACTIONS[0],
  APLAZADA: STAGE_EXCEPTION_ACTIONS[1],
  REINTENTO: STAGE_EXCEPTION_ACTIONS[2],
  SUBSANADA: STAGE_EXCEPTION_ACTIONS[3],
  CANCELADA: STAGE_EXCEPTION_ACTIONS[4],
};

const STAGE_INCIDENT_META: Partial<Record<EtapaEstado, { label: string; tone: string; icon: keyof typeof Ionicons.glyphMap; help: string }>> = {
  SUSPENDIDA: {
    label: "Etapa suspendida",
    tone: Colors.danger,
    icon: "pause-circle-outline",
    help: "La etapa sigue detenida temporalmente hasta que se reanude formalmente.",
  },
  APLAZADA: {
    label: "Etapa aplazada",
    tone: Colors.warning,
    icon: "calendar-outline",
    help: "La etapa continúa abierta, pero con demora o reprogramación.",
  },
  REINTENTO: {
    label: "Etapa en reintento",
    tone: Colors.primary,
    icon: "refresh-circle-outline",
    help: "La etapa debe repetirse o retomarse antes de poder avanzar.",
  },
  SUBSANADA: {
    label: "Subsanación registrada",
    tone: Colors.info,
    icon: "build-outline",
    help: "Se registró una subsanación dentro de esta etapa; revise soporte y actividad antes de resolverla.",
  },
  CANCELADA: {
    label: "Etapa cancelada",
    tone: Colors.danger,
    icon: "close-circle-outline",
    help: "La etapa se cerró de forma excepcional y no siguió su curso normal.",
  },
};

type Tab = "tareas" | "timeline" | "documents";

const ALL_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "tareas",    label: "1. Tareas",      icon: "checkmark-circle-outline" },
  { key: "documents", label: "2. Documentos",  icon: "document-text-outline" },
  { key: "timeline",  label: "3. Actividad",   icon: "time-outline" },
];

export default function CaseDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1520, Math.max(1160, width - metrics.gutter * 2));
  const rol      = user?.user?.rol?.nombre;
  const TABS     = ALL_TABS;

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
  const [etapaHistorialOpen,   setEtapaHistorialOpen]   = useState(false);
  const [etapaHistorialFocus,  setEtapaHistorialFocus]  = useState<string | null>(null);
  const [stageFilter,          setStageFilter]          = useState<string | null>(null);
  const [tipoDocumentoFilter,   setTipoDocumentoFilter]   = useState<"PROCESAL" | "PROBATORIO" | null>(null);
  const [stageEvents,          setStageEvents]          = useState<StageEventResponseDTO[]>([]);
  const [stageCreateTarea,     setStageCreateTarea]     = useState(false);
  const [stageCreateLegalStage,setStageCreateLegalStage]= useState<string | null>(null);
  const [stageDecisionOpen,    setStageDecisionOpen]    = useState(false);
  const [selectedStageDecision,setSelectedStageDecision]= useState<EtapaEstado | null>(null);
  const [stageDecisionNote,    setStageDecisionNote]    = useState("");
  const [stageDecisionSaving,  setStageDecisionSaving]  = useState(false);
  const stageFilterRef = useRef<string | null>(null);
  const [ownershipExpanded, setOwnershipExpanded] = useState(false);
  const [ultimosEstadosPorEtapa, setUltimosEstadosPorEtapa] = useState<Record<string, string>>({});

  // Link community post modal
  const [linkPostModal,  setLinkPostModal]  = useState(false);
  const [clientPosts,    setClientPosts]    = useState<PostDTO[]>([]);
  const [loadingPosts,   setLoadingPosts]   = useState(false);
  const [linkingPost,    setLinkingPost]    = useState<string | null>(null);

  const isLoadingMoreRef = useRef(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id || isLoadingMoreRef.current) return;
    stageFilterRef.current = null;
    setStageFilter(null);
    const p: ProcesoDTO = await getProceso(id);
    setProceso(p);
    if (p) {
      const acts = await getActualizaciones(p.id, ACTUALIZACIONES_LIMIT, 0);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === ACTUALIZACIONES_LIMIT);
      const docs = await getDocumentos(p.id, stageFilterRef.current, tipoDocumentoFilter);
      setDocumentos(docs);
      try {
        const td = await getTareasByProceso(p.id, stageFilterRef.current ?? undefined);
        setTareasData(td);
      } catch { /* non-critical */ }
      try {
        const ultimosEstados = await getUltimoEstadoPorEtapa(p.id);
        // Convertir los objetos del historial a un mapa de etapa -> estado
        const estadosMap: Record<string, string> = {};
        Object.entries(ultimosEstados).forEach(([etapa, registro]) => {
          estadosMap[etapa] = registro.estado;
        });
        setUltimosEstadosPorEtapa(estadosMap);
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
  }, [id, tipoDocumentoFilter]);

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

  const handleStageFilter = useCallback(async (stage: string | null) => {
    setStageFilter(stage);
    stageFilterRef.current = stage;
    if (!proceso) return;
    try {
      const [td, docs] = await Promise.all([
        getTareasByProceso(proceso.id, stage ?? undefined),
        getDocumentos(proceso.id, stage, tipoDocumentoFilter),
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
  }, [proceso, tipoDocumentoFilter]);

  useEffect(() => {
    if (!legalStages?.etapaActual || !proceso || stageFilterRef.current) return;
    handleStageFilter(legalStages.etapaActual.codigo);
  }, [legalStages, proceso, handleStageFilter]);

  const handleAdvanceStage = async (fechaVencimiento?: Date) => {
    if (!proceso || !legalStages?.siguienteEtapa) return;
    const nextStageCode = legalStages.siguienteEtapa.codigo;

    // Actualizar la etapa legal
    await updateLegalStage(proceso.id, {
      legalStage: nextStageCode,
      fechaVencimientoEtapa: fechaVencimiento
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success(`Etapa avanzada: ${legalStages.siguienteEtapa.nombre}`);
    await loadData();
    setActiveTab("tareas");
    await handleStageFilter(nextStageCode);
  };

  const handleStageIncident = useCallback(async () => {
    if (!proceso || !legalStages?.etapaActual?.codigo || !selectedStageDecision || stageDecisionSaving) return;
    setStageDecisionSaving(true);
    try {
      await createEtapaHistorial(proceso.id, {
        etapa: legalStages.etapaActual.codigo,
        estado: selectedStageDecision,
        observacion: stageDecisionNote.trim() || undefined,
      });
      toast.success("Decision de etapa registrada");
      setStageDecisionOpen(false);
      setSelectedStageDecision(null);
      setStageDecisionNote("");
      await loadData();
    } catch {
      toast.error("No se pudo registrar la decision de etapa");
    } finally {
      setStageDecisionSaving(false);
    }
  }, [proceso, legalStages, selectedStageDecision, stageDecisionNote, stageDecisionSaving, loadData]);

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

  const handlePickDocument = async (tipoDocumento: "PROCESAL" | "PROBATORIO", legalStage?: string | null) => {
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
          tipoDocumento,
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

  const focusedStage = useMemo(() => {
    if (!legalStages) return null;
    if (stageFilter) {
      return legalStages.etapas.find((etapa) => etapa.codigo === stageFilter) ?? null;
    }
    return legalStages.etapaActual ?? null;
  }, [legalStages, stageFilter]);

  const currentOperationalStage = legalStages?.etapaActual ?? null;
  const isViewingCurrentStage = Boolean(
    focusedStage?.codigo && currentOperationalStage?.codigo && focusedStage.codigo === currentOperationalStage.codigo,
  );

  const focusedStageStatus = useMemo(() => {
    if (!focusedStage) return null;
    if (focusedStage.esActual) return "Etapa actual";
    if (focusedStage.completada) return "Etapa completada";
    return "Etapa futura";
  }, [focusedStage]);

  const focusedStageIncident = useMemo(() => {
    if (!focusedStage) return null;
    const ultimoEstado = ultimosEstadosPorEtapa[focusedStage.codigo] as EtapaEstado | undefined;
    if (!ultimoEstado) return null;
    return STAGE_INCIDENT_META[ultimoEstado] ?? null;
  }, [focusedStage, ultimosEstadosPorEtapa]);

  const stageDocumentsCount = useMemo(() => {
    if (!stageFilter) return documentos.length;
    return documentos.filter((doc) => (doc as any).legalStage === stageFilter).length;
  }, [documentos, stageFilter]);
  const pendingStageTasks = useMemo(() => {
    return (tareasData?.tareas ?? []).filter((tarea) => tarea.estado !== "completada" && tarea.estado !== "cancelada");
  }, [tareasData]);

  const currentStageFormalStatus = useMemo<EtapaEstado | null>(() => {
    if (!currentOperationalStage?.codigo) return null;
    return (ultimosEstadosPorEtapa[currentOperationalStage.codigo] as EtapaEstado | undefined) ?? "INICIADA";
  }, [currentOperationalStage, ultimosEstadosPorEtapa]);

  const canAdvanceCurrentStage = useMemo(() => {
    if (!currentStageFormalStatus) return true;
    return ["INICIADA", "EN_PROCESO", "REINTENTO", "SUBSANADA", "COMPLETADA"].includes(currentStageFormalStatus);
  }, [currentStageFormalStatus]);

  const advanceBlockedReason = useMemo(() => {
    switch (currentStageFormalStatus) {
      case "SUSPENDIDA":
        return "La etapa está suspendida. Debe reanudarse antes de poder avanzar.";
      case "APLAZADA":
        return "La etapa está aplazada. Retómela formalmente antes de avanzar.";
      case "CANCELADA":
        return "La etapa fue cancelada y no puede avanzar mientras siga en ese estado.";
      case "FALLIDA":
        return "La etapa quedó fallida. Registre reintento, subsanación o cancelación antes de continuar.";
      case "NO_ADMITIDA":
        return "La etapa no fue admitida. Debe corregirse o decidirse una salida antes de avanzar.";
      default:
        return null;
    }
  }, [currentStageFormalStatus]);

  const contextualStageActions = useMemo(() => {
    switch (currentStageFormalStatus) {
      case "SUSPENDIDA":
        return [STAGE_ACTION_LOOKUP.INICIADA, STAGE_ACTION_LOOKUP.CANCELADA];
      case "APLAZADA":
        return [STAGE_ACTION_LOOKUP.INICIADA, STAGE_ACTION_LOOKUP.SUSPENDIDA, STAGE_ACTION_LOOKUP.CANCELADA];
      case "REINTENTO":
        return [STAGE_ACTION_LOOKUP.SUBSANADA, STAGE_ACTION_LOOKUP.APLAZADA, STAGE_ACTION_LOOKUP.SUSPENDIDA, STAGE_ACTION_LOOKUP.CANCELADA];
      case "SUBSANADA":
        return [STAGE_ACTION_LOOKUP.REINTENTO, STAGE_ACTION_LOOKUP.APLAZADA, STAGE_ACTION_LOOKUP.SUSPENDIDA, STAGE_ACTION_LOOKUP.CANCELADA];
      case "FALLIDA":
      case "NO_ADMITIDA":
        return [STAGE_ACTION_LOOKUP.REINTENTO, STAGE_ACTION_LOOKUP.SUBSANADA, STAGE_ACTION_LOOKUP.CANCELADA];
      case "CANCELADA":
        return [];
      case "COMPLETADA":
        return [];
      case "EN_PROCESO":
      case "INICIADA":
      default:
        return STAGE_EXCEPTION_ACTIONS;
    }
  }, [currentStageFormalStatus]);

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
    timeline:  actualizaciones.length + stageEvents.length || null,
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
        contentContainerStyle={[
          styles.content,
          desktop && styles.desktopContent,
          {
            paddingBottom: insets.bottom + (desktop ? 28 : 40),
            paddingHorizontal: desktop ? metrics.gutter : 16,
          },
        ]}
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
        <View style={[styles.contentShell, desktop && { maxWidth: shellWidth }]}>
        <View style={[styles.desktopLayout, desktop && styles.desktopLayoutActive]}>
        {desktop && (
          <View style={styles.desktopAside}>
            <ClienteInfoSection proceso={proceso} rol={rol} />

            <LawyersSection
              proceso={proceso}
              rol={rol}
              currentLawyerId={user?.profile?.id!}
              onAddAsistente={() => router.push({ pathname: "/case/add-responsable", params: { procesoId: proceso.id } })}
              onTransferirCaso={() => router.push({ pathname: "/case/transferir" as any, params: { procesoId: proceso.id } })}
            />

            {(rol === "abogado" || rol === "bufete") && (
              <View style={styles.ownershipSection}>
                <Pressable
                  style={styles.ownershipHeader}
                  onPress={() => setOwnershipExpanded(v => !v)}
                  hitSlop={8}
                >
                  <View style={styles.ownershipHeaderLeft}>
                    <View style={styles.ownershipIconWrap}>
                      <Ionicons name="swap-horizontal-outline" size={14} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.ownershipTitle}>Historial de propiedad</Text>
                  </View>
                  <Ionicons
                    name={ownershipExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.textTertiary}
                  />
                </Pressable>
                {ownershipExpanded && (
                  <ProcessAccessPanel
                    procesoId={proceso.id}
                    isOwner={rol === "abogado" || rol === "bufete"}
                  />
                )}
              </View>
            )}

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
          </View>
        )}

        <View style={styles.mainColumn}>
        {!desktop && <ClienteInfoSection proceso={proceso} rol={rol} />}

        {!desktop && (
          <LawyersSection
            proceso={proceso}
            rol={rol}
            currentLawyerId={user?.profile?.id!}
            onAddAsistente={() => router.push({ pathname: "/case/add-responsable", params: { procesoId: proceso.id } })}
            onTransferirCaso={() => router.push({ pathname: "/case/transferir" as any, params: { procesoId: proceso.id } })}
          />
        )}

        {!desktop && (rol === "abogado" || rol === "bufete") && (
          <View style={styles.ownershipSection}>
            <Pressable
              style={styles.ownershipHeader}
              onPress={() => setOwnershipExpanded(v => !v)}
              hitSlop={8}
            >
              <View style={styles.ownershipHeaderLeft}>
                <View style={styles.ownershipIconWrap}>
                  <Ionicons name="swap-horizontal-outline" size={14} color={Colors.textSecondary} />
                </View>
                <Text style={styles.ownershipTitle}>Historial de propiedad</Text>
              </View>
              <Ionicons
                name={ownershipExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textTertiary}
              />
            </Pressable>
            {ownershipExpanded && (
              <ProcessAccessPanel
                procesoId={proceso.id}
                isOwner={rol === "abogado" || rol === "bufete"}
              />
            )}
          </View>
        )}

        <FeatureGate featureCode="etapas_procesales">
          {legalStages && (
            <LegalStageStepper
              data={legalStages}
              canAdvance={false}
              ultimosEstadosPorEtapa={ultimosEstadosPorEtapa}
              selectedStageCode={stageFilter}
              onShowHistorial={() => {
                setEtapaHistorialFocus(null);
                setEtapaHistorialOpen(true);
              }}
              onShowStageHistory={(etapa) => {
                setEtapaHistorialFocus(etapa.codigo);
                setEtapaHistorialOpen(true);
              }}
              onStagePress={(etapa) => {
                handleStageFilter(etapa.codigo);
              }}
            />
          )}
        </FeatureGate>

        {focusedStage && (
          <View style={styles.stageFocusCard}>
            <View style={styles.stageFocusHeader}>
              <View style={styles.stageFocusHeaderMain}>
                <View style={[styles.stageFocusDot, { backgroundColor: focusedStage.color || Colors.primary }]} />
                <View style={styles.stageFocusCopy}>
                  <Text style={styles.stageFocusEyebrow}>Etapa actual</Text>
                  <Text style={styles.stageFocusTitle}>{focusedStage.nombre}</Text>
                  {!!focusedStage.descripcion && (
                    <Text style={styles.stageFocusDescription}>{focusedStage.descripcion}</Text>
                  )}
                </View>
              </View>

              <View style={styles.stageFocusHeaderMeta}>
                <View style={[styles.stageFocusBadge, { backgroundColor: (focusedStage.color || Colors.primary) + "18" }]}>
                  <Text style={[styles.stageFocusBadgeText, { color: focusedStage.color || Colors.primary }]}>
                    {focusedStageStatus}
                  </Text>
                </View>
                {focusedStage.diasRestantes != null && (
                  <View style={styles.stageFocusSecondaryBadge}>
                    <Text style={styles.stageFocusSecondaryBadgeText}>
                      {focusedStage.diasRestantes < 0
                        ? `${Math.abs(focusedStage.diasRestantes)} d vencida`
                        : `${focusedStage.diasRestantes} d restantes`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.stageFocusMetrics}>
              <View style={styles.stageFocusMetric}>
                <Text style={styles.stageFocusMetricValue}>{tareasData?.progreso.total ?? 0}</Text>
                <Text style={styles.stageFocusMetricLabel}>tareas visibles</Text>
              </View>
              <View style={styles.stageFocusMetric}>
                <Text style={styles.stageFocusMetricValue}>{stageEvents.length}</Text>
                <Text style={styles.stageFocusMetricLabel}>eventos de etapa</Text>
              </View>
              <View style={styles.stageFocusMetric}>
                <Text style={styles.stageFocusMetricValue}>{stageDocumentsCount}</Text>
                <Text style={styles.stageFocusMetricLabel}>documentos</Text>
              </View>
            </View>

            <View style={styles.stageRouteNote}>
              <Ionicons name="map-outline" size={15} color={Colors.primary} />
              <Text style={styles.stageRouteNoteText}>
                Sigue esta ruta: define tareas, agrega documentos si aplica, registra actividad relevante y al final avanza la etapa.
              </Text>
            </View>

            {focusedStageIncident && (
              <View style={[styles.stageIncidentCard, { backgroundColor: focusedStageIncident.tone + "12", borderColor: focusedStageIncident.tone + "26" }]}>
                <View style={styles.stageIncidentHeader}>
                  <View style={[styles.stageIncidentIconWrap, { backgroundColor: focusedStageIncident.tone + "20" }]}>
                    <Ionicons name={focusedStageIncident.icon} size={16} color={focusedStageIncident.tone} />
                  </View>
                  <View style={styles.stageIncidentCopy}>
                    <Text style={[styles.stageIncidentTitle, { color: focusedStageIncident.tone }]}>
                      {focusedStageIncident.label}
                    </Text>
                    <Text style={styles.stageIncidentText}>
                      {focusedStageIncident.help}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {(rol === "abogado" || rol === "bufete") && stageFilter && (
              <View style={styles.stageFocusQuickRow}>
                <Pressable
                  style={styles.stageQuickBtn}
                  onPress={() => {
                    setStageCreateLegalStage(stageFilter);
                    setStageCreateTarea(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.stageQuickBtnText}>Crear tarea en esta etapa</Text>
                </Pressable>

                <Pressable
                  style={styles.stageQuickBtn}
                  onPress={() => handlePickDocument("PROCESAL", stageFilter)}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
                  <Text style={styles.stageQuickBtnText}>Subir documento a esta etapa</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!desktop && (rol === "abogado" || rol === "bufete") && (
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
                  color={isActive ? Colors.white : Colors.textTertiary}
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

        {activeTab === "timeline" && (
          <View style={styles.activityStack}>
            {stageFilter && (
              <View style={styles.activitySection}>
                <View style={styles.activitySectionHeader}>
                  <View>
                    <Text style={styles.activitySectionTitle}>Actividad específica de la etapa</Text>
                    <Text style={styles.activitySectionSubtitle}>
                      Eventos y notas operativas registrados dentro de {focusedStage?.nombre ?? "la etapa seleccionada"}.
                    </Text>
                  </View>
                  <View style={styles.activitySectionBadge}>
                    <Text style={styles.activitySectionBadgeText}>{stageEvents.length}</Text>
                  </View>
                </View>

                {stageEvents.length === 0 ? (
                  <View style={styles.activityEmptyCard}>
                    <Ionicons name="time-outline" size={20} color={Colors.textTertiary} />
                    <Text style={styles.activityEmptyText}>Aún no hay eventos registrados en esta etapa.</Text>
                  </View>
                ) : (
                  <View style={styles.eventsContainer}>
                    {stageEvents.map((ev, idx) => (
                      <View key={ev.id} style={styles.eventRow}>
                        <View style={styles.eventLine}>
                          <View style={styles.eventDotWrap}>
                            <Ionicons name="time-outline" size={10} color={Colors.white} />
                          </View>
                          {idx < stageEvents.length - 1 && <View style={styles.eventConnector} />}
                        </View>
                        <View style={styles.eventCard}>
                          <Text style={styles.eventDesc}>{ev.descripcion}</Text>
                          <Text style={styles.eventTime}>
                            {new Date(ev.createdAt).toLocaleDateString("es-CO", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.activitySection}>
              <View style={styles.activitySectionHeader}>
                <View>
                  <Text style={styles.activitySectionTitle}>Actividad general del proceso</Text>
                  <Text style={styles.activitySectionSubtitle}>
                    Actualizaciones amplias del expediente, incluyendo movimiento documental y novedades generales.
                  </Text>
                </View>
                <View style={styles.activitySectionBadge}>
                  <Text style={styles.activitySectionBadgeText}>{actualizaciones.length}</Text>
                </View>
              </View>

              <TimelineSection
                proceso={proceso}
                rol={rol}
                actualizaciones={actualizaciones}
                actualizacionesLoading={actualizacionesLoading}
                onDelete={handleDeleteActualizacion}
              />
            </View>
          </View>
        )}

        {activeTab === "documents" && (
          <View style={styles.flowSectionHeader}>
            <Text style={styles.flowSectionTitle}>Documentos y soporte</Text>
            <Text style={styles.flowSectionSubtitle}>
              Evidencia y archivos asociados a la etapa enfocada o al proceso completo.
            </Text>
          </View>
        )}

        {activeTab === "documents" && (
          <DocumentsSection
            rol={rol}
            documentos={documentos}
            onUpload={(tipoDocumento) => handlePickDocument(tipoDocumento, stageFilter)}
            onDelete={handleDeleteDocumento}
            onDownload={handleDownloadDocumento}
            onFilterChange={(tipoDocumento) => {
              setTipoDocumentoFilter(tipoDocumento);
              // Reload documents with new filter
              if (proceso) {
                getDocumentos(proceso.id, stageFilter, tipoDocumento).then(setDocumentos).catch(() => {});
              }
            }}
          />
        )}

        {activeTab === "tareas" && (
          <View style={styles.flowSectionHeader}>
            <Text style={styles.flowSectionTitle}>Que sigue en esta etapa</Text>
            <Text style={styles.flowSectionSubtitle}>
              Tareas y trabajo pendiente para mover el proceso con claridad desde la etapa actual.
            </Text>
          </View>
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

        {(rol === "abogado" || rol === "bufete") && legalStages?.siguienteEtapa && isViewingCurrentStage && (
          <View style={styles.advanceStageCard}>
            <View style={styles.advanceStageHeader}>
              <Text style={styles.advanceStageTitle}>Resolver etapa</Text>
              <Text style={styles.advanceStageSubtitle}>
                Cuando termines el trabajo de esta etapa, define como continúa el proceso: avanzar normalmente o registrar una incidencia formal.
              </Text>
            </View>
            {currentStageFormalStatus && (
              <View style={styles.advanceStageStatusCard}>
                <View style={styles.advanceStageStatusHeader}>
                  <Ionicons name="git-branch-outline" size={16} color={Colors.primary} />
                  <Text style={styles.advanceStageStatusTitle}>Estado formal actual</Text>
                </View>
                <Text style={styles.advanceStageStatusValue}>{STAGE_ACTION_LOOKUP[currentStageFormalStatus].label}</Text>
                {advanceBlockedReason && (
                  <Text style={styles.advanceStageStatusHelp}>{advanceBlockedReason}</Text>
                )}
              </View>
            )}
            <View style={styles.advanceStageChecks}>
              <View style={styles.advanceStageCheck}>
                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.advanceStageCheckText}>1. Tareas y pendientes de la etapa</Text>
              </View>
              <View style={styles.advanceStageCheck}>
                <Ionicons name="document-text-outline" size={15} color={Colors.primary} />
                <Text style={styles.advanceStageCheckText}>2. Documentos y soporte si aplican</Text>
              </View>
              <View style={styles.advanceStageCheck}>
                <Ionicons name="time-outline" size={15} color={Colors.primary} />
                <Text style={styles.advanceStageCheckText}>3. Actividad o notas relevantes</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.advanceStageBtn, pressed && canAdvanceCurrentStage && { opacity: 0.86 }, !canAdvanceCurrentStage && styles.advanceStageBtnDisabled]}
              onPress={() => setShowChangeStage(true)}
              disabled={!canAdvanceCurrentStage}
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.advanceStageBtnText}>Avanzar a: {legalStages.siguienteEtapa.nombre}</Text>
            </Pressable>
            {contextualStageActions.length > 0 && (
              <View style={styles.advanceStageSecondary}>
                <Text style={styles.advanceStageSecondaryTitle}>
                  {currentStageFormalStatus === "SUSPENDIDA"
                    ? "Acciones disponibles para reactivar o cerrar"
                    : currentStageFormalStatus === "APLAZADA"
                    ? "Acciones disponibles para retomar la etapa"
                    : currentStageFormalStatus === "FALLIDA" || currentStageFormalStatus === "NO_ADMITIDA"
                    ? "La etapa requiere una decisión antes de continuar"
                    : "Si la etapa no siguio un curso normal"}
                </Text>
                <View style={styles.advanceStageSecondaryGrid}>
                  {contextualStageActions.map((item) => (
                    <Pressable
                      key={item.estado}
                      style={styles.advanceStageSecondaryBtn}
                      onPress={() => {
                        setSelectedStageDecision(item.estado);
                        setStageDecisionNote("");
                        setStageDecisionOpen(true);
                      }}
                    >
                      <Text style={styles.advanceStageSecondaryBtnText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {(rol === "abogado" || rol === "bufete") && legalStages?.siguienteEtapa && !isViewingCurrentStage && currentOperationalStage && (
          <View style={styles.advanceStageInfoCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <View style={styles.advanceStageInfoCopy}>
              <Text style={styles.advanceStageInfoTitle}>Estas consultando otra etapa</Text>
              <Text style={styles.advanceStageInfoText}>
                La resolucion solo aplica sobre la etapa actual del proceso: {currentOperationalStage.nombre}.
              </Text>
            </View>
            <Pressable
              style={styles.advanceStageInfoBtn}
              onPress={() => handleStageFilter(currentOperationalStage.codigo)}
            >
              <Text style={styles.advanceStageInfoBtnText}>Volver a etapa actual</Text>
            </Pressable>
          </View>
        )}
        </View>
        </View>
        </View>
      </ScrollView>

      {/* ── Change Stage Modal ── */}
      {legalStages && (
        <ChangeStageModal
          visible={showChangeStage}
          etapaActual={legalStages.etapaActual}
          siguienteEtapa={legalStages.siguienteEtapa}
          onConfirm={handleAdvanceStage}
          onClose={() => setShowChangeStage(false)}
          pendingTasks={pendingStageTasks.map((tarea) => ({
            id: tarea.id,
            titulo: tarea.titulo,
            estado: tarea.estado,
            prioridad: tarea.prioridad,
          }))}
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

      <Modal
        visible={stageDecisionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStageDecisionOpen(false)}
      >
        <View style={styles.stageDecisionOverlay}>
          <View style={styles.stageDecisionCard}>
            <View style={styles.stageDecisionHeader}>
              <Text style={styles.stageDecisionTitle}>
                {selectedStageDecision ? STAGE_ACTION_LOOKUP[selectedStageDecision]?.label ?? "Registrar incidencia" : "Registrar incidencia"}
              </Text>
              <Pressable onPress={() => setStageDecisionOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.stageDecisionHelp}>
              {selectedStageDecision ? STAGE_ACTION_LOOKUP[selectedStageDecision]?.help ?? "Registra una incidencia formal para esta etapa." : "Registra una incidencia formal para esta etapa."}
            </Text>
            <Text style={styles.stageDecisionLabel}>Observacion juridica</Text>
            <TextInput
              style={styles.stageDecisionInput}
              value={stageDecisionNote}
              onChangeText={setStageDecisionNote}
              placeholder="Describe brevemente la decision o la incidencia ocurrida..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
            <View style={styles.stageDecisionActions}>
              <Pressable
                style={styles.stageDecisionCancel}
                onPress={() => setStageDecisionOpen(false)}
                disabled={stageDecisionSaving}
              >
                <Text style={styles.stageDecisionCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.stageDecisionSave, stageDecisionSaving && { opacity: 0.7 }]}
                onPress={handleStageIncident}
                disabled={stageDecisionSaving}
              >
                {stageDecisionSaving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.stageDecisionSaveText}>Guardar decision</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* ── Etapa Historial Timeline ── */}
      {proceso && (
        <EtapaHistorialTimeline
          procesoId={proceso.id}
          visible={etapaHistorialOpen}
          onClose={() => setEtapaHistorialOpen(false)}
          canEdit={rol === "abogado" || rol === "bufete"}
          focusEtapa={etapaHistorialFocus}
        />
      )}
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
  content: { padding: 16, gap: 14 },
  desktopContent: { paddingTop: 18, paddingBottom: 28 },
  contentShell: { width: "100%", alignSelf: "center" },
  desktopLayout: { width: "100%" },
  desktopLayoutActive: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  mainColumn: { flex: 1, minWidth: 0, maxWidth: 920, gap: 14 },
  desktopAside: { width: 360, gap: 14 },
  stageFocusCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stageFocusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  stageFocusHeaderMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  stageFocusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  stageFocusCopy: {
    flex: 1,
    gap: 4,
  },
  stageFocusEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  stageFocusTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  stageFocusDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  stageFocusHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stageFocusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stageFocusBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  stageFocusSecondaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
  },
  stageFocusSecondaryBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageFocusMetrics: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  stageFocusMetric: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    gap: 2,
  },
  stageFocusMetricValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  stageFocusMetricLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageRouteNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary + "0D",
    borderWidth: 1,
    borderColor: Colors.primary + "18",
  },
  stageRouteNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageIncidentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },
  stageIncidentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stageIncidentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stageIncidentCopy: {
    flex: 1,
    gap: 3,
  },
  stageIncidentTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stageIncidentText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageFocusQuickRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    paddingTop: 2,
  },
  stageQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.primary + "10",
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  stageQuickBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 5,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
  },
  tabBadge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.borderLight,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.textTertiary,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  // ── Ownership history section ──
  ownershipSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  ownershipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  ownershipHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ownershipIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  ownershipTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },

  // ── Community post link ──
  communityRow: {},
  communityBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1,
  },
  communityBtnLinked: {
    backgroundColor: Colors.primary + "08",
    borderColor: Colors.primary + "25",
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
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  stageChipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  stageChipText: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
  },
  stageChipTextActive: {
    color: Colors.white, fontFamily: "Inter_600SemiBold",
  },

  // ── Stage events inline (timeline con filtro activo) ──
  activityStack: {
    gap: 14,
  },
  activitySection: {
    gap: 10,
  },
  activitySectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  activitySectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  activitySectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: 620,
  },
  activitySectionBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "12",
  },
  activitySectionBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  activityEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  activityEmptyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  flowSectionHeader: {
    gap: 4,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  flowSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  flowSectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: 640,
  },
  advanceStageCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  advanceStageHeader: {
    gap: 4,
  },
  advanceStageChecks: {
    gap: 8,
  },
  advanceStageStatusCard: {
    borderRadius: 14,
    padding: 13,
    gap: 4,
    backgroundColor: Colors.primary + "0D",
    borderWidth: 1,
    borderColor: Colors.primary + "18",
  },
  advanceStageStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  advanceStageStatusTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  advanceStageStatusValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  advanceStageStatusHelp: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  advanceStageCheck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  advanceStageCheckText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  advanceStageTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  advanceStageSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: 680,
  },
  advanceStageBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  advanceStageBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  advanceStageBtnDisabled: {
    opacity: 0.48,
  },
  advanceStageSecondary: {
    gap: 10,
  },
  advanceStageSecondaryTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  advanceStageSecondaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  advanceStageSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advanceStageSecondaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  advanceStageInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advanceStageInfoCopy: {
    flex: 1,
    gap: 2,
  },
  advanceStageInfoTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  advanceStageInfoText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  advanceStageInfoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.primary + "12",
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  advanceStageInfoBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  stageDecisionOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.36)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  stageDecisionCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  stageDecisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stageDecisionTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  stageDecisionHelp: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  stageDecisionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  stageDecisionInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    textAlignVertical: "top",
  },
  stageDecisionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  stageDecisionCancel: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  stageDecisionCancelText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  stageDecisionSave: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stageDecisionSaveText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  eventsContainer: {
    paddingHorizontal: 16, paddingTop: 8, gap: 0,
  },
  emptyFilter: {
    textAlign: "center", color: Colors.textTertiary,
    fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 32,
  },
  eventRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
  },
  eventLine: {
    width: 28, alignItems: "center",
  },
  eventDotWrap: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    marginTop: 14,
  },
  eventConnector: {
    width: 1, flex: 1, backgroundColor: Colors.borderLight, minHeight: 12,
  },
  eventCard: {
    flex: 1, backgroundColor: Colors.white,
    borderRadius: 14, padding: 12,
    marginLeft: 0, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  eventDesc: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text,
  },
  eventTime: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 4,
  },
});
