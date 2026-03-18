// app/firm-invitations.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  Pressable, ActivityIndicator, Alert, Platform
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import Colors from "@/constants/colors";
import { FirmInvitation, getFirmInvitations, cancelInvitation } from "@/lib/services/firmInvitationService";

const STATUS_COLORS: Record<string, string> = {
  pendiente: Colors.warning,
  aceptada: Colors.success,
  rechazada: Colors.danger,
  cancelada: Colors.textTertiary,
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

const STATUS_ICONS: Record<string, string> = {
  pendiente: "time-outline",
  aceptada: "checkmark-circle-outline",
  rechazada: "close-circle-outline",
  cancelada: "ban-outline",
};

export default function FirmInvitationsScreen() {
  const insets = useSafeAreaInsets();
  const [invitations, setInvitations] = useState<FirmInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const result = await getFirmInvitations();
    if (result.data) setInvitations(result.data);
    if (result.error) {
      Toast.show({ type: "error", text1: "Error", text2: result.error });
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Contadores por estado
  const counts = invitations.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCancel = (invitation: FirmInvitation) => {
    Alert.alert(
      "Cancelar Invitación",
      `¿Cancelar la invitación a ${invitation.lawyer?.persona?.nombre} ${invitation.lawyer?.persona?.apellido}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancelar invitación",
          style: "destructive",
          onPress: async () => {
            setCancelling(invitation.id);
            const result = await cancelInvitation(invitation.id);
            if (result.error) {
              Toast.show({ type: "error", text1: "Error", text2: result.error });
            } else {
              Toast.show({ type: "success", text1: "Invitación cancelada" });
              loadData();
            }
            setCancelling(null);
          },
        },
      ]
    );
  };

  const renderInvitation = ({ item }: { item: FirmInvitation }) => {
    const statusColor = STATUS_COLORS[item.status];
    const isCancelling = cancelling === item.id;
    const initials = `${item.lawyer?.persona?.nombre?.charAt(0) || ""}${item.lawyer?.persona?.apellido?.charAt(0) || ""}`.toUpperCase() || "A";

    return (
      <View style={styles.card}>
        {/* Barra lateral de color según estado */}
        <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

        <View style={styles.cardContent}>
          {/* Avatar + Info */}
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.avatarText, { color: statusColor }]}>{initials}</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.nombre}>
                {item.lawyer?.persona?.nombre} {item.lawyer?.persona?.apellido}
              </Text>
              {item.lawyer?.specialization && (
                <View style={styles.especRow}>
                  <Ionicons name="briefcase-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.especialidad}>{item.lawyer.specialization}</Text>
                </View>
              )}
              <View style={styles.especRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.fecha}>
                  {new Date(item.createdAt).toLocaleDateString("es-CO", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </Text>
              </View>
            </View>

            {/* Badge de estado */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "15", borderColor: statusColor + "30" }]}>
              <Ionicons name={STATUS_ICONS[item.status] as any} size={13} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          {/* Motivo de rechazo */}
          {item.motivoRechazo && (
            <View style={styles.motivoBox}>
              <Ionicons name="chatbubble-outline" size={13} color={Colors.danger} />
              <Text style={styles.motivoRechazo}>{item.motivoRechazo}</Text>
            </View>
          )}

          {/* Acción cancelar */}
          {item.status === "pendiente" && (
            <View style={styles.cardActions}>
              {isCancelling ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <Pressable onPress={() => handleCancel(item)} style={styles.cancelBtn}>
                  <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                  <Text style={styles.cancelBtnText}>Cancelar invitación</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Invitaciones</Text>
            <Text style={styles.headerSubtitle}>{invitations.length} en total</Text>
          </View>
          <Pressable
            onPress={() => router.push("/firm-components/firm-invite-lawyer" as any)}
            style={styles.newBtn}
            hitSlop={8}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.white} />
          </Pressable>
        </View>

        {/* Resumen de estados */}
        {invitations.length > 0 && (
          <View style={styles.summaryRow}>
            {Object.entries(STATUS_LABELS).map(([key, label]) =>
              counts[key] ? (
                <View key={key} style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: STATUS_COLORS[key] }]}>{counts[key]}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                </View>
              ) : null
            )}
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : invitations.length === 0 ? (
        /* Empty State */
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="paper-plane-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin invitaciones enviadas</Text>
          <Text style={styles.emptySubtext}>
            Invita abogados a tu firma para comenzar a colaborar
          </Text>
          <Pressable
            style={styles.inviteEmptyBtn}
            onPress={() => router.push("/firm-components/firm-invite-lawyer" as any)}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.white} />
            <Text style={styles.inviteEmptyText}>Buscar Abogados</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={item => item.id}
          renderItem={renderInvitation}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onRefresh={loadData}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  // Avatar
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  // Info
  info: { flex: 1, gap: 4 },
  nombre: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  especRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  especialidad: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  fecha: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Motivo rechazo
  motivoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.danger + "08",
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  motivoRechazo: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.danger },

  // Cancel action
  cardActions: { alignItems: "flex-start" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.danger + "10",
    borderWidth: 1,
    borderColor: Colors.danger + "25",
  },
  cancelBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.danger },

  // Empty state
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", lineHeight: 20 },
  inviteEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  inviteEmptyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
