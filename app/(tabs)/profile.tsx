import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function AbogadoProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const [nombre, setNombre] = useState("");
  const [despacho, setDespacho] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setNombre(user.nombre);
      setDespacho(user.despacho);
      setCorreo(user.correo);
      setTelefono(user.telefono);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!nombre.trim() || !correo.trim() || !despacho.trim()) {
      setError("Nombre, despacho y correo son obligatorios.");
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (currentPassword !== user.password) {
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
      const updates = {
        nombre: nombre.trim(),
        despacho: despacho.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        password: newPassword ? newPassword : user.password,
      };
      
      await updateProfile(updates);
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

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollViewCompat style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del Despacho</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre del Despacho</Text>
                <TextInput style={styles.input} value={despacho} onChangeText={setDespacho} placeholder="Nombre del despacho" />
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
                <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Ingresa tu contraseña actual" secureTextEntry />
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
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, saving && styles.saveBtnDisabled]}
        >
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  content: { padding: 20, paddingBottom: 40 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
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
