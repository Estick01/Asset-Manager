import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getCliente, deleteCliente, updateCliente } from '@/lib/services/clienteService';
import { getProcesosByCliente } from '@/lib/services/procesoService';
import { ProcesoDTO, type Cliente, type Proceso } from '@/shared/schema';
import { ClientForm } from "@/components/ClientForm";

const ESTADO_COLORS: Record<string, string> = {
  activo: Colors.success,
  en_tramite: Colors.warning,
  finalizado: Colors.info,
  archivado: Colors.textTertiary,
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  en_tramite: "En Tramite",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

const getEstadoKey = (estado?: { codigo?: string } | null): string =>
  estado?.codigo || "archivado";

// ─── Design tokens ─────────────────────────────────────────────────────────
const TEAL  = "#2196A6";
const AMBER = "#F5A623";

// ─── Helpers para normalizar cliente natural o empresa ──────────────────────
function getDisplayName(cliente: Cliente): { nombre: string; apellido: string } {
  if (cliente.tipo === "natural" && cliente.natural?.persona) {
    return {
      nombre:   cliente.natural.persona.nombre   ?? "",
      apellido: cliente.natural.persona.apellido ?? "",
    };
  }
  if (cliente.tipo === "empresa" && cliente.empresa) {
    return { nombre: cliente.empresa.razonSocial ?? "", apellido: "" };
  }
  return { nombre: "Sin nombre", apellido: "" };
}

function getInitial(cliente: Cliente): string {
  const { nombre } = getDisplayName(cliente);
  return nombre.charAt(0).toUpperCase();
}

type InfoRow = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string };
type InfoSection = { title?: string; rows: InfoRow[] };

