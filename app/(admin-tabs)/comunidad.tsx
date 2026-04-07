import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminCommunityService } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge, TableHeader } from "./_components/AdminUi";

export default function AdminComunidadScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [disabled, setDisabled] = useState<string>("false");

  const { data: overview } = useQuery({ queryKey: ["admin-community-overview"], queryFn: adminCommunityService.getOverview });
  const { data: posts } = useQuery({
    queryKey: ["admin-community-posts", search, status, disabled],
    queryFn: () => adminCommunityService.listPosts({ search, status, disabled, limit: 12 }),
  });
  const { data: reports = [] } = useQuery({ queryKey: ["admin-community-reports"], queryFn: adminCommunityService.listReports });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: "open" | "in_progress" | "closed" }) =>
      adminCommunityService.updatePostStatus(id, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-community-overview"] });
    },
  });

  const disabledMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => adminCommunityService.setDisabled(id, disabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-community-overview"] });
    },
  });

  return (
    <AdminShell title="Comunidad">
      <View style={styles.statsGrid}>
        <StatCard label="Posts totales" value={overview?.posts.total ?? 0} />
        <StatCard label="Abiertos" value={overview?.posts.open ?? 0} tone="green" />
        <StatCard label="En progreso" value={overview?.posts.inProgress ?? 0} tone="amber" />
        <StatCard label="Deshabilitados" value={overview?.posts.disabled ?? 0} tone="slate" />
        <StatCard label="Reportes" value={overview?.reports ?? 0} tone="red" />
      </View>

      <SectionCard title="Filtros">
        <View style={styles.filtersRow}>
          <TextInput style={[styles.input, styles.flex2]} value={search} onChangeText={setSearch} placeholder="Buscar titulo, contenido o autor" />
          <View style={styles.chipsRow}>
            {[
              ["", "Todos"],
              ["open", "Abiertos"],
              ["in_progress", "En progreso"],
              ["closed", "Cerrados"],
            ].map(([value, label]) => (
              <FilterChip key={label} label={label} active={status === value} onPress={() => setStatus(value)} />
            ))}
          </View>
          <View style={styles.chipsRow}>
            {[
              ["false", "Activos"],
              ["true", "Deshabilitados"],
            ].map(([value, label]) => (
              <FilterChip key={label} label={label} active={disabled === value} onPress={() => setDisabled(value)} />
            ))}
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Posts administrables">
        <TableHeader columns={[
          { label: "Post", flex: 2.2 },
          { label: "Estado", flex: 1 },
          { label: "Visible", flex: 1 },
          { label: "Ciudad", flex: 1 },
          { label: "Reportes", flex: 1 },
          { label: "Acciones", flex: 2.2 },
        ]} />
        {!posts?.data.length ? <EmptyState label="No hay posts para mostrar." /> : posts.data.map((post) => (
          <View key={post.id} style={styles.row}>
            <View style={{ flex: 2.2 }}>
              <Text style={styles.primaryText}>{post.title}</Text>
              <Text style={styles.secondaryText}>{post.authorName ?? "Autor anonimo"} · {new Date(post.createdAt).toLocaleDateString("es-CO")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <StatusBadge label={post.status} tone={post.status === "open" ? "green" : post.status === "closed" ? "red" : "amber"} />
            </View>
            <View style={{ flex: 1 }}>
              <StatusBadge label={post.disabled ? "No" : "Si"} tone={post.disabled ? "red" : "green"} />
            </View>
            <Text style={[styles.cellText, { flex: 1 }]}>{post.city ?? "—"}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{post.reportCount}</Text>
            <View style={styles.actionsCell}>
              <ActionButton label="Abrir" tone="muted" onPress={() => statusMutation.mutate({ id: post.id, nextStatus: "open" })} />
              <ActionButton label="Cerrar" tone="danger" onPress={() => statusMutation.mutate({ id: post.id, nextStatus: "closed" })} />
              <ActionButton
                label={post.disabled ? "Habilitar" : "Deshabilitar"}
                tone={post.disabled ? "muted" : "danger"}
                onPress={() => disabledMutation.mutate({ id: post.id, disabled: !post.disabled })}
              />
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Reportes recientes">
        <TableHeader columns={[
          { label: "Motivo", flex: 1 },
          { label: "Reporter", flex: 1.4 },
          { label: "Detalle", flex: 2.2 },
          { label: "Fecha", flex: 1 },
        ]} />
        {!reports.length ? <EmptyState label="No hay reportes registrados." /> : reports.map((report) => (
          <View key={report.id} style={styles.row}>
            <Text style={[styles.cellText, { flex: 1 }]}>{report.reason}</Text>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.primaryText}>{report.reporterName ?? "Sin nombre"}</Text>
              <Text style={styles.secondaryText}>{report.reporterEmail ?? "—"}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 2.2 }]} numberOfLines={2}>{report.detail ?? "Sin detalle"}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{new Date(report.createdAt).toLocaleDateString("es-CO")}</Text>
          </View>
        ))}
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  filtersRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  flex1: { flex: 1, minWidth: 180 },
  flex2: { flex: 2, minWidth: 280 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  primaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F172A" },
  secondaryText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#94A3B8" },
  cellText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#334155" },
  actionsCell: { flex: 1.8, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[stylesChip.chip, active && stylesChip.chipActive]}>
      <Text style={[stylesChip.chipText, active && stylesChip.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const stylesChip = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  chipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#475569",
  },
  chipTextActive: {
    color: "#1D4ED8",
  },
});
