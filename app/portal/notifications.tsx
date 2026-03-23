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
  getNotificacionesCliente,
  markNotificacionLeidaCliente,
  markTodasLeidasCliente,
} from "@/lib/services/notificacionService";
import {
  getPendingRequests, respondToRequest,
  getAppNotifications, markAppNotificationRead, markAllAppNotificationsRead,
  type ClientRequestDTO, type AppNotificationDTO,
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
const INDIGO = "#5B6CF9";

// ─── Type maps ───────────────────────────────────────────────────────────
const PROCESS_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  nueva_actualizacion: { icon: "megaphone-outline",       color: INDIGO, bg: INDIGO + "18" },
  nuevo_documento:     { icon: "document-attach-outline", color: BLUE,   bg: BLUE   + "18" },
  estado_cambio:       { icon: "refresh-circle-outline",  color: AMBER,  bg: AMBER  + "18" },
  default:             { icon: "notifications-outline",   color: TEAL,   bg: TEAL   + "18" },
};

const APP_NOTIF: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  new_comment:   { icon: "chatbubble-ellipses-outline", color: TEAL,  bg: TEAL  + "18" },
  new_reply:     { icon: "return-down-forward-outline", color: BLUE,  bg: BLUE  + "18" },
  post_liked:    { icon: "heart-outline",               color: ROSE,  bg: ROSE  + "18" },
  case_taken:    { icon: "briefcase-outline",           color: AMBER, bg: AMBER + "18" },
  case_accepted: { icon: "checkmark-circle-outline",    color: GREEN, bg: GREEN + "18" },
  case_rejected: { icon: "close-circle-outline",        color: ROSE,  bg: ROSE  + "18" },
  case_expired:  { icon: "time-outline",                color: AMBER, bg: AMBER + "18" },
  default:       { icon: "notifications-outline",       color: TEAL,  bg: TEAL  + "18" },
};

