/**
 * Register Client Screen
 * 
 * Registration form for clients.
 * Uses the new unified authentication system.
 * Accessed from client portal login.
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

export default function RegisterClientScreen() {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    documentType: "cedula",
    documentNumber: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => 
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completa los campos obligatorios");
      return;
    }
    if (!form.documentNumber.trim()) {
      setError("Ingresa tu número de documento");
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
      // Call registration API with role CLIENT
      const response = await fetch(`${API_URL}/api/register/cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: 'CLIENT',
          firstName: form.firstName,
          lastName: form.lastName,
          documentType: form.documentType,
          documentNumber: form.documentNumber,
          phone: form.phone || null,
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
        // Redirect to portal for clients
        router.replace("/portal");
      } else {
        setError("Error al iniciar sesión después del registro.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setError("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0D3B66", "#1B5A8C", "#2980B9"]}
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

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Como Cliente</Text>

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
              <Text style={styles.label}>Tipo de documento *</Text>
              <View style={styles.selectWrapper}>
                <TextInput
                  style={[styles.input, styles.selectInput]}
                  value="Cédula de Ciudadanía"
                  editable={false}
                />
                <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} style={styles.selectIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de documento *</Text>
              <TextInput
                style={styles.input}
                placeholder="1234567890"
                placeholderTextColor={Colors.textTertiary}
                value={form.documentNumber}
                onChangeText={(v) => updateField("documentNumber", v)}
                keyboardType="number-pad"
              />
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
  selectWrapper: {
    position: "relative",
  },
  selectInput: {
    paddingRight: 40,
  },
  selectIcon: {
    position: "absolute",
    right: 16,
    top: 18,
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    backgroundColor: "#1B5A8C",
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
