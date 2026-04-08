// app/firm-team.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { StyledModal } from "@/components/StyledModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getAbogadosByFirma } from "@/lib/services/procesoLawyerService";
import { getFirmInvitations, removeFromFirm, type FirmInvitation } from "@/lib/services/firmInvitationService";
import { getOrCreateConversation } from "@/lib/services/chatService";
import { type FirmProfile } from "@/shared/schema";
import { LawyerProfileRelations } from "@/shared/schema/lawyer-profile.schema";

// ─── Design tokens alineados con el sistema visual de la app ────────────────
const NAVY_MID = "#243447";
const WHITE = "#FFFFFF";
const BG = "#F4F6F8";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL = "#2196A6";
const GREEN = "#27AE7A";
const AMBER = "#F5A623";
const RED_S = "#E05252";

// Paleta de avatares coherente con los íconos de la app
const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: RED_S },
  { bg: "#EEE8FD", text: "#7B5EA7" },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── Card de miembro ─────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  userId: string;
}

function MemberCard({ item, index, currentUserId, onRemove, onError }: { item: TeamMember; index: number; currentUserId?: string; onRemove: (member: TeamMember) => void; onError: (msg: string) => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const av = avatarColor(item.nombre || "?");
  const showEmail = item.correo?.includes("@");

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: index * 55,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handleMessage = async () => {
    if (!currentUserId || currentUserId === item.userId) {
      onError("No puedes enviarte mensajes a ti mismo");
      return;
    }
    try {
      const conversation = await getOrCreateConversation(item.userId, "firm_lawyer");
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversation.id, name: item.nombre, userId: item.userId },
      });
    } catch {
      onError("No se pudo iniciar la conversación");
    }
  };

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/profile/lawyer?id=${item.id}`)}
      >
        {/* Accent strip */}
        <View style={[styles.cardAccent, { backgroundColor: av.text }]} />

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {item.nombre?.charAt(0)?.toUpperCase() || "?"}
          </Text>
          {/* Status dot on avatar */}
          <View style={[
            styles.avatarDot,
            { backgroundColor: item.activo ? GREEN : TEXT3 }
          ]} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.nombre}</Text>

          <View style={styles.rolRow}>
            <View style={[styles.rolPill, { backgroundColor: av.bg }]}>
              <Ionicons name="briefcase-outline" size={10} color={av.text} />
              <Text style={[styles.cardRol, { color: av.text }]} numberOfLines={1}>
                {item.rol}
              </Text>
            </View>
            <View style={[
              styles.statusPill,
              { backgroundColor: item.activo ? "#E8F8F2" : "#F4F6F8" }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: item.activo ? GREEN : TEXT3 }
              ]} />
              <Text style={[
                styles.statusText,
                { color: item.activo ? GREEN : TEXT3 }
              ]}>
                {item.activo ? "Activo" : "Inactivo"}
              </Text>
            </View>
          </View>

          {showEmail && item.correo && (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={11} color={TEXT3} />
              <Text style={styles.emailText} numberOfLines={1}>{item.correo}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardRight}>
          <Pressable
            style={({ pressed }) => [styles.msgBtn, pressed && { opacity: 0.75 }]}
            onPress={handleMessage}
            hitSlop={6}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={TEAL} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.msgBtn, { backgroundColor: "#EEE8FD" }, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/firm-components/firm-assign-role?lawyerId=${item.id}&nombre=${encodeURIComponent(item.nombre)}` as any)}
            hitSlop={6}
          >
            <Ionicons name="shield-outline" size={18} color="#7B5EA7" />
          </Pressable>
          {currentUserId !== item.userId && (
            <Pressable
              style={({ pressed }) => [styles.msgBtn, { backgroundColor: "#FDEAEA" }, pressed && { opacity: 0.75 }]}
              onPress={() => onRemove(item)}
              hitSlop={6}
            >
              <Ionicons name="person-remove-outline" size={18} color={RED_S} />
            </Pressable>
          )}
          <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ marginTop: 6 }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────
