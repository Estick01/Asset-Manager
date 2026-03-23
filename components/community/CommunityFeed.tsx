import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, Animated,
  TextInput, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import {
  getPosts, getTags, toggleLike, toggleBookmark,
  type PostDTO, type Tag, type PostSort,
} from "@/lib/services/communityService";
import { Tooltip } from "@/components/Tooltip";
import { CityPickerModal } from "@/components/community/CityPickerModal";

// ─── Tokens ───────────────────────────────────────────────────────────────
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
const PURPLE = "#7C3AED";
const ORANGE = "#EA580C";

// ─── Case type visual meta ────────────────────────────────────────────────
const CASE_META: Record<string, {
  bg: string; text: string; border: string; icon: string; label: string; accent: string;
}> = {
  civil:          { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE", icon: "document-text-outline", label: "Civil",          accent: "#4F46E5" },
  penal:          { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", icon: "warning-outline",        label: "Penal",          accent: "#DC2626" },
  laboral:        { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", icon: "briefcase-outline",      label: "Laboral",        accent: "#D97706" },
  familiar:       { bg: "#F5F3FF", text: PURPLE,   border: "#DDD6FE", icon: "people-outline",         label: "Familiar",       accent: PURPLE },
  mercantil:      { bg: "#ECFEFF", text: "#0891B2", border: "#A5F3FC", icon: "business-outline",       label: "Mercantil",      accent: "#0891B2" },
  administrativo: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", icon: "shield-outline",         label: "Administrativo", accent: "#16A34A" },
  tributario:     { bg: "#FFF7ED", text: ORANGE,   border: "#FED7AA", icon: "cash-outline",           label: "Tributario",     accent: ORANGE },
  inmobiliario:   { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4", icon: "home-outline",           label: "Inmobiliario",   accent: "#0F766E" },
  otro:           { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", icon: "help-circle-outline",    label: "Otro",           accent: "#6B7280" },
};

const AVATAR_PALETTE = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: ROSE },
  { bg: "#EEE8FD", text: PURPLE },
  { bg: "#FDF0E8", text: ORANGE },
];

function getAvatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)    return "ahora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function SkeletonBlock({ w, h, r = 8, mb = 0 }: { w?: number | `${number}%`; h: number; r?: number; mb?: number }) {
  return <View style={{ width: w ?? "100%", height: h, borderRadius: r, backgroundColor: "#E8ECF0", marginBottom: mb, opacity: 0.75 }} />;
}

function CardSkeleton() {
  return (
    <View style={[styles.card, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SkeletonBlock w={64} h={23} r={8} />
        <SkeletonBlock w={52} h={23} r={8} />
      </View>
      <SkeletonBlock h={19} r={6} />
      <SkeletonBlock h={19} w="78%" r={6} />
      <SkeletonBlock h={13} r={5} />
      <SkeletonBlock h={13} w="85%" r={5} mb={8} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <SkeletonBlock w={32} h={32} r={16} />
          <View style={{ gap: 4 }}>
            <SkeletonBlock w={80} h={11} r={5} />
            <SkeletonBlock w={50} h={10} r={5} />
          </View>
        </View>
        <SkeletonBlock w={88} h={33} r={12} />
      </View>
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────
function PostCard({ post, index }: { post: PostDTO; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [liked,       setLiked]       = useState(post.isLiked ?? false);
  const [likeCount,   setLikeCount]   = useState(post.likeCount ?? 0);
  const [bookmarked,  setBookmarked]  = useState(post.isBookmarked ?? false);
  const [liking,      setLiking]      = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const isAnon   = post.visibility === "anonymous";
  const authorName = isAnon ? "Anónimo" : (post.author?.name ?? "Usuario");
  const initial    = isAnon ? "?" : (post.author?.name?.[0]?.toUpperCase() ?? "?");
  const av         = getAvatarColor(isAnon ? "?" : authorName);
  const isLawyer   = !isAnon && (post.author?.rol === "abogado" || post.author?.rol === "bufete");
  const isUrgent   = post.isUrgent === 1;
  const caseMeta   = post.caseType ? (CASE_META[post.caseType] ?? null) : null;
  const accentColor = isUrgent ? ROSE : (caseMeta?.accent ?? TEAL);
  const snippet    = post.content.length > 110 ? post.content.slice(0, 110) + "…" : post.content;
  const hasReplies = post.commentCount > 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 280,
      delay: Math.min(index * 40, 200),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

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

  const handleBookmark = async (e: any) => {
    e.stopPropagation?.();
    if (bookmarking) return;
    setBookmarking(true);
    setBookmarked(p => !p);
    const r = await toggleBookmark(post.id);
    if (r) setBookmarked(r.bookmarked);
    else   setBookmarked(p => !p);
    setBookmarking(false);
  };

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isUrgent && styles.cardUrgent,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(`/community/${post.id}` as any)}
      >
        {/* Left accent bar — colored by case type or urgency */}
        <View style={[styles.cardSideBar, { backgroundColor: accentColor }]} />

        <View style={styles.cardInner}>

          {/* ── Badge row ── */}
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
                <Text style={[styles.caseBadgeText, { color: caseMeta.text }]}>{caseMeta.label}</Text>
              </View>
            )}
            {post.tags.slice(0, 2).map(tag => (
              <View key={tag.id} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{tag.name}</Text>
              </View>
            ))}
            {(post as any).status === "in_progress" && (
              <View style={styles.takenBadge}>
                <Ionicons name="lock-closed" size={10} color="#92400E" />
                <Text style={styles.takenText}>Tomado</Text>
              </View>
            )}
            {(post as any).status === "closed" && (
              <View style={styles.closedBadge}>
                <Ionicons name="checkmark-done" size={10} color="#166534" />
                <Text style={styles.closedText}>Resuelto</Text>
              </View>
            )}
            {hasReplies && (
              <View style={styles.repliedBadge}>
                <Ionicons name="checkmark-circle" size={11} color={GREEN} />
                <Text style={styles.repliedText}>{post.commentCount} resp.</Text>
              </View>
            )}
          </View>

          {/* ── Title ── */}
          <Text
            style={[styles.cardTitle, isUrgent && { color: ROSE }]}
            numberOfLines={2}
          >
            {post.title}
          </Text>

          {/* ── Snippet ── */}
          <Text style={styles.cardSnippet} numberOfLines={2}>{snippet}</Text>

          {/* ── Author row ── */}
          <View style={styles.cardMeta}>
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
              <View style={{ position: "relative" }}>
                <View style={[styles.avatar, isAnon ? styles.avatarAnon : { backgroundColor: av.bg }]}>
                  {isAnon
                    ? <Ionicons name="eye-off-outline" size={12} color={TEXT3} />
                    : <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
                  }
                </View>
                {isLawyer && (
                  <View style={styles.lawyerDot}>
                    <Ionicons name="shield-checkmark" size={8} color={WHITE} />
                  </View>
                )}
              </View>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={[styles.authorName, isLawyer && { color: TEAL }]} numberOfLines={1}>
                    {authorName}
                  </Text>
                  {isLawyer && (
                    <View style={styles.lawyerPill}>
                      <Text style={styles.lawyerPillText}>Abogado</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.metaDate}>{formatDate(post.createdAt)}</Text>
              </View>
            </Pressable>

            {post.city && (
              <View style={styles.cityPill}>
                <Ionicons name="location-outline" size={11} color={TEXT3} />
                <Text style={styles.cityText} numberOfLines={1}>{post.city}</Text>
              </View>
            )}
          </View>

          {/* ── Footer ── */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Pressable
                style={[styles.footerPill, liked && styles.footerPillLiked]}
                onPress={handleLike}
                hitSlop={6}
              >
                <Ionicons name={liked ? "heart" : "heart-outline"} size={13} color={liked ? ROSE : TEXT3} />
                {likeCount > 0 && (
                  <Text style={[styles.footerPillText, liked && { color: ROSE }]}>{likeCount}</Text>
                )}
              </Pressable>

              <View style={[styles.footerPill, hasReplies && styles.footerPillReplied]}>
                <Ionicons
                  name={hasReplies ? "chatbubble-ellipses" : "chatbubble-outline"}
                  size={13}
                  color={hasReplies ? TEAL : TEXT3}
                />
                <Text style={[styles.footerPillText, hasReplies && { color: TEAL }]}>
                  {hasReplies ? `${post.commentCount}` : "0"}
                </Text>
              </View>

              <Pressable onPress={handleBookmark} hitSlop={8} style={styles.bookmarkBtn}>
                <Ionicons
                  name={bookmarked ? "bookmark" : "bookmark-outline"}
                  size={15}
                  color={bookmarked ? TEAL : TEXT3}
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/community/${post.id}` as any)}
            >
              <Text style={styles.viewBtnText}>Ver caso</Text>
              <Ionicons name="arrow-forward" size={12} color={WHITE} />
            </Pressable>
          </View>

        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────
function HeroSection({ onPublish }: { onPublish: () => void }) {
  return (
    <View style={styles.hero}>
      {/* Main copy */}
      <View style={styles.heroTextWrap}>
        <Text style={styles.heroTitle}>
          ¿Tienes un{"\n"}problema legal?
        </Text>
        <Text style={styles.heroSub}>
          Consulta gratis · Abogados reales · Respuesta rápida
        </Text>
      </View>

      {/* Trust strip */}
      <View style={styles.trustStrip}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark" size={13} color={GREEN} />
          <Text style={styles.trustText}>Abogados verificados</Text>
        </View>
        <View style={styles.trustDot} />
        <View style={styles.trustItem}>
          <Ionicons name="time-outline" size={13} color={AMBER} />
          <Text style={styles.trustText}>Respuesta rápida</Text>
        </View>
        <View style={styles.trustDot} />
        <View style={styles.trustItem}>
          <Ionicons name="eye-off-outline" size={13} color="rgba(255,255,255,0.65)" />
          <Text style={styles.trustText}>Puede ser anónimo</Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
        onPress={onPublish}
      >
        <View style={styles.heroBtnLeft}>
          <View style={styles.heroBtnIcon}>
            <Ionicons name="create-outline" size={18} color={NAVY} />
          </View>
          <View>
            <Text style={styles.heroBtnTitle}>Publicar mi caso</Text>
            <Text style={styles.heroBtnSub}>Gratis · Sin registro obligatorio</Text>
          </View>
        </View>
        <Ionicons name="arrow-forward-circle" size={24} color={NAVY + "55"} />
      </Pressable>
    </View>
  );
}

// ─── Lawyer hero (for lawyer/firm role) ───────────────────────────────────
function LawyerHero() {
  return (
    <View style={styles.lawyerHero}>
      <View style={styles.lawyerHeroIcon}>
        <Ionicons name="shield-checkmark" size={22} color={WHITE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.lawyerHeroTitle}>Foro de consultas legales</Text>
        <Text style={styles.lawyerHeroSub}>Responde y conecta con nuevos clientes</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.lawyerHeroBtn, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/community/new" as any)}
      >
        <Ionicons name="add" size={16} color={WHITE} />
        <Text style={styles.lawyerHeroBtnText}>Publicar</Text>
      </Pressable>
    </View>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const SORT_OPTIONS: { key: PostSort; label: string; icon: string }[] = [
  { key: "recent",  label: "Recientes",    icon: "time-outline" },
  { key: "popular", label: "Populares",    icon: "trending-up-outline" },
  { key: "liked",   label: "Más gustados", icon: "heart-outline" },
];

export default function CommunityFeed() {
  const insets        = useSafeAreaInsets();
  const { user }      = useAuth();
  const currentUserId = user?.user?.id as string | undefined;
  const userRole      = (user?.user as any)?.rol as string | undefined;
  const isLawyer      = userRole === "abogado" || userRole === "bufete";

  const [posts, setPosts]           = useState<PostDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);

  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState<PostSort>("recent");
  const [tagSlug, setTagSlug]       = useState<string | undefined>(undefined);
  const [tags, setTags]             = useState<Tag[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef("");
  const sortRef       = useRef(sort);
  const searchRef     = useRef(search);
  const tagSlugRef    = useRef(tagSlug);
  const cityFilterRef = useRef(cityFilter);

  useEffect(() => { sortRef.current = sort; },             [sort]);
  useEffect(() => { searchRef.current = search; },         [search]);
  useEffect(() => { tagSlugRef.current = tagSlug; },       [tagSlug]);
  useEffect(() => { cityFilterRef.current = cityFilter; }, [cityFilter]);
  useEffect(() => { getTags().then(setTags); }, []);

  const load = useCallback(async (
    offset: number,
    replace: boolean,
    opts: { search?: string; sort?: PostSort; tagSlug?: string | undefined; city?: string | undefined } = {}
  ) => {
    const data = await getPosts(PAGE_SIZE, offset, {
      search:  opts.search || undefined,
      sort:    opts.sort ?? "recent",
      tagSlug: opts.tagSlug,
      city:    opts.city || undefined,
    });
    setPosts(prev => replace ? data : [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(0, true, {
        search:  searchRef.current || undefined,
        sort:    sortRef.current,
        tagSlug: tagSlugRef.current,
        city:    cityFilterRef.current,
      }).finally(() => setLoading(false));
    }, [load])
  );

  const reload = useCallback(async (overrides?: {
    search?: string; sort?: PostSort; tagSlug?: string | undefined; city?: string | undefined;
  }) => {
    const opts = {
      search:  overrides?.search  ?? search,
      sort:    overrides?.sort    ?? sort,
      tagSlug: overrides?.tagSlug !== undefined ? overrides.tagSlug : tagSlug,
      city:    overrides?.city    !== undefined ? overrides.city    : cityFilter,
    };
    setLoading(true);
    await load(0, true, opts);
    setLoading(false);
  }, [load, search, sort, tagSlug, cityFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(0, true, { search: search || undefined, sort, tagSlug, city: cityFilter });
    setRefreshing(false);
  }, [load, search, sort, tagSlug, cityFilter]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(posts.length, false, { search: search || undefined, sort, tagSlug, city: cityFilter });
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts.length, load, search, sort, tagSlug, cityFilter]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    pendingSearch.current = text;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { reload({ search: pendingSearch.current }); }, 400);
  };

  const handleSort = (s: PostSort) => { setSort(s); reload({ sort: s }); };
  const handleTag  = (slug: string) => {
    const next = tagSlug === slug ? undefined : slug;
    setTagSlug(next);
    reload({ tagSlug: next });
  };
  const handleCitySelect = (nombre: string) => {
    const next = nombre || undefined;
    setCityFilter(next);
    reload({ city: next });
  };

  const ListHeader = (
    <View style={styles.listHeader}>

      {/* ── Filters row (sort + city + search) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {SORT_OPTIONS.map(opt => (
          <Pressable
            key={opt.key}
            style={[styles.sortChip, sort === opt.key && styles.sortChipActive]}
            onPress={() => handleSort(opt.key)}
          >
            <Ionicons name={opt.icon as any} size={12} color={sort === opt.key ? WHITE : TEXT2} />
            <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}

        <View style={styles.sortDivider} />

        <Pressable
          style={[styles.sortChip, cityFilter && styles.sortChipCity]}
          onPress={() => setCityPickerOpen(true)}
        >
          <Ionicons name="location-outline" size={12} color={cityFilter ? TEAL : TEXT2} />
          <Text style={[styles.sortText, cityFilter && styles.sortTextCity]}>
            {cityFilter ?? "Ciudad"}
          </Text>
          {cityFilter && (
            <Pressable onPress={(e) => { e.stopPropagation?.(); handleCitySelect(""); }} hitSlop={8}>
              <Ionicons name="close-circle" size={13} color={TEAL} />
            </Pressable>
          )}
        </Pressable>

        <Pressable
          style={[styles.sortChip, showSearch && styles.sortChipActive]}
          onPress={() => setShowSearch(v => !v)}
        >
          <Ionicons name={showSearch ? "close" : "search-outline"} size={12} color={showSearch ? WHITE : TEXT2} />
          <Text style={[styles.sortText, showSearch && styles.sortTextActive]}>
            {search ? `"${search.slice(0, 12)}…"` : "Buscar"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Search box */}
      {showSearch && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={15} color={TEXT3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar consultas legales…"
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={handleSearchChange}
            autoFocus
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); reload({ search: "" }); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={TEXT3} />
            </Pressable>
          )}
        </View>
      )}

      {/* Tag filters */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
        >
          {tags.map(tag => (
            <Pressable
              key={tag.id}
              style={[styles.tagChipFilter, tagSlug === tag.slug && styles.tagChipFilterActive]}
              onPress={() => handleTag(tag.slug)}
            >
              <Text style={[styles.tagChipFilterText, tagSlug === tag.slug && styles.tagChipFilterTextActive]}>
                #{tag.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* New post prompt */}
      {isLawyer ? (
        <Pressable
          style={({ pressed }) => [styles.lawyerPrompt, pressed && { opacity: 0.88 }]}
          onPress={() => router.push("/community/new" as any)}
        >
          <View style={styles.lawyerPromptIcon}>
            <Ionicons name="shield-checkmark" size={16} color={WHITE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lawyerPromptTitle}>Responde consultas legales</Text>
            <Text style={styles.lawyerPromptSub}>Aumenta tu visibilidad · Conecta con clientes</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEAL + "70"} />
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.newPostBar, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/community/new" as any)}
        >
          <View style={styles.newPostAvatar}>
            <Ionicons name="add" size={16} color={TEAL} />
          </View>
          <Text style={styles.newPostText}>¿Cuál es tu consulta legal hoy?</Text>
          <View style={styles.newPostBtn}>
            <Text style={styles.newPostBtnText}>Publicar</Text>
          </View>
        </Pressable>
      )}

      {/* Section header */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionChip}>
          <Ionicons name="layers-outline" size={11} color={TEXT2} />
          <Text style={styles.sectionChipText}>
            {search
              ? `Resultados para "${search}"`
              : sort === "popular" ? "Más populares"
              : sort === "liked"   ? "Más gustados"
              : "Consultas recientes"}
          </Text>
        </View>
        <View style={styles.sectionLine} />
      </View>

    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </Pressable>
          )}
          <View>
            <Text style={styles.navEyebrow}>FORO LEGAL</Text>
            <Text style={styles.navTitle}>Comunidad</Text>
          </View>
        </View>
        <View style={styles.navActions}>
          {currentUserId && (
            <Tooltip label="Mi perfil">
              <Pressable
                style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/community/profile/${currentUserId}` as any)}
              >
                <Ionicons name="person-outline" size={19} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </Tooltip>
          )}
          <Tooltip label="Guardados">
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push("/community/bookmarks" as any)}
            >
              <Ionicons name="bookmark-outline" size={19} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </Tooltip>
          <Pressable
            style={({ pressed }) => [styles.navCreateBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/community/new" as any)}
          >
            <Ionicons name="add" size={22} color={WHITE} />
          </Pressable>
        </View>
      </View>

      {/* ── Hero ── */}
      {isLawyer ? (
        <LawyerHero />
      ) : (
        <HeroSection onPublish={() => router.push("/community/new" as any)} />
      )}

      {/* ── Body ── */}
      <View style={styles.body}>
        {loading ? (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {[0, 1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </ScrollView>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => <PostCard post={item} index={index} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            ListHeaderComponent={ListHeader}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator style={{ paddingVertical: 20 }} color={TEAL} />
                : <View style={{ height: 100 }} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={34} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search ? "Sin resultados" : "Aún no hay consultas"}
                </Text>
                <Text style={styles.emptySub}>
                  {search
                    ? "Intenta con otras palabras clave"
                    : "¡Sé el primero en publicar una consulta legal!"}
                </Text>
                {!search && !isLawyer && (
                  <Pressable
                    style={styles.emptyBtn}
                    onPress={() => router.push("/community/new" as any)}
                  >
                    <Ionicons name="create-outline" size={16} color={WHITE} />
                    <Text style={styles.emptyBtnText}>Publicar mi caso</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
      </View>

      <CityPickerModal
        visible={cityPickerOpen}
        selected={cityFilter ?? null}
        onClose={() => setCityPickerOpen(false)}
        onSelect={handleCitySelect}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  // ── Nav bar ──
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  navEyebrow: {
    fontSize: 10, letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  navTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: -0.4 },
  navActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  navCreateBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38, shadowRadius: 8, elevation: 5,
  },

  // ── Hero ──
  hero: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  heroTextWrap: { gap: 6 },
  heroTitle: {
    fontSize: 30, fontFamily: "Inter_700Bold", color: WHITE,
    letterSpacing: -0.6, lineHeight: 38,
  },
  heroSub: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)", lineHeight: 20,
  },

  trustStrip: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  trustItem:  { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText:  { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  trustDot:   { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.25)" },

  heroBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: WHITE, borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 6,
  },
  heroBtnLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBtnIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: TEAL + "18", alignItems: "center", justifyContent: "center",
  },
  heroBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },
  heroBtnSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 2 },

  // ── Lawyer hero ──
  lawyerHero: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
  },
  lawyerHeroIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
  },
  lawyerHeroTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  lawyerHeroSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  lawyerHeroBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20,
  },
  lawyerHeroBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Body ──
  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },

  // ── List / header ──
  list:       { paddingHorizontal: 16, gap: 10 },
  listHeader: { paddingTop: 14, paddingBottom: 6, gap: 10 },

  // ── Sort row ──
  sortRow: { paddingHorizontal: 16, gap: 7, flexDirection: "row", alignItems: "center" },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, backgroundColor: WHITE,
    borderWidth: 1, borderColor: "#E0E5EA",
  },
  sortChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  sortChipCity:   { borderColor: TEAL, borderWidth: 1.5 },
  sortText:       { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT2 },
  sortTextActive: { color: WHITE, fontFamily: "Inter_600SemiBold" },
  sortTextCity:   { color: TEAL, fontFamily: "Inter_600SemiBold" },
  sortDivider: { width: 1, height: 20, backgroundColor: "#E0E5EA" },

  // ── Search ──
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1, borderColor: "#E0E5EA",
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, marginHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  searchInput: {
    flex: 1, fontSize: 14,
    fontFamily: "Inter_400Regular", color: TEXT,
  },

  // ── Tag filters ──
  tagRow: { paddingHorizontal: 16, gap: 7, flexDirection: "row", alignItems: "center" },
  tagChipFilter: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 20, backgroundColor: WHITE,
    borderWidth: 1, borderColor: "#E0E5EA",
  },
  tagChipFilterActive:     { backgroundColor: TEAL + "14", borderColor: TEAL },
  tagChipFilterText:       { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  tagChipFilterTextActive: { color: TEAL, fontFamily: "Inter_600SemiBold" },

  // ── Lawyer prompt ──
  lawyerPrompt: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: WHITE, borderRadius: 16,
    marginHorizontal: 16, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: TEAL + "25",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  lawyerPromptIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
  },
  lawyerPromptTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  lawyerPromptSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2 },

  // ── New post bar ──
  newPostBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: WHITE, borderRadius: 16,
    marginHorizontal: 16, paddingVertical: 11, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: TEAL + "25",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  newPostAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: TEAL + "14", alignItems: "center", justifyContent: "center",
  },
  newPostText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3 },
  newPostBtn: {
    backgroundColor: TEAL, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
  },
  newPostBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Section header ──
  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 10,
  },
  sectionChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NAVY + "0C", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 10,
  },
  sectionChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine:     { flex: 1, height: 1, backgroundColor: "#E8ECF0" },

  // ── Post card ──
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUrgent: {
    shadowColor: ROSE,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: ROSE + "25",
  },
  cardPressed: { opacity: 0.93, transform: [{ scale: 0.985 }] },
  cardSideBar: { width: 4 },
  cardInner:   { flex: 1, padding: 14, gap: 8 },

  // ── Badge row ──
  badgeRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  urgentBadge:  {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: ROSE, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: 0.8 },
  caseBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  caseBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tagChip: {
    backgroundColor: TEAL + "12", paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 7,
  },
  tagChipText: { fontSize: 10, fontFamily: "Inter_500Medium", color: TEAL },
  repliedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: GREEN + "12", paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 7,
  },
  repliedText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GREEN },

  takenBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  takenText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#92400E" },

  closedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  closedText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#166534" },

  // ── Card content ──
  cardTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold",
    color: TEXT, lineHeight: 22, letterSpacing: -0.2,
  },
  cardSnippet: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: TEXT2, lineHeight: 20,
  },

  // ── Card meta ──
  cardMeta: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 8,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarAnon: { backgroundColor: "#F0F2F4" },
  avatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lawyerDot: {
    position: "absolute", bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: TEAL, alignItems: "center",
    justifyContent: "center", borderWidth: 1.5, borderColor: WHITE,
  },
  authorName:    { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT, maxWidth: 110 },
  lawyerPill: {
    backgroundColor: TEAL + "14", paddingHorizontal: 5,
    paddingVertical: 2, borderRadius: 5,
  },
  lawyerPillText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: TEAL },
  metaDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 1 },
  cityPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#F0F2F4", paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 8, flexShrink: 1,
  },
  cityText: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3, maxWidth: 80 },

  // ── Card footer ──
  cardFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 2,
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 20, backgroundColor: "#F4F6F8",
    borderWidth: 1, borderColor: "#E8ECF0",
  },
  footerPillLiked:   { backgroundColor: ROSE + "0D",  borderColor: ROSE + "30" },
  footerPillReplied: { backgroundColor: TEAL + "0D",  borderColor: TEAL + "25" },
  footerPillText:    { fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT3 },
  bookmarkBtn:       { padding: 4 },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: NAVY, paddingHorizontal: 13,
    paddingVertical: 8, borderRadius: 20,
  },
  viewBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Empty ──
  empty: {
    alignItems: "center", paddingVertical: 60, paddingHorizontal: 32, gap: 10,
  },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: "#EEF1F4", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold",    color: TEXT2 },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 8, backgroundColor: TEAL,
    paddingHorizontal: 20, paddingVertical: 13, borderRadius: 20,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },
});
