// app/firm-invite-lawyer.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, Platform
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import Colors from "@/constants/colors";
import { LawyerProfile } from "@/shared/schema";
import { searchAvailableLawyers, sendInvitation } from "@/lib/services/firmInvitationService";
import { StyledModal } from "@/components/StyledModal";

export default function InviteLawyerScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const [inviteModalLawyer, setInviteModalLawyer] = useState<LawyerProfile | null>(null);

  const handleSearch = useCallback(async (text: string) => {
    setSearch(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const result = await searchAvailableLawyers(text, "");
    if (result.data) setResults(result.data);
    setLoading(false);
  }, []);

  const handleInvite = async () => {
    if (!inviteModalLawyer) return;
    setSubmitting(inviteModalLawyer.id);
    const result = await sendInvitation(inviteModalLawyer.id);
    if (result.error) {
      Toast.show({ type: "error", text1: "Error", text2: result.error });
    } else {
      setInvited(prev => [...prev, inviteModalLawyer.id]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Invitación enviada",
        text2: `${inviteModalLawyer.persona?.nombre} ${inviteModalLawyer.persona?.apellido} recibirá tu invitación`,
      });
    }
    setSubmitting(null);
    setInviteModalLawyer(null);
  };

  const renderLawyer = ({ item }: { item: LawyerProfile }) => {
    const isInvited = invited.includes(item.id);
    const isSubmitting = submitting === item.id;
    const initials = `${item.persona?.nombre?.charAt(0) || ""}${item.persona?.apellido?.charAt(0) || ""}`.toUpperCase();

    return (
      <View style={[styles.card, isInvited && styles.cardInvited]}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: isInvited ? Colors.success + "20" : Colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: isInvited ? Colors.success : Colors.primary }]}>
            {initials}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.nombre}>{item.persona?.nombre} {item.persona?.apellido}</Text>

          {item.specialization && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.especialidad}>{item.specialization}</Text>
            </View>
          )}
          {item.licenseNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.licencia}>Lic. {item.licenseNumber}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={[
              styles.statusPill,
              {
                backgroundColor: item.isIndependent ? Colors.success + "15" : Colors.warning + "15",
                borderColor: item.isIndependent ? Colors.success + "30" : Colors.warning + "30"
              }
            ]}>
              <View style={[styles.statusDot, { backgroundColor: item.isIndependent ? Colors.success : Colors.warning }]} />
              <Text style={[styles.statusText, { color: item.isIndependent ? Colors.success : Colors.warning }]}>
                {item.isIndependent ? "Independiente" : "En otra firma"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action */}
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : isInvited ? (
          <View style={styles.invitedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.invitedText}>Enviada</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed]}
            onPress={() => setInviteModalLawyer(item)}
          >
            <Ionicons name="paper-plane" size={15} color={Colors.white} />
            <Text style={styles.inviteBtnText}>Invitar</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Invitar Abogado</Text>
            <Text style={styles.headerSubtitle}>Busca y agrega abogados a tu firma</Text>
          </View>
          <Pressable onPress={() => router.push("/firm-components/firm-invitations" as any)} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="list-outline" size={22} color={Colors.white} />
          </Pressable>
        </View>

        {/* Barra de búsqueda dentro del header */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, especialidad o licencia..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={handleSearch}
            autoFocus
          />
          {loading
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : search.length > 0 && (
              <Pressable onPress={() => { setSearch(""); setResults([]); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </Pressable>
            )
          }
        </View>
      </LinearGradient>

      {/* Contenido */}
      {search.length < 2 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="search" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Busca abogados disponibles</Text>
          <Text style={styles.emptySubtext}>Escribe al menos 2 caracteres para comenzar</Text>
        </View>
      ) : results.length === 0 && !loading ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="person-outline" size={36} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptySubtext}>Intenta con otro nombre o número de licencia</Text>
        </View>
      ) : (
        <>
          {results.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>{results.length} abogado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}</Text>
            </View>
          )}
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={renderLawyer}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </>
      )}

      {/* Modal de confirmación */}
      <StyledModal
        visible={inviteModalLawyer !== null}
        onClose={() => setInviteModalLawyer(null)}
        title="Enviar Invitación"
        confirmText="Enviar Invitación"
        cancelText="Cancelar"
        onConfirm={handleInvite}
      >
        <View style={styles.modalContent}>
          {/* Avatar con gradiente simulado */}
          <View style={styles.modalAvatarWrapper}>
            <View style={styles.modalAvatar}>
              <Text style={styles.modalAvatarText}>
                {`${inviteModalLawyer?.persona?.nombre?.charAt(0) || ""}${inviteModalLawyer?.persona?.apellido?.charAt(0) || ""}`.toUpperCase()}
              </Text>
            </View>
            <View style={styles.modalAvatarBadge}>
              <Ionicons name="paper-plane" size={12} color={Colors.white} />
            </View>
          </View>

          {/* Nombre */}
          <Text style={styles.modalNombre}>
            {inviteModalLawyer?.persona?.nombre} {inviteModalLawyer?.persona?.apellido}
          </Text>

          {/* Info pills */}
          <View style={styles.modalPills}>
            {inviteModalLawyer?.specialization && (
              <View style={styles.modalPill}>
                <Ionicons name="briefcase-outline" size={12} color={Colors.primary} />
                <Text style={styles.modalPillText}>{inviteModalLawyer.specialization}</Text>
              </View>
            )}
            {inviteModalLawyer?.licenseNumber && (
              <View style={styles.modalPill}>
                <Ionicons name="card-outline" size={12} color={Colors.primary} />
                <Text style={styles.modalPillText}>Lic. {inviteModalLawyer.licenseNumber}</Text>
              </View>
            )}
            <View style={[styles.modalPill, { backgroundColor: Colors.success + "15" }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color={Colors.success} />
              <Text style={[styles.modalPillText, { color: Colors.success }]}>
                {inviteModalLawyer?.isIndependent ? "Independiente" : "En otra firma"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.modalDivider} />

          {/* Mensaje */}
          <View style={styles.modalMessageBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.modalText}>
              Se le enviará una notificación con tu invitación. Podrá aceptarla o rechazarla desde su app.
            </Text>
          </View>
        </View>
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}),
  },

  // Results header
  resultsHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  resultsCount: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textTertiary },

  // List
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInvited: {
    borderWidth: 1,
    borderColor: Colors.success + "30",
    backgroundColor: Colors.success + "05",
  },

  // Avatar
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },

  // Info
  info: { flex: 1, gap: 4 },
  nombre: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  especialidad: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  licencia: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Invite button
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  inviteBtnPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  inviteBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },

  // Invited badge
  invitedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10,
  },
  invitedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.success },

  // Empty state
  emptyIconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", lineHeight: 20 },

  modalEspecialidad: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  // Modal
  modalContent: { alignItems: "center", gap: 10, paddingVertical: 8 },
  modalAvatarWrapper: { position: "relative", marginBottom: 4 },
  modalAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary + "20",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: Colors.primary + "30",
  },
  modalAvatarText: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.primary },
  modalAvatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.white,
  },
  modalNombre: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  modalPills: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  modalPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  modalPillText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.primary },
  modalDivider: { width: "100%", height: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  modalMessageBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.primary + "08",
    borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  modalText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, lineHeight: 19,
  },
});
