import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Linking, Alert, ActivityIndicator, TextInput, useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  getProceso, getActualizaciones, getDocumentos, getDocumentoDownloadUrl,
} from "@/lib/services/procesoService";
import { getLegalStages } from "@/lib/services/legalStageService";
import { getAllStageEvents } from "@/lib/services/stageEventService";
import { getUltimoEstadoPorEtapa } from "@/lib/services/proceso-etapa-historial.service";
import { type ProcesoDTO, type Documento, type LegalStagesResponseDTO, type StageEventResponseDTO, type EtapaEstado } from "@/shared/schema";
import { type ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";
import { useUnifiedAuth } from "@/lib/auth-context";
import { getOrCreateConversation } from "@/lib/services/chatService";
import { LegalStageStepper } from "@/components/proceso/LegalStageStepper";
import EtapaHistorialTimeline from "@/components/proceso/EtapaHistorialTimeline";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

const PORTAL_BLUE      = "#1B5A8C";
const PORTAL_BLUE_DARK = "#0D3B66";

const STAGE_INCIDENT_META: Partial<Record<EtapaEstado, { label: string; tone: string; icon: keyof typeof Ionicons.glyphMap; help: string }>> = {
  SUSPENDIDA: {
    label: "Etapa suspendida",
    tone: Colors.danger,
    icon: "pause-circle-outline",
    help: "La etapa sigue detenida temporalmente hasta que el abogado la retome formalmente.",
  },
  APLAZADA: {
    label: "Etapa aplazada",
    tone: Colors.warning,
    icon: "calendar-outline",
    help: "La etapa continua en curso, pero con una reprogramacion o demora registrada.",
  },
  REINTENTO: {
    label: "Etapa en reintento",
    tone: PORTAL_BLUE,
    icon: "refresh-circle-outline",
    help: "Esta etapa tuvo que repetirse o retomarse antes de seguir avanzando.",
  },
  SUBSANADA: {
    label: "Subsanacion registrada",
    tone: Colors.info,
    icon: "build-outline",
    help: "Se registro una subsanacion dentro de esta etapa y el proceso sigue en revision.",
  },
  CANCELADA: {
    label: "Etapa cancelada",
    tone: Colors.danger,
    icon: "close-circle-outline",
    help: "La etapa se cerro de forma excepcional y no siguio su curso normal.",
  },
};

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  activo:     { color: Colors.success,      label: "Activo" },
  en_tramite: { color: Colors.warning,      label: "En Trámite" },
  finalizado: { color: Colors.info,         label: "Finalizado" },
  archivado:  { color: Colors.textTertiary, label: "Archivado" },
};

function getFileConfig(tipo: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  if (tipo.includes("pdf"))                                                       return { icon: "document-text",  color: "#EF4444", bg: "#FEF2F2" };
  if (tipo.includes("image"))                                                     return { icon: "image",           color: "#8B5CF6", bg: "#F5F3FF" };
  if (tipo.includes("word") || tipo.includes("doc"))                              return { icon: "document",        color: "#3B82F6", bg: "#EFF6FF" };
  if (tipo.includes("sheet") || tipo.includes("excel") || tipo.includes("csv"))  return { icon: "grid",            color: "#10B981", bg: "#F0FDF4" };
  if (tipo.includes("zip") || tipo.includes("rar"))                               return { icon: "archive",         color: "#F59E0B", bg: "#FFFBEB" };
  return { icon: "attach", color: "#6B7280", bg: "#F3F4F6" };
}

function getTipoIcon(tipoNombre: string): keyof typeof Ionicons.glyphMap {
  switch (tipoNombre) {
    case "documento": return "document-text";
    case "nota":      return "create-outline";
    case "llamada":   return "call-outline";
    default:          return "ellipse";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function openUrl(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url);
  }
}

async function handleDownloadDoc(doc: Documento) {
  try {
    const url = await getDocumentoDownloadUrl(doc.id);
    openUrl(url);
  } catch {
    Alert.alert("Error", "No se pudo descargar el documento");
  }
}

async function handleDownloadDocById(documentoId: string) {
  try {
    const url = await getDocumentoDownloadUrl(documentoId);
    openUrl(url);
  } catch {
    Alert.alert("Error", "No se pudo descargar el documento");
  }
}

