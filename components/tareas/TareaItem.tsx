import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StyledModal } from "../StyledModal";
import type { TareaResponseDTO, TareaEstado, TareaPrioridad } from "@/shared/schema";

const PRIORIDAD_CONFIG: Record<TareaPrioridad, { color: string; label: string }> = {
  baja:    { color: "#6B7280", label: "Baja" },
  media:   { color: "#3B82F6", label: "Media" },
  alta:    { color: "#F97316", label: "Alta" },
  urgente: { color: "#EF4444", label: "Urgente" },
};

const ESTADO_CONFIG: Record<TareaEstado, { color: string; bg: string; label: string }> = {
  pendiente:   { color: "#6B7280", bg: "#F3F4F6", label: "Pendiente" },
  en_progreso: { color: "#3B82F6", bg: "#EFF6FF", label: "En progreso" },
  completada:  { color: "#22C55E", bg: "#F0FDF4", label: "Completada" },
  cancelada:   { color: "#EF4444", bg: "#FEF2F2", label: "Cancelada" },
};

interface Props {
  tarea: TareaResponseDTO;
  onToggleComplete: (tarea: TareaResponseDTO) => void;
  onPress: (tarea: TareaResponseDTO) => void;
  onAdvance?: (tarea: TareaResponseDTO) => void;
}

