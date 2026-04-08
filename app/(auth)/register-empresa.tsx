/**
 * Register Empresa Screen
 * Self-registration for company clients
 */

import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { API_URL } from "@/lib/config";

export default function RegisterEmpresaScreen() {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    razonSocial: "",
    nit: "",
    sector: "",
    email: "",
    password: "",
    confirmPassword: "",
    // representante legal
    repNombre: "",
    repApellido: "",
    repDocumento: "",
    repCargo: "Representante Legal",
    repEmail: "",
    repTelefono: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.razonSocial.trim() || !form.nit.trim()) {
      setError("Razón social y NIT son obligatorios");
      return;
    }
    if (!form.email.trim() || !form.password.trim()) {
      setError("Correo y contraseña son obligatorios");
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
      const response = await fetch(`${API_URL}/api/register/empresa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razonSocial: form.razonSocial,
          nit: form.nit,
          sector: form.sector || undefined,
          correo: form.email,
          password: form.password,
          repNombre: form.repNombre || undefined,
          repApellido: form.repApellido || undefined,
          repDocumento: form.repDocumento || undefined,
          repCargo: form.repCargo || undefined,
          repEmail: form.repEmail || undefined,
          repTelefono: form.repTelefono || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Error al registrar");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: form.email, next: "/login" },
      } as any);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0D3B66", "#1B5A8C", "#2980B9"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Empresa / Persona Jurídica</Text>

          <View style={styles.form}>
            {/* Datos empresa */}
            <Text style={styles.sectionLabel}>Datos de la Empresa</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Razón social *</Text>
              <TextInput style={styles.input} value={form.razonSocial} onChangeText={v => update("razonSocial", v)}
                placeholder="Nombre legal de la empresa" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="words" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NIT *</Text>
              <TextInput style={styles.input} value={form.nit} onChangeText={v => update("nit", v)}
                placeholder="900.000.000-0" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sector</Text>
              <TextInput style={styles.input} value={form.sector} onChangeText={v => update("sector", v)}
                placeholder="Tecnología, construcción..." placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="words" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Correo de acceso *</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={v => update("email", v)}
                placeholder="empresa@ejemplo.com" placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Contraseña *</Text>
                <TextInput style={styles.input} value={form.password} onChangeText={v => update("password", v)}
                  placeholder="Mínimo 6 caracteres" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Confirmar *</Text>
                <TextInput style={styles.input} value={form.confirmPassword} onChangeText={v => update("confirmPassword", v)}
                  placeholder="Repite la contraseña" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
              </View>
            </View>

            {/* Representante legal */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Representante Legal</Text>
            <Text style={styles.sectionHint}>Opcional — puede completarse después</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={form.repNombre} onChangeText={v => update("repNombre", v)}
                  placeholder="Nombre" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="words" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput style={styles.input} value={form.repApellido} onChangeText={v => update("repApellido", v)}
                  placeholder="Apellido" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="words" />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Documento</Text>
              <TextInput style={styles.input} value={form.repDocumento} onChangeText={v => update("repDocumento", v)}
                placeholder="Número de documento" placeholderTextColor="rgba(255,255,255,0.4)" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Cargo</Text>
              <TextInput style={styles.input} value={form.repCargo} onChangeText={v => update("repCargo", v)}
                placeholder="Representante Legal" placeholderTextColor="rgba(255,255,255,0.4)" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email del representante</Text>
              <TextInput style={styles.input} value={form.repEmail} onChangeText={v => update("repEmail", v)}
                placeholder="rep@empresa.com" placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Teléfono del representante</Text>
              <TextInput style={styles.input} value={form.repTelefono} onChangeText={v => update("repTelefono", v)}
                placeholder="300 000 0000" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="phone-pad" />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Crear Cuenta Empresa</Text>
              }
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>¿Ya tienes cuenta? Inicia sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  back: { marginBottom: 16 },
  title: { fontSize: 30, fontWeight: "bold", color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 28 },
  form: { gap: 14 },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: Colors.white, marginTop: 4 },
  sectionHint: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: -8 },
  row: { flexDirection: "row", gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.85)" },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, padding: 14,
    color: Colors.white, fontSize: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  error: { color: Colors.danger, fontSize: 13, textAlign: "center" },
  btn: { backgroundColor: "#1B5A8C", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  loginLink: { alignItems: "center", paddingVertical: 8 },
  loginLinkText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
});
