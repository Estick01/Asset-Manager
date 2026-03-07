import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

// Mock team member data - in a real app this would come from an API
interface TeamMember {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export default function FirmTeamScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", nombre: "Juan Pérez", correo: "juan@bufete.com", rol: "Abogado Senior", activo: true },
    { id: "2", nombre: "María García", correo: "maria@bufete.com", rol: "Abogada", activo: true },
    { id: "3", nombre: "Carlos López", correo: "carlos@bufete.com", rol: "Asistente Legal", activo: true },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = ({ item }: { item: TeamMember }) => (
    <Pressable style={styles.memberCard}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {item.nombre?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.nombre}</Text>
        <Text style={styles.memberRol}>{item.rol}</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.contactText}>{item.correo}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.activo ? Colors.success + "15" : Colors.textTertiary + "15" }]}>
        <Text style={[styles.statusText, { color: item.activo ? Colors.success : Colors.textTertiary }]}>
          {item.activo ? "Activo" : "Inactivo"}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipo de Trabajo</Text>
        <Pressable style={styles.addButton}>
          <Ionicons name="person-add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{teamMembers.length}</Text>
          <Text style={styles.statLabel}>Miembros</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{teamMembers.filter(m => m.activo).length}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>

      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin miembros</Text>
            <Text style={styles.emptySubtitle}>Invita abogados a tu bufete</Text>
          </View>
        }
      />
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  memberCard: {
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
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  memberRol: {
    fontSize: 13,
    color: Colors.primary,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
});
