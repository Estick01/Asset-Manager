import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createTarea } from "@/lib/services/tareaService";
import { DatePickerModal } from "./DatePickerModal";
import type { TareaResponseDTO, TareaPrioridad } from "@/shared/schema";

interface Props {
  visible: boolean;
  procesoId: string;
  onClose: () => void;
  onCreated: (tarea: TareaResponseDTO) => void;
  legalStage?: string | null;
}

const PRIORIDADES: { value: TareaPrioridad; label: string; color: string }[] = [
  { value: "baja",    label: "Baja",    color: "#6B7280" },
  { value: "media",   label: "Media",   color: "#3B82F6" },
  { value: "alta",    label: "Alta",    color: "#F97316" },
  { value: "urgente", label: "Urgente", color: "#EF4444" },
];

export function CrearTareaModal({ visible, procesoId, onClose, onCreated, legalStage }: Props) {
  const [titulo,      setTitulo]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad,   setPrioridad]   = useState<TareaPrioridad>("media");
  const [fechaLimite, setFechaLimite] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function reset() {
    setTitulo("");
    setDescripcion("");
    setPrioridad("media");
    setFechaLimite("");
  }

  async function handleCreate() {
    if (!titulo.trim()) {
      Alert.alert("Campo requerido", "El título es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const tarea = await createTarea(procesoId, {
        titulo:      titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        fechaLimite: fechaLimite || null,
        legalStage:  legalStage ?? null,
      });
      onCreated(tarea);
      reset();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nueva tarea</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
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

        {/* Submit */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, loading && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.btnPrimaryText}>Crear tarea</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
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
