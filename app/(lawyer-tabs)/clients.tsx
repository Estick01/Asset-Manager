import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  RefreshControl, Alert, ActivityIndicator, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { type Cliente } from "@/shared/schema";
import { useMutation } from "@tanstack/react-query";
import { getLawyerClients, deleteClient } from "@/lib/services/abogadoService";
import { getOrCreateConversation } from "@/lib/services/chatService";
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
const AMBER    = "#F5A623";
const RED_S    = "#E05252";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL   },
  { bg: "#E8F8F2", text: GREEN  },
  { bg: "#FEF6E8", text: AMBER  },
  { bg: "#FDEAEA", text: RED_S  },
  { bg: "#EEE8FD", text: "#7B5EA7" },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(nombre: string, apellido?: string) {
  return ((nombre?.charAt(0) ?? "") + (apellido?.charAt(0) ?? "")).toUpperCase();
}

// ─── Client Card ──────────────────────────────────────────────────────────
function ClientCard({
  item, index, onDelete,
}: { item: Cliente; index: number; onDelete: (c: Cliente) => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const av   = avatarColor(item.nombre || "?");

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 280,
      delay: Math.min(index * 40, 320),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleChat = async () => {
    if (!item.userId) return;
    try {
      const conv = await getOrCreateConversation(item.userId, "lawyer_client");
      router.push({ pathname: "/chat/[id]", params: { id: conv.id, name: item.nombre } });
    } catch (e) {
      console.error("Error al iniciar chat:", e);
    }
  };

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push({ pathname: "/client/[id]", params: { id: item.id } })}
        onLongPress={() => onDelete(item)}
      >
        {/* Accent strip */}
        <View style={[styles.cardAccent, { backgroundColor: av.text }]} />

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {getInitials(item.nombre, item.apellido)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.nombre} {item.apellido}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={12} color={TEXT3} />
            <Text style={styles.metaText}>{item.documento || "Sin documento"}</Text>
          </View>
          {item.user?.email && (
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={12} color={TEXT3} />
              <Text style={styles.metaText} numberOfLines={1}>{item.user.email}</Text>
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

        <Ionicons name="chevron-forward" size={14} color={TEXT3} style={{ flexShrink: 0, marginRight: 4 }} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [clientesList,   setClientesList]   = useState<Cliente[]>([]);
  const [clientesOffset, setClientesOffset] = useState(0);
  const [hasMore,        setHasMore]        = useState(true);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isInitialLoad,  setIsInitialLoad]  = useState(true);
  const [search,         setSearch]         = useState("");

  const isLoadingRef = useRef(false);
  const offsetRef    = useRef(0);
  offsetRef.current  = clientesOffset;
  const LIMIT = 10;

  // ── Load ────────────────────────────────────────────────────
  const loadClientes = useCallback(async (reset = false) => {
    if (!user || isLoadingRef.current || (!reset && !hasMore)) return;
    if (reset) { setIsInitialLoad(true); setClientesOffset(0); }
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const lawyerId = user.profile?.id || user.user.id;
      const data = await getLawyerClients(lawyerId, LIMIT, reset ? 0 : clientesOffset);
      if (reset) {
        setClientesList(data);
        setClientesOffset(data.length);
      } else {
        setClientesList(prev => [...prev, ...data]);
        setClientesOffset(prev => prev + data.length);
      }
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, hasMore, clientesOffset]);

  const loadMore = useCallback(async () => {
    if (!user || isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const lawyerId = user.profile?.id || user.user.id;
      const data = await getLawyerClients(lawyerId, LIMIT, offsetRef.current);
      setClientesList(prev => [...prev, ...data]);
      setClientesOffset(prev => prev + data.length);
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user, hasMore]);

  useEffect(() => {
    if (user && isInitialLoad) loadClientes(true);
  }, [user]);

  // ── Delete ──────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      loadClientes(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert("Error", "No se pudo eliminar: " + e.message),
  });

  const handleDelete = (cliente: Cliente) => {
    Alert.alert(
      "Eliminar Cliente",
      `¿Estás seguro de eliminar a ${cliente.nombre} ${cliente.apellido}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate(cliente.id) },
      ]
    );
  };

  // ── Filter ──────────────────────────────────────────────────
  const filtered = useMemo(() =>
    clientesList.filter(c =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.apellido?.toLowerCase().includes(search.toLowerCase()) ||
      c.documento?.includes(search)
    ), [clientesList, search]);

  // Stats
  const thisMonth = useMemo(() => {
    const now = new Date();
    return clientesList.filter(c => {
      const d = new Date(c.fechaCreacion);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [clientesList]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clientes</Text>
          {!isInitialLoad && (
            <Text style={styles.headerSub}>{clientesList.length} registrados</Text>
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
          <Text style={styles.statNum}>{clientesList.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: GREEN }]}>
            {clientesList.filter(c => c.activo).length}
          </Text>
          <Text style={styles.statLbl}>Activos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: TEAL }]}>{thisMonth}</Text>
          <Text style={styles.statLbl}>Este mes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: AMBER }]}>
            {clientesList.filter(c => !c.activo).length}
          </Text>
          <Text style={styles.statLbl}>Inactivos</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={TEXT3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o documento..."
            placeholderTextColor={TEXT3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Section label */}
        {filtered.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {search ? `Resultados para "${search}"` : "Todos los Clientes"}
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
            data={filtered}
            keyExtractor={(item, i) => `${item.id}-${i}`}
            renderItem={({ item, index }) => (
              <ClientCard item={item} index={index} onDelete={handleDelete} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && isInitialLoad}
                onRefresh={() => loadClientes(true)}
                tintColor={TEAL} colors={[TEAL]}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && !isInitialLoad
                ? <ActivityIndicator size="small" color={TEAL} style={{ paddingVertical: 20 }} />
                : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={36} color={TEXT3} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search ? "Sin resultados" : "Sin clientes"}
                </Text>
                <Text style={styles.emptySub}>
                  {search
                    ? `No hay clientes con "${search}"`
                    : "Agrega tu primer cliente para comenzar"}
                </Text>
                {!search && (
                  <Pressable style={styles.emptyBtn} onPress={() => router.push("/client/new")}>
                    <Text style={styles.emptyBtnText}>Agregar Cliente</Text>
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
  centered: { paddingTop: 60, alignItems: "center" },

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

  sectionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 10, gap: 10,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  sectionLine:  { height: 2, backgroundColor: TEAL, borderRadius: 2, width: 32 },

  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardAccent:  { width: 4, alignSelf: "stretch", flexShrink: 0 },
  avatar: {
    width: 44, height: 44, borderRadius: 12, margin: 12, marginRight: 0,
    alignItems: "center", justifyContent: "center",
  },
  avatarText:  { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardContent: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 3 },
  clientName:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },
  metaRow:     { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:    { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3, flex: 1 },
  chatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TEAL + "15",
    alignItems: "center", justifyContent: "center",
    marginRight: 4,
  },

  empty:     { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: WHITE,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
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