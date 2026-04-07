import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminPlansService, type AdminPlanRow } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge, TableHeader } from "./_components/AdminUi";

type PlanFormState = {
  id?: string;
  nombre: string;
  tipo: "abogado" | "bufete";
  precioMensualCop: string;
  precioAnualCop: string;
  precioMensualUsd: string;
  precioAnualUsd: string;
  maxProcesos: string;
  maxClientes: string;
  maxStorageGb: string;
  includedUsers: string;
  maxUsers: string;
  precioUsuarioExtraCop: string;
  precioUsuarioExtraUsd: string;
  state: boolean;
};

const emptyForm: PlanFormState = {
  nombre: "",
  tipo: "abogado",
  precioMensualCop: "0",
  precioAnualCop: "0",
  precioMensualUsd: "0",
  precioAnualUsd: "0",
  maxProcesos: "5",
  maxClientes: "10",
  maxStorageGb: "0",
  includedUsers: "1",
  maxUsers: "1",
  precioUsuarioExtraCop: "",
  precioUsuarioExtraUsd: "",
  state: true,
};

function mapPlanToForm(plan: AdminPlanRow): PlanFormState {
  return {
    id: plan.id,
    nombre: plan.nombre,
    tipo: plan.tipo,
    precioMensualCop: String(plan.precioMensualCop),
    precioAnualCop: String(plan.precioAnualCop),
    precioMensualUsd: String(plan.precioMensualUsd),
    precioAnualUsd: String(plan.precioAnualUsd),
    maxProcesos: String(plan.maxProcesos),
    maxClientes: String(plan.maxClientes),
    maxStorageGb: String(plan.maxStorageGb),
    includedUsers: String(plan.includedUsers),
    maxUsers: String(plan.maxUsers),
    precioUsuarioExtraCop: plan.precioUsuarioExtraCop ? String(plan.precioUsuarioExtraCop) : "",
    precioUsuarioExtraUsd: plan.precioUsuarioExtraUsd ? String(plan.precioUsuarioExtraUsd) : "",
    state: plan.state,
  };
}

