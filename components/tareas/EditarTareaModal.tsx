import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from "react-native";
import { StyledModal } from "../StyledModal";
import { API_URL } from "@/lib/config";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  updateTarea,
  deleteTarea,
  cambiarEstadoTarea,
  getObservaciones,
  addObservacion,
  getSubtareas,
  addSubtarea,
  updateSubtarea,
  deleteSubtarea,
  getTareaHistorial,
  getTareaArchivos,
  uploadTareaArchivo,
  deleteTareaArchivo,
} from "@/lib/services/tareaService";
import { DatePickerModal } from "./DatePickerModal";
import type {
  TareaResponseDTO,
  TareaPrioridad,
  TareaObservacionDTO,
  SubtareaDTO,
  TareaHistorialDTO,
  TiempoUnidad,
  TareaArchivoDTO,
} from "@/shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "detalles" | "progreso" | "subtareas" | "archivos" | "historial";

interface Props {
  visible: boolean;
  tarea: TareaResponseDTO | null;
  currentProfileId?: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORIDADES: { value: TareaPrioridad; label: string; color: string }[] = [
  { value: "baja",    label: "Baja",    color: "#6B7280" },
  { value: "media",   label: "Media",   color: "#3B82F6" },
  { value: "alta",    label: "Alta",    color: "#F97316" },
  { value: "urgente", label: "Urgente", color: "#EF4444" },
];

const UNIDADES: { value: TiempoUnidad; label: string }[] = [
  { value: "minutos", label: "min" },
  { value: "horas",   label: "hrs" },
  { value: "dias",    label: "días" },
  { value: "semanas", label: "sem" },
];

const ACCION_LABEL: Record<string, string> = {
  creada:               "Tarea creada",
  actualizada:          "Tarea actualizada",
  estado_cambiado:      "Estado cambiado",
  observacion_agregada: "Observación agregada",
  subtarea_agregada:    "Subtarea agregada",
  subtarea_completada:  "Subtarea completada",
  archivo_adjuntado:    "Archivo adjuntado",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditarTareaModal({
  visible,
  tarea,
  currentProfileId,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const { height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>("detalles");

  // ── Detalles state ─────────────────────────────────────────────────────────
  const [titulo,          setTitulo]          = useState("");
  const [descripcion,     setDescripcion]     = useState("");
  const [prioridad,       setPrioridad]       = useState<TareaPrioridad>("media");
  const [fechaLimite,     setFechaLimite]     = useState("");
  const [tiempoEstimado,  setTiempoEstimado]  = useState("");
  const [tiempoUnidad,    setTiempoUnidad]    = useState<TiempoUnidad>("horas");
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  // ── Progreso state ─────────────────────────────────────────────────────────
  const [observaciones,    setObservaciones]    = useState<TareaObservacionDTO[]>([]);
  const [obsTexto,         setObsTexto]         = useState("");
  const [loadingObs,       setLoadingObs]       = useState(false);
  const [addingObs,        setAddingObs]        = useState(false);
  const [changingEstado,   setChangingEstado]   = useState(false);

  // ── Subtareas state ────────────────────────────────────────────────────────
  const [subtareas,        setSubtareas]        = useState<SubtareaDTO[]>([]);
  const [loadingSubs,      setLoadingSubs]      = useState(false);
  const [newSubTitulo,     setNewSubTitulo]     = useState("");
  const [addingSub,        setAddingSub]        = useState(false);

  // ── Archivos state ─────────────────────────────────────────────────────────
  const [archivos,         setArchivos]         = useState<TareaArchivoDTO[]>([]);
  const [loadingArchivos,  setLoadingArchivos]  = useState(false);
  const [uploadingArchivo, setUploadingArchivo] = useState(false);

  // ── Historial state ────────────────────────────────────────────────────────
  const [historial,        setHistorial]        = useState<TareaHistorialDTO[]>([]);
  const [loadingHist,      setLoadingHist]      = useState(false);

  // ── Feedback modals ────────────────────────────────────────────────────────
  const [errorModal,   setErrorModal]   = useState<{ title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmText: string;
    variant?: "primary" | "danger"; onConfirm: () => void;
  } | null>(null);

  function showError(title: string, message: string) { setErrorModal({ title, message }); }
  function showConfirm(
    title: string, message: string, confirmText: string,
    onConfirm: () => void, variant: "primary" | "danger" = "danger",
  ) { setConfirmModal({ title, message, confirmText, variant, onConfirm }); }

  // ── Derived ────────────────────────────────────────────────────────────────
  const isCreator    = tarea?.creadoPor.id === currentProfileId;
  const isCompleted  = tarea?.estado === "completada";
  const isCancelled  = tarea?.estado === "cancelada";
  const isLocked     = isCompleted || isCancelled;
  const isEnProgreso = tarea?.estado === "en_progreso";
  // Show Progreso tab for any state that's past "pendiente"
  const showProgresoTab = tarea?.estado !== "pendiente" && tarea?.estado !== undefined;

  // ── Init when tarea changes ────────────────────────────────────────────────
  useEffect(() => {
    if (tarea && visible) {
      setTitulo(tarea.titulo);
      setDescripcion(tarea.descripcion ?? "");
      setPrioridad(tarea.prioridad);
      setFechaLimite(
        tarea.fechaLimite
          ? new Date(tarea.fechaLimite).toISOString().slice(0, 10)
          : "",
      );
      setTiempoEstimado(tarea.tiempoEstimado != null ? String(tarea.tiempoEstimado) : "");
      setTiempoUnidad(tarea.tiempoUnidad ?? "horas");
      setActiveTab("detalles");
    }
  }, [tarea, visible]);

  // ── Load tab data on tab switch ────────────────────────────────────────────
  const loadObservaciones = useCallback(async () => {
    if (!tarea) return;
    setLoadingObs(true);
    try {
      const data = await getObservaciones(tarea.id);
      setObservaciones(data);
    } catch { /* silent */ } finally {
      setLoadingObs(false);
    }
  }, [tarea]);

  const loadSubtareas = useCallback(async () => {
    if (!tarea) return;
    setLoadingSubs(true);
    try {
      const data = await getSubtareas(tarea.id);
      setSubtareas(data);
    } catch { /* silent */ } finally {
      setLoadingSubs(false);
    }
  }, [tarea]);

  const loadArchivos = useCallback(async () => {
    if (!tarea) return;
    setLoadingArchivos(true);
    try {
      const data = await getTareaArchivos(tarea.id);
      setArchivos(data);
    } catch { /* silent */ } finally {
      setLoadingArchivos(false);
    }
  }, [tarea]);

  const loadHistorial = useCallback(async () => {
    if (!tarea) return;
    setLoadingHist(true);
    try {
      const data = await getTareaHistorial(tarea.id);
      setHistorial(data);
    } catch { /* silent */ } finally {
      setLoadingHist(false);
    }
  }, [tarea]);

  useEffect(() => {
    if (!visible) return;
    if (activeTab === "progreso")  loadObservaciones();
    if (activeTab === "subtareas") loadSubtareas();
    if (activeTab === "archivos")  loadArchivos();
    if (activeTab === "historial") loadHistorial();
  }, [activeTab, visible, loadObservaciones, loadSubtareas, loadArchivos, loadHistorial]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!tarea) return;
    if (!titulo.trim()) {
      showError("Campo requerido", "El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const te = tiempoEstimado.trim() ? parseFloat(tiempoEstimado) : null;
      await updateTarea(tarea.id, {
        titulo:         titulo.trim(),
        descripcion:    descripcion.trim() || null,
        prioridad,
        fechaLimite:    fechaLimite || null,
        tiempoEstimado: te,
        tiempoUnidad:   te != null ? tiempoUnidad : null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "No se pudo guardar la tarea");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEstado(estado: "completada" | "pendiente" | "cancelada") {
    if (!tarea) return;
    setChangingEstado(true);
    try {
      await cambiarEstadoTarea(tarea.id, { estado });
      onUpdated();
      onClose();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setChangingEstado(false);
    }
  }

  async function handleAddObservacion() {
    if (!tarea || !obsTexto.trim()) return;
    setAddingObs(true);
    try {
      const obs = await addObservacion(tarea.id, { contenido: obsTexto.trim() });
      setObservaciones(prev => [obs, ...prev]);
      setObsTexto("");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "No se pudo agregar observación");
    } finally {
      setAddingObs(false);
    }
  }

  async function handleAddSubtarea() {
    if (!tarea || !newSubTitulo.trim()) return;
    setAddingSub(true);
    try {
      const sub = await addSubtarea(tarea.id, { titulo: newSubTitulo.trim() });
      setSubtareas(prev => [...prev, sub]);
      setNewSubTitulo("");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "No se pudo agregar subtarea");
    } finally {
      setAddingSub(false);
    }
  }

  async function handleToggleSubtarea(sub: SubtareaDTO) {
    if (!tarea) return;
    const nuevoEstado = sub.estado === "completada" ? "pendiente" : "completada";
    try {
      const updated = await updateSubtarea(tarea.id, sub.id, { estado: nuevoEstado });
      setSubtareas(prev => prev.map(s => s.id === sub.id ? updated : s));
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Error al actualizar subtarea");
    }
  }

  async function handleDeleteSubtarea(sub: SubtareaDTO) {
    if (!tarea) return;
    showConfirm(
      "Eliminar subtarea",
      `¿Eliminar "${sub.titulo}"?`,
      "Eliminar",
      async () => {
        try {
          await deleteSubtarea(tarea.id, sub.id);
          setSubtareas(prev => prev.filter(s => s.id !== sub.id));
        } catch (err) {
          showError("Error", err instanceof Error ? err.message : "Error al eliminar");
        }
      },
    );
  }

  function confirmDelete() {
    showConfirm(
      "Eliminar tarea",
      `¿Seguro que deseas eliminar "${tarea?.titulo}"?`,
      "Eliminar",
      handleDelete,
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
      showError("Error", err instanceof Error ? err.message : "No se pudo eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  }

  // ── Archivo handlers ───────────────────────────────────────────────────────

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Permiso requerido", "Se necesita acceso a la galería para adjuntar imágenes");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const nombre = asset.fileName ?? asset.uri.split("/").pop() ?? "imagen.jpg";
    const mimeType = asset.mimeType ?? "image/jpeg";
    await handleUploadArchivo(asset.uri, nombre, mimeType);
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await handleUploadArchivo(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
  }

  async function handleUploadArchivo(uri: string, nombre: string, mimeType: string) {
    if (!tarea) return;
    setUploadingArchivo(true);
    try {
      const archivo = await uploadTareaArchivo(tarea.id, uri, nombre, mimeType);
      setArchivos(prev => [archivo, ...prev]);
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setUploadingArchivo(false);
    }
  }

  async function handleDeleteArchivo(archivo: TareaArchivoDTO) {
    if (!tarea) return;
    showConfirm(
      "Eliminar archivo",
      `¿Eliminar "${archivo.nombre}"?`,
      "Eliminar",
      async () => {
        try {
          await deleteTareaArchivo(tarea.id, archivo.id);
          setArchivos(prev => prev.filter(a => a.id !== archivo.id));
        } catch (err) {
          showError("Error", err instanceof Error ? err.message : "Error al eliminar");
        }
      },
    );
  }

  // ─── Tabs bar ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "detalles",  label: "Detalles",  icon: "create-outline" },
    { key: "progreso",  label: "Progreso",  icon: "play-circle-outline" },
    { key: "subtareas", label: "Subtareas", icon: "list-outline" },
    { key: "archivos",  label: "Archivos",  icon: "attach-outline" },
    { key: "historial", label: "Historial", icon: "time-outline" },
  ];

  const busy = saving || deleting || changingEstado;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          {/* Inner Pressable absorbs taps so they don't reach the backdrop */}
          <Pressable
            style={[styles.sheet, { maxHeight: height * 0.92 }]}
            onPress={() => {}}
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>{tarea?.titulo ?? ""}</Text>
                {isLocked && (
                  <Text style={styles.lockedNote}>
                    {isCompleted ? "Tarea completada" : isCancelled ? "Tarea cancelada" : "Fecha límite vencida"} · solo lectura
                  </Text>
                )}
              </View>
              <View style={styles.headerRight}>
                {isCreator && !isCompleted && !isCancelled && (
                  <Pressable onPress={confirmDelete} hitSlop={8} disabled={busy} style={styles.deleteIconBtn}>
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

            {/* ── Tab bar ── */}
            <View style={styles.tabBar}>
              {tabs.map(t => {
                const isActive = activeTab === t.key;
                const hidden = t.key === "progreso" && !showProgresoTab;
                if (hidden) return null;
                return (
                  <Pressable
                    key={t.key}
                    style={[styles.tabItem, isActive && styles.tabItemActive]}
                    onPress={() => setActiveTab(t.key)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={14}
                      color={isActive ? "#1B5A8C" : "#9CA3AF"}
                    />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Tab content ── */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.tabContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {activeTab === "detalles" && (
                <TabDetalles
                  titulo={titulo}           setTitulo={setTitulo}
                  descripcion={descripcion} setDescripcion={setDescripcion}
                  prioridad={prioridad}     setPrioridad={setPrioridad}
                  fechaLimite={fechaLimite} setFechaLimite={setFechaLimite}
                  tiempoEstimado={tiempoEstimado} setTiempoEstimado={setTiempoEstimado}
                  tiempoUnidad={tiempoUnidad}     setTiempoUnidad={setTiempoUnidad}
                  isLocked={isLocked}
                  showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
                />
              )}

              {activeTab === "progreso" && showProgresoTab && (
                <TabProgreso
                  observaciones={observaciones}
                  obsTexto={obsTexto}       setObsTexto={setObsTexto}
                  loadingObs={loadingObs}   addingObs={addingObs}
                  changingEstado={changingEstado}
                  readOnly={!isEnProgreso}
                  onAddObservacion={handleAddObservacion}
                  onTerminar={() => showConfirm(
                    "Completar tarea",
                    "¿Marcar esta tarea como completada?",
                    "Completar",
                    () => handleChangeEstado("completada"),
                    "primary",
                  )}
                  onPausar={() => handleChangeEstado("pendiente")}
                  onNoCompletar={() => showConfirm(
                    "No completada",
                    "¿Marcar esta tarea como no completada? Pasará a estado cancelado.",
                    "Confirmar",
                    () => handleChangeEstado("cancelada"),
                  )}
                />
              )}

              {activeTab === "subtareas" && (
                <TabSubtareas
                  subtareas={subtareas}
                  loadingSubs={loadingSubs}
                  newSubTitulo={newSubTitulo} setNewSubTitulo={setNewSubTitulo}
                  addingSub={addingSub}
                  isLocked={isLocked}
                  onAdd={handleAddSubtarea}
                  onToggle={handleToggleSubtarea}
                  onDelete={handleDeleteSubtarea}
                />
              )}

              {activeTab === "archivos" && (
                <TabArchivos
                  archivos={archivos}
                  loading={loadingArchivos}
                  uploading={uploadingArchivo}
                  isLocked={isLocked}
                  tareaId={tarea?.id ?? ""}
                  onPickImage={pickImage}
                  onPickDocument={pickDocument}
                  onDelete={handleDeleteArchivo}
                />
              )}

              {activeTab === "historial" && (
                <TabHistorial historial={historial} loading={loadingHist} />
              )}
            </ScrollView>

            {/* ── Footer (Detalles only) ── */}
            {activeTab === "detalles" && !isLocked && (
              <View style={styles.footer}>
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose} disabled={busy}>
                  <Text style={styles.btnSecondaryText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]} onPress={handleSave} disabled={busy}>
                  {saving
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.btnPrimaryText}>Guardar</Text>
                  }
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        value={fechaLimite}
        onChange={setFechaLimite}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Error modal */}
      <StyledModal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title ?? ""}
        hideConfirm
        cancelText="Cerrar"
      >
        <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
          {errorModal?.message}
        </Text>
      </StyledModal>

      {/* Confirm modal */}
      <StyledModal
        visible={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
        confirmText={confirmModal?.confirmText}
        confirmVariant={confirmModal?.variant ?? "danger"}
      >
        <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
          {confirmModal?.message}
        </Text>
      </StyledModal>
    </Modal>
  );
}

// ─── Tab: Detalles ────────────────────────────────────────────────────────────

function TabDetalles({
  titulo, setTitulo,
  descripcion, setDescripcion,
  prioridad, setPrioridad,
  fechaLimite, setFechaLimite,
  tiempoEstimado, setTiempoEstimado,
  tiempoUnidad, setTiempoUnidad,
  isLocked,
  showDatePicker, setShowDatePicker,
}: {
  titulo: string; setTitulo: (v: string) => void;
  descripcion: string; setDescripcion: (v: string) => void;
  prioridad: TareaPrioridad; setPrioridad: (v: TareaPrioridad) => void;
  fechaLimite: string; setFechaLimite: (v: string) => void;
  tiempoEstimado: string; setTiempoEstimado: (v: string) => void;
  tiempoUnidad: TiempoUnidad; setTiempoUnidad: (v: TiempoUnidad) => void;
  isLocked: boolean;
  showDatePicker: boolean; setShowDatePicker: (v: boolean) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.field}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={[styles.input, isLocked && styles.inputDisabled]}
          placeholder="¿Qué hay que hacer?"
          placeholderTextColor="#9CA3AF"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={255}
          editable={!isLocked}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textarea, isLocked && styles.inputDisabled]}
          placeholder="Detalles opcionales..."
          placeholderTextColor="#9CA3AF"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={3}
          editable={!isLocked}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.prioridadRow}>
          {PRIORIDADES.map((p) => (
            <Pressable
              key={p.value}
              style={[
                styles.prioridadBtn,
                prioridad === p.value && { backgroundColor: p.color, borderColor: p.color },
                isLocked && { opacity: 0.5 },
              ]}
              onPress={() => !isLocked && setPrioridad(p.value)}
            >
              <Text style={[styles.prioridadBtnText, prioridad === p.value && { color: "#FFF" }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Fecha límite</Text>
        <Pressable
          style={[styles.input, isLocked && styles.inputDisabled]}
          onPress={() => !isLocked && setShowDatePicker(true)}
        >
          {fechaLimite
            ? <Text style={styles.inputText}>{fechaLimite}</Text>
            : <Text style={styles.placeholderText}>Seleccionar fecha</Text>
          }
          <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tiempo estimado</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }, isLocked && styles.inputDisabled]}
            placeholder="Ej. 2"
            placeholderTextColor="#9CA3AF"
            value={tiempoEstimado}
            onChangeText={setTiempoEstimado}
            keyboardType="numeric"
            editable={!isLocked}
          />
          <View style={styles.unidadRow}>
            {UNIDADES.map(u => (
              <Pressable
                key={u.value}
                style={[
                  styles.unidadBtn,
                  tiempoUnidad === u.value && styles.unidadBtnActive,
                  isLocked && { opacity: 0.5 },
                ]}
                onPress={() => !isLocked && setTiempoUnidad(u.value)}
              >
                <Text style={[styles.unidadBtnText, tiempoUnidad === u.value && styles.unidadBtnTextActive]}>
                  {u.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Tab: Progreso ────────────────────────────────────────────────────────────

function TabProgreso({
  observaciones, obsTexto, setObsTexto,
  loadingObs, addingObs, changingEstado,
  readOnly,
  onAddObservacion, onTerminar, onPausar, onNoCompletar,
}: {
  observaciones: TareaObservacionDTO[];
  obsTexto: string; setObsTexto: (v: string) => void;
  loadingObs: boolean; addingObs: boolean; changingEstado: boolean;
  readOnly?: boolean;
  onAddObservacion: () => void;
  onTerminar: () => void;
  onPausar: () => void;
  onNoCompletar: () => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      {/* State actions — solo cuando no es read-only */}
      {!readOnly && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Acciones</Text>
            <View style={{ gap: 8 }}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnGreen, changingEstado && { opacity: 0.6 }]}
                onPress={onTerminar}
                disabled={changingEstado}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                <Text style={[styles.actionBtnText, { color: "#16A34A" }]}>Terminar tarea</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnBlue, changingEstado && { opacity: 0.6 }]}
                onPress={onPausar}
                disabled={changingEstado}
              >
                <Ionicons name="pause-circle-outline" size={18} color="#2563EB" />
                <Text style={[styles.actionBtnText, { color: "#2563EB" }]}>Pausar tarea</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnRed, changingEstado && { opacity: 0.6 }]}
                onPress={onNoCompletar}
                disabled={changingEstado}
              >
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>No completada</Text>
              </Pressable>
            </View>
          </View>

          {/* Add observation */}
          <View style={styles.field}>
            <Text style={styles.label}>Agregar observación</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Escribe una nota o comentario..."
              placeholderTextColor="#9CA3AF"
              value={obsTexto}
              onChangeText={setObsTexto}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={[styles.addBtn, (!obsTexto.trim() || addingObs) && { opacity: 0.5 }]}
              onPress={onAddObservacion}
              disabled={!obsTexto.trim() || addingObs}
            >
              {addingObs
                ? <ActivityIndicator size="small" color="#FFF" />
                : <>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.addBtnText}>Agregar</Text>
                  </>
              }
            </Pressable>
          </View>
        </>
      )}

      {/* Observaciones list */}
      <View style={styles.field}>
        <Text style={styles.label}>Observaciones ({observaciones.length})</Text>
        {loadingObs ? (
          <ActivityIndicator size="small" color="#1B5A8C" />
        ) : observaciones.length === 0 ? (
          <Text style={styles.emptyText}>Sin observaciones aún</Text>
        ) : (
          observaciones.map(obs => (
            <View key={obs.id} style={styles.obsCard}>
              <View style={styles.obsHeader}>
                <Text style={styles.obsAutor}>{obs.autor.nombre}</Text>
                <Text style={styles.obsDate}>
                  {new Date(obs.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <Text style={styles.obsContenido}>{obs.contenido}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Tab: Subtareas ───────────────────────────────────────────────────────────

function TabSubtareas({
  subtareas, loadingSubs, newSubTitulo, setNewSubTitulo,
  addingSub, isLocked, onAdd, onToggle, onDelete,
}: {
  subtareas: SubtareaDTO[];
  loadingSubs: boolean;
  newSubTitulo: string; setNewSubTitulo: (v: string) => void;
  addingSub: boolean;
  isLocked: boolean;
  onAdd: () => void;
  onToggle: (sub: SubtareaDTO) => void;
  onDelete: (sub: SubtareaDTO) => void;
}) {
  const completadas = subtareas.filter(s => s.estado === "completada").length;

  return (
    <View style={{ gap: 16 }}>
      {subtareas.length > 0 && (
        <View style={styles.progressBarWrapper}>
          <View style={[styles.progressBarFill, { width: `${Math.round((completadas / subtareas.length) * 100)}%` as any }]} />
          <Text style={styles.progressBarLabel}>{completadas}/{subtareas.length} completadas</Text>
        </View>
      )}

      {!isLocked && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Nueva subtarea..."
            placeholderTextColor="#9CA3AF"
            value={newSubTitulo}
            onChangeText={setNewSubTitulo}
          />
          <Pressable
            style={[styles.iconAddBtn, (!newSubTitulo.trim() || addingSub) && { opacity: 0.4 }]}
            onPress={onAdd}
            disabled={!newSubTitulo.trim() || addingSub}
          >
            {addingSub
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="add" size={20} color="#FFF" />
            }
          </Pressable>
        </View>
      )}

      {loadingSubs ? (
        <ActivityIndicator size="small" color="#1B5A8C" />
      ) : subtareas.length === 0 ? (
        <Text style={styles.emptyText}>Sin subtareas aún</Text>
      ) : (
        subtareas.map(sub => (
          <View key={sub.id} style={styles.subCard}>
            <Pressable
              style={styles.subCheckbox}
              onPress={() => onToggle(sub)}
              hitSlop={8}
            >
              {sub.estado === "completada"
                ? <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                : <Ionicons name="ellipse-outline" size={22} color="#D1D5DB" />
              }
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subTitulo, sub.estado === "completada" && styles.subTituloMuted]}>
                {sub.titulo}
              </Text>
              {sub.tiempoEstimado != null && (
                <Text style={styles.subMeta}>
                  <Ionicons name="time-outline" size={10} color="#9CA3AF" /> {sub.tiempoEstimado} {sub.tiempoUnidad ?? ""}
                </Text>
              )}
            </View>
            {!isLocked && (
              <Pressable onPress={() => onDelete(sub)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );
}

// ─── Tab: Archivos ────────────────────────────────────────────────────────────

function TabArchivos({
  archivos, loading, uploading, isLocked, tareaId,
  onPickImage, onPickDocument, onDelete,
}: {
  archivos: TareaArchivoDTO[];
  loading: boolean;
  uploading: boolean;
  isLocked: boolean;
  tareaId: string;
  onPickImage: () => void;
  onPickDocument: () => void;
  onDelete: (a: TareaArchivoDTO) => void;
}) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getDownloadUrl(archivoId: string) {
    return `${API_URL}/api/tareas/${tareaId}/archivos/${archivoId}/download`;
  }

  function handleOpen(archivo: TareaArchivoDTO) {
    if (archivo.esImagen) {
      setPreviewUrl(getDownloadUrl(archivo.id));
    } else {
      Linking.openURL(getDownloadUrl(archivo.id));
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {!isLocked && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={[styles.uploadBtn, uploading && { opacity: 0.5 }]}
            onPress={onPickImage}
            disabled={uploading}
          >
            <Ionicons name="image-outline" size={20} color="#1B5A8C" />
            <Text style={styles.uploadBtnText}>Imagen</Text>
          </Pressable>
          <Pressable
            style={[styles.uploadBtn, uploading && { opacity: 0.5 }]}
            onPress={onPickDocument}
            disabled={uploading}
          >
            <Ionicons name="document-outline" size={20} color="#1B5A8C" />
            <Text style={styles.uploadBtnText}>Documento</Text>
          </Pressable>
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color="#1B5A8C" />
          <Text style={styles.uploadingText}>Subiendo archivo...</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="small" color="#1B5A8C" />
      ) : archivos.length === 0 ? (
        <Text style={styles.emptyText}>Sin archivos adjuntos</Text>
      ) : (
        archivos.map(archivo => (
          <Pressable
            key={archivo.id}
            style={({ pressed }) => [styles.archivoCard, pressed && { opacity: 0.75 }]}
            onPress={() => handleOpen(archivo)}
          >
            {/* Thumbnail para imágenes, ícono para documentos */}
            {archivo.esImagen ? (
              <Image
                source={{ uri: getDownloadUrl(archivo.id) }}
                style={styles.archivoThumbImg}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.archivoThumb, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="document-text" size={24} color="#D97706" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.archivoNombre} numberOfLines={1}>{archivo.nombre}</Text>
              <Text style={styles.archivoMeta}>
                {formatBytes(archivo.tamano)} · {new Date(archivo.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </Text>
              <Text style={styles.archivoVerText}>
                {archivo.esImagen ? "Toca para ver imagen" : "Toca para abrir"}
              </Text>
            </View>

            <View style={{ gap: 8, alignItems: "center" }}>
              <Pressable
                onPress={() => handleOpen(archivo)}
                hitSlop={8}
                style={styles.archivoActionBtn}
              >
                <Ionicons name="eye-outline" size={18} color="#1B5A8C" />
              </Pressable>
              {!isLocked && (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); onDelete(archivo); }}
                  hitSlop={8}
                  style={styles.archivoActionBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
          </Pressable>
        ))
      )}

      {/* Modal preview imagen */}
      {previewUrl && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
          <Pressable
            style={styles.previewOverlay}
            onPress={() => setPreviewUrl(null)}
          >
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <Pressable style={styles.previewClose} onPress={() => setPreviewUrl(null)}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Tab: Historial ───────────────────────────────────────────────────────────

function TabHistorial({ historial, loading }: { historial: TareaHistorialDTO[]; loading: boolean }) {
  if (loading) return <ActivityIndicator size="small" color="#1B5A8C" style={{ marginTop: 24 }} />;
  if (historial.length === 0) return <Text style={[styles.emptyText, { marginTop: 24 }]}>Sin historial aún</Text>;

  return (
    <View style={{ gap: 2 }}>
      {historial.map((entry, i) => (
        <View key={entry.id} style={styles.histRow}>
          <View style={styles.histLineCol}>
            <View style={styles.histDot} />
            {i < historial.length - 1 && <View style={styles.histLine} />}
          </View>
          <View style={styles.histContent}>
            <Text style={styles.histAccion}>{ACCION_LABEL[entry.accion] ?? entry.accion}</Text>
            {entry.detalle && <Text style={styles.histDetalle}>{entry.detalle}</Text>}
            <Text style={styles.histMeta}>
              {entry.usuario.nombre} · {new Date(entry.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#111827" },
  lockedNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  deleteIconBtn: { padding: 2 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#1B5A8C" },
  tabLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#9CA3AF" },
  tabLabelActive: { color: "#1B5A8C" },

  tabContent: { padding: 20, paddingBottom: 32 },

  // Fields
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
  inputDisabled: { backgroundColor: "#F9FAFB", color: "#6B7280" },
  inputText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#111827" },
  placeholderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  textarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 11 },

  // Priority
  prioridadRow: { flexDirection: "row", gap: 8 },
  prioridadBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#E5E7EB", alignItems: "center",
  },
  prioridadBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },

  // Time unit
  unidadRow: { flexDirection: "row", gap: 4 },
  unidadBtn: {
    paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF",
  },
  unidadBtnActive: { backgroundColor: "#1B5A8C", borderColor: "#1B5A8C" },
  unidadBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  unidadBtnTextActive: { color: "#FFFFFF" },

  // Action buttons (Progreso tab)
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1,
  },
  actionBtnGreen: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  actionBtnBlue:  { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  actionBtnRed:   { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  actionBtnText:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Add button
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#1B5A8C", borderRadius: 10, paddingVertical: 10,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  iconAddBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#1B5A8C",
    alignItems: "center", justifyContent: "center",
  },

  // Observation cards
  obsCard: {
    backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, gap: 4,
    borderWidth: 1, borderColor: "#F3F4F6",
    marginBottom: 8,
  },
  obsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  obsAutor: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#374151" },
  obsDate:  { fontSize: 10, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  obsContenido: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4B5563", lineHeight: 18 },

  // Subtarea cards
  progressBarWrapper: {
    height: 8, backgroundColor: "#E5E7EB", borderRadius: 8, overflow: "hidden", justifyContent: "center",
  },
  progressBarFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#22C55E", borderRadius: 8 },
  progressBarLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#374151", textAlign: "right", paddingRight: 6 },
  subCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 8,
  },
  subCheckbox: { padding: 2 },
  subTitulo: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1F2937" },
  subTituloMuted: { color: "#9CA3AF", textDecorationLine: "line-through" },
  subMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },

  // Historial
  histRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  histLineCol: { alignItems: "center", width: 12 },
  histDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1B5A8C", marginTop: 4 },
  histLine: { flex: 1, width: 2, backgroundColor: "#E5E7EB", marginTop: 4 },
  histContent: { flex: 1, paddingBottom: 12 },
  histAccion: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1F2937" },
  histDetalle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  histMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 3 },

  // Archivos
  uploadBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF",
    borderStyle: "dashed",
  },
  uploadBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1B5A8C" },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280" },
  archivoCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 8,
  },
  archivoThumb: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
  },
  archivoThumbImg: {
    width: 52, height: 52, borderRadius: 10,
  },
  archivoNombre: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1F2937" },
  archivoMeta:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  archivoVerText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#3B82F6", marginTop: 3 },
  archivoActionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  // Image preview fullscreen
  previewOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center", alignItems: "center",
  },
  previewImage: {
    width: "100%", height: "80%",
  },
  previewClose: {
    position: "absolute", top: 48, right: 20,
  },

  // Empty
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center" },

  // Footer
  footer: {
    flexDirection: "row", gap: 12, padding: 20,
    backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: "#1B5A8C" },
  btnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  btnSecondary: { backgroundColor: "#F3F4F6" },
  btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#374151" },
});
