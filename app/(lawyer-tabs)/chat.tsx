import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Animated, Alert, useWindowDimensions, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getConversations, getOrCreateSupportConversation } from "@/lib/services/chatService";
import type { ConversationDTO } from "@/shared/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/keys";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

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
  }, [anim, index]);

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
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const shellWidth = Math.min(1480, Math.max(1160, width - metrics.gutter * 2));
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
  const todayCount = conversations.filter(c => {
    const last = c.lastMessage?.createdAt;
    return last && Date.now() - new Date(last).getTime() < 86400000;
  }).length;

  if (desktop) {
    return (
      <ScrollView
        style={styles.desktopScreen}
        contentContainerStyle={{ paddingHorizontal: metrics.gutter, paddingTop: insets.top + 28, paddingBottom: metrics.gutter }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.desktopShell, { maxWidth: shellWidth }]}>
          <View style={styles.desktopHero}>
            <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.desktopHeroGradient}>
              <View style={styles.desktopHeroMain}>
                <View style={styles.desktopHeroCopy}>
                  <Text style={styles.desktopEyebrow}>Mensajería</Text>
                  <Text style={styles.desktopTitle}>Conversaciones activas del abogado</Text>
                  <Text style={styles.desktopSubtitle}>
                    Revisa clientes, actividad reciente y soporte desde una bandeja más clara para escritorio.
                  </Text>
                </View>
                <View style={styles.desktopHeroStats}>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{totalConvs}</Text>
                    <Text style={styles.desktopHeroLabel}>chats</Text>
                  </View>
                  <View style={styles.desktopHeroDivider} />
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{totalUnread}</Text>
                    <Text style={styles.desktopHeroLabel}>sin leer</Text>
                  </View>
                  <View style={styles.desktopHeroDivider} />
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>{todayCount}</Text>
                    <Text style={styles.desktopHeroLabel}>hoy</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={[styles.desktopBody, { marginTop: 22 }]}>
            <View style={styles.desktopMainColumn}>
              <View style={styles.desktopPanel}>
                <View style={styles.desktopPanelHeader}>
                  <Text style={styles.desktopPanelTitle}>Bandeja de conversaciones</Text>
                  <Pressable style={styles.desktopSupportBtn} onPress={openSupportChat}>
                    <Ionicons name="headset-outline" size={16} color={WHITE} />
                    <Text style={styles.desktopSupportBtnText}>Soporte</Text>
                  </Pressable>
                </View>

                <View style={styles.desktopSearchBar}>
                  <Ionicons name="search-outline" size={17} color={TEXT3} />
                  <TextInput
                    style={styles.desktopSearchInput}
                    placeholder="Buscar conversación o cliente..."
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

                {loading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color={TEAL} />
                  </View>
                ) : filtered.length === 0 ? (
                  <View style={styles.empty}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="chatbubbles-outline" size={36} color={TEXT3} />
                    </View>
                    <Text style={styles.emptyTitle}>{search ? "Sin resultados" : "Sin conversaciones"}</Text>
                    <Text style={styles.emptySub}>
                      {search ? `No hay coincidencias para "${search}"` : "Tus conversaciones con clientes aparecerán aquí."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.desktopConversationList}>
                    {filtered.map((item, index) => (
                      <View key={item.id}>
                        <ConversationCard conv={item} index={index} currentUserId={currentUserId ?? undefined} />
                        {index < filtered.length - 1 ? <View style={styles.desktopSeparator} /> : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.desktopSideColumn}>
              <View style={styles.desktopPanel}>
                <Text style={styles.desktopPanelTitle}>Resumen</Text>
                <View style={styles.desktopSummaryStack}>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Conversaciones activas</Text>
                    <Text style={styles.desktopSummaryValue}>{totalConvs}</Text>
                  </View>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Mensajes sin leer</Text>
                    <Text style={styles.desktopSummaryValue}>{totalUnread}</Text>
                  </View>
                  <View style={styles.desktopSummaryRow}>
                    <Text style={styles.desktopSummaryLabel}>Actividad de hoy</Text>
                    <Text style={styles.desktopSummaryValue}>{todayCount}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.desktopPanel}>
                <Text style={styles.desktopPanelTitle}>Accesos</Text>
                <Pressable style={styles.desktopAction} onPress={openSupportChat}>
                  <Ionicons name="help-buoy-outline" size={16} color={TEXT2} />
                  <Text style={styles.desktopActionText}>Abrir soporte</Text>
                </Pressable>
                <Pressable style={styles.desktopAction} onPress={onRefresh}>
                  <Ionicons name="refresh-outline" size={16} color={TEXT2} />
                  <Text style={styles.desktopActionText}>Actualizar bandeja</Text>
                </Pressable>
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
  desktopScreen: { flex: 1, backgroundColor: BG },
  desktopShell: { width: "100%", alignSelf: "center" },
  desktopHero: { borderRadius: 28, overflow: "hidden" },
  desktopHeroGradient: { paddingHorizontal: 28, paddingVertical: 26 },
  desktopHeroMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  desktopHeroCopy: { flex: 1, gap: 4 },
  desktopEyebrow: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.64)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  desktopTitle: { fontSize: 34, fontFamily: "Inter_700Bold", color: WHITE },
  desktopSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
    maxWidth: 640,
  },
  desktopHeroStats: {
    minWidth: 300,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  desktopHeroStat: { flex: 1, alignItems: "center" },
  desktopHeroValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE },
  desktopHeroLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 2 },
  desktopHeroDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.18)" },
  desktopBody: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  desktopMainColumn: { flex: 1.55 },
  desktopSideColumn: { width: 320, gap: 20 },
  desktopPanel: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
    gap: 16,
  },
  desktopPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  desktopPanelTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },
  desktopSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TEAL,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  desktopSupportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  desktopSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5EBF2",
    paddingHorizontal: 14,
    gap: 8,
  },
  desktopSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
  },
  desktopConversationList: { gap: 0 },
  desktopSeparator: { height: 1, backgroundColor: "#F0F2F4", marginLeft: 76 },
  desktopSummaryStack: { gap: 12 },
  desktopSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  desktopSummaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  desktopSummaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },
  desktopAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  desktopActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },

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
