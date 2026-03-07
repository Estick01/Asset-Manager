/**
 * Register Lawyer Screen
 * 
 * Registration form for independent lawyers.
 * Uses the new unified authentication system.
 */

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { loginUnified } from "@/lib/auth/unified";
import { API_URL } from "@/lib/config";
import { EnumRol } from "@/shared/schema/user.schema";

// Helper to get redirect path based on role
const getRedirectPath = (role: string): "/(tabs)" | "/(firm-tabs)" | "/(lawyer-tabs)" | "/portal" => {
  switch (role?.toLowerCase()) {
    case EnumRol.BUFETE:   return "/(firm-tabs)";
    case EnumRol.ABOGADO:  return "/(lawyer-tabs)";
    case EnumRol.CLIENTE:  return "/portal";
    case EnumRol.ADMIN:    return "/(tabs)";
    default:               return "/(firm-tabs)";
  }
};

export default function RegisterLawyerScreen() {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    specialty: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => 
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim() || !form.licenseNumber.trim()) {
      setError("Completa los campos obligatorios");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Call the registration API with role LAWYER
      const response = await fetch(`${API_URL}/api/register/lawyer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: 'LAWYER',
          firstName: form.firstName,
          lastName: form.lastName,
          licenseNumber: form.licenseNumber,
          specialty: form.specialty || null,
          phone: form.phone || null,
          isIndependent: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al registrar. Intenta de nuevo.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // On success, use unified login to authenticate with the new system
      const user = await loginUnified(form.email, form.password);
      if (user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        router.replace(getRedirectPath(user.user.rol?.nombre!) as any);
      } else {
        setError("Error al iniciar sesión después del registro.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setError("Error al conectar con el servidor");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={Colors.gradientPrimary}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>

          <Text style={styles.title}>Registrarse</Text>
          <Text style={styles.subtitle}>Como Abogado Independiente</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan"
                  placeholderTextColor={Colors.textTertiary}
                  value={form.firstName}
                  onChangeText={(v) => updateField("firstName", v)}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apellido *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pérez"
                  placeholderTextColor={Colors.textTertiary}
                  value={form.lastName}
                  onChangeText={(v) => updateField("lastName", v)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico *</Text>
              <TextInput
                style={styles.input}
                placeholder="juan@ejemplo.com"
                placeholderTextColor={Colors.textTertiary}
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="300 123 4567"
                placeholderTextColor={Colors.textTertiary}
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de tarjeta profesional *</Text>
              <TextInput
                style={styles.input}
                placeholder="123456789"
                placeholderTextColor={Colors.textTertiary}
                value={form.licenseNumber}
                onChangeText={(v) => updateField("licenseNumber", v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Especialidad</Text>
              <TextInput
                style={styles.input}
                placeholder="Civil, Penal, Laboral..."
                placeholderTextColor={Colors.textTertiary}
                value={form.specialty}
                onChangeText={(v) => updateField("specialty", v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textTertiary}
                value={form.password}
                onChangeText={(v) => updateField("password", v)}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar contraseña *</Text>
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor={Colors.textTertiary}
                value={form.confirmPassword}
                onChangeText={(v) => updateField("confirmPassword", v)}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    color: Colors.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
