import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminStatsService, type AdminStats } from "@/lib/services/adminService";
import { Ionicons } from "@expo/vector-icons";

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:  string;
  value:  string | number;
  icon:   keyof typeof Ionicons.glyphMap;
  color:  string;
  sub?:   string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.cardIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
        {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style:                "currency",
    currency:             "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  () => adminStatsService.getStats(),
    staleTime: 60_000,
  });

  const stats: AdminStats | undefined = data?.data;

  return (
    <AdminShell title="Dashboard">
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando métricas...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            Error al cargar las métricas. Intenta recargar la página.
          </Text>
        </View>
      )}

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Resumen general</Text>
          <View style={styles.grid}>
            <StatCard
              label="Usuarios registrados"
              value={stats.totalUsuarios.toLocaleString("es-CO")}
              icon="people-outline"
              color="#2563EB"
              sub={`+${stats.nuevosEsteMes} este mes`}
            />
            <StatCard
              label="Suscripciones activas"
              value={stats.suscripcionesActivas.toLocaleString("es-CO")}
              icon="checkmark-circle-outline"
              color="#16A34A"
            />
            <StatCard
              label="Ingresos estimados / mes"
              value={formatCOP(stats.ingresosEstimadosCop)}
              icon="card-outline"
              color="#9333EA"
              sub="Solo suscripciones activas"
            />
            <StatCard
              label="Procesos activos"
              value={stats.totalProcesos.toLocaleString("es-CO")}
              icon="document-text-outline"
              color="#EA580C"
            />
            <StatCard
              label="Nuevos usuarios este mes"
              value={stats.nuevosEsteMes.toLocaleString("es-CO")}
              icon="person-add-outline"
              color="#0891B2"
            />
          </View>
        </>
      )}
    </AdminShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1E293B",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    flex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1E293B",
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  cardSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    marginTop: 2,
  },
});
