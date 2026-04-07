/**
 * ChangeStageModal
 * Permite al abogado confirmar el avance a la siguiente etapa procesal.
 * Muestra la etapa actual, la siguiente, y la fecha de vencimiento calculada.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO } from "@/shared/schema";
import { StageBlockedError } from "@/lib/services/legalStageService";

interface Props {
  visible: boolean;
  etapaActual: EtapaProcesoDTO | null;
  siguienteEtapa: EtapaProcesoDTO | null;
  onConfirm: (fechaVencimiento?: Date) => Promise<void>;
  onClose: () => void;
}

export function ChangeStageModal({
  visible,
  etapaActual,
  siguienteEtapa,
  onConfirm,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stageBlockedError, setStageBlockedError] = useState<StageBlockedError | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setStageBlockedError(null);
    try {
      const fecha = fechaVencimiento ? new Date(fechaVencimiento) : undefined;
      await onConfirm(fecha);
      onClose();
    } catch (error) {
      // Manejar error específico de STAGE_BLOCKED
      if (error instanceof Error && 'code' in error && error.code === 'STAGE_BLOCKED') {
        setStageBlockedError(error as StageBlockedError);
      } else {
        // Re-lanzar otros errores
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  if (!siguienteEtapa) return null;

  // Calcular fecha estimada de vencimiento si la siguiente etapa tiene días legales
  const diasLegales = siguienteEtapa.diasLegales;
  let fechaEstimada: Date | null = null;
  let fechaEstimadaDisplay: string | null = null;
  let fechaEstimadaValue: string | null = null;
  if (diasLegales > 0) {
    fechaEstimada = new Date();
    fechaEstimada.setDate(fechaEstimada.getDate() + diasLegales);
    fechaEstimadaDisplay = fechaEstimada.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    fechaEstimadaValue = fechaEstimada.toISOString().split('T')[0]; // YYYY-MM-DD format for input
  }

  // Inicializar la fecha editable cuando se abre el modal
  React.useEffect(() => {
    if (visible && fechaEstimadaValue && !fechaVencimiento) {
      setFechaVencimiento(fechaEstimadaValue);
    }
  }, [visible, fechaEstimadaValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Ionicons name="arrow-forward-circle" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Avanzar etapa procesal</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Transición */}
          <View style={styles.transitionRow}>
            {/* Etapa actual */}
            <View style={styles.stageBox}>
              <Text style={styles.stageBoxLabel}>Etapa actual</Text>
              <View style={[styles.stagePill, { backgroundColor: Colors.surfaceSecondary }]}>
                <Ionicons name="remove-circle-outline" size={14} color={Colors.textSecondary} />
                <Text style={[styles.stagePillText, { color: Colors.textSecondary }]}>
                  {etapaActual?.nombre ?? "—"}
                </Text>
              </View>
            </View>

            {/* Flecha */}
            <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} style={styles.arrow} />

            {/* Siguiente etapa */}
            <View style={styles.stageBox}>
              <Text style={styles.stageBoxLabel}>Nueva etapa</Text>
              <View style={[styles.stagePill, { backgroundColor: Colors.primary + "15" }]}>
                <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                <Text style={[styles.stagePillText, { color: Colors.primary }]}>
                  {siguienteEtapa.nombre}
                </Text>
              </View>
            </View>
          </View>

          {/* Vencimiento estimado y editable */}
          {fechaEstimadaValue && (
            <View style={styles.dateSection}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.warning} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Fecha estimada: </Text>
                  {fechaEstimadaDisplay}
                  {" "}({diasLegales} días hábiles)
                </Text>
              </View>

              <View style={styles.dateInputRow}>
                <Text style={styles.dateLabel}>Nueva fecha:</Text>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, { color: fechaVencimiento ? Colors.text : Colors.textTertiary }]}>
                    {fechaVencimiento
                      ? new Date(fechaVencimiento).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Seleccionar fecha"
                    }
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Advertencia */}
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={14} color={Colors.warning} />
            <Text style={styles.warningText}>
              Esta acción registrará la transición en el historial y notificará al cliente.
            </Text>
          </View>

          {/* Mostrar tareas bloqueantes si hay error STAGE_BLOCKED */}
          {stageBlockedError && (
            <View style={styles.blockedTasksContainer}>
              <View style={styles.blockedTasksHeader}>
                <View style={styles.warningIconContainer}>
                  <Ionicons name="warning" size={24} color={Colors.white} />
                </View>
                <Text style={styles.blockedTasksTitle}>
                  Acceso Bloqueado
                </Text>
              </View>

              <View style={styles.blockedMessageContainer}>
                <Ionicons name="lock-closed" size={18} color={Colors.danger} />
                <Text style={styles.blockedTasksMessage}>
                  No se puede avanzar a la siguiente etapa porque hay tareas requeridas pendientes de completar.
                </Text>
              </View>

              <Text style={styles.tasksRequiredTitle}>
                Tareas que debe completar:
              </Text>

              <ScrollView style={styles.blockedTasksList} showsVerticalScrollIndicator={false}>
                {stageBlockedError.tareasBloqueantes.map((tarea, index) => (
                  <View key={tarea.id} style={styles.blockedTaskItem}>
                    <View style={styles.taskIconContainer}>
                      <Ionicons name="checkbox-outline" size={16} color={Colors.textSecondary} />
                    </View>

                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {tarea.titulo}
                        </Text>
                        <View style={[styles.priorityBadge, getPriorityStyle(tarea.prioridad)]}>
                          <Ionicons
                            name={tarea.prioridad === 'alta' ? 'alert-circle' :
                                  tarea.prioridad === 'media' ? 'alert' : 'information-circle'}
                            size={12}
                            color={Colors.white}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.priorityText}>
                            {tarea.prioridad === 'alta' ? 'ALTA' :
                             tarea.prioridad === 'media' ? 'MEDIA' : 'BAJA'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.taskMeta}>
                        <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                        <Text style={styles.taskStatus}>
                          Estado: {tarea.estado}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.blockedTasksHint}>
                <Ionicons name="bulb" size={14} color={Colors.warning} />
                <Text style={styles.hintText}>
                  Complete estas tareas en la sección de tareas del proceso para poder continuar con el avance de etapa.
                </Text>
              </View>
            </View>
          )}

          {/* Botones */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.7 }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnConfirm,
                pressed && { opacity: 0.8 },
                (loading || !!stageBlockedError) && styles.btnDisabled
              ]}
              onPress={handleConfirm}
              disabled={loading || !!stageBlockedError}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                  <Text style={styles.btnConfirmText}>Confirmar avance</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={fechaVencimiento ? new Date(fechaVencimiento) : fechaEstimada}
        onSelect={(date) => {
          setFechaVencimiento(date.toISOString().split('T')[0]);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </Modal>
  );
}

