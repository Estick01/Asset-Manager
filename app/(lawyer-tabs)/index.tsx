import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

import { getDashboardStats } from '@/lib/services/adminService';
import { getProcesos } from '@/lib/services/procesoService';
import { type ProcesoDTO } from '@/shared/schema';
import { AbogadoUser, useAuth } from "@/lib/auth-context";
import { useInvitations } from "@/lib/invitations-context";



export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalClientes: 0, totalProcesos: 0, procesosActivos: 0, procesosFinalizados: 0 });
  const [recentCases, setRecentCases] = useState<ProcesoDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { pendingCount, refreshCount } = useInvitations();

  const loadData = async () => {
    const [s, procesos] = await Promise.all([
      getDashboardStats(),
      getProcesos(5, 0),
    ]);

    setStats(s);
    setRecentCases(procesos.data);
  };


  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  const statCards = [
    { label: "Clientes", value: stats.totalClientes, icon: "people" as const, color: Colors.primary },
    { label: "Procesos", value: stats.totalProcesos, icon: "document-text" as const, color: Colors.info },
    { label: "Activos", value: stats.procesosActivos, icon: "pulse" as const, color: Colors.success },
    { label: "Finalizados", value: stats.procesosFinalizados, icon: "checkmark-circle" as const, color: Colors.accent },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Bienvenido</Text>
              <Text style={styles.userName}>
                {user?.profile && 'firstName' in user.profile
                  ? `${user.profile.firstName || ''} ${('lastName' in user.profile ? user.profile.lastName : '')}`.trim()
                  : user?.user?.name || 'Abogado'}
              </Text>
              <Text style={styles.despacho}>
                {user?.profile && 'specialization' in user.profile ? user.profile.specialization : ''}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/profile/lawyer")} style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            {statCards.map((card) => (
              <View key={card.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: card.color + "15" }]}>
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.quickActions}>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]} onPress={() => router.push("/client/new")}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + "15" }]}>
                <Ionicons name="person-add" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>Nuevo Cliente</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]} onPress={() => router.push("/case/new")}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + "15" }]}>
                <Ionicons name="add-circle" size={20} color={Colors.success} />
              </View>
              <Text style={styles.actionText}>Nuevo Proceso</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnInvitation, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/(lawyer-tabs)/invitations")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + "15" }]}>
                <Ionicons name="mail" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.actionText}>Invitaciones</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{pendingCount}</Text>
              </View>
            </Pressable>
          </View>
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Procesos Recientes</Text>

          </View>

          {recentCases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin procesos</Text>
              <Text style={styles.emptySubtitle}>Crea tu primer proceso para comenzar</Text>
            </View>
          ) : (
            recentCases.map((caso) => (
              <Pressable
                key={caso.id}
                style={({ pressed }) => [styles.caseCard, pressed && styles.caseCardPressed]}
                onPress={() => router.push({ pathname: "/case/[id]", params: { id: caso.id } })}
              >
                <View style={styles.caseCardHeader}>
                  <View style={styles.caseInfo}>
                    <Text style={styles.caseRadicado}>{caso.radicado}</Text>
                    <Text style={styles.caseTipo}>{caso.tipoProceso?.nombre}</Text>
                  </View>
                  <View style={[styles.estadoBadge, { backgroundColor: (caso.estado?.color ?? Colors.textTertiary) + "1A" }]}>
                    <View style={[styles.estadoDot, { backgroundColor: caso.estado?.color || Colors.textTertiary }]} />
                    <Text style={[styles.estadoText, { color: caso.estado?.color || Colors.textTertiary }]}>
                      {caso.estado?.nombre}
                    </Text>
                  </View>
                </View>
                <View style={styles.caseCardFooter}>
                  <View style={styles.clienteRow}>
                    <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.clienteText}>{caso.clienteNombre}</Text>
                  </View>
                  <View style={styles.clienteRow}>
                    <Ionicons name="business-outline" size={14} color={Colors.textTertiary} />
                    <Text style={styles.clienteText}>{caso.juzgado}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  userName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginTop: 2,
  },
  despacho: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    minHeight: 56,
    minWidth: "47%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
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
  caseCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  caseCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  caseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  caseInfo: {
    flex: 1,
    marginRight: 12,
  },
  caseRadicado: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  caseTipo: {
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
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estadoText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  caseCardFooter: {
    flexDirection: "row",
    gap: 16,
  },
  clienteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clienteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  actionBtnInvitation: {
    borderWidth: 1.5,
    borderColor: Colors.warning + "40",
  },
  actionBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
});
