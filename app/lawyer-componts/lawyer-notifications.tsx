import React, { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Platform, useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import {
  getNotificacionesAbogado,
  markNotificacionLeidaAbogado,
  markTodasLeidasAbogado,
} from "@/lib/services/notificacionService";
import {
  getAppNotifications,
  markAppNotificationRead,
  markAllAppNotificationsRead,
  type AppNotificationDTO,
} from "@/lib/services/clientRequestService";
import type { Notificacion } from "@/shared/schema";
import { LinearGradient } from "expo-linear-gradient";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Design tokens ───────────────────────────────────────────────────────
const NAVY   = "#0F2640";
const WHITE  = "#FFFFFF";
const BG     = "#F4F6F8";
const TEXT   = "#1B2B3B";
const TEXT2  = "#6B7B8D";
const TEXT3  = "#9AAABB";
const TEAL   = "#2196A6";
const GREEN  = "#27AE7A";
const AMBER  = "#F5A623";
const ROSE   = "#E05252";
const BLUE   = "#3B82F6";
const PURPLE = "#7C3AED";
const SLATE  = "#64748B";

// ─── Type maps ───────────────────────────────────────────────────────────
const PROCESS_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  nueva_tarea:      { icon: "clipboard-outline",         color: TEAL,  bg: TEAL  + "18" },
  tarea_completada: { icon: "checkmark-done-circle",     color: GREEN, bg: GREEN + "18" },
  estado_cambio:    { icon: "swap-horizontal-outline",   color: AMBER, bg: AMBER + "18" },
  nuevo_documento:  { icon: "document-attach-outline",   color: BLUE,  bg: BLUE  + "18" },
  default:          { icon: "briefcase-outline",         color: SLATE, bg: SLATE + "18" },
};

// Tipos de notificación de comunidad/caso para el abogado
const APP_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  // ── Flujo de caso ────────────────────────────────────────────────────────
  // Nuevo caso que coincide con la especialidad del abogado
  case_match:       { icon: "flash-outline",               color: PURPLE, bg: PURPLE + "18" },
  // El cliente aceptó la representación — evento más importante
  case_accepted:    { icon: "shield-checkmark-outline",    color: GREEN,  bg: GREEN  + "18" },
  // El cliente rechazó al abogado
  case_rejected:    { icon: "close-circle-outline",        color: ROSE,   bg: ROSE   + "18" },
  // La reserva de 48 h expiró sin respuesta del cliente
  case_expired:     { icon: "hourglass-outline",           color: AMBER,  bg: AMBER  + "18" },
  // Otro abogado tomó el caso antes
  case_taken:       { icon: "lock-closed-outline",         color: SLATE,  bg: SLATE  + "18" },

  // ── Solicitudes de clientes ──────────────────────────────────────────────
  request_accepted: { icon: "person-add-outline",          color: GREEN,  bg: GREEN  + "18" },
  request_rejected: { icon: "person-remove-outline",       color: ROSE,   bg: ROSE   + "18" },

  // ── Actividad en publicaciones ───────────────────────────────────────────
  new_comment:      { icon: "chatbubble-ellipses-outline", color: TEAL,   bg: TEAL   + "18" },
  new_reply:        { icon: "return-down-forward-outline", color: BLUE,   bg: BLUE   + "18" },
  post_liked:       { icon: "heart-outline",               color: ROSE,   bg: ROSE   + "18" },

  default:          { icon: "notifications-outline",       color: TEAL,   bg: TEAL   + "18" },
};

