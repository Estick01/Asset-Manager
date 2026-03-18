import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { useUnifiedAuth } from "@/lib/auth-context";
import { getProcesosByCliente } from "@/lib/services/procesoService";
import { ProcesoDTO } from "@/shared/schema/proceso.schema";

const ESTADO_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  activo:     { color: Colors.success,      label: "Activo",      icon: "pulse" },
  en_tramite: { color: Colors.warning,      label: "En Trámite",  icon: "time-outline" },
  finalized:  { color: Colors.info,         label: "Finalizado",  icon: "checkmark-circle-outline" },
  archivado:  { color: Colors.textTertiary, label: "Archivado",   icon: "archive-outline" },
};

export default function ClientPortalScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, logout } = useUnifiedAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [procesos, setProcesos] = useState<ProcesoDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !profile) return;
    const procs = await getProcesosByCliente(user.user.id);
    setProcesos(
      procs.data.sort((a, b) =>
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      )
    );
  }, [user, profile]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
      // AuthRouteProtection handles the redirect to /login automatically
    } catch {
      setLoggingOut(false);
    }
  };

  const activos    = procesos.filter(p => p.estado?.codigo === "activo" || p.estado?.codigo === "en_tramite").length;
  const finalizados = procesos.filter(p => p.estado?.codigo === "finalized").length;

  // ── Render proceso card ───────────────────────────────────────
  const renderProceso = ({ item: p }: { item: ProcesoDTO }) => {
    const estado = ESTADO_CONFIG[p.estado?.codigo || "archivado"] ?? ESTADO_CONFIG.archivado;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/portal/case", params: { id: p.id } })}
      >
        {/* Barra lateral */}
        <View style={[styles.cardAccent, { backgroundColor: estado.color }]} />

        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <Text style={styles.radicado}>{p.radicado}</Text>
              {p.tipoProceso?.nombre && (
                <Text style={styles.tipo}>{p.tipoProceso.nombre}</Text>
              )}
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estado.color + "15" }]}>
              <View style={[styles.estadoDot, { backgroundColor: estado.color }]} />
              <Text style={[styles.estadoText, { color: estado.color }]}>
                {estado.label}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            {p.juzgado && (
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.metaText} numberOfLines={1}>{p.juzgado}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>
                {new Date(p.fechaCreacion).toLocaleDateString("es-CO", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} style={{ marginRight: 14 }} />
      </Pressable>
    );
  };

  // ── Header component ──────────────────────────────────────────
  const ListHeader = () => (
    <>
      <LinearGradient
        colors={["#0D3B66", "#1B5A8C"]}
        style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        {/* Top row */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.clientName}>
              {user?.user?.name || user?.user?.email || "Cliente"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setIsLogoutModalVisible(true)} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="log-out-outline" size={20} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{procesos.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{activos}</Text>
            <Text style={styles.summaryLabel}>Activos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "rgba(255,255,255,0.6)" }]}>{finalizados}</Text>
            <Text style={styles.summaryLabel}>Finalizados</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Mis Procesos</Text>
        {procesos.length > 0 && (
          <Text style={styles.sectionCount}>{procesos.length}</Text>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={procesos}
        keyExtractor={item => item.id}
        renderItem={renderProceso}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2980B9" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={38} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin procesos</Text>
            <Text style={styles.emptySubtitle}>No tienes procesos registrados aún</Text>
          </View>
        )}
      />

      <StyledModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        title="Cerrar Sesión"
        onConfirm={handleConfirmLogout}
        confirmText={loggingOut ? "Saliendo..." : "Salir"}
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>¿Deseas cerrar tu sesión?</Text>
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──────────────────────────────────────────────────
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  clientName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  // ── Summary ──────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // ── List ─────────────────────────────────────────────────────
  listContent: { paddingBottom: 100 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
  },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cardAccent: { width: 4, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitleSection: { flex: 1 },
  radicado: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  tipo: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, marginTop: 2,
  },
  estadoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
  },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardFooter: { flexDirection: "row", gap: 14 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, maxWidth: 140,
  },

  // ── Empty ─────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  emptySubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, textAlign: "center",
  },

  // ── Modal ─────────────────────────────────────────────────────
  modalText: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center", lineHeight: 22,
  },
});