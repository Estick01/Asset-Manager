/**
 * EtapaHistorialTimeline
 * Muestra el historial completo de cambios de estado de las etapas procesales
 * Permite visualizar la evolución de cada etapa con sus diferentes estados
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, Modal, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getEtapaHistorial, createEtapaHistorial } from "@/lib/services/proceso-etapa-historial.service";
import { ETAPA_ESTADOS, type ProcesoEtapaHistorialDTO, type EtapaEstado } from "@/shared/schema";

interface Props {
  procesoId: string;
  visible: boolean;
  onClose: () => void;
  canEdit?: boolean; // Si el usuario puede agregar nuevos registros
  focusEtapa?: string | null;
}

interface HistorialItemProps {
  registro: ProcesoEtapaHistorialDTO;
  isLast: boolean;
  onEdit?: (registro: ProcesoEtapaHistorialDTO) => void;
}

function HistorialItem({ registro, isLast, onEdit }: HistorialItemProps) {
  const getEstadoColor = (estado: EtapaEstado) => {
    switch (estado) {
      case 'COMPLETADA': return Colors.success;
      case 'INICIADA':
      case 'EN_PROCESO': return Colors.primary;
      case 'NO_ADMITIDA':
      case 'FALLIDA':
      case 'CANCELADA': return Colors.danger;
      case 'SUBSANADA':
      case 'REINTENTO': return Colors.warning;
      case 'APLAZADA': return Colors.info;
      case 'SUSPENDIDA': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getEstadoIcon = (estado: EtapaEstado) => {
    switch (estado) {
      case 'COMPLETADA': return 'checkmark-circle';
      case 'NO_ADMITIDA':
      case 'FALLIDA':
      case 'CANCELADA': return 'close-circle';
      case 'APLAZADA': return 'pause-circle';
      case 'REINTENTO': return 'refresh-circle';
      case 'SUBSANADA': return 'arrow-undo-circle';
      default: return 'ellipse';
    }
  };

  const formatFecha = (fecha: Date) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.timelineItem}>
      {/* Línea vertical */}
      <View style={styles.timelineConnector}>
        <View style={[styles.timelineDot, { backgroundColor: getEstadoColor(registro.estado) }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Contenido */}
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(registro.estado) + "20" }]}>
            <Ionicons name={getEstadoIcon(registro.estado) as any} size={14} color={getEstadoColor(registro.estado)} />
            <Text style={[styles.estadoText, { color: getEstadoColor(registro.estado) }]}>
              {registro.estado.replace('_', ' ')}
            </Text>
          </View>

          <Text style={styles.fechaText}>{formatFecha(registro.fecha)}</Text>
        </View>

        <View style={styles.etapaBadge}>
          <Ionicons name="document-text-outline" size={12} color={Colors.primary} />
          <Text style={styles.etapaText}>{registro.etapa}</Text>
        </View>

        {registro.observacion && (
          <Text style={styles.observacionText}>{registro.observacion}</Text>
        )}

        {onEdit && (
          <Pressable style={styles.editButton} onPress={() => onEdit(registro)}>
            <Ionicons name="pencil" size={14} color={Colors.textSecondary} />
            <Text style={styles.editText}>Editar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function EtapaHistorialTimeline({ procesoId, visible, onClose, canEdit = false, focusEtapa = null }: Props) {
  const [historial, setHistorial] = useState<ProcesoEtapaHistorialDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<ProcesoEtapaHistorialDTO | null>(null);

  const loadHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEtapaHistorial(procesoId);
      setHistorial(data);
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  }, [procesoId]);

  useEffect(() => {
    if (visible && procesoId) {
      loadHistorial();
    }
  }, [visible, procesoId, loadHistorial]);

  const handleAddRegistro = () => {
    setSelectedRegistro(null);
    setShowAddModal(true);
  };

  const handleEditRegistro = (registro: ProcesoEtapaHistorialDTO) => {
    setSelectedRegistro(registro);
    setShowAddModal(true);
  };

  const handleSaveRegistro = async (etapa: string, estado: EtapaEstado, observacion: string) => {
    try {
      await createEtapaHistorial(procesoId, { etapa, estado, observacion });
      await loadHistorial();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving registro:', error);
    }
  };

  if (!visible) return null;

  const historialVisible = focusEtapa
    ? historial.filter((registro) => registro.etapa === focusEtapa)
    : historial;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>
                {focusEtapa ? `Historial de ${focusEtapa}` : "Historial de Etapas"}
              </Text>
              {focusEtapa && (
                <Text style={styles.subtitle}>
                  Aqui se muestran solo los estados e incidencias registrados para esta etapa.
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
          ) : (
            <FlatList
              data={historialVisible}
              keyExtractor={(item) => `${item.id}`}
              renderItem={({ item, index }) => (
                <HistorialItem
                  registro={item}
                  isLast={index === historialVisible.length - 1}
                  onEdit={canEdit ? handleEditRegistro : undefined}
                />
              )}
              contentContainerStyle={styles.timelineList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={28} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateTitle}>Sin registros para esta etapa</Text>
                  <Text style={styles.emptyStateText}>
                    {focusEtapa
                      ? "Todavia no hay cambios de estado ni incidencias guardadas para esta etapa."
                      : "Todavia no hay historial formal registrado en este proceso."}
                  </Text>
                </View>
              }
            />
          )}

          {/* Add button */}
          {canEdit && !loading && (
            <Pressable style={styles.addButton} onPress={handleAddRegistro}>
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.addButtonText}>Agregar registro</Text>
            </Pressable>
          )}
        </View>

        {/* Add/Edit Modal */}
        <AddRegistroModal
          visible={showAddModal}
          registro={selectedRegistro}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveRegistro}
        />
      </View>
    </Modal>
  );
}

