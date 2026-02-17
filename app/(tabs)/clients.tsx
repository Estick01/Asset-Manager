import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getClientes, deleteCliente, getProcesosByCliente, type Cliente } from "@/lib/storage";

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadClientes = useCallback(async () => {
    if (!user) return;
    const data = await getClientes(user.id);
    setClientes(data.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadClientes();
    }, [loadClientes]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClientes();
    setRefreshing(false);
  };

  const handleDelete = (cliente: Cliente) => {
    Alert.alert("Eliminar Cliente", `Estas seguro de eliminar a ${cliente.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteCliente(cliente.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadClientes();
        },
      },
    ]);
  };

  const filtered = clientes.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.documento.includes(search));

  const renderItem = ({ item }: { item: Cliente }) => (
    <Pressable
      style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}
      onPress={() => router.push({ pathname: "/client/[id]", params: { id: item.id } })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientInitial}>{item.nombre.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.nombre}</Text>
        <Text style={styles.clientDoc}>{item.documento || "Sin documento"}</Text>
        <View style={styles.clientMeta}>
          <Ionicons name="mail-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.clientMetaText}>{item.correo || "Sin correo"}</Text>
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

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>{search ? "Sin resultados" : "Sin clientes"}</Text>
            <Text style={styles.emptySubtitle}>{search ? "Intenta con otro termino" : "Agrega tu primer cliente"}</Text>
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
