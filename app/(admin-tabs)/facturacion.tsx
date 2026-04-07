import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminBillingService } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge, TableHeader } from "./_components/AdminUi";

export default function AdminFacturacionScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: summary } = useQuery({ queryKey: ["admin-billing-summary"], queryFn: adminBillingService.getSummary });
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-billing-subscriptions", search],
    queryFn: () => adminBillingService.listSubscriptions({ search, limit: 12 }),
  });
  const { data: payments } = useQuery({
    queryKey: ["admin-billing-payments", search],
    queryFn: () => adminBillingService.listPayments({ search, limit: 12 }),
  });

  const toggleRenewal = useMutation({
    mutationFn: ({ id, autoRenovacion }: { id: string; autoRenovacion: boolean }) =>
      adminBillingService.updateSubscription(id, { autoRenovacion }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
    },
  });

  return (
    <AdminShell title="Facturacion">
      <View style={styles.statsGrid}>
        <StatCard label="Suscripciones activas" value={summary?.suscripciones.activas ?? 0} tone="green" />
        <StatCard label="Pagos aprobados" value={summary?.pagos.aprobados ?? 0} tone="blue" />
        <StatCard label="Pagos pendientes" value={summary?.pagos.pendientes ?? 0} tone="amber" />
        <StatCard label="Ingresos aprobados COP" value={formatCop(summary?.ingresosCopAprobados ?? 0)} tone="slate" />
      </View>

      <SectionCard title="Buscador financiero">
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por email, nombre o referencia Wompi"
        />
      </SectionCard>

      <SectionCard title="Suscripciones">
        <TableHeader columns={[
          { label: "Usuario", flex: 1.8 },
          { label: "Plan", flex: 1.2 },
          { label: "Estado", flex: 1 },
          { label: "Ciclo", flex: 1 },
          { label: "Vence", flex: 1.2 },
          { label: "Auto", flex: 1 },
          { label: "Acciones", flex: 1.3 },
        ]} />
        {!subscriptions?.data.length ? <EmptyState label="No hay suscripciones para mostrar." /> : subscriptions.data.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1.8 }}>
              <Text style={styles.primaryText}>{item.userName ?? "Sin nombre"}</Text>
              <Text style={styles.secondaryText}>{item.email}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 1.2 }]}>{item.planNombre}</Text>
            <View style={{ flex: 1 }}>
              <StatusBadge label={item.estado} tone={item.estado === "activa" ? "green" : item.estado === "cancelada" ? "red" : "amber"} />
            </View>
            <Text style={[styles.cellText, { flex: 1 }]}>{item.ciclo}</Text>
            <Text style={[styles.cellText, { flex: 1.2 }]}>{formatDate(item.fechaVencimiento)}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{item.autoRenovacion ? "Si" : "No"}</Text>
            <View style={{ flex: 1.3 }}>
              <ActionButton
                label={item.autoRenovacion ? "Desactivar" : "Activar"}
                tone="muted"
                onPress={() => toggleRenewal.mutate({ id: item.id, autoRenovacion: !item.autoRenovacion })}
              />
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Pagos recientes">
        <TableHeader columns={[
          { label: "Usuario", flex: 1.8 },
          { label: "Plan", flex: 1.2 },
          { label: "Estado", flex: 1 },
          { label: "Importe", flex: 1 },
          { label: "Metodo", flex: 1 },
          { label: "Referencia", flex: 1.5 },
        ]} />
        {!payments?.data.length ? <EmptyState label="No hay pagos para mostrar." /> : payments.data.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1.8 }}>
              <Text style={styles.primaryText}>{item.userName ?? "Sin nombre"}</Text>
              <Text style={styles.secondaryText}>{item.email}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 1.2 }]}>{item.planNombre ?? "—"}</Text>
            <View style={{ flex: 1 }}>
              <StatusBadge label={item.estado} tone={item.estado === "aprobado" ? "green" : item.estado === "rechazado" ? "red" : "amber"} />
            </View>
            <Text style={[styles.cellText, { flex: 1 }]}>{item.currency === "COP" ? `COP ${item.amountCop ?? 0}` : `USD ${item.amountUsd ?? 0}`}</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>{item.metodoPago ?? "—"}</Text>
            <Text style={[styles.cellText, { flex: 1.5 }]} numberOfLines={1}>{item.wompiReference}</Text>
          </View>
        ))}
      </SectionCard>
    </AdminShell>
  );
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CO");
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
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