function cfg(map: Record<string, any>, key: string) {
  return map[key] ?? map["default"];
}

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs} h`;
  return `Hace ${Math.floor(hrs / 24)} d`;
}

// ─── Notification card ───────────────────────────────────────────────────
function NotifCard({
  icon, color, bg, title, body, time, unread, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string; bg: string;
  title: string; body: string; time: string;
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, unread && styles.cardUnread, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {unread && <View style={[styles.unreadBar, { backgroundColor: color }]} />}
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, unread && styles.cardTitleBold]} numberOfLines={1}>{title}</Text>
        <Text style={styles.cardMsg} numberOfLines={2}>{body}</Text>
        <Text style={styles.cardTime}>{time}</Text>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: color }]} />}
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────
export default function LawyerNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const router = useRouter();
  const { profile } = useAuth();
  const { refreshUnread } = useNotifications();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [appNotifs,      setAppNotifs]      = useState<AppNotificationDTO[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [notifs, app] = await Promise.all([
        getNotificacionesAbogado(profile.id),
        getAppNotifications().catch(() => [] as AppNotificationDTO[]),
      ]);
      setNotificaciones(notifs);
      setAppNotifs(app);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMarkRead = async (item: Notificacion) => {
    if (!item.leidoLawyer) {
      await markNotificacionLeidaAbogado(item.id).catch(() => {});
      setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leidoLawyer: true } : n));
      refreshUnread();
    }
    if (item.procesoId) router.push({ pathname: "/case/[id]", params: { id: item.procesoId } });
  };

  const handleMarkAppRead = async (item: AppNotificationDTO) => {
    if (!item.readAt) {
      await markAppNotificationRead(item.id).catch(() => {});
      setAppNotifs(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
      refreshUnread();
    }
    // Navegar al post cuando la notificación lo referencia
    const postId = item.data?.postId as string | undefined;
    if (postId) {
      router.push(`/community/${postId}` as any);
    }
  };

  const handleMarkAll = async () => {
    if (!profile?.id) return;
    await Promise.all([
      markTodasLeidasAbogado(profile.id),
      markAllAppNotificationsRead(),
    ]).catch(() => {});
    setNotificaciones(prev => prev.map(n => ({ ...n, leidoLawyer: true })));
    setAppNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    refreshUnread();
  };

  const unread =
    notificaciones.filter(n => !n.leidoLawyer).length +
    appNotifs.filter(n => !n.readAt).length;

  const isEmpty = notificaciones.length === 0 && appNotifs.length === 0;

  if (desktop) {
    const shellWidth = Math.min(1240, Math.max(1060, width - metrics.gutter * 2));
    const totalAlerts = notificaciones.length + appNotifs.length;
    const processUnread = notificaciones.filter((n) => !n.leidoLawyer).length;

    return (
      <ScrollView
        style={styles.desktopScreen}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 32),
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={TEAL}
            colors={[TEAL]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.desktopShell, { width: shellWidth }]}>
          <View style={[styles.desktopHero, { marginBottom: metrics.contentGap }]}>
            <LinearGradient colors={[NAVY, "#173D66"]} style={styles.desktopHeroGradient}>
              <View style={styles.desktopHeroMain}>
                <View style={styles.desktopHeroCopy}>
                  <Text style={styles.desktopEyebrow}>Centro legal</Text>
                  <Text style={styles.desktopTitle}>Notificaciones del abogado</Text>
                  <Text style={styles.desktopSubtitle}>
                    Sigue novedades de procesos, actividad de clientes y movimiento en publicaciones desde una sola vista.
                  </Text>
                </View>

                <View style={styles.desktopHeroStats}>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{unread}</Text>
                    <Text style={styles.desktopHeroLabel}>sin leer</Text>
                  </View>
                  <View style={styles.desktopHeroDivider} />
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{processUnread}</Text>
                    <Text style={styles.desktopHeroLabel}>procesos</Text>
                  </View>
                  <View style={styles.desktopHeroDivider} />
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{totalAlerts}</Text>
                    <Text style={styles.desktopHeroLabel}>alertas</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={[styles.desktopColumns, { gap: metrics.contentGap }]}>
            <View style={styles.desktopMainColumn}>
              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={TEAL} />
                </View>
              ) : (
                <>
                  {appNotifs.length > 0 && (() => {
                    const CASE_TYPES = new Set(["case_match", "case_accepted", "case_rejected", "case_expired", "case_taken", "request_accepted", "request_rejected"]);
                    const caseNotifs = appNotifs.filter((n) => CASE_TYPES.has(n.type));
                    const activityNotifs = appNotifs.filter((n) => !CASE_TYPES.has(n.type));

                    return (
                      <>
                        {caseNotifs.length > 0 && (
                          <View style={styles.desktopPanel}>
                            <View style={styles.desktopPanelHeader}>
                              <Text style={styles.desktopPanelTitle}>Casos y clientes</Text>
                              <View style={[styles.sectionBadge, { backgroundColor: TEAL + "16" }]}>
                                <Text style={[styles.sectionBadgeText, { color: TEAL }]}>{caseNotifs.length}</Text>
                              </View>
                            </View>
                            <View style={styles.desktopPanelList}>
                              {caseNotifs.map((item) => {
                                const c = cfg(APP_NOTIF, item.type);
                                return (
                                  <NotifCard
                                    key={item.id}
                                    icon={c.icon}
                                    color={c.color}
                                    bg={c.bg}
                                    title={item.title}
                                    body={item.body}
                                    time={timeAgo(item.createdAt)}
                                    unread={!item.readAt}
                                    onPress={() => handleMarkAppRead(item)}
                                  />
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {activityNotifs.length > 0 && (
                          <View style={styles.desktopPanel}>
                            <View style={styles.desktopPanelHeader}>
                              <Text style={styles.desktopPanelTitle}>Actividad en publicaciones</Text>
                              <View style={[styles.sectionBadge, { backgroundColor: BLUE + "16" }]}>
                                <Text style={[styles.sectionBadgeText, { color: BLUE }]}>{activityNotifs.length}</Text>
                              </View>
                            </View>
                            <View style={styles.desktopPanelList}>
                              {activityNotifs.map((item) => {
                                const c = cfg(APP_NOTIF, item.type);
                                return (
                                  <NotifCard
                                    key={item.id}
                                    icon={c.icon}
                                    color={c.color}
                                    bg={c.bg}
                                    title={item.title}
                                    body={item.body}
                                    time={timeAgo(item.createdAt)}
                                    unread={!item.readAt}
                                    onPress={() => handleMarkAppRead(item)}
                                  />
                                );
                              })}
                            </View>
                          </View>
                        )}
                      </>
                    );
                  })()}

                  {notificaciones.length > 0 && (
                    <View style={styles.desktopPanel}>
                      <View style={styles.desktopPanelHeader}>
                        <Text style={styles.desktopPanelTitle}>Actividad en procesos</Text>
                        <View style={[styles.sectionBadge, { backgroundColor: AMBER + "16" }]}>
                          <Text style={[styles.sectionBadgeText, { color: AMBER }]}>{notificaciones.length}</Text>
                        </View>
                      </View>
                      <View style={styles.desktopPanelList}>
                        {notificaciones.map((item) => {
                          const c = cfg(PROCESS_NOTIF, item.tipo);
                          return (
                            <NotifCard
                              key={item.id}
                              icon={c.icon}
                              color={c.color}
                              bg={c.bg}
                              title={item.titulo}
                              body={item.mensaje}
                              time={timeAgo(item.createdAt)}
                              unread={!item.leidoLawyer}
                              onPress={() => handleMarkRead(item)}
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {isEmpty && (
                    <View style={styles.empty}>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="notifications-off-outline" size={36} color={TEXT3} />
                      </View>
                      <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                      <Text style={styles.emptySub}>Cuando recibas alertas aparecerán aquí</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.desktopSideColumn}>
              <View style={styles.desktopPanel}>
                <View style={styles.desktopPanelHeader}>
                  <Text style={styles.desktopPanelTitle}>Resumen</Text>
                </View>
                <View style={styles.desktopSummaryStack}>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Sin leer</Text>
                    <Text style={styles.desktopSummaryValue}>{unread}</Text>
                  </View>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Procesos</Text>
                    <Text style={styles.desktopSummaryValue}>{notificaciones.length}</Text>
                  </View>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Casos y clientes</Text>
                    <Text style={styles.desktopSummaryValue}>{appNotifs.filter((n) => ["case_match", "case_accepted", "case_rejected", "case_expired", "case_taken", "request_accepted", "request_rejected"].includes(n.type)).length}</Text>
                  </View>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Comunidad</Text>
                    <Text style={styles.desktopSummaryValue}>{appNotifs.filter((n) => !["case_match", "case_accepted", "case_rejected", "case_expired", "case_taken", "request_accepted", "request_rejected"].includes(n.type)).length}</Text>
                  </View>
                </View>
              </View>

              {unread > 0 && (
                <View style={styles.desktopPanel}>
                  <View style={styles.desktopPanelHeader}>
                    <Text style={styles.desktopPanelTitle}>Acción rápida</Text>
                  </View>
                  <Pressable style={styles.desktopActionBtn} onPress={handleMarkAll}>
                    <Ionicons name="checkmark-done-outline" size={16} color={WHITE} />
                    <Text style={styles.desktopActionBtnText}>Marcar todo como leído</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.desktopPanel}>
                <View style={styles.desktopPanelHeader}>
                  <Text style={styles.desktopPanelTitle}>Contexto</Text>
                </View>
                <Text style={styles.desktopNote}>
                  Las alertas de procesos llevan al expediente. Las alertas de comunidad abren directamente la publicación relacionada.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy ── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>ABOGADO</Text>
          <Text style={styles.headerTitle}>Notificaciones</Text>
        </View>

        {unread > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.8 }]}
            onPress={handleMarkAll}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={WHITE} />
            <Text style={styles.markAllText}>Leer todas</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ── Unread badge ── */}
      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadBannerDot} />
          <Text style={styles.unreadBannerText}>
            {unread} sin leer
          </Text>
        </View>
      )}

      {/* ── Body ── */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={TEAL}
                colors={[TEAL]}
              />
            }
          >
            {/* ── App / Community notifications ── */}
            {appNotifs.length > 0 && (() => {
              const CASE_TYPES = new Set(["case_match", "case_accepted", "case_rejected", "case_expired", "case_taken", "request_accepted", "request_rejected"]);
              const caseNotifs = appNotifs.filter(n => CASE_TYPES.has(n.type));
              const activityNotifs = appNotifs.filter(n => !CASE_TYPES.has(n.type));
              return (
                <>
                  {caseNotifs.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="briefcase-outline" size={12} color={TEXT2} />
                        <Text style={styles.sectionLabel}>Casos y Clientes</Text>
                        <View style={styles.sectionLine} />
                      </View>
                      {caseNotifs.map(item => {
                        const c = cfg(APP_NOTIF, item.type);
                        return (
                          <NotifCard
                            key={item.id}
                            icon={c.icon} color={c.color} bg={c.bg}
                            title={item.title} body={item.body}
                            time={timeAgo(item.createdAt)}
                            unread={!item.readAt}
                            onPress={() => handleMarkAppRead(item)}
                          />
                        );
                      })}
                    </View>
                  )}
                  {activityNotifs.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="globe-outline" size={12} color={TEXT2} />
                        <Text style={styles.sectionLabel}>Actividad en publicaciones</Text>
                        <View style={styles.sectionLine} />
                      </View>
                      {activityNotifs.map(item => {
                        const c = cfg(APP_NOTIF, item.type);
                        return (
                          <NotifCard
                            key={item.id}
                            icon={c.icon} color={c.color} bg={c.bg}
                            title={item.title} body={item.body}
                            time={timeAgo(item.createdAt)}
                            unread={!item.readAt}
                            onPress={() => handleMarkAppRead(item)}
                          />
                        );
                      })}
                    </View>
                  )}
                </>
              );
            })()}

            {/* ── Process notifications ── */}
            {notificaciones.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={12} color={TEXT2} />
                  <Text style={styles.sectionLabel}>Actividad en procesos</Text>
                  <View style={styles.sectionLine} />
                </View>
                {notificaciones.map(item => {
                  const c = cfg(PROCESS_NOTIF, item.tipo);
                  return (
                    <NotifCard
                      key={item.id}
                      icon={c.icon} color={c.color} bg={c.bg}
                      title={item.titulo} body={item.mensaje}
                      time={timeAgo(item.createdAt)}
                      unread={!item.leidoLawyer}
                      onPress={() => handleMarkRead(item)}
                    />
                  );
                })}
              </View>
            )}

            {isEmpty && (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-off-outline" size={36} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                <Text style={styles.emptySub}>Cuando recibas alertas aparecerán aquí</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: NAVY },
  desktopScreen: { flex: 1, backgroundColor: BG },
  desktopShell: { alignSelf: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  desktopHero: { borderRadius: 30, overflow: "hidden" },
  desktopHeroGradient: { paddingHorizontal: 30, paddingVertical: 28 },
  desktopHeroMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 },
  desktopHeroCopy: { flex: 1, gap: 6 },
  desktopEyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.62)",
    fontFamily: "Inter_600SemiBold",
  },
  desktopTitle: { fontSize: 34, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: -0.5 },
  desktopSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255,255,255,0.74)",
    fontFamily: "Inter_400Regular",
    maxWidth: 620,
  },
  desktopHeroStats: {
    minWidth: 340,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  desktopHeroStat: { flex: 1, alignItems: "center" },
  desktopHeroValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE },
  desktopHeroLabel: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  desktopHeroDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.18)" },
  desktopColumns: { flexDirection: "row", alignItems: "flex-start" },
  desktopMainColumn: { flex: 1.55, gap: 20 },
  desktopSideColumn: { width: 330, gap: 20 },
  desktopPanel: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
    gap: 16,
    ...(Platform.OS === "web" ? { boxShadow: "0 10px 30px rgba(15,38,64,0.06)" } as any : {}),
  },
  desktopPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  desktopPanelTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },
  desktopPanelList: { gap: 12 },
  desktopSummaryStack: { gap: 12 },
  desktopSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E7ECF0",
  },
  desktopSummaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  desktopSummaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },
  desktopActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TEAL,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  desktopActionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  desktopNote: { fontSize: 13, lineHeight: 21, color: TEXT2, fontFamily: "Inter_400Regular" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium", marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22, fontFamily: "Inter_700Bold",
    color: WHITE, letterSpacing: -0.3,
  },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20,
    width: 80, justifyContent: "center",
  },
  markAllText: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE,
  },

  // Unread banner
  unreadBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "center", marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  unreadBannerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ROSE },
  unreadBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Body
  body: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 6,
  },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },

  // Section
  section: { gap: 8, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#E0E5EA" },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } as any
      : { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }),
  },
  cardUnread: {
    backgroundColor: WHITE,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.09)" } as any
      : { shadowOpacity: 0.09, elevation: 2 }),
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  unreadBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardBody:      { flex: 1, gap: 3 },
  cardTitle:     { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT, lineHeight: 19 },
  cardTitleBold: { fontFamily: "Inter_700Bold" },
  cardMsg:       { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 17 },
  cardTime:      { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },
});
