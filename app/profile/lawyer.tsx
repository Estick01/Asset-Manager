/**
 * Lawyer Profile Screen
 * 
 * Display and edit lawyer profile information.
 */

import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { updateLawyerProfile } from "@/lib/services/abogadoService";

export default function LawyerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    licenseNumber: "",
    specialization: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialLoading] = useState(false);

  useEffect(() => {
    const lawyerProfile = profile && 'firstName' in profile ? profile : null;
    
    if (lawyerProfile) {
      setForm({
        firstName: lawyerProfile.firstName || "",
        lastName: lawyerProfile.lastName || "",
        licenseNumber: lawyerProfile.licenseNumber || "",
        specialization: lawyerProfile.specialization || "",
        phone: lawyerProfile.phone || "",
        address: lawyerProfile.address || "",
      });
    } else if (user?.user) {
      setForm({
        firstName: user.user.name || "",
        lastName: "",
        licenseNumber: "",
        specialization: "",
        phone: "",
        address: "",
      });
    }
  }, [user, profile]);


  const updateField = (key: string, value: string) => 
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
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setEditing(false);
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
    setEditing(false);
    setForm({
      firstName: "",
      lastName: "",
      licenseNumber: "",
      specialization: "",
      phone: "",
      address: "",
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Mi Perfil</Text>
        <Pressable onPress={() => setEditing(!editing)} style={styles.editButton}>
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
            {/* Profile Icon */}
            <View style={styles.profileIconContainer}>
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.profileIconText}>Abogado</Text>
            </View>

            {/* Profile Form */}
            <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Nombre *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.firstName}
                  onChangeText={(v) => updateField("firstName", v)}
                  placeholder="Juan"
                  placeholderTextColor={Colors.textTertiary}
                  editable={editing}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Apellido *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.lastName}
                  onChangeText={(v) => updateField("lastName", v)}
                  placeholder="Pérez"
                  placeholderTextColor={Colors.textTertiary}
                  editable={editing}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Tarjeta Profesional</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.licenseNumber}
                onChangeText={(v) => updateField("licenseNumber", v)}
                placeholder="123456789"
                placeholderTextColor={Colors.textTertiary}
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Especialidad</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="school-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.specialization}
                onChangeText={(v) => updateField("specialization", v)}
                placeholder="Civil, Penal, Laboral..."
                placeholderTextColor={Colors.textTertiary}
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                placeholder="+57 300 000 0000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => updateField("address", v)}
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
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
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

        {/* Account Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Información de la Cuenta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Correo electrónico</Text>
            <Text style={styles.infoValue}>{user?.user?.email || "No disponible"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <Text style={styles.infoValue}>Activo</Text>
          </View>
        </View>
        </>)}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  editButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileIconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  profileIconText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  form: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
});
