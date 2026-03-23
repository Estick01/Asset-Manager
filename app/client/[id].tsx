import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Modal, Platform,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { getCliente, deleteCliente, updateCliente } from "@/lib/services/clienteService";
import { getProcesosByCliente } from "@/lib/services/procesoService";
import { ProcesoDTO, type Cliente } from "@/shared/schema";
import { ClientForm } from "@/components/ClientForm";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY     = "#0F2640";
const NAVY_MID = "#1B3A5C";
const WHITE    = "#FFFFFF";
const BG       = "#F4F6F8";
const TEXT     = "#1B2B3B";
const TEXT2    = "#6B7B8D";
const TEXT3    = "#9AAABB";
const TEAL     = "#2196A6";
const GREEN    = "#27AE7A";
const AMBER    = "#F5A623";
const DANGER   = "#E05252";

// ─── Estado colors ────────────────────────────────────────────────────────────
const ESTADO_COLORS: Record<string, string> = {
  activo:     GREEN,
  en_tramite: AMBER,
  finalizado: TEAL,
  archivado:  TEXT3,
};
const ESTADO_LABELS: Record<string, string> = {
  activo:     "Activo",
  en_tramite: "En Trámite",
  finalizado: "Finalizado",
  archivado:  "Archivado",
};
const getEstadoKey = (estado?: { codigo?: string } | null) =>
  estado?.codigo ?? "archivado";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDisplayName(c: Cliente): { nombre: string; apellido: string } {
  if (c.tipo === "natural" && c.natural?.persona)
    return { nombre: c.natural.persona.nombre ?? "", apellido: c.natural.persona.apellido ?? "" };
  if (c.tipo === "empresa" && c.empresa)
    return { nombre: c.empresa.razonSocial ?? "", apellido: "" };
  return { nombre: "Sin nombre", apellido: "" };
}

function getInitial(c: Cliente): string {
  return getDisplayName(c).nombre.charAt(0).toUpperCase();
}

type InfoRow     = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; tint?: string };
type InfoSection = { title?: string; rows: InfoRow[] };

