import React, { useEffect, useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import {
  getLawyerProfileByid,
  updateLawyerProfile,
} from "@/lib/services/abogadoService";

interface LawyerForm {
  firstName: string;
  lastName: string;
  licenseNumber: string;
  specialization: string;
  phone: string;
  address: string;
}

const EMPTY_FORM: LawyerForm = {
  firstName: "",
  lastName: "",
  licenseNumber: "",
  specialization: "",
  phone: "",
  address: "",
};

/* -------------------------------------------------------------------------- */
/*                               COMPONENT                                    */
/* -------------------------------------------------------------------------- */

export default function LawyerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [form, setForm] = useState<LawyerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [lawyerEmail, setLawyerEmail] = useState<string | null>(null);
  const [lawyerFirm, setLawyerFirm] = useState<{ id: string; name: string } | null>(null);

  const isOwnProfile = !id;
  const savedForm = useRef<LawyerForm>(EMPTY_FORM);

  /* -------------------------------------------------------------------------- */
  /*                              LOAD LAWYER                                   */
  /* -------------------------------------------------------------------------- */

  const loadLawyer = async () => {
    try {
      if (id) {
        const lawyer = await getLawyerProfileByid(id);
        if (lawyer) {
          const loaded: LawyerForm = {
            firstName: lawyer.firstName ?? "",
            lastName: lawyer.lastName ?? "",
            licenseNumber: lawyer.licenseNumber ?? "",
            specialization: lawyer.specialization ?? "",
            phone: lawyer.phone ?? "",
            address: lawyer.address ?? "",
          };
          setForm(loaded);
          savedForm.current = loaded;
          setLawyerEmail(lawyer.user?.email ?? null);
          setLawyerFirm(lawyer.firm ?? null);
        }
        return;
      }

      const lawyerProfile = profile && "firstName" in profile ? profile : null;
      if (lawyerProfile) {
        const loaded: LawyerForm = {
          firstName: lawyerProfile.firstName ?? "",
          lastName: lawyerProfile.lastName ?? "",
          licenseNumber: lawyerProfile.licenseNumber ?? "",
          specialization: lawyerProfile.specialization ?? "",
          phone: lawyerProfile.phone ?? "",
          address: lawyerProfile.address ?? "",
        };
        setForm(loaded);
        savedForm.current = loaded;
      }
    } catch {
      Alert.alert("Error", "No se pudo cargar el perfil");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadLawyer();
  }, [id, profile]);

  /* -------------------------------------------------------------------------- */
  /*                               FORM HANDLERS                                */
  /* -------------------------------------------------------------------------- */

  const updateField = (key: keyof LawyerForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert("Error", "El nombre y apellido son requeridos");
      return;
    }

    setLoading(true);
    try {
      const result = await updateLawyerProfile(form);
      if (result) {
        savedForm.current = form;
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setEditing(false);
        loadLawyer();
      } else {
        Alert.alert("Error", "Error al actualizar el perfil");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Error de conexión");
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
    editing && isOwnProfile && focusedField === field
      ? Colors.primary
      : Colors.border;

  /* -------------------------------------------------------------------------- */
  /*                                 LOADING                                    */
  /* -------------------------------------------------------------------------- */

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                 RENDER                                     */
  /* -------------------------------------------------------------------------- */

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>
          {isOwnProfile ? "Mi Perfil" : "Perfil del Abogado"}
        </Text>

        {isOwnProfile ? (
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
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={44} color={Colors.white} />
            </View>
          </View>

          <Text style={styles.avatarName}>
            {form.firstName || form.lastName
              ? `${form.firstName} ${form.lastName}`.trim()
              : "Sin nombre"}
          </Text>

          {form.specialization ? (
            <Text style={styles.avatarSpecialization}>{form.specialization}</Text>
          ) : null}

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Abogado</Text>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información Personal</Text>

          {/* Name row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Nombre *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: inputBorder("firstName") },
                  !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={form.firstName}
                  onChangeText={(v) => updateField("firstName", v)}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Juan"
                  placeholderTextColor={Colors.textTertiary}
                  editable={editing && isOwnProfile}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Apellido *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: inputBorder("lastName") },
                  !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={form.lastName}
                  onChangeText={(v) => updateField("lastName", v)}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Pérez"
                  placeholderTextColor={Colors.textTertiary}
                  editable={editing && isOwnProfile}
                />
              </View>
            </View>
          </View>

          {/* License */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Tarjeta Profesional</Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: inputBorder("licenseNumber") },
                !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
              ]}
            >
              <Ionicons
                name="card-outline"
                size={18}
                color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={form.licenseNumber}
                onChangeText={(v) => updateField("licenseNumber", v)}
                onFocus={() => setFocusedField("licenseNumber")}
                onBlur={() => setFocusedField(null)}
                placeholder="123456789"
                placeholderTextColor={Colors.textTertiary}
                editable={editing && isOwnProfile}
              />
            </View>
          </View>

          {/* Specialization */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Especialidad</Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: inputBorder("specialization") },
                !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
              ]}
            >
              <Ionicons
                name="school-outline"
                size={18}
                color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={form.specialization}
                onChangeText={(v) => updateField("specialization", v)}
                onFocus={() => setFocusedField("specialization")}
                onBlur={() => setFocusedField(null)}
                placeholder="Civil, Penal, Laboral..."
                placeholderTextColor={Colors.textTertiary}
                editable={editing && isOwnProfile}
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
                !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
              ]}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
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
                editable={editing && isOwnProfile}
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
                !(editing && isOwnProfile) && styles.inputWrapperReadOnly,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={editing && isOwnProfile ? Colors.primary : Colors.textTertiary}
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
                editable={editing && isOwnProfile}
              />
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        {editing && isOwnProfile && (
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

        {/* ACCOUNT INFO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información de la Cuenta</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={Colors.textTertiary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoLabel}>Correo electrónico</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {isOwnProfile
                ? user?.user?.email || "No disponible"
                : lawyerEmail || "No disponible"}
            </Text>
          </View>

          {!isOwnProfile && lawyerFirm && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={Colors.textTertiary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoLabel}>Bufete</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>
                {lawyerFirm.name}
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoLabelRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={Colors.textTertiary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoLabel}>Estado</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Activo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  STYLES                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
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

  /* Content */
  content: {
    padding: 20,
    paddingBottom: 48,
  },

  /* Avatar */
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
    marginBottom: 4,
  },
  avatarSpecialization: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
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

  /* Row layout */
  row: { flexDirection: "row", gap: 12 },
  halfWidth: { flex: 1 },

  /* Inputs */
  inputGroup: { marginBottom: 16 },
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
  inputIcon: { marginLeft: 12 },
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
  infoIcon: { marginRight: 6 },
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
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
});
