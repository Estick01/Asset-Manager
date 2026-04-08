import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getFirmDashboardStats, FirmDashboardStats } from "@/lib/services/firmDashboardService";
import { getProcesos } from "@/lib/services/procesoService";
import { ProcesoDTO, type FirmProfile } from "@/shared/schema";
import { useInvitations } from "@/lib/invitations-context";
import { useNotifications } from "@/lib/notifications-context";
import { getPendingReassignments } from "@/lib/services/ownershipService";
import { PendingReassignmentBanner } from "@/components/bufete/PendingReassignmentBanner";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CompanyStat({
  label,
  value,
  icon,
  color,
  compact = false,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.statCard, compact && styles.statCardCompact]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={compact ? 18 : 20} color={color} />
      </View>
      <Text style={[styles.statValue, compact && styles.statValueCompact]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Panel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction}>
            <Text style={styles.panelAction}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ActionTile({
  label,
  hint,
  icon,
  color,
  onPress,
  badge,
  compact = false,
  fullWidth = false,
}: {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  badge?: number;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionTile,
        compact && styles.actionTileCompact,
        fullWidth && styles.actionTileFullWidth,
        pressed && { opacity: 0.86 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.actionTileIcon, compact && styles.actionTileIconCompact, { backgroundColor: color + "16" }]}>
        <Ionicons name={icon} size={compact ? 16 : 18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.actionTileTitleRow}>
          <Text style={[styles.actionTileTitle, compact && styles.actionTileTitleCompact]} numberOfLines={1}>{label}</Text>
          {badge && badge > 0 ? (
            <View style={styles.actionTileBadge}>
              <Text style={styles.actionTileBadgeText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.actionTileHint, compact && styles.actionTileHintCompact]} numberOfLines={compact ? 1 : 2}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

function ProcessRow({ item }: { item: ProcesoDTO & { clienteNombre?: string } }) {
  const stateColor = item.estado?.color ?? Colors.textTertiary;
  return (
    <Pressable
      style={({ pressed }) => [styles.processRow, pressed && { opacity: 0.88 }]}
      onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
    >
      <View style={[styles.processAccent, { backgroundColor: stateColor }]} />
      <View style={styles.processContent}>
        <View style={styles.processTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.processId} numberOfLines={1}>{item.radicado}</Text>
            <Text style={styles.processType} numberOfLines={1}>{item.tipoProceso?.nombre ?? "Proceso"}</Text>
          </View>
          <View style={[styles.processState, { backgroundColor: stateColor + "18" }]}>
            <Text style={[styles.processStateText, { color: stateColor }]}>{item.estado?.nombre ?? "Sin estado"}</Text>
          </View>
        </View>

        <View style={styles.processMeta}>
          <View style={styles.processMetaItem}>
            <Ionicons name="business-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.processMetaText} numberOfLines={1}>{item.clienteNombre || "Sin cliente"}</Text>
          </View>
          <View style={styles.processMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.processMetaText}>{formatDate(item.fechaCreacion)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function DistributionBar({
  rows,
}: {
  rows: { nombre: string; total: number; color?: string }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.total, 0) || 1;
  return (
    <View style={styles.distributionWrap}>
      <View style={styles.distributionBar}>
        {rows.map((row, index) => (
          <View
            key={`${row.nombre}-${index}`}
            style={[
              styles.distributionSegment,
              {
                flex: row.total,
                backgroundColor: row.color || [Colors.primary, Colors.info, Colors.accent, Colors.success][index % 4],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.distributionLegend}>
        {rows.map((row, index) => {
          const color = row.color || [Colors.primary, Colors.info, Colors.accent, Colors.success][index % 4];
          return (
            <View key={`${row.nombre}-legend-${index}`} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendName}>{row.nombre}</Text>
              <Text style={styles.legendValue}>{Math.round((row.total / total) * 100)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function FirmDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const compactMobile = width < 420;
  const { user, isLoggedIn } = useAuth();
  const [stats, setStats] = useState<FirmDashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<(ProcesoDTO & { clienteNombre?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingReassignCount, setPendingReassignCount] = useState(0);
  const { pendingCount } = useInvitations();
  const { unreadCount: unreadNotifCount } = useNotifications();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const firmId = (user.profile as FirmProfile | undefined)?.id;
      const [dashboardStats, procesos, pendingIds] = await Promise.all([
        getFirmDashboardStats(),
        getProcesos(6, 0),
        firmId ? getPendingReassignments(firmId) : Promise.resolve([]),
      ]);

      setStats(dashboardStats);
      setRecentCases(procesos.data);
      setPendingReassignCount(pendingIds.length);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn) {
      void loadData();
    }
  }, [isLoggedIn, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = user?.user?.name || "Mi Bufete";
  const firmId = (user?.profile as FirmProfile | undefined)?.id ?? "";

  const statRows = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Abogados activos", value: stats.abogadosActivos, icon: "people-outline" as const, color: Colors.primary },
      { label: "Clientes activos", value: stats.clientesActivos, icon: "person-outline" as const, color: Colors.info },
      { label: "Procesos activos", value: stats.procesosActivos, icon: "pulse-outline" as const, color: Colors.success },
      { label: "Finalizados", value: stats.procesosFinalizados, icon: "checkmark-circle-outline" as const, color: Colors.accent },
      { label: "Documentos", value: stats.totalDocumentos, icon: "document-text-outline" as const, color: Colors.warning },
      { label: "Actividad del mes", value: stats.actualizacionesEsteMes, icon: "trending-up-outline" as const, color: Colors.danger },
      { label: "Tareas pendientes", value: stats.tareasPendientes, icon: "time-outline" as const, color: Colors.warning },
      { label: "En progreso", value: stats.tareasEnProgreso, icon: "refresh-outline" as const, color: Colors.info },
      { label: "Completadas", value: stats.tareasCompletadas, icon: "checkmark-done-outline" as const, color: Colors.success },
    ];
  }, [stats]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.emptyStateText}>No se pudo cargar el dashboard del bufete.</Text>
      </View>
    );
  }

  if (desktop) {
    return (
      <ScrollView
        style={styles.desktopScreen}
        contentContainerStyle={{ paddingBottom: metrics.gutter }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.desktopHero, { marginBottom: metrics.contentGap }]}>
          <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.desktopHeroGradient}>
            <View style={styles.desktopHeroTop}>
              <View style={styles.desktopBrandCluster}>
                <View style={styles.desktopBrandIcon}>
                  <Ionicons name="business-outline" size={30} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desktopHeroTitle}>{displayName}</Text>
                </View>
              </View>

              <View style={styles.desktopHeroStrip}>
                <View style={styles.desktopHeroMetric}>
                  <Text style={styles.desktopHeroMetricValue}>{stats.totalAbogados}</Text>
                  <Text style={styles.desktopHeroMetricLabel}>abogados</Text>
                </View>
                <View style={styles.desktopHeroDivider} />
                <View style={styles.desktopHeroMetric}>
                  <Text style={styles.desktopHeroMetricValue}>{stats.totalClientes}</Text>
                  <Text style={styles.desktopHeroMetricLabel}>clientes</Text>
                </View>
                <View style={styles.desktopHeroDivider} />
                <View style={styles.desktopHeroMetric}>
                  <Text style={styles.desktopHeroMetricValue}>{stats.totalProcesos}</Text>
                  <Text style={styles.desktopHeroMetricLabel}>procesos</Text>
                </View>
                <View style={styles.desktopHeroDivider} />
                <View style={styles.desktopHeroMetric}>
                  <Text style={styles.desktopHeroMetricValue}>{stats.procesosEsteMes}</Text>
                  <Text style={styles.desktopHeroMetricLabel}>nuevos este mes</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <PendingReassignmentBanner count={pendingReassignCount} firmId={firmId} />

        <View style={[styles.desktopStatsGrid, { gap: metrics.contentGap, marginTop: metrics.contentGap, marginBottom: metrics.contentGap }]}>
          {statRows.map((item) => (
            <CompanyStat key={item.label} {...item} compact />
          ))}
        </View>

        <View style={[styles.desktopColumns, { gap: metrics.contentGap }]}>
          <View style={styles.desktopMainColumn}>
            <Panel title="Acciones del bufete">
              <View style={styles.actionGrid}>
                <ActionTile
                  label="Nuevo cliente"
                  hint="Abre una nueva relación y registra sus datos base."
                  icon="person-add-outline"
                  color={Colors.primary}
                  onPress={() => router.push("/client/new")}
                />
                <ActionTile
                  label="Nuevo proceso"
                  hint="Lleva el intake del caso y asígnalo al responsable."
                  icon="add-circle-outline"
                  color={Colors.success}
                  onPress={() => router.push("/case/new")}
                />
                <ActionTile
                  label="Equipo"
                  hint="Administra abogados, roles y distribución operativa."
                  icon="people-circle-outline"
                  color={Colors.accent}
                  onPress={() => router.push("/firm-components/firm-team")}
                />
                <ActionTile
                  label="Invitaciones"
                  hint="Controla altas pendientes y seguimiento de invitaciones."
                  icon="mail-outline"
                  color={Colors.warning}
                  badge={pendingCount}
                  onPress={() => router.push("/firm-components/firm-invitations")}
                />
              </View>
            </Panel>

            <Panel title="Distribución de procesos por estado">
              <DistributionBar rows={stats.procesosPorEstado} />
            </Panel>

            <Panel title="Procesos recientes" actionLabel="Ver todos" onAction={() => router.push("/(firm-tabs)/cases" as any)}>
              <View style={styles.processList}>
                {recentCases.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Ionicons name="folder-open-outline" size={30} color={Colors.textTertiary} />
                    <Text style={styles.emptyStateTitle}>Aún no hay procesos recientes</Text>
                    <Text style={styles.emptyStateHint}>El panel mostrará aquí el flujo operativo más reciente del bufete.</Text>
                  </View>
                ) : (
                  recentCases.map((item) => <ProcessRow key={item.id} item={item} />)
                )}
              </View>
            </Panel>
          </View>

          <View style={styles.desktopSideColumn}>
            <Panel title="Resumen ejecutivo">
              <View style={styles.summaryStack}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Abogados suspendidos</Text>
                  <Text style={styles.summaryValue}>{stats.abogadosSuspendidos}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Reasignaciones pendientes</Text>
                  <Text style={styles.summaryValue}>{pendingReassignCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Alertas no leídas</Text>
                  <Text style={styles.summaryValue}>{unreadNotifCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tareas totales</Text>
                  <Text style={styles.summaryValue}>{stats.totalTareas}</Text>
                </View>
              </View>
            </Panel>

            <Panel title="Volumen por tipo de proceso">
              <View style={styles.typeStack}>
                {stats.procesosPorTipo.slice(0, 6).map((item, index) => (
                  <View key={`${item.nombre}-${index}`} style={styles.typeRow}>
                    <View style={styles.typeHeader}>
                      <Text style={styles.typeName} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.typeValue}>{item.total}</Text>
                    </View>
                    <View style={styles.typeBarTrack}>
                      <View
                        style={[
                          styles.typeBarFill,
                          {
                            width: `${Math.max(10, (item.total / Math.max(...stats.procesosPorTipo.map((row) => row.total), 1)) * 100)}%` as any,
                            backgroundColor: [Colors.primary, Colors.info, Colors.accent, Colors.success][index % 4],
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Panel>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={[
            styles.mobileHeroGradient,
            compactMobile && styles.mobileHeroGradientCompact,
            { paddingTop: insets.top + 16 },
          ]}
        >
          <View style={styles.mobileHeaderTop}>
            <View style={styles.mobileHeaderIdentity}>
              <Text style={styles.mobileGreeting}>Bienvenido a</Text>
              <Text style={styles.mobileTitle} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
              <View style={styles.mobileBadgeWrap}>
                <Text style={styles.mobileBadge}>Plan Empresarial</Text>
              </View>
            </View>
            <View style={[styles.mobileHeaderActions, compactMobile && styles.mobileHeaderActionsCompact]}>
              <Pressable style={styles.mobileHeaderBtn} onPress={() => router.push("/firm-components/firm-notifications")}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.mobileHeaderBtn} onPress={() => router.push("/firm-components/firm-settings" as any)}>
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={[styles.mobileHeroStats, compactMobile && styles.mobileHeroStatsCompact]}>
            <View style={styles.mobileHeroStat}>
              <Text style={styles.mobileHeroValue}>{stats.totalAbogados}</Text>
              <Text style={styles.mobileHeroLabel}>Abogados</Text>
            </View>
            <View style={styles.mobileHeroDivider} />
            <View style={styles.mobileHeroStat}>
              <Text style={styles.mobileHeroValue}>{stats.totalClientes}</Text>
              <Text style={styles.mobileHeroLabel}>Clientes</Text>
            </View>
            <View style={styles.mobileHeroDivider} />
            <View style={styles.mobileHeroStat}>
              <Text style={styles.mobileHeroValue}>{stats.totalProcesos}</Text>
              <Text style={styles.mobileHeroLabel}>Procesos</Text>
            </View>
          </View>
        </LinearGradient>

        <PendingReassignmentBanner count={pendingReassignCount} firmId={firmId} />

        <View style={[styles.mobileContent, compactMobile && styles.mobileContentCompact]}>
          <View style={styles.mobileActionGrid}>
            <ActionTile
              label="Nuevo cliente"
              hint="Alta rápida de relación."
              icon="person-add-outline"
              color={Colors.primary}
              compact={compactMobile}
              fullWidth
              onPress={() => router.push("/client/new")}
            />
            <ActionTile
              label="Nuevo proceso"
              hint="Registro de caso."
              icon="add-circle-outline"
              color={Colors.success}
              compact={compactMobile}
              fullWidth
              onPress={() => router.push("/case/new")}
            />
            <ActionTile
              label="Mi equipo"
              hint="Gestiona abogados."
              icon="people-circle-outline"
              color={Colors.accent}
              compact={compactMobile}
              fullWidth
              onPress={() => router.push("/firm-components/firm-team")}
            />
            <ActionTile
              label="Invitaciones"
              hint="Pendientes por revisar."
              icon="mail-outline"
              color={Colors.warning}
              badge={pendingCount}
              compact={compactMobile}
              fullWidth
              onPress={() => router.push("/firm-components/firm-invitations")}
            />
          </View>

          <View style={[styles.mobileStatsGrid, compactMobile && styles.mobileStatsGridCompact]}>
            {statRows.slice(0, 6).map((item) => (
              <View key={item.label} style={compactMobile ? styles.mobileSingleColumnItem : styles.mobileHalfColumnItem}>
                <CompanyStat {...item} />
              </View>
            ))}
          </View>

          <Panel title="Procesos recientes" actionLabel="Ver todos" onAction={() => router.push("/(firm-tabs)/cases" as any)}>
            <View style={styles.processList}>
              {recentCases.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="folder-open-outline" size={30} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateTitle}>Sin procesos</Text>
                  <Text style={styles.emptyStateHint}>Crea tu primer proceso para comenzar.</Text>
                </View>
              ) : (
                recentCases.map((item) => <ProcessRow key={item.id} item={item} />)
              )}
            </View>
          </Panel>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  desktopScreen: { flex: 1, backgroundColor: Colors.background },
  desktopHero: { borderRadius: 28, overflow: "hidden" },
  desktopHeroGradient: { paddingHorizontal: 28, paddingVertical: 26 },
  desktopHeroTop: { gap: 20 },
  desktopBrandCluster: { flexDirection: "row", alignItems: "center", gap: 18 },
  desktopBrandIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopHeroTitle: { fontSize: 34, fontFamily: "Inter_700Bold", color: Colors.white },
  desktopHeroStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.11)",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  desktopHeroMetric: { flex: 1, alignItems: "center" },
  desktopHeroMetricValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.white },
  desktopHeroMetricLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2, textAlign: "center" },
  desktopHeroDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.16)" },
  desktopStatsGrid: { flexDirection: "row", flexWrap: "wrap" },
  desktopColumns: { flexDirection: "row", alignItems: "flex-start" },
  desktopMainColumn: { flex: 1.5, gap: 20 },
  desktopSideColumn: { width: 360, gap: 20 },
  panel: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
    gap: 16,
    width: "100%",
    alignSelf: "stretch",
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  panelTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  panelAction: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  actionTile: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FBFCFE",
    padding: 16,
    flexBasis: "48%",
    flexGrow: 1,
    width: "100%",
    alignSelf: "stretch",
    minWidth: 0,
  },
  actionTileCompact: {
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  actionTileFullWidth: {
    flexBasis: "auto",
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    maxWidth: "100%",
  },
  actionTileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTileIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  actionTileTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionTileTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text, flexShrink: 1 },
  actionTileTitleCompact: { fontSize: 13 },
  actionTileHint: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 4 },
  actionTileHintCompact: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  actionTileBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.warning,
    paddingHorizontal: 5,
  },
  actionTileBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.white },
  statCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 18,
    backgroundColor: Colors.white,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.06)",
    gap: 6,
  },
  statCardCompact: { minWidth: 0, flexBasis: "13.6%", padding: 16 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text },
  statValueCompact: { fontSize: 24 },
  statLabel: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  distributionWrap: { gap: 16 },
  distributionBar: { height: 18, borderRadius: 999, overflow: "hidden", flexDirection: "row", backgroundColor: Colors.borderLight },
  distributionSegment: { height: "100%" },
  distributionLegend: { gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  legendValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  processList: { gap: 12 },
  processRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  processAccent: { width: 4 },
  processContent: { flex: 1, padding: 16, gap: 12 },
  processTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  processId: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  processType: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 3 },
  processState: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  processStateText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  processMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  processMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  processMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  summaryStack: { gap: 12 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  typeStack: { gap: 14 },
  typeRow: { gap: 7 },
  typeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  typeName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  typeValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  typeBarTrack: { height: 8, borderRadius: 999, backgroundColor: Colors.borderLight, overflow: "hidden" },
  typeBarFill: { height: "100%", borderRadius: 999 },
  emptyStateBox: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  emptyStateTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "center" },
  emptyStateHint: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center" },
  emptyStateText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  mobileHeroGradient: { paddingHorizontal: 24, paddingBottom: 24 },
  mobileHeroGradientCompact: { paddingHorizontal: 16, paddingBottom: 20 },
  mobileHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 },
  mobileHeaderIdentity: { flex: 1, minWidth: 0, paddingRight: 6 },
  mobileGreeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  mobileTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.white, marginTop: 2 },
  mobileBadgeWrap: { marginTop: 4 },
  mobileBadge: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  mobileHeaderActions: { flexDirection: "row", gap: 10, flexShrink: 0 },
  mobileHeaderActionsCompact: { alignSelf: "flex-start", gap: 8 },
  mobileHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  notifBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.white },
  mobileHeroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-around",
  },
  mobileHeroStatsCompact: {
    padding: 12,
  },
  mobileHeroStat: { flex: 1, alignItems: "center" },
  mobileHeroValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  mobileHeroLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  mobileHeroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  mobileContent: { paddingHorizontal: 16, marginTop: 16, gap: 16 },
  mobileContentCompact: { paddingHorizontal: 12, marginTop: 12, gap: 14 },
  mobileActionGrid: { gap: 10, width: "100%", alignSelf: "stretch" },
  mobileStatsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mobileStatsGridCompact: { gap: 8 },
  mobileHalfColumnItem: { flexBasis: "48%", flexGrow: 1 },
  mobileSingleColumnItem: { width: "100%" },
});