export function TareaItem({ tarea, onToggleComplete, onPress, onAdvance }: Props) {
  const [showReopenModal, setShowReopenModal] = useState(false);
  const prioridad   = PRIORIDAD_CONFIG[tarea.prioridad];
  const estado      = ESTADO_CONFIG[tarea.estado];
  const isCancelled = tarea.estado === "cancelada";
  const isCompleted = tarea.estado === "completada";
  const canToggle   = !isCancelled;

  const advanceLabel =
    tarea.estado === "pendiente"   ? "Tomar tarea →" :
    tarea.estado === "en_progreso" ? "Terminar →" : null;

  const hasSubs  = (tarea.subtareasTotal ?? 0) > 0;
  const hasObs   = (tarea.observacionesTotal ?? 0) > 0;
  const hasFiles = (tarea.archivosTotal ?? 0) > 0;
  const subsDone = tarea.subtareasCompletadas ?? 0;
  const subsTotal = tarea.subtareasTotal ?? 0;
  const subsAllDone = hasSubs && subsDone === subsTotal;

  function handleToggle() {
    if (!canToggle) return;
    if (isCompleted) setShowReopenModal(true);
  }

  function confirmReopen() {
    setShowReopenModal(false);
    onToggleComplete(tarea);
  }

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onPress(tarea)}
      >
        {/* Left accent stripe */}
        <View style={[styles.accent, { backgroundColor: prioridad.color }]} />

        {/* Checkbox */}
        <Pressable onPress={handleToggle} style={styles.checkbox} hitSlop={8}>
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
          ) : isCancelled ? (
            <Ionicons name="close-circle" size={22} color="#EF4444" />
          ) : (
            <Ionicons name="ellipse-outline" size={22} color="#D1D5DB" />
          )}
        </Pressable>

        <View style={styles.content}>
          {/* Title */}
          <Text
            style={[styles.titulo, (isCompleted || isCancelled) && styles.tituloMuted]}
            numberOfLines={2}
          >
            {tarea.titulo}
          </Text>

          {/* Estado + Prioridad badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: estado.bg }]}>
              <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: prioridad.color + "18" }]}>
              <Text style={[styles.badgeText, { color: prioridad.color }]}>{prioridad.label}</Text>
            </View>
            {tarea.vencida && (
              <View style={[styles.badge, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="alert-circle" size={10} color="#EF4444" />
                <Text style={[styles.badgeText, { color: "#EF4444" }]}>Vencida</Text>
              </View>
            )}
          </View>

          {/* Metadata row */}
          <View style={styles.metaRow}>
            {tarea.fechaLimite && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={11} color={tarea.vencida ? "#EF4444" : "#9CA3AF"} />
                <Text style={[styles.metaText, tarea.vencida && { color: "#EF4444" }]}>
                  {new Date(tarea.fechaLimite).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                </Text>
              </View>
            )}
            {tarea.tiempoEstimado != null && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                <Text style={styles.metaText}>
                  {tarea.tiempoEstimado} {tarea.tiempoUnidad ?? ""}
                </Text>
              </View>
            )}
            {tarea.asignado && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={11} color="#9CA3AF" />
                <Text style={styles.metaText} numberOfLines={1}>{tarea.asignado.nombre}</Text>
              </View>
            )}
          </View>

          {/* Subtareas progress bar */}
          {hasSubs && (
            <View style={styles.progressWrapper}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round((subsDone / subsTotal) * 100)}%` as any,
                      backgroundColor: subsAllDone ? "#22C55E" : "#3B82F6",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, subsAllDone && { color: "#16A34A" }]}>
                {subsDone}/{subsTotal}
              </Text>
            </View>
          )}

          {/* Extension indicators */}
          {(hasSubs || hasObs || hasFiles) && (
            <View style={styles.extRow}>
              {hasSubs && (
                <View style={[
                  styles.extChip,
                  subsAllDone ? styles.extChipGreen : styles.extChipGray,
                ]}>
                  <Ionicons
                    name={subsAllDone ? "checkmark-done-outline" : "list-outline"}
                    size={11}
                    color={subsAllDone ? "#16A34A" : "#6B7280"}
                  />
                  <Text style={[styles.extChipText, subsAllDone && { color: "#16A34A" }]}>
                    subtareas
                  </Text>
                </View>
              )}
              {hasObs && (
                <View style={styles.extChip}>
                  <Ionicons name="chatbubble-outline" size={11} color="#6B7280" />
                  <Text style={styles.extChipText}>{tarea.observacionesTotal}</Text>
                </View>
              )}
              {hasFiles && (
                <View style={styles.extChip}>
                  <Ionicons name="attach-outline" size={11} color="#6B7280" />
                  <Text style={styles.extChipText}>{tarea.archivosTotal}</Text>
                </View>
              )}
            </View>
          )}

          {/* Advance button */}
          {advanceLabel && onAdvance && (
            <Pressable
              style={({ pressed }) => [
                styles.advanceBtn,
                tarea.estado === "en_progreso" && styles.advanceBtnGreen,
                pressed && { opacity: 0.7 },
              ]}
              onPress={(e) => { e.stopPropagation(); onAdvance(tarea); }}
              hitSlop={4}
            >
              <Text style={[
                styles.advanceBtnText,
                tarea.estado === "en_progreso" && styles.advanceBtnTextGreen,
              ]}>
                {advanceLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>

      <StyledModal
        visible={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title="Reabrir tarea"
        onConfirm={confirmReopen}
        confirmText="Confirmar"
        cancelText="Cancelar"
      >
        <Text style={{ fontSize: 14, color: "#374151" }}>
          ¿Marcar esta tarea como en progreso?
        </Text>
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.82 },
  accent: { width: 4, alignSelf: "stretch" },
  checkbox: { padding: 14 },
  content: { flex: 1, paddingVertical: 12, paddingRight: 14, gap: 6 },

  titulo: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1F2937", lineHeight: 20 },
  tituloMuted: { color: "#9CA3AF", textDecorationLine: "line-through" },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" },

  // Subtareas progress bar
  progressWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    minWidth: 28,
    textAlign: "right",
  },

  // Extension chips row
  extRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 2,
  },
  extChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  extChipGray: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  extChipGreen: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  extChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
  },

  // Advance button
  advanceBtn: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  advanceBtnGreen: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  advanceBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#3B82F6" },
  advanceBtnTextGreen: { color: "#22C55E" },
});
