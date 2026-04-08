import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  requestPasswordReset, verifyOtp, resetPassword,
} from "@/lib/services/passwordResetService";

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY  = "#0F2640";
const TEAL  = "#2196A6";
const WHITE = "#FFFFFF";
const BG    = "#F4F6F8";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const BORDER = "#DDE3EA";
const RED   = "#E05252";
const GREEN = "#27AE7A";

type Step = "email" | "otp" | "password";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [step,        setStep]        = useState<Step>("email");
  const [email,       setEmail]       = useState("");
  const [otp,         setOtp]         = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resetToken,  setResetToken]  = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState(false);
  const [countdown,   setCountdown]   = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown timer ──────────────────────────────────────────────────
  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Step 1: request OTP ───────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Correo electrónico inválido"); return; }
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setStep("otp");
      startCountdown();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError("Ingresa el código completo"); return; }
    setError("");
    setLoading(true);
    try {
      const { resetToken: token } = await verifyOtp(email.trim().toLowerCase(), code);
      setResetToken(token);
      setStep("password");
    } catch (e: any) {
      setError(e.message);
      // Clear OTP on error
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: reset password ────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!password) { setError("Ingresa la nueva contraseña"); return; }
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setError("");
    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────
  const handleOtpChange = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0)             otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── Success screen ────────────────────────────────────────────────────
  if (success) {
    return (
      <LinearGradient colors={[NAVY, "#1B3D60"]} style={styles.gradient}>
        <View style={[styles.successBox, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={GREEN} />
          </View>
          <Text style={styles.successTitle}>¡Contraseña actualizada!</Text>
          <Text style={styles.successSub}>
            Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.btnText}>Ir al inicio de sesión</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const stepMeta: Record<Step, { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = {
    email:    { icon: "mail-outline",      title: "¿Olvidaste tu contraseña?", subtitle: "Ingresa tu correo y te enviaremos un código de verificación." },
    otp:      { icon: "keypad-outline",    title: "Verifica tu identidad",     subtitle: `Ingresa el código de 6 dígitos que enviamos a ${email}` },
    password: { icon: "lock-closed-outline", title: "Nueva contraseña",        subtitle: "Elige una contraseña segura de al menos 6 caracteres." },
  };

  const meta = stepMeta[step];

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
          {/* ── Back ── */}
          <Pressable
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
            onPress={() => {
              if (step === "email")    router.back();
              else if (step === "otp") setStep("email");
              else                     setStep("otp");
            }}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </Pressable>

          {/* ── Step indicator ── */}
          <View style={styles.stepRow}>
            {(["email", "otp", "password"] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive,
                  (step === "otp" && i === 0) || (step === "password" && i <= 1) ? styles.stepDotDone : null
                ]}>
                  {((step === "otp" && i === 0) || (step === "password" && i <= 1)) ? (
                    <Ionicons name="checkmark" size={11} color={WHITE} />
                  ) : (
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  )}
                </View>
                {i < 2 && <View style={[styles.stepLine, (step === "otp" && i === 0) || (step === "password" && i <= 1) ? styles.stepLineDone : null]} />}
              </React.Fragment>
            ))}
          </View>

          {/* ── Icon + header ── */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name={meta.icon} size={32} color={TEAL} />
            </View>
            <Text style={styles.title}>{meta.title}</Text>
            <Text style={styles.subtitle}>{meta.subtitle}</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>

            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <View style={styles.fields}>
                <Text style={styles.fieldLabel}>Correo electrónico</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={TEXT3} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={t => { setEmail(t); setError(""); }}
                    placeholder="tu@correo.com"
                    placeholderTextColor={TEXT3}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleRequestOtp}
                  />
                </View>
              </View>
            )}

            {/* ── Step 2: OTP ── */}
            {step === "otp" && (
              <View style={styles.fields}>
                <Text style={styles.fieldLabel}>Código de verificación</Text>
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={r => { otpRefs.current[i] = r; }}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={t => handleOtpChange(t, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {/* Resend */}
                <View style={styles.resendRow}>
                  {countdown > 0 ? (
                    <Text style={styles.resendTimer}>
                      Reenviar código en <Text style={{ color: TEAL }}>{countdown}s</Text>
                    </Text>
                  ) : (
                    <Pressable
                      onPress={async () => {
                        setError("");
                        setLoading(true);
                        try {
                          await requestPasswordReset(email.trim().toLowerCase());
                          setOtp(Array(OTP_LENGTH).fill(""));
                          startCountdown();
                          otpRefs.current[0]?.focus();
                        } catch (e: any) { setError(e.message); }
                        finally { setLoading(false); }
                      }}
                    >
                      <Text style={styles.resendLink}>Reenviar código</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ── Step 3: New password ── */}
            {step === "password" && (
              <View style={styles.fields}>
                <Text style={styles.fieldLabel}>Nueva contraseña</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={TEXT3} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={password}
                    onChangeText={t => { setPassword(t); setError(""); }}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={TEXT3}
                    secureTextEntry={!showPw}
                  />
                  <Pressable onPress={() => setShowPw(p => !p)} style={styles.eyeBtn} hitSlop={8}>
                    <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT3} />
                  </Pressable>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Confirmar contraseña</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={TEXT3} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={confirm}
                    onChangeText={t => { setConfirm(t); setError(""); }}
                    placeholder="Repite la contraseña"
                    placeholderTextColor={TEXT3}
                    secureTextEntry={!showConfirm}
                  />
                  <Pressable onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn} hitSlop={8}>
                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT3} />
                  </Pressable>
                </View>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[...Array(4)].map((_, i) => (
                      <View
                        key={i}
                        style={[styles.strengthBar, {
                          backgroundColor:
                            password.length >= (i + 1) * 3
                              ? password.length >= 12 ? GREEN
                              : password.length >= 8  ? TEAL
                              : "#F5A623"
                              : BORDER,
                        }]}
                      />
                    ))}
                    <Text style={styles.strengthLabel}>
                      {password.length < 6 ? "Muy corta" : password.length < 8 ? "Débil" : password.length < 12 ? "Buena" : "Fuerte"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={RED} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── CTA button ── */}
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }, loading && { opacity: 0.7 }]}
              onPress={step === "email" ? handleRequestOtp : step === "otp" ? handleVerifyOtp : handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <Text style={styles.btnText}>
                    {step === "email" ? "Enviar código" : step === "otp" ? "Verificar código" : "Cambiar contraseña"}
                  </Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll:   { flexGrow: 1, paddingHorizontal: 20 },

  back: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },

  // Step indicator
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 28, paddingHorizontal: 16 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  stepDotActive: { backgroundColor: TEAL },
  stepDotDone:   { backgroundColor: GREEN },
  stepDotText:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  stepLine:      { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6 },
  stepLineDone:  { backgroundColor: GREEN },

  // Header
  header: { alignItems: "center", marginBottom: 28, gap: 10 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  title:    { fontSize: 22, fontFamily: "Inter_700Bold",    color: WHITE, textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 20 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 20,
    padding: 24, gap: 16,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } as any
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 }),
  },

  // Fields
  fields: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: BG, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1, paddingVertical: 13, paddingHorizontal: 10,
    fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT,
  },
  eyeBtn: { paddingHorizontal: 12 },

  // OTP
  otpRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 4 },
  otpBox: {
    width: 46, height: 54, borderRadius: 12, borderWidth: 1.5,
    borderColor: BORDER, backgroundColor: BG,
    textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT,
  },
  otpBoxFilled: { borderColor: TEAL, backgroundColor: TEAL + "08" },

  // Resend
  resendRow:   { alignItems: "center", marginTop: 10 },
  resendTimer: { fontSize: 12, color: TEXT3, fontFamily: "Inter_400Regular" },
  resendLink:  { fontSize: 13, color: TEAL, fontFamily: "Inter_600SemiBold" },

  // Password strength
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, color: TEXT3, fontFamily: "Inter_400Regular", marginLeft: 4, minWidth: 52 },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: RED + "12", padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: RED + "30",
  },
  errorText: { flex: 1, fontSize: 13, color: RED, fontFamily: "Inter_400Regular" },

  // Button
  btn: {
    backgroundColor: TEAL, borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 14px rgba(33,150,166,0.4)" } as any
      : { shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }),
  },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },

  // Success
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: WHITE, textAlign: "center" },
  successSub:   { fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 22, fontFamily: "Inter_400Regular" },
});
