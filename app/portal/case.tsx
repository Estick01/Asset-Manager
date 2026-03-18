import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Linking, Alert, ActivityIndicator, TextInput
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  getProceso, getActualizaciones, getDocumentos, getDocumentoDownloadUrl,
} from "@/lib/services/procesoService";
import { type ProcesoDTO, type Documento } from "@/shared/schema";
import { type ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";
import { useUnifiedAuth } from "@/lib/auth-context";
import { getOrCreateConversation } from "@/lib/services/chatService";

const PORTAL_BLUE      = "#1B5A8C";
const PORTAL_BLUE_DARK = "#0D3B66";

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  activo:     { color: Colors.success,      label: "Activo" },
  en_tramite: { color: Colors.warning,      label: "En Trámite" },
  finalizado: { color: Colors.info,         label: "Finalizado" },
  archivado:  { color: Colors.textTertiary, label: "Archivado" },
};

function getFileIcon(tipo: string): keyof typeof Ionicons.glyphMap {
  if (tipo.includes("pdf"))  return "document-text";
  if (tipo.includes("image")) return "image";
  if (tipo.includes("word") || tipo.includes("doc")) return "document";
  return "attach";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function handleDownloadDoc(doc: Documento) {
  try {
    const supported = await Linking.canOpenURL(doc.url);
    if (supported) { await Linking.openURL(doc.url); return; }
    const url = await getDocumentoDownloadUrl(doc.id);
    const fileSupported = await Linking.canOpenURL(url);
    if (fileSupported) await Linking.openURL(url);
    else Alert.alert("Error", "No se puede abrir el documento");
  } catch {
    Alert.alert("Error", "No se pudo descargar el documento");
  }
}

async function handleDownloadDocById(documentoId: string) {
  try {
    const url = await getDocumentoDownloadUrl(documentoId);
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("Error", "No se puede abrir el documento");
  } catch {
    Alert.alert("Error", "No se pudo descargar el documento");
  }
}

export default function ClientCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useUnifiedAuth();

  const [proceso, setProceso] = useState<ProcesoDTO | null>(null);
  const [abogado, setAbogado] = useState<{ nombre: string; telefono?: string; email?: string; userId?: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [actualizaciones, setActualizaciones] = useState<ActualizacionRelations[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents">("timeline");
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
      console.log(p)
      if (p.responsable) {
        setAbogado({
          nombre: `${p.responsable.firstName} ${p.responsable.lastName}`,
          telefono: (p.responsable as any).phone || undefined,
          userId: p.responsable.userId,
        });
      } else {
        const lawyer = p.lawyers?.find((l: any) => l.rol === "principal" && l.lawyer);
        if (lawyer) {
          setAbogado({
            nombre: `${lawyer.lawyer.persona.nombre} ${lawyer.lawyer.persona.apellido}`,
            telefono: lawyer.lawyer.persona.telefono || undefined,
            userId: lawyer.lawyer.userId,
          });
        }
      }
      const acts = await getActualizaciones(p.id, LIMIT, 0);
      setActualizaciones(acts);
      setActualizacionesOffset(acts.length);
      setHasMoreActualizaciones(acts.length === LIMIT);
      setIsInitialLoad(false);
      const docs = await getDocumentos(p.id);
      setDocumentos(docs);
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
        params: { id: conv.id, name: abogado.nombre, from: "/portal/case" },
      });
    } catch {
      Alert.alert("Error", "No se pudo abrir el chat. Intenta de nuevo.");
    } finally {
      setChatLoading(false);
    }
  }, [abogado, user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={PORTAL_BLUE} />
      </View>
    );
  }

  const estadoConfig = ESTADO_CONFIG[proceso.estado?.codigo || "archivado"] ?? ESTADO_CONFIG.archivado;
  const filteredDocs = documentos.filter(d =>
    !documentSearch ||
    d.nombre?.toLowerCase().includes(documentSearch.toLowerCase()) ||
    d.descripcion?.toLowerCase().includes(documentSearch.toLowerCase())
  );


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
          </View>

          {/* ── Tab: Timeline ── */}
          {activeTab === "timeline" && (
            actualizaciones.length === 0 ? (
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
                        idx === 0 && { backgroundColor: PORTAL_BLUE, borderColor: PORTAL_BLUE + "30" },
                        act.tipo?.nombre === "documento" && { backgroundColor: Colors.accent, borderColor: Colors.accent + "30" },
                      ]} />
                      {idx < actualizaciones.length - 1 && <View style={styles.timelineConnector} />}
                    </View>

                    <View style={[
                      styles.timelineCard,
                      idx === 0 && { borderWidth: 1, borderColor: PORTAL_BLUE + "25" },
                    ]}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={styles.timelineDate}>
                          {new Date(act.fecha).toLocaleDateString("es-CO", {
                            year: "numeric", month: "short", day: "numeric"
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
            )
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
                    {documentSearch ? "Sin resultados" : "Sin documentos"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {documentSearch
                      ? "Intenta con otro término"
                      : "Los documentos del proceso aparecerán aquí"
                    }
                  </Text>
                </View>
              ) : (
                filteredDocs.map(doc => (
                  <Pressable
                    key={doc.id}
                    style={({ pressed }) => [styles.docCard, pressed && styles.docCardPressed]}
                    onPress={() => handleDownloadDoc(doc)}
                  >
                    <View style={[styles.cardAccent, { backgroundColor: PORTAL_BLUE }]} />
                    <View style={[styles.docIconWrap, { backgroundColor: PORTAL_BLUE + "12" }]}>
                      <Ionicons name={getFileIcon(doc.tipo)} size={22} color={PORTAL_BLUE} />
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
                      </View>
                      {doc.descripcion && (
                        <Text style={styles.docDescription} numberOfLines={1}>{doc.descripcion}</Text>
                      )}
                    </View>
                    <Ionicons name="download-outline" size={20} color={PORTAL_BLUE} />
                  </Pressable>
                ))
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
  content: { padding: 16, gap: 12 },

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
  timelineItem: { flexDirection: "row", marginBottom: 12 },
  timelineLine: { width: 24, alignItems: "center" },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.border,
    borderWidth: 2, borderColor: Colors.surfaceSecondary,
    marginTop: 18,
  },
  timelineConnector: { width: 2, flex: 1, backgroundColor: Colors.borderLight },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    borderRadius: 14,
    overflow: "hidden",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  docCardPressed: { opacity: 0.8 },
  cardAccent: { width: 4, alignSelf: "stretch" },
  docIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  docInfo: { flex: 1, paddingVertical: 12 },
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