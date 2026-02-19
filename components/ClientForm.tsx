import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { type Cliente } from "@/lib/storage";

export type ClientFormData = Omit<Cliente, "id" | "fechaCreacion" | "abogadoId">;

type ClientFormProps = {
  initialData?: Partial<ClientFormData>;
  onSave: (data: ClientFormData) => Promise<void>;
  isLoading: boolean;
  error: string;
  isEditing?: boolean;
};

export function ClientForm({ initialData, onSave, isLoading, error, isEditing = false }: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>({
    nombre: initialData?.nombre || "",
    correo: initialData?.correo || "",
    telefono: initialData?.telefono || "",
    documento: initialData?.documento || "",
    password: initialData?.password || "",
    activo: initialData?.activo ?? true,
  });

  const updateField = (key: keyof ClientFormData, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave(form);
  };

  const fields = [
    { key: "nombre", label: "Nombre completo", icon: "person-outline" as const, placeholder: "Nombre del cliente", required: true },
    { key: "documento", label: "Documento de identidad", icon: "card-outline" as const, placeholder: "CC o NIT", required: true },
    { key: "correo", label: "Correo electronico", icon: "mail-outline" as const, placeholder: "cliente@correo.com", keyboard: "email-address" as const },
    { key: "telefono", label: "Telefono", icon: "call-outline" as const, placeholder: "+57 300 000 0000", keyboard: "phone-pad" as const },
    { key: "password", label: "Contrasena del portal", icon: "lock-closed-outline" as const, placeholder: isEditing ? "Dejar en blanco para no cambiar" : "Contrasena para acceso del cliente", required: !isEditing, secure: true },
  ];

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={styles.infoText}>El documento y contrasena permiten al cliente acceder al Portal del Cliente para consultar sus procesos.</Text>
        </View>

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
                value={String(form[field.key as keyof typeof form])}
                onChangeText={(v) => updateField(field.key as keyof ClientFormData, v)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType={field.keyboard || "default"}
                autoCapitalize={field.key === "correo" ? "none" : field.secure ? "none" : "words"}
                secureTextEntry={!!field.secure}
              />
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={isLoading}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, isLoading && styles.saveBtnDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{isEditing ? "Guardar Cambios" : "Guardar Cliente"}</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.infoLight,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.info,
    flex: 1,
    lineHeight: 18,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
