/**
 * Firm Profile Screen
 *
 * Display and edit firm profile information including representante legal.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { FirmProfile } from "@/shared/schema";

interface FirmForm {
  firmName: string;
  nit: string;
  address: string;
  phone: string;
  repNombre: string;
  repApellido: string;
  repCargo: string;
  repEmail: string;
  repTelefono: string;
}

const EMPTY_FORM: FirmForm = {
  firmName: "",
  nit: "",
  address: "",
  phone: "",
  repNombre: "",
  repApellido: "",
  repCargo: "",
  repEmail: "",
  repTelefono: "",
};

export default function FirmProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState<FirmForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const savedForm = useRef<FirmForm>(EMPTY_FORM);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiRequest("GET", "/api/firm-profile");
        if (res.ok) {
          const data = await res.json();
          const rep = data.representanteLegal;
          const loaded: FirmForm = {
            firmName: data.name || "",
            nit: data.nit || "",
            phone: data.phone || "",
            address: data.address || "",
            repNombre: rep?.persona?.nombre || "",
            repApellido: rep?.persona?.apellido || "",
            repCargo: rep?.cargo || "",
            repEmail: rep?.email || "",
            repTelefono: rep?.persona?.telefono || "",
          };
          setForm(loaded);
          savedForm.current = loaded;
        }
      } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateField = (key: keyof FirmForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.firmName.trim()) {
      toast.error("El nombre del bufete es requerido");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("PUT", `/api/firm-profile`, {
        name: form.firmName,
        nit: form.nit,
        address: form.address,
        phone: form.phone,
        repNombre: form.repNombre || undefined,
        repApellido: form.repApellido || undefined,
        repCargo: form.repCargo || undefined,
        repEmail: form.repEmail || undefined,
        repTelefono: form.repTelefono || undefined,
      });
      const data = await response.json();

      if (response.ok) {
        savedForm.current = form;
        // Actualizar contexto: perfil + nombre del usuario sincronizado
        await updateProfile({
          profile: data as FirmProfile,
          user: { ...user!.user, name: form.firmName },
        });
        toast.success("Perfil actualizado correctamente");
        router.back();
      } else {
        toast.error(data.error || "Error al actualizar el perfil");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm.current);
    setFocusedField(null);
    router.back();
  };

  const inputStyle = (field: string) => [
    styles.inputWrapper,
    { borderColor: editing && focusedField === field ? Colors.primary : Colors.border },
    !editing && styles.inputWrapperReadOnly,
  ];

  const iconColor = (field: string) =>
    editing && focusedField === field ? Colors.primary : Colors.textTertiary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Editar Perfil del Bufete</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Ionicons name="business" size={44} color={Colors.white} />
                </View>
              </View>
              <Text style={styles.avatarName}>{form.firmName || "Sin nombre"}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Bufete</Text>
              </View>
            </View>

            {/* Datos del bufete */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información del Bufete</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre del Bufete *</Text>
                <View style={inputStyle("firmName")}>
                  <Ionicons name="business-outline" size={18} color={iconColor("firmName")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.firmName}
                    onChangeText={(v) => updateField("firmName", v)}
                    onFocus={() => setFocusedField("firmName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Nombre de tu bufete"
                    placeholderTextColor={Colors.textTertiary}
                    editable={editing}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>NIT</Text>
                <View style={inputStyle("nit")}>
                  <Ionicons name="card-outline" size={18} color={iconColor("nit")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.nit}
                    onChangeText={(v) => updateField("nit", v)}
                    onFocus={() => setFocusedField("nit")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="123456789-0"
                    placeholderTextColor={Colors.textTertiary}
                    editable={editing}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <View style={inputStyle("phone")}>
                  <Ionicons name="call-outline" size={18} color={iconColor("phone")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={(v) => updateField("phone", v)}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+57 300 000 0000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    editable={editing}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>Dirección</Text>
                <View style={inputStyle("address")}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={iconColor("address")}
                    style={[styles.inputIcon, { alignSelf: "flex-start", marginTop: 16 }]}
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 60 }]}
                    value={form.address}
                    onChangeText={(v) => updateField("address", v)}
                    onFocus={() => setFocusedField("address")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Calle 123 #45-67"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    editable={editing}
                  />
                </View>
              </View>
            </View>

            {/* Representante Legal */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Representante Legal</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Nombre</Text>
                  <View style={inputStyle("repNombre")}>
                    <TextInput
                      style={[styles.input, { paddingLeft: 14 }]}
                      value={form.repNombre}
                      onChangeText={(v) => updateField("repNombre", v)}
                      onFocus={() => setFocusedField("repNombre")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Nombre"
                      placeholderTextColor={Colors.textTertiary}
                      editable={editing}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Apellido</Text>
                  <View style={inputStyle("repApellido")}>
                    <TextInput
                      style={[styles.input, { paddingLeft: 14 }]}
                      value={form.repApellido}
                      onChangeText={(v) => updateField("repApellido", v)}
                      onFocus={() => setFocusedField("repApellido")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Apellido"
                      placeholderTextColor={Colors.textTertiary}
                      editable={editing}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cargo</Text>
                <View style={inputStyle("repCargo")}>
                  <Ionicons name="briefcase-outline" size={18} color={iconColor("repCargo")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.repCargo}
                    onChangeText={(v) => updateField("repCargo", v)}
                    onFocus={() => setFocusedField("repCargo")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ej: Gerente General"
                    placeholderTextColor={Colors.textTertiary}
                    editable={editing}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo</Text>
                <View style={inputStyle("repEmail")}>
                  <Ionicons name="mail-outline" size={18} color={iconColor("repEmail")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.repEmail}
                    onChangeText={(v) => updateField("repEmail", v)}
                    onFocus={() => setFocusedField("repEmail")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="correo@empresa.com"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={editing}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>Teléfono</Text>
                <View style={inputStyle("repTelefono")}>
                  <Ionicons name="call-outline" size={18} color={iconColor("repTelefono")} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.repTelefono}
                    onChangeText={(v) => updateField("repTelefono", v)}
                    onFocus={() => setFocusedField("repTelefono")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+57 300 000 0000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    editable={editing}
                  />
                </View>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, loading && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  }
                </Pressable>
              </View>

            {/* Cuenta */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información de la Cuenta</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="mail-outline" size={16} color={Colors.textTertiary} style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Correo electrónico</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {user?.user?.email || "No disponible"}
                </Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="ribbon-outline" size={16} color={Colors.textTertiary} style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Plan</Text>
                </View>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>Empresarial</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { paddingVertical: 80, alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },

  content: { padding: 20, paddingBottom: 48 },

  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarRing: {
    padding: 3, borderRadius: 56, borderWidth: 2,
    borderColor: Colors.primaryLight, marginBottom: 12,
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  avatarName: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 6 },
  roleBadge: {
    backgroundColor: Colors.primaryLight + "22", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primaryLight + "44",
  },
  roleBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primaryLight },

  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16,
  },

  inputRow: { flexDirection: "row", gap: 10 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  inputWrapperReadOnly: { backgroundColor: Colors.background, borderColor: Colors.borderLight },
  inputIcon: { marginLeft: 12 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },

  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: "center",
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  cancelButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  saveButton: {
    flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  pressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.6 },

  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLabelRow: { flexDirection: "row", alignItems: "center" },
  infoIcon: { marginRight: 6 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, maxWidth: "55%", textAlign: "right" },
  planBadge: {
    backgroundColor: Colors.accentLight + "33", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.accent + "55",
  },
  planBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accentDark },
});
