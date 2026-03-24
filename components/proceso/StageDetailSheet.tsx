// components/proceso/StageDetailSheet.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO, StageEventResponseDTO, TareaResponseDTO } from "@/shared/schema";
import { getStageEvents, addStageNote } from "@/lib/services/stageEventService";
import { getTareasByProceso } from "@/lib/services/tareaService";
import { apiRequest } from "@/lib/apiClient";

type Tab = "tareas" | "timeline" | "documentos";

interface Props {
  visible:        boolean;
  procesoId:      string;
  etapa:          EtapaProcesoDTO;
  isCurrentStage: boolean;
  onClose:        () => void;
  onAddTarea?:    (legalStage: string) => void;
  onUploadDoc?:   (legalStage: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  baja:    "#27AE7A",
  media:   "#F5A623",
  alta:    "#E05252",
  urgente: "#9B1C1C",
};

const EVENT_ICONS: Record<string, string> = {
  etapa_iniciada:    "rocket-outline",
  etapa_completada:  "flag-outline",
  tarea_completada:  "checkmark-circle-outline",
  documento_subido:  "document-outline",
  nota:              "create-outline",
};

export function StageDetailSheet({
  visible, procesoId, etapa, isCurrentStage, onClose, onAddTarea, onUploadDoc,
}: Props) {
  const insets          = useSafeAreaInsets();
  const [tab, setTab]   = useState<Tab>("tareas");
  const [tareas,   setTareas]   = useState<TareaResponseDTO[]>([]);
  const [events,   setEvents]   = useState<StageEventResponseDTO[]>([]);
  const [docs,     setDocs]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [nota,     setNota]     = useState("");
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const [tareasData, eventsData, docsData] = await Promise.all([
        getTareasByProceso(procesoId, etapa.codigo),
        getStageEvents(procesoId, etapa.codigo),
        apiRequest("GET", `/api/documentos?procesoId=${procesoId}&stage=${etapa.codigo}`)
          .then(r => r.json())
          .catch(() => []),
      ]);
      setTareas(tareasData?.tareas ?? []);
      setEvents(eventsData);
      setDocs(Array.isArray(docsData) ? docsData : []);
    } catch {
      // silent — data stays as empty arrays
    } finally {
      setLoading(false);
    }
  }, [visible, procesoId, etapa.codigo]);

  useEffect(() => { load(); }, [load]);

  const completadas = tareas.filter(t => t.estado === "completada").length;
  const total       = tareas.length;
  const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const sendNote = async () => {
    if (!nota.trim() || sending) return;
    setSending(true);
    try {
      await addStageNote(procesoId, etapa.codigo, nota.trim());
      setNota("");
      const e = await getStageEvents(procesoId, etapa.codigo);
      setEvents(e);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "tareas",     label: "Tareas",     icon: "checkmark-circle-outline" },
    { key: "timeline",   label: "Timeline",   icon: "time-outline" },
    { key: "documentos", label: "Documentos", icon: "document-outline" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.stageDot, { backgroundColor: etapa.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.etapaNombre}>{etapa.nombre}</Text>
            {etapa.completada && (
              <Text style={styles.etapaCompletada}>Etapa completada</Text>
            )}
            {etapa.esActual && (
              <Text style={styles.etapaActual}>Etapa actual</Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color="#9AAABB" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={13}
                color={tab === t.key ? Colors.primary : "#9AAABB"}
              />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} />
        ) : (
          <>
            {/* Tab: Tareas */}
            {tab === "tareas" && (
              <View style={{ flex: 1 }}>
                {total > 0 && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.progressText}>{completadas}/{total} completadas</Text>
                  </View>
                )}
                <FlatList
                  data={tareas}
                  keyExtractor={t => t.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
                  renderItem={({ item: t }) => (
                    <View style={styles.tareaRow}>
                      <View style={[
                        styles.estadoChip,
                        t.estado === "completada"  && { backgroundColor: "#D1FAE5" },
                        t.estado === "en_progreso" && { backgroundColor: "#FEF3C7" },
                        t.estado === "pendiente"   && { backgroundColor: "#F3F4F6" },
                      ]}>
                        <Text style={styles.estadoText}>{t.estado}</Text>
                      </View>
                      <View style={[
                        styles.priorityDot,
                        { backgroundColor: PRIORITY_COLORS[t.prioridad] ?? "#9AAABB" },
                      ]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tareaTitulo}>{t.titulo}</Text>
                      </View>
                      {t.requerida && (
                        <View style={styles.reqBadge}>
                          <Ionicons name="lock-closed" size={9} color={Colors.primaryDark} />
                          <Text style={styles.reqText}>Requerida</Text>
                        </View>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin tareas en esta etapa</Text>
                  }
                />
                {isCurrentStage && (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => onAddTarea?.(etapa.codigo)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Añadir tarea</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Tab: Timeline */}
            {tab === "timeline" && (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={events}
                  keyExtractor={e => e.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}
                  renderItem={({ item: e }) => (
                    <View style={styles.eventRow}>
                      <View style={styles.eventIcon}>
                        <Ionicons
                          name={(EVENT_ICONS[e.tipo] ?? "ellipse-outline") as any}
                          size={14}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventDesc}>{e.descripcion}</Text>
                        <Text style={styles.eventTime}>
                          {new Date(e.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin eventos en esta etapa</Text>
                  }
                />
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Añadir nota..."
                    value={nota}
                    onChangeText={setNota}
                    multiline
                  />
                  <Pressable
                    style={[styles.sendBtn, (!nota.trim() || sending) && { opacity: 0.4 }]}
                    onPress={sendNote}
                    disabled={!nota.trim() || sending}
                  >
                    {sending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="send" size={14} color="#fff" />
                    }
                  </Pressable>
                </View>
              </View>
            )}

            {/* Tab: Documentos */}
            {tab === "documentos" && (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={docs}
                  keyExtractor={d => d.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
                  renderItem={({ item: d }) => (
                    <View style={styles.tareaRow}>
                      <Ionicons name="document-outline" size={16} color="#9AAABB" />
                      <Text style={[styles.tareaTitulo, { flex: 1 }]}>{d.nombre ?? d.name ?? "Documento"}</Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin documentos en esta etapa</Text>
                  }
                />
                {isCurrentStage && (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => onUploadDoc?.(etapa.codigo)}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Subir documento</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "78%", minHeight: 300,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#F0F2F4",
  },
  stageDot:          { width: 12, height: 12, borderRadius: 6 },
  etapaNombre:       { fontSize: 15, fontWeight: "700", color: "#1B2B3B" },
  etapaActual:       { fontSize: 11, color: Colors.primary, marginTop: 2 },
  etapaCompletada:   { fontSize: 11, color: Colors.success, marginTop: 2 },
  tabRow: {
    flexDirection: "row", paddingHorizontal: 12,
    paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: "#F0F2F4",
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F4F6F8",
  },
  tabBtnActive:   { backgroundColor: Colors.surfaceSecondary },
  tabLabel:       { fontSize: 12, color: "#6B7B8D" },
  tabLabelActive: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  progressWrap:   { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  progressBar:    { height: 4, backgroundColor: "#E8ECF0", borderRadius: 2, overflow: "hidden" },
  progressFill:   { height: "100%", backgroundColor: Colors.primary, borderRadius: 2 },
  progressText:   { fontSize: 11, color: "#6B7B8D", textAlign: "right" },
  tareaRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  estadoChip:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  estadoText:  { fontSize: 10, fontWeight: "600", color: "#374151" },
  tareaTitulo: { fontSize: 13, color: "#1B2B3B" },
  reqBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#E0E7FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  reqText:    { fontSize: 9, color: Colors.primaryDark, fontWeight: "600" },
  eventRow:   { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eventIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
  },
  eventDesc:  { fontSize: 13, color: "#1B2B3B" },
  eventTime:  { fontSize: 10, color: "#9AAABB", marginTop: 2 },
  noteRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4",
  },
  noteInput: {
    flex: 1, backgroundColor: "#F4F6F8", borderRadius: 10, padding: 10,
    fontSize: 13, color: "#1B2B3B", maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  emptyText:  { textAlign: "center", color: "#9AAABB", fontSize: 13, marginTop: 24 },
});