function buildInfoSections(c: Cliente): InfoSection[] {
  if (c.tipo === "empresa" && c.empresa) {
    const emp = c.empresa;
    const rep = (emp as any).representanteLegal;
    const rp  = rep?.persona;

    const empresaSection: InfoSection = {
      title: "Datos de la Empresa",
      rows: [
        { icon: "card-outline",      label: "NIT",         value: emp.nit || "Sin NIT",       tint: AMBER },
        { icon: "briefcase-outline", label: "Sector",      value: emp.sector || "No registrado", tint: AMBER },
        { icon: "mail-outline",      label: "Correo",      value: c.user?.email || "No registrado" },
        { icon: "calendar-outline",  label: "Registrado",  value: new Date(c.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) },
      ],
    };
    if (!rep) return [empresaSection];

    return [
      empresaSection,
      {
        title: "Representante Legal",
        rows: [
          { icon: "person-outline",    label: "Nombre",       value: rp ? `${rp.nombre} ${rp.apellido}` : "No registrado" },
          { icon: "briefcase-outline", label: "Cargo",        value: rep.cargo || "No registrado" },
          { icon: "mail-outline",      label: "Correo",       value: rep.email || "No registrado" },
          { icon: "card-outline",      label: rp?.tipoDocumento?.nombre ?? "Documento", value: rp?.documento || "No registrado" },
          { icon: "call-outline",      label: "Teléfono",     value: rp?.telefono || "No registrado" },
          { icon: "location-outline",  label: "Dirección",    value: rp?.direccion || "No registrado" },
          { icon: "globe-outline",     label: "Departamento", value: rp?.departamento?.nombre || "No registrado" },
          { icon: "location-outline",  label: "Municipio",    value: rp?.municipio?.nombre || "No registrado" },
        ],
      },
    ];
  }

  const persona = c.natural?.persona;
  return [{
    rows: [
      { icon: "card-outline",      label: persona?.tipoDocumento?.nombre ?? "Documento", value: persona?.documento || "Sin documento" },
      { icon: "mail-outline",      label: "Correo",       value: c.user?.email || "No registrado" },
      { icon: "call-outline",      label: "Teléfono",     value: persona?.telefono || "No registrado" },
      { icon: "location-outline",  label: "Dirección",    value: persona?.direccion || "No registrado" },
      { icon: "globe-outline",     label: "Departamento", value: persona?.departamento?.nombre || "No registrado" },
      { icon: "location-outline",  label: "Municipio",    value: persona?.municipio?.nombre || "No registrado" },
      { icon: "calendar-outline",  label: "Registrado",   value: new Date(c.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) },
    ],
  }];
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({
  visible, clientName, busy, onConfirm, onCancel,
}: {
  visible: boolean; clientName: string; busy: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <View style={[styles.modalIconWrap, { backgroundColor: DANGER + "12" }]}>
            <Ionicons name="person-remove-outline" size={28} color={DANGER} />
          </View>
          <Text style={styles.modalTitle}>Eliminar cliente</Text>
          <Text style={styles.modalBody}>
            ¿Deseas eliminar a{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: TEXT }}>{clientName}</Text>
            ?{"\n"}Esta acción no se puede deshacer.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.8 }]}
              onPress={onCancel} disabled={busy}
            >
              <Text style={styles.modalBtnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && { opacity: 0.8 }]}
              onPress={onConfirm} disabled={busy}
            >
              {busy
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Text style={styles.modalBtnDangerText}>Eliminar</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const insets = useSafeAreaInsets();
  const [cliente, setCliente]       = useState<Cliente | null>(null);
  const [procesos, setProcesos]     = useState<ProcesoDTO[]>([]);
  const [isEditing, setIsEditing]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  React.useEffect(() => {
    if (edit === "true") setIsEditing(true);
  }, [edit]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      (async () => {
        const c = await getCliente(id);
        if (c) {
          setCliente(c);
          const p = await getProcesosByCliente(c.id);
          setProcesos(p.data ?? []);
        }
      })();
    }, [id]),
  );

  const handleDelete = async () => {
    if (!cliente) return;
    setDeleting(true);
    try {
      await deleteCliente(cliente.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDelete(false);
      router.replace("/clients");
    } catch {
      toast.error("No se pudo eliminar el cliente");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (formData: any) => {
    if (!cliente) return;
    setSaving(true);
    try {
      await updateCliente(cliente.id, formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Cliente actualizado");
      setIsEditing(false);
      const c = await getCliente(cliente.id);
      if (c) setCliente(c);
    } catch {
      toast.error("No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (!cliente) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const { nombre, apellido } = getDisplayName(cliente);
  const fullName = `${nombre}${apellido ? ` ${apellido}` : ""}`;
  const isEmpresa = cliente.tipo === "empresa";

  // ── Edit mode ──
  if (isEditing) {
    return (
      <View style={styles.screen}>
        {/* Header edit */}
        <LinearGradient colors={[NAVY, NAVY_MID]} style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setIsEditing(false)}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerEyebrow}>CLIENTE</Text>
            <Text style={styles.headerTitleSmall}>Editar Información</Text>
          </View>
        </LinearGradient>

        <View style={styles.bodyWrap}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <ClientForm
              initialData={cliente}
              onSave={handleSave}
              isLoading={saving}
              isEditing
              error={undefined}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Detail mode ──
  const infoSections = buildInfoSections(cliente);
  const procesoCount = procesos.length;
  const activeCount  = procesos.filter(p => getEstadoKey(p.estado) === "activo").length;

  return (
    <View style={styles.screen}>

      {/* ── Header gradient ── */}
      <LinearGradient colors={[NAVY, NAVY_MID]} style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>

        {/* Top row: back + actions */}
        <View style={styles.headerTopRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </Pressable>

          <View style={styles.headerTopRight}>
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color={WHITE} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, { backgroundColor: DANGER + "25" }, pressed && { opacity: 0.7 }]}
              onPress={() => setShowDelete(true)}
            >
              <Ionicons name="trash-outline" size={18} color={DANGER} />
            </Pressable>
          </View>
        </View>

        {/* Avatar + nombre */}
        <View style={styles.headerProfile}>
          <View style={[styles.avatar, { backgroundColor: isEmpresa ? AMBER + "25" : "rgba(255,255,255,0.12)" }]}>
            {isEmpresa
              ? <Ionicons name="business-outline" size={32} color={AMBER} />
              : <Text style={styles.avatarText}>{getInitial(cliente)}</Text>}
          </View>

          <Text style={styles.headerName} numberOfLines={2}>{fullName}</Text>

          <View style={styles.headerBadgesRow}>
            <View style={[styles.headerBadge, { backgroundColor: isEmpresa ? AMBER + "30" : TEAL + "30" }]}>
              <Ionicons
                name={isEmpresa ? "business-outline" : "person-outline"}
                size={11}
                color={isEmpresa ? AMBER : TEAL}
              />
              <Text style={[styles.headerBadgeText, { color: isEmpresa ? AMBER : TEAL }]}>
                {isEmpresa ? "Empresa" : "Persona Natural"}
              </Text>
            </View>
            <View style={[styles.headerBadge, { backgroundColor: cliente.activo ? GREEN + "30" : "rgba(255,255,255,0.1)" }]}>
              <View style={[styles.headerBadgeDot, { backgroundColor: cliente.activo ? GREEN : TEXT3 }]} />
              <Text style={[styles.headerBadgeText, { color: cliente.activo ? GREEN : TEXT3 }]}>
                {cliente.activo ? "Activo" : "Inactivo"}
              </Text>
            </View>
          </View>
        </View>

        {/* Mini stats */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{procesoCount}</Text>
            <Text style={styles.statLbl}>Procesos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLbl}>Activos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{procesoCount - activeCount}</Text>
            <Text style={styles.statLbl}>Cerrados</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body ── */}
      <View style={styles.bodyWrap}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Info sections ── */}
          {infoSections.map((section, sIdx) => (
            <View key={sIdx} style={styles.section}>
              {section.title && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
                  <View style={styles.sectionLine} />
                </View>
              )}
              <View style={styles.infoCard}>
                {section.rows.map((row, idx) => {
                  const tint = row.tint ?? TEAL;
                  return (
                    <View
                      key={`${row.label}-${idx}`}
                      style={[styles.infoRow, idx < section.rows.length - 1 && styles.infoRowBorder]}
                    >
                      <View style={[styles.infoIconWrap, { backgroundColor: tint + "12" }]}>
                        <Ionicons name={row.icon} size={17} color={tint} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{row.label}</Text>
                        <Text style={styles.infoValue}>{row.value}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* ── Procesos ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>PROCESOS</Text>
              <View style={[styles.sectionBadge, { backgroundColor: TEAL + "18" }]}>
                <Text style={[styles.sectionBadgeText, { color: TEAL }]}>{procesoCount}</Text>
              </View>
              <View style={styles.sectionLine} />
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push({ pathname: "/case/new", params: { clienteId: cliente.id } })}
              >
                <Ionicons name="add" size={16} color={WHITE} />
              </Pressable>
            </View>

            {procesos.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="folder-open-outline" size={30} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>Sin procesos</Text>
                <Text style={styles.emptySub}>Crea el primer proceso para este cliente</Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => router.push({ pathname: "/case/new", params: { clienteId: cliente.id } })}
                >
                  <Ionicons name="add" size={14} color={WHITE} />
                  <Text style={styles.emptyActionText}>Nuevo proceso</Text>
                </Pressable>
              </View>
            ) : (
              procesos.map((p) => {
                const estadoKey   = getEstadoKey(p.estado);
                const estadoColor = ESTADO_COLORS[estadoKey] ?? TEXT3;
                const tareas      = p.tareasConteo;
                const responsable = p.responsable;
                const respPersona = responsable?.lawyer?.persona;
                const respNombre  = respPersona
                  ? `${respPersona.nombre ?? ""} ${respPersona.apellido ?? ""}`.trim() || responsable?.asignadoPorNombre || null
                  : (responsable?.asignadoPorNombre ?? null);
                const respInicial = respNombre?.charAt(0).toUpperCase() ?? null;
                const fechaStr    = p.fechaCreacion
                  ? new Date(p.fechaCreacion).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                  : null;

                return (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [styles.procesoCard, pressed && styles.procesoCardPressed]}
                    onPress={() => router.push({ pathname: "/case/[id]", params: { id: p.id } })}
                  >
                    {/* Accent lateral */}
                    <View style={[styles.procesoAccent, { backgroundColor: estadoColor }]} />

                    <View style={styles.procesoBody}>
                      {/* Fila 1: radicado + badge estado */}
                      <View style={styles.procesoRow}>
                        <Text style={styles.procesoRadicado} numberOfLines={1}>{p.radicado}</Text>
                        <View style={[styles.estadoBadge, { backgroundColor: estadoColor + "18" }]}>
                          <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
                          <Text style={[styles.estadoText, { color: estadoColor }]}>
                            {ESTADO_LABELS[estadoKey] ?? estadoKey}
                          </Text>
                        </View>
                      </View>

                      {/* Fila 2: tipo + juzgado */}
                      <View style={styles.procesoRow}>
                        {p.tipoProceso?.nombre ? (
                          <View style={styles.procesoChip}>
                            <Ionicons name="folder-outline" size={11} color={TEAL} />
                            <Text style={styles.procesoChipText} numberOfLines={1}>{p.tipoProceso.nombre}</Text>
                          </View>
                        ) : null}
                        {p.juzgado ? (
                          <View style={styles.procesoChip}>
                            <Ionicons name="business-outline" size={11} color={TEXT3} />
                            <Text style={[styles.procesoChipText, { color: TEXT3 }]} numberOfLines={1}>{p.juzgado}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Fila 3: responsable */}
                      {respNombre ? (
                        <View style={styles.procesoResponsableRow}>
                          <View style={styles.procesoAvatar}>
                            <Text style={styles.procesoAvatarText}>{respInicial}</Text>
                          </View>
                          <Text style={styles.procesoResponsableText} numberOfLines={1}>{respNombre}</Text>
                        </View>
                      ) : null}

                      {/* Fila 4: pills tareas + fecha */}
                      <View style={styles.procesoFooter}>
                        {tareas && tareas.total > 0 ? (
                          <View style={styles.procesoTareasPills}>
                            {tareas.pendientes > 0 && (
                              <View style={[styles.tareaPill, { backgroundColor: AMBER + "18" }]}>
                                <Text style={[styles.tareaPillText, { color: AMBER }]}>{tareas.pendientes} pend.</Text>
                              </View>
                            )}
                            {tareas.en_progreso > 0 && (
                              <View style={[styles.tareaPill, { backgroundColor: TEAL + "18" }]}>
                                <Text style={[styles.tareaPillText, { color: TEAL }]}>{tareas.en_progreso} prog.</Text>
                              </View>
                            )}
                            {tareas.completadas > 0 && (
                              <View style={[styles.tareaPill, { backgroundColor: GREEN + "18" }]}>
                                <Text style={[styles.tareaPillText, { color: GREEN }]}>{tareas.completadas} comp.</Text>
                              </View>
                            )}
                          </View>
                        ) : null}
                        {fechaStr ? (
                          <Text style={styles.procesoFecha}>{fechaStr}</Text>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ alignSelf: "center", marginRight: 12 }} />
                  </Pressable>
                );
              })
            )}
          </View>

        </ScrollView>
      </View>

      {/* ── Delete Modal ── */}
      <ConfirmDeleteModal
        visible={showDelete}
        clientName={fullName}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: NAVY_MID },
  centered: { alignItems: "center", justifyContent: "center" },

  // ── Header gradient ──────────────────────────────────────────────────────
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap:10,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerTopRight: { flexDirection: "row", gap: 10 },
  headerActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  headerEyebrow: {
    fontSize: 10, letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium",
  },
  headerTitleSmall: {
    fontSize: 18, fontFamily: "Inter_700Bold",
    color: WHITE, marginTop: 2,
  },

  headerProfile: { alignItems: "center", gap: 10, marginBottom: 20 },
  avatar: {
    width: 76, height: 76, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: {
    fontSize: 30, fontFamily: "Inter_700Bold", color: WHITE,
  },
  headerName: {
    fontSize: 22, fontFamily: "Inter_700Bold",
    color: WHITE, textAlign: "center", lineHeight: 28,
  },
  headerBadgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  headerBadgeDot:  { width: 6, height: 6, borderRadius: 3 },
  headerBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingVertical: 14,
  },
  statItem:   { flex: 1, alignItems: "center" },
  statNum:    { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  statLbl:    { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  // ── Body ─────────────────────────────────────────────────────────────────
  bodyWrap: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  body: { padding: 20, paddingBottom: 60, gap: 20 },

  // ── Sections ─────────────────────────────────────────────────────────────
  section:       { gap: 10 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    color: TEXT2, letterSpacing: 0.8,
  },
  sectionBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sectionLine:   { flex: 1, height: 1, backgroundColor: "#E0E5EA" },
  addBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: TEAL,
    alignItems: "center", justifyContent: "center",
  },

  // ── Info card ─────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: WHITE, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  infoRow: {
    flexDirection: "row", alignItems: "center",
    padding: 14, gap: 12,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F2F4" },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  infoContent: { flex: 1, minWidth: 0 },
  infoLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT3,
  },
  infoValue: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT,
    marginTop: 2, flexWrap: "wrap",
  },

  // ── Proceso card ──────────────────────────────────────────────────────────
  procesoCard: {
    flexDirection: "row",
    backgroundColor: WHITE, borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  procesoCardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  procesoAccent:  { width: 4, alignSelf: "stretch", flexShrink: 0 },
  procesoBody:    { flex: 1, paddingVertical: 12, paddingLeft: 12, gap: 6, minWidth: 0 },
  procesoRow:     { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  procesoRadicado:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, flex: 1 },
  procesoChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: TEAL + "10", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  procesoChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: TEAL },
  procesoResponsableRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  procesoAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: NAVY_MID,
    alignItems: "center", justifyContent: "center",
  },
  procesoAvatarText: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },
  procesoResponsableText: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  procesoFooter:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  procesoTareasPills: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  tareaPill:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tareaPillText:   { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  procesoFecha:    { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3 },
  estadoBadge:    {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0,
  },
  estadoDot:      { width: 5, height: 5, borderRadius: 3 },
  estadoText:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: WHITE, borderRadius: 16,
    alignItems: "center", paddingVertical: 32, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  emptyIconWrap: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: BG, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle:      { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:        { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3, textAlign: "center" },
  emptyActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NAVY, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, marginTop: 8,
  },
  emptyActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Delete Modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
    alignItems: "center", gap: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#D1D9E0", marginBottom: 8,
  },
  modalIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center",
  },
  modalBody: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT2,
    textAlign: "center", lineHeight: 21,
  },
  modalActions: {
    flexDirection: "row", gap: 12, marginTop: 8, width: "100%",
  },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  modalBtnCancel:     { backgroundColor: BG, borderWidth: 1, borderColor: "#E0E5EA" },
  modalBtnCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  modalBtnDanger:     { backgroundColor: DANGER },
  modalBtnDangerText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },
});
