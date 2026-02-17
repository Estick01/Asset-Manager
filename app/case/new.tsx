import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { saveProceso, getClientes, type Cliente } from "@/lib/storage";

const TIPOS_PROCESO = ["Civil", "Penal", "Laboral", "Administrativo", "Familia", "Comercial", "Constitucional", "Otro"];
const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "en_tramite", label: "En Tramite" },
  { value: "finalizado", label: "Finalizado" },
  { value: "archivado", label: "Archivado" },
] as const;

export default function NewCaseScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ clienteId?: string }>();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({
    clienteId: params.clienteId || "",
    tipoProceso: "",
    radicado: "",
    juzgado: "",
    estadoActual: "activo" as string,
    descripcionEstado: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showClientes, setShowClientes] = useState(false);
  const [showTipos, setShowTipos] = useState(false);

  useEffect(() => {
    if (user) {
      getClientes(user.id).then(setClientes);
    }
  }, [user]);

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectedCliente = clientes.find((c) => c.id === form.clienteId);

  const handleSave = async () => {
    if (!form.clienteId || !form.tipoProceso || !form.radicado.trim() || !form.juzgado.trim()) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      await saveProceso({
        abogadoId: user.id,
        clienteId: form.clienteId,
        tipoProceso: form.tipoProceso,
        radicado: form.radicado.trim(),
        juzgado: form.juzgado.trim(),
        estadoActual: form.estadoActual as "activo" | "en_tramite" | "finalizado" | "archivado",
        descripcionEstado: form.descripcionEstado.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo Proceso</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cliente <Text style={styles.required}>*</Text></Text>
            <Pressable style={styles.selectBtn} onPress={() => setShowClientes(!showClientes)}>
              <Ionicons name="person-outline" size={20} color={Colors.textTertiary} />
              <Text style={[styles.selectText, !selectedCliente && styles.placeholder]}>
                {selectedCliente ? selectedCliente.nombre : "Seleccionar cliente"}
              </Text>
              <Ionicons name={showClientes ? "chevron-up" : "chevron-down"} size={20} color={Colors.textTertiary} />
            </Pressable>
            {showClientes && (
              <View style={styles.dropdown}>
                {clientes.length === 0 ? (
                  <Text style={styles.dropdownEmpty}>Sin clientes. Crea uno primero.</Text>
                ) : (
                  clientes.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[styles.dropdownItem, form.clienteId === c.id && styles.dropdownItemActive]}
                      onPress={() => {
                        updateField("clienteId", c.id);
                        setShowClientes(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, form.clienteId === c.id && styles.dropdownTextActive]}>{c.nombre}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Proceso <Text style={styles.required}>*</Text></Text>
            <Pressable style={styles.selectBtn} onPress={() => setShowTipos(!showTipos)}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.textTertiary} />
              <Text style={[styles.selectText, !form.tipoProceso && styles.placeholder]}>
                {form.tipoProceso || "Seleccionar tipo"}
              </Text>
              <Ionicons name={showTipos ? "chevron-up" : "chevron-down"} size={20} color={Colors.textTertiary} />
            </Pressable>
            {showTipos && (
              <View style={styles.dropdown}>
                {TIPOS_PROCESO.map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[styles.dropdownItem, form.tipoProceso === tipo && styles.dropdownItemActive]}
                    onPress={() => {
                      updateField("tipoProceso", tipo);
                      setShowTipos(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, form.tipoProceso === tipo && styles.dropdownTextActive]}>{tipo}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Radicado <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.radicado}
                onChangeText={(v) => updateField("radicado", v)}
                placeholder="Numero de radicado"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Juzgado <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.juzgado}
                onChangeText={(v) => updateField("juzgado", v)}
                placeholder="Nombre del juzgado"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.estadoGrid}>
              {ESTADOS.map((estado) => (
                <Pressable
                  key={estado.value}
                  style={[styles.estadoChip, form.estadoActual === estado.value && styles.estadoChipActive]}
                  onPress={() => updateField("estadoActual", estado.value)}
                >
                  <Text style={[styles.estadoChipText, form.estadoActual === estado.value && styles.estadoChipTextActive]}>
                    {estado.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripcion del estado</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.descripcionEstado}
                onChangeText={(v) => updateField("descripcionEstado", v)}
                placeholder="Descripcion del estado actual del proceso"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, loading && styles.saveBtnDisabled]}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Crear Proceso</Text>}
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
  content: { padding: 20, gap: 16, paddingBottom: 20 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.danger, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 4 },
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
  textAreaWrapper: { alignItems: "flex-start" },
  textArea: { minHeight: 80, paddingTop: 14 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  selectText: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  placeholder: { color: Colors.textTertiary },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemActive: { backgroundColor: Colors.primary + "10" },
  dropdownText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  dropdownTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  dropdownEmpty: { padding: 16, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center" },
  estadoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  estadoChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  estadoChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  estadoChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  estadoChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
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
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
