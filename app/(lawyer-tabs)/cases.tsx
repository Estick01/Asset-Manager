import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getProcesos, getEstadosProceso } from "@/lib/services/procesoService";
import { ProcesoDTO, type EstadoProceso } from "@/shared/schema";
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

const LIMIT = 10;

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Proceso Card — idéntico al de FirmCasesScreen ────────────────────────
function ProcesoCard({ item, index, pageOffset = 0 }: {
  item: ProcesoDTO;
  index: number;
  pageOffset?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const estadoColor = item.estado?.color ?? TEXT3;

  useEffect(() => {
    const relativeIndex = index - pageOffset;
    Animated.timing(anim, {
      toValue: 1, duration: 300,
      delay: Math.min(relativeIndex * 45, 200),
      useNativeDriver: true,
    }).start();
  }, []);

  const ubicacion = [
    item.clienteMunicipio?.nombre,
    item.clienteDepartamento?.nombre,
  ].filter(Boolean).join(", ");

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
      >
        <View style={[styles.cardAccent, { backgroundColor: estadoColor }]} />

        <View style={styles.cardBody}>

          {/* ── Top: radicado + tipo + estado badge ── */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardRadicado} numberOfLines={1}>{item.radicado}</Text>
              {item.tipoProceso?.nombre && (
                <Text style={styles.cardTipo} numberOfLines={1}>{item.tipoProceso.nombre}</Text>
              )}
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoColor + "1A" }]}>
              <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
              <Text style={[styles.estadoText, { color: estadoColor }]}>
                {item.estado?.nombre ?? "—"}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* ── Footer: cliente, juzgado, responsable ── */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={[styles.footerIconWrap, { backgroundColor: TEAL + "15" }]}>
                <Ionicons
                  name={item.tipoCliente === "empresa" ? "business-outline" : "person-outline"}
                  size={11}
                  color={TEAL}
                />
              </View>
              <Text style={styles.footerText} numberOfLines={1}>
                {item.clienteNombre || "Sin cliente"}
                {item.tipoCliente ? (
                  <Text style={styles.footerTextMuted}> · {item.tipoCliente}</Text>
                ) : null}
              </Text>
            </View>

            <View style={styles.footerItem}>
              <View style={[styles.footerIconWrap, { backgroundColor: AMBER + "15" }]}>
                <Ionicons name="document-text-outline" size={11} color={AMBER} />
              </View>
              <Text style={styles.footerText} numberOfLines={1}>
                {item.juzgado || "—"}
              </Text>
            </View>

            <View style={styles.footerItem}>
              <View style={[styles.footerIconWrap, {
                backgroundColor: (item.responsable ? GREEN : RED_S) + "15"
              }]}>
                <Ionicons
                  name="person-circle-outline"
                  size={11}
                  color={item.responsable ? GREEN : RED_S}
                />
              </View>
              <Text
                style={[styles.footerText, !item.responsable && { color: RED_S }]}
                numberOfLines={1}
              >
                {item.responsable
                  ? `${item.responsable.lawyer?.persona?.nombre} ${item.responsable.lawyer?.persona?.apellido}`
                  : "Sin responsable"}
              </Text>
            </View>
          </View>

          {/* ── Info extra: documento, teléfono, ubicación (solo persona natural) ── */}
          {item.tipoCliente === "natural" && (
            <View style={styles.extraRow}>
              {item.clienteDocumento && (
                <View style={styles.extraItem}>
                  <Ionicons name="card-outline" size={11} color={TEXT3} />
                  <Text style={styles.extraText}>CC {item.clienteDocumento}</Text>
                </View>
              )}
              {item.clienteTelefono && (
                <View style={styles.extraItem}>
                  <Ionicons name="call-outline" size={11} color={TEXT3} />
                  <Text style={styles.extraText}>{item.clienteTelefono}</Text>
                </View>
              )}
              {ubicacion.length > 0 && (
                <View style={styles.extraItem}>
                  <Ionicons name="location-outline" size={11} color={TEXT3} />
                  <Text style={styles.extraText}>{ubicacion}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Representante legal (solo empresa) ── */}
          {item.representanteLegal && (
            <View style={styles.repBox}>
              <Text style={styles.repLabel}>Rep. legal</Text>
              <View style={styles.repRow}>
                <View style={styles.extraItem}>
                  <Ionicons name="person-outline" size={11} color={TEXT3} />
                  <Text style={styles.extraText}>
                    {item.representanteLegal.nombre} {item.representanteLegal.apellido}
                    {item.representanteLegal.cargo
                      ? <Text style={styles.footerTextMuted}> · {item.representanteLegal.cargo}</Text>
                      : null}
                  </Text>
                </View>
                {item.representanteLegal.email && (
                  <View style={styles.extraItem}>
                    <Ionicons name="mail-outline" size={11} color={TEXT3} />
                    <Text style={styles.extraText} numberOfLines={1}>
                      {item.representanteLegal.email}
                    </Text>
                  </View>
                )}
                {item.representanteLegal.telefono && (
                  <View style={styles.extraItem}>
                    <Ionicons name="call-outline" size={11} color={TEXT3} />
                    <Text style={styles.extraText}>{item.representanteLegal.telefono}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Tareas ── */}
          {item.tareasConteo && item.tareasConteo.total > 0 && (
            <View style={styles.tareasRow}>
              <Ionicons name="checkmark-circle-outline" size={11} color={TEXT3} />
              <Text style={styles.tareasTotal}>{item.tareasConteo.total} tareas</Text>
              {item.tareasConteo.pendientes > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: AMBER + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: AMBER }]}>
                    {item.tareasConteo.pendientes} pend.
                  </Text>
                </View>
              )}
              {item.tareasConteo.en_progreso > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: TEAL + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: TEAL }]}>
                    {item.tareasConteo.en_progreso} prog.
                  </Text>
                </View>
              )}
              {item.tareasConteo.completadas > 0 && (
                <View style={[styles.tareasPill, { backgroundColor: GREEN + "20" }]}>
                  <Text style={[styles.tareasPillTxt, { color: GREEN }]}>
                    {item.tareasConteo.completadas} listas
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Fecha creación ── */}
          <Text style={styles.cardFecha}>Creado: {formatDate(item.fechaCreacion)}</Text>

        </View>

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ flexShrink: 0, marginRight: 4 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function CasesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [procesos, setProcesos]         = useState<ProcesoDTO[]>([]);
  const [estados, setEstados]           = useState<EstadoProceso[]>([]);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState("");
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [hasResponsable, setHasResponsable] = useState<boolean | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasMore, setHasMore]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);

  const isLoadingRef = useRef(false);
  const offsetRef    = useRef(0);
  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProcesos = useCallback(async (
    reset = false,
    searchTerm?: string,
    estadoCodigo?: string | null,
    responsableFilter?: boolean | null,
    isMore = false,
  ) => {
    if (!user || isLoadingRef.current) return;
    if (!reset && !isMore && !hasMore) return;

    isLoadingRef.current = true;
    if (isMore) setLoadingMore(true);
    else setIsLoading(true);

    try {
      const offset = reset ? 0 : offsetRef.current;
      const result = await getProcesos(LIMIT, offset, {
        search: searchTerm || undefined,
        estadoCodigo: estadoCodigo || undefined,
        hasResponsable: responsableFilter !== null && responsableFilter !== undefined
          ? responsableFilter
          : undefined,
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
      setLoadingMore(false);
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, hasMore]);

  // Carga inicial
  useFocusEffect(useCallback(() => {
    if (user && procesos.length === 0) {
      getEstadosProceso().then(setEstados).catch(() => {});
      loadProcesos(true, search, selectedEstado, hasResponsable);
    }
  }, [user]));

  const onRefresh = async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    setHasMore(true);
    await loadProcesos(true, search, selectedEstado, hasResponsable);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadProcesos(false, search, selectedEstado, hasResponsable, true);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    offsetRef.current = 0;
    setHasMore(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadProcesos(true, text, selectedEstado, hasResponsable);
    }, 400);
  };

  const handleEstadoFilter = (codigo: string | null) => {
    setSelectedEstado(codigo);
    offsetRef.current = 0;
    setHasMore(true);
    loadProcesos(true, search, codigo, hasResponsable);
  };

  const handleResponsableFilter = (value: boolean | null) => {
    setHasResponsable(value);
    offsetRef.current = 0;
    setHasMore(true);
    loadProcesos(true, search, selectedEstado, value);
  };

  // Stats por estado (igual que firma)
  const statsByEstado = estados.slice(0, 3).map(e => ({
    label: e.nombre,
    count: procesos.filter(p => p.estado?.codigo === e.codigo).length,
    color: e.color ?? TEXT3,
  }));

  if (isInitialLoad && isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

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

      {/* ── Stats bar dinámica (mismo patrón que firma) ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        {statsByEstado.map((s, i) => (
          <React.Fragment key={s.label}>
            <Pressable
              style={styles.statItem}
              onPress={() => handleEstadoFilter(
                selectedEstado === estados[i]?.codigo ? null : estados[i]?.codigo
              )}
            >
              <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </Pressable>
            {i < statsByEstado.length - 1 && <View style={styles.statDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={TEXT3} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Buscar por radicado, cliente..."
            placeholderTextColor={TEXT3}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => handleSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Chips de estado (dinámicos desde API) */}
        {estados.length > 0 && (
          <View style={styles.chipsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable
                style={[styles.chip, selectedEstado === null && styles.chipActive]}
                onPress={() => handleEstadoFilter(null)}
              >
                <Text style={[styles.chipText, selectedEstado === null && styles.chipTextActive]}>
                  Todos
                </Text>
              </Pressable>
              {estados.map(e => {
                const active = selectedEstado === e.codigo;
                return (
                  <Pressable
                    key={e.id}
                    style={[
                      styles.chip,
                      active && { backgroundColor: (e.color ?? TEAL) + "20", borderColor: e.color ?? TEAL },
                    ]}
                    onPress={() => handleEstadoFilter(active ? null : e.codigo)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: e.color ?? TEXT3 }]} />
                    <Text style={[styles.chipText, active && { color: e.color ?? TEAL, fontFamily: "Inter_600SemiBold" }]}>
                      {e.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Chips de responsable */}
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable
              style={[styles.chip, hasResponsable === null && styles.chipActive]}
              onPress={() => handleResponsableFilter(null)}
            >
              <Ionicons name="people-outline" size={14} color={hasResponsable === null ? TEAL : TEXT2} />
              <Text style={[styles.chipText, hasResponsable === null && styles.chipTextActive]}>Todos</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, hasResponsable === true && { backgroundColor: GREEN + "20", borderColor: GREEN }]}
              onPress={() => handleResponsableFilter(hasResponsable === true ? null : true)}
            >
              <Ionicons name="person-outline" size={14} color={hasResponsable === true ? GREEN : TEXT2} />
              <Text style={[styles.chipText, hasResponsable === true && { color: GREEN, fontFamily: "Inter_600SemiBold" }]}>
                Con responsable
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, hasResponsable === false && { backgroundColor: AMBER + "20", borderColor: AMBER }]}
              onPress={() => handleResponsableFilter(hasResponsable === false ? null : false)}
            >
              <Ionicons name="person-add-outline" size={14} color={hasResponsable === false ? AMBER : TEXT2} />
              <Text style={[styles.chipText, hasResponsable === false && { color: AMBER, fontFamily: "Inter_600SemiBold" }]}>
                Sin responsable
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Section label */}
        {procesos.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {selectedEstado
                ? estados.find(e => e.codigo === selectedEstado)?.nombre ?? "Procesos"
                : "Todos los Procesos"}
            </Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* Lista */}
        {isLoading && isInitialLoad ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <>
            <FlatList
              data={procesos}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item, index }) => (
                <ProcesoCard
                  item={item}
                  index={index}
                  pageOffset={procesos.length - (procesos.length % LIMIT || LIMIT)}
                />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={<View style={{ height: 120 }} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="folder-open-outline" size={36} color={TEXT3} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {search || selectedEstado ? "Sin resultados" : "Sin procesos"}
                  </Text>
                  <Text style={styles.emptySub}>
                    {search || selectedEstado
                      ? "Intenta con otros filtros"
                      : "Crea tu primer proceso para comenzar"}
                  </Text>
                  {!search && !selectedEstado && (
                    <Pressable style={styles.emptyBtn} onPress={() => router.push("/case/new")}>
                      <Text style={styles.emptyBtnText}>Nuevo Proceso</Text>
                    </Pressable>
                  )}
                </View>
              }
            />

            {/* Loading more — fuera del FlatList */}
            {loadingMore && (
              <View style={styles.loadingMoreBar}>
                <ActivityIndicator size="small" color={TEAL} />
                <Text style={styles.loadingMoreText}>Cargando más procesos...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: NAVY },
  centered:{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

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
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT },

  chipsWrap: { borderBottomWidth: 1, borderBottomColor: "#E8ECF0", marginBottom: 4 },
  chips:     { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1, borderColor: "#E0E5EA",
  },
  chipActive:     { backgroundColor: TEAL + "12", borderColor: TEAL },
  chipDot:        { width: 6, height: 6, borderRadius: 3 },
  chipText:       { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  chipTextActive: { color: TEAL, fontFamily: "Inter_600SemiBold" },

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 10, marginTop: 6, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine:  { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

  // Card — idéntico a FirmCasesScreen
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardPressed:    { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardAccent:     { width: 4, alignSelf: "stretch", flexShrink: 0 },
  cardBody:       { flex: 1, padding: 14 },
  cardHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTitleGroup: { flex: 1, marginRight: 10 },
  cardRadicado:   { fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 },
  cardTipo:       { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  estadoBadge:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  estadoDot:      { width: 6, height: 6, borderRadius: 3 },
  estadoText:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider:    { height: 1, backgroundColor: "#F0F2F4", marginBottom: 10 },
  cardFooter:     { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  footerItem:     { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 0 },
  footerIconWrap: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  footerText:     { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, flexShrink: 1 },
  footerTextMuted:{ fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },

  extraRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  extraItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  extraText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },

  repBox:  { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  repLabel:{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: TEXT3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  repRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tareasRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
  tareasTotal:  { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginLeft: 2 },
  tareasPill:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tareasPillTxt:{ fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardFecha: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 8 },

  empty:    { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon:{ width: 72, height: 72, borderRadius: 20, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn:   { marginTop: 16, backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  loadingMoreBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
    borderTopWidth: 1, borderTopColor: "#E8ECF0",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 4,
  },
  loadingMoreText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_400Regular" },
});