// ─── Add/Edit Registro Modal ──────────────────────────────────────────────────
interface AddRegistroModalProps {
  visible: boolean;
  registro?: ProcesoEtapaHistorialDTO | null;
  onClose: () => void;
  onSave: (etapa: string, estado: EtapaEstado, observacion: string) => void;
}

function AddRegistroModal({ visible, registro, onClose, onSave }: AddRegistroModalProps) {
  const [etapa, setEtapa] = useState("");
  const [estado, setEstado] = useState<EtapaEstado>("INICIADA");
  const [observacion, setObservacion] = useState("");
  const [showEstadoPicker, setShowEstadoPicker] = useState(false);

  useEffect(() => {
    if (visible && registro) {
      setEtapa(registro.etapa);
      setEstado(registro.estado);
      setObservacion(registro.observacion || "");
    } else if (visible && !registro) {
      setEtapa("");
      setEstado("INICIADA");
      setObservacion("");
    }
  }, [visible, registro]);

  const handleSave = () => {
    if (!etapa.trim()) return;
    onSave(etapa.trim(), estado, observacion.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {registro ? "Editar registro" : "Agregar registro"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Etapa</Text>
              <TextInput
                style={styles.textInput}
                value={etapa}
                onChangeText={setEtapa}
                placeholder="Ej: DEMANDA, NOTIFICACION"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estado</Text>
              <Pressable
                style={styles.pickerButton}
                onPress={() => setShowEstadoPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{estado.replace('_', ' ')}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Observación (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={observacion}
                onChangeText={setObservacion}
                placeholder="Detalles adicionales..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Guardar</Text>
            </Pressable>
          </View>

          {/* Estado Picker */}
          <Modal visible={showEstadoPicker} transparent animationType="fade" onRequestClose={() => setShowEstadoPicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Seleccionar estado</Text>
                <FlatList
                  data={ETAPA_ESTADOS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.pickerItem, estado === item && styles.pickerItemSelected]}
                      onPress={() => {
                        setEstado(item);
                        setShowEstadoPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, estado === item && styles.pickerItemTextSelected]}>
                        {item.replace('_', ' ')}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  timelineList: {
    padding: 20,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineConnector: {
    alignItems: "center",
    width: 40,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fechaText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  etapaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  etapaText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500",
  },
  observacionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  editText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    margin: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: "500",
  },

  // Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: "100%",
    maxWidth: 300,
    maxHeight: "60%",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary + "15",
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
