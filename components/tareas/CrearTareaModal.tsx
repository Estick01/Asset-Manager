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
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 1024;
  const isCompactWeb = isWeb && width < 640;
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
        <View style={[styles.shell, isDesktopWeb && styles.shellWeb]}>
          {/* Header */}
          <View style={[styles.header, isCompactWeb && styles.headerCompact]}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Trabajo de la etapa</Text>
              <Text style={[styles.headerTitle, isCompactWeb && styles.headerTitleCompact]}>Nueva tarea</Text>
              <Text style={[styles.headerSubtitle, isCompactWeb && styles.headerSubtitleCompact]}>
                Registre una acción concreta del proceso para que el equipo sepa qué debe hacerse y cuándo debería resolverse.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>

          <View style={[styles.body, isDesktopWeb && styles.bodyWeb]}>
            <ScrollView
              contentContainerStyle={[styles.form, isDesktopWeb && styles.formWeb]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Definición de la tarea</Text>
                  <Text style={styles.sectionDescription}>
                    Complete lo esencial para que la tarea quede clara desde el primer vistazo.
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Título *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Revisar escrito, preparar anexo, contactar cliente"
                    placeholderTextColor="#9CA3AF"
                    value={titulo}
                    onChangeText={setTitulo}
                    maxLength={255}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Descripción</Text>
                  <Text style={styles.fieldHint}>
                    Opcional. Úsela para dejar contexto, instrucciones o criterios de entrega.
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Detalles opcionales..."
                    placeholderTextColor="#9CA3AF"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Seguimiento</Text>
                  <Text style={styles.sectionDescription}>
                    Defina la urgencia y, si aplica, la fecha objetivo para darle orden al avance de la etapa.
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Prioridad</Text>
                  <View style={[styles.prioridadRow, isCompactWeb && styles.prioridadRowCompact]}>
                    {PRIORIDADES.map((p) => (
                      <Pressable
                        key={p.value}
                        style={[
                          styles.prioridadBtn,
                          isCompactWeb && styles.prioridadBtnCompact,
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

                <View style={styles.field}>
                  <Text style={styles.label}>Fecha límite</Text>
                  <Text style={styles.fieldHint}>
                    Opcional. Sirve para seguimiento interno y para destacar tareas que conviene resolver primero.
                  </Text>
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
              </View>
            </ScrollView>

            {isDesktopWeb && (
              <View style={styles.desktopAside}>
                <View style={styles.asideCard}>
                  <Text style={styles.asideTitle}>Qué quedará guardado</Text>
                  <View style={styles.asideList}>
                    <View style={styles.asideItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#1B5A8C" />
                      <Text style={styles.asideItemText}>La tarea quedará vinculada a esta etapa del proceso.</Text>
                    </View>
                    <View style={styles.asideItem}>
                      <Ionicons name="flag-outline" size={16} color="#1B5A8C" />
                      <Text style={styles.asideItemText}>La prioridad ayuda a ordenar el trabajo del equipo.</Text>
                    </View>
                    <View style={styles.asideItem}>
                      <Ionicons name="calendar-outline" size={16} color="#1B5A8C" />
                      <Text style={styles.asideItemText}>La fecha límite sirve como referencia de seguimiento, no como cierre automático.</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.asideCard}>
                  <Text style={styles.asideTitle}>Resumen rápido</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Etapa vinculada</Text>
                    <Text style={styles.summaryValue}>{legalStage ?? "Proceso general"}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Prioridad actual</Text>
                    <Text style={styles.summaryValue}>
                      {PRIORIDADES.find((item) => item.value === prioridad)?.label ?? "Media"}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Fecha límite</Text>
                    <Text style={styles.summaryValue}>{fechaLimite || "Sin definir"}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={showDatePicker}
            value={fechaLimite}
            onChange={setFechaLimite}
            onClose={() => setShowDatePicker(false)}
          />

          {/* Submit */}
          <View style={[styles.footer, isCompactWeb && styles.footerCompact]}>
            <Pressable
              style={[styles.btn, styles.btnSecondary, isCompactWeb && styles.btnCompact]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, isCompactWeb && styles.btnCompact, loading && { opacity: 0.6 }]}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF3F7" },
  shell: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  shellWeb: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    marginVertical: 28,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE6EE",
    ...Platform.select({
      web: {
        boxShadow: "0 24px 80px rgba(15, 23, 42, 0.16)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF3",
  },
  headerCompact: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#1B5A8C",
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#111827" },
  headerTitleCompact: {
    fontSize: 22,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    color: "#4B5563",
    maxWidth: 720,
  },
  headerSubtitleCompact: {
    fontSize: 13,
    lineHeight: 19,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  body: {
    flex: 1,
  },
  bodyWeb: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  form: { padding: 20, gap: 16 },
  formWeb: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 760,
    padding: 24,
    gap: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#111827",
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  field: { gap: 7 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  textarea: { minHeight: 108, textAlignVertical: "top", paddingTop: 13 },
  prioridadRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  prioridadRowCompact: {
    gap: 8,
  },
  prioridadBtn: {
    minWidth: 112,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  prioridadBtnCompact: {
    flexBasis: "48%",
    minWidth: 0,
  },
  prioridadBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  desktopAside: {
    width: 330,
    padding: 24,
    gap: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    backgroundColor: "#F5F8FB",
  },
  asideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1E7EE",
    padding: 18,
    gap: 14,
  },
  asideTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#111827",
  },
  asideList: {
    gap: 12,
  },
  asideItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  asideItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: "#4B5563",
  },
  summaryRow: {
    gap: 3,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EEF3",
  },
  footerCompact: {
    flexDirection: "column-reverse",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCompact: {
    width: "100%",
    flex: 0,
  },
  btnPrimary: { backgroundColor: "#1B5A8C" },
  btnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  btnSecondary: { backgroundColor: "#F3F4F6" },
  btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#374151" },
});
