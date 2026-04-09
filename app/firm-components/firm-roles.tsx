/**
 * Firm Roles Screen
 * Manage custom roles for the firm and their permissions.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import {
  FirmRol,
  Permiso,
  getFirmRoles,
  createFirmRol,
  deleteFirmRol,
  getFirmRolPermisos,
  setFirmRolPermisos,
  getAllPermisos,
} from "@/lib/services/firmRolesService";
import { useSubscription } from "@/lib/subscription-context";

export default function FirmRolesScreen() {
  const insets = useSafeAreaInsets();
  const { hasFeature, isLoading } = useSubscription();

  const [roles, setRoles] = useState<FirmRol[]>([]);
  const [allPermisos, setAllPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);

  // Create role modal
  const [showCreate, setShowCreate] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Permissions modal
  const [editingRol, setEditingRol] = useState<FirmRol | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<Set<number>>(new Set());
  const [savingPermisos, setSavingPermisos] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getFirmRoles(), getAllPermisos()]);
      setRoles(r);
      setAllPermisos(p);
    } catch {
      toast.error("Error al cargar los roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isLoading && !hasFeature("roles_custom")) {
      router.replace("/(firm-tabs)/settings" as any);
    }
  }, [hasFeature, isLoading]);

  // Group permisos by module
  const permisosGrouped = React.useMemo(() => {
    const groups: Record<string, Permiso[]> = {};
    for (const p of allPermisos) {
      const mod = p.codigo.split(".")[0];
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    }
    return groups;
  }, [allPermisos]);

  const openPermisos = async (rol: FirmRol) => {
    setEditingRol(rol);
    setLoadingPermisos(true);
    try {
      const current = await getFirmRolPermisos(rol.id);
      const currentIds = new Set(
        allPermisos.filter(p => current.includes(p.codigo)).map(p => p.id)
      );
      setSelectedPermisos(currentIds);
    } catch {
      toast.error("Error al cargar permisos del rol");
    } finally {
      setLoadingPermisos(false);
    }
  };

  const togglePermiso = (id: number) => {
    setSelectedPermisos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const savePermisos = async () => {
    if (!editingRol) return;
    setSavingPermisos(true);
    try {
      await setFirmRolPermisos(editingRol.id, Array.from(selectedPermisos));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Permisos guardados");
      setEditingRol(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingPermisos(false);
    }
  };

  const handleCreate = async () => {
    if (!newNombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setCreating(true);
    try {
      const created = await createFirmRol({ nombre: newNombre.trim(), descripcion: newDesc.trim() || undefined });
      setRoles(prev => [...prev, created]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Rol "${created.nombre}" creado`);
      setShowCreate(false);
      setNewNombre("");
      setNewDesc("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (rol: FirmRol) => {
    try {
      await deleteFirmRol(rol.id);
      setRoles(prev => prev.filter(r => r.id !== rol.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.success(`Rol "${rol.nombre}" eliminado`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <FeatureGate featureCode="roles_custom">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Roles del Bufete</Text>
        <Pressable onPress={() => setShowCreate(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {roles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin roles personalizados</Text>
              <Text style={styles.emptyText}>
                Crea roles para asignar permisos específicos a tus abogados.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Crear primer rol</Text>
              </Pressable>
            </View>
          ) : (
            roles.map(rol => (
              <View key={rol.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.rolIcon}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.rolName}>{rol.nombre}</Text>
                    {rol.descripcion ? (
                      <Text style={styles.rolDesc}>{rol.descripcion}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => openPermisos(rol)}
                  >
                    <Ionicons name="key-outline" size={20} color={Colors.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(rol)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Text style={styles.hint}>
            Toca el icono de llave para editar los permisos de un rol.{"\n"}
            Asigna roles a tus abogados desde la pantalla de equipo.
          </Text>
        </ScrollView>
      )}

      {/* Create role modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Rol</Text>
              <Pressable onPress={() => setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={newNombre}
              onChangeText={setNewNombre}
              placeholder="Ej: Socio, Junior, Pasante"
              placeholderTextColor={Colors.textTertiary}
              maxLength={50}
            />

            <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Breve descripción del rol"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={255}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setShowCreate(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Crear</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permissions modal */}
      <Modal visible={!!editingRol} transparent animationType="slide" onRequestClose={() => setEditingRol(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.permisoModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Permisos: {editingRol?.nombre}
              </Text>
              <Pressable onPress={() => setEditingRol(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {loadingPermisos ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.permisoScroll} showsVerticalScrollIndicator={false}>
                {Object.entries(permisosGrouped).map(([modulo, permisos]) => (
                  <View key={modulo} style={styles.permisoGroup}>
                    <Text style={styles.permisoGroupTitle}>{modulo.toUpperCase()}</Text>
                    {permisos.map(p => (
                      <View key={p.id} style={styles.permisoRow}>
                        <View style={styles.permisoInfo}>
                          <Text style={styles.permisoCodigo}>{p.codigo}</Text>
                          {p.descripcion ? (
                            <Text style={styles.permisoDesc}>{p.descripcion}</Text>
                          ) : null}
                        </View>
                        <Switch
                          value={selectedPermisos.has(p.id)}
                          onValueChange={() => togglePermiso(p.id)}
                          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                          thumbColor={selectedPermisos.has(p.id) ? Colors.primary : "#f4f3f4"}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setEditingRol(null)}
                disabled={savingPermisos}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, savingPermisos && { opacity: 0.6 }]}
                onPress={savePermisos}
                disabled={savingPermisos}
              >
                {savingPermisos
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Guardar</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },

  content: { padding: 16, paddingBottom: 40, gap: 12 },

  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", maxWidth: 280 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rolIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight + "22", alignItems: "center", justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  rolName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rolDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  deleteBtn: {},

  hint: {
    fontSize: 12, color: Colors.textTertiary, textAlign: "center",
    marginTop: 8, lineHeight: 18,
  },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, gap: 12 },
  permisoModal: { maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, flex: 1 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Permissions
  permisoScroll: { maxHeight: 380 },
  permisoGroup: { marginBottom: 16 },
  permisoGroupTitle: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
  },
  permisoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  permisoInfo: { flex: 1, paddingRight: 12 },
  permisoCodigo: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  permisoDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
