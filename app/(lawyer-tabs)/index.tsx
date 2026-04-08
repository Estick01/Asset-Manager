import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getDashboardStats } from "@/lib/services/adminService";
import { getProcesos } from "@/lib/services/procesoService";
import { type ProcesoDTO } from "@/shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useInvitations } from "@/lib/invitations-context";
import { useNotifications } from "@/lib/notifications-context";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

function StatTile({
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
    <View style={[styles.statTile, compact && styles.statTileCompact]}>
      <View style={[styles.statTileIcon, { backgroundColor: color + "14" }]}>
        <Ionicons name={icon} size={compact ? 18 : 20} color={color} />
      </View>
      <Text style={[styles.statTileValue, compact && styles.statTileValueCompact]}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  label,
  hint,
  icon,
  color,
  onPress,
  compact = false,
  fullWidth = false,
}: {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        compact && styles.quickActionCompact,
        fullWidth && styles.quickActionFullWidth,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, compact && styles.quickActionIconCompact, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={compact ? 16 : 18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.quickActionTitle, compact && styles.quickActionTitleCompact]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.quickActionHint, compact && styles.quickActionHintCompact]} numberOfLines={compact ? 1 : 2}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </Pressable>
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

function ProcessPreviewCard({ item }: { item: ProcesoDTO }) {
  const stateColor = item.estado?.color ?? Colors.textTertiary;
  return (
    <Pressable
      style={({ pressed }) => [styles.processCard, pressed && { opacity: 0.88 }]}
      onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
    >
      <View style={[styles.processAccent, { backgroundColor: stateColor }]} />
      <View style={styles.processBody}>
        <View style={styles.processHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.processId} numberOfLines={1}>{item.radicado}</Text>
            <Text style={styles.processType} numberOfLines={1}>{item.tipoProceso?.nombre ?? "Proceso"}</Text>
          </View>
          <View style={[styles.processBadge, { backgroundColor: stateColor + "16" }]}>
            <View style={[styles.processBadgeDot, { backgroundColor: stateColor }]} />
            <Text style={[styles.processBadgeText, { color: stateColor }]}>{item.estado?.nombre ?? "Sin estado"}</Text>
          </View>
        </View>

        <View style={styles.processMetaRow}>
          <View style={styles.processMetaItem}>
            <Ionicons name="person-outline" size={12} color={Colors.textTertiary} />
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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const compactMobile = width < 420;
  const { user } = useAuth();
  const { pendingCount } = useInvitations();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalProcesos: 0,
    procesosActivos: 0,
    procesosFinalizados: 0,
    totalTareas: 0,
    tareasPendientes: 0,
    tareasEnProgreso: 0,
    tareasCompletadas: 0,
  });
  const [recentCases, setRecentCases] = useState<ProcesoDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  async function loadData() {
    const [dashboardStats, procesos] = await Promise.all([
      getDashboardStats(),
      getProcesos(6, 0),
    ]);

    setStats(dashboardStats);
    setRecentCases(procesos.data);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = user?.user?.name || "Abogado";
  const specialization =
    user?.profile && "specialization" in user.profile
      ? user.profile.specialization || "Panel principal"
      : "Panel principal";
  const verificationStatus =
    user?.profile && "professionalVerificationStatus" in user.profile
      ? user.profile.professionalVerificationStatus ?? "pendiente"
      : "pendiente";
  const showVerificationNotice = verificationStatus !== "verificado";

  const statCards = useMemo(
    () => [
      { label: "Clientes", value: stats.totalClientes, icon: "people-outline" as const, color: Colors.primary },
      { label: "Procesos", value: stats.totalProcesos, icon: "document-text-outline" as const, color: Colors.info },
      { label: "Activos", value: stats.procesosActivos, icon: "pulse-outline" as const, color: Colors.success },
      { label: "Finalizados", value: stats.procesosFinalizados, icon: "checkmark-circle-outline" as const, color: Colors.accent },
      { label: "Pendientes", value: stats.tareasPendientes, icon: "time-outline" as const, color: Colors.warning },
      { label: "En progreso", value: stats.tareasEnProgreso, icon: "refresh-outline" as const, color: Colors.info },
      { label: "Completadas", value: stats.tareasCompletadas, icon: "checkmark-done-outline" as const, color: Colors.success },
    ],
    [stats],
  );

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
            <View style={styles.desktopHeroMain}>
              <View style={styles.desktopIdentity}>
                <View style={styles.desktopAvatar}>
                  <Text style={styles.desktopAvatarText}>{initials(displayName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desktopEyebrow}>Workspace legal</Text>
                  <Text style={styles.desktopName}>{displayName}</Text>
                  <Text style={styles.desktopSubtitle}>{specialization}</Text>
                </View>
              </View>

              <View style={styles.desktopHeroStats}>
                <View style={styles.desktopHeroStat}>
                  <Text style={styles.desktopHeroValue}>{stats.totalProcesos}</Text>
                  <Text style={styles.desktopHeroLabel}>procesos</Text>
                </View>
                <View style={styles.desktopHeroDivider} />
                <View style={styles.desktopHeroStat}>
                  <Text style={styles.desktopHeroValue}>{stats.tareasPendientes}</Text>
                  <Text style={styles.desktopHeroLabel}>pendientes</Text>
                </View>
                <View style={styles.desktopHeroDivider} />
                <View style={styles.desktopHeroStat}>
                  <Text style={styles.desktopHeroValue}>{unreadNotifCount}</Text>
                  <Text style={styles.desktopHeroLabel}>alertas</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {showVerificationNotice && (
          <View style={[styles.verificationBanner, { marginBottom: metrics.contentGap }]}>
            <View style={styles.verificationBannerIcon}>
              <Ionicons name="shield-outline" size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verificationBannerTitle}>
                {verificationStatus === "rechazado"
                  ? "Tu tarjeta profesional requiere corrección"
                  : "Tu tarjeta profesional sigue en verificación"}
              </Text>
              <Text style={styles.verificationBannerText}>
                Mientras este estado no sea aprobado, no podrás tomar casos de comunidad ni aparecer en recomendaciones públicas.
              </Text>
            </View>
            <Pressable onPress={() => router.push("/lawyer-componts/lawyer-settings" as any)}>
              <Text style={styles.verificationBannerLink}>Ver detalles</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.desktopStatGrid, { gap: metrics.contentGap, marginBottom: metrics.contentGap }]}>
          {statCards.map((card) => (
            <StatTile key={card.label} {...card} compact />
          ))}
        </View>

        <View style={[styles.desktopColumns, { gap: metrics.contentGap }]}>
          <View style={styles.desktopMainColumn}>
            <Panel title="Acciones rápidas">
              <View style={styles.desktopQuickGrid}>
                <QuickAction
                  label="Nuevo cliente"
                  hint="Crea un registro y continúa con el intake."
                  icon="person-add-outline"
                  color={Colors.primary}
                  onPress={() => router.push("/client/new")}
                />
                <QuickAction
                  label="Nuevo proceso"
                  hint="Registra un caso y asigna seguimiento."
                  icon="add-circle-outline"
                  color={Colors.success}
                  onPress={() => router.push("/case/new")}
                />
                <QuickAction
                  label="Invitaciones"
                  hint={`${pendingCount} pendientes por revisar.`}
                  icon="mail-outline"
                  color={Colors.warning}
                  onPress={() => router.push("/lawyer-componts/lawyer-invitations")}
                />
                <QuickAction
                  label="Calendario"
                  hint="Consulta agenda, vencimientos y próximas tareas."
                  icon="calendar-outline"
                  color={Colors.info}
                  onPress={() => router.push("/(lawyer-tabs)/calendar" as any)}
                />
              </View>
            </Panel>

            <Panel title="Procesos recientes" actionLabel="Ver todos" onAction={() => router.push("/(lawyer-tabs)/cases" as any)}>
              <View style={styles.processList}>
                {recentCases.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="folder-open-outline" size={30} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Aún no tienes procesos recientes</Text>
                    <Text style={styles.emptyHint}>Los procesos aparecerán aquí cuando tengas actividad registrada.</Text>
                  </View>
                ) : (
                  recentCases.map((item) => <ProcessPreviewCard key={item.id} item={item} />)
                )}
              </View>
            </Panel>
          </View>

          <View style={styles.desktopSideColumn}>
            <Panel title="Resumen operativo">
              <View style={styles.sideStatStack}>
                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Carga total de tareas</Text>
                  <Text style={styles.sideStatValue}>{stats.totalTareas}</Text>
                </View>
                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Casos activos</Text>
                  <Text style={styles.sideStatValue}>{stats.procesosActivos}</Text>
                </View>
                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Invitaciones pendientes</Text>
                  <Text style={styles.sideStatValue}>{pendingCount}</Text>
                </View>
                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Alertas no leídas</Text>
                  <Text style={styles.sideStatValue}>{unreadNotifCount}</Text>
                </View>
              </View>
            </Panel>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.mobileScreen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={[
            styles.mobileHero,
            compactMobile && styles.mobileHeroCompact,
            { paddingTop: insets.top + 16 },
          ]}
        >
          <View style={styles.mobileHeroHeader}>
            <View style={styles.mobileHeroIdentity}>
              <Text style={styles.mobileHeroEyebrow}>Bienvenido</Text>
              <Text style={styles.mobileHeroName} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
              <Text style={styles.mobileHeroSubtitle} numberOfLines={1} ellipsizeMode="tail">{specialization}</Text>
            </View>
            <View style={[styles.mobileHeroActions, compactMobile && styles.mobileHeroActionsCompact]}>
              <Pressable style={styles.mobileHeroButton} onPress={() => router.push("/(lawyer-tabs)/calendar" as any)}>
                <Ionicons name="calendar-outline" size={20} color={Colors.white} />
              </Pressable>
              <Pressable style={styles.mobileHeroButton} onPress={() => router.push("/lawyer-componts/lawyer-notifications")}>
                <Ionicons name="notifications-outline" size={20} color={Colors.white} />
              </Pressable>
              <Pressable style={styles.mobileHeroButton} onPress={() => router.push("/lawyer-componts/lawyer-settings" as any)}>
                <Ionicons name="settings-outline" size={20} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.mobileBody, compactMobile && styles.mobileBodyCompact]}>
          {showVerificationNotice && (
            <View style={styles.verificationBanner}>
              <View style={styles.verificationBannerIcon}>
                <Ionicons name="shield-outline" size={18} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verificationBannerTitle}>
                  {verificationStatus === "rechazado"
                    ? "Tarjeta profesional por corregir"
                    : "Tarjeta profesional en verificación"}
                </Text>
                <Text style={styles.verificationBannerText}>
                  Aún no puedes tomar casos de comunidad ni aparecer en recomendaciones.
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.mobileSection, styles.mobileStatsSection]}>
            <View style={[styles.mobileStatGrid, compactMobile && styles.mobileStatGridCompact]}>
              {statCards.slice(0, 6).map((card) => (
                <View key={card.label} style={compactMobile ? styles.mobileSingleColumnItem : styles.mobileHalfColumnItem}>
                  <StatTile {...card} />
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.mobileSection, styles.mobileActionsSection]}>
            <Panel title="Acciones rápidas">
              <View style={styles.mobileQuickStack}>
                <QuickAction
                  label="Nuevo cliente"
                  hint="Crear ficha y comenzar seguimiento."
                  icon="person-add-outline"
                  color={Colors.primary}
                  compact={compactMobile}
                  fullWidth
                  onPress={() => router.push("/client/new")}
                />
                <QuickAction
                  label="Nuevo proceso"
                  hint="Registrar un caso nuevo."
                  icon="add-circle-outline"
                  color={Colors.success}
                  compact={compactMobile}
                  fullWidth
                  onPress={() => router.push("/case/new")}
                />
                <QuickAction
                  label="Invitaciones"
                  hint={`${pendingCount} pendientes`}
                  icon="mail-outline"
                  color={Colors.warning}
                  compact={compactMobile}
                  fullWidth
                  onPress={() => router.push("/lawyer-componts/lawyer-invitations")}
                />
              </View>
            </Panel>
          </View>

          <View style={[styles.mobileSection, styles.mobileProcessesSection]}>
            <Panel title="Procesos recientes" actionLabel="Ver todos" onAction={() => router.push("/(lawyer-tabs)/cases" as any)}>
              <View style={styles.processList}>
                {recentCases.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="folder-open-outline" size={28} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Sin procesos recientes</Text>
                    <Text style={styles.emptyHint}>Tus casos aparecerán aquí con un acceso rápido.</Text>
                  </View>
                ) : (
                  recentCases.map((item) => <ProcessPreviewCard key={item.id} item={item} />)
                )}
              </View>
            </Panel>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  desktopHero: {
    borderRadius: 28,
    overflow: "hidden",
  },
  desktopHeroGradient: {
    paddingHorizontal: 28,
    paddingVertical: 26,
  },
  desktopHeroMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  desktopIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    flex: 1,
  },
  desktopAvatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopAvatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  desktopEyebrow: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.64)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  desktopName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  desktopSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
  },
  desktopHeroStats: {
    minWidth: 320,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  desktopHeroStat: {
    flex: 1,
    alignItems: "center",
  },
  desktopHeroValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  desktopHeroLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  desktopHeroDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  desktopStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  desktopColumns: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  desktopMainColumn: {
    flex: 1.45,
    gap: 20,
  },
  desktopSideColumn: {
    width: 360,
    gap: 20,
  },
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
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  panelAction: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  desktopQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  quickAction: {
    minHeight: 84,
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
  quickActionCompact: {
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  quickActionFullWidth: {
    flexBasis: "auto",
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    maxWidth: "100%",
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  quickActionTitleCompact: {
    fontSize: 13,
  },
  quickActionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 3,
  },
  quickActionHintCompact: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  processList: {
    gap: 12,
  },
  processCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  processAccent: {
    width: 4,
  },
  processBody: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  processHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  processId: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  processType: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 3,
  },
  processBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  processBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  processBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  processMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  processMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  processMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  sideStatStack: {
    gap: 12,
  },
  sideStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sideStatLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  sideStatValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  mobileScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mobileHero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  mobileHeroCompact: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  mobileHeroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  mobileHeroIdentity: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  mobileHeroEyebrow: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  mobileHeroName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginTop: 2,
  },
  mobileHeroSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 3,
  },
  mobileHeroActions: {
    flexDirection: "row",
    gap: 10,
    flexShrink: 0,
  },
  mobileHeroActionsCompact: {
    alignSelf: "flex-start",
    gap: 8,
  },
  mobileHeroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileBody: {
    paddingHorizontal: 16,
    marginTop: -12,
    gap: 18,
  },
  mobileBodyCompact: {
    paddingHorizontal: 12,
    marginTop: -8,
    gap: 14,
  },
  mobileStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mobileSection: {
    width: "100%",
  },
  mobileStatsSection: {
    order: 1 as any,
  },
  mobileActionsSection: {
    order: 2 as any,
  },
  mobileProcessesSection: {
    order: 3 as any,
  },
  mobileStatGridCompact: {
    gap: 8,
  },
  mobileQuickStack: {
    gap: 10,
    width: "100%",
    alignSelf: "stretch",
  },
  mobileHalfColumnItem: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  mobileSingleColumnItem: {
    width: "100%",
  },
  statTile: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: Colors.white,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.06)",
    gap: 6,
  },
  statTileCompact: {
    minWidth: 0,
    flexBasis: "13.5%",
    padding: 16,
  },
  statTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statTileValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statTileValueCompact: {
    fontSize: 24,
  },
  statTileLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  verificationBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 20,
    padding: 16,
  },
  verificationBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  verificationBannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#9A3412",
    marginBottom: 4,
  },
  verificationBannerText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#9A3412",
  },
  verificationBannerLink: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#C2410C",
    paddingLeft: 8,
  },
});
