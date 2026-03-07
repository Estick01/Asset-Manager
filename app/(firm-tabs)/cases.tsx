import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getProcesos } from "@/lib/services/procesoService";
import { type Proceso } from "@/shared/schema";

export default function FirmCasesScreen() {
  const insets = useSafeAreaInsets();
  const [procesos, setProcesos] = useState<(Proceso & { clienteNombre?: string })[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProcesos = async () => {
    try {
      const result = await getProcesos(50, 0);
      setProcesos(result.data);
    } catch (error) {
      console.error("Error loading procesos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesos();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProcesos();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Proceso & { clienteNombre?: string } }) => (
    <Pressable
      style={styles.caseCard}
      onPress={() => router.push({ pathname: "/case/[id]", params: { id: item.id } })}
    >
      <View style={styles.caseHeader}>
        <View style={styles.caseInfo}>
          <Text style={styles.caseRadicado}>
            {item.radicado}
          </Text>
          <Text style={styles.caseTipo}>
            {item.tipoProceso}
          </Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: (item.estado?.color ?? Colors.textTertiary) + "1A" }]}>
          <View style={[styles.estadoDot, { backgroundColor: item.estado?.color || Colors.textTertiary }]} />
          <Text style={[styles.estadoText, { color: item.estado?.color || Colors.textTertiary }]}>
            {item.estado?.nombre}
          </Text>
        </View>
      </View>
      <View style={styles.caseFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.infoText}>
            {item.clienteNombre || "Sin cliente"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.infoText}>
            {item.juzgado}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Procesos del Bufete</Text>
        <Pressable 
          style={styles.addButton}
          onPress={() => router.push("/case/new")}
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
          data={procesos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                Sin procesos
              </Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primer proceso para comenzar
              </Text>
              <Pressable 
                style={styles.createButton}
                onPress={() => router.push("/case/new")}
              >
                <Ionicons name="add-circle" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>Nuevo Proceso</Text>
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
  caseCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  caseInfo: {
    flex: 1,
    marginRight: 12,
  },
  caseRadicado: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  caseTipo: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estadoText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  caseFooter: {
    flexDirection: "row",
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
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
