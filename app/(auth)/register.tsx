import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({ nombre: "", correo: "", password: "", despacho: "", telefono: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.nombre.trim() || !form.correo.trim() || !form.password.trim() || !form.despacho.trim()) {
      setError("Completa los campos obligatorios");
      return;
    }
    if (form.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        password: form.password,
        despacho: form.despacho.trim(),
        telefono: form.telefono.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
      router.replace("/(tabs)");
    } catch {
      setError("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "nombre", label: "Nombre completo", icon: "person-outline" as const, placeholder: "Dr. Juan Perez", required: true },
    { key: "despacho", label: "Nombre del despacho", icon: "business-outline" as const, placeholder: "Perez & Asociados", required: true },
    { key: "correo", label: "Correo electronico", icon: "mail-outline" as const, placeholder: "tu@correo.com", keyboard: "email-address" as const, required: true },
    { key: "telefono", label: "Telefono", icon: "call-outline" as const, placeholder: "+57 300 000 0000", keyboard: "phone-pad" as const, required: false },
    { key: "password", label: "Contrasena", icon: "lock-closed-outline" as const, placeholder: "Minimo 6 caracteres", secure: true, required: true },
  ];

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Registra tu despacho en LexTrack</Text>
          </View>

          <View style={styles.formCard}>
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {fields.map((field) => (
              <View key={field.key} style={styles.inputGroup}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name={field.icon} size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form[field.key as keyof typeof form]}
                    onChangeText={(v) => updateField(field.key, v)}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType={field.keyboard || "default"}
                    secureTextEntry={!!field.secure}
                    autoCapitalize={field.key === "correo" ? "none" : "words"}
                  />
                </View>
              </View>
            ))}

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [styles.registerBtn, pressed && styles.registerBtnPressed, loading && styles.registerBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.registerBtnText}>Registrarse</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  required: {
    color: Colors.danger,
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
    paddingVertical: 13,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
