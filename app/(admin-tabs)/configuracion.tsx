import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminConfigService } from "@/lib/services/adminService";
import { ActionButton, EmptyState, SectionCard, StatCard, StatusBadge } from "./_components/AdminUi";

export default function AdminConfiguracionScreen() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<number[]>([]);

  const { data: overview } = useQuery({ queryKey: ["admin-config-overview"], queryFn: adminConfigService.getOverview });
  const { data: selectedRole } = useQuery({
    queryKey: ["admin-config-role", selectedRoleId],
    queryFn: () => adminConfigService.getRole(selectedRoleId!),
    enabled: selectedRoleId != null,
  });

  useEffect(() => {
    if (overview?.roles.length && selectedRoleId == null) {
      setSelectedRoleId(overview.roles[0].id);
    }
  }, [overview, selectedRoleId]);

  useEffect(() => {
    if (selectedRole) {
      const ids = selectedRole.permisos
        .filter((permiso) => selectedRole.assignedCodes.includes(permiso.codigo))
        .map((permiso) => permiso.id);
      setSelectedPermisos(ids);
    }
  }, [selectedRole]);

  const saveMutation = useMutation({
    mutationFn: () => adminConfigService.updateRolePermissions(selectedRoleId!, selectedPermisos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-config-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-config-role", selectedRoleId] });
    },
  });

  return (
    <AdminShell title="Configuracion">
      <View style={styles.statsGrid}>
        <StatCard label="Roles" value={overview?.roles.length ?? 0} />
        <StatCard label="Permisos" value={overview?.permisos.length ?? 0} tone="green" />
        <StatCard label="Modulos" value={overview?.modulos.length ?? 0} tone="amber" />
      </View>

      <SectionCard title="Mapa de modulos">
        {!overview?.modulos.length ? <EmptyState label="No hay modulos registrados." /> : (
          <View style={styles.moduleGrid}>
            {overview.modulos.map((modulo) => (
              <View key={modulo.id} style={styles.moduleCard}>
                <Text style={styles.primaryText}>{modulo.nombre}</Text>
                <Text style={styles.secondaryText}>{modulo.descripcion ?? "Sin descripcion"}</Text>
                <StatusBadge label={modulo.activo ? "Activo" : "Inactivo"} tone={modulo.activo ? "green" : "red"} />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Permisos por rol">
        {!overview?.roles.length ? <EmptyState label="No hay roles configurados." /> : (
          <View style={styles.configLayout}>
            <View style={styles.rolesColumn}>
              {overview.roles.map((role) => (
                <Pressable
                  key={role.id}
                  onPress={() => setSelectedRoleId(role.id)}
                  style={[styles.roleItem, selectedRoleId === role.id && styles.roleItemActive]}
                >
                  <Text style={[styles.roleName, selectedRoleId === role.id && styles.roleNameActive]}>{role.nombre}</Text>
                  <Text style={styles.secondaryText}>{role.permisos.length} permisos</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.permissionsColumn}>
              {!selectedRole ? <EmptyState label="Selecciona un rol para editar." /> : (
                <>
                  <View style={styles.permissionsHeader}>
                    <View>
                      <Text style={styles.sectionRoleTitle}>{selectedRole.rol?.nombre ?? "Rol"}</Text>
                      <Text style={styles.secondaryText}>Activa o desactiva permisos para este rol.</Text>
                    </View>
                    <ActionButton label={saveMutation.isPending ? "Guardando..." : "Guardar cambios"} onPress={() => saveMutation.mutate()} />
                  </View>

                  <ScrollView style={{ maxHeight: 420 }}>
                    <View style={styles.permissionGrid}>
                      {selectedRole.permisos.map((permiso) => {
                        const active = selectedPermisos.includes(permiso.id);
                        return (
                          <Pressable
                            key={permiso.id}
                            onPress={() => setSelectedPermisos((current) => active ? current.filter((id) => id !== permiso.id) : [...current, permiso.id])}
                            style={[styles.permissionItem, active && styles.permissionItemActive]}
                          >
                            <Text style={[styles.permissionCode, active && styles.permissionCodeActive]}>{permiso.codigo}</Text>
                            <Text style={styles.secondaryText}>{permiso.descripcion ?? "Sin descripcion"}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        )}
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moduleCard: {
    minWidth: 220,
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  configLayout: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  rolesColumn: { width: 220, gap: 8 },
  permissionsColumn: { flex: 1, gap: 12 },
  roleItem: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  roleItemActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  roleName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0F172A",
  },
  roleNameActive: {
    color: "#1D4ED8",
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
  permissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionRoleTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  permissionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  permissionItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  permissionItemActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  permissionCode: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#334155",
  },
  permissionCodeActive: {
    color: "#1D4ED8",
  },
});