export default function FirmTeamScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [removeModal, setRemoveModal] = useState<{ visible: boolean; member: TeamMember | null }>({ visible: false, member: null });
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });

  const firmId = (user?.profile as FirmProfile)?.id;
  const currentUserId = user?.user?.id;


  const fetchTeamData = useCallback(async () => {
    if (!firmId) { setLoading(false); return; }
    try {
      const [teamResult, invResult] = await Promise.all([
        getAbogadosByFirma(firmId),
        getFirmInvitations(),
      ]);
      if (teamResult.data) {
        setTeamMembers(
          teamResult.data.map((l: LawyerProfileRelations) => ({
            id: l.id,
            nombre: `${l.persona?.nombre || ""} ${l.persona?.apellido || ""}`.trim(),
            correo: l.user?.email || "",
            rol: l.specialization || "Abogado",
            activo: true,
            userId: l.userId,
          }))
        );
      }
      if (invResult.data) {
        setPendingInvitations(
          invResult.data.filter((i: FirmInvitation) => i.status === "pendiente").length
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeamData();
    setRefreshing(false);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setRemoveModal({ visible: true, member });
  };

  const confirmRemoveMember = async () => {
    const member = removeModal.member;
    if (!member) return;
    setRemoveModal({ visible: false, member: null });
    const result = await removeFromFirm(member.id);
    if (!result.error) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const activeCount = teamMembers.filter((m) => m.activo).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy — mismo look que el dashboard ── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Equipo</Text>
        </View>
      </View>

      {/* ── Stats bar — igual a la del dashboard ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{teamMembers.length}</Text>
          <Text style={styles.statLbl}>Abogados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{activeCount}</Text>
          <Text style={styles.statLbl}>Activos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{pendingInvitations}</Text>
          <Text style={styles.statLbl}>Pendientes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{teamMembers.length - activeCount}</Text>
          <Text style={styles.statLbl}>Inactivos</Text>
        </View>
      </View>

      {/* ── Body blanco con border-radius superior ── */}
      <View style={styles.body}>

        {/* Acciones rápidas */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/firm-components/firm-invite-lawyer")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8F8F2" }]}>
              <Ionicons name="person-add-outline" size={20} color={GREEN} />
            </View>
            <Text style={styles.actionText}>Invitar Abogado</Text>
          </Pressable>

          <Pressable
            style={[styles.actionCard, pendingInvitations > 0 && styles.actionCardAlert]}
            onPress={() => router.push("/firm-components/firm-invitations")}
          >
            <View style={[styles.actionIcon, { backgroundColor: pendingInvitations > 0 ? "#FEF6E8" : "#F4F6F8" }]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={pendingInvitations > 0 ? AMBER : TEXT3}
              />
            </View>
            <Text style={styles.actionText}>Invitaciones</Text>
            {pendingInvitations > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingInvitations}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.actionsRow, { marginTop: -8 }]}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/firm-components/firm-broadcast")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8F4FD" }]}>
              <Ionicons name="chatbubbles-outline" size={20} color={TEAL} />
            </View>
            <Text style={styles.actionText}>Enviar Mensaje</Text>
            <Ionicons name="chevron-forward" size={14} color={TEXT3} />
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/firm-components/firm-member-history")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#EEE8FD" }]}>
              <Ionicons name="time-outline" size={20} color="#7B5EA7" />
            </View>
            <Text style={styles.actionText}>Historial</Text>
            <Ionicons name="chevron-forward" size={14} color={TEXT3} />
          </Pressable>
        </View>

        {/* Sección label con línea teal — igual al dashboard */}
        {teamMembers.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Abogados Activos</Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        <FlatList
          data={teamMembers}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
              <MemberCard
                item={item}
                index={index}
                currentUserId={currentUserId}
                onRemove={handleRemoveMember}
                onError={(msg) => setErrorModal({ visible: true, message: msg })}
              />
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
                <Ionicons name="people-outline" size={36} color={TEXT3} />
              </View>
              <Text style={styles.emptyTitle}>Sin miembros</Text>
              <Text style={styles.emptySub}>Invita abogados a tu bufete</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push("/firm-components/firm-invite-lawyer")}
              >
                <Text style={styles.emptyBtnText}>Invitar Abogado</Text>
              </Pressable>
            </View>
          }
        />
      </View>

      <StyledModal
        visible={removeModal.visible}
        onClose={() => setRemoveModal({ visible: false, member: null })}
        title="Retirar del bufete"
        confirmText="Retirar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmRemoveMember}
      >
        <Text style={{ fontSize: 14, color: "#6B7B8D", fontFamily: "Inter_400Regular", lineHeight: 22 }}>
          ¿Estás seguro de que deseas sacar a{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: "#1B2B3B" }}>
            {removeModal.member?.nombre}
          </Text>{" "}
          de tu bufete? Esta acción quedará registrada en el historial.
        </Text>
      </StyledModal>

      <StyledModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, message: "" })}
        title="Aviso"
        hideConfirm
        cancelText="Cerrar"
      >
        <Text style={{ fontSize: 14, color: "#6B7B8D", fontFamily: "Inter_400Regular", lineHeight: 22 }}>
          {errorModal.message}
        </Text>
      </StyledModal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0F2640" },
  centered: { justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    marginTop: 2,
  },
  planBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    backgroundColor: NAVY_MID,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  statLbl: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  // Body
  body: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 14,
    paddingTop: 20,
  },

  // Acciones rápidas
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionCardAlert: {
    borderWidth: 1,
    borderColor: "#FDE8B8",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: TEXT,
  },
  badge: {
    backgroundColor: AMBER,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, color: WHITE, fontFamily: "Inter_700Bold" },

  // Sección
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine: { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  // Lista
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular" },
  emptyBtn: {
    marginTop: 16, backgroundColor: "#0F2640",
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardAccent: { width: 4, alignSelf: "stretch", flexShrink: 0 },

  avatar: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    margin: 12, marginRight: 0,
    position: "relative",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: WHITE,
  },

  cardInfo: { flex: 1, gap: 4, paddingVertical: 12, paddingLeft: 12 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },

  rolRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  rolPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  cardRol: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  emailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  emailText: { fontSize: 11, color: TEXT3, fontFamily: "Inter_400Regular", flex: 1 },

  cardRight: { alignItems: "center", gap: 12, paddingRight: 12 , flexDirection: "row"},
  msgBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#E8F4FD",
    alignItems: "center", justifyContent: "center",
  },
});
