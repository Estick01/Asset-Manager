import React, { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator, Animated, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getConversations, getOrCreateSupportConversation } from "@/lib/services/chatService";
import { useUnifiedAuth } from "@/lib/auth-context";
import type { ConversationDTO } from "@/shared/schema";

// ─── Design tokens ────────────────────────────────────────────────────────
const BLUE      = "#1B5A8C";
const BLUE_DARK = "#0D3B66";
const WHITE     = "#FFFFFF";
const BG        = "#F4F6F8";
const TEXT      = "#1B2B3B";
const TEXT2     = "#6B7B8D";
const TEXT3     = "#9AAABB";
const GREEN     = "#27AE7A";
const AMBER     = "#F5A623";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: BLUE },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#EEE8FD", text: "#7B5EA7" },
  { bg: "#FDEAEA", text: "#E05252" },
];

const PAGE_SIZE = 20;

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w.charAt(0)).join("").toUpperCase();
}
function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1)  return "Ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD}d`;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── Conversation Card ────────────────────────────────────────────────────
function ConversationCard({ conv, currentUserId, index }: {
  conv: ConversationDTO; currentUserId?: string; index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const other = conv.participants.find(p => p.userId !== currentUserId);
  const displayName = conv.type === "admin_support"
    ? conv.name || "Soporte LexTrack"
    : other?.name || "Abogado";
  const av = avatarColor(displayName);
  const hasUnread = conv.unreadCount > 0;
  const timeStr = formatRelative(conv.lastMessage?.createdAt ?? conv.updatedAt);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 260,
      delay: Math.min(index * 40, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: "#F5F7FA" }]}
        onPress={() => router.push({
          pathname: "/chat/[id]",
          params: {
            id: conv.id,
            name: displayName,
            from: "/portal/chat",
            userId: conv.type === "admin_support" ? undefined : other?.userId,
            support: conv.type === "admin_support" ? "1" : undefined,
          },
        })}
      >
        {/* Unread strip */}
        {hasUnread && <View style={styles.unreadStrip} />}

        {/* Avatar */}
        <View style={[styles.avatarWrap, !hasUnread && { marginLeft: 19 }]}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {getInitials(displayName)}
            </Text>
          </View>
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardName, hasUnread && { fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.cardTime, hasUnread && { color: BLUE, fontFamily: "Inter_600SemiBold" }]}>
              {timeStr}
            </Text>
          </View>
          <View style={styles.cardBottom}>
            <Text
              style={[styles.cardPreview, hasUnread && { fontFamily: "Inter_500Medium", color: TEXT2 }]}
              numberOfLines={1}
            >
              {conv.lastMessage?.content ?? "Sin mensajes aún"}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{conv.unreadCount > 99 ? "99+" : conv.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ClientChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUnifiedAuth();
  const currentUserId = user?.user?.id;

  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);

  const openSupportChat = useCallback(async () => {
    try {
      const conversation = await getOrCreateSupportConversation();
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: conversation.id,
          name: conversation.name ?? "Soporte LexTrack",
          from: "/portal/chat",
          support: "1",
        },
      });
    } catch {
      Alert.alert("Soporte", "No se pudo abrir el chat de soporte.");
    }
  }, []);

  const fetchConversations = useCallback(async (isLoadMore = false) => {
    try {
      const currentOffset = isLoadMore ? offsetRef.current : 0;
      const result = await getConversations(PAGE_SIZE, currentOffset);
      
      if (isLoadMore) {
        setConversations(prev => [...prev, ...result.conversations]);
      } else {
        setConversations(result.conversations);
      }
      setTotal(result.total);
      
      if (result.conversations.length > 0) {
        offsetRef.current = currentOffset + result.conversations.length;
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchConversations(); }, [fetchConversations]));

  const onRefresh = async () => {
    offsetRef.current = 0;
    setRefreshing(true);
    await fetchConversations(false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loadingMore || conversations.length >= total) return;
    setLoadingMore(true);
    fetchConversations(true);
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const todayCount  = conversations.filter(c => {
    const last = c.lastMessage?.createdAt;
    return last && Date.now() - new Date(last).getTime() < 86400000;
  }).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[BLUE_DARK, BLUE]}
        style={styles.header}
      >
        {/* Top row */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Mensajes</Text>
            {!loading && (
              <Text style={styles.headerSub}>
                {totalUnread > 0 ? `${totalUnread} sin leer` : `${conversations.length} conversaciones`}
              </Text>
            )}
          </View>
          {/* Unread badge on header */}
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Ionicons name="notifications" size={16} color={WHITE} />
              <Text style={styles.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>

        <Pressable style={({ pressed }) => [styles.supportBtn, pressed && { opacity: 0.84 }]} onPress={openSupportChat}>
          <Ionicons name="headset-outline" size={16} color={WHITE} />
          <Text style={styles.supportBtnText}>Soporte</Text>
        </Pressable>

        {/* Stats row */}
        {!loading && conversations.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="chatbubbles-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>{conversations.length} chats</Text>
            </View>
            {todayCount > 0 && (
              <View style={styles.statPill}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statText}>{todayCount} hoy</Text>
              </View>
            )}
            {totalUnread > 0 && (
              <View style={[styles.statPill, styles.statPillAmber]}>
                <Ionicons name="ellipse" size={8} color={AMBER} />
                <Text style={[styles.statText, { color: AMBER }]}>{totalUnread} sin leer</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Section label */}
        {!loading && conversations.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recientes</Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={conversations}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <ConversationCard conv={item} currentUserId={currentUserId} index={index} />
              )}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!loadingMore}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />
              }
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: "#F0F2F4", marginLeft: 76 }} />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={36} color={TEXT3} />
                  </View>
                  <Text style={styles.emptyTitle}>Sin conversaciones</Text>
                  <Text style={styles.emptySub}>
                    Abre un proceso y presiona Mensaje para chatear con tu abogado
                  </Text>
                </View>
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
            />
            {loadingMore && (
              <View style={styles.loadingMoreFixed}>
                <ActivityIndicator size="small" color={BLUE} />
                <Text style={styles.loadingMoreText}>Cargando más...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BLUE_DARK },

  header: {
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 16,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, marginTop: 2 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  headerBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  supportBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  supportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },

  statsRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statPillAmber: { backgroundColor: "rgba(245,166,35,0.15)" },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },

  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 16,
  },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 8, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine:  { height: 2, backgroundColor: BLUE, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 0 },
  centered: { paddingTop: 60, alignItems: "center" },
  listContainer: { flex: 1, position: "relative" },
  loadingMoreFixed: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: BG, paddingVertical: 16, alignItems: "center",
    justifyContent: "center", flexDirection: "row", gap: 8,
    borderTopWidth: 1, borderTopColor: "#E8ECF0",
  },
  loadingMoreText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_400Regular" },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, paddingVertical: 13,
    paddingRight: 16, gap: 12,
  },
  unreadStrip: {
    width: 3, alignSelf: "stretch",
    backgroundColor: BLUE, borderRadius: 2, marginRight: -4,
  },
  avatarWrap: { position: "relative", marginLeft: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  onlineDot: {
    position: "absolute", top: 0, right: 0,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: GREEN, borderWidth: 2, borderColor: WHITE,
  },

  cardContent:  { flex: 1, gap: 4 },
  cardTop:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName:     { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
  cardTime:     { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  cardBottom:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardPreview:  { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3 },

  badge: {
    backgroundColor: BLUE, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },

  empty: { alignItems: "center", paddingTop: 64, gap: 8, paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center" },
});
