// app/firm-components/firm-member-history.tsx
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirmMemberHistory,
  type FirmMemberHistory,
} from "@/lib/services/firmInvitationService";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const NAVY     = "#0F2640";
const NAVY_MID = "#243447";
const WHITE    = "#FFFFFF";
const BG       = "#F4F6F8";
const TEXT     = "#1B2B3B";
const TEXT2    = "#6B7B8D";
const TEXT3    = "#9AAABB";
const TEAL     = "#2196A6";
const GREEN    = "#27AE7A";
const AMBER    = "#F5A623";
const RED_S    = "#E05252";
const PURPLE   = "#7B5EA7";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: RED_S },
  { bg: "#EEE8FD", text: PURPLE },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Config por estado ────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  activo:      { label: "Activo",      color: GREEN,  bg: "#E8F8F2", icon: "checkmark-circle-outline" },
  retirado:    { label: "Retirado",    color: RED_S,  bg: "#FDEAEA", icon: "exit-outline"             },
  suspendido:  { label: "Suspendido",  color: AMBER,  bg: "#FEF6E8", icon: "pause-circle-outline"     },
  transferido: { label: "Transferido", color: PURPLE, bg: "#EEE8FD", icon: "swap-horizontal-outline"  },
};

// ─── Card ─────────────────────────────────────────────────────────────────────
function HistoryCard({ item, index }: { item: FirmMemberHistory; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const av = avatarColor(item.nombre || "?");
  const cfg = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.retirado;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/profile/lawyer?id=${item.lawyerProfileId}`)}
      >
        <View style={[styles.accent, { backgroundColor: av.text }]} />

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {item.nombre?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.nombre || "—"}</Text>

          <View style={styles.row}>
            {item.specialization ? (
              <View style={[styles.pill, { backgroundColor: av.bg }]}>
                <Ionicons name="briefcase-outline" size={10} color={av.text} />
                <Text style={[styles.pillText, { color: av.text }]} numberOfLines={1}>
                  {item.specialization}
                </Text>
              </View>
            ) : null}
            <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={10} color={cfg.color} />
              <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Fechas */}
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Ionicons name="log-in-outline" size={11} color={GREEN} />
              <Text style={styles.dateLabel}>Ingreso</Text>
              <Text style={styles.dateValue}>{formatDate(item.fechaIngreso)}</Text>
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateItem}>
              <Ionicons name="log-out-outline" size={11} color={item.fechaSalida ? RED_S : TEXT3} />
              <Text style={styles.dateLabel}>Salida</Text>
              <Text style={[styles.dateValue, { color: item.fechaSalida ? TEXT : TEXT3 }]}>
                {formatDate(item.fechaSalida)}
              </Text>
            </View>
          </View>

          {item.motivoSalida ? (
            <View style={styles.motivoRow}>
              <Ionicons name="information-circle-outline" size={11} color={TEXT3} />
              <Text style={styles.motivoText} numberOfLines={2}>{item.motivoSalida}</Text>
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ marginRight: 12 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Filtro por estado ────────────────────────────────────────────────────────
const FILTERS = [
  { key: "todos",      label: "Todos"      },
  { key: "activo",     label: "Activos"    },
  { key: "retirado",   label: "Retirados"  },
  { key: "transferido",label: "Transferidos"},
  { key: "suspendido", label: "Suspendidos"},
];

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function FirmMemberHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<FirmMemberHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("todos");

  const fetchHistory = useCallback(async () => {
    const result = await getFirmMemberHistory();
    if (result.data) setHistory(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const filtered = filter === "todos" ? history : history.filter((h) => h.estado === filter);

  // Stats
  const total      = history.length;
  const activos    = history.filter((h) => h.estado === "activo").length;
  const retirados  = history.filter((h) => h.estado === "retirado").length;

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Historial de Abogados</Text>
          <Text style={styles.headerSub}>Registro de todos los miembros</Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: GREEN }]}>{activos}</Text>
          <Text style={styles.statLbl}>Activos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: RED_S }]}>{retirados}</Text>
          <Text style={styles.statLbl}>Retirados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: PURPLE }]}>{total - activos - retirados}</Text>
          <Text style={styles.statLbl}>Otros</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>

        {/* Filtros */}
        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item: f }) => {
            const active = filter === f.key;
            return (
              <Pressable
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          }}
          style={styles.filtersList}
        />

        {filtered.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <HistoryCard item={item} index={index} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={36} color={TEXT3} />
              </View>
              <Text style={styles.emptyTitle}>Sin registros</Text>
              <Text style={styles.emptySub}>No hay abogados con este estado</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  centered: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE, marginTop: 2 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", marginTop: 2 },

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

  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: 14, paddingTop: 16,
  },

  filtersList: { flexGrow: 0, marginBottom: 16 },
  filtersContainer: { paddingHorizontal: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: "#E5EAF0",
  },
  filterPillActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  filterTextActive: { color: WHITE },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 10, gap: 10,
  },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine: { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 28 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  accent: { width: 4, alignSelf: "stretch" },

  avatar: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    margin: 12, marginRight: 0,
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },

  info: { flex: 1, gap: 5, paddingVertical: 12, paddingLeft: 12 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },

  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  datesRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  dateItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateSep: { width: 1, height: 10, backgroundColor: "#E5EAF0", marginHorizontal: 4 },
  dateLabel: { fontSize: 10, color: TEXT3, fontFamily: "Inter_400Regular" },
  dateValue: { fontSize: 10, color: TEXT, fontFamily: "Inter_500Medium" },

  motivoRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 2 },
  motivoText: { fontSize: 11, color: TEXT2, fontFamily: "Inter_400Regular", flex: 1 },

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
});
