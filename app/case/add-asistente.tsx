import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  Pressable, ActivityIndicator, Alert, TextInput, Platform
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
import { addAsistenteToProceso, getAbogadosDisponibles } from "@/lib/services/procesoLawyerService";
import { EnumRol, UserWithRol } from "@/shared/schema/user.schema";

export default function AddAsistenteScreen() {
  const { procesoId } = useLocalSearchParams<{ procesoId: string }>();
  const { profile, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [abogados, setAbogados] = useState<LawyerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const lawyerProfile = profile as LawyerProfile;
  const usuario = user?.user as UserWithRol;

  const firmId = useMemo<string | null>(() => {
    switch (usuario?.rol?.nombre as EnumRol) {
      case EnumRol.BUFETE: return lawyerProfile?.id ?? null;
      case EnumRol.ABOGADO: return lawyerProfile?.firmId ?? null;
      default: return null;
    }
  }, [usuario?.rol?.nombre, lawyerProfile?.id, lawyerProfile?.firmId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return abogados;
    const q = search.toLowerCase();
    return abogados.filter(a =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.specialization?.toLowerCase().includes(q) ||
      a.licenseNumber?.toLowerCase().includes(q)
    );
  }, [search, abogados]);

  const loadData = useCallback(async () => {
    if (!firmId) return;
    try {
      setLoading(true);
      const result = await getAbogadosDisponibles(procesoId, firmId, lawyerProfile.id);
      if (result.error) { toast.error(result.error); return; }
      setAbogados(result.data || []);
    } finally {
      setLoading(false);
    }
  }, [firmId, procesoId, lawyerProfile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddAsistente = (lawyer: LawyerProfile) => {
    Alert.alert(
      "Confirmar asignación",
      `¿Agregar a ${lawyer.firstName} ${lawyer.lastName} como asistente en este proceso?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Agregar",
          onPress: async () => {
            setSubmitting(lawyer.id);
            const result = await addAsistenteToProceso({ procesoId, lawyerId: lawyer.id });
            if (result.error) {
              toast.error(result.error);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              toast.success(`${lawyer.firstName} agregado como asistente`);
              router.back();
            }
            setSubmitting(null);
          },
        },
      ]
    );
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
              <Text style={styles.headerTitle}>Agregar Asistente</Text>
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
            Solo los abogados de una firma pueden agregar asistentes a un proceso
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
    const initials = `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();

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
              <Text style={styles.cardNombre}>{item.firstName} {item.lastName}</Text>
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
            <Text style={styles.headerTitle}>Agregar Asistente</Text>
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
    marginTop: 12,  // separación del summaryRow
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