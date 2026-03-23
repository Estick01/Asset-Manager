/**
 * LawyerMatchFeed
 * Personalised case feed for lawyers/firms.
 * Sections: 🔥 Urgentes | 🎯 Recomendados | 🆕 Recientes
 * Consumed by: app/(lawyer-tabs)/community.tsx, app/(firm-tabs)/community.tsx
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getLawyerFeed, markPostSeen, type LawyerFeedDTO } from "@/lib/services/matchingService";
import { toggleLike, type PostDTO } from "@/lib/services/communityService";
import { useGlobalSocket } from "@/lib/global-socket-context";
import { C, T, S, R, shadow, CASE_META, getAvatarColor, formatDate, BackButton } from "@/constants/community-theme";

// ─── Local aliases for compatibility ──────────────────────────────────────
const NAVY   = C.NAVY;
const WHITE  = C.WHITE;
const BG     = C.BG;
const TEXT   = C.TEXT;
const TEXT2  = C.TEXT2;
const TEXT3  = C.TEXT3;
const TEAL   = C.TEAL;
const GREEN  = C.GREEN;
const AMBER  = C.AMBER;
const ROSE   = C.ROSE;
const PURPLE = C.PURPLE;
const ORANGE = C.ORANGE;

// ─── Skeleton ─────────────────────────────────────────────────────────────
function SkeletonBlock({ w, h, r = 8 }: { w?: number | `${number}%`; h: number; r?: number }) {
  return <View style={{ width: w ?? "100%", height: h, borderRadius: r, backgroundColor: "#E8ECF0", opacity: 0.7 }} />;
}

function MatchCardSkeleton() {
  return (
    <View style={[styles.card, { padding: 14, gap: 10 }]}>
      <View style={{ flexDirection: "row", gap: 7 }}>
        <SkeletonBlock w={56} h={22} r={7} />
        <SkeletonBlock w={48} h={22} r={7} />
      </View>
      <SkeletonBlock h={17} r={6} />
      <SkeletonBlock h={17} w="70%" r={6} />
      <SkeletonBlock h={12} r={5} />
      <SkeletonBlock h={12} w="80%" r={5} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <SkeletonBlock w={90} h={32} r={12} />
        <SkeletonBlock w={110} h={32} r={12} />
      </View>
    </View>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────
function MatchCard({ post, index }: { post: PostDTO; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [liked,     setLiked]     = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [liking,    setLiking]    = useState(false);

  const isUrgent = post.isUrgent === 1;
  const caseMeta = post.caseType ? (CASE_META[post.caseType] ?? null) : null;
  const snippet  = post.content.length > 100 ? post.content.slice(0, 100) + "…" : post.content;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 280,
      delay: Math.min(index * 35, 180),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handleOpen = () => {
    markPostSeen(post.id);
    router.push(`/community/${post.id}` as any);
  };

  const handleLike = async (e: any) => {
    e.stopPropagation?.();
    if (liking) return;
    setLiking(true);
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    const r = await toggleLike(post.id);
    if (r) { setLiked(r.liked); setLikeCount(r.likeCount); }
    else   { setLiked(p => !p); setLikeCount(p => liked ? p + 1 : p - 1); }
    setLiking(false);
  };

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isUrgent && styles.cardUrgent,
          pressed && styles.cardPressed,
        ]}
        onPress={handleOpen}
      >
        {/* Accent bar */}
        <View style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          backgroundColor: isUrgent ? C.ROSE : (caseMeta?.accent ?? C.TEAL),
          borderTopLeftRadius: R.card, borderBottomLeftRadius: R.card,
        }} />

        <View style={styles.cardInner}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={10} color={WHITE} />
                <Text style={styles.urgentText}>URGENTE</Text>
              </View>
            )}
            {caseMeta && (
              <View style={[styles.caseBadge, { backgroundColor: caseMeta.bg, borderColor: caseMeta.border }]}>
                <Ionicons name={caseMeta.icon as any} size={11} color={caseMeta.text} />
                <Text style={[styles.caseBadgeText, { color: caseMeta.text }]}>
                  {post.caseType!.charAt(0).toUpperCase() + post.caseType!.slice(1)}
                </Text>
              </View>
            )}
            {post.city && (
              <View style={styles.cityBadge}>
                <Ionicons name="location-outline" size={10} color={TEXT3} />
                <Text style={styles.cityText} numberOfLines={1}>{post.city}</Text>
              </View>
            )}
          </View>

          {/* Title + snippet */}
          <Text style={[styles.cardTitle, isUrgent && { color: ROSE }]} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={styles.cardSnippet} numberOfLines={2}>{snippet}</Text>

          {/* Tags */}
          {post.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.slice(0, 3).map(tag => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Pressable style={styles.metaPill} onPress={handleLike} hitSlop={6}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={13} color={liked ? ROSE : TEXT3} />
                {likeCount > 0 && <Text style={[styles.metaText, liked && { color: ROSE }]}>{likeCount}</Text>}
              </Pressable>
              <View style={[styles.metaPill, post.commentCount > 0 && styles.metaPillActive]}>
                <Ionicons
                  name={post.commentCount > 0 ? "chatbubble-ellipses" : "chatbubble-outline"}
                  size={13}
                  color={post.commentCount > 0 ? TEAL : TEXT3}
                />
                <Text style={[styles.metaText, post.commentCount > 0 && { color: TEAL }]}>
                  {post.commentCount > 0 ? `${post.commentCount}` : "0"}
                </Text>
              </View>
              <Text style={styles.timeText}>{formatDate(post.createdAt)}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.respondBtn, pressed && { opacity: 0.88 }]}
              onPress={handleOpen}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={WHITE} />
              <Text style={styles.respondBtnText}>Responder</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, gap: 8 }}>
      <View style={{ width: 2, height: 16, backgroundColor: C.TEAL, borderRadius: 1 }} />
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {emoji} {title}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function LawyerMatchFeed() {
  const insets = useSafeAreaInsets();
  const { lastCaseMatchAt, clearCaseBadge } = useGlobalSocket();

  const [feed,       setFeed]       = useState<LawyerFeedDTO>({ urgent: [], recommended: [], recent: [] });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    const data = await getLawyerFeed();
    setFeed(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      clearCaseBadge();
      setLoading(true);
      loadFeed().finally(() => setLoading(false));
    }, [loadFeed, clearCaseBadge])
  );

  // Refresca el feed en silencio cuando llega un nuevo caso por WebSocket
  useEffect(() => {
    if (lastCaseMatchAt === 0) return;
    loadFeed();
  }, [lastCaseMatchAt, loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  const totalCases = feed.urgent.length + feed.recommended.length + feed.recent.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Nav ── */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navEye}>CASOS PARA TI</Text>
          <Text style={styles.navTitle}>Mi Feed</Text>
        </View>
        <View style={styles.navRight}>
          {totalCases > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalCases} casos</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/community" as any)}
          >
            <Ionicons name="globe-outline" size={19} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.navCreateBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/community/new" as any)}
          >
            <Ionicons name="add" size={22} color={WHITE} />
          </Pressable>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {loading ? (
          <ScrollView contentContainerStyle={styles.skeletonList} showsVerticalScrollIndicator={false}>
            {[0, 1, 2, 3].map(i => <MatchCardSkeleton key={i} />)}
          </ScrollView>
        ) : totalCases === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark-outline" size={34} color={TEXT3} />
            </View>
            <Text style={styles.emptyTitle}>Sin casos asignados aún</Text>
            <Text style={styles.emptySub}>
              Cuando un cliente publique un caso que coincida con tu especialidad, aparecerá aquí automáticamente.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/community" as any)}
            >
              <Ionicons name="globe-outline" size={15} color={WHITE} />
              <Text style={styles.emptyBtnText}>Ver foro general</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
            }
          >
            {/* 🔥 Urgentes */}
            {feed.urgent.length > 0 && (
              <>
                <SectionHeader emoji="🔥" title="Urgentes" />
                {feed.urgent.map((post, i) => <MatchCard key={post.id} post={post} index={i} />)}
              </>
            )}

            {/* 🎯 Recomendados */}
            {feed.recommended.length > 0 && (
              <>
                <SectionHeader emoji="🎯" title="Para ti" />
                {feed.recommended.map((post, i) => <MatchCard key={post.id} post={post} index={i} />)}
              </>
            )}

            {/* 🆕 Recientes */}
            {feed.recent.length > 0 && (
              <>
                <SectionHeader emoji="🆕" title="Recientes" />
                {feed.recent.map((post, i) => <MatchCard key={post.id} post={post} index={i} />)}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG },

  // ── Nav ──
  navBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: C.NAVY,
  },
  navEye: {
    fontSize: 10, letterSpacing: 2,
    color: "rgba(255,255,255,0.4)", fontFamily: "Inter_500Medium", marginBottom: 2,
  },
  navTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.WHITE, letterSpacing: -0.4 },
  navRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
  },
  navCreateBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: C.TEAL, alignItems: "center", justifyContent: "center",
    shadowColor: C.TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 5,
  },
  totalBadge: {
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  totalBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.WHITE },

  // ── Body ──
  body: { flex: 1, backgroundColor: C.BG, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent:  { paddingHorizontal: S.cardPad, paddingTop: 18, gap: S.cardGap },
  skeletonList:   { paddingHorizontal: S.cardPad, paddingTop: 18, gap: 12 },

  // ── Card ──
  card: {
    backgroundColor: C.WHITE,
    borderRadius: R.card,
    marginHorizontal: S.cardPad,
    marginBottom: S.cardGap,
    overflow: "hidden" as const,
    ...shadow.card,
  },
  cardUrgent: {
    backgroundColor: C.ROSE_LIGHT,
    ...shadow.cardUrgent,
    borderWidth: 1,
    borderColor: C.ROSE + "25",
  },
  cardPressed: { opacity: 0.93, transform: [{ scale: 0.985 }] },
  cardInner:   { flex: 1, padding: 14, gap: 7 },

  // ── Badges ──
  badgeRow:   { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  urgentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.ROSE, paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.badge,
  },
  urgentText:  { fontSize: 9, fontFamily: "Inter_700Bold", color: C.WHITE, letterSpacing: 0.8 },
  caseBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.badge + 1, borderWidth: 1,
  },
  caseBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cityBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#F0F2F4", paddingHorizontal: 6, paddingVertical: 3, borderRadius: R.badge,
  },
  cityText: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.TEXT3, maxWidth: 80 },

  // ── Content ──
  cardTitle:   { fontSize: T.postTitle.fontSize, fontWeight: T.postTitle.fontWeight as any, color: C.TEXT, lineHeight: 21, letterSpacing: -0.2 },
  cardSnippet: { fontSize: T.postContent.fontSize, color: C.TEXT2, lineHeight: 20 },
  tagsRow:     { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tagChip: {
    backgroundColor: C.TEAL + "12", paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: R.badge,
  },
  tagChipText: { fontSize: 10, fontFamily: "Inter_500Medium", color: C.TEAL },

  // ── Footer ──
  cardFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 2,
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12,
    backgroundColor: C.BG,
  },
  metaPillActive: { backgroundColor: C.TEAL + "0D" },
  metaText:       { fontSize: T.meta.fontSize, fontFamily: "Inter_500Medium", color: C.TEXT3 },
  timeText:       { fontSize: T.meta.fontSize - 1, fontFamily: "Inter_400Regular", color: C.TEXT3 },
  respondBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.TEAL,
    borderRadius: R.button,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  respondBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.WHITE },

  // ── Empty state ──
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 36, gap: 12,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: "#EEF1F4", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold",    color: C.TEXT2, textAlign: "center" },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: C.TEXT3, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    backgroundColor: C.TEAL, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 20,
    shadowColor: C.TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.WHITE },
});
