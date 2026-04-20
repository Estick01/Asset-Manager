/**
 * LawyerMatchFeed
 * Personalised case feed for lawyers/firms.
 * Sections: urgent, recommended, recent
 * Consumed by: app/(lawyer-tabs)/community.tsx, app/(firm-tabs)/community.tsx
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Animated, Modal, TextInput, ActivityIndicator,
  useWindowDimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getLawyerFeed, markPostSeen, type LawyerFeedDTO } from "@/lib/services/matchingService";
import {
  addComment,
  getComments,
  getPost,
  toggleLike,
  type CommentDTO,
  type PostDTO,
} from "@/lib/services/communityService";
import { useGlobalSocket } from "@/lib/global-socket-context";
import { C, CASE_META, formatDate } from "@/constants/community-theme";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Local aliases for compatibility ──────────────────────────────────────
const WHITE  = C.WHITE;
const TEXT2  = C.TEXT2;
const TEXT3  = C.TEXT3;
const TEAL   = C.TEAL;
const ROSE   = C.ROSE;
const S = {
  cardPad: 16,
  cardGap: 10,
  sectionGap: 24,
  headerH: 56,
} as const;
const R = {
  card: 12,
  badge: 6,
  button: 10,
  avatar: 9999,
} as const;
const T = {
  postTitle: { fontSize: 16, fontWeight: "600" as const },
  postContent: { fontSize: 14 },
  meta: { fontSize: 12 },
} as const;
const shadow = {
  card: {
    shadowColor: C.NAVY,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardUrgent: {
    shadowColor: C.ROSE,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

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
function MatchCard({
  post,
  index,
  onOpen,
}: {
  post: PostDTO;
  index: number;
  onOpen: (postId: string) => void;
}) {
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
    onOpen(post.id);
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
              onPress={(e: any) => {
                e.stopPropagation?.();
                handleOpen();
              }}
              accessibilityRole="button"
              accessibilityLabel="Ver caso compatible"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={WHITE} />
              <Text style={styles.respondBtnText}>Ver caso</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ icon, title, count }: { icon: keyof typeof Ionicons.glyphMap; title: string; count: number }) {
  return (
    <View style={styles.feedSectionHeader}>
      <View style={styles.feedSectionIcon}>
        <Ionicons name={icon} size={14} color={C.TEAL} />
      </View>
      <Text style={styles.feedSectionTitle}>{title}</Text>
      <View style={styles.feedSectionLine} />
      <Text style={styles.feedSectionCount}>{count}</Text>
    </View>
  );
}

type ModalReplyTarget = { id: string; name: string } | null;

function countCommentTree(list: CommentDTO[]): number {
  return list.reduce((total, comment) => total + 1 + countCommentTree(comment.replies ?? []), 0);
}

function CaseModalCommentThread({
  comment,
  onReply,
  depth = 0,
}: {
  comment: CommentDTO;
  onReply: (id: string, name: string) => void;
  depth?: number;
}) {
  const authorName = comment.author?.name ?? "Usuario";
  const replies = comment.replies ?? [];

  return (
    <View style={[styles.caseModalComment, depth > 0 && styles.caseModalCommentReply]}>
      <View style={styles.caseModalCommentHead}>
        <View style={styles.caseModalCommentMeta}>
          <Text style={styles.caseModalCommentAuthor}>{authorName}</Text>
          <Text style={styles.caseModalCommentDate}>{formatDate(comment.createdAt)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.caseModalReplyButton, pressed && { opacity: 0.72 }]}
          onPress={() => onReply(comment.id, authorName)}
          accessibilityRole="button"
          accessibilityLabel={`Responder a ${authorName}`}
        >
          <Ionicons name="return-down-forward-outline" size={13} color={TEAL} />
          <Text style={styles.caseModalReplyButtonText}>Responder</Text>
        </Pressable>
      </View>
      <Text style={styles.caseModalCommentText}>{comment.content}</Text>

      {replies.length > 0 && (
        <View style={styles.caseModalReplies}>
          {replies.map(reply => (
            <CaseModalCommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Desktop case modal ───────────────────────────────────────────────────
function DesktopCompatibleCaseModal({
  postId,
  visible,
  onClose,
}: {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [post, setPost] = useState<PostDTO | null>(null);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<ModalReplyTarget>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible || !postId) return;
    let alive = true;
    setLoading(true);
    setPost(null);
    setComments([]);
    setCommentText("");
    setReplyTo(null);

    Promise.all([getPost(postId), getComments(postId)])
      .then(([nextPost, nextComments]) => {
        if (!alive) return;
        setPost(nextPost);
        setComments(nextComments);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [postId, visible]);

  const submitComment = async () => {
    if (!postId) return;
    const text = commentText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const created = await addComment(postId, text, replyTo?.id ?? null);
    if (created) {
      setCommentText("");
      setReplyTo(null);
      setComments(await getComments(postId));
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
    }
    setSubmitting(false);
  };

  const handleReply = (commentId: string, name: string) => {
    setReplyTo({ id: commentId, name });
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const authorName = post?.visibility === "anonymous" ? "Anónimo" : (post?.author?.name ?? "Usuario");
  const caseMeta = post?.caseType ? (CASE_META[post.caseType] ?? null) : null;
  const commentsTotal = countCommentTree(comments);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.caseModalOverlay} onPress={onClose}>
        <Pressable style={styles.caseModalPanel} onPress={(e: any) => e.stopPropagation?.()}>
          <View style={styles.caseModalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.caseModalEyebrow}>Caso compatible</Text>
              <Text style={styles.caseModalTitle} numberOfLines={2}>
                {post?.title ?? "Cargando caso"}
              </Text>
            </View>
            <Pressable
              style={styles.caseModalClose}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar caso"
            >
              <Ionicons name="close" size={22} color={TEXT2} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.caseModalLoading}>
              <ActivityIndicator color={TEAL} />
              <Text style={styles.caseModalLoadingText}>Cargando caso...</Text>
            </View>
          ) : !post ? (
            <View style={styles.caseModalLoading}>
              <Ionicons name="alert-circle-outline" size={28} color={ROSE} />
              <Text style={styles.caseModalLoadingText}>No se pudo cargar el caso.</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.caseModalBody} contentContainerStyle={styles.caseModalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.caseModalMetaRow}>
                  <View style={styles.caseModalAuthor}>
                    <View style={styles.caseModalAvatar}>
                      <Text style={styles.caseModalAvatarText}>{authorName[0]?.toUpperCase() ?? "?"}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.caseModalAuthorName} numberOfLines={1}>{authorName}</Text>
                      <Text style={styles.caseModalDate}>{formatDate(post.createdAt, true)}</Text>
                    </View>
                  </View>
                  {post.city && (
                    <View style={styles.caseModalCity}>
                      <Ionicons name="location-outline" size={14} color={TEXT2} />
                      <Text style={styles.caseModalCityText}>{post.city}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.caseModalBadges}>
                  {post.isUrgent === 1 && (
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
                  {post.tags.map(tag => (
                    <View key={tag.id} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>#{tag.name}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.caseModalPostTitle}>{post.title}</Text>
                <Text style={styles.caseModalPostContent}>{post.content}</Text>

                <View style={styles.caseModalStats}>
                  <View style={styles.caseModalStat}>
                    <Ionicons name="heart-outline" size={15} color={TEXT3} />
                    <Text style={styles.caseModalStatText}>{post.likeCount} me gusta</Text>
                  </View>
                  <View style={styles.caseModalStat}>
                    <Ionicons name="chatbubble-outline" size={15} color={TEXT3} />
                    <Text style={styles.caseModalStatText}>{commentsTotal} comentarios</Text>
                  </View>
                  <View style={styles.caseModalStat}>
                    <Ionicons name="eye-outline" size={15} color={TEXT3} />
                    <Text style={styles.caseModalStatText}>{post.viewCount} vistas</Text>
                  </View>
                </View>

                <View style={styles.caseModalCommentsHeader}>
                  <Text style={styles.caseModalSectionTitle}>Comentarios</Text>
                  <Text style={styles.caseModalSectionCount}>{commentsTotal}</Text>
                </View>

                {comments.length === 0 ? (
                  <View style={styles.caseModalEmptyComments}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={TEXT3} />
                    <Text style={styles.caseModalEmptyText}>Todavía no hay respuestas.</Text>
                  </View>
                ) : (
                  comments.slice(0, 8).map(comment => (
                    <CaseModalCommentThread key={comment.id} comment={comment} onReply={handleReply} />
                  ))
                )}
              </ScrollView>

              <View style={styles.caseModalComposer}>
                {replyTo && (
                  <View style={styles.caseModalReplyBanner}>
                    <View style={styles.caseModalReplyBannerLeft}>
                      <Ionicons name="return-down-forward-outline" size={13} color={TEAL} />
                      <Text style={styles.caseModalReplyBannerText}>
                        Respondiendo a <Text style={styles.caseModalReplyBannerName}>{replyTo.name}</Text>
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setReplyTo(null)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar respuesta"
                    >
                      <Ionicons name="close" size={16} color={TEXT3} />
                    </Pressable>
                  </View>
                )}
                <View style={styles.caseModalComposerRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.caseModalInput}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={replyTo ? `Responder a ${replyTo.name}...` : "Escribe tu respuesta..."}
                  placeholderTextColor={TEXT3}
                  multiline
                />
                <Pressable
                  style={[styles.caseModalSend, (!commentText.trim() || submitting) && styles.caseModalSendDisabled]}
                  onPress={submitComment}
                  disabled={!commentText.trim() || submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar respuesta"
                >
                  {submitting ? <ActivityIndicator size={14} color={WHITE} /> : <Ionicons name="send" size={16} color={WHITE} />}
                </Pressable>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function LawyerMatchFeed() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { lastCaseMatchAt, clearCaseBadge } = useGlobalSocket();
  const desktopWeb = Platform.OS === "web" && isDesktopViewport(width);
  const mobile = !desktopWeb;
  const desktopMetrics = getDesktopMetrics(width);
  const desktopShellWidth = Math.max(1160, width - desktopMetrics.gutter * 2);

  const [feed,       setFeed]       = useState<LawyerFeedDTO>({ urgent: [], recommended: [], recent: [] });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const [desktopCaseModalId, setDesktopCaseModalId] = useState<string | null>(null);

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

  const openCase = useCallback((postId: string) => {
    markPostSeen(postId);
    if (desktopWeb) {
      setDesktopCaseModalId(postId);
      return;
    }
    router.push(`/community/${postId}` as any);
  }, [desktopWeb]);

  const totalCases = feed.urgent.length + feed.recommended.length + feed.recent.length;
  const totalUrgent = feed.urgent.length;
  const totalRecommended = feed.recommended.length;
  const totalRecent = feed.recent.length;

  const renderWorkspaceHeader = () => (
    <View style={styles.workspaceHeaderBlock}>
      <View style={styles.workspaceHeaderMain}>
        <View style={styles.workspaceTitleBlock}>
          <Text style={styles.workspaceEyebrow}>Comunidad profesional</Text>
          <Text style={styles.workspaceTitle}>Casos compatibles</Text>
          <Text style={styles.workspaceSubtitle}>
            Prioriza oportunidades, revisa urgencias y entra al detalle antes de responder.
          </Text>
        </View>
      </View>

      <View style={styles.workspaceBar}>
        <View style={styles.workspaceTopRow}>
          <View style={[styles.summaryStatsRow, mobile && styles.mobileSummaryStatsRow]}>
            <View style={[styles.summaryStatCard, mobile && styles.mobileSummaryStatCard]}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: C.NAVY }]} />
                <Text style={[styles.summaryStatValue, mobile && styles.mobileSummaryStatValue]}>{totalCases}</Text>
              </View>
              <Text style={[styles.summaryStatLabel, mobile && styles.mobileSummaryStatLabel]}>Visibles</Text>
            </View>
            <View style={[styles.summaryStatCard, mobile && styles.mobileSummaryStatCard]}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: C.ROSE }]} />
                <Text style={[styles.summaryStatValue, mobile && styles.mobileSummaryStatValue, { color: C.ROSE }]}>{totalUrgent}</Text>
              </View>
              <Text style={[styles.summaryStatLabel, mobile && styles.mobileSummaryStatLabel]}>Urgentes</Text>
            </View>
            <View style={[styles.summaryStatCard, mobile && styles.mobileSummaryStatCard]}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: C.TEAL }]} />
                <Text style={[styles.summaryStatValue, mobile && styles.mobileSummaryStatValue, { color: C.TEAL }]}>{totalRecommended}</Text>
              </View>
              <Text style={[styles.summaryStatLabel, mobile && styles.mobileSummaryStatLabel]}>Para ti</Text>
            </View>
            <View style={[styles.summaryStatCard, mobile && styles.mobileSummaryStatCard]}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: "#5C7CFA" }]} />
                <Text style={[styles.summaryStatValue, mobile && styles.mobileSummaryStatValue, { color: "#5C7CFA" }]}>{totalRecent}</Text>
              </View>
              <Text style={[styles.summaryStatLabel, mobile && styles.mobileSummaryStatLabel]}>Recientes</Text>
            </View>
          </View>

          <View style={[styles.workspaceActionsRow, desktopWeb && styles.desktopWorkspaceActionsRow]}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => router.push("/community" as any)}
              accessibilityRole="button"
              accessibilityLabel="Ver foro general"
            >
              <Ionicons name="globe-outline" size={17} color={WHITE} />
              <Text style={styles.primaryActionText}>Foro general</Text>
            </Pressable>
            <Pressable
              style={styles.ghostActionBtn}
              onPress={() => router.push("/community/new" as any)}
              accessibilityRole="button"
              accessibilityLabel="Publicar en comunidad"
            >
              <Ionicons name="add" size={17} color={TEXT2} />
              <Text style={styles.ghostActionText}>Publicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: desktopWeb ? 0 : insets.top }]}>
      {desktopWeb ? (
        <View style={styles.branch}>
          <View style={[styles.header, styles.desktopHeader, { paddingHorizontal: desktopMetrics.gutter, paddingTop: insets.top + 18 }]}>
            <View style={[styles.desktopShell, { maxWidth: desktopShellWidth }]}>
              {renderWorkspaceHeader()}
            </View>
          </View>

          <View style={[styles.desktopBody, { paddingHorizontal: desktopMetrics.gutter, gap: desktopMetrics.contentGap, paddingBottom: desktopMetrics.gutter }]}>
            <View style={[styles.desktopShell, styles.desktopBodyShell, { maxWidth: desktopShellWidth }]}>
              <View style={styles.desktopMainColumn}>
                <View style={styles.resultsSurface}>
                  {loading ? (
                    <ScrollView contentContainerStyle={styles.desktopLoadingList} showsVerticalScrollIndicator={false}>
                      {[0, 1, 2, 3].map(i => <MatchCardSkeleton key={i} />)}
                    </ScrollView>
                  ) : totalCases === 0 ? (
                    <View style={styles.empty}>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="shield-checkmark-outline" size={34} color={TEXT3} />
                      </View>
                      <Text style={styles.emptyTitle}>Sin casos asignados aún</Text>
                      <Text style={styles.emptySub}>
                        Los casos compatibles aparecerán aquí cuando entren al sistema.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      contentContainerStyle={styles.desktopScrollContent}
                      showsVerticalScrollIndicator={false}
                      refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
                      }
                    >
                      {feed.urgent.length > 0 && (
                        <>
                          <SectionHeader icon="flash-outline" title="Urgentes" count={feed.urgent.length} />
                          {feed.urgent.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
                        </>
                      )}
                      {feed.recommended.length > 0 && (
                        <>
                          <SectionHeader icon="sparkles-outline" title="Para ti" count={feed.recommended.length} />
                          {feed.recommended.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
                        </>
                      )}
                      {feed.recent.length > 0 && (
                        <>
                          <SectionHeader icon="time-outline" title="Recientes" count={feed.recent.length} />
                          {feed.recent.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
                        </>
                      )}
                      <View style={{ height: 32 }} />
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.branch}>
      <View style={styles.body}>
        <View style={styles.mobileBodyShell}>
        <View style={styles.resultsSurface}>
        {loading ? (
          <ScrollView
            contentContainerStyle={[styles.skeletonList, styles.mobileList]}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => setShowFloatingAdd(event.nativeEvent.contentOffset.y > 220)}
            scrollEventThrottle={16}
          >
            {renderWorkspaceHeader()}
            {[0, 1, 2, 3].map(i => <MatchCardSkeleton key={i} />)}
          </ScrollView>
        ) : totalCases === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.mobileList]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
            }
            onScroll={(event) => setShowFloatingAdd(event.nativeEvent.contentOffset.y > 220)}
            scrollEventThrottle={16}
          >
          {renderWorkspaceHeader()}
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
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.mobileList]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
            }
            onScroll={(event) => setShowFloatingAdd(event.nativeEvent.contentOffset.y > 220)}
            scrollEventThrottle={16}
          >
            {renderWorkspaceHeader()}
            {feed.urgent.length > 0 && (
              <>
                <SectionHeader icon="flash-outline" title="Urgentes" count={feed.urgent.length} />
                {feed.urgent.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
              </>
            )}

            {feed.recommended.length > 0 && (
              <>
                <SectionHeader icon="sparkles-outline" title="Para ti" count={feed.recommended.length} />
                {feed.recommended.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
              </>
            )}

            {feed.recent.length > 0 && (
              <>
                <SectionHeader icon="time-outline" title="Recientes" count={feed.recent.length} />
                {feed.recent.map((post, i) => <MatchCard key={post.id} post={post} index={i} onOpen={openCase} />)}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
        </View>
        </View>
      </View>
      {showFloatingAdd && (
        <Pressable
          style={({ pressed }) => [styles.floatingAddButton, pressed && styles.floatingAddButtonPressed]}
          onPress={() => router.push("/community/new" as any)}
        >
          <Ionicons name="add" size={22} color={WHITE} />
        </Pressable>
      )}
        </View>
      )}
      {desktopWeb && (
        <DesktopCompatibleCaseModal
          visible={!!desktopCaseModalId}
          postId={desktopCaseModalId}
          onClose={() => setDesktopCaseModalId(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG },
  branch: { flex: 1 },
  header: {
    backgroundColor: C.BG,
    paddingBottom: 12,
  },
  workspaceHeaderBlock: {
    width: "100%",
  },
  workspaceHeaderMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  workspaceTitleBlock: {
    flex: 1,
    gap: 4,
  },
  workspaceEyebrow: {
    fontSize: 12,
    color: C.TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  workspaceTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  workspaceSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: C.TEXT2,
    fontFamily: "Inter_400Regular",
    maxWidth: 620,
  },
  workspaceBar: {
    marginTop: 14,
    backgroundColor: C.WHITE,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    ...shadow.card,
  },
  workspaceTopRow: {
    gap: 12,
  },
  desktopWorkspaceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  workspaceActionsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  desktopWorkspaceActionsRow: {
    justifyContent: "flex-start",
  },
  primaryActionBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.TEAL,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryActionText: {
    fontSize: 15,
    color: C.WHITE,
    fontFamily: "Inter_600SemiBold",
  },
  ghostActionBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7EF",
    backgroundColor: C.WHITE,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ghostActionText: {
    fontSize: 13,
    color: C.TEXT2,
    fontFamily: "Inter_600SemiBold",
  },
  summaryStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mobileSummaryStatsRow: {
    gap: 8,
  },
  summaryStatCard: {
    minWidth: 96,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EBF2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  mobileSummaryStatCard: {
    minWidth: 70,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryStatHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryStatValue: {
    fontSize: 18,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  mobileSummaryStatValue: {
    fontSize: 15,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: C.TEXT3,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  mobileSummaryStatLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  desktopHeader: {
    paddingBottom: 10,
  },
  desktopShell: { width: "100%", alignSelf: "center" },
  desktopBody: {
    flex: 1,
    minHeight: 0,
  },
  desktopBodyShell: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "center",
  },
  desktopMainColumn: {
    flex: 1,
    minWidth: 0,
  },
  desktopScrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: S.cardGap,
  },
  desktopLoadingList: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },

  // ── Body ──
  body: { flex: 1, backgroundColor: C.BG, paddingTop: 4 },
  mobileBodyShell: { flex: 1, minHeight: 0 },
  scrollContent:  { paddingHorizontal: S.cardPad, paddingTop: 18, gap: S.cardGap },
  mobileList: { paddingTop: 0, paddingBottom: 100 },
  skeletonList:   { paddingHorizontal: S.cardPad, paddingTop: 18, gap: 12 },
  resultsSurface: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "transparent",
  },
  floatingAddButton: {
    position: "absolute",
    right: 18,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.NAVY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  floatingAddButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },

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
  urgentText:  { fontSize: 9, fontFamily: "Inter_700Bold", color: C.WHITE, letterSpacing: 0 },
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
  cardTitle:   { fontSize: T.postTitle.fontSize, fontWeight: T.postTitle.fontWeight as any, color: C.TEXT, lineHeight: 21, letterSpacing: 0 },
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
    minHeight: 38,
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
  feedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  feedSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.TEAL + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  feedSectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.TEXT,
  },
  feedSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4EBF2",
  },
  feedSectionCount: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.TEXT2,
  },

  // ── Desktop case modal ──
  caseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,38,64,0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  caseModalPanel: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    backgroundColor: C.WHITE,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4EAF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 18,
  },
  caseModalHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
    backgroundColor: C.WHITE,
  },
  caseModalEyebrow: {
    fontSize: 12,
    color: C.TEXT3,
    fontFamily: "Inter_600SemiBold",
  },
  caseModalTitle: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 26,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },
  caseModalLoading: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  caseModalLoadingText: {
    fontSize: 14,
    color: C.TEXT2,
    fontFamily: "Inter_500Medium",
  },
  caseModalBody: {
    maxHeight: 620,
  },
  caseModalContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 14,
  },
  caseModalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  caseModalAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  caseModalAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.TEAL + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  caseModalAvatarText: {
    fontSize: 15,
    color: C.TEAL,
    fontFamily: "Inter_700Bold",
  },
  caseModalAuthorName: {
    fontSize: 14,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalDate: {
    marginTop: 2,
    fontSize: 12,
    color: C.TEXT3,
    fontFamily: "Inter_400Regular",
  },
  caseModalCity: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: 10,
    backgroundColor: "#F4F6F8",
  },
  caseModalCityText: {
    fontSize: 12,
    color: C.TEXT2,
    fontFamily: "Inter_600SemiBold",
  },
  caseModalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  caseModalPostTitle: {
    fontSize: 22,
    lineHeight: 29,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalPostContent: {
    fontSize: 15,
    lineHeight: 24,
    color: C.TEXT2,
    fontFamily: "Inter_400Regular",
  },
  caseModalStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
    flexWrap: "wrap",
  },
  caseModalStat: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: 10,
    backgroundColor: "#F4F6F8",
  },
  caseModalStatText: {
    fontSize: 12,
    color: C.TEXT2,
    fontFamily: "Inter_500Medium",
  },
  caseModalCommentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caseModalSectionTitle: {
    fontSize: 15,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalSectionCount: {
    fontSize: 12,
    color: C.TEXT3,
    fontFamily: "Inter_600SemiBold",
  },
  caseModalEmptyComments: {
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EAF0",
  },
  caseModalEmptyText: {
    fontSize: 13,
    color: C.TEXT3,
    fontFamily: "Inter_500Medium",
  },
  caseModalComment: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EAF0",
    gap: 4,
  },
  caseModalCommentReply: {
    marginLeft: 18,
    backgroundColor: C.WHITE,
    borderColor: "#E8EDF2",
  },
  caseModalCommentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  caseModalCommentMeta: {
    flex: 1,
    minWidth: 0,
  },
  caseModalCommentAuthor: {
    fontSize: 12,
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalCommentDate: {
    marginTop: 1,
    fontSize: 11,
    color: C.TEXT3,
    fontFamily: "Inter_400Regular",
  },
  caseModalCommentText: {
    fontSize: 13,
    lineHeight: 20,
    color: C.TEXT2,
    fontFamily: "Inter_400Regular",
  },
  caseModalReplyButton: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 9,
    backgroundColor: C.TEAL + "10",
  },
  caseModalReplyButtonText: {
    fontSize: 11,
    color: C.TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  caseModalReplies: {
    marginTop: 8,
    gap: 8,
  },
  caseModalComposer: {
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
    backgroundColor: C.WHITE,
  },
  caseModalReplyBanner: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 11,
    backgroundColor: C.TEAL + "10",
  },
  caseModalReplyBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  caseModalReplyBannerText: {
    fontSize: 12,
    color: C.TEXT2,
    fontFamily: "Inter_400Regular",
  },
  caseModalReplyBannerName: {
    color: C.TEXT,
    fontFamily: "Inter_700Bold",
  },
  caseModalComposerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  caseModalInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    backgroundColor: "#F8FAFD",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.TEXT,
    fontFamily: "Inter_400Regular",
  },
  caseModalSend: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.TEAL,
  },
  caseModalSendDisabled: {
    opacity: 0.45,
  },
});
