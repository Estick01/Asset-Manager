import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { Abogado, Cliente, getAbogado, getCurrentCliente, getProcesosByCliente, logoutCliente, Proceso } from "@/lib/storage";

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

export default function ClientPortalScreen() {
  const insets = useSafeAreaInsets();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [abogado, setAbogado] = useState<Abogado | null>(null);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    const c = await getCurrentCliente();
    if (!c) {
      return;
    }

    setCliente(c);

    const ab = await getAbogado();
    setAbogado(ab);

    const procs = await getProcesosByCliente(c.id);
    setProcesos(
      procs.data.sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime()
      )
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmLogout = async () => {
    await logoutCliente();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLogoutModalVisible(false);
    router.replace("/portal/login");
  };

  const activos = procesos.filter((p) => p.estado?.codigo === "activo" || p.estado?.codigo === "en_tramite").length;

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2980B9" />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <LinearGradient colors={["#0D3B66", "#1B5A8C"]} style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hola,</Text>
              <Text style={styles.clientName}>{cliente?.nombre || "Cliente"}</Text>
              {abogado && (
                <View style={styles.abogadoRow}>
                  <Ionicons name="briefcase-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.abogadoText}>{abogado.despacho}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={() => router.push("/portal/profile")} style={styles.headerBtn}>
                <Ionicons name="person-outline" size={22} color={Colors.white} />
              </Pressable>
              <Pressable onPress={() => setIsLogoutModalVisible(true)} style={styles.headerBtn}>
                <Ionicons name="log-out-outline" size={22} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{procesos.length}</Text>
              <Text style={styles.summaryLabel}>Total Procesos</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{activos}</Text>
              <Text style={styles.summaryLabel}>Activos</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Mis Procesos</Text>

          {procesos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin procesos</Text>
              <Text style={styles.emptySubtitle}>No tienes procesos registrados aun</Text>
            </View>
          ) : (
            procesos.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.procesoCard, pressed && styles.procesoCardPressed]}
                onPress={() => router.push({ pathname: "/portal/case", params: { id: p.id } })}
              >
                <View style={styles.procesoHeader}>
                  <View style={styles.procesoInfo}>
                    <Text style={styles.procesoRadicado}>{p.radicado}</Text>
                    <Text style={styles.procesoTipo}>{p.tipoProceso}</Text>
                  </View>
                  <View style={[styles.estadoBadge, { backgroundColor: (ESTADO_COLORS[p.estado?.codigo || "archivado"] || Colors.textTertiary) + "15" }]}>
                    <View style={[styles.estadoDot, { backgroundColor: ESTADO_COLORS[p.estado?.codigo || "archivado"] || Colors.textTertiary }]} />
                    <Text style={[styles.estadoText, { color: ESTADO_COLORS[p.estado?.codigo || "archivado"] || Colors.textTertiary }]}>
                      {ESTADO_LABELS[p.estado?.codigo || "archivado"] || p.estado?.nombre}
                    </Text>
                  </View>
                </View>
                <View style={styles.procesoFooter}>
                  <View style={styles.metaRow}>
                    <Ionicons name="business-outline" size={13} color={Colors.textTertiary} />
                    <Text style={styles.metaText}>{p.juzgado}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
      <StyledModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        title="Salir"
        onConfirm={handleConfirmLogout}
        confirmText="Salir"
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>¿Deseas cerrar tu sesión?</Text>
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  clientName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginTop: 2,
  },
  abogadoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  abogadoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  procesoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  procesoCardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  procesoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  procesoInfo: { flex: 1, marginRight: 12 },
  procesoRadicado: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  procesoTipo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  procesoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  modalText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

