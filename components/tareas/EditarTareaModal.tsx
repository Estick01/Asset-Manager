import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { updateTarea, deleteTarea } from "@/lib/services/tareaService";
import { DatePickerModal } from "./DatePickerModal";
import type { TareaResponseDTO, TareaPrioridad } from "@/shared/schema";

interface Props {
  visible: boolean;
  tarea: TareaResponseDTO | null;
  /** Profile ID of the current user — used to show/hide the delete button */
  currentProfileId?: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const PRIORIDADES: { value: TareaPrioridad; label: string; color: string }[] = [
  { value: "baja",    label: "Baja",    color: "#6B7280" },
  { value: "media",   label: "Media",   color: "#3B82F6" },
  { value: "alta",    label: "Alta",    color: "#F97316" },
  { value: "urgente", label: "Urgente", color: "#EF4444" },
];

export function EditarTareaModal({
  visible,
  tarea,
  currentProfileId,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [titulo,      setTitulo]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad,   setPrioridad]   = useState<TareaPrioridad>("media");
  const [fechaLimite, setFechaLimite] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isCreator = tarea?.creadoPor.id === currentProfileId;

  useEffect(() => {
    if (tarea) {
      setTitulo(tarea.titulo);
      setDescripcion(tarea.descripcion ?? "");
      setPrioridad(tarea.prioridad);
      setFechaLimite(
        tarea.fechaLimite
          ? new Date(tarea.fechaLimite).toISOString().slice(0, 10)
          : "",
      );
    }
  }, [tarea]);

  async function handleSave() {
    if (!tarea) return;
    if (!titulo.trim()) {
      Alert.alert("Campo requerido", "El título es obligatorio");
      return;
    }
    setLoading(true);
    try {
      await updateTarea(tarea.id, {
        titulo:      titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        fechaLimite: fechaLimite || null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar la tarea");
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Eliminar tarea",
      `¿Seguro que deseas eliminar "${tarea?.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    if (!tarea) return;
    setDeleting(true);
    try {
      await deleteTarea(tarea.id);
      onDeleted();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  }

  const busy = loading || deleting;
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop — tap outside to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Sheet — stop tap propagation to backdrop */}
        <View
          style={[styles.container]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Editar tarea</Text>
            <View style={styles.headerRight}>
              {isCreator && (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={8}
                  disabled={busy}
                  style={styles.deleteIconBtn}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  }
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={8} disabled={busy}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Título */}
            <View style={styles.field}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="¿Qué hay que hacer?"
                placeholderTextColor="#9CA3AF"
                value={titulo}
                onChangeText={setTitulo}
                maxLength={255}
              />
            </View>

            {/* Descripción */}
            <View style={styles.field}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Detalles opcionales..."
                placeholderTextColor="#9CA3AF"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Prioridad */}
            <View style={styles.field}>
              <Text style={styles.label}>Prioridad</Text>
              <View style={styles.prioridadRow}>
                {PRIORIDADES.map((p) => (
                  <Pressable
                    key={p.value}
                    style={[
                      styles.prioridadBtn,
                      prioridad === p.value && {
                        backgroundColor: p.color,
                        borderColor: p.color,
                      },
                    ]}
                    onPress={() => setPrioridad(p.value)}
                  >
                    <Text
                      style={[
                        styles.prioridadBtnText,
                        prioridad === p.value && { color: "#FFFFFF" },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Fecha límite */}
            <View style={styles.field}>
              <Text style={styles.label}>Fecha límite</Text>
              <Pressable
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                {fechaLimite ? (
                  <Text style={styles.inputText}>{fechaLimite}</Text>
                ) : (
                  <Text style={styles.placeholderText}>Seleccionar fecha</Text>
                )}
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </ScrollView>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={showDatePicker}
            value={fechaLimite}
            onChange={setFechaLimite}
            onClose={() => setShowDatePicker(false)}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={busy}
            >
              {loading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.btnPrimaryText}>Guardar</Text>
              }
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  deleteIconBtn: { padding: 2 },
  form: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#111827",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  textarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 11 },
  prioridadRow: { flexDirection: "row", gap: 8 },
  prioridadBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  prioridadBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#1B5A8C" },
  btnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  btnSecondary: { backgroundColor: "#F3F4F6" },
  btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#374151" },
});
