import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { saveCliente } from "@/lib/storage";

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [form, setForm] = useState({ nombre: "", correo: "", telefono: "", documento: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      await saveCliente({
        abogadoId: user.id,
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        documento: form.documento.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "nombre", label: "Nombre completo", icon: "person-outline" as const, placeholder: "Nombre del cliente", required: true },
    { key: "documento", label: "Documento de identidad", icon: "card-outline" as const, placeholder: "CC o NIT" },
    { key: "correo", label: "Correo electronico", icon: "mail-outline" as const, placeholder: "cliente@correo.com", keyboard: "email-address" as const },
    { key: "telefono", label: "Telefono", icon: "call-outline" as const, placeholder: "+57 300 000 0000", keyboard: "phone-pad" as const },
  ];

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo Cliente</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                  autoCapitalize={field.key === "correo" ? "none" : "words"}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, loading && styles.saveBtnDisabled]}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Guardar Cliente</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 16,
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
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  required: { color: Colors.danger },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
