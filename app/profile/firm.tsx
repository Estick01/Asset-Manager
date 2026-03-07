/**
 * Firm Profile Screen
 * 
 * Display and edit firm profile information.
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/config";
import { apiRequest } from "@/lib/query-client";

export default function FirmProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile } = useAuth();
  
  const [form, setForm] = useState({
    firmName: "",
    nit: "",
    address: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);


useEffect(() => {
  // Get firm profile data from profile or user
  const firmProfile = profile && 'nit' in profile ? profile : null;
  
  if (firmProfile) {
    setForm({
      firmName: firmProfile.name || "",
      nit: firmProfile.nit || "",
      phone: firmProfile.phone || "",
      address: firmProfile.address || "",
    });
  } else if (user?.user) {
    // Fallback to user data
    setForm({
      firmName: user.user.name || "",
      nit: "",
      phone: "",
      address: "",
    });
  }
  setInitialLoading(false);    
}, [user, profile]);

  const updateField = (key: string, value: string) => 
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
        Alert.alert("Éxito", "Perfil actualizado correctamente");
        setEditing(false);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.error || "Error al actualizar el perfil");
      }
    } catch (err) {
      Alert.alert("Error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form to original values
    setForm({
      firmName: "",
      nit: "",
      address: "",
      phone: "",
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Perfil del Bufete</Text>
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
              <Ionicons name="business" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.profileIconText}>Bufete</Text>
          </View>

          {/* Profile Form */}
          <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Bufete *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.firmName}
                onChangeText={(v) => updateField("firmName", v)}
                placeholder="Nombre de tu bufete"
                placeholderTextColor={Colors.textTertiary}
                editable={editing}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIT</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.nit}
                onChangeText={(v) => updateField("nit", v)}
                placeholder="123456789-0"
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
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>Empresarial</Text>
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
