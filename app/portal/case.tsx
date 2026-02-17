import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getProceso, getActualizaciones, getDocumentos, getAbogado, type Proceso, type Actualizacion, type Documento, type Abogado } from "@/lib/storage";

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
  return "attach";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ClientCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [abogado, setAbogado] = useState<Abogado | null>(null);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "documents">("timeline");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!id) return;
        const p = await getProceso(id);
        setProceso(p);
        if (p) {
          const ab = await getAbogado();
          setAbogado(ab);
          const acts = await getActualizaciones(p.id);
          setActualizaciones(acts);
          const docs = await getDocumentos(p.id);
          setDocumentos(docs);
        }
      })();
    }, [id]),
  );

  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const statusColor = ESTADO_COLORS[proceso.estadoActual] || Colors.textTertiary;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle del Proceso</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topCardInfo}>
              <Text style={styles.radicado}>{proceso.radicado}</Text>
              <Text style={styles.tipoProceso}>{proceso.tipoProceso}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: statusColor + "15" }]}>
              <View style={[styles.estadoDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.estadoText, { color: statusColor }]}>{ESTADO_LABELS[proceso.estadoActual]}</Text>
            </View>
          </View>
          {!!proceso.descripcionEstado && <Text style={styles.descripcion}>{proceso.descripcionEstado}</Text>}
        </View>

        <View style={styles.infoCard}>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Juzgado</Text>
              <Text style={styles.infoValue}>{proceso.juzgado}</Text>
            </View>
          </View>
          {abogado && (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Abogado</Text>
                <Text style={styles.infoValue}>{abogado.nombre}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Inicio del proceso</Text>
              <Text style={styles.infoValue}>{new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
            onPress={() => setActiveTab("timeline")}
          >
            <Ionicons name="time-outline" size={18} color={activeTab === "timeline" ? "#1B5A8C" : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}>Linea de Tiempo</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "documents" && styles.tabActive]}
            onPress={() => setActiveTab("documents")}
          >
            <Ionicons name="folder-outline" size={18} color={activeTab === "documents" ? "#1B5A8C" : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === "documents" && styles.tabTextActive]}>
              Documentos{documentos.length > 0 ? ` (${documentos.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {activeTab === "timeline" && (
          <>
            {actualizaciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={36} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Sin actualizaciones</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {actualizaciones.map((act, idx) => (
                  <View key={act.id} style={styles.timelineItem}>
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
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineTitle}>{act.titulo}</Text>
                      {!!act.descripcion && <Text style={styles.timelineDesc}>{act.descripcion}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === "documents" && (
          <>
            {documentos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={36} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Sin documentos</Text>
              </View>
            ) : (
              documentos.map((doc) => (
                <View key={doc.id} style={styles.docCard}>
                  <View style={[styles.docIconWrap, { backgroundColor: "#1B5A8C" + "12" }]}>
                    <Ionicons name={getFileIcon(doc.tipo)} size={24} color="#1B5A8C" />
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
                  </View>
                </View>
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
  tabActive: { backgroundColor: "#1B5A8C" + "12" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  tabTextActive: { color: "#1B5A8C", fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
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
  timelineDotActive: { backgroundColor: "#1B5A8C", borderColor: "#1B5A8C" + "30" },
  timelineDotDocument: { backgroundColor: Colors.accent, borderColor: Colors.accent + "30" },
  timelineConnector: { width: 2, flex: 1, backgroundColor: Colors.border },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
  },
  timelineCardActive: { borderWidth: 1, borderColor: "#1B5A8C" + "30" },
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
});
