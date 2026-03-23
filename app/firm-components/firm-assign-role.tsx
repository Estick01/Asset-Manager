/**
 * Firm Assign Role Screen
 * Lets a firm assign one of its custom roles to a member lawyer.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { FirmRol, getFirmRoles, getLawyerFirmRol, assignFirmRolToLawyer } from "@/lib/services/firmRolesService";

export default function FirmAssignRoleScreen() {
  const insets = useSafeAreaInsets();
  const { lawyerId, nombre } = useLocalSearchParams<{ lawyerId: string; nombre: string }>();

  const [roles, setRoles] = useState<FirmRol[]>([]);
  // undefined = still loading; null = no firm role; number = role id
  const [selected, setSelected] = useState<number | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getFirmRoles(),
      getLawyerFirmRol(lawyerId!),
    ])
      .then(([r, currentRolId]) => {
        setRoles(r);
        setSelected(currentRolId);
      })
      .catch(() => toast.error("Error al cargar roles"))
      .finally(() => setLoading(false));
  }, [lawyerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rolId = selected ?? null;
      await assignFirmRolToLawyer(lawyerId!, rolId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(rolId ? "Rol asignado correctamente" : "Rol eliminado correctamente");
      router.back();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Asignar Rol</Text>
          {nombre ? <Text style={styles.subtitle}>{decodeURIComponent(nombre)}</Text> : null}
        </View>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Selecciona un rol personalizado</Text>

          {/* None / clear option */}
          <Pressable
            style={({ pressed }) => [
              styles.rolCard,
              selected === null && styles.rolCardSelected,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => setSelected(null)}
          >
            <View style={[styles.rolIcon, selected === null && styles.rolIconSelected]}>
              <Ionicons
                name="remove-circle-outline"
                size={20}
                color={selected === null ? Colors.primary : Colors.textTertiary}
              />
            </View>
            <View style={styles.rolInfo}>
              <Text style={[styles.rolName, selected === null && styles.rolNameSelected]}>
                Sin rol personalizado
              </Text>
              <Text style={styles.rolDesc}>Usar el rol global del abogado</Text>
            </View>
            {selected === null && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </Pressable>

          {roles.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                No tienes roles personalizados creados.{"\n"}
                Crea uno desde Ajustes → Gestionar Permisos.
              </Text>
            </View>
          ) : (
            roles.map(rol => (
              <Pressable
                key={rol.id}
                style={({ pressed }) => [
                  styles.rolCard,
                  selected === rol.id && styles.rolCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setSelected(rol.id)}
              >
                <View style={[styles.rolIcon, selected === rol.id && styles.rolIconSelected]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={selected === rol.id ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <View style={styles.rolInfo}>
                  <Text style={[styles.rolName, selected === rol.id && styles.rolNameSelected]}>
                    {rol.nombre}
                  </Text>
                  {rol.descripcion ? (
                    <Text style={styles.rolDesc}>{rol.descripcion}</Text>
                  ) : null}
                </View>
                {selected === rol.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </Pressable>
            ))
          )}

          <Text style={styles.hint}>
            El rol personalizado reemplaza completamente los permisos del rol global
            mientras el abogado pertenezca a tu bufete.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Guardar cambios</Text>
            }
          </Pressable>
        </ScrollView>
      )}
    </View>
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
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },

  content: { padding: 16, paddingBottom: 40, gap: 10 },

  sectionLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },

  rolCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: "transparent",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rolCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + "10",
  },
  rolIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
  },
  rolIconSelected: {
    backgroundColor: Colors.primaryLight + "30",
  },
  rolInfo: { flex: 1 },
  rolName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rolNameSelected: { color: Colors.primary },
  rolDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  emptyBox: {
    alignItems: "center", gap: 10, padding: 24,
    backgroundColor: Colors.white, borderRadius: 14,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  hint: {
    fontSize: 12, color: Colors.textTertiary, lineHeight: 18,
    textAlign: "center", marginTop: 4,
  },

  saveBtn: {
    backgroundColor: Colors.primary, paddingVertical: 15,
    borderRadius: 14, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
