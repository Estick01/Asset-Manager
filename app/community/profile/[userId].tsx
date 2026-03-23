import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import {
  getUserProfile, getRatings, getCanRate, getRatingSummary,
  type CommunityUserProfile, type RatingDTO, type RatingSummary, type RatingTargetType,
} from "@/lib/services/ratingService";
import {
  getLawyerCommunityStats, BADGE_META,
  type LawyerCommunityStats,
} from "@/lib/services/communityService";
import { getOrCreateConversation } from "@/lib/services/chatService";
import {
  sendClientRequest, getClientRequestStatus,
  type ClientRequestStatus,
} from "@/lib/services/clientRequestService";
import RatingModal from "@/components/community/RatingModal";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const NAVY  = "#0F2640";
const TEAL  = "#2196A6";
const GREEN = "#27AE7A";
const AMBER = "#F5A623";
const RED   = "#E05252";
const WHITE = "#FFFFFF";
const BG    = "#F0F3F6";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";

const AVATAR_PALETTE = [
  { bg: "#DDF0FC", text: "#1A7FA8" },
  { bg: "#D9F5EB", text: "#1D8A62" },
  { bg: "#FEF3D9", text: "#B87A10" },
  { bg: "#FCE0E0", text: "#C03333" },
  { bg: "#EBE0FC", text: "#6340B0" },
  { bg: "#FCE9D9", text: "#B85410" },
];

function avatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}
function rolLabel(role: string) {
  if (role === "abogado") return "Abogado";
  if (role === "bufete")  return "Bufete";
  if (role === "cliente") return "Cliente";
  return role;
}
function rolColor(role: string) {
  if (role === "abogado") return TEAL;
  if (role === "bufete")  return "#7B5EA7";
  return "#C2651A";
}
function scoreColor(n: number) {
  if (n >= 4) return GREEN;
  if (n === 3) return AMBER;
  return RED;
}
function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}
function getTargetType(role: string): RatingTargetType | null {
  if (role === "abogado") return "lawyer";
  if (role === "bufete")  return "firm";
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={AMBER}
        />
      ))}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconBox}>
        <Ionicons name={icon} size={15} color={TEAL} />
      </View>
      <Text style={s.infoText} numberOfLines={2}>{text}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, count }: { icon: any; title: string; count: number }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconBox}>
        <Ionicons name={icon} size={15} color={TEAL} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={s.sectionBadge}>
          <Text style={s.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CommunityProfileScreen() {
  const { userId }         = useLocalSearchParams<{ userId: string }>();
  const { user: authUser } = useAuth();
  const insets             = useSafeAreaInsets();

  const [profile,       setProfile]       = useState<CommunityUserProfile | null>(null);
  const [ratings,       setRatings]       = useState<RatingDTO[]>([]);
  const [summary,       setSummary]       = useState<RatingSummary>({ avg: 0, count: 0 });
  const [canRate,       setCanRate]       = useState(false);
  const [hasRated,      setHasRated]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [ratingModal,   setRatingModal]   = useState(false);
  const [startingChat,  setStartingChat]  = useState(false);
  const [crStatus,      setCrStatus]      = useState<ClientRequestStatus | null>(null);
  const [sendingReq,    setSendingReq]    = useState(false);
  const [communityStats, setCommunityStats] = useState<LawyerCommunityStats | null>(null);

  const load = useCallback(async () => {
    const data = await getUserProfile(userId);
    setProfile(data);
    if (data) {
      const tType      = getTargetType(data.role);
      const viewerRole = authUser?.user?.rol?.nombre as string | undefined;
      const isViewer   = data.user.id !== authUser?.user?.id;
      await Promise.all([
        tType ? (async () => {
          const [ratList, sum, canRateData] = await Promise.all([
            getRatings(userId, tType),
            getRatingSummary(userId, tType),
            authUser ? getCanRate(userId, tType) : Promise.resolve({ canRate: false, hasRated: false }),
          ]);
          setRatings(ratList);
          setSummary(sum);
          setCanRate(canRateData.canRate);
          setHasRated(canRateData.hasRated);
        })() : Promise.resolve(),
        (data.role === "cliente" && isViewer && authUser && (viewerRole === "abogado" || viewerRole === "bufete"))
          ? getClientRequestStatus(userId).then(setCrStatus).catch(() => {})
          : Promise.resolve(),
        data.role === "abogado"
          ? getLawyerCommunityStats(userId).then(setCommunityStats).catch(() => {})
          : Promise.resolve(),
      ]);
    }
    setLoading(false);
  }, [userId, authUser]);

  useEffect(() => { load(); }, [load]);

  const handleSendRequest = useCallback(async () => {
    setSendingReq(true);
    try {
      await sendClientRequest(userId);
      const updated = await getClientRequestStatus(userId);
      setCrStatus(updated);
    } catch { /* silent */ }
    finally { setSendingReq(false); }
  }, [userId]);

  const handleStartChat = useCallback(async () => {
    if (!profile) return;
    setStartingChat(true);
    try {
      const conv = await getOrCreateConversation(userId, "community");
      router.push({ pathname: "/chat/[id]", params: { id: conv.id, name: profile.user.name ?? "Usuario", userId } } as any);
    } catch { /* silent */ }
    finally { setStartingChat(false); }
  }, [profile, userId]);

  const handleRatingSuccess = () => {
    setRatingModal(false);
    setHasRated(true);
    setCanRate(false);
    load();
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </Pressable>
        </View>
        <View style={[s.heroSkeleton, { flex: 1 }]}>
          <View style={s.skeletonAvatar} />
          <View style={s.skeletonLine} />
          <View style={[s.skeletonLine, { width: 80, height: 10 }]} />
        </View>
      </View>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </Pressable>
        </View>
        <View style={s.notFound}>
          <View style={s.notFoundIcon}>
            <Ionicons name="person-outline" size={32} color={TEXT3} />
          </View>
          <Text style={s.notFoundTitle}>Usuario no encontrado</Text>
          <Text style={s.notFoundSub}>Este perfil no existe o fue eliminado</Text>
        </View>
      </View>
    );
  }

  const av           = avatarColor(profile.user.name || "?");
  const targetType   = getTargetType(profile.role);
  const isRatable    = targetType !== null;
  const isOwnProfile = profile.user.id === authUser?.user?.id;
  const viewerRole   = authUser?.user?.rol?.nombre as string | undefined;
  const canSeeClientRequest =
    !isOwnProfile && authUser && profile.role === "cliente" &&
    (viewerRole === "abogado" || viewerRole === "bufete");
  const rc           = rolColor(profile.role);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Fixed top bar ── */}
      <View style={s.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* ─────────── HERO ─────────── */}
        <View style={s.hero}>
          {/* Avatar + decorative rings, all centered in the same wrapper */}
          <View style={s.avatarWrapper}>
            <View style={[s.avatarRing2, { borderColor: rc + "18" }]} />
            <View style={[s.avatarRing1, { borderColor: rc + "30" }]} />
            <View style={[s.avatarCircle, { backgroundColor: av.bg, borderColor: rc + "50" }]}>
              <Text style={[s.avatarInitial, { color: av.text }]}>
                {profile.user.name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={s.heroName} numberOfLines={2}>{profile.user.name || "Sin nombre"}</Text>

          {/* Role pill */}
          <View style={[s.rolePill, { backgroundColor: rc + "25", borderColor: rc + "45" }]}>
            <View style={[s.roleDot, { backgroundColor: rc }]} />
            <Text style={[s.roleLabel, { color: rc }]}>{rolLabel(profile.role)}</Text>
          </View>

          {/* Rating preview */}
          {isRatable && summary.count > 0 && (
            <View style={s.heroRating}>
              <Stars value={summary.avg} size={13} />
              <Text style={s.heroRatingText}>
                {summary.avg.toFixed(1)}{" "}
                <Text style={s.heroRatingCount}>
                  ({summary.count} reseña{summary.count !== 1 ? "s" : ""})
                </Text>
              </Text>
            </View>
          )}
          {isRatable && summary.count === 0 && !isOwnProfile && (
            <Text style={s.heroNoRating}>Sin calificaciones aún</Text>
          )}
        </View>

        {/* ─────────── MAIN CONTAINER ─────────── */}
        <View style={s.mainContainer}>

          {/* ── Stats strip ── */}
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{profile.posts.length}</Text>
              <Text style={s.statLabel}>Post{profile.posts.length !== 1 ? "s" : ""}</Text>
            </View>
            {isRatable && (
              <>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{summary.count}</Text>
                  <Text style={s.statLabel}>Reseñas</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[
                    s.statValue,
                    summary.count > 0 && { color: scoreColor(Math.round(summary.avg)) },
                  ]}>
                    {summary.count > 0 ? summary.avg.toFixed(1) : "—"}
                  </Text>
                  <Text style={s.statLabel}>Promedio</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Community stats + badges (lawyers only) ── */}
          {communityStats && (
            <View style={s.communityCard}>
              <View style={s.communityCardHeader}>
                <View style={s.communityCardIconBox}>
                  <Ionicons name="globe-outline" size={14} color={TEAL} />
                </View>
                <Text style={s.communityCardTitle}>Actividad en comunidad</Text>
              </View>

              {/* Metric row */}
              <View style={s.communityStats}>
                <View style={s.cStatItem}>
                  <Text style={s.cStatValue}>{communityStats.casesTaken}</Text>
                  <Text style={s.cStatLabel}>Casos tomados</Text>
                </View>
                <View style={s.cStatDivider} />
                <View style={s.cStatItem}>
                  <Text style={s.cStatValue}>{communityStats.processesLinked}</Text>
                  <Text style={s.cStatLabel}>Procesos creados</Text>
                </View>
                <View style={s.cStatDivider} />
                <View style={s.cStatItem}>
                  <Text style={[s.cStatValue, communityStats.conversionRate >= 80 ? { color: GREEN } : communityStats.conversionRate >= 50 ? { color: AMBER } : { color: RED }]}>
                    {communityStats.casesTaken > 0 ? `${communityStats.conversionRate}%` : "—"}
                  </Text>
                  <Text style={s.cStatLabel}>Conversión</Text>
                </View>
              </View>

              {/* Badges */}
              {communityStats.badges.length > 0 && (
                <View style={s.badgesWrap}>
                  {communityStats.badges.map(key => {
                    const b = BADGE_META[key];
                    return (
                      <View key={key} style={[s.badge, { borderColor: b.color + "40", backgroundColor: b.color + "12" }]}>
                        <Ionicons name={b.icon as any} size={13} color={b.color} />
                        <Text style={[s.badgeLabel, { color: b.color }]}>{b.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── Lawyer info ── */}
          {profile.lawyerInfo && (
            <View style={s.infoCard}>
              {profile.lawyerInfo.specialization && (
                <InfoRow icon="briefcase-outline" text={profile.lawyerInfo.specialization} />
              )}
              {profile.lawyerInfo.licenseNumber && (
                <InfoRow icon="card-outline" text={`Tarjeta profesional ${profile.lawyerInfo.licenseNumber}`} />
              )}
              {profile.lawyerInfo.firmName && (
                <InfoRow icon="business-outline" text={profile.lawyerInfo.firmName} />
              )}
            </View>
          )}

          {/* ── Firm info ── */}
          {profile.firmInfo && (
            <View style={s.infoCard}>
              <InfoRow icon="document-text-outline" text={`NIT: ${profile.firmInfo.nit}`} />
              {profile.firmInfo.address && <InfoRow icon="location-outline" text={profile.firmInfo.address} />}
              {profile.firmInfo.phone && <InfoRow icon="call-outline" text={profile.firmInfo.phone} />}
            </View>
          )}

          {/* ── Client-request button ── */}
          {canSeeClientRequest && (
            <View style={{ marginBottom: 4 }}>
              {crStatus?.isClient ? (
                <Pressable
                  style={({ pressed }) => [s.crBtn, s.crBtnActive, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push(`/(${viewerRole === "bufete" ? "firm" : "lawyer"}-tabs)/clients` as any)}
                >
                  <View style={[s.crBtnIcon, { backgroundColor: GREEN + "20" }]}>
                    <Ionicons name="people" size={16} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.crBtnTitle, { color: GREEN }]}>Ya es tu cliente</Text>
                    <Text style={s.crBtnSub}>Toca para crear un proceso</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={GREEN} />
                </Pressable>
              ) : crStatus?.request?.status === "pending" ? (
                <View style={[s.crBtn, s.crBtnPending]}>
                  <View style={[s.crBtnIcon, { backgroundColor: TEXT3 + "25" }]}>
                    <Ionicons name="time-outline" size={16} color={TEXT2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.crBtnTitle, { color: TEXT }]}>Solicitud enviada</Text>
                    <Text style={s.crBtnSub}>En espera de respuesta</Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    s.crBtn, s.crBtnSend,
                    sendingReq && { opacity: 0.6 },
                    pressed && !sendingReq && { opacity: 0.85 },
                  ]}
                  onPress={handleSendRequest}
                  disabled={sendingReq}
                >
                  <View style={[s.crBtnIcon, { backgroundColor: WHITE + "20" }]}>
                    {sendingReq
                      ? <ActivityIndicator size="small" color={WHITE} />
                      : <Ionicons name="person-add-outline" size={16} color={WHITE} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.crBtnTitle, { color: WHITE }]}>
                      {sendingReq ? "Enviando solicitud..." : "Solicitar como cliente"}
                    </Text>
                    <Text style={[s.crBtnSub, { color: "rgba(255,255,255,0.7)" }]}>
                      Se le notificará al cliente
                    </Text>
                  </View>
                  {!sendingReq && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />}
                </Pressable>
              )}
            </View>
          )}

          {/* ── Action buttons ── */}
          {!isOwnProfile && authUser && (
            <View style={s.actionRow}>
              {/* Chat */}
              <Pressable
                style={({ pressed }) => [
                  s.actionBtn, s.chatBtn,
                  startingChat && { opacity: 0.6 },
                  pressed && !startingChat && { opacity: 0.88 },
                ]}
                onPress={handleStartChat}
                disabled={startingChat}
              >
                {startingChat
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <Ionicons name="chatbubble-ellipses" size={18} color={WHITE} />
                }
                <Text style={[s.actionBtnText, { color: WHITE }]}>
                  {startingChat ? "Abriendo..." : "Enviar mensaje"}
                </Text>
              </Pressable>

              {/* Rate */}
              {isRatable && (
                <Pressable
                  style={({ pressed }) => [
                    s.actionBtn,
                    hasRated        ? s.rateBtnDone
                    : canRate       ? [s.rateBtnReady, pressed && { opacity: 0.88 }]
                    :                 s.rateBtnLocked,
                  ]}
                  onPress={() => canRate && !hasRated && setRatingModal(true)}
                  disabled={!canRate || hasRated}
                >
                  <Ionicons
                    name={hasRated ? "checkmark-circle" : canRate ? "star" : "lock-closed-outline"}
                    size={18}
                    color={hasRated ? GREEN : canRate ? AMBER : TEXT3}
                  />
                  <Text style={[
                    s.actionBtnText,
                    { color: hasRated ? GREEN : canRate ? TEXT : TEXT3 },
                  ]}>
                    {hasRated ? "Ya calificaste" : canRate ? "Calificar" : "Sin proceso"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Reviews ── */}
          {isRatable && ratings.length > 0 && (
            <View style={s.section}>
              <SectionHeader icon="star" title="Reseñas" count={ratings.length} />
              {ratings.map((r) => {
                const sc = scoreColor(r.score);
                return (
                  <View key={r.id} style={s.reviewCard}>
                    {/* Score badge top-right */}
                    <View style={[s.scoreBadge, { backgroundColor: sc + "18" }]}>
                      <Ionicons name="star" size={11} color={sc} />
                      <Text style={[s.scoreBadgeText, { color: sc }]}>{r.score}</Text>
                    </View>

                    <View style={s.reviewTopRow}>
                      <View style={[s.reviewAvatar, { backgroundColor: TEAL + "18" }]}>
                        <Text style={s.reviewAvatarText}>
                          {r.fromUser.name?.[0]?.toUpperCase() ?? "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reviewAuthor}>{r.fromUser.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <Stars value={r.score} size={11} />
                          <Text style={s.reviewDate}>{formatDate(r.createdAt)}</Text>
                        </View>
                      </View>
                    </View>

                    {r.comment ? (
                      <Text style={s.reviewComment}>{r.comment}</Text>
                    ) : (
                      <Text style={s.reviewNoComment}>Sin comentario</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Posts ── */}
          <View style={s.section}>
            <SectionHeader
              icon="document-text-outline"
              title="Publicaciones"
              count={profile.posts.length}
            />
            {profile.posts.length === 0 ? (
              <View style={s.emptyState}>
                <View style={s.emptyIcon}>
                  <Ionicons name="document-text-outline" size={28} color={TEXT3} />
                </View>
                <Text style={s.emptyTitle}>Sin publicaciones</Text>
                <Text style={s.emptySub}>Este usuario no ha publicado nada aún</Text>
              </View>
            ) : (
              profile.posts.map((post) => {
                const hasLawyer = post.clientAccepted === 1 && !!post.takenByLawyerId;
                return (
                <Pressable
                  key={post.id}
                  style={({ pressed }) => [s.postCard, pressed && { opacity: 0.93 }]}
                  onPress={() => router.push(`/community/${post.id}` as any)}
                >
                  {/* Left accent — green when lawyer confirmed */}
                  <View style={[s.postAccent, { backgroundColor: hasLawyer ? GREEN : rc }]} />
                  <View style={s.postBody}>
                    <Text style={s.postTitle} numberOfLines={2}>{post.title}</Text>

                    {/* Lawyer confirmed badge */}
                    {hasLawyer && (
                      <View style={s.lawyerBadge}>
                        <Ionicons name="shield-checkmark" size={11} color={GREEN} />
                        <Text style={s.lawyerBadgeText} numberOfLines={1}>
                          {post.takenByName ?? "Abogado confirmado"}
                        </Text>
                      </View>
                    )}

                    <Text style={s.postSnippet} numberOfLines={2}>{post.content}</Text>
                    <View style={s.postFooter}>
                      <Text style={s.postDate}>{formatDate(post.createdAt)}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {post.commentCount > 0 && (
                          <View style={s.postStat}>
                            <Ionicons name="chatbubble-outline" size={12} color={TEXT3} />
                            <Text style={s.postStatText}>{post.commentCount}</Text>
                          </View>
                        )}
                        <Text style={s.postCta}>Ver más</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
                );
              })
            )}
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Rating Modal */}
      {isRatable && ratingModal && (
        <RatingModal
          visible={ratingModal}
          targetUserId={userId}
          targetType={targetType!}
          targetName={profile.user.name || "este usuario"}
          onClose={() => setRatingModal(false)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 8,
  },

  // Avatar wrapper — fija el tamaño y centra los anillos + círculo
  avatarWrapper: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },

  // Decorative rings — insets explícitos para centrar dentro del wrapper
  avatarRing2: {
    position: "absolute",
    top: 0, left: 0,
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 16,
    opacity: 0.5,
  },
  avatarRing1: {
    position: "absolute",
    top: 7, left: 7,           // (130 - 116) / 2 = 7
    width: 116, height: 116, borderRadius: 58,
    borderWidth: 8,
    opacity: 0.7,
  },

  // Avatar
  avatarCircle: {
    width: 92, height: 92, borderRadius: 46,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3,
  },
  avatarInitial: { fontSize: 36, fontFamily: "Inter_700Bold" },

  // Hero text
  heroName: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    color: WHITE, textAlign: "center",
    lineHeight: 30, marginTop: 4,
  },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  roleDot:  { width: 7, height: 7, borderRadius: 4 },
  roleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  heroRating: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, marginTop: 2,
  },
  heroRatingText:  { fontSize: 14, fontFamily: "Inter_700Bold",    color: WHITE },
  heroRatingCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  heroNoRating:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },

  // Main container
  mainContainer: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },

  // Stats card
  statsCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem:   { flex: 1, alignItems: "center", gap: 3 },
  statValue:  { fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT },
  statLabel:  { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2 },
  statDivider:{ width: 1, height: 36, backgroundColor: "#E8ECF0" },

  // Info card
  infoCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconBox:{
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: TEAL + "14",
    alignItems: "center", justifyContent: "center",
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 18 },

  // Client request button
  crBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 12, borderRadius: 16, padding: 14,
  },
  crBtnSend:   { backgroundColor: NAVY },
  crBtnPending:{ backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E5EA" },
  crBtnActive: { backgroundColor: GREEN + "12", borderWidth: 1, borderColor: GREEN + "35" },
  crBtnIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  crBtnTitle:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT },
  crBtnSub:    { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 1 },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 14,
  },
  chatBtn:        { backgroundColor: TEAL },
  rateBtnReady:   { backgroundColor: WHITE, borderWidth: 1.5, borderColor: NAVY + "30" },
  rateBtnDone:    { backgroundColor: GREEN + "12", borderWidth: 1.5, borderColor: GREEN + "35" },
  rateBtnLocked:  { backgroundColor: "#F4F6F8", borderWidth: 1, borderColor: "#E0E5EA" },
  actionBtnText:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },

  // Sections
  section: { gap: 10, marginTop: 4 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 2,
  },
  sectionIconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: TEAL + "14",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT },
  sectionBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: TEAL + "14", borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },

  // Review cards
  reviewCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  scoreBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeText:  { fontSize: 12, fontFamily: "Inter_700Bold" },
  reviewTopRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar:    {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEAL },
  reviewAuthor:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  reviewDate:      { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  reviewComment:   { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 20 },
  reviewNoComment: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3, fontStyle: "italic" },

  // Post cards
  postCard: {
    backgroundColor: WHITE, borderRadius: 16,
    flexDirection: "row", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  postAccent: { width: 4 },
  postBody:   { flex: 1, padding: 14, gap: 5 },
  postTitle:  { fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 20 },
  postSnippet:{ fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 19 },
  postFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4",
  },
  postDate:     { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  postStat:     { flexDirection: "row", alignItems: "center", gap: 4 },
  postStatText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  postCta:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },
  lawyerBadge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GREEN + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginBottom: 4 },
  lawyerBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: GREEN },

  // Empty state
  emptyState: {
    alignItems: "center", paddingVertical: 32, gap: 6,
    backgroundColor: WHITE, borderRadius: 18,
  },
  emptyIcon:  {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: BG, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  emptySub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3 },

  // Not found
  notFound: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    gap: 8, paddingBottom: 60,
  },
  notFoundIcon:  {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  notFoundTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  notFoundSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2 },

  // Loading skeleton
  heroSkeleton: {
    backgroundColor: NAVY, alignItems: "center",
    justifyContent: "center", gap: 12,
  },
  skeletonAvatar: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skeletonLine: {
    width: 140, height: 14, borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // Community stats card
  communityCard: {
    backgroundColor: WHITE, borderRadius: 16,
    padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  communityCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  communityCardIconBox: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: TEAL + "15", alignItems: "center", justifyContent: "center",
  },
  communityCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  communityStats: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  cStatItem:    { flex: 1, alignItems: "center" },
  cStatValue:   { fontSize: 20, fontFamily: "Inter_700Bold", color: NAVY },
  cStatLabel:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 2, textAlign: "center" },
  cStatDivider: { width: 1, height: 36, backgroundColor: "#E8ECF0" },
  badgesWrap:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  badgeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
