import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator, ScrollView, Animated,
  Platform, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getProcesos, getEstadosProceso } from "@/lib/services/procesoService";
import { ProcesoDTO, type EstadoProceso } from "@/shared/schema";
import { useAuth } from "@/lib/auth-context";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY = "#0F2640";
const NAVY_MID = "#243447";
const WHITE = "#FFFFFF";
const BG = "#F4F6F8";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL = "#2196A6";
const GREEN = "#27AE7A";
const RED_S = "#E05252";
const AMBER = "#F5A623";

const LIMIT = 10;

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Proceso Card — idéntico al de FirmCasesScreen ────────────────────────
function ProcesoCard({ item, index, pageOffset = 0, desktop = false }: {
  item: ProcesoDTO;
  index: number;
  pageOffset?: number;
  desktop?: boolean;
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
  }, [anim, index, pageOffset]);

  const ubicacion = [
    item.clienteMunicipio?.nombre,
    item.clienteDepartamento?.nombre,
  ].filter(Boolean).join(", ");

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      zIndex: index === 0 ? -1 : 0,
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, desktop && styles.desktopCard, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
      >
        <View style={[styles.cardAccent, { backgroundColor: estadoColor }]} />

        <View style={styles.cardBody}>

          {/* ── Top: radicado + tipo + estado badge ── */}
          <View style={[styles.cardHeader, desktop && styles.desktopCardHeader]}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardRadicado} numberOfLines={1}>{item.radicado}</Text>
              {item.tipoProceso?.nombre && (
                <Text style={styles.cardTipo} numberOfLines={1}>{item.tipoProceso.nombre}</Text>
              )}
            </View>
            <View style={[styles.cardMetaCluster, desktop && styles.desktopCardMetaCluster]}>
              <Text style={[styles.cardFecha, desktop && styles.desktopCardFecha]}>Creado: {formatDate(item.fechaCreacion)}</Text>
              <View style={[styles.estadoBadge, { backgroundColor: estadoColor + "1A" }]}>
                <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
                <Text style={[styles.estadoText, { color: estadoColor }]}>
                  {item.estado?.nombre ?? "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* ── Footer: cliente, juzgado, responsable ── */}
          <View style={[styles.cardFooter, desktop && styles.desktopCardFooter]}>
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
            <View style={[styles.tareasRow, desktop && styles.desktopTareasRow]}>
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
        </View>

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ flexShrink: 0, marginRight: 4 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function CasesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const mobile = !desktop;
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.max(1160, width - metrics.gutter * 2);
  const { user } = useAuth();

  const [procesos, setProcesos] = useState<ProcesoDTO[]>([]);
  const [estados, setEstados] = useState<EstadoProceso[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [hasResponsable, setHasResponsable] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [responsableSelectOpen, setResponsableSelectOpen] = useState(false);
  const [estadoSelectOpen, setEstadoSelectOpen] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);

  const isLoadingRef = useRef(false);
  const offsetRef = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserScrolledRef = useRef(false);

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
      getEstadosProceso().then(setEstados).catch(() => { });
      loadProcesos(true, search, selectedEstado, hasResponsable);
    }
  }, [user, procesos.length, loadProcesos, search, selectedEstado, hasResponsable]));

  const onRefresh = async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    await loadProcesos(true, search, selectedEstado, hasResponsable);
    setRefreshing(false);
  };

  const handleLoadMore = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    if (!hasUserScrolledRef.current) return;
    if (distanceFromEnd > 48) return;
    if (loadingMore || !hasMore) return;
    loadProcesos(false, search, selectedEstado, hasResponsable, true);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadProcesos(true, text, selectedEstado, hasResponsable);
    }, 400);
  };

  const handleEstadoFilter = (codigo: string | null) => {
    setSelectedEstado(codigo);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    loadProcesos(true, search, codigo, hasResponsable);
  };

  const handleResponsableFilter = (value: boolean | null) => {
    setHasResponsable(value);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    loadProcesos(true, search, selectedEstado, value);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedEstado(null);
    setHasResponsable(null);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    loadProcesos(true, "", null, null);
  };

  // Stats por estado (igual que firma)
  const statsByEstado = estados.slice(0, 3).map(e => ({
    label: e.nombre,
    count: procesos.filter(p => p.estado?.codigo === e.codigo).length,
    color: e.color ?? TEXT3,
  }));
  const estadoActual = selectedEstado
    ? estados.find((e) => e.codigo === selectedEstado)?.nombre ?? "Estado"
    : "Estado: Todos";
  const responsableLabel =
    hasResponsable === true
      ? "Con responsable"
      : hasResponsable === false
        ? "Sin responsable"
        : "Responsable: Todos";

  if (isInitialLoad && isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const renderWorkspaceHeader = () => (
    <View style={styles.mobileHeaderBlock}>
      <View style={styles.headerMain}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Procesos</Text>
        </View>
      </View>

      <View style={[styles.workspaceBar, desktop && styles.desktopWorkspaceBar]}>
        <View style={[styles.workspaceTopRow, desktop && styles.desktopWorkspaceTopRow]}>
          {!mobile && (
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push("/case/new")}
            >
              <Ionicons name="add" size={18} color={WHITE} />
              <Text style={styles.primaryActionText}>Nuevo proceso</Text>
            </Pressable>
          )}

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color={TEXT3} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="Buscar por radicado, cliente, responsable..."
              placeholderTextColor={TEXT3}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => handleSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={TEXT3} />
              </Pressable>
            )}
          </View>

          <View style={[styles.summaryStatsRow, mobile && styles.mobileSummaryStatsRow]}>
            {statsByEstado.map((s, i) => (
              <Pressable
                key={s.label}
                style={[
                  styles.summaryStatCard,
                  mobile && styles.mobileSummaryStatCard,
                  selectedEstado === estados[i]?.codigo && styles.summaryStatCardActive,
                ]}
                onPress={() => handleEstadoFilter(selectedEstado === estados[i]?.codigo ? null : estados[i]?.codigo)}
              >
                <View style={styles.summaryStatHead}>
                  <View style={[styles.summaryStatDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.summaryStatValue, mobile && styles.mobileSummaryStatValue, { color: s.color }]}>{s.count}</Text>
                </View>
                <Text style={[styles.summaryStatLabel, mobile && styles.mobileSummaryStatLabel]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.filtersToolbar}>
          <View style={[styles.filtersLeftGroup, mobile && styles.mobileFiltersLeftGroup]}>
            <View style={[styles.selectWrap, mobile && styles.mobileSelectWrap]}>
              <Pressable
                style={[styles.selectChip, mobile && styles.mobileSelectChip, selectedEstado !== null && styles.selectChipActive]}
                onPress={() => setEstadoSelectOpen((prev) => !prev)}
              >
                <Ionicons name="list-outline" size={14} color={selectedEstado !== null ? TEAL : TEXT2} />
                <Text
                  numberOfLines={1}
                  style={[styles.selectChipText, mobile && styles.mobileSelectChipText, selectedEstado !== null && styles.selectChipTextActive]}
                >
                  {estadoActual}
                </Text>
                <Ionicons name={estadoSelectOpen ? "chevron-up" : "chevron-down"} size={14} color={TEXT3} />
              </Pressable>

              {estadoSelectOpen && (
                <View style={[styles.selectMenu, mobile && styles.mobileSelectMenu]}>
                  {[{ id: "all", nombre: "Estado: Todos", codigo: null, color: TEXT2 }, ...estados.map((e) => ({ ...e, nombre: e.nombre, codigo: e.codigo, color: e.color ?? TEXT3 }))].map((option, index, arr) => {
                    const active = selectedEstado === option.codigo;
                    return (
                      <Pressable
                        key={`${option.id}-${option.codigo ?? "all"}`}
                        style={[
                          styles.selectOption,
                          active && styles.selectOptionActive,
                          index === arr.length - 1 && styles.selectOptionLast,
                        ]}
                        onPress={() => {
                          setEstadoSelectOpen(false);
                          handleEstadoFilter(option.codigo);
                        }}
                      >
                        <View style={styles.selectOptionRow}>
                          <View style={[styles.selectOptionDot, { backgroundColor: option.color }]} />
                          <Text style={[styles.selectOptionText, active && styles.selectOptionTextActive]}>
                            {option.nombre}
                          </Text>
                        </View>
                        {active && <Ionicons name="checkmark" size={16} color={TEAL} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={[styles.filterDivider, mobile && styles.mobileFilterDivider]} />

            <View style={[styles.selectWrap, mobile && styles.mobileSelectWrap]}>
              <Pressable
                style={[styles.selectChip, mobile && styles.mobileSelectChip, hasResponsable !== null && styles.selectChipActive]}
                onPress={() => setResponsableSelectOpen((prev) => !prev)}
              >
                <Ionicons
                  name={hasResponsable === false ? "person-add-outline" : "people-outline"}
                  size={14}
                  color={hasResponsable !== null ? TEAL : TEXT2}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.selectChipText, mobile && styles.mobileSelectChipText, hasResponsable !== null && styles.selectChipTextActive]}
                >
                  {responsableLabel}
                </Text>
                <Ionicons name={responsableSelectOpen ? "chevron-up" : "chevron-down"} size={14} color={TEXT3} />
              </Pressable>

              {responsableSelectOpen && (
                <View style={[styles.selectMenu, mobile && styles.mobileSelectMenu]}>
                  {[
                    { label: "Responsable: Todos", value: null, icon: "people-outline" as const, color: TEXT2 },
                    { label: "Con responsable", value: true, icon: "person-outline" as const, color: GREEN },
                    { label: "Sin responsable", value: false, icon: "person-add-outline" as const, color: AMBER },
                  ].map((option, index, arr) => {
                    const active = hasResponsable === option.value;
                    return (
                      <Pressable
                        key={option.label}
                        style={[
                          styles.selectOption,
                          active && styles.selectOptionActive,
                          index === arr.length - 1 && styles.selectOptionLast,
                        ]}
                        onPress={() => {
                          setResponsableSelectOpen(false);
                          handleResponsableFilter(option.value);
                        }}
                      >
                        <View style={styles.selectOptionRow}>
                          <Ionicons name={option.icon} size={16} color={active ? TEAL : option.color} />
                          <Text style={[styles.selectOptionText, active && styles.selectOptionTextActive]}>
                            {option.label}
                          </Text>
                        </View>
                        {active && <Ionicons name="checkmark" size={16} color={TEAL} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {desktop && (
        <View style={[styles.header, styles.desktopHeader, { paddingHorizontal: metrics.gutter }]}>
          <View style={[styles.shell, { maxWidth: shellWidth }]}>
            {renderWorkspaceHeader()}
          </View>
        </View>
      )}

      {/* ── Body ── */}
      <View style={styles.body}>
        <View style={[styles.shell, styles.bodyShell, desktop && styles.desktopBodyShell, desktop && { maxWidth: shellWidth, paddingHorizontal: metrics.gutter }]}>
          <View style={styles.mainColumn}>
            <View style={styles.resultsSurface}>
              {isLoading && isInitialLoad ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={TEAL} />
                </View>
              ) : (
                <>
                  <FlatList
                    data={procesos}
                    style={styles.listView}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item, index }) => (
                      <ProcesoCard
                        item={item}
                        index={index}
                        pageOffset={procesos.length - (procesos.length % LIMIT || LIMIT)}
                        desktop={desktop}
                      />
                    )}
                    contentContainerStyle={[styles.list, mobile && styles.mobileList]}
                    ListHeaderComponent={!desktop ? renderWorkspaceHeader : undefined}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
                    }
                    onScroll={(event) => {
                      const y = event.nativeEvent.contentOffset.y;
                      if (y > 24) {
                        hasUserScrolledRef.current = true;
                      }
                      if (mobile) {
                        setShowFloatingAdd(y > 220);
                        if ((estadoSelectOpen || responsableSelectOpen) && y > 8) {
                          setEstadoSelectOpen(false);
                          setResponsableSelectOpen(false);
                        }
                      }
                    }}
                    scrollEventThrottle={16}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.02}
                    ListFooterComponent={<View style={{ height: 120 }} />}
                    ListEmptyComponent={
                      <View style={styles.empty}>
                        <View style={styles.emptyIllustration}>
                          <View style={styles.emptyIconHalo} />
                          <View style={styles.emptyIcon}>
                            <Ionicons name="folder-open-outline" size={38} color="#7B9FF3" />
                          </View>
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
        </View>
      </View>
      {mobile && showFloatingAdd && (
        <Pressable
          style={({ pressed }) => [styles.floatingAddButton, pressed && styles.floatingAddButtonPressed]}
          onPress={() => router.push("/case/new")}
        >
          <Ionicons name="add" size={22} color={WHITE} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  shell: { width: "100%", alignSelf: "center" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    backgroundColor: BG,
    zIndex: 50,
    overflow: "visible",
  },
  desktopHeader: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerTitleBlock: {
    flex: 1,
    maxWidth: 760,
  },
  headerTitle: { fontSize: 32, fontFamily: "Inter_700Bold", color: TEXT, marginTop: 2 },
  workspaceBar: {
    marginTop: 8,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    zIndex: 60,
    overflow: "visible",
  },
  desktopWorkspaceBar: {
    padding: 16,
  },
  workspaceTopRow: {
    gap: 12,
  },
  desktopWorkspaceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  primaryActionBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryActionText: {
    fontSize: 15,
    color: WHITE,
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
    minWidth: 112,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EBF2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  mobileSummaryStatCard: {
    minWidth: 70,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryStatCardActive: {
    backgroundColor: "#EEF6FF",
    borderColor: "#CFE0FF",
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
    color: TEXT,
    fontFamily: "Inter_700Bold",
  },
  mobileSummaryStatValue: {
    fontSize: 15,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: TEXT3,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  mobileSummaryStatLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  filtersToolbar: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    zIndex: 70,
  },
  filtersLeftGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    zIndex: 30,
    overflow: "visible",
  },
  mobileFiltersLeftGroup: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  filtersActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  filterDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5ECF2",
    alignSelf: "center",
  },
  mobileFilterDivider: {
    display: "none",
  },
  secondaryFilterBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E7EF",
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryFilterText: {
    fontSize: 13,
    color: TEXT2,
    fontFamily: "Inter_600SemiBold",
  },

  body: {
    flex: 1, backgroundColor: BG,
    paddingTop: 4,
  },
  bodyShell: {
    flex: 1,
    minHeight: 0,
  },
  mobileHeaderBlock: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 14,
  },
  desktopBodyShell: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 24,
  },
  mainColumn: { flex: 1, minWidth: 0, maxWidth: 1280, alignSelf: "center", width: "100%" },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    flex: 1,
    minHeight: 54,
    backgroundColor: "#FAFBFD",
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E1E8F0",
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT },

  chips: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1, borderColor: "#E0E5EA",
  },
  chipActive: { backgroundColor: TEAL + "12", borderColor: TEAL },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  chipTextActive: { color: TEAL, fontFamily: "Inter_600SemiBold" },
  selectWrap: {
    position: "relative",
    zIndex: 40,
    flexShrink: 0,
    overflow: "visible",
  },
  mobileSelectWrap: {
    width: "100%",
  },
  selectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E0E5EA",
  },
  mobileSelectChip: {
    width: "100%",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  selectChipActive: {
    backgroundColor: TEAL + "12",
    borderColor: TEAL,
  },
  selectChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: TEXT2,
  },
  mobileSelectChipText: {
    flex: 1,
  },
  selectChipTextActive: {
    color: TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  selectMenu: {
    position: "absolute",
    top: 46,
    left: 0,
    minWidth: 240,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 999,
  },
  mobileSelectMenu: {
    left: 0,
    right: 0,
    minWidth: 0,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  selectOptionActive: {
    backgroundColor: "#F5FAFB",
  },
  selectOptionLast: {
    borderBottomWidth: 0,
  },
  selectOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: TEXT,
  },
  selectOptionTextActive: {
    color: TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  resultsHeader: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    color: TEXT,
    fontFamily: "Inter_700Bold",
  },
  resultsSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: TEXT2,
    fontFamily: "Inter_400Regular",
  },
  resultsSurface: {
    flex: 1,
    minHeight: 0,
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    minHeight: 460,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  listView: {
    flex: 1,
    minHeight: 0,
  },
  list: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  mobileList: { paddingTop: 0, paddingBottom: 112 },
  floatingAddButton: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NAVY,
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

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#EBF0F5",
  },
  desktopCard: {
    borderRadius: 18,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardAccent: { width: 4, alignSelf: "stretch", flexShrink: 0 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  desktopCardHeader: {
    alignItems: "center",
  },
  cardTitleGroup: { flex: 1, marginRight: 10 },
  cardRadicado: { fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 },
  cardTipo: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  cardMetaCluster: {
    alignItems: "flex-end",
    gap: 8,
  },
  desktopCardMetaCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  estadoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: 1, backgroundColor: "#F0F2F4", marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  desktopCardFooter: {
    gap: 12,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 0 },
  footerIconWrap: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, flexShrink: 1 },
  footerTextMuted: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },

  extraRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  extraItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  extraText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },

  repBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  repLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: TEXT3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  repRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tareasRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
  desktopTareasRow: { marginTop: 10 },
  tareasTotal: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginLeft: 2 },
  tareasPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tareasPillTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardFecha: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 8 },
  desktopCardFecha: { marginTop: 0 },

  empty: { alignItems: "center", justifyContent: "center", paddingTop: 72, paddingBottom: 72, gap: 10 },
  emptyIllustration: { width: 180, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyIconHalo: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "#F2F6FF" },
  emptyIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5ECF5" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 360 },
  emptyBtn: { marginTop: 16, backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8 },
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
