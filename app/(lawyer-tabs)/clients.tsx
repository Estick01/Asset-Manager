import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, TextInput, ActivityIndicator,
  ScrollView, Animated,
  Platform, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClientes } from "@/lib/services/clienteService";
import { getOrCreateConversation } from "@/lib/services/chatService";
import { type Cliente } from "@/shared/schema";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Design tokens ─────────────────────────────────────────────────────────
const NAVY = "#0F2640";
const NAVY_MID = "#243447";
const WHITE = "#FFFFFF";
const BG = "#F4F6F8";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL = "#2196A6";
const GREEN = "#27AE7A";
const AMBER = "#F5A623";
const LIMIT = 10;

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#EEE8FD", text: "#7B5EA7" },
  { bg: "#FDEAEA", text: "#E05252" },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(nombre: string, apellido: string): string {
  return ((nombre?.charAt(0) ?? "") + (apellido?.charAt(0) ?? "")).toUpperCase();
}

// ─── Helpers para normalizar cliente natural o empresa ──────────────────────
function getDisplayName(item: Cliente): { nombre: string; apellido: string } {
  if (item.tipo === "natural" && item.natural?.persona) {
    return {
      nombre: item.natural.persona.nombre ?? "",
      apellido: item.natural.persona.apellido ?? "",
    };
  }
  if (item.tipo === "empresa" && item.empresa) {
    return { nombre: item.empresa.razonSocial ?? "", apellido: "" };
  }
  return { nombre: "Sin nombre", apellido: "" };
}

function getDocumento(item: Cliente): string {
  if (item.tipo === "natural" && item.natural?.persona) {
    const tipo = item.natural.persona.tipoDocumento?.nombre ?? "Doc.";
    const doc = item.natural.persona.documento ?? "Sin documento";
    return `${tipo} · ${doc}`;
  }
  if (item.tipo === "empresa" && item.empresa) {
    return `NIT · ${item.empresa.nit ?? "Sin NIT"}`;
  }
  return "Sin documento";
}

function getTelefono(item: Cliente): string | null {
  if (item.tipo === "natural" && item.natural?.persona) {
    return item.natural.persona.telefono ?? null;
  }
  if (item.tipo === "empresa" && item.empresa?.representanteLegal?.persona) {
    return item.empresa.representanteLegal.persona.telefono ?? null;
  }
  return null;
}

function getLocation(item: Cliente): string {
  const persona =
    item.tipo === "natural"
      ? item.natural?.persona
      : item.empresa?.representanteLegal?.persona;

  return [persona?.municipio?.nombre, persona?.departamento?.nombre]
    .filter(Boolean)
    .join(", ");
}

type FilterTab = "todos" | "activos" | "inactivos";

