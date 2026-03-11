/**
 * Firm Profile Screen
 *
 * Display and edit firm profile information.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";

interface FirmForm {
  firmName: string;
  nit: string;
  address: string;
  phone: string;
}

const EMPTY_FORM: FirmForm = {
  firmName: "",
  nit: "",
  address: "",
  phone: "",
};

export default function FirmProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [form, setForm] = useState<FirmForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Keep a snapshot of committed values to restore on cancel
  const savedForm = useRef<FirmForm>(EMPTY_FORM);

  useEffect(() => {
    const firmProfile = profile && "nit" in profile ? profile : null;

    const loaded: FirmForm = firmProfile
      ? {
          firmName: firmProfile.name || "",
          nit: firmProfile.nit || "",
          phone: firmProfile.phone || "",
          address: firmProfile.address || "",
        }
      : {
          firmName: user?.user?.name || "",
          nit: "",
          phone: "",
          address: "",
        };

    setForm(loaded);
    savedForm.current = loaded;
    setInitialLoading(false);
  }, [user, profile]);

  const updateField = (key: keyof FirmForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.firmName.trim()) {
      Alert.alert("Error", "El nombre del bufete es requerido");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("PUT", `/api/firm-profile`, form);

      if (response.ok) {
        savedForm.current = form;
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setEditing(false);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.error || "Error al actualizar el perfil");
      }
    } catch {
      Alert.alert("Error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm.current);
    setEditing(false);
    setFocusedField(null);
  };

  const inputBorder = (field: string) =>
    editing && focusedField === field
      ? Colors.primary
      : Colors.border;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Perfil del Bufete</Text>

        <Pressable
          onPress={() => {
            if (editing) handleCancel();
            else setEditing(true);
          }}
          style={styles.headerBtn}
        >
          <Ionicons
            name={editing ? "close" : "create-outline"}
            size={22}
            color={Colors.primary}
          />
        </Pressable>
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
              <Text style={styles.avatarName}>
                {form.firmName || "Sin nombre"}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Bufete</Text>
              </View>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Información del Bufete</Text>

              {/* Firm name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre del Bufete *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderColor: inputBorder("firmName") },
                    !editing && styles.inputWrapperReadOnly,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={editing ? Colors.primary : Colors.textTertiary}
                    style={styles.inputIcon}
                  />
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

              {/* NIT */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NIT</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderColor: inputBorder("nit") },
                    !editing && styles.inputWrapperReadOnly,
                  ]}
                >
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={editing ? Colors.primary : Colors.textTertiary}
                    style={styles.inputIcon}
                  />
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

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderColor: inputBorder("phone") },
                    !editing && styles.inputWrapperReadOnly,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={editing ? Colors.primary : Colors.textTertiary}
                    style={styles.inputIcon}
                  />
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

              {/* Address */}
              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>Dirección</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderColor: inputBorder("address") },
                    !editing && styles.inputWrapperReadOnly,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={editing ? Colors.primary : Colors.textTertiary}
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

            {/* Action Buttons */}
            {editing && (
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    pressed && styles.pressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Account info */}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },

  /* Avatar */
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight + "22",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight + "44",
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryLight,
  },

  /* Card */
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },

  /* Inputs */
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputWrapperReadOnly: {
    backgroundColor: Colors.background,
    borderColor: Colors.borderLight,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },

  /* Buttons */
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  pressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.6 },

  /* Info rows */
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    marginRight: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    maxWidth: "55%",
    textAlign: "right",
  },
  planBadge: {
    backgroundColor: Colors.accentLight + "33",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accent + "55",
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentDark,
  },
});
