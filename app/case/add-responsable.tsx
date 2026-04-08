import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  Pressable, ActivityIndicator, TextInput, Platform, Modal
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { LawyerProfile } from "@/shared/schema";
import { setResponsableProceso, getAbogadosByFirma, getProcesoLawyers } from "@/lib/services/procesoLawyerService";
import { EnumRol, EnumRolType, UserWithRol } from "@/shared/schema/user.schema";

const DEBOUNCE_MS = 400;

export default function AddAsistenteScreen() {
  const { procesoId } = useLocalSearchParams<{ procesoId: string }>();
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [abogados, setAbogados] = useState<LawyerProfile[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [confirmLawyer, setConfirmLawyer] = useState<LawyerProfile | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lawyerProfile = profile as LawyerProfile;
  const usuario = user?.user as UserWithRol;

  const firmId = useMemo<string | null>(() => {
    switch (usuario?.rol?.nombre as EnumRolType) {
      case EnumRol.BUFETE.nombre: return lawyerProfile?.id ?? null;
      case EnumRol.ABOGADO.nombre: return lawyerProfile?.firmId ?? null;
      default: return null;
    }
  }, [usuario?.rol?.nombre, lawyerProfile?.id, lawyerProfile?.firmId]);

  const fetchAbogados = useCallback(async (q?: string) => {
    if (!firmId) return;
    setLoading(true);
    try {
      const result = await getAbogadosByFirma(firmId, q);
      if (result.error) { toast.error(result.error); return; }
      const all = result.data || [];
      setAbogados(all.filter(a => !assignedIds.has(a.id) && a.id !== lawyerProfile?.id));
    } finally {
      setLoading(false);
    }
  }, [firmId, assignedIds, lawyerProfile?.id]);

  // Initial load: get assigned IDs then fetch abogados
  const loadData = useCallback(async () => {
    if (!firmId) return;
    setLoading(true);
    try {
      const [assignedResult, membersResult] = await Promise.all([
        getProcesoLawyers(procesoId),
        getAbogadosByFirma(firmId),
      ]);
      const ids = new Set<string>(
        (assignedResult.data || []).map(l => l.lawyerId)
      );
      ids.add(lawyerProfile?.id ?? "");
      setAssignedIds(ids);
      const all = membersResult.data || [];
      setAbogados(all.filter(a => !ids.has(a.id)));
    } finally {
      setLoading(false);
    }
  }, [firmId, procesoId, lawyerProfile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced server-side search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = search.trim();
    if (!trimmed) {
      // Reset to unfiltered list
      fetchAbogados(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchAbogados(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = abogados;

  const handleAddAsistente = (lawyer: LawyerProfile) => {
    setConfirmLawyer(lawyer);
  };

  const handleConfirm = async () => {
    if (!confirmLawyer) return;
    setSubmitting(confirmLawyer.id);
    setConfirmLawyer(null);
    const result = await setResponsableProceso(procesoId, confirmLawyer.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`${confirmLawyer.persona?.nombre} asignado como responsable`);
      router.back();
    }
    setSubmitting(null);
  };



  // ─── Sin firma ────────────────────────────────────────────────
  if (!firmId) {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Agregar Responsable</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="business-outline" size={38} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin firma asignada</Text>
          <Text style={styles.emptySubtext}>
            Solo los abogados de una firma pueden agregar responsables a un proceso
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Volver al proceso</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Render card ──────────────────────────────────────────────
  const renderAbogado = ({ item }: { item: LawyerProfile }) => {
    const isSubmitting = submitting === item.id;
    const initials = `${item.persona?.nombre.charAt(0)}${item.persona?.apellido.charAt(0)}`.toUpperCase();

    return (
      <View style={[styles.card, isSubmitting && styles.cardSubmitting]}>
        {/* Barra lateral */}
        <View style={[styles.cardAccent, { backgroundColor: Colors.primary }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardNombre}>{item.persona?.nombre} {item.persona?.apellido}</Text>
              {item.specialization && (
                <View style={styles.infoRow}>
                  <Ionicons name="briefcase-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.infoText}>{item.specialization}</Text>
                </View>
              )}
              {item.licenseNumber && (
                <View style={styles.infoRow}>
                  <Ionicons name="ribbon-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.infoText}>Lic. {item.licenseNumber}</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
                onPress={() => handleAddAsistente(item)}
              >
                <Ionicons name="person-add-outline" size={15} color={Colors.white} />
                <Text style={styles.addBtnText}>Agregar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* ── Header con gradiente ── */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Agregar Responsable</Text>
            {!loading && (
              <Text style={styles.headerSubtitle}>
                {filtered.length} disponible{filtered.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Resumen */}
        {!loading && abogados.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{abogados.length}</Text>
              <Text style={styles.summaryLabel}>En la firma</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.warning }]}>
                {filtered.length}
              </Text>
              <Text style={styles.summaryLabel}>Disponibles</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "rgba(255,255,255,0.6)" }]}>
                {abogados.length - filtered.length}
              </Text>
              <Text style={styles.summaryLabel}>Filtrados</Text>
            </View>
          </View>
        )}
        {/* ── Search ── */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={17} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, especialidad o licencia..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus={!loading}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* ── Contenido ── */}
      </LinearGradient>


      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Buscando abogados disponibles...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons
              name={search ? "search-outline" : "people-outline"}
              size={38}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? "Sin resultados" : "Sin abogados disponibles"}
          </Text>
          <Text style={styles.emptySubtext}>
            {search
              ? "Intenta con otro nombre o especialidad"
              : "Todos los abogados de la firma ya están en este proceso"
            }
          </Text>
          {search && (
            <Pressable style={styles.clearBtn} onPress={() => setSearch("")}>
              <Text style={styles.clearBtnText}>Limpiar búsqueda</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderAbogado}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onRefresh={loadData}
          refreshing={loading}
        />
      )}
      {/* ── Confirm Modal ── */}
      <Modal
        visible={!!confirmLawyer}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLawyer(null)}
      >
        <Pressable style={modalStyles.overlay} onPress={() => setConfirmLawyer(null)}>
          <Pressable style={modalStyles.sheet} onPress={e => e.stopPropagation()}>

            {/* Icon */}
            <View style={modalStyles.iconWrap}>
              <Ionicons name="person-add" size={28} color={Colors.primary} />
            </View>

            <Text style={modalStyles.title}>Confirmar asignación</Text>
            <Text style={modalStyles.subtitle}>
              ¿Agregar a este abogado como responsable en el proceso?
            </Text>

            {/* Lawyer card */}
            {confirmLawyer && (
              <View style={modalStyles.lawyerCard}>
                <View style={modalStyles.lawyerAvatar}>
                  <Text style={modalStyles.lawyerAvatarText}>
                    {confirmLawyer.persona?.nombre.charAt(0)}{confirmLawyer.persona?.apellido.charAt(0)}
                  </Text>
                </View>
                <View style={modalStyles.lawyerInfo}>
                  <Text style={modalStyles.lawyerName}>
                    {confirmLawyer.persona?.nombre} {confirmLawyer.persona?.apellido}
                  </Text>
                  {confirmLawyer.specialization && (
                    <View style={modalStyles.rolBadge}>
                      <Ionicons name="briefcase-outline" size={11} color={Colors.primary} />
                      <Text style={modalStyles.rolBadgeText}>{confirmLawyer.specialization}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={modalStyles.actions}>
              <Pressable
                style={({ pressed }) => [modalStyles.btnCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setConfirmLawyer(null)}
              >
                <Text style={modalStyles.btnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [modalStyles.btnConfirm, pressed && { opacity: 0.85 }]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark" size={16} color={Colors.white} />
                <Text style={modalStyles.btnConfirmText}>Agregar</Text>
              </Pressable>
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </View>

  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },

  // ── Header ──────────────────────────────────────────────────
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
  headerSubtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)", marginTop: 2,
  },

  // ── Summary ──────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // ── Search ──────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}),
  },

  // ── Lista ────────────────────────────────────────────────────
  list: { padding: 16, paddingBottom: 48 },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSubmitting: { opacity: 0.6 },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },

  // Avatar
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary,
  },


  cardInfo: { flex: 1, gap: 3 },
  cardNombre: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },


  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.white },

  emptyIconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptySubtext: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, textAlign: "center", lineHeight: 20,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  clearBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primary + "15", borderRadius: 10,
  },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  backBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: Colors.primary, borderRadius: 12,
  },
  backBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
});

const TEAL  = "#2196A6";
const WHITE = "#FFFFFF";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,20,35,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "#E8F4FD",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },

  title: {
    fontSize: 18, fontFamily: "Inter_700Bold",
    color: TEXT, textAlign: "center",
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: TEXT2, textAlign: "center",
    lineHeight: 20, marginBottom: 8,
  },

  lawyerCard: {
    flexDirection: "row", alignItems: "center",
    width: "100%",
    backgroundColor: "#F4F6F8",
    borderRadius: 14, padding: 14, gap: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: "#E0E7EF",
  },
  lawyerAvatar: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  lawyerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  lawyerInfo: { flex: 1, gap: 4 },
  lawyerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },
  rolBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  rolBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEAL },

  actions: {
    flexDirection: "row", gap: 10,
    width: "100%", marginTop: 4,
  },
  btnCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: "#F4F6F8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E0E7EF",
  },
  btnCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2 },

  btnConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },
});
