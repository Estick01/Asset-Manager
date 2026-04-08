import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";
import { adminUsersService, type LawyerVerificationRow } from "@/lib/services/adminService";

type StatusFilter = "pendiente" | "verificado" | "rechazado";

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function VerificationBadge({ status }: { status: StatusFilter }) {
  const tone =
    status === "verificado"
      ? { bg: "#DCFCE7", text: "#15803D", label: "Verificado" }
      : status === "rechazado"
        ? { bg: "#FEE2E2", text: "#B91C1C", label: "Rechazado" }
        : { bg: "#FEF3C7", text: "#B45309", label: "Pendiente" };

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeText, { color: tone.text }]}>{tone.label}</Text>
    </View>
  );
}

export default function LawyerVerificationScreen() {
  const [status, setStatus] = useState<StatusFilter>("pendiente");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin-lawyer-verifications", status],
    queryFn: () => adminUsersService.listLawyerVerifications(status),
    staleTime: 30_000,
  });

  const rows: LawyerVerificationRow[] = data ?? [];

  const mutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: "verificado" | "rechazado" }) =>
      adminUsersService.updateLawyerVerification(id, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lawyer-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
    },
  });

  function confirmAction(row: LawyerVerificationRow, nextStatus: "verificado" | "rechazado") {
    Alert.alert(
      nextStatus === "verificado" ? "Aprobar abogado" : "Rechazar abogado",
      `${row.name ?? row.email}\nTarjeta: ${row.licenseNumber ?? "Sin tarjeta"}\n\n¿Deseas marcarlo como ${nextStatus}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => mutation.mutate({ id: row.profileId, nextStatus }) },
      ],
    );
  }

  return (
    <AdminShell title="Verificación de abogados" scrollable={false}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Revisión de tarjeta profesional</Text>
          <Text style={styles.heroText}>
            Aquí se gestionan los abogados que faltan por validar antes de marcar su perfil profesional como verificado.
          </Text>
        </View>

        <View style={styles.filters}>
          {(["pendiente", "verificado", "rechazado"] as const).map((item) => (
            <FilterChip
              key={item}
              label={item.charAt(0).toUpperCase() + item.slice(1)}
              active={status === item}
              onPress={() => setStatus(item)}
            />
          ))}
        </View>

        {(isLoading || isFetching) && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>No se pudo cargar la lista de verificaciones.</Text>
          </View>
        )}

        {!isLoading && !isFetching && !isError && (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {rows.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No hay abogados en este estado.</Text>
                <Text style={styles.emptyText}>Cuando lleguen nuevos registros pendientes aparecerán aquí.</Text>
              </View>
            ) : (
              rows.map((row) => (
                <View key={row.profileId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{row.name ?? "Sin nombre"}</Text>
                      <Text style={styles.email}>{row.email}</Text>
                    </View>
                    <VerificationBadge status={row.status} />
                  </View>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Tarjeta</Text>
                      <Text style={styles.metaValue}>{row.licenseNumber ?? "No registrada"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Especialidad</Text>
                      <Text style={styles.metaValue}>{row.specialization ?? "No registrada"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Correo verificado</Text>
                      <Text style={styles.metaValue}>{row.emailVerified ? "Sí" : "No"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Registro</Text>
                      <Text style={styles.metaValue}>{new Date(row.createdAt).toLocaleDateString("es-CO")}</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.approveBtn,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => confirmAction(row, "verificado")}
                      disabled={mutation.isPending}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.rejectBtn,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => confirmAction(row, "rechazado")}
                      disabled={mutation.isPending}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#B91C1C" />
                      <Text style={styles.rejectBtnText}>Rechazar</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 16 },
  hero: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 6 },
  heroText: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular", color: "#475569" },
  filters: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB" },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#64748B" },
  chipTextActive: { color: "#2563EB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#B91C1C" },
  list: { flex: 1 },
  listContent: { gap: 14, paddingBottom: 20 },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0F172A", marginBottom: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
  },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: {
    minWidth: 180,
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#94A3B8", textTransform: "uppercase" },
  metaValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#1E293B", marginTop: 6 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveBtn: { backgroundColor: "#15803D" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  rejectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#B91C1C" },
});
