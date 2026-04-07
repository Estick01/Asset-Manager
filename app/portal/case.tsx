import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Linking, Alert, ActivityIndicator, TextInput,
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
import { getEtapaHistorial } from "@/lib/services/proceso-etapa-historial.service";
import { type ProcesoDTO, type Documento, type LegalStagesResponseDTO, type StageEventResponseDTO, type EtapaProcesoDTO, type ProcesoEtapaHistorialDTO } from "@/shared/schema";
import { type ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";
import { useUnifiedAuth } from "@/lib/auth-context";
import { getOrCreateConversation } from "@/lib/services/chatService";
import { LegalStageStepper } from "@/components/proceso/LegalStageStepper";

const PORTAL_BLUE      = "#1B5A8C";
const PORTAL_BLUE_DARK = "#0D3B66";

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

  const [proceso, setProceso] = useState<ProcesoDTO | null>(null);
  const [legalStages, setLegalStages] = useState<LegalStagesResponseDTO | null>(null);
  const [abogado, setAbogado] = useState<{ nombre: string; telefono?: string; email?: string; userId?: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [actualizaciones, setActualizaciones] = useState<ActualizacionRelations[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [stageEvents, setStageEvents] = useState<StageEventResponseDTO[]>([]);
  const [etapaHistorial, setEtapaHistorial] = useState<ProcesoEtapaHistorialDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents" | "etapas">("timeline");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [actualizacionesOffset, setActualizacionesOffset] = useState(0);
  const [actualizacionesLoading, setActualizacionesLoading] = useState(false);
  const [hasMoreActualizaciones, setHasMoreActualizaciones] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const LIMIT = 10;

  const loadData = useCallback(async () => {
    if (!id) return;
    if (isLoadingMoreRef.current) return;
    setIsInitialLoad(true);
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
      setIsInitialLoad(false);
      try {
        const [stages, allEvents] = await Promise.all([
          getLegalStages(p.tipoProceso?.nombre, p.id),
          getAllStageEvents(p.id),
        ]);
        setLegalStages(stages);
        setStageEvents(allEvents);

        // Cargar historial de etapas
        try {
          const historial = await getEtapaHistorial(p.id);
          setEtapaHistorial(historial);
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

  // Etapas disponibles: todas hasta la etapa actual (inclusive)
  const etapasDisponibles = useMemo((): EtapaProcesoDTO[] => {
    if (!legalStages) return [];
    const ordenActual = legalStages.etapaActual?.orden ?? 999;
    return legalStages.etapas.filter(e => e.orden <= ordenActual);
  }, [legalStages]);

  // Cuando hay filtro activo, historial = stageEvents de esa etapa (tienen legalStageCode exacto).
  // Sin filtro, historial = actualizaciones normales.
  const stageEventsForFilter = useMemo(() => {
    if (!stageFilter) return [];
    return stageEvents.filter(e => e.legalStageCode === stageFilter);
  }, [stageEvents, stageFilter]);

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
        contentContainerStyle={{ paddingBottom: 48 }}
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
          style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Detalle del Proceso</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Radicado + estado */}
          <View style={styles.headerCard}>
            <View style={styles.headerCardLeft}>
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
          <View style={styles.summaryRow}>
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
          </View>
        </LinearGradient>

        <View style={styles.content}>
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

          {/* ── Etapa procesal ── */}
          {legalStages && (
            <LegalStageStepper
              data={legalStages}
              canAdvance={false}
            />
          )}

          {/* ── Descripción ── */}
          {!!proceso.descripcionEstado && (
            <View style={styles.descripcionCard}>
              <View style={styles.descripcionHeader}>
                <Ionicons name="information-circle-outline" size={16} color={PORTAL_BLUE} />
                <Text style={styles.descripcionLabel}>Estado del proceso</Text>
              </View>
              <Text style={styles.descripcionText}>{proceso.descripcionEstado}</Text>
            </View>
          )}

          {/* ── Quick actions ── */}
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickAction, activeTab === "timeline" && styles.quickActionActive]}
              onPress={() => setActiveTab("timeline")}
            >
              <View style={[styles.quickActionIcon, {
                backgroundColor: activeTab === "timeline" ? Colors.warning : Colors.warning + "15"
              }]}>
                <Ionicons name="time-outline" size={20} color={activeTab === "timeline" ? Colors.white : Colors.warning} />
              </View>
              <Text style={[styles.quickActionText, activeTab === "timeline" && styles.quickActionTextActive]}>
                Historial
              </Text>
            </Pressable>

            <Pressable
              style={[styles.quickAction, activeTab === "documents" && styles.quickActionActive]}
              onPress={() => setActiveTab("documents")}
            >
              <View style={[styles.quickActionIcon, {
                backgroundColor: activeTab === "documents" ? PORTAL_BLUE : PORTAL_BLUE + "15"
              }]}>
                <Ionicons name="folder-open-outline" size={20} color={activeTab === "documents" ? Colors.white : PORTAL_BLUE} />
              </View>
              <Text style={[styles.quickActionText, activeTab === "documents" && styles.quickActionTextActive]}>
                Documentos
              </Text>
              {documentos.length > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{documentos.length}</Text>
                </View>
              )}
            </Pressable>

            {abogado?.userId && (
              <Pressable
                style={[styles.quickAction, chatLoading && { opacity: 0.6 }]}
                onPress={handleOpenChat}
                disabled={chatLoading}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: PORTAL_BLUE + "15" }]}>
                  {chatLoading
                    ? <ActivityIndicator size="small" color={PORTAL_BLUE} />
                    : <Ionicons name="chatbubble-ellipses-outline" size={20} color={PORTAL_BLUE} />
                  }
                </View>
                <Text style={styles.quickActionText}>Mensaje</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.quickAction, activeTab === "etapas" && styles.quickActionActive]}
              onPress={() => setActiveTab("etapas")}
            >
              <View style={[styles.quickActionIcon, {
                backgroundColor: activeTab === "etapas" ? Colors.success : Colors.success + "15"
              }]}>
                <Ionicons name="git-branch-outline" size={20} color={activeTab === "etapas" ? Colors.white : Colors.success} />
              </View>
              <Text style={[styles.quickActionText, activeTab === "etapas" && styles.quickActionTextActive]}>
                Etapas
              </Text>
            </Pressable>
          </View>

          {/* ── Filtro por etapa procesal ── */}
          {etapasDisponibles.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stageFilterRow}
            >
              <Pressable
                style={[styles.stageChip, stageFilter === null && styles.stageChipActive]}
                onPress={() => setStageFilter(null)}
              >
                <Text style={[styles.stageChipText, stageFilter === null && styles.stageChipTextActive]}>
                  Todas
                </Text>
              </Pressable>
              {etapasDisponibles.map(etapa => (
                <Pressable
                  key={etapa.codigo}
                  style={[styles.stageChip, stageFilter === etapa.codigo && styles.stageChipActive]}
                  onPress={() => setStageFilter(prev => prev === etapa.codigo ? null : etapa.codigo)}
                >
                  <Text style={[styles.stageChipText, stageFilter === etapa.codigo && styles.stageChipTextActive]}
                    numberOfLines={1}
                  >
                    {etapa.nombre}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ── Tab: Timeline ── */}
          {activeTab === "timeline" && (() => {
            // Con filtro de etapa: muestra stageEvents de esa etapa (tienen legalStageCode exacto)
            // Sin filtro: muestra actualizaciones normales
            if (stageFilter) {
              if (stageEventsForFilter.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                      <Ionicons name="time-outline" size={32} color={PORTAL_BLUE} />
                    </View>
                    <Text style={styles.emptyTitle}>Sin historial en esta etapa</Text>
                    <Text style={styles.emptySubtitle}>No hay eventos registrados para esta etapa procesal</Text>
                  </View>
                );
              }
              return (
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
              );
            }

            // Sin filtro: actualizaciones normales
            if (actualizaciones.length === 0) {
              return (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="time-outline" size={32} color={PORTAL_BLUE} />
                  </View>
                  <Text style={styles.emptyTitle}>Sin actualizaciones</Text>
                  <Text style={styles.emptySubtitle}>Las actualizaciones del proceso aparecerán aquí</Text>
                </View>
              );
            }
            return (
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
            );
          })()}

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

          {/* ── Tab: Etapas ── */}
          {activeTab === "etapas" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Historial de Etapas</Text>
                <Text style={styles.sectionSubtitle}>
                  Seguimiento completo del progreso del proceso
                </Text>
              </View>

              {etapaHistorial.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="git-branch-outline" size={48} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateTitle}>Sin historial de etapas</Text>
                  <Text style={styles.emptyStateText}>
                    El historial de cambios en las etapas aparecerá aquí
                  </Text>
                </View>
              ) : (
                <View style={styles.etapasTimeline}>
                  {etapaHistorial
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((registro, index) => {
                      const isLast = index === etapaHistorial.length - 1;
                      const getEstadoColor = (estado: string) => {
                        switch (estado) {
                          case 'COMPLETADA': return Colors.success;
                          case 'INICIADA':
                          case 'EN_PROCESO': return Colors.primary;
                          case 'NO_ADMITIDA':
                          case 'FALLIDA':
                          case 'CANCELADA': return Colors.danger;
                          case 'SUBSANADA':
                          case 'REINTENTO': return Colors.warning;
                          case 'APLAZADA': return Colors.info;
                          case 'SUSPENDIDA': return Colors.textSecondary;
                          default: return Colors.textSecondary;
                        }
                      };

                      const getEstadoIcon = (estado: string) => {
                        switch (estado) {
                          case 'COMPLETADA': return 'checkmark-circle';
                          case 'NO_ADMITIDA':
                          case 'FALLIDA':
                          case 'CANCELADA': return 'close-circle';
                          case 'APLAZADA': return 'pause-circle';
                          case 'REINTENTO': return 'refresh-circle';
                          case 'SUBSANADA': return 'arrow-undo-circle';
                          default: return 'ellipse';
                        }
                      };

                      const formatFecha = (fecha: string) => {
                        return new Date(fecha).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      };

                      return (
                        <View key={registro.id} style={styles.etapaTimelineItem}>
                          {/* Línea vertical */}
                          <View style={styles.etapaTimelineConnector}>
                            <View style={[styles.etapaTimelineDot, { backgroundColor: getEstadoColor(registro.estado) }]} />
                            {!isLast && <View style={styles.etapaTimelineLine} />}
                          </View>

                          {/* Contenido */}
                          <View style={styles.etapaTimelineContent}>
                            <View style={styles.etapaTimelineHeader}>
                              <View style={[styles.etapaEstadoBadge, { backgroundColor: getEstadoColor(registro.estado) + "20" }]}>
                                <Ionicons name={getEstadoIcon(registro.estado) as any} size={14} color={getEstadoColor(registro.estado)} />
                                <Text style={[styles.etapaEstadoText, { color: getEstadoColor(registro.estado) }]}>
                                  {registro.estado.replace('_', ' ')}
                                </Text>
                              </View>
                              <Text style={styles.etapaFechaText}>{formatFecha(registro.fecha)}</Text>
                            </View>

                            <View style={styles.etapaBadge}>
                              <Ionicons name="document-text-outline" size={12} color={Colors.primary} />
                              <Text style={styles.etapaNombreText}>{registro.etapa}</Text>
                            </View>

                            {registro.observacion && (
                              <Text style={styles.etapaObservacionText}>{registro.observacion}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },

  // ── Header ──────────────────────────────────────────────────
  header: { paddingHorizontal: 20, paddingBottom: 20 },
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
  headerCardLeft: { flex: 1, marginRight: 12 },
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
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  summaryText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)", flex: 1,
  },

  // ── Content ──────────────────────────────────────────────────
  content: { padding: 16, gap: 14 },

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

  // ── Quick actions ────────────────────────────────────────────
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionActive: {
    borderWidth: 1.5,
    borderColor: PORTAL_BLUE + "30",
  },
  quickActionIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  quickActionText: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
  },
  quickActionTextActive: { color: PORTAL_BLUE, fontFamily: "Inter_600SemiBold" },
  quickActionBadge: {
    position: "absolute",
    top: 8, right: 8,
    backgroundColor: PORTAL_BLUE,
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  quickActionBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.white },

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

  // ── Etapas ────────────────────────────────────────────────────
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  etapasTimeline: {
    gap: 16,
  },
  etapaTimelineItem: {
    flexDirection: "row",
  },
  etapaTimelineConnector: {
    alignItems: "center",
    width: 40,
  },
  etapaTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  etapaTimelineLine: {
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
    marginTop: 8,
  },
  etapaTimelineContent: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
  },
  etapaTimelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  etapaEstadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  etapaEstadoText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  etapaFechaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  etapaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  etapaNombreText: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  etapaObservacionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

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

  // ── Filtro por etapa ─────────────────────────────────────────
  stageFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  stageChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stageChipActive: {
    backgroundColor: PORTAL_BLUE,
    borderColor: PORTAL_BLUE,
  },
  stageChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  stageChipTextActive: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
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