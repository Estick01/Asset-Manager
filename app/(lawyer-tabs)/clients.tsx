import React, { useState, useMemo, useRef, useCallback, useEffect, use } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { type Cliente } from '@/shared/schema';
import { useMutation } from "@tanstack/react-query";
import { getLawyerClients, deleteClient } from "@/lib/services/abogadoService";
import { useAuth } from "@/lib/auth-context";


export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const { user , profile } = useAuth();
  const [search, setSearch] = useState("");
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [clientesOffset, setClientesOffset] = useState(0);
  const [hasMoreClientes, setHasMoreClientes] = useState(true);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isLoadingMoreRef = useRef(false);
  const CLIENTES_LIMIT = 10;

  const loadClientes = useCallback(async (reset: boolean = false) => {
    if (!user || isLoadingMoreRef.current || (!reset && !hasMoreClientes)) return;
    
    if (reset) {
      setIsInitialLoad(true);
      setClientesOffset(0);
    }
    
    isLoadingMoreRef.current = true;
    setIsLoadingClientes(true);
    
    try {
      const lawyerId = user.profile?.id || user.user.id;
      const offset = reset ? 0 : clientesOffset;
      const data = await getLawyerClients(lawyerId, CLIENTES_LIMIT, offset);
      
      if (reset) {
        setClientesList(data);
        setClientesOffset(data.length);
        setHasMoreClientes(data.length === CLIENTES_LIMIT);
      } else {
        setClientesList(prev => [...prev, ...data]);
        setClientesOffset(prev => prev + data.length);
        setHasMoreClientes(data.length === CLIENTES_LIMIT);
      }
    } catch (error) {
      console.error("Error loading clientes:", error);
    } finally {
      setIsLoadingClientes(false);
      isLoadingMoreRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, hasMoreClientes]);

  // Remove stale dependencies - use refs for offset
  const offsetRef = useRef(0);
  offsetRef.current = clientesOffset;

  const loadMoreClientes = useCallback(async () => {
    if (!user || isLoadingMoreRef.current || !hasMoreClientes) return;
    
    isLoadingMoreRef.current = true;
    setIsLoadingClientes(true);
    
    try {
      const lawyerId = user.profile?.id || user.user.id;
      const currentOffset = offsetRef.current;
      const data = await getLawyerClients(lawyerId, CLIENTES_LIMIT, currentOffset);
      
      setClientesList(prev => [...prev, ...data]);
      setClientesOffset(prev => prev + data.length);
      setHasMoreClientes(data.length === CLIENTES_LIMIT);
    } catch (error) {
      console.error("Error loading more clientes:", error);
    } finally {
      setIsLoadingClientes(false);
      isLoadingMoreRef.current = false;
    }
  }, [user, hasMoreClientes]);

  // Initial load
  useEffect(() => {
    if (user && isInitialLoad) {
      loadClientes(true);
    }
  }, [user]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      loadClientes(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      Alert.alert("Error", "No se pudo eliminar el cliente: " + error.message);
    },
  });

  const handleDelete = (cliente: Cliente) => {
    Alert.alert("Eliminar Cliente", `Estas seguro de eliminar a ${cliente.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteMutation.mutate(cliente.id),
      },
    ]);
  };

  const filtered = useMemo(() => {
    if (!clientesList) return [];
    return clientesList.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.documento.includes(search));
  }, [clientesList, search]);

  const renderItem = ({ item }: { item: Cliente }) => (
    <Pressable
      style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}
      onPress={() => router.push({ pathname: "/client/[id]", params: { id: item.id } })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientInitial}>{(item.nombre?.charAt(0) || "") + (item.apellido?.charAt(0) || "").toUpperCase()}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.clientDoc}>{item.documento || "Sin documento"}</Text>
        <View style={styles.clientMeta}>
          <Ionicons name="mail-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.clientMetaText}>{item.user?.email || "Sin correo"}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Clientes</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push("/client/new")}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o documento"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoadingClientes && isInitialLoad ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={isLoadingClientes && isInitialLoad} onRefresh={() => loadClientes(true)} tintColor={Colors.primary} />}
          onEndReached={() => loadMoreClientes()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingClientes && !isInitialLoad ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>{search ? "Sin resultados" : "Sin clientes"}</Text>
              <Text style={styles.emptySubtitle}>{search ? "Intenta con otro termino" : "Agrega tu primer cliente"}</Text>
            </View>
          }
        />
      )}
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
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  clientCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInitial: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  clientDoc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  clientMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  clientMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
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
});