function cfgOf(map: Record<string, any>, key: string) {
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

function formatExpiry(expiresAt: string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Vence hoy";
  return `Vence en ${days} día${days !== 1 ? "s" : ""}`;
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

// ─── Request card ────────────────────────────────────────────────────────
function RequestCard({
  req, onRespond,
}: {
  req: ClientRequestDTO;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const roleLabel = req.senderRole === "abogado" ? "Abogado" : "Bufete";

  const respond = async (accept: boolean) => {
    setBusy(true);
    await onRespond(req.id, accept);
    setBusy(false);
  };

  return (
    <View style={styles.reqCard}>
      <View style={styles.reqAccent} />
      <View style={[styles.iconBox, { backgroundColor: TEAL + "18" }]}>
        <Ionicons name="person-add-outline" size={22} color={TEAL} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reqTitle}>Solicitud de cliente</Text>
        <Text style={styles.reqBody}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>
            {roleLabel} {req.senderName}
          </Text>
          {" "}quiere agregarte como cliente.
        </Text>
        <Text style={styles.reqExpiry}>{formatExpiry(req.expiresAt)}</Text>
        {busy ? (
          <ActivityIndicator size="small" color={TEAL} style={{ alignSelf: "flex-start", marginTop: 8 }} />
        ) : (
          <View style={styles.reqActions}>
            <Pressable
              style={({ pressed }) => [styles.reqBtn, styles.reqBtnAccept, pressed && { opacity: 0.82 }]}
              onPress={() => respond(true)}
            >
              <Ionicons name="checkmark-outline" size={14} color={WHITE} />
              <Text style={styles.reqBtnTextWhite}>Aceptar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.reqBtn, styles.reqBtnReject, pressed && { opacity: 0.82 }]}
              onPress={() => respond(false)}
            >
              <Ionicons name="close-outline" size={14} color={ROSE} />
              <Text style={styles.reqBtnTextRose}>Rechazar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────
export default function ClientNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { refreshUnread } = useNotifications();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [requests,       setRequests]       = useState<ClientRequestDTO[]>([]);
  const [appNotifs,      setAppNotifs]      = useState<AppNotificationDTO[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [notifs, reqs, app] = await Promise.all([
        getNotificacionesCliente(profile.id),
        getPendingRequests().catch(() => [] as ClientRequestDTO[]),
        getAppNotifications().catch(() => [] as AppNotificationDTO[]),
      ]);
      setNotificaciones(notifs);
      setRequests(reqs);
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
    if (!item.leidoCliente) {
      await markNotificacionLeidaCliente(item.id).catch(() => {});
      setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leidoCliente: true } : n));
      refreshUnread();
    }
    if (item.procesoId) router.push({ pathname: "/portal/case", params: { id: item.procesoId } });
  };

  const handleMarkAppRead = async (item: AppNotificationDTO) => {
    if (!item.readAt) {
      await markAppNotificationRead(item.id).catch(() => {});
      setAppNotifs(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
      refreshUnread();
    }
    // Navegar al post si la notificación lo referencia
    const postId = item.data?.postId as string | undefined;
    if (postId) {
      router.push(`/community/${postId}` as any);
    }
  };

  const handleMarkAll = async () => {
    if (!profile?.id) return;
    await Promise.all([
      markTodasLeidasCliente(profile.id),
      markAllAppNotificationsRead(),
    ]).catch(() => {});
    setNotificaciones(prev => prev.map(n => ({ ...n, leidoCliente: true })));
    setAppNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    refreshUnread();
  };

  const handleRespond = async (reqId: string, accept: boolean) => {
    await respondToRequest(reqId, accept).catch(() => undefined);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const unread =
    notificaciones.filter(n => !n.leidoCliente).length +
    appNotifs.filter(n => !n.readAt).length;

  const isEmpty = requests.length === 0 && notificaciones.length === 0 && appNotifs.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy (tab screen — sin botón atrás) ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>PORTAL CLIENTE</Text>
          <Text style={styles.headerTitle}>Notificaciones</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Badge de no leídas */}
          {unread > 0 && (
            <View style={styles.unreadPill}>
              <View style={styles.unreadPillDot} />
              <Text style={styles.unreadPillText}>{unread}</Text>
            </View>
          )}
          {/* Botón leer todas */}
          {unread > 0 && (
            <Pressable
              style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.8 }]}
              onPress={handleMarkAll}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={WHITE} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Solicitudes pendientes badge en header */}
      {requests.length > 0 && (
        <View style={styles.reqBanner}>
          <Ionicons name="person-add-outline" size={13} color={WHITE} />
          <Text style={styles.reqBannerText}>
            {requests.length} solicitud{requests.length !== 1 ? "es" : ""} pendiente{requests.length !== 1 ? "s" : ""}
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
            {/* ── Pending requests ── */}
            {requests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Solicitudes pendientes</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: TEAL + "18" }]}>
                    <Text style={[styles.sectionBadgeText, { color: TEAL }]}>{requests.length}</Text>
                  </View>
                  <View style={styles.sectionLine} />
                </View>
                {requests.map(r => (
                  <RequestCard key={r.id} req={r} onRespond={handleRespond} />
                ))}
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
                  const c = cfgOf(PROCESS_NOTIF, item.tipo);
                  return (
                    <NotifCard
                      key={item.id}
                      icon={c.icon} color={c.color} bg={c.bg}
                      title={item.titulo} body={item.mensaje}
                      time={timeAgo(item.createdAt)}
                      unread={!item.leidoCliente}
                      onPress={() => handleMarkRead(item)}
                    />
                  );
                })}
              </View>
            )}

            {/* ── Community ── */}
            {appNotifs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Comunidad</Text>
                  <View style={styles.sectionLine} />
                </View>
                {appNotifs.map(item => {
                  const c = cfgOf(APP_NOTIF, item.type);
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

  // Header (tab — no back button, title left-aligned)
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium", marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28, fontFamily: "Inter_700Bold",
    color: WHITE, letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  unreadPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  unreadPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ROSE },
  unreadPillText: { fontSize: 12, fontFamily: "Inter_700Bold", color: WHITE },
  markAllBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  // Requests banner
  reqBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    marginLeft: 20, marginBottom: 10,
    backgroundColor: TEAL + "30",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  reqBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Body
  body: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },

  // Section
  section: { gap: 8, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  sectionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#E0E5EA" },

  // Notification card
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
  unreadBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
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

  // Request card
  reqCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } as any
      : { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }),
  },
  reqAccent: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: TEAL,
  },
  reqTitle:  { fontSize: 14, fontFamily: "Inter_700Bold",    color: TEXT,  marginBottom: 3 },
  reqBody:   { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 19, marginBottom: 4 },
  reqExpiry: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginBottom: 10 },
  reqActions: { flexDirection: "row", gap: 8 },
  reqBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  reqBtnAccept:    { backgroundColor: GREEN },
  reqBtnReject:    { backgroundColor: ROSE + "12", borderWidth: 1, borderColor: ROSE + "40" },
  reqBtnTextWhite: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  reqBtnTextRose:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: ROSE },

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
