import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, Animated,
  TextInput, ScrollView, useWindowDimensions, Platform,
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
import { C, S, R, shadow, CASE_META, getAvatarColor, formatDate } from "@/constants/community-theme";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// Local aliases for backwards compat within this file
const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;

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
function PostCard({ post, index, isLawyer }: { post: PostDTO; index: number; isLawyer: boolean }) {
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
  const authorIsLawyer = !isAnon && (post.author?.rol === "abogado" || post.author?.rol === "bufete");
  const isUrgent   = post.isUrgent === 1;
  const caseMeta   = post.caseType ? (CASE_META[post.caseType] ?? null) : null;
  const accentColor = isUrgent ? ROSE : (caseMeta?.accent ?? TEAL);
  const snippet    = post.content.length > 110 ? post.content.slice(0, 110) + "…" : post.content;
  const hasReplies = post.commentCount > 0;
  const status = (post as any).status as string | undefined;

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
          isUrgent ? { backgroundColor: C.ROSE_LIGHT, ...shadow.cardUrgent } : shadow.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(`/community/${post.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir consulta: ${post.title}`}
      >
        {/* Left accent bar — colored by case type or urgency */}
        <View style={[styles.cardSideBar, {
          backgroundColor: accentColor,
          position: "absolute", left: 0, top: 0, bottom: 0,
          borderTopLeftRadius: R.card, borderBottomLeftRadius: R.card,
        }]} />

        <View style={styles.cardInner}>

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
                {authorIsLawyer && (
                  <View style={styles.lawyerDot}>
                    <Ionicons name="shield-checkmark" size={8} color={WHITE} />
                  </View>
                )}
              </View>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={[styles.authorName, authorIsLawyer && { color: TEAL }]} numberOfLines={1}>
                    {authorName}
                  </Text>
                  {authorIsLawyer && (
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

          <Text
            style={[styles.cardTitle, isUrgent && { color: ROSE }]}
            numberOfLines={2}
          >
            {post.title}
          </Text>

          <Text style={styles.cardSnippet} numberOfLines={2}>{snippet}</Text>

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
            {status === "in_progress" && (
              <View style={styles.takenBadge}>
                <Ionicons name="lock-closed" size={10} color="#92400E" />
                <Text style={styles.takenText}>Tomado</Text>
              </View>
            )}
            {status === "closed" && (
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

          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Pressable
                style={[styles.footerPill, liked && styles.footerPillLiked]}
                onPress={handleLike}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={liked ? "Quitar me gusta" : "Dar me gusta"}
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

              <Pressable
                onPress={handleBookmark}
                hitSlop={8}
                style={styles.bookmarkBtn}
                accessibilityRole="button"
                accessibilityLabel={bookmarked ? "Quitar de guardados" : "Guardar publicación"}
              >
                <Ionicons
                  name={bookmarked ? "bookmark" : "bookmark-outline"}
                  size={15}
                  color={bookmarked ? TEAL : TEXT3}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push(`/community/${post.id}` as any)}
              style={styles.cardActionBtn}
              accessibilityRole="button"
              accessibilityLabel={isLawyer ? "Responder consulta" : "Ver detalle de la consulta"}
            >
              <Ionicons name={isLawyer ? "chatbubble-outline" : "open-outline"} size={13} color={C.WHITE} />
              <Text style={styles.cardActionText}>{isLawyer ? "Responder" : "Ver caso"}</Text>
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
        <Text style={styles.heroTitle}>Encuentra orientación legal</Text>
        <Text style={styles.heroSub}>
          Publica tu consulta, revisa respuestas y guarda los casos que quieras seguir.
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
        accessibilityRole="button"
        accessibilityLabel="Publicar mi caso en la comunidad"
      >
        <View style={styles.heroBtnLeft}>
          <View style={styles.heroBtnIcon}>
            <Ionicons name="create-outline" size={18} color={NAVY} />
          </View>
          <View>
            <Text style={styles.heroBtnTitle}>Publicar mi caso</Text>
            <Text style={styles.heroBtnSub}>Paso a paso y con opción anónima</Text>
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
        <Text style={styles.lawyerHeroTitle}>Consultas legales activas</Text>
        <Text style={styles.lawyerHeroSub}>Filtra, guarda y responde desde una vista más clara</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.lawyerHeroBtn, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/community/new" as any)}
        accessibilityRole="button"
        accessibilityLabel="Publicar en comunidad"
      >
        <Ionicons name="add" size={16} color={WHITE} />
        <Text style={styles.lawyerHeroBtnText}>Publicar</Text>
      </Pressable>
    </View>
  );
}

function ForumOverview({
  postsCount,
  tagsCount,
  activeFilters,
}: {
  postsCount: number;
  tagsCount: number;
  activeFilters: number;
}) {
  return (
    <View style={styles.forumOverview}>
      <View style={styles.forumMetric}>
        <View style={[styles.forumMetricIcon, { backgroundColor: TEAL + "14" }]}>
          <Ionicons name="chatbubbles-outline" size={15} color={TEAL} />
        </View>
        <View>
          <Text style={styles.forumMetricValue}>{postsCount}</Text>
          <Text style={styles.forumMetricLabel}>consultas</Text>
        </View>
      </View>
      <View style={styles.forumMetric}>
        <View style={[styles.forumMetricIcon, { backgroundColor: NAVY + "0F" }]}>
          <Ionicons name="pricetags-outline" size={15} color={NAVY} />
        </View>
        <View>
          <Text style={styles.forumMetricValue}>{tagsCount}</Text>
          <Text style={styles.forumMetricLabel}>temas</Text>
        </View>
      </View>
      <View style={styles.forumMetric}>
        <View style={[styles.forumMetricIcon, { backgroundColor: activeFilters > 0 ? ROSE + "12" : "#EEF1F4" }]}>
          <Ionicons name="filter-outline" size={15} color={activeFilters > 0 ? ROSE : TEXT3} />
        </View>
        <View>
          <Text style={styles.forumMetricValue}>{activeFilters}</Text>
          <Text style={styles.forumMetricLabel}>filtros</Text>
        </View>
      </View>
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
  const { width }     = useWindowDimensions();
  const { user }      = useAuth();
  const currentUserId = user?.user?.id as string | undefined;
  const userRole      = (user?.user as any)?.rol as string | undefined;
  const isLawyer      = userRole === "abogado" || userRole === "bufete";
  const desktopWeb    = Platform.OS === "web" && isDesktopViewport(width);
  const desktopMetrics = getDesktopMetrics(width);
  const desktopShellWidth = Math.min(1520, Math.max(1120, width - desktopMetrics.gutter * 2));
  const desktopAsideWidth = Math.min(340, Math.max(292, desktopMetrics.sidebarWidth + 28));

  const [posts, setPosts]           = useState<PostDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);

  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState<PostSort>("recent");
  const [tagSlug, setTagSlug]       = useState<string | undefined>(undefined);
  const [tags, setTags]             = useState<Tag[]>([]);
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
  const activeFilters = [search ? 1 : 0, tagSlug ? 1 : 0, cityFilter ? 1 : 0].reduce((sum, value) => sum + value, 0);
  const currentTag = tags.find(tag => tag.slug === tagSlug);
  const viewLabel = search
    ? `Resultados para "${search}"`
    : sort === "popular" ? "Más populares"
    : sort === "liked"   ? "Más gustados"
    : "Consultas recientes";
  const clearFilters = () => {
    setSearch("");
    setTagSlug(undefined);
    setCityFilter(undefined);
    reload({ search: "", tagSlug: undefined, city: undefined, sort });
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={17} color={TEXT3} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tema, ciudad o palabra clave"
          placeholderTextColor={TEXT3}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          accessibilityLabel="Buscar en comunidad"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => { setSearch(""); reload({ search: "" }); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close-circle" size={18} color={TEXT3} />
          </Pressable>
        )}
      </View>

      <ForumOverview postsCount={posts.length} tagsCount={tags.length} activeFilters={activeFilters} />

      <View style={styles.filterBlock}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>Ordenar y filtrar</Text>
          {activeFilters > 0 && (
            <Pressable
              onPress={clearFilters}
              hitSlop={8}
              style={styles.clearFiltersBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Text style={styles.clearFiltersText}>Limpiar</Text>
            </Pressable>
          )}
        </View>
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
              accessibilityRole="button"
              accessibilityState={{ selected: sort === opt.key }}
            >
              <Ionicons name={opt.icon as any} size={14} color={sort === opt.key ? WHITE : TEXT2} />
              <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={[styles.sortChip, cityFilter && styles.sortChipCity]}
            onPress={() => setCityPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtrar por ciudad"
          >
            <Ionicons name="location-outline" size={14} color={cityFilter ? TEAL : TEXT2} />
            <Text style={[styles.sortText, cityFilter && styles.sortTextCity]}>
              {cityFilter ?? "Ciudad"}
            </Text>
            {cityFilter && (
              <Pressable onPress={(e) => { e.stopPropagation?.(); handleCitySelect(""); }} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={TEAL} />
              </Pressable>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
        >
          <Pressable
            style={[styles.tagChipFilter, !tagSlug && styles.tagChipFilterActive]}
            onPress={() => { setTagSlug(undefined); reload({ tagSlug: undefined }); }}
            accessibilityRole="button"
            accessibilityState={{ selected: !tagSlug }}
          >
            <Text style={[styles.tagChipFilterText, !tagSlug && styles.tagChipFilterTextActive]}>
              Todos
            </Text>
          </Pressable>
          {tags.map(tag => (
            <Pressable
              key={tag.id}
              style={[styles.tagChipFilter, tagSlug === tag.slug && styles.tagChipFilterActive]}
              onPress={() => handleTag(tag.slug)}
              accessibilityRole="button"
              accessibilityState={{ selected: tagSlug === tag.slug }}
            >
              <Text style={[styles.tagChipFilterText, tagSlug === tag.slug && styles.tagChipFilterTextActive]}>
                #{tag.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLawyer ? (
        <Pressable
          style={({ pressed }) => [styles.lawyerPrompt, pressed && { opacity: 0.88 }]}
          onPress={() => router.push("/community/new" as any)}
          accessibilityRole="button"
          accessibilityLabel="Publicar aporte en comunidad"
        >
          <View style={styles.lawyerPromptIcon}>
            <Ionicons name="shield-checkmark" size={16} color={WHITE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lawyerPromptTitle}>Publica una consulta o aporte</Text>
            <Text style={styles.lawyerPromptSub}>Comparte criterio, pregunta o experiencia útil</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEAL + "70"} />
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.newPostBar, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/community/new" as any)}
          accessibilityRole="button"
          accessibilityLabel="Publicar una consulta legal"
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

      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionChip}>
            <Ionicons name="layers-outline" size={12} color={TEXT2} />
            <Text style={styles.sectionChipText}>{viewLabel}</Text>
          </View>
          {(cityFilter || currentTag) && (
            <Text style={styles.sectionSubText} numberOfLines={1}>
              {[cityFilter, currentTag ? `#${currentTag.name}` : null].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
        <Text style={styles.sectionCount}>{posts.length} visibles</Text>
      </View>

    </View>
  );

  const DesktopHeader = (
    <View style={[styles.desktopHeader, { paddingHorizontal: desktopMetrics.gutter, paddingTop: insets.top + 20, paddingBottom: 18 }]}>
      <View style={[styles.desktopShell, { maxWidth: desktopShellWidth }]}>
        <View style={styles.desktopHeroPanel}>
          <View style={styles.desktopHeaderMain}>
            <View style={styles.desktopTitleBlock}>
              <Text style={styles.desktopEyebrow}>{isLawyer ? "Comunidad profesional" : "Comunidad legal"}</Text>
              <Text style={styles.desktopTitle}>Foro general</Text>
              <Text style={styles.desktopSubtitle}>
                {isLawyer
                  ? "Explora todas las consultas de la comunidad, filtra por tema o ciudad y entra al caso correcto sin perder contexto."
                  : "Publica tu consulta, encuentra casos similares y guarda los temas que quieras seguir."}
              </Text>
            </View>

            <Pressable
              style={styles.desktopPrimaryAction}
              onPress={() => router.push("/community/new" as any)}
              accessibilityRole="button"
              accessibilityLabel={isLawyer ? "Publicar aporte en comunidad" : "Publicar caso en comunidad"}
            >
              <Ionicons name="add" size={17} color={WHITE} />
              <Text style={styles.desktopPrimaryActionText}>{isLawyer ? "Publicar aporte" : "Publicar caso"}</Text>
            </Pressable>
          </View>

          <View style={styles.desktopControlSurface}>
            <View style={[styles.searchBox, styles.desktopSearchBox]}>
              <Ionicons name="search-outline" size={17} color={TEXT3} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por tema, ciudad o palabra clave"
                placeholderTextColor={TEXT3}
                value={search}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                accessibilityLabel="Buscar en foro general"
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => { setSearch(""); reload({ search: "" }); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                >
                  <Ionicons name="close-circle" size={18} color={TEXT3} />
                </Pressable>
              )}
            </View>

            <View style={styles.desktopFilterLine}>
              <View style={styles.desktopFilterGroup}>
                <Text style={styles.desktopFilterLabel}>Orden</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.desktopChipRow}>
                {SORT_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.key}
                    style={[styles.sortChip, styles.desktopSortChip, sort === opt.key && styles.sortChipActive]}
                    onPress={() => handleSort(opt.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sort === opt.key }}
                  >
                    <Ionicons name={opt.icon as any} size={13} color={sort === opt.key ? WHITE : TEXT2} />
                    <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
                </ScrollView>
              </View>

              <View style={styles.desktopFilterGroup}>
                <Text style={styles.desktopFilterLabel}>Ubicación</Text>
                <Pressable
                  style={[styles.sortChip, styles.desktopSortChip, cityFilter && styles.sortChipCity]}
                  onPress={() => setCityPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar por ciudad"
                >
                  <Ionicons name="location-outline" size={13} color={cityFilter ? TEAL : TEXT2} />
                  <Text style={[styles.sortText, cityFilter && styles.sortTextCity]}>{cityFilter ?? "Ciudad"}</Text>
                  {cityFilter && (
                    <Pressable onPress={(e) => { e.stopPropagation?.(); handleCitySelect(""); }} hitSlop={8}>
                      <Ionicons name="close-circle" size={13} color={TEAL} />
                    </Pressable>
                  )}
                </Pressable>
              </View>

              {activeFilters > 0 && (
                <Pressable
                  style={[styles.sortChip, styles.desktopSortChip, styles.clearDesktopChip]}
                  onPress={clearFilters}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar filtros"
                >
                  <Ionicons name="close-circle-outline" size={13} color={ROSE} />
                  <Text style={styles.clearDesktopChipText}>Limpiar</Text>
                </Pressable>
              )}
            </View>

            {tags.length > 0 && (
              <View style={styles.desktopTopicBlock}>
                <Text style={styles.desktopFilterLabel}>Temas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.desktopTagRow}>
                  <Pressable
                    style={[styles.tagChipFilter, styles.desktopTagChip, !tagSlug && styles.tagChipFilterActive]}
                    onPress={() => { setTagSlug(undefined); reload({ tagSlug: undefined }); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !tagSlug }}
                  >
                    <Text style={[styles.tagChipFilterText, !tagSlug && styles.tagChipFilterTextActive]}>Todos</Text>
                  </Pressable>
                  {tags.map(tag => (
                  <Pressable
                    key={tag.id}
                    style={[styles.tagChipFilter, styles.desktopTagChip, tagSlug === tag.slug && styles.tagChipFilterActive]}
                    onPress={() => handleTag(tag.slug)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: tagSlug === tag.slug }}
                  >
                    <Text style={[styles.tagChipFilterText, tagSlug === tag.slug && styles.tagChipFilterTextActive]}>#{tag.name}</Text>
                  </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const DesktopAside = (
    <View style={[styles.desktopAside, { width: desktopAsideWidth }]}>
      <View style={styles.desktopAsideCard}>
        <Text style={styles.desktopAsideLabel}>Resumen</Text>
        <View style={styles.desktopAsideMetricRow}>
          <View style={styles.desktopAsideMetric}>
            <Text style={styles.desktopAsideMetricValue}>{posts.length}</Text>
            <Text style={styles.desktopAsideMetricLabel}>consultas</Text>
          </View>
          <View style={styles.desktopAsideMetric}>
            <Text style={styles.desktopAsideMetricValue}>{tags.length}</Text>
            <Text style={styles.desktopAsideMetricLabel}>temas</Text>
          </View>
        </View>
      </View>

      <View style={styles.desktopAsideCard}>
        <Text style={styles.desktopAsideLabel}>Viendo ahora</Text>
        <Text style={styles.desktopAsideValue}>{viewLabel}</Text>
        {!!cityFilter && (
          <View style={styles.desktopAsidePill}>
            <Ionicons name="location-outline" size={12} color={TEAL} />
            <Text style={styles.desktopAsidePillText}>{cityFilter}</Text>
          </View>
        )}
        {!!tagSlug && (
          <View style={styles.desktopAsidePill}>
            <Ionicons name="pricetag-outline" size={12} color={TEAL} />
            <Text style={styles.desktopAsidePillText}>#{currentTag?.name ?? tagSlug}</Text>
          </View>
        )}
        {activeFilters > 0 && (
          <Pressable style={styles.desktopAsideReset} onPress={clearFilters}>
            <Ionicons name="close-outline" size={15} color={ROSE} />
            <Text style={styles.desktopAsideResetText}>Quitar filtros</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.desktopAsideCard}>
        <Text style={styles.desktopAsideLabel}>Accesos rápidos</Text>
        {currentUserId && (
          <Pressable style={styles.desktopAsideAction} onPress={() => router.push(`/community/profile/${currentUserId}` as any)}>
            <Ionicons name="person-outline" size={16} color={TEXT2} />
            <Text style={styles.desktopAsideActionText}>Mi perfil</Text>
          </Pressable>
        )}
        <Pressable style={styles.desktopAsideAction} onPress={() => router.push("/community/bookmarks" as any)}>
          <Ionicons name="bookmark-outline" size={16} color={TEXT2} />
          <Text style={styles.desktopAsideActionText}>Guardados</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: desktopWeb ? 0 : insets.top }]}>
      {desktopWeb ? (
        <>
          {DesktopHeader}
          <View style={[styles.desktopBody, { paddingHorizontal: desktopMetrics.gutter, paddingBottom: desktopMetrics.gutter }]}>
            <View style={[styles.desktopShell, styles.desktopBodyShell, { maxWidth: desktopShellWidth, gap: desktopMetrics.contentGap }]}>
            <View style={styles.desktopFeedColumn}>
              {loading ? (
                <ScrollView
                  contentContainerStyle={styles.desktopLoadingList}
                  showsVerticalScrollIndicator={false}
                >
                  {[0, 1, 2, 3].map(i => <CardSkeleton key={i} />)}
                </ScrollView>
              ) : (
                <FlatList
                  data={posts}
                  keyExtractor={item => item.id}
                  renderItem={({ item, index }) => <PostCard post={item} index={index} isLawyer={isLawyer} />}
                  contentContainerStyle={styles.desktopList}
                  showsVerticalScrollIndicator={false}
                  style={styles.desktopListView}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
                  }
                  onEndReached={onEndReached}
                  onEndReachedThreshold={0.3}
                  ListEmptyComponent={
                    <View style={styles.empty}>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="chatbubbles-outline" size={34} color={TEXT3} />
                      </View>
                      <Text style={styles.emptyTitle}>
                        {activeFilters > 0 ? "Sin resultados" : "Aún no hay consultas"}
                      </Text>
                      <Text style={styles.emptySub}>
                        {activeFilters > 0
                          ? "Prueba limpiando filtros o usando una búsqueda más amplia."
                          : "Las publicaciones aparecerán aquí."}
                      </Text>
                      {activeFilters > 0 && (
                        <Pressable style={styles.emptyBtn} onPress={clearFilters}>
                          <Ionicons name="close-circle-outline" size={16} color={WHITE} />
                          <Text style={styles.emptyBtnText}>Limpiar filtros</Text>
                        </Pressable>
                      )}
                    </View>
                  }
                  ListFooterComponent={
                    loadingMore
                      ? <ActivityIndicator style={{ paddingVertical: 20 }} color={TEAL} />
                      : <View style={{ height: 32 }} />
                  }
                />
              )}
            </View>
            {DesktopAside}
            </View>
          </View>
        </>
      ) : (
        <>

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
            <Text style={styles.navEyebrow}>COMUNIDAD</Text>
            <Text style={styles.navTitle}>Foro general</Text>
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
            renderItem={({ item, index }) => <PostCard post={item} index={index} isLawyer={isLawyer} />}
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
                  {activeFilters > 0 ? "Sin resultados" : "Aún no hay consultas"}
                </Text>
                <Text style={styles.emptySub}>
                  {activeFilters > 0
                    ? "Prueba limpiando filtros o usando una búsqueda más amplia."
                    : "¡Sé el primero en publicar una consulta legal!"}
                </Text>
                {activeFilters > 0 && (
                  <Pressable
                    style={styles.emptyBtn}
                    onPress={clearFilters}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={WHITE} />
                    <Text style={styles.emptyBtnText}>Limpiar filtros</Text>
                  </Pressable>
                )}
                {activeFilters === 0 && !isLawyer && (
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
        </>
      )}

      {desktopWeb && (
        <CityPickerModal
          visible={cityPickerOpen}
          selected={cityFilter ?? null}
          onClose={() => setCityPickerOpen(false)}
          onSelect={handleCitySelect}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  desktopHeader: {
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF0",
  },
  desktopShell: {
    width: "100%",
    alignSelf: "center",
  },
  desktopHeroPanel: {
    gap: 16,
  },
  desktopHeaderMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  desktopTitleBlock: {
    flex: 1,
    maxWidth: 720,
    gap: 8,
  },
  desktopEyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    color: TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  desktopTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: TEXT,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  desktopSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: TEXT2,
    fontFamily: "Inter_400Regular",
    maxWidth: 680,
  },
  desktopPrimaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: TEAL,
    flexShrink: 0,
  },
  desktopPrimaryActionText: {
    fontSize: 13,
    color: WHITE,
    fontFamily: "Inter_700Bold",
  },
  desktopControlSurface: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E4EAF0",
    gap: 12,
    ...shadow.card,
  },
  desktopFilterLine: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  desktopFilterGroup: {
    gap: 6,
    minWidth: 0,
  },
  desktopFilterLabel: {
    fontSize: 11,
    color: TEXT3,
    fontFamily: "Inter_600SemiBold",
  },
  desktopChipRow: {
    gap: 8,
    alignItems: "center",
    paddingRight: 4,
  },
  desktopSortChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  clearDesktopChip: {
    backgroundColor: C.ROSE_LIGHT,
    borderColor: ROSE + "35",
  },
  clearDesktopChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: ROSE,
  },
  desktopSearchBox: {
    marginHorizontal: 0,
    width: "100%",
    maxWidth: "100%",
    minHeight: 50,
    shadowOpacity: 0,
    elevation: 0,
  },
  desktopTagRow: {
    gap: 8,
    paddingRight: 8,
  },
  desktopTopicBlock: {
    gap: 6,
  },
  desktopTagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  desktopBody: {
    flex: 1,
    backgroundColor: BG,
    minHeight: 0,
    paddingTop: 18,
  },
  desktopBodyShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 0,
  },
  desktopFeedColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    maxWidth: 920,
  },
  desktopListView: {
    flex: 1,
    minHeight: 0,
  },
  desktopList: {
    paddingBottom: 32,
  },
  desktopLoadingList: {
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  desktopAside: {
    gap: 12,
  },
  desktopAsideCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E4EAF0",
  },
  desktopAsideLabel: {
    fontSize: 11,
    color: TEXT3,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  desktopAsideValue: {
    fontSize: 16,
    lineHeight: 22,
    color: TEXT,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  desktopAsideMetric: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EAF0",
  },
  desktopAsideMetricValue: {
    fontSize: 20,
    color: TEXT,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideMetricLabel: {
    fontSize: 11,
    color: TEXT3,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  desktopAsidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: TEAL + "12",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  desktopAsidePillText: {
    fontSize: 12,
    color: TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  desktopAsideAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F5F7FA",
  },
  desktopAsideActionText: {
    fontSize: 13,
    color: TEXT2,
    fontFamily: "Inter_600SemiBold",
  },
  desktopAsideActionPrimary: {
    backgroundColor: TEAL,
  },
  desktopAsideActionPrimaryText: {
    fontSize: 13,
    color: WHITE,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideReset: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: C.ROSE_LIGHT,
  },
  desktopAsideResetText: {
    fontSize: 12,
    color: ROSE,
    fontFamily: "Inter_600SemiBold",
  },

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
    fontSize: 10, letterSpacing: 0,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  navTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: 0 },
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
    letterSpacing: 0, lineHeight: 38,
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
  list:       { paddingTop: 4 },
  listHeader: { paddingTop: 14, paddingBottom: 10, gap: 12 },

  forumOverview: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  forumMetric: {
    flex: 1,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E4EAF0",
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  forumMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  forumMetricValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: TEXT,
  },
  forumMetricLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: TEXT3,
  },

  filterBlock: {
    gap: 8,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: TEXT2,
  },
  clearFiltersBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.ROSE_LIGHT,
  },
  clearFiltersText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: ROSE,
  },

  // ── Sort row ──
  sortRow: { paddingHorizontal: 16, gap: 7, flexDirection: "row", alignItems: "center" },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 8,
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
    minHeight: 48,
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
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12, paddingVertical: 6,
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
    justifyContent: "space-between",
    paddingHorizontal: 16, gap: 10,
  },
  sectionTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  sectionChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NAVY + "0C", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 10,
    alignSelf: "flex-start",
  },
  sectionChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionSubText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  sectionCount: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT3 },
  sectionLine:     { flex: 1, height: 1, backgroundColor: "#E8ECF0" },

  // ── Post card ──
  card: {
    backgroundColor: C.WHITE,
    borderRadius: R.card,
    marginHorizontal: S.cardPad,
    marginBottom: S.cardGap,
    padding: S.cardPad,
    paddingLeft: S.cardPad + 3, // space for accent bar
    overflow: "hidden",
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
  cardSideBar: { width: 3 },
  cardInner:   { flex: 1, gap: 8 },

  // ── Badge row ──
  badgeRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  urgentBadge:  {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: ROSE, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: 0 },
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
    color: TEXT, lineHeight: 22, letterSpacing: 0,
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
    minHeight: 34,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 20, backgroundColor: "#F4F6F8",
    borderWidth: 1, borderColor: "#E8ECF0",
  },
  footerPillLiked:   { backgroundColor: ROSE + "0D",  borderColor: ROSE + "30" },
  footerPillReplied: { backgroundColor: TEAL + "0D",  borderColor: TEAL + "25" },
  footerPillText:    { fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT3 },
  bookmarkBtn:       { minWidth: 34, minHeight: 34, alignItems: "center", justifyContent: "center" },
  cardActionBtn: {
    minHeight: 38,
    backgroundColor: C.TEAL,
    borderRadius: R.button,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardActionText: { fontSize: 13, fontWeight: "600", color: C.WHITE },
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
