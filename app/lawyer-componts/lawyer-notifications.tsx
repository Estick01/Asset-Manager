import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import {
  getNotificacionesAbogado,
  markNotificacionLeidaAbogado,
  markTodasLeidasAbogado,
} from "@/lib/services/notificacionService";
import type { Notificacion } from "@/shared/schema";

const TIPO_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  nueva_tarea:       { icon: "checkmark-circle-outline", color: Colors.primary },
  tarea_completada:  { icon: "checkmark-done-circle",    color: Colors.success },
  estado_cambio:     { icon: "refresh-circle-outline",   color: Colors.warning },
  default:           { icon: "notifications-outline",    color: Colors.info },
};

function tipoConfig(tipo: string) {
  return TIPO_CONFIG[tipo] ?? TIPO_CONFIG.default;
}

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  return `Hace ${Math.floor(hrs / 24)} d`;
}

export default function LawyerNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { refreshUnread } = useNotifications();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await getNotificacionesAbogado(profile.id);
      setNotificaciones(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMarkRead = async (item: Notificacion) => {
    if (!item.leidoLawyer) {
      await markNotificacionLeidaAbogado(item.id).catch(() => {});
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, leidoLawyer: true } : n))
      );
      refreshUnread();
    }
    if (item.procesoId) {
      router.push({ pathname: "/case/[id]", params: { id: item.procesoId } });
    }
  };

  const handleMarkAll = async () => {
    if (!profile?.id) return;
    await markTodasLeidasAbogado(profile.id).catch(() => {});
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leidoLawyer: true })));
    refreshUnread();
  };

  const unread = notificaciones.filter((n) => !n.leidoLawyer).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
        {unread > 0 && (
          <Pressable onPress={handleMarkAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>Sin notificaciones</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = tipoConfig(item.tipo);
            return (
              <Pressable
                style={[styles.card, !item.leidoLawyer && styles.cardUnread]}
                onPress={() => handleMarkRead(item)}
              >
                <View style={[styles.iconBox, { backgroundColor: cfg.color + "22" }]}>
                  <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={styles.content}>
                  <Text style={styles.cardTitle}>{item.titulo}</Text>
                  <Text style={styles.cardMsg}>{item.mensaje}</Text>
                  <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.leidoLawyer && <View style={styles.dot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + "18",
    borderRadius: 8,
  },
  markAllText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }
      : { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }),
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconBox: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  cardMsg: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginTop: 4,
  },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, fontFamily: "Inter_400Regular" },
});
