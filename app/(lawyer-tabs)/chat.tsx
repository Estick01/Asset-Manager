import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Animated, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getConversations, getOrCreateSupportConversation } from "@/lib/services/chatService";
import type { ConversationDTO } from "@/shared/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/keys";

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY = "#0F2640";
const NAVY_MID = "#243447";
const WHITE = "#FFFFFF";
const BG = "#F4F6F8";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL = "#2196A6";
const GREEN = "#27AE7A";
const AMBER = "#F5A623";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
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
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── Conversation Card ────────────────────────────────────────────────────
function ConversationCard({
  conv, currentUserId, index,
}: {
  conv: ConversationDTO;
  currentUserId?: string;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const other = conv.participants.find(p => p.userId !== currentUserId);
  const displayName = conv.type === "admin_support"
    ? conv.name ?? "Soporte LexTrack"
    : other?.name ?? "Conversación";
  const av = avatarColor(displayName);
  const hasUnread = conv.unreadCount > 0;
  const timeStr = formatRelative(conv.lastMessage?.createdAt ?? conv.updatedAt);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 280,
      delay: Math.min(index * 40, 320),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({
          pathname: "/chat/[id]",
          params: {
            id: conv.id,
            name: displayName,
            from: "/(lawyer-tabs)/chat",
            userId: conv.type === "admin_support" ? undefined : other?.userId,
            support: conv.type === "admin_support" ? "1" : undefined,
          },
        })}
      >
        {/* Unread accent strip */}
        {hasUnread && <View style={styles.unreadStrip} />}

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {getInitials(displayName)}
            </Text>
          </View>
          {hasUnread && (
            <View style={styles.onlineDot} />
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text
              style={[styles.cardName, hasUnread && styles.cardNameBold]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={[styles.cardTime, hasUnread && { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>
              {timeStr}
            </Text>
          </View>
          <View style={styles.cardBottomRow}>
            <Text
              style={[styles.cardPreview, hasUnread && styles.cardPreviewBold]}
              numberOfLines={1}
            >
              {conv.lastMessage?.content ?? "Sin mensajes aún"}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function LawyerChatScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
          from: "/(lawyer-tabs)/chat",
          support: "1",
        },
      });
    } catch {
      Alert.alert("Soporte", "No se pudo abrir el chat de soporte.");
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.USER).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setCurrentUserId(parsed?.user?.id ?? parsed?.id ?? null);
        } catch { }
      }
    });
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
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

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

  const filtered = search.trim()
    ? conversations.filter(c =>
      c.participants.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
    )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const totalConvs = conversations.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mensajes</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {totalUnread > 0 ? `${totalUnread} sin leer` : `${totalConvs} conversaciones`}
            </Text>
          )}
        </View>
        <Pressable style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.82 }]} onPress={openSupportChat}>
          <Ionicons name="headset-outline" size={20} color={WHITE} />
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      {!loading && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalConvs}</Text>
            <Text style={styles.statLbl}>Chats</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, totalUnread > 0 && { color: AMBER }]}>
              {totalUnread}
            </Text>
            <Text style={styles.statLbl}>Sin leer</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: GREEN }]}>
              {conversations.filter(c => {
                const last = c.lastMessage?.createdAt;
                if (!last) return false;
                return Date.now() - new Date(last).getTime() < 86400000;
              }).length}
            </Text>
            <Text style={styles.statLbl}>Hoy</Text>
          </View>
        </View>
      )}

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={TEXT3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversación..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Section label */}
        {filtered.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {search ? `Resultados para "${search}"` : "Recientes"}
            </Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <ConversationCard
                  conv={item}
                  index={index}
                  currentUserId={currentUserId ?? undefined}
                />
              )}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!loadingMore}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
              }
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: "#F0F2F4", marginLeft: 76 }} />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={36} color={TEXT3} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {search ? "Sin resultados" : "Sin conversaciones"}
                  </Text>
                  <Text style={styles.emptySub}>
                    {search
                      ? `No hay chats con "${search}"`
                  : "Tus conversaciones con clientes aparecerán aquí"}
                  </Text>
                </View>
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
            />
            {loadingMore && (
              <View style={styles.loadingMoreFixed}>
                <ActivityIndicator size="small" color={TEAL} />
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
  screen: { flex: 1, backgroundColor: NAVY },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 32, paddingBottom: 32,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, marginTop: 2 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 },
  composeBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  statsBar: {
    flexDirection: "row", backgroundColor: NAVY_MID,
    marginHorizontal: 16, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  statLbl: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: 14, paddingTop: 16,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 12,
    marginHorizontal: 16, paddingHorizontal: 14, marginBottom: 12, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
  },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 8, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine: { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 0, gap: 0 },
  centered: { paddingTop: 60, alignItems: "center" },
  listContainer: { flex: 1, position: "relative" },
  loadingMoreFixed: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: BG, paddingVertical: 16, alignItems: "center",
    justifyContent: "center", flexDirection: "row", gap: 8,
    borderTopWidth: 1, borderTopColor: "#E8ECF0",
  },
  loadingMoreText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_400Regular" },

  // Card
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, paddingVertical: 13,
    paddingRight: 16, gap: 12,
  },
  cardPressed: { backgroundColor: "#F5F7FA" },

  unreadStrip: {
    width: 3, alignSelf: "stretch",
    backgroundColor: TEAL, borderRadius: 2,
    marginRight: -4,
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
    backgroundColor: GREEN,
    borderWidth: 2, borderColor: WHITE,
  },

  cardContent: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
  cardNameBold: { fontFamily: "Inter_700Bold" },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardPreview: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3 },
  cardPreviewBold: { fontFamily: "Inter_500Medium", color: TEXT2 },

  badge: {
    backgroundColor: TEAL, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
});
