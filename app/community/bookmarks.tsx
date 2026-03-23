import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getBookmarks, toggleLike, toggleBookmark, type PostDTO } from "@/lib/services/communityService";

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

const AVATAR_PALETTE = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: ROSE },
  { bg: "#EEE8FD", text: "#7B5EA7" },
  { bg: "#FDF0E8", text: "#C2651A" },
];

function getAvatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)     return "ahora";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── Post Card ───────────────────────────────────────────────────────────
function BookmarkCard({
  post,
  index,
  onUnbookmark,
}: {
  post: PostDTO;
  index: number;
  onUnbookmark: (id: string) => void;
}) {
  const anim = React.useRef(new Animated.Value(0)).current;

  const [liked, setLiked]         = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [liking, setLiking]       = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 320,
      delay: Math.min(index * 50, 250),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handleLike = async (e: any) => {
    e.stopPropagation?.();
    if (liking) return;
    setLiking(true);
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    const result = await toggleLike(post.id);
    if (result) {
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } else {
      setLiked(p => !p);
      setLikeCount(p => liked ? p + 1 : p - 1);
    }
    setLiking(false);
  };

  const handleRemoveBookmark = async (e: any) => {
    e.stopPropagation?.();
    if (bookmarking) return;
    setBookmarking(true);
    const result = await toggleBookmark(post.id);
    if (result && !result.bookmarked) {
      onUnbookmark(post.id);
    }
    setBookmarking(false);
  };

  const isAnon     = post.visibility === "anonymous";
  const authorName = isAnon ? "Anónimo" : (post.author?.name ?? "Usuario");
  const initial    = isAnon ? "?" : (post.author?.name?.[0]?.toUpperCase() ?? "?");
  const av         = getAvatarColor(isAnon ? "?" : authorName);
  const snippet    = post.content.length > 140
    ? post.content.slice(0, 140) + "…"
    : post.content;

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/community/${post.id}` as any)}
      >
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Pressable
              style={styles.authorRow}
              onPress={(e) => {
                if (!isAnon) {
                  e.stopPropagation?.();
                  router.push(`/community/profile/${post.userId}` as any);
                }
              }}
              disabled={isAnon}
            >
              <View style={[styles.avatar, isAnon ? styles.avatarAnon : { backgroundColor: av.bg }]}>
                {isAnon
                  ? <Ionicons name="eye-off-outline" size={13} color={TEXT3} />
                  : <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
                }
              </View>
              <View>
                <Text style={[styles.authorName, !isAnon && { color: TEAL }]}>{authorName}</Text>
                <Text style={styles.dateText}>{formatDate(post.createdAt)}</Text>
              </View>
            </Pressable>

            <View style={styles.commentBadge}>
              <Ionicons name="chatbubble-outline" size={13} color={TEXT3} />
              <Text style={styles.commentBadgeText}>{post.commentCount}</Text>
            </View>
          </View>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContent}
            >
              {post.tags.map(tag => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Content */}
          <Text style={styles.cardTitle} numberOfLines={2}>{post.title}</Text>
          <Text style={styles.cardSnippet} numberOfLines={3}>{snippet}</Text>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Pressable style={styles.actionBtn} onPress={handleLike} hitSlop={6}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={14} color={liked ? ROSE : TEXT3} />
                <Text style={[styles.actionCount, liked && { color: ROSE }]}>{likeCount}</Text>
              </Pressable>
              <View style={styles.actionBtn}>
                <Ionicons name="eye-outline" size={14} color={TEXT3} />
                <Text style={styles.actionCount}>{post.viewCount ?? 0}</Text>
              </View>
            </View>

            <View style={styles.footerRight}>
              <Pressable onPress={handleRemoveBookmark} hitSlop={6} style={styles.bookmarkBtn}>
                <Ionicons name="bookmark" size={16} color={TEAL} />
              </Pressable>
              <Text style={styles.readMore}>Leer más</Text>
              <Ionicons name="arrow-forward" size={12} color={TEAL} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────
export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts]         = useState<PostDTO[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getBookmarks();
    setPosts(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleUnbookmark = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </Pressable>
        <View>
          <Text style={styles.headerEyebrow}>COMUNIDAD</Text>
          <Text style={styles.headerTitle}>Guardados</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <BookmarkCard post={item} index={index} onUnbookmark={handleUnbookmark} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={TEAL}
                colors={[TEAL]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="bookmark-outline" size={36} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>Sin publicaciones guardadas</Text>
                <Text style={styles.emptySub}>
                  Guarda publicaciones tocando el ícono{" "}
                  <Ionicons name="bookmark-outline" size={13} color={TEXT3} /> en cualquier post.
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={16} color={WHITE} />
                  <Text style={styles.emptyBtnText}>Explorar comunidad</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: NAVY },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  body: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  list: { paddingHorizontal: 16, gap: 10, paddingTop: 8 },

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.055,
    shadowRadius: 5,
    elevation: 1,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cardAccent:  { height: 3, backgroundColor: TEAL, opacity: 0.35 },
  cardInner:   { padding: 16 },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  avatarAnon: { backgroundColor: "#F0F2F4" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  authorName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  dateText:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 1 },

  commentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  commentBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },

  tagsScroll:  { marginBottom: 8 },
  tagsContent: { gap: 4 },
  tagChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, backgroundColor: TEAL + "12",
  },
  tagChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: TEAL },

  cardTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT,
    lineHeight: 21, marginBottom: 6, letterSpacing: -0.1,
  },
  cardSnippet: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2,
    lineHeight: 19, marginBottom: 12,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn:   { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT3 },
  bookmarkBtn: { padding: 2 },
  readMore:    { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },

  empty: { alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