// ─── Simple Date Picker Component ─────────────────────────────────────────────
interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

function DatePickerModal({ visible, selectedDate, onSelect, onClose }: DatePickerModalProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate || today;
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayPress = (date: Date) => {
    onSelect(date);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={datePickerStyles.overlay}>
        <View style={datePickerStyles.container}>
          {/* Header */}
          <View style={datePickerStyles.header}>
            <Text style={datePickerStyles.title}>Seleccionar fecha</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Month Navigation */}
          <View style={datePickerStyles.monthHeader}>
            <Pressable onPress={handlePrevMonth} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </Pressable>
            <Text style={datePickerStyles.monthText}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={handleNextMonth} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          {/* Days of Week */}
          <View style={datePickerStyles.weekdays}>
            {["D", "L", "M", "M", "J", "V", "S"].map(day => (
              <Text key={day} style={datePickerStyles.weekdayText}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={datePickerStyles.calendar}>
            {days.map((date, index) => (
              <View key={index} style={datePickerStyles.dayCell}>
                {date ? (
                  <Pressable
                    style={[
                      datePickerStyles.dayButton,
                      isSelected(date) && datePickerStyles.daySelected,
                      isToday(date) && !isSelected(date) && datePickerStyles.dayToday,
                    ]}
                    onPress={() => handleDayPress(date)}
                    disabled={isPast(date)}
                  >
                    <Text
                      style={[
                        datePickerStyles.dayText,
                        isSelected(date) && datePickerStyles.dayTextSelected,
                        isToday(date) && !isSelected(date) && datePickerStyles.dayTextToday,
                        isPast(date) && datePickerStyles.dayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={datePickerStyles.dayButton} />
                )}
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={datePickerStyles.actions}>
            <Pressable
              style={datePickerStyles.cancelBtn}
              onPress={onClose}
            >
              <Text style={datePickerStyles.cancelText}>Cancelar</Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    gap: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  transitionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stageBox: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stageBoxLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  arrow: {
    marginTop: 18,
  },

  dateSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  infoLabel: {
    fontWeight: "600",
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    minWidth: 80,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
  },
  dateButtonText: {
    fontSize: 14,
    flex: 1,
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  btnConfirm: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

// ─── Helper Functions ──────────────────────────────────────────────────────

const getPriorityStyle = (prioridad: string) => {
  switch (prioridad) {
    case 'alta':
      return { backgroundColor: Colors.danger, borderColor: Colors.danger };
    case 'media':
      return { backgroundColor: Colors.warning, borderColor: Colors.warning };
    case 'baja':
    default:
      return { backgroundColor: Colors.info, borderColor: Colors.info };
  }
};

// ─── Date Picker Styles ───────────────────────────────────────────────────────
const datePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  weekdays: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    paddingVertical: 4,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  daySelected: {
    backgroundColor: Colors.primary,
  },
  dayToday: {
    backgroundColor: Colors.primary + "20",
  },
  dayText: {
    fontSize: 14,
    color: Colors.text,
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: "600",
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: "600",
  },
  dayTextDisabled: {
    color: Colors.textTertiary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // ─── Blocked Tasks Styles ────────────────────────────────────────────────
  blockedTasksContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    borderWidth: 2,
    borderColor: Colors.danger + '30',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  blockedTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.danger + '20',
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  blockedTasksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.danger,
    flex: 1,
  },
  blockedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.danger + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '15',
  },
  blockedTasksMessage: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },
  tasksRequiredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  blockedTasksList: {
    maxHeight: 280,
    marginBottom: 20,
  },
  blockedTaskItem: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  taskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskStatus: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  blockedTasksHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.warning + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '20',
  },
  hintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
});
