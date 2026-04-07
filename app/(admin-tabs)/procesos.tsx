import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminProcessesService } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge, TableHeader } from "./_components/AdminUi";

export default function AdminProcesosScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");

  const { data: summary } = useQuery({ queryKey: ["admin-process-summary"], queryFn: adminProcessesService.getSummary });
  const { data: records } = useQuery({
    queryKey: ["admin-process-records", search],
    queryFn: () => adminProcessesService.listRecords({ search, limit: 12 }),
  });
  const { data: types = [] } = useQuery({ queryKey: ["admin-process-types"], queryFn: adminProcessesService.listTypes });

  const createType = useMutation({
    mutationFn: () => adminProcessesService.createType({ nombre: typeName, descripcion: typeDescription }),
    onSuccess: async () => {
      setTypeName("");
      setTypeDescription("");
      await queryClient.invalidateQueries({ queryKey: ["admin-process-types"] });
    },
  });

  const toggleProcessState = useMutation({
    mutationFn: ({ id, state }: { id: string; state: boolean }) => adminProcessesService.toggleState(id, state),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-process-records"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-process-summary"] });
    },
  });

  const deleteType = useMutation({
    mutationFn: adminProcessesService.deleteType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-process-types"] });
    },
  });

  return (
    <AdminShell title="Procesos">
      <View style={styles.statsGrid}>
        <StatCard label="Procesos totales" value={summary?.total ?? 0} />
        <StatCard label="Procesos activos" value={summary?.activos ?? 0} tone="green" />
        <StatCard label="Procesos archivados" value={summary?.archivados ?? 0} tone="red" />
      </View>

      <SectionCard title="Tipos de proceso">
        <View style={styles.formRow}>
          <TextInput style={[styles.input, styles.flex2]} value={typeName} onChangeText={setTypeName} placeholder="Nombre del tipo" />
          <TextInput style={[styles.input, styles.flex3]} value={typeDescription} onChangeText={setTypeDescription} placeholder="Descripcion" />
          <ActionButton label={createType.isPending ? "Creando..." : "Agregar"} onPress={() => createType.mutate()} />
        </View>
        {!types.length ? <EmptyState label="No hay tipos de proceso." /> : types.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 2 }}>
              <Text style={styles.primaryText}>{item.nombre}</Text>
              <Text style={styles.secondaryText}>{item.descripcion ?? "Sin descripcion"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <StatusBadge label={item.activo ? "Activo" : "Inactivo"} tone={item.activo ? "green" : "red"} />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton label="Eliminar" tone="danger" onPress={() => deleteType.mutate(item.id)} />
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Buscador de procesos">
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Buscar por radicado, juzgado, cliente o tipo" />
      </SectionCard>

      <SectionCard title="Procesos recientes">
        <TableHeader columns={[
          { label: "Radicado", flex: 1.4 },
          { label: "Cliente", flex: 1.6 },
          { label: "Tipo", flex: 1.2 },
          { label: "Estado", flex: 1.2 },
          { label: "Activo", flex: 0.9 },
          { label: "Accion", flex: 1.1 },
        ]} />
        {!records?.data.length ? <EmptyState label="No hay procesos para mostrar." /> : records.data.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.primaryText}>{item.radicado || "Sin radicado"}</Text>
              <Text style={styles.secondaryText}>{item.juzgado || "Sin juzgado"}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 1.6 }]}>{item.clienteNombre}</Text>
            <Text style={[styles.cellText, { flex: 1.2 }]}>{item.tipoProceso ?? "—"}</Text>
            <Text style={[styles.cellText, { flex: 1.2 }]}>{item.estado ?? "—"}</Text>
            <View style={{ flex: 0.9 }}>
              <StatusBadge label={item.state ? "Si" : "No"} tone={item.state ? "green" : "red"} />
            </View>
            <View style={{ flex: 1.1 }}>
              <ActionButton
                label={item.state ? "Archivar" : "Reactivar"}
                tone={item.state ? "danger" : "muted"}
                onPress={() => toggleProcessState.mutate({ id: item.id, state: !item.state })}
              />
            </View>
          </View>
        ))}
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  formRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
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
  flex2: { flex: 2, minWidth: 200 },
  flex3: { flex: 3, minWidth: 260 },
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
});