export default function AdminPlanesScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: adminPlansService.list,
  });

  const summary = useMemo(() => ({
    total: plans.length,
    activos: plans.filter((plan) => plan.state).length,
    abogados: plans.filter((plan) => plan.tipo === "abogado").length,
    bufetes: plans.filter((plan) => plan.tipo === "bufete").length,
  }), [plans]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        precioMensualCop: form.precioMensualCop,
        precioAnualCop: form.precioAnualCop,
        precioMensualUsd: form.precioMensualUsd,
        precioAnualUsd: form.precioAnualUsd,
        maxProcesos: Number(form.maxProcesos),
        maxClientes: Number(form.maxClientes),
        maxStorageGb: Number(form.maxStorageGb),
        includedUsers: Number(form.includedUsers),
        maxUsers: Number(form.maxUsers),
        precioUsuarioExtraCop: form.precioUsuarioExtraCop || null,
        precioUsuarioExtraUsd: form.precioUsuarioExtraUsd || null,
        state: form.state,
      };
      if (form.id) return adminPlansService.update(form.id, payload as any);
      return adminPlansService.create(payload as any);
    },
    onSuccess: async () => {
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: adminPlansService.archive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });

  return (
    <AdminShell title="Planes">
      <View style={styles.statsGrid}>
        <StatCard label="Planes totales" value={summary.total} />
        <StatCard label="Planes activos" value={summary.activos} tone="green" />
        <StatCard label="Planes abogado" value={summary.abogados} tone="amber" />
        <StatCard label="Planes bufete" value={summary.bufetes} tone="slate" />
      </View>

      <SectionCard
        title={form.id ? "Editar plan" : "Crear plan"}
        action={form.id ? <ActionButton label="Nuevo" tone="muted" onPress={() => setForm(emptyForm)} /> : undefined}
      >
        <View style={styles.formGrid}>
          <LabeledInput label="Nombre" value={form.nombre} onChangeText={(value) => setForm((current) => ({ ...current, nombre: value }))} />
          <ToggleGroup
            label="Tipo"
            value={form.tipo}
            options={["abogado", "bufete"]}
            onChange={(value) => setForm((current) => ({ ...current, tipo: value as "abogado" | "bufete" }))}
          />
          <LabeledInput label="Mensual COP" value={form.precioMensualCop} onChangeText={(value) => setForm((current) => ({ ...current, precioMensualCop: value }))} />
          <LabeledInput label="Anual COP" value={form.precioAnualCop} onChangeText={(value) => setForm((current) => ({ ...current, precioAnualCop: value }))} />
          <LabeledInput label="Mensual USD" value={form.precioMensualUsd} onChangeText={(value) => setForm((current) => ({ ...current, precioMensualUsd: value }))} />
          <LabeledInput label="Anual USD" value={form.precioAnualUsd} onChangeText={(value) => setForm((current) => ({ ...current, precioAnualUsd: value }))} />
          <LabeledInput label="Max procesos" value={form.maxProcesos} onChangeText={(value) => setForm((current) => ({ ...current, maxProcesos: value }))} />
          <LabeledInput label="Max clientes" value={form.maxClientes} onChangeText={(value) => setForm((current) => ({ ...current, maxClientes: value }))} />
          <LabeledInput label="Storage GB" value={form.maxStorageGb} onChangeText={(value) => setForm((current) => ({ ...current, maxStorageGb: value }))} />
          <LabeledInput label="Usuarios incluidos" value={form.includedUsers} onChangeText={(value) => setForm((current) => ({ ...current, includedUsers: value }))} />
          <LabeledInput label="Max usuarios" value={form.maxUsers} onChangeText={(value) => setForm((current) => ({ ...current, maxUsers: value }))} />
          <LabeledInput label="Extra usuario COP" value={form.precioUsuarioExtraCop} onChangeText={(value) => setForm((current) => ({ ...current, precioUsuarioExtraCop: value }))} />
          <LabeledInput label="Extra usuario USD" value={form.precioUsuarioExtraUsd} onChangeText={(value) => setForm((current) => ({ ...current, precioUsuarioExtraUsd: value }))} />
        </View>
        <View style={styles.formFooter}>
          <ToggleChip
            label={form.state ? "Activo" : "Inactivo"}
            active={form.state}
            onPress={() => setForm((current) => ({ ...current, state: !current.state }))}
          />
          <ActionButton label={saveMutation.isPending ? "Guardando..." : form.id ? "Actualizar" : "Crear"} onPress={() => saveMutation.mutate()} />
        </View>
      </SectionCard>

      <SectionCard title="Inventario de planes">
        <TableHeader columns={[
          { label: "Plan", flex: 1.8 },
          { label: "Tipo", flex: 1 },
          { label: "Precio mes", flex: 1 },
          { label: "Clientes", flex: 1 },
          { label: "Suscriptores", flex: 1 },
          { label: "Estado", flex: 1 },
          { label: "Acciones", flex: 1.2 },
        ]} />
        {plans.length === 0 ? <EmptyState label="No hay planes disponibles." /> : plans.map((plan) => (
          <View key={plan.id} style={styles.row}>
            <View style={{ flex: 1.8 }}>
              <Text style={styles.primaryText}>{plan.nombre}</Text>
              <Text style={styles.secondaryText}>{plan.id}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 1 }]}>{plan.tipo}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>COP {plan.precioMensualCop}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{plan.maxClientes}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{plan.suscriptores ?? 0}</Text>
            <View style={{ flex: 1 }}>
              <StatusBadge label={plan.state ? "Activo" : "Inactivo"} tone={plan.state ? "green" : "red"} />
            </View>
            <View style={[styles.rowActions, { flex: 1.2 }]}>
              <ActionButton label="Editar" tone="muted" onPress={() => setForm(mapPlanToForm(plan))} />
              {plan.state ? <ActionButton label="Archivar" tone="danger" onPress={() => archiveMutation.mutate(plan.id)} /> : null}
            </View>
          </View>
        ))}
      </SectionCard>
    </AdminShell>
  );
}

function LabeledInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

function ToggleGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.toggleRow}>
        {options.map((option) => (
          <ToggleChip key={option} label={option} active={value === option} onPress={() => onChange(option)} />
        ))}
      </View>
    </View>
  );
}

function ToggleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggleChip, active && styles.toggleChipActive]}>
      <Text style={[styles.toggleChipText, active && styles.toggleChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  field: {
    minWidth: 220,
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
  },
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
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  toggleChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  toggleChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#475569",
  },
  toggleChipTextActive: {
    color: "#1D4ED8",
  },
  formFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  primaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0F172A",
  },
  secondaryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
  },
  cellText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#334155",
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
});
