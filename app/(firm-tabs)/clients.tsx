import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, TextInput, ActivityIndicator,
  ScrollView, Animated, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClientes } from "@/lib/services/clienteService";
import { getOrCreateConversation } from "@/lib/services/chatService";
import { removeFirmClient } from "@/lib/services/firmClientsService";
import { type Cliente } from "@/shared/schema";

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
    .filter(Boolean).join(", ");
}

type FilterTab = "todos" | "activos" | "inactivos";

// ─── Client Card ──────────────────────────────────────────────────────────
function ClientCard({
  item, index, onRemove,
}: {
  item: Cliente;
  index: number;
  onRemove?: (id: string, name: string) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  const { nombre, apellido } = getDisplayName(item);
  const av = avatarColor(nombre || "?");
  const documento = getDocumento(item);
  const telefono = getTelefono(item);
  const location = getLocation(item);
  const isEmpresa = item.tipo === "empresa";

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 300,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleChat = async () => {
    if (!item.userId) return;
    try {
      const conv = await getOrCreateConversation(item.userId, "lawyer_client");
      router.push({ pathname: "/chat/[id]", params: { id: conv.id, name: nombre, userId: item.userId } });
    } catch (e) {
      console.error("Error al iniciar chat:", e);
    }
  };

  const handleRemove = () => onRemove?.(item.id, `${nombre}${apellido ? ` ${apellido}` : ""}`);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
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
            <View style={[
              styles.tipoBadge,
              isEmpresa ? styles.tipoBadgeEmpresa : styles.tipoBadgeNatural,
            ]}>
              <Text style={[styles.tipoBadgeText, { color: isEmpresa ? AMBER : TEAL }]}>
                {isEmpresa ? "Empresa" : "Natural"}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: item.activo ? GREEN : TEXT3 }]} />
          </View>

          <Text style={styles.docText} numberOfLines={1}>{documento}</Text>

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
                {item.procesosStats.porEstado.map((e:any) => {
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

        {/* Remove button (only shown when onRemove is provided) */}
        {onRemove && (
          <Pressable
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
            onPress={handleRemove}
            hitSlop={8}
          >
            <Ionicons name="person-remove-outline" size={16} color="#E05252" />
          </Pressable>
        )}

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ flexShrink: 0 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Confirm Remove Modal ─────────────────────────────────────────────────
function ConfirmRemoveModal({
  visible, clientName, busy, onConfirm, onCancel,
}: {
  visible: boolean;
  clientName: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const DANGER = "#E05252";
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Icon */}
          <View style={[styles.modalIconWrap, { backgroundColor: DANGER + "12" }]}>
            <Ionicons name="person-remove-outline" size={28} color={DANGER} />
          </View>

          <Text style={styles.modalTitle}>Quitar cliente del bufete</Text>
          <Text style={styles.modalBody}>
            ¿Deseas quitar a{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: TEXT }}>
              {clientName}
            </Text>
            {" "}del bufete?{"\n"}Sus datos no serán eliminados.
          </Text>

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && { opacity: 0.8 }]}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.modalBtnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && { opacity: 0.8 }]}
              onPress={onConfirm}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Text style={styles.modalBtnDangerText}>Quitar</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function FirmClientsScreen() {
  const insets = useSafeAreaInsets();
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchClientes = useCallback(async (searchTerm?: string) => {
    try {
      const result = await getClientes(50, 0, searchTerm || undefined);
      setAllClientes(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClientes(search);
    setRefreshing(false);
  };

  // Abre el modal de confirmación
  const handleRequestRemove = useCallback((id: string, name: string) => {
    setPendingRemove({ id, name });
  }, []);

  // Confirma y ejecuta el soft-delete
  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await removeFirmClient(pendingRemove.id);
      setAllClientes(prev => prev.filter(c => c.id !== pendingRemove.id));
      setPendingRemove(null);
    } catch (e) {
      console.error("Error al quitar cliente:", e);
    } finally {
      setRemoving(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      fetchClientes(text);
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

  if (loading) {
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
          <Text style={styles.headerTitle}>Clientes</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {activeCount} activos · {inactiveCount} inactivos
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/client/new")}
        >
          <Ionicons name="person-add-outline" size={20} color={WHITE} />
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{allClientes.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{activeCount}</Text>
          <Text style={styles.statLbl}>Activos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{allClientes.length - empresaCount}</Text>
          <Text style={styles.statLbl}>Naturales</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{empresaCount}</Text>
          <Text style={styles.statLbl}>Empresas</Text>
        </View>
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
            placeholder="Buscar por nombre o documento..."
            placeholderTextColor={TEXT3}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => handleSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        {allClientes.length > 0 && (
          <View style={styles.tabsWrap}>
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
          </View>
        )}

        {/* Section label */}
        {clientes.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {filterTab === "todos"
                ? "Todos los Clientes"
                : filterTab === "activos"
                  ? "Clientes Activos"
                  : "Clientes Inactivos"}
            </Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* List */}
        <FlatList
          data={clientes}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => <ClientCard item={item} index={index} onRemove={handleRequestRemove} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={36} color={TEXT3} />
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
                  <Text style={styles.emptyBtnText}>Agregar Cliente</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </View>

      {/* ── Modal de confirmación ── */}
      <ConfirmRemoveModal
        visible={!!pendingRemove}
        clientName={pendingRemove?.name ?? ""}
        busy={removing}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  centered: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 32, paddingBottom: 32,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, marginTop: 2 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 4 },
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
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  statLbl: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },
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

  tabsWrap: { borderBottomWidth: 1, borderBottomColor: "#E8ECF0", marginBottom: 4 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
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

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 10, marginTop: 6, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine: { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14, overflow: "hidden", gap: 12,
    paddingVertical: 14, paddingRight: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  avatar: {
    width: 46, height: 46, borderRadius: 12, marginLeft: 14,
    alignItems: "center", justifyContent: "center",
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
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#E0525215",
    alignItems: "center", justifyContent: "center",
    marginRight: 2,
  },

  tipoBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tipoBadgeNatural: { backgroundColor: TEAL + "18" },
  tipoBadgeEmpresa: { backgroundColor: AMBER + "22" },
  tipoBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { marginTop: 16, backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
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

// ── Modal ──────────────────────────────────────────────────────────────
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "flex-end",
},
modalSheet: {
  backgroundColor: WHITE,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 24,
  paddingBottom: 36,
  paddingTop: 12,
  alignItems: "center",
  gap: 12,
},
modalHandle: {
  width: 36, height: 4, borderRadius: 2,
  backgroundColor: "#D1D9E0",
  marginBottom: 8,
},
modalIconWrap: {
  width: 60, height: 60, borderRadius: 18,
  alignItems: "center", justifyContent: "center",
  marginBottom: 4,
},
modalTitle: {
  fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT,
  textAlign: "center",
},
modalBody: {
  fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT2,
  textAlign: "center", lineHeight: 21,
},
modalActions: {
  flexDirection: "row", gap: 12, marginTop: 8, width: "100%",
},
modalBtn: {
  flex: 1, paddingVertical: 14, borderRadius: 14,
  alignItems: "center", justifyContent: "center",
},
modalBtnCancel: {
  backgroundColor: BG, borderWidth: 1, borderColor: "#E0E5EA",
},
modalBtnCancelText: {
  fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2,
},
modalBtnDanger: {
  backgroundColor: "#E05252",
},
modalBtnDangerText: {
  fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE,
},
});