function buildInfoSections(cliente: Cliente): InfoSection[] {
  if (cliente.tipo === "empresa" && cliente.empresa) {
    const emp = cliente.empresa;
    const rep = (emp as any).representanteLegal;
    const repPersona = rep?.persona;

    const empresaSection: InfoSection = {
      title: "Datos de la Empresa",
      rows: [
        { icon: "card-outline",      label: "NIT",        value: emp.nit || "Sin NIT" },
        { icon: "briefcase-outline", label: "Sector",     value: emp.sector || "No registrado" },
        { icon: "mail-outline",      label: "Correo",     value: cliente.user?.email || "No registrado" },
        { icon: "calendar-outline",  label: "Registrado", value: new Date(cliente.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) },
      ],
    };

    if (!rep) return [empresaSection];

    const repSection: InfoSection = {
      title: "Representante Legal",
      rows: [
        { icon: "person-outline",    label: "Nombre",       value: repPersona ? `${repPersona.nombre} ${repPersona.apellido}` : "No registrado" },
        { icon: "briefcase-outline", label: "Cargo",        value: rep.cargo || "No registrado" },
        { icon: "mail-outline",      label: "Correo",       value: rep.email || "No registrado" },
        { icon: "card-outline",      label: repPersona?.tipoDocumento?.nombre ?? "Documento", value: repPersona?.documento || "No registrado" },
        { icon: "call-outline",      label: "Teléfono",     value: repPersona?.telefono || "No registrado" },
        { icon: "location-outline",  label: "Dirección",    value: repPersona?.direccion || "No registrado" },
        { icon: "globe-outline",     label: "Departamento", value: repPersona?.departamento?.nombre || "No registrado" },
        { icon: "location-outline",  label: "Municipio",    value: repPersona?.municipio?.nombre || "No registrado" },
      ],
    };

    return [empresaSection, repSection];
  }

  // Natural
  const persona = cliente.natural?.persona;
  return [{
    rows: [
      { icon: "card-outline",      label: persona?.tipoDocumento?.nombre ?? "Documento", value: persona?.documento || "Sin documento" },
      { icon: "mail-outline",      label: "Correo",       value: cliente.user?.email || "No registrado" },
      { icon: "call-outline",      label: "Teléfono",     value: persona?.telefono || "No registrado" },
      { icon: "location-outline",  label: "Dirección",    value: persona?.direccion || "No registrado" },
      { icon: "globe-outline",     label: "Departamento", value: persona?.departamento?.nombre || "No registrado" },
      { icon: "location-outline",  label: "Municipio",    value: persona?.municipio?.nombre || "No registrado" },
      { icon: "calendar-outline",  label: "Registrado",   value: new Date(cliente.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) },
    ],
  }];
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [procesos, setProcesos] = useState<ProcesoDTO[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGoBack = () => router.replace("/clients");

  React.useEffect(() => {
    if (edit === "true") setIsEditing(true);
  }, [edit]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!id) return;
        const c = await getCliente(id);
        if (c) {
          setCliente(c);
          const p = await getProcesosByCliente(c.id);
          setProcesos(p.data);
        }
      })();
    }, [id]),
  );

  const handleDelete = () => {
    if (!cliente) return;
    const { nombre, apellido } = getDisplayName(cliente);
    Alert.alert(
      "Eliminar Cliente",
      `¿Estás seguro de eliminar a ${nombre}${apellido ? ` ${apellido}` : ""}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteCliente(cliente.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleGoBack();
          },
        },
      ]
    );
  };

  const handleSave = async (formData: any) => {
    if (!cliente) return;
    setSaving(true);
    try {
      await updateCliente(cliente.id, formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      const c = await getCliente(cliente.id);
      if (c) setCliente(c);
    } catch {
      Alert.alert("Error", "No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  if (!cliente) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={[styles.loadingText, { marginTop: 8 }]}>Cargando...</Text>
      </View>
    );
  }

  // ── Edit mode ──
  if (isEditing) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Editar Cliente</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <ClientForm
            initialData={cliente}
            onSave={handleSave}
            isLoading={saving}
            isEditing
            error={undefined}
          />
        </ScrollView>
      </View>
    );
  }

  // ── Detail mode ──
  const { nombre, apellido } = getDisplayName(cliente);
  const isEmpresa = cliente.tipo === "empresa";
  const infoSections = buildInfoSections(cliente);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <Pressable onPress={handleGoBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Cliente</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push({ pathname: "/client/[id]", params: { id, edit: "true" } })}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Perfil ── */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: isEmpresa ? AMBER + "33" : Colors.primary }]}>
            {isEmpresa ? (
              <Ionicons name="business-outline" size={32} color={AMBER} />
            ) : (
              <Text style={styles.avatarText}>{getInitial(cliente)}</Text>
            )}
          </View>

          <Text style={styles.clientName}>
            {nombre}{apellido ? ` ${apellido}` : ""}
          </Text>

          {/* Badge tipo */}
          <View style={[styles.tipoBadge, isEmpresa ? styles.tipoBadgeEmpresa : styles.tipoBadgeNatural]}>
            <Ionicons
              name={isEmpresa ? "business-outline" : "person-outline"}
              size={12}
              color={isEmpresa ? AMBER : TEAL}
            />
            <Text style={[styles.tipoBadgeText, { color: isEmpresa ? AMBER : TEAL }]}>
              {isEmpresa ? "Empresa" : "Persona Natural"}
            </Text>
          </View>

          {/* Estado activo/inactivo */}
          <View style={[styles.estadoActivoBadge, { backgroundColor: cliente.activo ? Colors.success + "18" : Colors.textTertiary + "22" }]}>
            <View style={[styles.estadoActivoDot, { backgroundColor: cliente.activo ? Colors.success : Colors.textTertiary }]} />
            <Text style={[styles.estadoActivoText, { color: cliente.activo ? Colors.success : Colors.textTertiary }]}>
              {cliente.activo ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>

        {/* ── Info cards (one per section) ── */}
        {infoSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.infoCardWrapper}>
            {section.title && (
              <Text style={styles.infoCardTitle}>{section.title}</Text>
            )}
            <View style={styles.infoCard}>
              {section.rows.map((row: InfoRow, idx: number) => (
                <View
                  key={`${row.label}-${idx}`}
                  style={[styles.infoRow, idx < section.rows.length - 1 && styles.infoRowBorder]}
                >
                  <Ionicons name={row.icon} size={20} color={Colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Procesos ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Procesos ({procesos.length})</Text>
          <Pressable onPress={() => router.push({ pathname: "/case/new", params: { clienteId: cliente.id } })}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
          </Pressable>
        </View>

        {procesos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Sin procesos asignados</Text>
          </View>
        ) : (
          procesos.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.procesoCard, pressed && styles.procesoCardPressed]}
              onPress={() => router.push({ pathname: "/case/[id]", params: { id: p.id } })}
            >
              <View style={[styles.statusDot, { backgroundColor: ESTADO_COLORS[getEstadoKey(p.estado)] || Colors.textTertiary }]} />
              <View style={styles.procesoInfo}>
                <Text style={styles.procesoRadicado}>{p.radicado}</Text>
                <Text style={styles.procesoTipo}>{p.tipoProceso?.nombre}</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: (ESTADO_COLORS[getEstadoKey(p.estado)] || Colors.textTertiary) + "15" }]}>
                <Text style={[styles.estadoText, { color: ESTADO_COLORS[getEstadoKey(p.estado)] || Colors.textTertiary }]}>
                  {ESTADO_LABELS[getEstadoKey(p.estado)]}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle:   { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },

  content: { padding: 20, paddingBottom: 40 },

  profileSection: { alignItems: "center", marginBottom: 24, gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.white },
  clientName: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },

  tipoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  tipoBadgeNatural: { backgroundColor: TEAL + "18" },
  tipoBadgeEmpresa: { backgroundColor: AMBER + "22" },
  tipoBadgeText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  estadoActivoBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  estadoActivoDot:  { width: 7, height: 7, borderRadius: 4 },
  estadoActivoText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  infoCardWrapper: { marginBottom: 24 },
  infoCardTitle: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    marginBottom: 8, marginLeft: 4,
  },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    overflow: "hidden",
  },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },

  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText:  { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary },

  procesoCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, marginBottom: 10, gap: 12,
  },
  procesoCardPressed: { opacity: 0.9 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  procesoInfo:  { flex: 1 },
  procesoRadicado: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  procesoTipo: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});