export default function ClientCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useUnifiedAuth();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const desktopShellWidth = Math.min(1480, Math.max(1120, width - metrics.gutter * 2));

  const [proceso, setProceso] = useState<ProcesoDTO | null>(null);
  const [legalStages, setLegalStages] = useState<LegalStagesResponseDTO | null>(null);
  const [abogado, setAbogado] = useState<{ nombre: string; telefono?: string; email?: string; userId?: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [actualizaciones, setActualizaciones] = useState<ActualizacionRelations[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [stageEvents, setStageEvents] = useState<StageEventResponseDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents">("timeline");
  const [etapaHistorialOpen, setEtapaHistorialOpen] = useState(false);
  const [etapaHistorialFocus, setEtapaHistorialFocus] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [ultimosEstadosPorEtapa, setUltimosEstadosPorEtapa] = useState<Record<string, string>>({});
  const [documentSearch, setDocumentSearch] = useState("");
  const [actualizacionesOffset, setActualizacionesOffset] = useState(0);
  const [actualizacionesLoading, setActualizacionesLoading] = useState(false);
  const [hasMoreActualizaciones, setHasMoreActualizaciones] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const LIMIT = 10;

  const loadData = useCallback(async () => {
    if (!id) return;
    if (isLoadingMoreRef.current) return;
    const p = await getProceso(id);
    setProceso(p);
    if (p) {
      if (p.responsable?.lawyer) {
        const persona = (p.responsable.lawyer as any).persona;
        setAbogado({
          nombre: persona?.nombre && persona?.apellido
            ? `${persona.nombre} ${persona.apellido}`
            : persona?.nombre ?? "Responsable",
          telefono: persona?.telefono || undefined,
          userId: p.responsable.lawyer.userId,
        });
      } else {
        const lawyerEntry = p.lawyers?.find((l: any) => l.rol === "principal" && l.lawyer);
        if (lawyerEntry) {
          setAbogado({
            nombre: lawyerEntry.lawyer.persona?.nombre && lawyerEntry.lawyer.persona?.apellido
              ? `${lawyerEntry.lawyer.persona.nombre} ${lawyerEntry.lawyer.persona.apellido}`
              : lawyerEntry.lawyer.persona?.nombre ?? "Abogado",
            telefono: lawyerEntry.lawyer.persona?.telefono || undefined,
            userId: lawyerEntry.lawyer.userId,
          });
        } else {
          // Proceso gestionado por bufete sin abogado asignado aún
          const firmEntry = p.lawyers?.find((l: any) => l.firm);
          if (firmEntry?.firm) {
            setAbogado({
              nombre: firmEntry.firm.name ?? "Bufete",
              telefono: firmEntry.firm.phone || undefined,
              userId: firmEntry.firm.userId,
            });
          }
        }
      }
      const [acts, docs] = await Promise.all([
        getActualizaciones(p.id, LIMIT, 0),
        getDocumentos(p.id),
      ]);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === LIMIT);
      setDocumentos(docs);
      try {
        const [stages, allEvents] = await Promise.all([
          getLegalStages(p.tipoProceso?.nombre, p.id),
          getAllStageEvents(p.id),
        ]);
        setLegalStages(stages);
        setStageEvents(allEvents);

        try {
          const ultimosEstados = await getUltimoEstadoPorEtapa(p.id);
          const estadosMap: Record<string, string> = {};
          Object.entries(ultimosEstados).forEach(([etapa, registro]) => {
            estadosMap[etapa] = registro.estado;
          });
          setUltimosEstadosPorEtapa(estadosMap);
        } catch (error) {
          console.error('Error loading etapa historial:', error);
          // No fallar si no se puede cargar el historial
        }
      } catch { /* non-critical */ }
    }
  }, [id]);

  const loadMoreActualizaciones = useCallback(async () => {
    if (!proceso || isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) return;
    isLoadingMoreRef.current = true;
    setActualizacionesLoading(true);
    try {
      const newActs = await getActualizaciones(proceso.id, LIMIT, actualizacionesOffset);
      if (newActs.length > 0) {
        setActualizaciones(prev => [...prev, ...newActs]);
        setActualizacionesOffset(prev => prev + newActs.length);
        setHasMoreActualizaciones(newActs.length === LIMIT);
      } else {
        setHasMoreActualizaciones(false);
      }
    } finally {
      setActualizacionesLoading(false);
      isLoadingMoreRef.current = false;
    }
  }, [proceso, hasMoreActualizaciones, actualizacionesOffset, actualizacionesLoading]);

  const handleOpenChat = useCallback(async () => {
    if (!abogado?.userId || !user?.user?.id) return;
    setChatLoading(true);
    try {
      const conv = await getOrCreateConversation(abogado.userId, "lawyer_client");
      router.push({
        pathname: "/chat/[id]",
        params: { id: conv.id, name: abogado.nombre, from: "/portal/case", userId: abogado.userId },
      });
    } catch {
      Alert.alert("Error", "No se pudo abrir el chat. Intenta de nuevo.");
    } finally {
      setChatLoading(false);
    }
  }, [abogado, user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleStageFilter = useCallback((stage: string | null) => {
    setStageFilter(stage);
  }, []);

  // Cuando hay filtro activo, historial = stageEvents de esa etapa (tienen legalStageCode exacto).
  // Sin filtro, historial = actualizaciones normales.
  const stageEventsForFilter = useMemo(() => {
    if (!stageFilter) return [];
    return stageEvents.filter(e => e.legalStageCode === stageFilter);
  }, [stageEvents, stageFilter]);

  const focusedStage = useMemo(() => {
    if (!legalStages) return null;
    if (stageFilter) {
      return legalStages.etapas.find((etapa) => etapa.codigo === stageFilter) ?? null;
    }
    return legalStages.etapaActual ?? null;
  }, [legalStages, stageFilter]);

  const focusedStageStatus = useMemo(() => {
    if (!focusedStage) return null;
    if (focusedStage.esActual) return "Etapa actual";
    if (focusedStage.completada) return "Etapa completada";
    return "Etapa previa";
  }, [focusedStage]);

  const focusedStageIncident = useMemo(() => {
    if (!focusedStage) return null;
    const ultimoEstado = ultimosEstadosPorEtapa[focusedStage.codigo] as EtapaEstado | undefined;
    if (!ultimoEstado) return null;
    return STAGE_INCIDENT_META[ultimoEstado] ?? null;
  }, [focusedStage, ultimosEstadosPorEtapa]);

  const stageDocumentsCount = useMemo(() => {
    if (!stageFilter) return documentos.length;
    return documentos.filter((doc) => doc.legalStage === stageFilter).length;
  }, [documentos, stageFilter]);

  useEffect(() => {
    if (!legalStages?.etapaActual || stageFilter) return;
    setStageFilter(legalStages.etapaActual.codigo);
  }, [legalStages, stageFilter]);

  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={PORTAL_BLUE} />
      </View>
    );
  }

  const estadoConfig = ESTADO_CONFIG[proceso.estado?.codigo || "archivado"] ?? ESTADO_CONFIG.archivado;
  const filteredDocs = documentos.filter(d => {
    const matchesStage = !stageFilter || d.legalStage === stageFilter;
    const matchesSearch = !documentSearch ||
      d.nombre?.toLowerCase().includes(documentSearch.toLowerCase()) ||
      d.descripcion?.toLowerCase().includes(documentSearch.toLowerCase());
    return matchesStage && matchesSearch;
  });


  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollShell,
          desktop && { paddingBottom: metrics.gutter, paddingHorizontal: metrics.gutter },
        ]}
        onScroll={({ nativeEvent }) => {
          if (isLoadingMoreRef.current || !hasMoreActualizaciones || actualizacionesLoading) return;
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 100) {
            loadMoreActualizaciones();
          }
        }}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header gradiente ── */}
        <LinearGradient
          colors={[PORTAL_BLUE_DARK, PORTAL_BLUE]}
          style={[
            styles.header,
            desktop && styles.desktopHeader,
            {
              paddingTop: insets.top + (desktop ? 36 : Platform.OS === "web" ? 67 : 16),
              paddingHorizontal: desktop ? metrics.gutter : 20,
            },
          ]}
        >
          <View style={[styles.headerShell, desktop && { maxWidth: desktopShellWidth }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </Pressable>
              <Text style={styles.headerTitle}>Detalle del Proceso</Text>
              <View style={{ width: 38 }} />
            </View>

            {/* Radicado + estado */}
            <View style={[styles.headerCard, desktop && styles.desktopHeaderCard]}>
              <View style={styles.headerCardLeft}>
                {desktop && <Text style={styles.desktopHeaderEyebrow}>Portal del cliente</Text>}
                <Text style={styles.radicado}>{proceso.radicado}</Text>
                <Text style={styles.tipoProceso}>{proceso.tipoProceso?.nombre || "Proceso"}</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.color + "20" }]}>
                <View style={[styles.estadoDot, { backgroundColor: estadoConfig.color }]} />
                <Text style={[styles.estadoText, { color: estadoConfig.color }]}>
                  {estadoConfig.label}
                </Text>
              </View>
            </View>

            {/* Summary row */}
            <View style={[styles.summaryRow, desktop && styles.desktopSummaryRow]}>
              <View style={styles.summaryItem}>
                <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.summaryText} numberOfLines={1}>{proceso.juzgado}</Text>
              </View>
              {abogado && (
                <View style={styles.summaryItem}>
                  <Ionicons name="briefcase-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.summaryText} numberOfLines={1}>{abogado.nombre}</Text>
                </View>
              )}
              {desktop && (
                <View style={styles.summaryItem}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", {
                      year: "numeric", month: "short", day: "numeric"
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, desktop && { paddingHorizontal: metrics.gutter }]}>
          <View style={[styles.contentShell, desktop && { maxWidth: desktopShellWidth }]}>
          <View style={[styles.contentLayout, desktop && styles.desktopContentLayout]}>
          <View style={styles.mainColumn}>
          {/* ── Info card ── */}
          <View style={styles.infoCard}>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <View style={[styles.infoIconWrap, { backgroundColor: PORTAL_BLUE + "12" }]}>
                <Ionicons name="business-outline" size={18} color={PORTAL_BLUE} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Juzgado</Text>
                <Text style={styles.infoValue}>{proceso.juzgado}</Text>
              </View>
            </View>

            {abogado && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.success + "12" }]}>
                  <Ionicons name="person-outline" size={18} color={Colors.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {proceso.responsable ? "Abogado responsable" : "Abogado asignado"}
                  </Text>
                  <Text style={styles.infoValue}>{abogado.nombre}</Text>
                  {proceso.responsable?.asignadoPorNombre && (
                    <Text style={styles.infoSubValue}>
                      Asignado por {proceso.responsable.asignadoPorNombre}
                    </Text>
                  )}
                </View>
                {abogado.userId && (
                  <Pressable
                    onPress={handleOpenChat}
                    style={[styles.contactBtn, chatLoading && { opacity: 0.6 }]}
                    hitSlop={8}
                    disabled={chatLoading}
                  >
                    {chatLoading
                      ? <ActivityIndicator size="small" color={PORTAL_BLUE} />
                      : <Ionicons name="chatbubble-outline" size={18} color={PORTAL_BLUE} />
                    }
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: Colors.warning + "12" }]}>
                <Ionicons name="calendar-outline" size={18} color={Colors.warning} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Inicio del proceso</Text>
                <Text style={styles.infoValue}>
                  {new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", {
                    year: "numeric", month: "long", day: "numeric"
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Hechos jurídicamente relevantes ── */}
          {!!proceso.descripcionEstado && (
            <View style={styles.descripcionCard}>
              <View style={styles.descripcionHeader}>
                <Ionicons name="document-text-outline" size={16} color={PORTAL_BLUE} />
                <Text style={styles.descripcionLabel}>Descripción de los hechos jurídicamente relevantes</Text>
              </View>
              <Text style={styles.descripcionText}>{proceso.descripcionEstado}</Text>
            </View>
          )}

          {/* ── Etapa procesal ── */}
          {legalStages && (
            <LegalStageStepper
              data={legalStages}
              canAdvance={false}
              ultimosEstadosPorEtapa={ultimosEstadosPorEtapa}
              selectedStageCode={stageFilter}
              onShowStageHistory={(etapa) => {
                setEtapaHistorialFocus(etapa.codigo);
                setEtapaHistorialOpen(true);
              }}
              onStagePress={(etapa) => handleStageFilter(etapa.codigo)}
            />
          )}

          {focusedStage && (
            <View style={styles.stageFocusCard}>
              <View style={styles.stageFocusHeader}>
                <View style={styles.stageFocusHeaderMain}>
                  <View style={[styles.stageFocusDot, { backgroundColor: focusedStage.color || PORTAL_BLUE }]} />
                  <View style={styles.stageFocusCopy}>
                    <Text style={styles.stageFocusEyebrow}>Etapa actual</Text>
                    <Text style={styles.stageFocusTitle}>{focusedStage.nombre}</Text>
                    {!!focusedStage.descripcion && (
                      <Text style={styles.stageFocusDescription}>{focusedStage.descripcion}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.stageFocusHeaderMeta}>
                  <View style={[styles.stageFocusBadge, { backgroundColor: (focusedStage.color || PORTAL_BLUE) + "18" }]}>
                    <Text style={[styles.stageFocusBadgeText, { color: focusedStage.color || PORTAL_BLUE }]}>
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
                  <Text style={styles.stageFocusMetricValue}>{stageEventsForFilter.length}</Text>
                  <Text style={styles.stageFocusMetricLabel}>eventos de etapa</Text>
                </View>
                <View style={styles.stageFocusMetric}>
                  <Text style={styles.stageFocusMetricValue}>{stageDocumentsCount}</Text>
                  <Text style={styles.stageFocusMetricLabel}>documentos visibles</Text>
                </View>
                <View style={styles.stageFocusMetric}>
                  <Text style={styles.stageFocusMetricValue}>{actualizaciones.length}</Text>
                  <Text style={styles.stageFocusMetricLabel}>actualizaciones</Text>
                </View>
              </View>

              <View style={styles.stageGuideCard}>
                <View style={styles.stageGuideHeader}>
                  <Ionicons name="compass-outline" size={16} color={PORTAL_BLUE} />
                  <Text style={styles.stageGuideTitle}>Que mirar ahora</Text>
                </View>
                <Text style={styles.stageGuideText}>
                  Revise primero la actividad reciente de esta etapa. Si necesita soporte o archivos, luego consulte los documentos relacionados.
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

            </View>
          )}

          <View style={styles.contentSwitchRow}>
            <Pressable
              style={[styles.contentSwitchBtn, activeTab === "timeline" && styles.contentSwitchBtnActive]}
              onPress={() => setActiveTab("timeline")}
            >
              <Ionicons name="time-outline" size={15} color={activeTab === "timeline" ? Colors.white : PORTAL_BLUE} />
              <Text style={[styles.contentSwitchText, activeTab === "timeline" && styles.contentSwitchTextActive]}>
                Actividad
              </Text>
            </Pressable>

            <Pressable
              style={[styles.contentSwitchBtn, activeTab === "documents" && styles.contentSwitchBtnActive]}
              onPress={() => setActiveTab("documents")}
            >
              <Ionicons name="folder-open-outline" size={15} color={activeTab === "documents" ? Colors.white : PORTAL_BLUE} />
              <Text style={[styles.contentSwitchText, activeTab === "documents" && styles.contentSwitchTextActive]}>
                Documentos
              </Text>
            </Pressable>
          </View>

          <View style={styles.scopeCard}>
            <Ionicons name={stageFilter ? "flag-outline" : "layers-outline"} size={16} color={PORTAL_BLUE} />
            <Text style={styles.scopeCardText}>
              {stageFilter && focusedStage
                ? `Esta viendo el seguimiento de la etapa ${focusedStage.nombre}.`
                : "Esta viendo el seguimiento general de todo el proceso."}
            </Text>
          </View>

          {/* ── Tab: Timeline ── */}
          {activeTab === "timeline" && (
            <View style={styles.activityStack}>
              {stageFilter && (
                <View style={styles.activitySection}>
                  <View style={styles.activitySectionHeader}>
                    <View>
                      <Text style={styles.activitySectionTitle}>Actividad específica de la etapa</Text>
                      <Text style={styles.activitySectionSubtitle}>
                        Eventos registrados dentro de {focusedStage?.nombre ?? "la etapa seleccionada"}.
                      </Text>
                    </View>
                    <View style={styles.activitySectionBadge}>
                      <Text style={styles.activitySectionBadgeText}>{stageEventsForFilter.length}</Text>
                    </View>
                  </View>

                  {stageEventsForFilter.length === 0 ? (
                    <View style={styles.activityEmptyCard}>
                      <Ionicons name="time-outline" size={20} color={Colors.textTertiary} />
                      <Text style={styles.activityEmptyText}>No hay eventos registrados en esta etapa procesal.</Text>
                    </View>
                  ) : (
                    <View>
                      {stageEventsForFilter.map((ev, idx) => (
                        <View key={ev.id} style={styles.timelineItem}>
                          <View style={styles.timelineLine}>
                            <View style={[
                              styles.timelineDot,
                              idx === 0 && { backgroundColor: PORTAL_BLUE },
                              ev.tipo === "documento_subido" && { backgroundColor: Colors.accent },
                            ]}>
                              <Ionicons
                                name={
                                  ev.tipo === "etapa_iniciada"   ? "flag-outline"            :
                                  ev.tipo === "etapa_completada" ? "checkmark-circle-outline" :
                                  ev.tipo === "documento_subido" ? "attach"                   :
                                  ev.tipo === "tarea_completada" ? "checkmark-done-outline"   :
                                  "create-outline"
                                }
                                size={9}
                                color={Colors.white}
                              />
                            </View>
                            {idx < stageEventsForFilter.length - 1 && <View style={styles.timelineConnector} />}
                          </View>
                          <View style={[
                            styles.timelineCard,
                            idx === 0 && { borderWidth: 1, borderColor: PORTAL_BLUE + "25" },
                          ]}>
                            <View style={styles.timelineCardHeader}>
                              <Text style={styles.timelineDate}>
                                {new Date(ev.createdAt).toLocaleDateString("es-CO", {
                                  day: "numeric", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </Text>
                            </View>
                            <Text style={styles.timelineTitle}>{ev.descripcion}</Text>
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
                      Actualizaciones globales del expediente y novedades del proceso completo.
                    </Text>
                  </View>
                  <View style={styles.activitySectionBadge}>
                    <Text style={styles.activitySectionBadgeText}>{actualizaciones.length}</Text>
                  </View>
                </View>

                {actualizaciones.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                      <Ionicons name="time-outline" size={32} color={PORTAL_BLUE} />
                    </View>
                    <Text style={styles.emptyTitle}>Sin actualizaciones</Text>
                    <Text style={styles.emptySubtitle}>Las actualizaciones del proceso aparecerán aquí</Text>
                  </View>
                ) : (
                  <View>
                    {actualizaciones.map((act, idx) => (
                      <View key={act.id} style={styles.timelineItem}>
                        <View style={styles.timelineLine}>
                          <View style={[
                            styles.timelineDot,
                            idx === 0 && { backgroundColor: PORTAL_BLUE },
                            act.tipo?.nombre === "documento" && { backgroundColor: Colors.accent },
                          ]}>
                            <Ionicons
                              name={getTipoIcon(act.tipo?.nombre ?? "")}
                              size={9}
                              color={Colors.white}
                            />
                          </View>
                          {idx < actualizaciones.length - 1 && <View style={styles.timelineConnector} />}
                        </View>
                        <View style={[
                          styles.timelineCard,
                          idx === 0 && { borderWidth: 1, borderColor: PORTAL_BLUE + "25" },
                        ]}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={styles.timelineDate}>
                              {new Date(act.fecha).toLocaleDateString("es-CO", {
                                day: "numeric", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </Text>
                            {act.tipo?.nombre === "documento" && (
                              <View style={styles.docBadge}>
                                <Ionicons name="attach" size={11} color={Colors.accent} />
                                <Text style={styles.docBadgeText}>Documento</Text>
                                {act.documentoId && (
                                  <Pressable
                                    onPress={() => act.documentoId && handleDownloadDocById(act.documentoId)}
                                    hitSlop={4}
                                  >
                                    <Ionicons name="download-outline" size={11} color={Colors.accent} />
                                  </Pressable>
                                )}
                              </View>
                            )}
                          </View>
                          <Text style={styles.timelineTitle}>{act.titulo}</Text>
                          {!!act.descripcion && (
                            <Text style={styles.timelineDesc}>{act.descripcion}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                    {actualizacionesLoading && (
                      <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={PORTAL_BLUE} />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === "documents" && (
            <View style={styles.flowSectionHeader}>
              <Text style={styles.flowSectionTitle}>Documentos y soporte</Text>
              <Text style={styles.flowSectionSubtitle}>
                Archivos y evidencias vinculados a la etapa enfocada o al proceso completo.
              </Text>
            </View>
          )}

          {/* ── Tab: Documentos ── */}
          {activeTab === "documents" && (
            <>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={17} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar documentos..."
                  placeholderTextColor={Colors.textTertiary}
                  value={documentSearch}
                  onChangeText={setDocumentSearch}
                />
                {documentSearch.length > 0 && (
                  <Pressable onPress={() => setDocumentSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={Colors.textTertiary} />
                  </Pressable>
                )}
              </View>

              {filteredDocs.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="folder-open-outline" size={32} color={PORTAL_BLUE} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {documentSearch ? "Sin resultados" : stageFilter ? "Sin documentos en esta etapa" : "Sin documentos"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {documentSearch
                      ? "Intenta con otro término"
                      : stageFilter
                        ? "No hay documentos registrados para esta etapa procesal"
                        : "Los documentos del proceso aparecerán aquí"
                    }
                  </Text>
                </View>
              ) : (
                filteredDocs.map(doc => {
                  const fileConf = getFileConfig(doc.tipo);
                  return (
                    <Pressable
                      key={doc.id}
                      style={({ pressed }) => [styles.docCard, pressed && styles.docCardPressed]}
                      onPress={() => handleDownloadDoc(doc)}
                    >
                      <View style={[styles.docIconWrap, { backgroundColor: fileConf.bg }]}>
                        <Ionicons name={fileConf.icon} size={22} color={fileConf.color} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docName} numberOfLines={1}>{doc.nombre}</Text>
                        <View style={styles.docMeta}>
                          <Text style={styles.docMetaText}>{formatFileSize(doc.tamano)}</Text>
                          <View style={styles.docMetaDot} />
                          <Text style={styles.docMetaText}>
                            {new Date(doc.fechaSubida).toLocaleDateString("es-CO", {
                              month: "short", day: "numeric", year: "numeric"
                            })}
                          </Text>
                          {!!(doc as any).legalStage && (
                            <>
                              <View style={styles.docMetaDot} />
                              <Text style={[styles.docMetaText, { color: PORTAL_BLUE, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                                {(doc as any).legalStage}
                              </Text>
                            </>
                          )}
                        </View>
                        {doc.descripcion && (
                          <Text style={styles.docDescription} numberOfLines={1}>{doc.descripcion}</Text>
                        )}
                      </View>
                      <View style={[styles.downloadBtn, { backgroundColor: fileConf.color + "15" }]}>
                        <Ionicons name="download-outline" size={18} color={fileConf.color} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          </View>

          {desktop && (
            <View style={styles.desktopAside}>
              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Resumen</Text>
                <Text style={styles.desktopAsideTitle}>Estado actual</Text>
                <View style={styles.desktopMetaList}>
                  <View style={styles.desktopMetaRow}>
                    <Text style={styles.desktopMetaKey}>Proceso</Text>
                    <Text style={styles.desktopMetaValue}>{proceso.tipoProceso?.nombre || "Proceso"}</Text>
                  </View>
                  <View style={styles.desktopMetaRow}>
                    <Text style={styles.desktopMetaKey}>Estado</Text>
                    <Text style={styles.desktopMetaValue}>{estadoConfig.label}</Text>
                  </View>
                  <View style={styles.desktopMetaRow}>
                    <Text style={styles.desktopMetaKey}>Documentos</Text>
                    <Text style={styles.desktopMetaValue}>{documentos.length}</Text>
                  </View>
                  <View style={styles.desktopMetaRow}>
                    <Text style={styles.desktopMetaKey}>Actualizaciones</Text>
                    <Text style={styles.desktopMetaValue}>{actualizaciones.length}</Text>
                  </View>
                </View>
              </View>

              {abogado && (
                <View style={styles.desktopAsideCard}>
                  <Text style={styles.desktopAsideLabel}>Responsable</Text>
                  <Text style={styles.desktopAsideTitle}>{abogado.nombre}</Text>
                  <Text style={styles.desktopAsideText}>
                    {proceso.responsable ? "Abogado responsable del proceso." : "Profesional asignado para tu caso."}
                  </Text>
                  {abogado.userId && (
                    <Pressable
                      onPress={handleOpenChat}
                      style={[styles.desktopPrimaryAction, chatLoading && { opacity: 0.6 }]}
                      disabled={chatLoading}
                    >
                      {chatLoading
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.white} />
                      }
                      <Text style={styles.desktopPrimaryActionText}>Abrir chat</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Siguiente paso</Text>
                <Text style={styles.desktopAsideText}>
                  Empiece por la actividad de la etapa actual. Si necesita respaldo, pase despues a documentos.
                </Text>
                <View style={styles.desktopAsideTabs}>
                  <Pressable style={[styles.desktopAsideTab, activeTab === "timeline" && styles.desktopAsideTabActive]} onPress={() => setActiveTab("timeline")}>
                    <Text style={[styles.desktopAsideTabText, activeTab === "timeline" && styles.desktopAsideTabTextActive]}>Actividad</Text>
                  </Pressable>
                  <Pressable style={[styles.desktopAsideTab, activeTab === "documents" && styles.desktopAsideTabActive]} onPress={() => setActiveTab("documents")}>
                    <Text style={[styles.desktopAsideTabText, activeTab === "documents" && styles.desktopAsideTabTextActive]}>Documentos</Text>
                  </Pressable>
                  <Pressable
                    style={styles.desktopAsideTab}
                    onPress={() => {
                      setEtapaHistorialFocus(stageFilter);
                      setEtapaHistorialOpen(true);
                    }}
                  >
                    <Text style={styles.desktopAsideTabText}>Historial formal</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          </View>
          </View>
        </View>
      </ScrollView>

      {proceso && (
        <EtapaHistorialTimeline
          procesoId={proceso.id}
          visible={etapaHistorialOpen}
          onClose={() => setEtapaHistorialOpen(false)}
          canEdit={false}
          focusEtapa={etapaHistorialFocus}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  scrollShell: { paddingBottom: 48 },

  // ── Header ──────────────────────────────────────────────────
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  desktopHeader: { paddingBottom: 28 },
  headerShell: { width: "100%", alignSelf: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.white },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  desktopHeaderCard: {
    marginBottom: 18,
  },
  headerCardLeft: { flex: 1, marginRight: 12 },
  desktopHeaderEyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  radicado: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white },
  tipoProceso: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)", marginTop: 3,
  },
  estadoBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  estadoDot: { width: 7, height: 7, borderRadius: 3.5 },
  estadoText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", gap: 16 },
  desktopSummaryRow: { gap: 18 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  summaryText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)", flex: 1,
  },

  // ── Content ──────────────────────────────────────────────────
  content: { padding: 16, gap: 14 },
  contentShell: { width: "100%", alignSelf: "center" },
  contentLayout: { width: "100%" },
  desktopContentLayout: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  mainColumn: { flex: 1, minWidth: 0, maxWidth: 920, gap: 16 },
  desktopAside: { width: 340, gap: 16 },
  desktopAsideCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopAsideLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  desktopAsideTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  desktopMetaList: { gap: 10 },
  desktopMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  desktopMetaKey: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
  },
  desktopMetaValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  desktopPrimaryAction: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: PORTAL_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  desktopPrimaryActionText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideTabs: { gap: 8 },
  desktopAsideTab: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  desktopAsideTabActive: {
    backgroundColor: PORTAL_BLUE + "12",
    borderWidth: 1,
    borderColor: PORTAL_BLUE + "25",
  },
  desktopAsideTabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  desktopAsideTabTextActive: {
    color: PORTAL_BLUE,
  },

  // ── Info card ────────────────────────────────────────────────
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 2 },
  infoSubValue: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  contactBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: PORTAL_BLUE + "15",
    alignItems: "center", justifyContent: "center",
  },

  // ── Descripción ──────────────────────────────────────────────
  descripcionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: PORTAL_BLUE,
    gap: 6,
  },
  descripcionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  descripcionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: PORTAL_BLUE },
  descripcionText: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, lineHeight: 20,
  },
  stageFocusCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
    minWidth: 240,
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
  stageGuideCard: {
    borderRadius: 14,
    padding: 13,
    backgroundColor: PORTAL_BLUE + "0E",
    borderWidth: 1,
    borderColor: PORTAL_BLUE + "18",
    gap: 6,
  },
  stageGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageGuideTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: PORTAL_BLUE,
  },
  stageGuideText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageFocusActions: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  stageFocusAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
  },
  stageFocusActionActive: {
    backgroundColor: PORTAL_BLUE,
    borderColor: PORTAL_BLUE,
  },
  stageFocusActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PORTAL_BLUE,
  },
  stageFocusActionTextActive: {
    color: Colors.white,
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
  contentSwitchRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  contentSwitchBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contentSwitchBtnActive: {
    backgroundColor: PORTAL_BLUE,
    borderColor: PORTAL_BLUE,
  },
  contentSwitchText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: PORTAL_BLUE,
  },
  contentSwitchTextActive: {
    color: Colors.white,
  },
  scopeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 2,
  },
  scopeCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
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
    backgroundColor: PORTAL_BLUE + "12",
  },
  activitySectionBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: PORTAL_BLUE,
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

  // ── Timeline ─────────────────────────────────────────────────
  timelineItem: { flexDirection: "row", marginBottom: 10 },
  timelineLine: { width: 28, alignItems: "center" },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.textTertiary,
    alignItems: "center", justifyContent: "center",
    marginTop: 14,
  },
  timelineConnector: { width: 1, flex: 1, backgroundColor: Colors.borderLight },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineDate: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  docBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.accent + "15",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  docBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  timelineTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  timelineDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, marginTop: 5, lineHeight: 18,
  },
  loadingMore: { paddingVertical: 16, alignItems: "center" },
  // ── Documents ────────────────────────────────────────────────
  downloadBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1, fontSize: 14,
    fontFamily: "Inter_400Regular", color: Colors.text,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  docCardPressed: { opacity: 0.82 },
  docIconWrap: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  docMetaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  docMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textTertiary },
  docDescription: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, marginTop: 3,
  },
  // ── Empty ─────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center", paddingVertical: 40, gap: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PORTAL_BLUE + "12",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  emptySubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, textAlign: "center",
  },
});
