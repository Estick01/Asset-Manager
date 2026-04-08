import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Modal } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ProcesoDTO, Cliente } from "@/shared/schema";
import { getOrCreateConversation } from "@/lib/services/chatService";

interface ClienteInfoSectionProps {
  proceso: ProcesoDTO | null;
  rol: string | undefined;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function getClienteNombre(cliente: Cliente): string {
  if (cliente.tipo === "natural" && cliente.natural?.persona) {
    const { nombre, apellido } = cliente.natural.persona;
    return [nombre, apellido].filter(Boolean).join(" ");
  }
  if (cliente.tipo === "empresa" && cliente.empresa) {
    return cliente.empresa.razonSocial ?? "Sin razón social";
  }
  return "Desconocido";
}

function getClienteIcon(cliente: Cliente): "business-outline" | "person-outline" {
  return cliente.tipo === "empresa" ? "business-outline" : "person-outline";
}

// ─── Ownership tooltip ────────────────────────────────────────────────────────
function OwnershipTooltip({ visible, esPrivado, onClose }: {
  visible: boolean;
  esPrivado: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ownerStyles.overlay} onPress={onClose}>
        <Pressable style={ownerStyles.tooltip} onPress={e => e.stopPropagation()}>
          <View style={ownerStyles.tooltipHeader}>
            <View style={[ownerStyles.tooltipIconWrap, { backgroundColor: esPrivado ? Colors.warningLight : Colors.infoLight }]}>
              <Ionicons
                name={esPrivado ? "lock-closed" : "business"}
                size={18}
                color={esPrivado ? Colors.warning : Colors.info}
              />
            </View>
            <Text style={ownerStyles.tooltipTitle}>
              {esPrivado ? "Proceso privado" : "Propiedad del bufete"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={ownerStyles.tooltipText}>
            {esPrivado
              ? "Solo tú puedes ver y gestionar este proceso. Si te desvinculas del bufete, el proceso permanecerá contigo."
              : "Este proceso pertenece al bufete. Solo el bufete y el responsable asignado tienen acceso a él."}
          </Text>

          <View style={ownerStyles.tooltipDivider} />

          <Text style={ownerStyles.tooltipFooter}>
            {esPrivado
              ? "El bufete no tiene acceso a este proceso a menos que sea transferido."
              : "Si te desvinculas de la firma, el proceso permanece en ella y dejarás de tener acceso."}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function ClienteInfoSection({ proceso, rol }: ClienteInfoSectionProps) {
  const [ownershipTooltip, setOwnershipTooltip] = useState(false);

  if (!proceso) return null;

  const canSeeCliente      = rol === "abogado" || rol === "bufete" || rol === "corporacion";
  const canNavigateCliente = rol === "abogado" || rol === "bufete";

  const ESTADO_COLORS: Record<string, string> = {
    activo:     Colors.success,
    en_tramite: Colors.warning,
    finalizado: Colors.info,
    archivado:  Colors.textTertiary,
  };

  const ESTADO_LABELS: Record<string, string> = {
    activo:     "Activo",
    en_tramite: "En Tramite",
    finalizado: "Finalizado",
    archivado:  "Archivado",
  };

  const statusColor   = ESTADO_COLORS[proceso.estado?.codigo || "archivado"] || Colors.textTertiary;
  const cliente       = proceso.cliente ?? null;
  const clienteNombre = cliente ? getClienteNombre(cliente) : proceso.clienteNombre ?? "Desconocido";
  const clienteIcon   = cliente ? getClienteIcon(cliente) : "person-outline";
  const isEmpresa     = cliente?.tipo === "empresa";

  const handleChat = async () => {
    if (!cliente?.userId) {
      Alert.alert("Error", "El cliente no tiene usuario vinculado");
      return;
    }
    try {
      const conv = await getOrCreateConversation(cliente.userId, "lawyer_client");
      router.push({
        pathname: "/chat/[id]",
        params: { id: conv.id, name: clienteNombre },
      });
    } catch {
      Alert.alert("Error", "No se pudo abrir el chat");
    }
  };

  const esPrivado       = proceso.esPrivado ?? false;
  const ownerBadgeColor = esPrivado ? Colors.warning : Colors.info;
  const ownerBgColor    = esPrivado ? Colors.warningLight : Colors.infoLight;
  const ownerIcon       = esPrivado ? "lock-closed" : "business";
  const ownerLabel      = esPrivado ? "Privado" : "Bufete";

  const responsable     = proceso.responsable;
  const responsableNombre = responsable?.lawyer?.persona
    ? `${responsable.lawyer.persona.nombre ?? ""} ${responsable.lawyer.persona.apellido ?? ""}`.trim()
    : null;

  return (
    <>
      <OwnershipTooltip
        visible={ownershipTooltip}
        esPrivado={esPrivado}
        onClose={() => setOwnershipTooltip(false)}
      />

      {/* ── Top Card — Radicado, Estado y badge ownership ── */}
      <View style={styles.topCard}>
        <View style={styles.topCardHeader}>
          <View style={styles.topCardInfo}>
            <Text style={styles.radicado}>{proceso.radicado}</Text>
            <Text style={styles.tipoProceso}>
              {proceso.tipoProceso?.nombre || "Sin tipo"}
            </Text>
          </View>
          <View style={styles.topCardBadges}>
            {/* Ownership badge */}
            <Pressable
              onPress={() => setOwnershipTooltip(true)}
              style={[styles.ownerBadge, { backgroundColor: ownerBgColor }]}
              hitSlop={6}
            >
              <Ionicons name={ownerIcon as any} size={11} color={ownerBadgeColor} />
              <Text style={[styles.ownerBadgeText, { color: ownerBadgeColor }]}>
                {ownerLabel}
              </Text>
            </Pressable>
            {/* Estado badge */}
            <View style={[styles.estadoBadge, { backgroundColor: statusColor + "15" }]}>
              <View style={[styles.estadoDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.estadoText, { color: statusColor }]}>
                {ESTADO_LABELS[proceso.estado?.codigo || "archivado"]}
              </Text>
            </View>
          </View>
        </View>
        {!!proceso.descripcionEstado && (
          <Text style={styles.descripcion}>{proceso.descripcionEstado}</Text>
        )}
      </View>

      {/* ── Info Card ── */}
      <View style={styles.infoCard}>

        {/* Cliente — solo roles permitidos */}
        {canSeeCliente && (
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name={clienteIcon} size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <View style={styles.clienteLabelRow}>
                <Text style={styles.infoLabel}>Cliente</Text>
                {/* Badge tipo */}
                <View style={[
                  styles.tipoBadge,
                  isEmpresa ? styles.tipoBadgeEmpresa : styles.tipoBadgeNatural,
                ]}>
                  <Text style={[
                    styles.tipoBadgeText,
                    { color: isEmpresa ? "#F5A623" : "#2196A6" },
                  ]}>
                    {isEmpresa ? "Empresa" : "Natural"}
                  </Text>
                </View>
              </View>
              <Text style={styles.infoValue}>{clienteNombre}</Text>

              {/* Representante legal (solo empresa) */}
              {isEmpresa && cliente?.empresa?.representanteLegal?.persona && (
                <Text style={styles.repText}>
                  Rep: {cliente.empresa.representanteLegal.persona.nombre}{" "}
                  {cliente.empresa.representanteLegal.persona.apellido}
                </Text>
              )}
            </View>

            {canNavigateCliente && proceso.clienteId && (
              <>
                {/* Chat — solo si tiene usuario vinculado */}
                {cliente?.userId && (
                  <Pressable onPress={handleChat} hitSlop={8} style={styles.chatBtn}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push({ pathname: "/client/[id]", params: { id: proceso.clienteId } })}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Juzgado */}
        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Juzgado</Text>
            <Text style={styles.infoValue}>{proceso.juzgado}</Text>
          </View>
        </View>

        {/* Fecha */}
        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Fecha de creacion</Text>
            <Text style={styles.infoValue}>
              {new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Propiedad */}
        <View style={[styles.infoRow, styles.infoRowBorder]}>
          <Ionicons name={ownerIcon as any} size={20} color={ownerBadgeColor} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Propiedad del proceso</Text>
            <View style={styles.ownerValueRow}>
              <Text style={[styles.infoValue, { color: ownerBadgeColor }]}>
                {esPrivado
                  ? "Proceso privado — pertenece al abogado"
                  : "Propiedad del bufete — visible para el bufete y el responsable"}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setOwnershipTooltip(true)} hitSlop={8}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* Responsable */}
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Responsable</Text>
            {responsableNombre ? (
              <>
                <Text style={styles.infoValue}>{responsableNombre}</Text>
                {responsable?.asignadoPorNombre && (
                  <Text style={styles.repText}>
                    Asignado por {responsable.asignadoPorNombre}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.infoValue, { color: Colors.textTertiary }]}>
                Sin responsable asignado
              </Text>
            )}
          </View>
        </View>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topCard: {
    backgroundColor: Colors.white,
    borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  topCardHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  topCardInfo:    { flex: 1, marginRight: 12 },
  topCardBadges:  { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  radicado:       { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  tipoProceso:    { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  estadoBadge:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  estadoDot:      { width: 8, height: 8, borderRadius: 4 },
  estadoText:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  descripcion:    { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 16, lineHeight: 20 },
  ownerBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  ownerBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ownerValueRow:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },

  infoCard:       { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 16, overflow: "hidden" },
  infoRow:        { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  infoRowBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoContent:    { flex: 1 },
  infoLabel:      { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  infoValue:      { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },
  repText:        { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },

  clienteLabelRow:{ flexDirection: "row", alignItems: "center", gap: 6 },

  tipoBadge:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tipoBadgeNatural: { backgroundColor: "#2196A618" },
  tipoBadgeEmpresa: { backgroundColor: "#F5A62322" },
  tipoBadgeText:    { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  chatBtn: { padding: 4 },
});

const ownerStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: Colors.overlay,
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  tooltip: {
    backgroundColor: Colors.white, borderRadius: 18,
    padding: 20, width: "100%", maxWidth: 340, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  tooltipHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  tooltipIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  tooltipTitle: {
    flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text,
  },
  tooltipText: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, lineHeight: 21,
  },
  tooltipDivider: { height: 1, backgroundColor: Colors.border },
  tooltipFooter: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, lineHeight: 18,
  },
});
