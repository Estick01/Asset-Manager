import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { isClientAuthenticated, getCliente, updateCliente, type Cliente } from "@/lib/storage";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function ClientProfileScreen() {
  const insets = useSafeAreaInsets();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { authenticated, clienteId } = await isClientAuthenticated();
    if (!authenticated || !clienteId) {
      router.replace("/portal/login");
      return;
    }
    const c = await getCliente(clienteId);
    if (c) {
      setCliente(c);
      setNombre(c.nombre);
      setCorreo(c.correo);
      setTelefono(c.telefono);
    } else {
      router.replace("/portal/login");
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSave = async () => {
    if (!cliente) return;
    if (!nombre.trim() || !correo.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    if (newPassword || confirmPassword) {
      if (password !== cliente.password) {
        setError("La contraseña actual es incorrecta.");
        return;
      }
      if (newPassword.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Las nuevas contraseñas no coinciden.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const updates: Partial<Cliente> = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
      };
      if (newPassword) {
        updates.password = newPassword;
      }
      await updateCliente(cliente.id, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Éxito", "Tus datos han sido actualizados.");
      router.back();
    } catch (e) {
      setError("Error al guardar los datos.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos Personales</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput style={styles.input} value={correo} onChangeText={setCorreo} placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Tu número de teléfono" keyboardType="phone-pad" />
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.cardTitle}>Cambiar Contraseña</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña actual</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña actual" secureTextEntry />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nueva contraseña</Text>
                <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar nueva contraseña</Text>
                <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repite la nueva contraseña" secureTextEntry />
            </View>
        </View>

        <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, saving && styles.saveBtnDisabled]}
        >
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.9 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
    flex: 1,
  },
});
