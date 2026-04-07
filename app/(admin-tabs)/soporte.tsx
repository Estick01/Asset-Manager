import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "./_shell/AdminShell";
import { adminSupportService } from "@/lib/services/adminService";
import { EmptyState, SectionCard, StatCard, TableHeader } from "./_components/AdminUi";
import { useAuth } from "@/lib/auth-context";

function formatRelative(date: string | null | undefined) {
  if (!date) return "Sin actividad";
  const current = new Date();
  const target = new Date(date);
  const diffMin = Math.floor((current.getTime() - target.getTime()) / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return target.toLocaleDateString("es-CO");
}

export default function AdminSoporteScreen() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const adminId = user?.user.id;
  const { data: overview } = useQuery({ queryKey: ["admin-support-overview"], queryFn: adminSupportService.getOverview });
  const { data: conversations } = useQuery({
    queryKey: ["admin-support-conversations", search],
    queryFn: () => adminSupportService.listConversations({ search, limit: 24 }),
  });
  const { data: events } = useQuery({
    queryKey: ["admin-support-events"],
    queryFn: () => adminSupportService.listSecurityEvents({ limit: 8 }),
  });

  const rows = conversations?.data ?? [];
  const urgentCount = useMemo(() => rows.filter((item) => item.unreadCount > 0).length, [rows]);

  return (
    <AdminShell title="Soporte">
      <View style={styles.statsGrid}>
        <StatCard label="Chats de soporte" value={overview?.support.total ?? 0} />
        <StatCard label="Pendientes" value={urgentCount} tone="amber" />
        <StatCard label="Eventos seguridad" value={overview?.security.total ?? 0} tone="slate" />
        <StatCard label="Bloqueos" value={overview?.security.blocked ?? 0} tone="red" />
      </View>

      <SectionCard title="Bandeja de soporte">
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o email"
          placeholderTextColor="#94A3B8"
        />
        <TableHeader columns={[
          { label: "Usuario", flex: 1.6 },
          { label: "Último mensaje", flex: 2 },
          { label: "Actividad", flex: 0.8 },
          { label: "Acción", flex: 0.7 },
        ]} />
        {!rows.length ? (
          <EmptyState label="No hay conversaciones de soporte asignadas." icon="headset-outline" />
        ) : rows.map((conversation) => {
          const participant = conversation.participants.find((item) => item.userId !== adminId)
            ?? conversation.participants[0];
          const preview = conversation.lastMessage?.content ?? (conversation.lastMessage?.type === "file" ? "Archivo adjunto" : "Sin mensajes");
          return (
            <View key={conversation.id} style={styles.row}>
              <View style={[styles.cellBox, { flex: 1.6 }]}>
                <Text style={styles.primaryText} numberOfLines={1}>{participant?.name || "Usuario"}</Text>
                <Text style={styles.secondaryText} numberOfLines={1}>{participant?.email || "Sin email"}</Text>
              </View>
              <View style={[styles.cellBox, { flex: 2 }]}>
                <Text style={styles.primaryText} numberOfLines={2}>{preview}</Text>
                {conversation.unreadCount > 0 ? (
                  <Text style={styles.unreadText}>{conversation.unreadCount} sin leer</Text>
                ) : (
                  <Text style={styles.secondaryText}>Al día</Text>
                )}
              </View>
              <Text style={[styles.primaryText, { flex: 0.8 }]}>{formatRelative(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}</Text>
              <Pressable
                onPress={() => router.push({
                  pathname: "/chat/[id]",
                  params: {
                    id: conversation.id,
                    name: conversation.name ?? `Soporte · ${participant?.name ?? participant?.email ?? "Usuario"}`,
                    from: "/(admin-tabs)/soporte",
                    support: "1",
                  },
                })}
                style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.84 }]}
              >
                <Ionicons name="open-outline" size={16} color="#2563EB" />
              </Pressable>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Eventos recientes de seguridad">
        <TableHeader columns={[
          { label: "Email", flex: 1.5 },
          { label: "IP", flex: 1 },
          { label: "Evento", flex: 1 },
          { label: "Resultado", flex: 0.8 },
          { label: "Fecha", flex: 1 },
        ]} />
        {!events?.data.length ? <EmptyState label="No hay eventos para mostrar." /> : events.data.map((event) => (
          <View key={event.id} style={styles.row}>
            <Text style={[styles.primaryText, { flex: 1.5 }]} numberOfLines={1}>{event.email}</Text>
            <Text style={[styles.primaryText, { flex: 1 }]}>{event.ip}</Text>
            <Text style={[styles.primaryText, { flex: 1 }]}>{event.eventType}</Text>
            <Text style={[styles.primaryText, { flex: 0.8, color: event.success ? "#15803D" : "#B91C1C" }]}>
              {event.success ? "Ok" : "Fallido"}
            </Text>
            <Text style={[styles.primaryText, { flex: 1 }]}>{new Date(event.createdAt).toLocaleDateString("es-CO")}</Text>
          </View>
        ))}
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cellBox: {
    gap: 4,
  },
  primaryText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#334155",
  },
  secondaryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  unreadText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#B45309",
  },
  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
});
