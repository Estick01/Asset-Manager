import React, { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import {
  getNotificacionesFirma,
  markNotificacionLeidaFirma,
  markTodasLeidasFirma,
} from "@/lib/services/notificacionService";
import {
  getAppNotifications,
  markAppNotificationRead,
  markAllAppNotificationsRead,
  type AppNotificationDTO,
} from "@/lib/services/clientRequestService";
import type { Notificacion } from "@/shared/schema";

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

// ─── Type maps ───────────────────────────────────────────────────────────
const PROCESS_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  tarea_completada: { icon: "checkmark-done-circle",    color: GREEN, bg: GREEN + "18" },
  nueva_tarea:      { icon: "checkmark-circle-outline", color: TEAL,  bg: TEAL  + "18" },
  estado_cambio:    { icon: "refresh-circle-outline",   color: AMBER, bg: AMBER + "18" },
  default:          { icon: "notifications-outline",    color: BLUE,  bg: BLUE  + "18" },
};

const APP_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  request_accepted: { icon: "checkmark-circle-outline",   color: GREEN, bg: GREEN + "18" },
  request_rejected: { icon: "close-circle-outline",       color: ROSE,  bg: ROSE  + "18" },
  new_comment:      { icon: "chatbubble-ellipses-outline", color: TEAL,  bg: TEAL  + "18" },
  new_reply:        { icon: "return-down-forward-outline", color: BLUE,  bg: BLUE  + "18" },
  post_liked:       { icon: "heart-outline",              color: ROSE,  bg: ROSE  + "18" },
  default:          { icon: "person-add-outline",         color: TEAL,  bg: TEAL  + "18" },
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
export default function FirmNotificationsScreen() {
  const insets = useSafeAreaInsets();
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
        getNotificacionesFirma(profile.id),
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
    if (!item.leidoFirma) {
      await markNotificacionLeidaFirma(item.id).catch(() => {});
      setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leidoFirma: true } : n));
      refreshUnread();
    }
    if (item.procesoId) router.push({ pathname: "/case/[id]", params: { id: item.procesoId } });
  };

  const handleMarkAppRead = async (item: AppNotificationDTO) => {
    if (item.readAt) return;
    await markAppNotificationRead(item.id).catch(() => {});
    setAppNotifs(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
    refreshUnread();
  };

  const handleMarkAll = async () => {
    if (!profile?.id) return;
    await Promise.all([
      markTodasLeidasFirma(profile.id),
      markAllAppNotificationsRead(),
    ]).catch(() => {});
    setNotificaciones(prev => prev.map(n => ({ ...n, leidoFirma: true })));
    setAppNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    refreshUnread();
  };

  const unread =
    notificaciones.filter(n => !n.leidoFirma).length +
    appNotifs.filter(n => !n.readAt).length;

  const isEmpty = notificaciones.length === 0 && appNotifs.length === 0;

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
          <Text style={styles.headerEyebrow}>BUFETE</Text>
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
        <View style={styles.bannerRow}>
          <View style={styles.unreadBanner}>
            <View style={styles.unreadBannerDot} />
            <Text style={styles.unreadBannerText}>{unread} sin leer</Text>
          </View>
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
            {appNotifs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Solicitudes y Comunidad</Text>
                  <View style={styles.sectionLine} />
                </View>
                {appNotifs.map(item => {
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

            {/* ── Process notifications ── */}
            {notificaciones.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
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
                      unread={!item.leidoFirma}
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
  screen:   { flex: 1, backgroundColor: NAVY },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

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
  markAllText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Banner
  bannerRow: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
  unreadBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
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
  dot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

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
