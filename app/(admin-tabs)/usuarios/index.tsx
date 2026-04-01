// app/(admin-tabs)/usuarios/index.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";
import {
  adminUsersService,
  type ListUsersParams,
  type UserAdminRow,
} from "@/lib/services/adminService";

// ── Tipos de filtro ───────────────────────────────────────────────────────────

type TipoFiltro   = "todos" | "abogado" | "bufete" | "cliente";
type EstadoFiltro = "todos" | "activo" | "suspendido";

// ── Componentes auxiliares ────────────────────────────────────────────────────

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
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <View style={[styles.badge, activo ? styles.badgeActivo : styles.badgeSuspendido]}>
      <Text style={[styles.badgeText, activo ? styles.badgeTextoActivo : styles.badgeTextoSuspendido]}>
        {activo ? "Activo" : "Suspendido"}
      </Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function UsuariosScreen() {
  const [page,   setPage]   = useState(1);
  const [tipo,   setTipo]   = useState<TipoFiltro>("todos");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const LIMIT = 20;

  const tipoParam:   ListUsersParams["tipo"]   = tipo   !== "todos" ? tipo   : undefined;
  const estadoParam: ListUsersParams["estado"] = estado !== "todos" ? estado : undefined;
  const searchParam: string | undefined        = search || undefined;

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["admin-users", page, LIMIT, tipoParam, estadoParam, searchParam],
    queryFn:  () => adminUsersService.list({
      page,
      limit:  LIMIT,
      tipo:   tipoParam,
      estado: estadoParam,
      search: searchParam,
    }),
    staleTime: 30_000,
  });

  const usuarios: UserAdminRow[] = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleTipo(value: TipoFiltro) {
    setTipo(value);
    setPage(1);
  }

  function handleEstado(value: EstadoFiltro) {
    setEstado(value);
    setPage(1);
  }

  return (
    <AdminShell title="Usuarios" scrollable={false}>
      {/* Barra de búsqueda */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable onPress={handleSearch} style={styles.searchBtn}>
          <Ionicons name="search-outline" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tipo:</Text>
          {(["todos", "abogado", "bufete", "cliente"] as const).map(t => (
            <FilterChip
              key={t}
              label={t === "todos" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
              active={tipo === t}
              onPress={() => handleTipo(t)}
            />
          ))}
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Estado:</Text>
          {(["todos", "activo", "suspendido"] as const).map(e => (
            <FilterChip
              key={e}
              label={e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
              active={estado === e}
              onPress={() => handleEstado(e)}
            />
          ))}
        </View>
      </View>

      {/* Estados de carga / error */}
      {(isLoading || isFetching) && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
      {isError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>Error al cargar usuarios.</Text>
        </View>
      )}

      {/* Tabla */}
      {!isLoading && !isFetching && !isError && (
        <>
          {/* Encabezado */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Nombre</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Email</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Tipo</Text>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>Plan</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Estado</Text>
          </View>

          {usuarios.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
            </View>
          )}

          {usuarios.map(u => (
            <Pressable
              key={u.id}
              onPress={() => router.push(`/(admin-tabs)/usuarios/${u.id}` as any)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                {u.name ?? "—"}
              </Text>
              <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                {u.email}
              </Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>
                {u.rol?.nombre ?? "—"}
              </Text>
              <Text style={[styles.cell, { flex: 1.5 }]} numberOfLines={1}>
                {u.plan?.nombre ?? "—"}
              </Text>
              <View style={{ flex: 1 }}>
                <EstadoBadge activo={u.isActive} />
              </View>
            </Pressable>
          ))}

          {/* Paginación */}
          {meta && meta.total > 0 && (
            <View style={styles.pagination}>
              <Pressable
                onPress={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page <= 1}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Ionicons name="chevron-back-outline" size={16} color={page <= 1 ? "#CBD5E1" : "#2563EB"} />
                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Anterior</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                Página {page} · {meta.total} usuarios
              </Text>
              <Pressable
                onPress={() => setPage(p => p + 1)}
                disabled={page * LIMIT >= meta.total}
                style={[styles.pageBtn, page * LIMIT >= meta.total && styles.pageBtnDisabled]}
              >
                <Text style={[styles.pageBtnText, page * LIMIT >= meta.total && styles.pageBtnTextDisabled]}>Siguiente</Text>
                <Ionicons name="chevron-forward-outline" size={16} color={page * LIMIT >= meta.total ? "#CBD5E1" : "#2563EB"} />
              </Pressable>
            </View>
          )}
        </>
      )}
    </AdminShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    backgroundColor: "#fff",
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filters: {
    gap: 8,
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#2563EB",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerCell: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  cell: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1E293B",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActivo: {
    backgroundColor: "#DCFCE7",
  },
  badgeSuspendido: {
    backgroundColor: "#FEF2F2",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  badgeTextoActivo: {
    color: "#16A34A",
  },
  badgeTextoSuspendido: {
    color: "#DC2626",
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  pageBtnDisabled: {
    borderColor: "#E2E8F0",
  },
  pageBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
  },
  pageBtnTextDisabled: {
    color: "#CBD5E1",
  },
  pageInfo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
});
