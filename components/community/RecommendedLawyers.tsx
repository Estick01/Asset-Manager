/**
 * RecommendedLawyers
 * Horizontal carousel shown inside a post detail to help the client
 * find and contact a matching lawyer with one tap.
 *
 * Usage:
 *   <RecommendedLawyers postId={post.id} isOwnPost={isOwnPost} />
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getRecommendedLawyers,
  type RecommendedLawyerDTO,
} from "@/lib/services/recommendationService";
import { startDirectChat, BADGE_META } from "@/lib/services/communityService";

// ─── Tokens ───────────────────────────────────────────────────────────────
const NAVY   = "#0F2640";
const WHITE  = "#FFFFFF";
const TEAL   = "#2196A6";
const GREEN  = "#27AE7A";
const AMBER  = "#F5A623";
const ROSE   = "#E05252";
const TEXT   = "#1B2B3B";
const TEXT2  = "#6B7B8D";
const TEXT3  = "#9AAABB";
const BG     = "#F4F6F8";

const AVATAR_PALETTE = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: ROSE },
  { bg: "#EEE8FD", text: "#7C3AED" },
  { bg: "#FDF0E8", text: "#EA580C" },
];

function avatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}

function Stars({ avg }: { avg: number }) {
  const full  = Math.round(avg);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name="star"
          size={10}
          color={i <= full ? AMBER : "#DDE2E8"}
        />
      ))}
    </View>
  );
}

// ─── Lawyer Card ──────────────────────────────────────────────────────────
function LawyerCard({ lawyer, onContact }: {
  lawyer: RecommendedLawyerDTO;
  onContact: (lawyer: RecommendedLawyerDTO) => void;
}) {
  const [loading, setLoading] = useState(false);
  const av      = avatarColor(lawyer.name);
  const initial = lawyer.name.charAt(0).toUpperCase();

  const handleContact = async () => {
    setLoading(true);
    onContact(lawyer);
  };

  return (
    <View style={styles.card}>
      {/* Score bar at top */}
      <View style={[styles.cardScoreBar, { width: `${lawyer.finalScore}%` as any, backgroundColor: lawyer.isFallback ? AMBER + "60" : TEAL + "50" }]} />

      {/* Fallback badge */}
      {lawyer.isFallback && (
        <View style={styles.fallbackBadge}>
          <Ionicons name="globe-outline" size={8} color={AMBER} />
          <Text style={styles.fallbackBadgeText}>Área diferente</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
        {lawyer.isVerified && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark" size={8} color={WHITE} />
          </View>
        )}
      </View>

      {/* Name + Verified badge */}
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>{lawyer.name}</Text>
        {lawyer.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={9} color={TEAL} />
            <Text style={styles.verifiedText}>Verificado</Text>
          </View>
        )}
      </View>

      {/* Specialization */}
      {lawyer.specialization ? (
        <Text style={styles.spec} numberOfLines={1}>{lawyer.specialization}</Text>
      ) : (
        <Text style={[styles.spec, { color: TEXT3 }]}>Derecho general</Text>
      )}

      {/* Rating */}
      <View style={styles.ratingRow}>
        <Stars avg={lawyer.rating.avg} />
        <Text style={styles.ratingText}>
          {lawyer.rating.avg > 0
            ? `${lawyer.rating.avg.toFixed(1)} (${lawyer.rating.count})`
            : "Sin calif."}
        </Text>
      </View>

      {/* Trust indicators: cases resolved + workload */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="briefcase-outline" size={10} color={TEXT3} />
          <Text style={styles.trustText}>
            {lawyer.rating.count > 0 ? `${lawyer.rating.count} resueltos` : "Nuevo"}
          </Text>
        </View>
        <View style={[styles.trustItem, styles.trustDivider]} />
        <View style={styles.trustItem}>
          <Ionicons
            name="layers-outline"
            size={10}
            color={lawyer.activeCases >= 10 ? ROSE : lawyer.activeCases >= 5 ? AMBER : GREEN}
          />
          <Text style={[
            styles.trustText,
            { color: lawyer.activeCases >= 10 ? ROSE : lawyer.activeCases >= 5 ? AMBER : TEXT3 },
          ]}>
            {lawyer.activeCases === 0 ? "Disponible" : `${lawyer.activeCases} activos`}
          </Text>
        </View>
      </View>

      {/* Badges (max 2) */}
      {lawyer.badges && lawyer.badges.length > 0 && (
        <View style={styles.badgesRow}>
          {lawyer.badges.slice(0, 2).map(key => {
            const b = BADGE_META[key];
            return (
              <View key={key} style={[styles.badgePill, { backgroundColor: b.color + "15" }]}>
                <Ionicons name={b.icon as any} size={9} color={b.color} />
                <Text style={[styles.badgePillText, { color: b.color }]} numberOfLines={1}>{b.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.82 }]}
        onPress={handleContact}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size={14} color={WHITE} />
          : <>
              <Ionicons name="chatbubble-ellipses" size={13} color={WHITE} />
              <Text style={styles.contactBtnText}>Contactar</Text>
            </>
        }
      </Pressable>
    </View>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────
function SkeletonCard() {
  const S = ({ w, h, r = 6 }: { w?: number | string; h: number; r?: number }) => (
    <View style={{ width: w ?? "100%", height: h, borderRadius: r, backgroundColor: "#E8ECF0", opacity: 0.7 }} />
  );
  return (
    <View style={[styles.card, { gap: 8 }]}>
      <S w={44} h={44} r={14} />
      <S w="80%" h={12} />
      <S w="60%" h={10} />
      <S w="50%" h={10} />
      <S h={34} r={10} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
interface Props {
  postId: string;
}

export default function RecommendedLawyers({ postId }: Props) {
  const [lawyers,  setLawyers]  = useState<RecommendedLawyerDTO[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getRecommendedLawyers(postId)
      .then(setLawyers)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleContact = useCallback(async (lawyer: RecommendedLawyerDTO) => {
    const result = await startDirectChat(lawyer.userId);
    if (result?.id) {
      router.push(`/chat/${result.id}` as any);
    }
  }, []);

  const handleContactBest = useCallback(async () => {
    if (!lawyers[0]) return;
    handleContact(lawyers[0]);
  }, [lawyers, handleContact]);

  const allFallback = lawyers.length > 0 && lawyers.every(l => l.isFallback);

  // Empty state — platform has no lawyers yet
  if (!loading && lawyers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="people" size={14} color={WHITE} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Abogados disponibles</Text>
              <Text style={styles.headerSub}>Pueden ayudarte con este caso</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={28} color={TEXT3} />
          <Text style={styles.emptyTitle}>Sin abogados disponibles</Text>
          <Text style={styles.emptySub}>
            Aún no hay abogados registrados para este tipo de caso en tu área.
            Intenta ampliar tu búsqueda o vuelve más tarde.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, allFallback && { backgroundColor: AMBER }]}>
            <Ionicons name={allFallback ? "globe-outline" : "people"} size={14} color={WHITE} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {allFallback ? "Abogados en la plataforma" : "Abogados disponibles"}
            </Text>
            <Text style={styles.headerSub}>
              {allFallback
                ? "Sin match exacto — mostramos los mejor valorados"
                : "Pueden ayudarte con este caso"}
            </Text>
          </View>
        </View>
        {!loading && lawyers.length > 0 && (
          <View style={styles.countChip}>
            <Text style={styles.countText}>{lawyers.length}</Text>
          </View>
        )}
      </View>

      {/* Carousel */}
      {loading ? (
        <FlatList
          horizontal
          data={[0, 1, 2]}
          keyExtractor={String}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          horizontal
          data={lawyers}
          keyExtractor={l => l.lawyerProfileId}
          renderItem={({ item }) => (
            <LawyerCard lawyer={item} onContact={handleContact} />
          )}
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {/* "Contactar al mejor abogado" CTA */}
      {!loading && lawyers.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.bestBtn, pressed && { opacity: 0.88 }]}
          onPress={handleContactBest}
        >
          <View style={styles.bestBtnIcon}>
            <Ionicons name="flash" size={14} color={TEAL} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bestBtnTitle}>Contactar al mejor abogado</Text>
            <Text style={styles.bestBtnSub}>
              {lawyers[0].name} · Score {lawyers[0].finalScore}/100
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={20} color={TEAL + "70"} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: TEAL + "20",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BG,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 1 },
  countChip: {
    backgroundColor: TEAL + "14", paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 11, fontFamily: "Inter_700Bold", color: TEAL },

  // ── List ──
  list: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },

  // ── Card ──
  card: {
    width: 148,
    backgroundColor: BG,
    borderRadius: 16,
    padding: 12,
    gap: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  cardScoreBar: {
    position: "absolute",
    top: 0, left: 0,
    height: 3,
    backgroundColor: TEAL + "50",
    borderTopLeftRadius: 16,
  },

  // ── Avatar ──
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  verifiedDot: {
    position: "absolute", bottom: -1, right: -1,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: WHITE,
  },

  // ── Name ──
  nameRow:       { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  name:          { fontSize: 12, fontFamily: "Inter_700Bold", color: TEXT, flex: 1 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: TEAL + "14", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  verifiedText:  { fontSize: 9, fontFamily: "Inter_600SemiBold", color: TEAL },

  // ── Details ──
  spec:       { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT2 },
  ratingRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { fontSize: 10, fontFamily: "Inter_500Medium", color: TEXT2 },
  trustRow:     { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" },
  trustItem:    { flexDirection: "row", alignItems: "center", gap: 3 },
  trustDivider: { width: 1, height: 8, backgroundColor: "#E0E5EA" },
  trustText:    { fontSize: 9, fontFamily: "Inter_400Regular", color: TEXT3 },

  // ── Badges ──
  badgesRow:     { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 2 },
  badgePill:     { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  badgePillText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  // ── CTA button ──
  contactBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, backgroundColor: NAVY, borderRadius: 10,
    paddingVertical: 9,
  },
  contactBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Best lawyer CTA ──
  bestBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 12, marginBottom: 12,
    backgroundColor: TEAL + "0E",
    borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: TEAL + "28",
  },
  bestBtnIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: TEAL + "18", alignItems: "center", justifyContent: "center",
  },
  bestBtnTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEAL },
  bestBtnSub:   { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 1 },

  // ── Fallback badge on card ──
  fallbackBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: AMBER + "18", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: "flex-start",
  },
  fallbackBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: AMBER },

  // ── Empty state ──
  emptyWrap: {
    alignItems: "center", paddingHorizontal: 20, paddingVertical: 24, gap: 8,
  },
  emptyTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT2 },
  emptySub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, textAlign: "center", lineHeight: 16 },
});
