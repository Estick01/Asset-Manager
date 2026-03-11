import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getProcesos } from "@/lib/services/procesoService";
import { ProcesoDTO } from "@/shared/schema";
import { useAuth } from "@/lib/auth-context";

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY     = "#0F2640";
const NAVY_MID = "#243447";
const WHITE    = "#FFFFFF";
const BG       = "#F4F6F8";
const TEXT     = "#1B2B3B";
const TEXT2    = "#6B7B8D";
const TEXT3    = "#9AAABB";
const TEAL     = "#2196A6";
const GREEN    = "#27AE7A";
const RED_S    = "#E05252";
const AMBER    = "#F5A623";
const INFO     = "#3B82F6";

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo:     { label: "Activo",      color: GREEN },
  en_tramite: { label: "En Trámite",  color: AMBER },
  finalizado: { label: "Finalizado",  color: INFO  },
  archivado:  { label: "Archivado",   color: TEXT3 },
};

const FILTERS = ["todos", "activo", "en_tramite", "finalizado", "archivado"] as const;
type FilterKey = typeof FILTERS[number];

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Proceso Card ─────────────────────────────────────────────────────────
function ProcesoCard({ item, index }: { item: ProcesoDTO; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const estadoCodigo = item.estado?.codigo || "archivado";
  const config = ESTADO_CONFIG[estadoCodigo] ?? { label: estadoCodigo, color: TEXT3 };
  const estadoColor = item.estado?.color ?? config.color;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 280,
      delay: Math.min(index * 40, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
      >
        {/* Accent strip */}
        <View style={[styles.cardAccent, { backgroundColor: estadoColor }]} />

        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.radicado} numberOfLines={1}>{item.radicado}</Text>
              {item.tipoProceso?.nombre && (
                <Text style={styles.tipoProceso} numberOfLines={1}>{item.tipoProceso.nombre}</Text>
              )}
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoColor + "1A" }]}>
              <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
              <Text style={[styles.estadoText, { color: estadoColor }]}>
                {item.estado?.nombre ?? config.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={[styles.footerIconWrap, { backgroundColor: TEAL + "15" }]}>
                <Ionicons name="person-outline" size={11} color={TEAL} />
              </View>
              <Text style={styles.footerText} numberOfLines={1}>
                {item.clienteNombre || item.cliente?.nombre || "Sin cliente"}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <View style={[styles.footerIconWrap, { backgroundColor: AMBER + "15" }]}>
                <Ionicons name="business-outline" size={11} color={AMBER} />
              </View>
              <Text style={styles.footerText} numberOfLines={1}>
                {item.juzgado || "—"}
              </Text>
            </View>
          </View>

          {/* Tareas row */}
          {item.tareasConteo && item.tareasConteo.total > 0 && (
            <View style={styles.tareasRow}>
              <Ionicons name="checkmark-circle-outline" size={11} color={TEXT3} />
              <Text style={styles.tareasTotal}>{item.tareasConteo.total} tareas</Text>
              {item.tareasConteo.pendientes > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: AMBER + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: AMBER }]}>{item.tareasConteo.pendientes} pend.</Text>
                </View>
              )}
              {item.tareasConteo.en_progreso > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: TEAL + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: TEAL }]}>{item.tareasConteo.en_progreso} prog.</Text>
                </View>
              )}
              {item.tareasConteo.completadas > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: GREEN + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: GREEN }]}>{item.tareasConteo.completadas} listas</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ marginRight: 4, flexShrink: 0 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function CasesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [procesos,      setProcesos]      = useState<ProcesoDTO[]>([]);
  const [total,         setTotal]         = useState(0);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<FilterKey>("todos");
  const [refreshing,    setRefreshing]    = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [isLoading,     setIsLoading]     = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const isLoadingRef = useRef(false);
  const offsetRef    = useRef(0);
  const LIMIT        = 10;

  const loadProcesos = useCallback(async (reset = false) => {
    if (!user || isLoadingRef.current) return;
    if (!reset && !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const offset = reset ? 0 : offsetRef.current;
      const result = await getProcesos(LIMIT, offset, {
        estadoCodigo: filter !== "todos" ? filter : undefined,
        search: debouncedSearch || undefined,
      });
      const data = result.data as ProcesoDTO[];
      if (reset) {
        setProcesos(data);
        offsetRef.current = data.length;
      } else {
        setProcesos(prev => [...prev, ...data]);
        offsetRef.current += data.length;
      }
      setTotal(result.total);
      setHasMore(offsetRef.current < result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, debouncedSearch, filter, hasMore]);

  useFocusEffect(useCallback(() => {
    if (user && procesos.length === 0) loadProcesos(true);
  }, [user, procesos.length]));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (user) {
      offsetRef.current = 0;
      setHasMore(true);
      loadProcesos(true);
    }
  }, [filter, debouncedSearch, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProcesos(true);
    setRefreshing(false);
  };

  // Stats por estado
  const statCounts = {
    activo:     procesos.filter(p => p.estado?.codigo === "activo").length,
    en_tramite: procesos.filter(p => p.estado?.codigo === "en_tramite").length,
    finalizado: procesos.filter(p => p.estado?.codigo === "finalizado").length,
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Procesos</Text>
          {!isInitialLoad && (
            <Text style={styles.headerSub}>{total} {total === 1 ? "proceso" : "procesos"}</Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/case/new")}
        >
          <Ionicons name="add" size={22} color={WHITE} />
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <Pressable style={styles.statItem} onPress={() => setFilter("activo")}>
          <Text style={[styles.statNum, { color: GREEN }]}>{statCounts.activo}</Text>
          <Text style={styles.statLbl}>Activos</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem} onPress={() => setFilter("en_tramite")}>
          <Text style={[styles.statNum, { color: AMBER }]}>{statCounts.en_tramite}</Text>
          <Text style={styles.statLbl}>En Trámite</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem} onPress={() => setFilter("finalizado")}>
          <Text style={[styles.statNum, { color: INFO }]}>{statCounts.finalizado}</Text>
          <Text style={styles.statLbl}>Finalizados</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem} onPress={() => setFilter("todos")}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </Pressable>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={TEXT3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por radicado, cliente..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map(f => {
              const active = filter === f;
              const config = ESTADO_CONFIG[f];
              const color  = config?.color ?? TEAL;
              return (
                <Pressable
                  key={f}
                  style={[styles.chip, active && { backgroundColor: color + "20", borderColor: color }]}
                  onPress={() => setFilter(f)}
                >
                  {f !== "todos" && (
                    <View style={[styles.chipDot, { backgroundColor: color }]} />
                  )}
                  <Text style={[styles.chipText, active && { color, fontFamily: "Inter_600SemiBold" }]}>
                    {f === "todos" ? "Todos" : config?.label ?? f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Section label */}
        {procesos.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {filter === "todos" ? "Todos los Procesos" : ESTADO_CONFIG[filter]?.label ?? filter}
            </Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* List */}
        {isLoading && isInitialLoad ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <FlatList
            data={procesos}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => <ProcesoCard item={item} index={index} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
            }
            onEndReached={() => { if (!isLoading && hasMore) loadProcesos(false); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoading && !isInitialLoad
                ? <ActivityIndicator size="small" color={TEAL} style={{ paddingVertical: 20 }} />
                : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="folder-open-outline" size={36} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search || filter !== "todos" ? "Sin resultados" : "Sin procesos"}
                </Text>
                <Text style={styles.emptySub}>
                  {search || filter !== "todos"
                    ? "Intenta con otros filtros"
                    : "Crea tu primer proceso para comenzar"}
                </Text>
                {!search && filter === "todos" && (
                  <Pressable style={styles.emptyBtn} onPress={() => router.push("/case/new")}>
                    <Text style={styles.emptyBtnText}>Nuevo Proceso</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: NAVY },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 32, paddingBottom: 32,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, marginTop: 2 },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  statsBar: {
    flexDirection: "row", backgroundColor: NAVY_MID,
    marginHorizontal: 16, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  statLbl:     { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: 14, paddingTop: 16,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 12,
    marginHorizontal: 16, paddingHorizontal: 14, marginBottom: 12, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
  },

  actionCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14,
    marginHorizontal: 16, padding: 14, gap: 12, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  actionIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  actionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT },

  chipsWrap: { borderBottomWidth: 1, borderBottomColor: "#E8ECF0", marginBottom: 4 },
  chips: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1, borderColor: "#E0E5EA",
  },
  chipDot:  { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 10, marginTop: 6, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine:  { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardAccent:  { width: 4, alignSelf: "stretch", flexShrink: 0 },
  cardBody:    { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 10,
  },
  cardTitleGroup: { flex: 1, marginRight: 10 },
  radicado:       { fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 },
  tipoProceso:    { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  estadoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0,
  },
  estadoDot:  { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  divider:    { height: 1, backgroundColor: "#F0F2F4", marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 0 },
  footerIconWrap: {
    width: 20, height: 20, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  footerText:  { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, flexShrink: 1 },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  footerDate:  { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },

  tareasRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, flexWrap: "wrap",
  },
  tareasTotal: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginLeft: 2 },
  tareasPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  tareasPillTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardActions: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 10 },
  chatBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: TEAL + "15",
    alignItems: "center", justifyContent: "center",
  },

  empty:     { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    marginTop: 16, backgroundColor: NAVY,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});