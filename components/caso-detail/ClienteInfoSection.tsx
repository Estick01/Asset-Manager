import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
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

// ─── Component ─────────────────────────────────────────────────────────────
export default function ClienteInfoSection({ proceso, rol }: ClienteInfoSectionProps) {
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

  return (
    <>
      {/* ── Top Card — Radicado y Estado ── */}
      <View style={styles.topCard}>
        <View style={styles.topCardHeader}>
          <View style={styles.topCardInfo}>
            <Text style={styles.radicado}>{proceso.radicado}</Text>
            <Text style={styles.tipoProceso}>
              {proceso.tipoProceso?.nombre || "Sin tipo"}
            </Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: statusColor + "15" }]}>
            <View style={[styles.estadoDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.estadoText, { color: statusColor }]}>
              {ESTADO_LABELS[proceso.estado?.codigo || "archivado"]}
            </Text>
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
        <View style={styles.infoRow}>
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
  radicado:       { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  tipoProceso:    { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  estadoBadge:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  estadoDot:      { width: 8, height: 8, borderRadius: 4 },
  estadoText:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  descripcion:    { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 16, lineHeight: 20 },

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