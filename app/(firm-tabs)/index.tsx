import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, RefreshControl, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { UnifiedUser } from "@/lib/auth";
import { getFirmDashboardStats, FirmDashboardStats } from "@/lib/services/firmDashboardService";
import { getProcesos } from "@/lib/services/procesoService";
import { ProcesoDTO, type Proceso } from "@/shared/schema";
import { useInvitations } from "@/lib/invitations-context";

export default function FirmDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn } = useAuth();

  const [stats, setStats] = useState<FirmDashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<(ProcesoDTO & { clienteNombre?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { pendingCount } = useInvitations();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [s, procesos] = await Promise.all([
        getFirmDashboardStats(),
        getProcesos(5, 0),
      ]);
      setStats(s);
      setRecentCases(procesos.data);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const pieData = stats?.procesosPorEstado.map(e => ({
    x: e.nombre,
    y: e.total,
    color: e.color,
  })) || [];

  const barData = stats?.procesosPorTipo.map((t, i) => ({
    x: t.nombre.length > 10 ? t.nombre.substring(0, 10) + "..." : t.nombre,
    y: t.total,
  })) || [];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Bienvenido a</Text>
              <Text style={styles.userName}>{(user as UnifiedUser).user.name || "Mi Bufete"}</Text>
              <View style={styles.roleBadgeRow}>
                <Text style={styles.roleBadge}>Plan Empresarial</Text>
              </View>
            </View>
            <Pressable style={styles.avatarCircle}>
              <Ionicons name="business" size={24} color={Colors.primary} />
            </Pressable>
          </View>

          {/* Mini stats en el header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats?.totalAbogados ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Abogados</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats?.totalClientes ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Clientes</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats?.totalProcesos ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Procesos</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats?.procesosEsteMes ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Este mes</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/client/new")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + "15" }]}>
                <Ionicons name="person-add" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>Nuevo Cliente</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/case/new")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + "15" }]}>
                <Ionicons name="add-circle" size={20} color={Colors.success} />
              </View>
              <Text style={styles.actionText}>Nuevo Proceso</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/team")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.accent + "15" }]}>
                <Ionicons name="people" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.actionText}>Mi Equipo</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnInvitation, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/invitations")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + "15" }]}>
                <Ionicons name="mail" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.actionText}>Invitaciones</Text>
              {pendingCount > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Abogados Activos"
              value={stats?.abogadosActivos ?? 0}
              total={stats?.totalAbogados ?? 0}
              icon="people"
              color={Colors.primary}
            />
            <StatCard
              label="Clientes Activos"
              value={stats?.clientesActivos ?? 0}
              total={stats?.totalClientes ?? 0}
              icon="person"
              color={Colors.info}
            />
            <StatCard
              label="Procesos Activos"
              value={stats?.procesosActivos ?? 0}
              total={stats?.totalProcesos ?? 0}
              icon="pulse"
              color={Colors.success}
            />
            <StatCard
              label="Finalizados"
              value={stats?.procesosFinalizados ?? 0}
              total={stats?.totalProcesos ?? 0}
              icon="checkmark-circle"
              color={Colors.accent}
            />
            <StatCard
              label="Documentos"
              value={stats?.totalDocumentos ?? 0}
              icon="document-text"
              color={Colors.warning}
            />
            <StatCard
              label="Actividad Mes"
              value={stats?.actualizacionesEsteMes ?? 0}
              icon="trending-up"
              color={Colors.danger}
            />
            <StatCard
              label="Tareas Pendientes"
              value={stats?.tareasPendientes ?? 0}
              total={stats?.totalTareas ?? 0}
              icon="time"
              color={Colors.warning}
            />
            <StatCard
              label="Tareas En Progreso"
              value={stats?.tareasEnProgreso ?? 0}
              total={stats?.totalTareas ?? 0}
              icon="reload"
              color={Colors.info}
            />
            <StatCard
              label="Tareas Completadas"
              value={stats?.tareasCompletadas ?? 0}
              total={stats?.totalTareas ?? 0}
              icon="checkmark-done"
              color={Colors.success}
            />
          </View>

          {/* Gráfica de estados - Procesos por estado */}
          {pieData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Procesos por Estado</Text>
              <View style={styles.pieContainer}>
                <View style={styles.simplePieContainer}>
                  {pieData.map((item, idx) => {
                    const total = pieData.reduce((sum, d) => sum + d.y, 0);
                    const percentage = total > 0 ? (item.y / total) * 100 : 0;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.simplePieSegment,
                          {
                            backgroundColor: item.color,
                            flex: percentage,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
                <View style={styles.pieLegend}>
                  {pieData.map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>{item.x}</Text>
                      <Text style={styles.legendValue}>{item.y}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Gráfica de barras - Procesos por tipo */}
          {barData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Procesos por Tipo</Text>
              <View style={styles.barChartContainer}>
                {barData.map((item, idx) => {
                  const maxValue = Math.max(...barData.map(d => d.y), 1);
                  const barHeight = (item.y / maxValue) * 150;
                  return (
                    <View key={idx} style={styles.barItem}>
                      <Text style={styles.barValue}>{item.y}</Text>
                      <View style={[styles.bar, { height: Math.max(barHeight, 4) }]}>
                        <View
                          style={[
                            styles.barFill,
                            { height: Math.max(barHeight, 4) },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>{item.x}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Procesos Recientes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Procesos Recientes</Text>
            <Pressable onPress={() => router.push("/cases")}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </Pressable>
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

// ============================================
// StatCard Component
// ============================================
function StatCard({
  label, value, total, icon, color
}: {
  label: string;
  value: number;
  total?: number;
  icon: any;
  color: string;
}) {
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {percentage !== null && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percentage}%` as any, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerGradient: { paddingHorizontal: 24, paddingBottom: 24 },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.white, marginTop: 2 },
  roleBadgeRow: { marginTop: 4 },
  roleBadge: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-around",
  },
  headerStatItem: { alignItems: "center" },
  headerStatValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  headerStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  content: { paddingHorizontal: 20, marginTop: 16 },

  actionBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chartTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  pieContainer: { flexDirection: "row", alignItems: "center" },
  pieLegend: { flex: 1, gap: 8, paddingLeft: 8 },
  simplePieContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  simplePieSegment: {
    minWidth: 1,
    minHeight: 1,
  },
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 180,
    paddingTop: 10,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 2,
  },
  bar: {
    width: "80%",
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  legendValue: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.text },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  seeAll: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  caseCard: {
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
  caseCardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  caseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  caseInfo: { flex: 1, marginRight: 12 },
  caseRadicado: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  caseTipo: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
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
  caseCardFooter: { flexDirection: "row", gap: 16 },
  clienteRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clienteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    minWidth: "47%",        // ← máximo 2 por fila
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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