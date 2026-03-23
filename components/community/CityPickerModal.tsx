import React, { useState, useEffect, useCallback } from "react";
import {
  Modal, View, Text, TextInput, Pressable,
  FlatList, ActivityIndicator, StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { searchCities, type CityResult } from "@/lib/services/communityService";

// ─── Design tokens ────────────────────────────────────────────────────────
const WHITE = "#FFFFFF";
const BG    = "#F4F6F8";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL  = "#2196A6";
const NAVY  = "#0F2640";

const LIMIT = 20;

interface Props {
  visible:  boolean;
  selected: string | null;   // city nombre currently selected
  onClose:  () => void;
  onSelect: (nombre: string) => void;
}

export function CityPickerModal({ visible, selected, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const [query,       setQuery]       = useState("");
  const [cities,      setCities]      = useState<CityResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(true);

  const load = useCallback(async (q: string, off: number, append = false) => {
    if (off === 0) setLoading(true);
    else           setLoadingMore(true);

    const res = await searchCities(q.trim(), LIMIT, off);

    if (append) setCities(prev => [...prev, ...res.data]);
    else        setCities(res.data);

    setHasMore(res.hasMore);
    setOffset(off + LIMIT);

    if (off === 0) setLoading(false);
    else           setLoadingMore(false);
  }, []);

  // Debounce search input
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(query, 0), query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, visible, load]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setQuery("");
      setOffset(0);
      setHasMore(true);
      setCities([]);
    }
  }, [visible]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    load(query, offset, true);
  };

  const handleSelect = (nombre: string) => {
    onSelect(nombre);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[s.container, { paddingBottom: insets.bottom }]}>

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.headerTitle}>Seleccionar ciudad</Text>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={TEXT2} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={TEXT3} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar municipio…"
            placeholderTextColor={TEXT3}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={TEXT3} />
            </Pressable>
          )}
        </View>

        {/* Clear selection */}
        {selected ? (
          <Pressable
            style={s.clearRow}
            onPress={() => handleSelect("")}
          >
            <Ionicons name="close-circle-outline" size={16} color={TEXT2} />
            <Text style={s.clearText}>Sin ciudad especificada</Text>
          </Pressable>
        ) : null}

        {/* List */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={TEAL} size="large" />
          </View>
        ) : (
          <FlatList
            data={cities}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => {
              const isActive = selected === item.nombre;
              return (
                <Pressable
                  style={({ pressed }) => [
                    s.cityRow,
                    pressed && s.cityRowPressed,
                    isActive && s.cityRowActive,
                  ]}
                  onPress={() => handleSelect(item.nombre)}
                >
                  <View style={s.cityRowLeft}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={isActive ? TEAL : TEXT3}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cityName, isActive && s.cityNameActive]}>
                        {item.nombre}
                      </Text>
                      <Text style={s.deptName}>{item.departamentoNombre}</Text>
                    </View>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                  )}
                </Pressable>
              );
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="search-outline" size={32} color={TEXT3} />
                <Text style={s.emptyText}>Sin resultados</Text>
                <Text style={s.emptySubText}>Intenta con otro nombre</Text>
              </View>
            }
            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator color={TEAL} style={{ paddingVertical: 20 }} />
                : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: NAVY,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    paddingVertical: 0,
  },

  clearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E5EA",
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT2,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: WHITE,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  cityRowPressed: { opacity: 0.75 },
  cityRowActive:  { borderColor: TEAL, backgroundColor: TEAL + "08" },
  cityRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },

  cityName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: TEXT,
  },
  cityNameActive: { color: TEAL },
  deptName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT3,
    marginTop: 2,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText:    { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT2 },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3 },
});
