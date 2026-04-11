import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Modal, ActivityIndicator } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "./_shell/AdminShell";
import { adminSupportService, type PublicSupportRequestRow } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge, TableHeader } from "./_components/AdminUi";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner-native";

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
  const [requestStatusFilter, setRequestStatusFilter] = useState("");
  const [replyTarget, setReplyTarget] = useState<PublicSupportRequestRow | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyResolve, setReplyResolve] = useState(false);
  const { user } = useAuth();
  const adminId = user?.user.id;
  const queryClient = useQueryClient();
  const { data: overview } = useQuery({ queryKey: ["admin-support-overview"], queryFn: adminSupportService.getOverview });
  const { data: conversations } = useQuery({
    queryKey: ["admin-support-conversations", search],
    queryFn: () => adminSupportService.listConversations({ search, limit: 24 }),
  });
  const { data: publicRequests } = useQuery({
    queryKey: ["admin-support-public-requests", search, requestStatusFilter],
    queryFn: () => adminSupportService.listPublicRequests({ search, status: requestStatusFilter, limit: 24 }),
  });
  const { data: events } = useQuery({
    queryKey: ["admin-support-events"],
    queryFn: () => adminSupportService.listSecurityEvents({ limit: 8 }),
  });

  const rows = useMemo(() => conversations?.data ?? [], [conversations?.data]);
  const urgentCount = useMemo(() => rows.filter((item) => item.unreadCount > 0).length, [rows]);
  const requestRows = useMemo(() => publicRequests?.data ?? [], [publicRequests?.data]);

  const refreshSupport = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-support-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-support-public-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
  };

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "new" | "in_progress" | "resolved" | "spam" }) =>
      adminSupportService.updatePublicRequestStatus(id, status),
    onSuccess: () => {
      toast.success("Estado actualizado.");
      refreshSupport();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.");
    },
  });

  const openConversationMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const conversation = await adminSupportService.openPublicRequestConversation(requestId);
      refreshSupport();
      return conversation;
    },
    onSuccess: (conversation) => {
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: conversation.id,
          name: conversation.name ?? "Soporte ProcesoClaro",
          from: "/(admin-tabs)/soporte",
          support: "1",
        },
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la conversación.");
    },
  });

  const replyRequestMutation = useMutation({
    mutationFn: ({ id, subject, message, markAsResolved }: { id: string; subject: string; message: string; markAsResolved: boolean }) =>
      adminSupportService.replyPublicRequest(id, { subject, message, markAsResolved }),
    onSuccess: () => {
      toast.success("Respuesta enviada por correo.");
      setReplyTarget(null);
      setReplySubject("");
      setReplyMessage("");
      setReplyResolve(false);
      refreshSupport();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la respuesta.");
    },
  });

  const openReplyModal = (item: PublicSupportRequestRow) => {
    setReplyTarget(item);
    setReplySubject(item.source === "login" ? "Ayuda con tu acceso a ProcesoClaro" : "Respuesta a tu consulta sobre ProcesoClaro");
    setReplyMessage("");
    setReplyResolve(item.status === "resolved");
  };

  const requestToneByStatus = {
    new: "amber",
    in_progress: "blue",
    resolved: "green",
    spam: "slate",
  } as const;

  return (
    <AdminShell title="Soporte">
      <View style={styles.statsGrid}>
        <StatCard label="Chats de soporte" value={overview?.support.total ?? 0} />
        <StatCard label="Pendientes" value={urgentCount} tone="amber" />
        <StatCard label="Consultas públicas" value={overview?.support.publicRequests ?? 0} tone="blue" />
        <StatCard label="Públicas activas" value={overview?.support.publicPending ?? 0} tone="green" />
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

      <SectionCard
        title="Consultas públicas"
        action={(
          <View style={styles.filterRow}>
            {[
              { label: "Todas", value: "" },
              { label: "Nuevas", value: "new" },
              { label: "En curso", value: "in_progress" },
              { label: "Resueltas", value: "resolved" },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setRequestStatusFilter(item.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  requestStatusFilter === item.value && styles.filterChipActive,
                  pressed && { opacity: 0.84 },
                ]}
              >
                <Text style={[styles.filterChipText, requestStatusFilter === item.value && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      >
        <TableHeader columns={[
          { label: "Contacto", flex: 1.5 },
          { label: "Mensaje", flex: 2.1 },
          { label: "Origen", flex: 0.8 },
          { label: "Estado", flex: 0.9 },
          { label: "Acciones", flex: 1.7 },
        ]} />
        {!requestRows.length ? (
          <EmptyState label="No hay consultas públicas registradas." icon="mail-open-outline" />
        ) : requestRows.map((item) => (
          <View key={item.id} style={[styles.row, styles.requestRow]}>
            <View style={[styles.cellBox, { flex: 1.5 }]}>
              <Text style={styles.primaryText} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.secondaryText} numberOfLines={1}>{item.email}</Text>
              <Text style={styles.secondaryText}>{formatRelative(item.createdAt)}</Text>
            </View>
            <View style={[styles.cellBox, { flex: 2.1 }]}>
              <Text style={styles.primaryText} numberOfLines={3}>{item.message}</Text>
              {item.conversationId ? (
                <Text style={styles.linkedText}>Conversación vinculada</Text>
              ) : item.userId ? (
                <Text style={styles.secondaryText}>Usuario registrado vinculado</Text>
              ) : (
                <Text style={styles.secondaryText}>Solo contacto por email</Text>
              )}
            </View>
            <Text style={[styles.primaryText, { flex: 0.8 }]}>{item.source === "login" ? "Login" : "Landing"}</Text>
            <View style={{ flex: 0.9 }}>
              <StatusBadge label={item.status} tone={requestToneByStatus[item.status]} />
            </View>
            <View style={[styles.requestActions, { flex: 1.7 }]}>
              <ActionButton label="En curso" onPress={() => updateRequestMutation.mutate({ id: item.id, status: "in_progress" })} tone="muted" />
              <ActionButton label="Resolver" onPress={() => updateRequestMutation.mutate({ id: item.id, status: "resolved" })} />
              <ActionButton label="Responder" onPress={() => openReplyModal(item)} tone="primary" />
              {item.userId && !item.conversationId ? (
                <ActionButton label="Abrir chat" onPress={() => openConversationMutation.mutate(item.id)} tone="primary" />
              ) : null}
            </View>
          </View>
        ))}
      </SectionCard>

      <Modal visible={!!replyTarget} transparent animationType="fade" onRequestClose={() => setReplyTarget(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReplyTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="mail-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Responder consulta pública</Text>
                <Text style={styles.modalSubtitle}>
                  {replyTarget ? `${replyTarget.name} · ${replyTarget.email}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Asunto</Text>
              <TextInput
                style={styles.modalInput}
                value={replySubject}
                onChangeText={setReplySubject}
                placeholder="Asunto del correo"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mensaje</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Escribe la respuesta que recibirá el usuario"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={() => setReplyResolve((current) => !current)}
              style={({ pressed }) => [styles.resolveToggle, pressed && { opacity: 0.84 }]}
            >
              <View style={[styles.resolveCheck, replyResolve && styles.resolveCheckActive]}>
                {replyResolve ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.resolveToggleText}>Marcar como resuelta al enviar</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setReplyTarget(null)} disabled={replyRequestMutation.isPending}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, replyRequestMutation.isPending && styles.modalSubmitBtnDisabled]}
                onPress={() => {
                  if (!replyTarget) return;
                  if (!replySubject.trim() || !replyMessage.trim()) {
                    toast.error("Completa asunto y mensaje.");
                    return;
                  }
                  replyRequestMutation.mutate({
                    id: replyTarget.id,
                    subject: replySubject.trim(),
                    message: replyMessage.trim(),
                    markAsResolved: replyResolve,
                  });
                }}
                disabled={replyRequestMutation.isPending}
              >
                {replyRequestMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.modalSubmitText}>Enviar respuesta</Text>
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#2563EB",
  },
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
  requestRow: {
    alignItems: "flex-start",
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
  linkedText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
  requestActions: {
    gap: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.56)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderText: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#334155",
  },
  modalInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#0F172A",
  },
  modalTextarea: {
    minHeight: 140,
  },
  resolveToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resolveCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  resolveCheckActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  resolveToggleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#334155",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#475569",
  },
  modalSubmitBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.7,
  },
  modalSubmitText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
