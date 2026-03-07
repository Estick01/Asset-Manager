import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getClientes } from "@/lib/services/clienteService";
import { type Cliente } from "@/shared/schema";
import { useAuth } from "@/lib/auth-context";

export default function FirmClientsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadClientes = async () => {
    try {
      const usurioId = (user as any)?.id || null;
      if (!usurioId) {
        console.error("No lawyer ID found");
        setClientes([]);
        return;
      }
      const result = await getClientes(usurioId);
      setClientes(result);
    } catch (error) {
      console.error("Error loading clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClientes();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClientes();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Cliente }) => (
    <Pressable
      style={styles.clientCard}
      onPress={() => router.push({ pathname: "/client/[id]", params: { id: item.id } })}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {(item.nombre?.charAt(0) || "") + (item.apellido?.charAt(0) || "").toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.clientDocument}>{item.documento}</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.contactText}>{item.user?.email || "Sin correo"}</Text>
        </View>
        {item.telefono && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.contactText}>{item.telefono}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes del Bufete</Text>
        <Pressable 
          style={styles.addButton}
          onPress={() => router.push("/client/new")}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={{ color: Colors.textSecondary }}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin clientes</Text>
              <Text style={styles.emptySubtitle}>Agrega tu primer cliente para comenzar</Text>
              <Pressable 
                style={styles.createButton}
                onPress={() => router.push("/client/new")}
              >
                <Ionicons name="person-add" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>Nuevo Cliente</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  clientDocument: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
