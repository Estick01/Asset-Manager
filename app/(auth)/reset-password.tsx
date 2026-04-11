import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { resetPassword } from "@/lib/services/passwordResetService";

const NAVY = "#0F2640";
const TEAL = "#2196A6";
const WHITE = "#FFFFFF";
const BG = "#F4F6F8";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const BORDER = "#DDE3EA";
const RED = "#E05252";
const GREEN = "#27AE7A";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(
    () => (Array.isArray(params.token) ? params.token[0] : params.token) ?? "",
    [params.token],
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!token) {
      setError("El enlace de restablecimiento es invalido.");
      return;
    }
    if (!password) {
      setError("Ingresa la nueva contrasena");
      return;
    }
    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "No se pudo restablecer la contrasena");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient colors={[NAVY, "#1B3D60"]} style={styles.gradient}>
        <View style={[styles.successBox, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={GREEN} />
          </View>
          <Text style={styles.successTitle}>Contrasena actualizada</Text>
          <Text style={styles.successSub}>
            Ya puedes iniciar sesion con tu nueva contrasena.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.btnText}>Ir al login</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[NAVY, "#1B3D60"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="lock-closed-outline" size={32} color={TEAL} />
            </View>
            <Text style={styles.title}>Restablecer contrasena</Text>
            <Text style={styles.subtitle}>
              Define una nueva contrasena para recuperar el acceso a la cuenta.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fields}>
              <Text style={styles.fieldLabel}>Nueva contrasena</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={TEXT3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={(value) => { setPassword(value); setError(""); }}
                  placeholder="Minimo 8 caracteres"
                  placeholderTextColor={TEXT3}
                  secureTextEntry={!showPw}
                />
                <Pressable onPress={() => setShowPw((current) => !current)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT3} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Confirmar contrasena</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={TEXT3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={confirm}
                  onChangeText={(value) => { setConfirm(value); setError(""); }}
                  placeholder="Repite la contrasena"
                  placeholderTextColor={TEXT3}
                  secureTextEntry={!showConfirm}
                />
                <Pressable onPress={() => setShowConfirm((current) => !current)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT3} />
                </Pressable>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={RED} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }, loading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>Actualizar contrasena</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  header: { alignItems: "center", marginBottom: 28, gap: 10 },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE, textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } as any)
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 }),
  },
  fields: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT,
  },
  eyeBtn: { paddingHorizontal: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: RED + "12",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED + "30",
  },
  errorText: { flex: 1, fontSize: 13, color: RED, fontFamily: "Inter_400Regular" },
  btn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 4px 14px rgba(33,150,166,0.4)" } as any)
      : { shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }),
  },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, textAlign: "center" },
  successSub: { fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 22, fontFamily: "Inter_400Regular" },
});
