/**
 * EventModal
 * Crea o edita un evento manual del calendario del abogado.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type {
  CalendarEventDTO,
  CalendarEventType,
  CreateCalendarEventDTO,
  UpdateCalendarEventDTO,
} from "@/shared/schema";
import { REMINDER_OPTIONS } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS: { value: CalendarEventType; label: string; icon: string }[] = [
  { value: "audiencia",       label: "Audiencia",         icon: "people-outline"          },
  { value: "reunion_cliente", label: "Reunión cliente",   icon: "person-outline"           },
  { value: "diligencia",      label: "Diligencia",        icon: "briefcase-outline"        },
  { value: "vencimiento",     label: "Vencimiento",       icon: "hourglass-outline"        },
  { value: "otro",            label: "Otro",              icon: "calendar-outline"         },
];

const RECORDATORIOS: { value: number; label: string }[] = [
  { value: REMINDER_OPTIONS.EN_EL_MOMENTO,  label: "En el momento"  },
  { value: REMINDER_OPTIONS.QUINCE_MINUTOS, label: "15 minutos antes" },
  { value: REMINDER_OPTIONS.UNA_HORA,       label: "1 hora antes"   },
  { value: REMINDER_OPTIONS.TRES_HORAS,     label: "3 horas antes"  },
  { value: REMINDER_OPTIONS.UN_DIA,         label: "1 día antes"    },
  { value: REMINDER_OPTIONS.TRES_DIAS,      label: "3 días antes"   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format Date for datetime-local input (web)
// ─────────────────────────────────────────────────────────────────────────────

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): Date {
  return new Date(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  /** Si se pasa, es modo edición */
  event?: CalendarEventDTO | null;
  /** Fecha inicial para pre-rellenar al crear */
  initialDate?: Date;
  onSave: (dto: CreateCalendarEventDTO | UpdateCalendarEventDTO) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function EventModal({ visible, event, initialDate, onSave, onDelete, onClose }: Props) {
  const isEdit = !!event;

  const [titulo,       setTitulo]       = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [tipo,         setTipo]         = useState<CalendarEventType>("otro");
  const [fechaInicio,  setFechaInicio]  = useState(initialDate ?? new Date());
  const [recordatorio, setRecordatorio] = useState<number>(REMINDER_OPTIONS.UN_DIA);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  // Pre-fill cuando se abre en modo edición
  useEffect(() => {
    if (event) {
      setTitulo(event.titulo);
      setDescripcion(event.descripcion ?? "");
      setTipo(event.tipo === "tarea" ? "otro" : (event.tipo as CalendarEventType));
      setFechaInicio(new Date(event.fechaInicio));
      setRecordatorio(event.recordatorioMinutos ?? REMINDER_OPTIONS.UN_DIA);
    } else {
      setTitulo("");
      setDescripcion("");
      setTipo("otro");
      setFechaInicio(initialDate ?? new Date());
      setRecordatorio(REMINDER_OPTIONS.UN_DIA);
    }
  }, [event, initialDate, visible]);

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const dto: CreateCalendarEventDTO = {
        titulo:              titulo.trim(),
        descripcion:         descripcion.trim() || null,
        tipo,
        fechaInicio,
        recordatorioMinutos: recordatorio,
      };
      await onSave(dto);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  // Date picker helpers
  const adjustDate = (field: "day" | "hour" | "minute", delta: number) => {
    const d = new Date(fechaInicio);
    if (field === "day")    d.setDate(d.getDate() + delta);
    if (field === "hour")   d.setHours(d.getHours() + delta);
    if (field === "minute") d.setMinutes(d.getMinutes() + delta * 15); // pasos de 15 min
    setFechaInicio(d);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");
  const fechaStr = fechaInicio.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  const horaStr  = `${pad(fechaInicio.getHours())}:${pad(fechaInicio.getMinutes())}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEdit ? "Editar evento" : "Nuevo evento"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Título */}
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Audiencia de conciliación"
              placeholderTextColor={Colors.textTertiary}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={100}
            />

            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tiposRow}>
              {TIPOS.map(t => (
                <Pressable
                  key={t.value}
                  style={[styles.tipoChip, tipo === t.value && styles.tipoChipActive]}
                  onPress={() => setTipo(t.value)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={13}
                    color={tipo === t.value ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.tipoChipText, tipo === t.value && styles.tipoChipTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Fecha y hora */}
            <Text style={styles.label}>Fecha y hora</Text>
            {Platform.OS === "web" ? (
              <TextInput
                style={styles.input}
                value={toDatetimeLocal(fechaInicio)}
                onChangeText={v => setFechaInicio(fromDatetimeLocal(v))}
                // @ts-ignore — web only
                type="datetime-local"
              />
            ) : (
              <View style={styles.dateRow}>
                {/* Día */}
                <View style={styles.dateField}>
                  <Text style={styles.dateFieldLabel}>Día</Text>
                  <Pressable onPress={() => adjustDate("day", 1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-up" size={16} color={Colors.primary} />
                  </Pressable>
                  <Text style={styles.dateValue}>{fechaStr}</Text>
                  <Pressable onPress={() => adjustDate("day", -1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
                {/* Hora */}
                <View style={[styles.dateField, styles.dateFieldSmall]}>
                  <Text style={styles.dateFieldLabel}>Hora</Text>
                  <Pressable onPress={() => adjustDate("hour", 1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-up" size={16} color={Colors.primary} />
                  </Pressable>
                  <Text style={styles.dateValue}>{`${pad(fechaInicio.getHours())}`}</Text>
                  <Pressable onPress={() => adjustDate("hour", -1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
                {/* Minutos (pasos de 15) */}
                <View style={[styles.dateField, styles.dateFieldSmall]}>
                  <Text style={styles.dateFieldLabel}>Min</Text>
                  <Pressable onPress={() => adjustDate("minute", 1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-up" size={16} color={Colors.primary} />
                  </Pressable>
                  <Text style={styles.dateValue}>{`${pad(fechaInicio.getMinutes())}`}</Text>
                  <Pressable onPress={() => adjustDate("minute", -1)} hitSlop={8} style={styles.dateStepBtn}>
                    <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Recordatorio */}
            <Text style={styles.label}>Recordatorio</Text>
            <View style={styles.tiposRow}>
              {RECORDATORIOS.map(r => (
                <Pressable
                  key={r.value}
                  style={[styles.tipoChip, recordatorio === r.value && styles.tipoChipActive]}
                  onPress={() => setRecordatorio(r.value)}
                >
                  <Text style={[styles.tipoChipText, recordatorio === r.value && styles.tipoChipTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Descripción */}
            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Notas adicionales..."
              placeholderTextColor={Colors.textTertiary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {isEdit && onDelete && (
              <Pressable
                style={({ pressed }) => [styles.btnDelete, pressed && { opacity: 0.75 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color={Colors.danger} />
                  : <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                }
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.btnSave, pressed && { opacity: 0.8 }, (!titulo.trim() || saving) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={!titulo.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                    <Text style={styles.btnSaveText}>{isEdit ? "Guardar cambios" : "Crear evento"}</Text>
                  </>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Tipos / recordatorios chips
  tiposRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipoChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tipoChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  tipoChipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },

  // Date picker
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateField: {
    flex: 2,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  dateFieldSmall: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateStepBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dateValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  btnDelete: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.danger + "40",
    backgroundColor: Colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSave: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  btnSaveText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
