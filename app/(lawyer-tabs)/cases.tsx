import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getProcesos } from '@/lib/services/procesoService';
import { ProcesoDTO, type Proceso } from '@/shared/schema';
import { useAuth } from "@/lib/auth-context";



const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  en_tramite: "En Tramite",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

const ESTADO_COLORS: Record<string, string> = {
  activo: Colors.success,
  en_tramite: Colors.warning,
  finalizado: Colors.info,
  archivado: Colors.textTertiary,
};

const FILTERS = ["todos", "activo", "en_tramite", "finalizado", "archivado"] as const;
const FILTER_LABELS: Record<string, string> = {
  todos: "Todos",
  activo: "Activos",
  en_tramite: "En Tramite",
  finalizado: "Finalizados",
  archivado: "Archivados",
};

export default function CasesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [procesos, setProcesos] = useState<(Proceso & { clienteNombre?: string })[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const [refreshing, setRefreshing] = useState(false);
  const [hasMoreProcesos, setHasMoreProcesos] = useState(true);
  const [isLoadingProcesos, setIsLoadingProcesos] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const PROCESOS_LIMIT = 10;
  const [debouncedSearch, setDebouncedSearch] = useState(search);


  const offsetRef = useRef(0);

  const loadProcesos = useCallback(
    async (reset: boolean = false) => {
      if (!user || isLoadingMoreRef.current) return;
      if (!reset && offsetRef.current === 0 && procesos.length === 0) return;
      if (!reset && !hasMoreProcesos) return;

      isLoadingMoreRef.current = true;
      setIsLoadingProcesos(true);

      try {
        const offset = reset ? 0 : offsetRef.current;

        const filterParams = {
          estadoCodigo: filter !== "todos" ? filter : undefined,
          search: debouncedSearch || undefined,
        };

        const result = await getProcesos(
          PROCESOS_LIMIT,
          offset,
          filterParams
        );

        const data = result.data;
        const total = result.total;

        if (reset) {
          setProcesos(data);
          offsetRef.current = data.length;
        } else {
          setProcesos(prev => [...prev, ...data]);
          offsetRef.current += data.length;
        }

        setHasMoreProcesos(offsetRef.current < total);
      } catch (error) {
        console.error("Error loading procesos:", error);
      } finally {
        setIsLoadingProcesos(false);
        isLoadingMoreRef.current = false;
        setIsInitialLoad(false);
      }
    },
    [user, debouncedSearch, filter]
  );

  const loadMoreProcesos = () => {
    if (!isLoadingProcesos && hasMoreProcesos) {
      loadProcesos(false);
    }
  };

  // Load processes when screen comes into focus
useFocusEffect(
  useCallback(() => {
    if (user && procesos.length === 0) {
      loadProcesos(true);
    }
  }, [user, procesos.length])
);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  // Reload when filter or search changes
  useEffect(() => {
    if (user) {
      offsetRef.current = 0;
      setHasMoreProcesos(true);
      loadProcesos(true);
    }
  }, [filter, debouncedSearch ,user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProcesos(true);
    setRefreshing(false);
  };

  // Server-side filtering now, no client-side filtering needed
  const filtered = procesos;

  const renderItem = ({ item }: { item: ProcesoDTO & { clienteNombre?: string } }) => (
    <Pressable
      style={({ pressed }) => [styles.caseCard, pressed && styles.caseCardPressed]}
      onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
    >
      <View style={styles.caseHeader}>
        <View style={[styles.statusLine, { backgroundColor: ESTADO_COLORS[item.estado?.codigo || "archivado"] || Colors.textTertiary }]} />
        <View style={styles.caseContent}>
          <Text style={styles.radicado}>{item.radicado}</Text>
          <Text style={styles.tipoProceso}>{item.tipoProceso?.nombre}</Text>
          <View style={styles.caseMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{item.clienteNombre}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{item.juzgado}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: (ESTADO_COLORS[item.estado?.codigo || "archivado"] || Colors.textTertiary) + "15" }]}>
          <Text style={[styles.estadoText, { color: ESTADO_COLORS[item.estado?.codigo || "archivado"] || Colors.textTertiary }]}>{ESTADO_LABELS[item.estado?.codigo || "archivado"]}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Procesos</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push("/case/new")}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por radicado, tipo o cliente"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{FILTER_LABELS[item]}</Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onEndReached={loadMoreProcesos}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          isLoadingProcesos && !isInitialLoad ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>{search || filter !== "todos" ? "Sin resultados" : "Sin procesos"}</Text>
            <Text style={styles.emptySubtitle}>{search || filter !== "todos" ? "Intenta con otros filtros" : "Crea tu primer proceso"}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  filterList: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  caseCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  caseCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  caseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  statusLine: {
    width: 4,
    alignSelf: "stretch",
  },
  caseContent: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  radicado: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  tipoProceso: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  caseMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  estadoBadge: {
    marginTop: 16,
    marginRight: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  estadoText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