// ─── Client Card ──────────────────────────────────────────────────────────
function ClientCard({ item, index }: { item: Cliente; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  const { nombre, apellido } = getDisplayName(item);
  const av = avatarColor(nombre || "?");
  const documento = getDocumento(item);
  const telefono = getTelefono(item);
  const location = getLocation(item);
  const isEmpresa = item.tipo === "empresa";

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handleChat = async () => {
    if (!item.userId) return;
    try {
      const conv = await getOrCreateConversation(item.userId, "lawyer_client");
      router.push({ pathname: "/chat/[id]", params: { id: conv.id, name: nombre, userId: item.userId } });
    } catch (e) {
      console.error("Error al iniciar chat:", e);
    }
  };

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      zIndex: index === 0 ? -1 : 0,
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/client/[id]", params: { id: item.id } })}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          {isEmpresa ? (
            <Ionicons name="business-outline" size={22} color={av.text} />
          ) : (
            <Text style={[styles.avatarText, { color: av.text }]}>
              {getInitials(nombre, apellido) || "?"}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {nombre}{apellido ? ` ${apellido}` : ""}
            </Text>
            {/* Badge tipo */}
            <View style={[
              styles.tipoBadge,
              isEmpresa ? styles.tipoBadgeEmpresa : styles.tipoBadgeNatural,
            ]}>
              <Text style={[
                styles.tipoBadgeText,
                { color: isEmpresa ? AMBER : TEAL },
              ]}>
                {isEmpresa ? "Empresa" : "Natural"}
              </Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: item.activo ? GREEN : TEXT3 },
            ]} />
          </View>

          <Text style={styles.docText} numberOfLines={1}>
            {documento}
          </Text>

          {/* Sector (solo empresa) */}
          {isEmpresa && item.empresa?.sector ? (
            <View style={[styles.chip, { marginBottom: 2 }]}>
              <Ionicons name="briefcase-outline" size={11} color={TEXT3} />
              <Text style={styles.chipText}>{item.empresa.sector}</Text>
            </View>
          ) : null}

          {/* Representante legal (solo empresa) */}
          {isEmpresa && item.empresa?.representanteLegal?.persona ? (
            <View style={[styles.chip, { marginBottom: 2 }]}>
              <Ionicons name="person-outline" size={11} color={TEXT3} />
              <Text style={styles.chipText} numberOfLines={1}>
                Rep: {item.empresa.representanteLegal.persona.nombre}{" "}
                {item.empresa.representanteLegal.persona.apellido}
              </Text>
            </View>
          ) : null}

          <View style={styles.chipsRow}>
            {telefono ? (
              <View style={styles.chip}>
                <Ionicons name="call-outline" size={11} color={TEXT3} />
                <Text style={styles.chipText}>{telefono}</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.chip}>
                <Ionicons name="location-outline" size={11} color={TEXT3} />
                <Text style={styles.chipText} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>

          {item.user?.email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={11} color={TEXT3} />
              <Text style={styles.emailText} numberOfLines={1}>{item.user.email}</Text>
            </View>
          ) : null}
          {/* ── Procesos Stats ── */}
          {item.procesosStats && item.procesosStats.total > 0 && (
            <View style={styles.procesosSection}>
              <View style={styles.procesosSectionHeader}>
                <Ionicons name="folder-outline" size={11} color={TEXT3} />
                <Text style={styles.procesosSectionLabel}>
                  {item.procesosStats.total} {item.procesosStats.total === 1 ? "proceso" : "procesos"}
                </Text>
              </View>
              <View style={styles.procesosPillsRow}>
                {item.procesosStats.porEstado.map((e: any) => {
                  const estadoColors: Record<string, { bg: string; text: string }> = {
                    activo: { bg: GREEN + "20", text: GREEN },
                    en_tramite: { bg: AMBER + "20", text: AMBER },
                    finalizado: { bg: TEAL + "20", text: TEAL },
                    archivado: { bg: TEXT3 + "30", text: TEXT3 },
                  };
                  const color = estadoColors[e.codigo] ?? { bg: TEXT3 + "20", text: TEXT3 };
                  return (
                    <View key={e.codigo} style={[styles.procesosPill, { backgroundColor: color.bg }]}>
                      <View style={[styles.procesosPillDot, { backgroundColor: color.text }]} />
                      <Text style={[styles.procesosPillText, { color: color.text }]}>
                        {e.nombre} · {e.count}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Chat button */}
        {item.userId && (
          <Pressable
            style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.7 }]}
            onPress={handleChat}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={TEAL} />
          </Pressable>
        )}

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ flexShrink: 0 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function FirmClientsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const mobile = !desktop;
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.max(1160, width - metrics.gutter * 2);
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [filterSelectOpen, setFilterSelectOpen] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  const fetchClientes = useCallback(async (searchTerm?: string, reset = false, isMore = false) => {
    if (isLoadingRef.current) return;
    if (!reset && !isMore && !hasMore) return;

    isLoadingRef.current = true;
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const offset = reset ? 0 : offsetRef.current;
      const result = await getClientes(LIMIT, offset, searchTerm || undefined);

      if (reset) {
        setAllClientes(result);
        offsetRef.current = result.length;
      } else {
        setAllClientes(prev => [...prev, ...result]);
        offsetRef.current += result.length;
      }

      setHasMore(result.length === LIMIT);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const onRefresh = async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    await fetchClientes(search, true);
    setRefreshing(false);
  };

  const handleLoadMore = ({ distanceFromEnd }: { distanceFromEnd: number }) => {
    if (!hasUserScrolledRef.current) return;
    if (distanceFromEnd > 48) return;
    if (loadingMore || !hasMore) return;
    fetchClientes(search, false, true);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    offsetRef.current = 0;
    setHasMore(true);
    hasUserScrolledRef.current = false;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchClientes(text, true);
    }, 400);
  };

  const activeCount = useMemo(() => allClientes.filter(c => c.activo).length, [allClientes]);
  const inactiveCount = useMemo(() => allClientes.filter(c => !c.activo).length, [allClientes]);
  const empresaCount = useMemo(() => allClientes.filter(c => c.tipo === "empresa").length, [allClientes]);

  const clientes = useMemo(() => {
    if (filterTab === "activos") return allClientes.filter(c => c.activo);
    if (filterTab === "inactivos") return allClientes.filter(c => !c.activo);
    return allClientes;
  }, [allClientes, filterTab]);
  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: allClientes.length },
    { key: "activos", label: "Activos", count: activeCount },
    { key: "inactivos", label: "Inactivos", count: inactiveCount },
  ];
  const filterLabel =
    filterTab === "todos"
      ? "Estado: Todos"
      : filterTab === "activos"
        ? "Estado: Activos"
        : "Estado: Inactivos";

  if (loading && allClientes.length === 0) {
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
          <Text style={styles.headerTitle}>Clientes</Text>
        </View>
      </View>

      <View style={[styles.workspaceBar, desktop && styles.desktopWorkspaceBar]}>
        <View style={[styles.workspaceTopRow, desktop && styles.desktopWorkspaceTopRow]}>
          {!mobile && (
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push("/client/new")}
            >
              <Ionicons name="person-add-outline" size={18} color={WHITE} />
              <Text style={styles.primaryActionText}>Nuevo cliente</Text>
            </Pressable>
          )}

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color={TEXT3} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="Buscar por nombre, documento o correo..."
              placeholderTextColor={TEXT3}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => handleSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={TEXT3} />
              </Pressable>
            )}
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatCard}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: NAVY }]} />
                <Text style={styles.summaryStatValue}>{allClientes.length}</Text>
              </View>
              <Text style={styles.summaryStatLabel}>Total</Text>
            </View>
            <Pressable
              style={[styles.summaryStatCard, filterTab === "activos" && styles.summaryStatCardActive]}
              onPress={() => setFilterTab("activos")}
            >
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: GREEN }]} />
                <Text style={[styles.summaryStatValue, { color: GREEN }]}>{activeCount}</Text>
              </View>
              <Text style={styles.summaryStatLabel}>Activos</Text>
            </Pressable>
            <Pressable
              style={[styles.summaryStatCard, filterTab === "inactivos" && styles.summaryStatCardActive]}
              onPress={() => setFilterTab("inactivos")}
            >
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: TEXT3 }]} />
                <Text style={styles.summaryStatValue}>{inactiveCount}</Text>
              </View>
              <Text style={styles.summaryStatLabel}>Inactivos</Text>
            </Pressable>
            <View style={styles.summaryStatCard}>
              <View style={styles.summaryStatHead}>
                <View style={[styles.summaryStatDot, { backgroundColor: AMBER }]} />
                <Text style={[styles.summaryStatValue, { color: AMBER }]}>{empresaCount}</Text>
              </View>
              <Text style={styles.summaryStatLabel}>Empresas</Text>
            </View>
          </View>
        </View>

        <View style={styles.filtersToolbar}>
          <View style={styles.filtersLeftGroup}>
            {mobile ? (
              <View style={styles.selectWrap}>
                <Pressable
                  style={[styles.selectChip, filterTab !== "todos" && styles.selectChipActive]}
                  onPress={() => setFilterSelectOpen((prev) => !prev)}
                >
                  <Ionicons name="filter-outline" size={14} color={filterTab !== "todos" ? TEAL : TEXT2} />
                  <Text style={[styles.selectChipText, filterTab !== "todos" && styles.selectChipTextActive]}>
                    {filterLabel}
                  </Text>
                  <Ionicons name={filterSelectOpen ? "chevron-up" : "chevron-down"} size={14} color={TEXT3} />
                </Pressable>

                {filterSelectOpen && (
                  <View style={styles.selectMenu}>
                    {TABS.map((tab, index, arr) => {
                      const active = filterTab === tab.key;
                      return (
                        <Pressable
                          key={tab.key}
                          style={[
                            styles.selectOption,
                            active && styles.selectOptionActive,
                            index === arr.length - 1 && styles.selectOptionLast,
                          ]}
                          onPress={() => {
                            setFilterSelectOpen(false);
                            setFilterTab(tab.key);
                          }}
                        >
                          <View style={styles.selectOptionRow}>
                            <Text style={[styles.selectOptionText, active && styles.selectOptionTextActive]}>
                              {tab.label}
                            </Text>
                          </View>
                          <View style={styles.selectOptionMeta}>
                            <Text style={[styles.selectOptionCount, active && styles.selectOptionCountActive]}>
                              {tab.count}
                            </Text>
                            {active && <Ionicons name="checkmark" size={16} color={TEAL} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                {TABS.map(tab => (
                  <Pressable
                    key={tab.key}
                    style={[styles.tab, filterTab === tab.key && styles.tabActive]}
                    onPress={() => setFilterTab(tab.key)}
                  >
                    <Text style={[styles.tabText, filterTab === tab.key && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                    <View style={[styles.tabBadge, filterTab === tab.key && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, filterTab === tab.key && styles.tabBadgeTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {(search.length > 0 || filterTab !== "todos") && (
            <View style={styles.filtersActions}>
              <Pressable
                style={styles.secondaryFilterBtn}
                onPress={() => {
                  setFilterTab("todos");
                  handleSearch("");
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={TEXT2} />
                <Text style={styles.secondaryFilterText}>Limpiar</Text>
              </Pressable>
            </View>
          )}
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

      <View style={styles.body}>
        <View style={[styles.shell, styles.bodyShell, desktop && styles.desktopBodyShell, desktop && { maxWidth: shellWidth, paddingHorizontal: metrics.gutter }]}>
          <View style={styles.mainColumn}>
            <View style={styles.resultsSurface}>
              <FlatList
                data={clientes}
                style={styles.listView}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => <ClientCard item={item} index={index} />}
                contentContainerStyle={[styles.list, mobile && styles.mobileList]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={!desktop ? renderWorkspaceHeader : undefined}
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
                    if (filterSelectOpen && y > 8) {
                      setFilterSelectOpen(false);
                    }
                  }
                }}
                scrollEventThrottle={16}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.02}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreBar}>
                      <ActivityIndicator size="small" color={TEAL} />
                      <Text style={styles.loadingMoreText}>Cargando más clientes...</Text>
                    </View>
                  ) : (
                    <View style={{ height: 32 }} />
                  )
                }
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <View style={styles.emptyIllustration}>
                      <View style={styles.emptyIconHalo} />
                      <View style={styles.emptyIcon}>
                        <Ionicons name="people-outline" size={36} color="#7B9FF3" />
                      </View>
                    </View>
                    <Text style={styles.emptyTitle}>
                      {search ? "Sin resultados" : filterTab !== "todos" ? `Sin clientes ${filterTab}` : "Sin clientes"}
                    </Text>
                    <Text style={styles.emptySub}>
                      {search
                        ? `No se encontraron clientes para "${search}"`
                        : filterTab !== "todos"
                          ? `No hay clientes ${filterTab} aún`
                          : "Agrega tu primer cliente para comenzar"}
                    </Text>
                    {!search && filterTab === "todos" && (
                      <Pressable style={styles.emptyBtn} onPress={() => router.push("/client/new")}>
                        <Text style={styles.emptyBtnText}>Agregar cliente</Text>
                      </Pressable>
                    )}
                  </View>
                }
              />
            </View>
          </View>
        </View>
      </View>
      {mobile && showFloatingAdd && (
        <Pressable
          style={({ pressed }) => [styles.floatingAddButton, pressed && styles.floatingAddButtonPressed]}
          onPress={() => router.push("/client/new")}
        >
          <Ionicons name="person-add-outline" size={22} color={WHITE} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  shell: { width: "100%", alignSelf: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: BG,
    zIndex: 20,
    overflow: "visible",
  },
  desktopHeader: { paddingTop: 18, paddingBottom: 10 },
  headerMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  headerTitleBlock: { flex: 1, maxWidth: 760 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: TEXT, marginTop: 2 },
  workspaceBar: {
    marginTop: 6,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    overflow: "visible",
  },
  desktopWorkspaceBar: { padding: 16 },
  workspaceTopRow: { gap: 10 },
  desktopWorkspaceTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  primaryActionBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryActionText: { fontSize: 14, color: WHITE, fontFamily: "Inter_600SemiBold" },
  summaryStatsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryStatCard: {
    minWidth: 70,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#E4EBF2",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center",
  },
  summaryStatCardActive: { backgroundColor: "#EEF6FF", borderColor: "#CFE0FF" },
  summaryStatHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryStatDot: { width: 8, height: 8, borderRadius: 4 },
  summaryStatValue: { fontSize: 15, color: TEXT, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 11, color: TEXT3, fontFamily: "Inter_500Medium", marginTop: 3 },
  filtersToolbar: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  filtersLeftGroup: { flex: 1, minWidth: 0 },
  filtersActions: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
  secondaryFilterText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_600SemiBold" },
  selectWrap: {
    position: "relative",
    zIndex: 20,
    flexShrink: 0,
    overflow: "visible",
  },
  selectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E0E5EA",
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
  selectChipTextActive: {
    color: TEAL,
    fontFamily: "Inter_600SemiBold",
  },
  selectMenu: {
    position: "absolute",
    top: 46,
    left: 0,
    minWidth: 220,
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
  selectOptionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  selectOptionCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: TEXT3,
  },
  selectOptionCountActive: {
    color: TEAL,
  },

  // Body
  body: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 4,
  },
  bodyShell: {
    flex: 1,
    minHeight: 0,
  },
  desktopBodyShell: { flex: 1, paddingTop: 0, paddingBottom: 24 },
  mainColumn: { flex: 1, minWidth: 0, minHeight: 0, maxWidth: 1280, alignSelf: "center", width: "100%" },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: 48,
    backgroundColor: "#FAFBFD",
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E1E8F0",
  },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
  },

  // Tabs
  tabs: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 4 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: WHITE,
    borderWidth: 1, borderColor: "#E0E5EA",
  },
  tabActive: { backgroundColor: TEAL + "12", borderColor: TEAL },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  tabTextActive: { color: TEAL, fontFamily: "Inter_600SemiBold" },
  tabBadge: { backgroundColor: "#E0E5EA", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  tabBadgeActive: { backgroundColor: TEAL },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  tabBadgeTextActive: { color: WHITE },

  resultsSurface: {
    flex: 1,
    minHeight: 0,
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  // List
  listView: {
    flex: 1,
    minHeight: 0,
  },
  list: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  mobileList: { paddingTop: 0, paddingBottom: 96 },
  mobileHeaderBlock: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 14,
  },
  loadingMoreBar: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadingMoreText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_400Regular" },
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

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: "hidden",
    gap: 12,
    paddingVertical: 14,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: "#EBF0F5",
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  avatar: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginLeft: 14,
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardContent: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT, flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  docText: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: BG, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  emailText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, flexShrink: 1 },
  chatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TEAL + "15",
    alignItems: "center", justifyContent: "center",
    marginRight: 4,
  },

  // Tipo badge
  tipoBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tipoBadgeNatural: { backgroundColor: TEAL + "18" },
  tipoBadgeEmpresa: { backgroundColor: AMBER + "22" },
  tipoBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIllustration: { width: 180, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyIconHalo: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "#F2F6FF" },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 28,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5ECF5",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 360 },
  emptyBtn: {
    marginTop: 16, backgroundColor: NAVY,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  procesosSection: {
  marginTop: 8,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: "#F0F2F4",
},
procesosSectionHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginBottom: 6,
},
procesosSectionLabel: {
  fontSize: 11,
  fontFamily: "Inter_500Medium",
  color: TEXT3,
},
procesosPillsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 5,
},
procesosPill: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
},
procesosPillDot: {
  width: 5,
  height: 5,
  borderRadius: 3,
},
procesosPillText: {
  fontSize: 11,
  fontFamily: "Inter_600SemiBold",
},
});
