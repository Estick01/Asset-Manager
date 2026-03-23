import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { TareaItem } from "./TareaItem";
import { ProgressBar } from "./ProgressBar";
import { CrearTareaModal } from "./CrearTareaModal";
import { EditarTareaModal } from "./EditarTareaModal";
import { StyledModal } from "../StyledModal";
import { completarTarea, cambiarEstadoTarea } from "@/lib/services/tareaService";
import type { TareaResponseDTO, TareaEstado, TareasProgresoDTO } from "@/shared/schema";
import { toast } from "sonner-native";

type FilterEstado = "todas" | TareaEstado;

interface Props {
  procesoId: string;
  data: TareasProgresoDTO;
  /** Called when data should be refreshed */
  onRefresh: () => void;
  /** Show "Nueva tarea" button — false for clients */
  canCreate?: boolean;
  /** Show edit button on task press — false for clients / responsable-only users */
  canEdit?: boolean;
  /** Profile ID of the current user (to show delete button only to creator) */
  currentProfileId?: string;
}

const FILTERS: { value: FilterEstado; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
];

export function TareasList({ procesoId, data, onRefresh, canCreate = false, canEdit = false, currentProfileId }: Props) {
  const [filter, setFilter] = useState<FilterEstado>("todas");
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarea, setEditTarea] = useState<TareaResponseDTO | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tareaToAdvance, setTareaToAdvance] = useState<TareaResponseDTO | null>(null);

  const filtered = filter === "todas"
    ? data.tareas
    : data.tareas.filter((t) => t.estado === filter);

  const handleToggle = useCallback(async (tarea: TareaResponseDTO) => {
    if (loadingId) return;
    setLoadingId(tarea.id);
    try {
      if (tarea.estado === "completada") {
        await cambiarEstadoTarea(tarea.id, { estado: "en_progreso" });
      } else {
        await completarTarea(tarea.id);
      }
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar tarea");
    } finally {
      setLoadingId(null);
    }
  }, [loadingId, onRefresh]);

  const handlePress = useCallback((tarea: TareaResponseDTO) => {
    if (canEdit && tarea.estado !== "cancelada") {
      setEditTarea(tarea);
    } else {
      Alert.alert(tarea.titulo, tarea.descripcion ?? "Sin descripción");
    }
  }, [canEdit]);

  const handleAdvance = useCallback((tarea: TareaResponseDTO) => {
    if (loadingId) return;

    if (tarea.estado === "pendiente") {
      setTareaToAdvance(tarea);
    } else if (tarea.estado === "en_progreso") {
      if (tarea.asignado?.id !== currentProfileId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error("Error al completar tarea", {
          description: `La tarea está asignada a ${tarea.asignado?.nombre}`,
          duration: 4000,
        });
        return;
      }
      setLoadingId(tarea.id);
      completarTarea(tarea.id)
        .then(() => onRefresh())
        .catch((err) => toast.error(err instanceof Error ? err.message : "Error al completar tarea"))
        .finally(() => setLoadingId(null));
    }
  }, [loadingId, onRefresh]);

  const confirmAdvance = useCallback(async () => {
    if (!tareaToAdvance || loadingId) return;

    setLoadingId(tareaToAdvance.id);
    setTareaToAdvance(null);
    try {
      await cambiarEstadoTarea(tareaToAdvance.id, { estado: "en_progreso" });
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar tarea");
    } finally {
      setLoadingId(null);
    }
  }, [tareaToAdvance, loadingId, onRefresh]);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <ProgressBar
        total={data.progreso.total}
        completadas={data.progreso.completadas}
        porcentaje={data.progreso.porcentaje}
      />

      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Tareas</Text>
        {canCreate && (
          <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Nueva</Text>
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const count = f.value === "todas"
            ? data.tareas.length
            : data.tareas.filter((t) => t.estado === f.value).length;
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, active && { color: "#1B5A8C" }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-outline" size={36} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin tareas</Text>
          <Text style={styles.emptySubtitle}>
            {filter === "todas"
              ? canCreate
                ? 'Crea la primera tarea con "Nueva"'
                : "Aún no hay tareas en este proceso"
              : `No hay tareas en estado "${filter}"`}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((t) => (
            <View key={t.id} style={{ opacity: loadingId === t.id ? 0.5 : 1 }}>
              {loadingId === t.id && (
                <ActivityIndicator
                  size="small"
                  color="#1B5A8C"
                  style={styles.itemLoader}
                />
              )}
              <TareaItem
                tarea={t}
                onToggleComplete={handleToggle}
                onPress={handlePress}
                onAdvance={handleAdvance}
              />
            </View>
          ))}
        </View>
      )}

      {/* Crear modal */}
      <CrearTareaModal
        visible={modalVisible}
        procesoId={procesoId}
        onClose={() => setModalVisible(false)}
        onCreated={() => onRefresh()}
      />

      {/* Editar modal */}
      <EditarTareaModal
        visible={editTarea !== null}
        tarea={editTarea}
        currentProfileId={currentProfileId}
        onClose={() => setEditTarea(null)}
        onUpdated={() => { setEditTarea(null); onRefresh(); }}
        onDeleted={() => { setEditTarea(null); onRefresh(); }}
      />

      {/* Modal de confirmación para pasar tarea a En progreso */}
      <StyledModal
        visible={tareaToAdvance !== null}
        onClose={() => setTareaToAdvance(null)}
        title="Tomar tarea"
        onConfirm={confirmAdvance}
        confirmText="Tomar tarea"
        cancelText="Cancelar"
      >
        <Text style={{ fontSize: 14, color: "#374151" }}>
          Al pasar esta tarea a En progreso, será asignada automáticamente a ti. ¿Continuar?
        </Text>
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#111827" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1B5A8C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#EFF6FF", borderColor: "#1B5A8C" },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#6B7280" },
  chipTextActive: { color: "#1B5A8C", fontFamily: "Inter_600SemiBold" },
  chipBadge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  chipBadgeActive: { backgroundColor: "#DBEAFE" },
  chipBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#6B7280" },

  list: { gap: 0 },
  itemLoader: { position: "absolute", right: 14, top: 14, zIndex: 10 },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#374151" },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
});
