import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { requestEmailVerification, verifyEmailOtp } from "@/lib/services/emailVerificationService";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; next?: string }>();
  const email = useMemo(() => {
    const value = Array.isArray(params.email) ? params.email[0] : params.email;
    return value ?? "";
  }, [params.email]);
  const next = useMemo(() => {
    const value = Array.isArray(params.next) ? params.next[0] : params.next;
    return value ?? "/login";
  }, [params.next]);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleVerify() {
    if (!email) {
      toast.error("No se encontró el correo a verificar.");
      return;
    }
    if (code.trim().length !== 6) {
      toast.error("Ingresa el código OTP de 6 dígitos.");
      return;
    }

    setVerifying(true);
    try {
      await verifyEmailOtp(email, code.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Correo verificado correctamente.");
      router.replace(next as any);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(error?.message || "No fue posible verificar el correo.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error("No se encontró el correo a verificar.");
      return;
    }
    setSending(true);
    try {
      const result = await requestEmailVerification(email);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error?.message || "No fue posible reenviar el código.");
    } finally {
      setSending(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]} style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-open-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Verifica tu correo</Text>
            <Text style={styles.subtitle}>
              Ingresa el código OTP enviado a{email ? ` ${email}` : " tu correo"} para activar tu cuenta.
            </Text>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Código OTP</Text>
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={6}
              />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={verifying}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9 },
                verifying && { opacity: 0.6 },
              ]}
            >
              {verifying ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Verificar correo</Text>}
            </Pressable>

            <Pressable
              onPress={handleResend}
              disabled={sending}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.85 },
                sending && { opacity: 0.6 },
              ]}
            >
              {sending ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryBtnText}>Reenviar código</Text>}
            </Pressable>

            <Pressable onPress={() => router.replace("/login")} style={styles.linkBtn}>
              <Text style={styles.linkText}>Ir a iniciar sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 18,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  inputWrap: { width: "100%", gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    backgroundColor: Colors.background,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  secondaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  linkBtn: { paddingTop: 4 },
  linkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
