import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";
import { AuthRequestError } from "@/lib/auth/unified";
import { PublicSupportModal } from "@/components/web/PublicSupportModal";

async function triggerHaptic(type: "success" | "error") {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  await Haptics.notificationAsync(
    type === "success"
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1140, Math.max(960, width - metrics.gutter * 2));
  const { login, completeTwoFactorLogin, user } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDesktopBrandPanel, setShowDesktopBrandPanel] = useState(!desktop);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // Redirect based on user role after successful login
  useEffect(() => {
    if (user) {
      const rolNombre = user.user.rol?.nombre?.toLowerCase() || "";
      const profile = user.profile as any;
      if (rolNombre.startsWith("admin_")) {
        if (Platform.OS === "web") {
          router.replace("/(admin-tabs)/dashboard");
        } else {
          setError("El panel de administracion solo esta disponible en web");
        }
      } else if (rolNombre.includes("firm") || rolNombre.includes("bufete")) {
        router.replace("/(firm-tabs)");
      } else if (rolNombre.includes("cliente")) {
        if (profile?.tipo === "empresa") {
          router.replace("/portal-empresa" as any);
        } else {
          router.replace("/portal");
        }
      } else {
        router.replace("/(lawyer-tabs)");
      }
    }
  }, [user]);

  useEffect(() => {
    if (!desktop) {
      setShowDesktopBrandPanel(false);
      return;
    }

    setShowDesktopBrandPanel(false);
    const frame = requestAnimationFrame(() => {
      setShowDesktopBrandPanel(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [desktop]);


const handleLogin = async () => {
  if (!correo.trim() || !password.trim()) {
    setError("Completa todos los campos");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const success = await login(correo.trim(), password);
    if (success) {
      void triggerHaptic("success");
      // Redirect is handled by useEffect when user state changes

    } else {
      setError("Correo o contrasena incorrectos");
      void triggerHaptic("error");
    }

  } catch (error) {
    if (error instanceof AuthRequestError && error.requiresEmailVerification) {
      setError(error.message);
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: correo.trim(), next: "/login" },
      } as any);
    } else if (error instanceof AuthRequestError && error.requiresTwoFactor && error.challengeId) {
      setChallengeId(error.challengeId);
      setTwoFactorCode("");
      setError(error.newDeviceDetected
        ? "Verifica este inicio de sesión con tu código 2FA. Detectamos un dispositivo nuevo."
        : error.message);
    } else if (error instanceof Error) {
      setError(error.message || "Error al iniciar sesion");
    } else {
      setError("Error al iniciar sesion");
    }
  } finally {
    setLoading(false);
  }
};

const handleVerifyTwoFactor = async () => {
  if (!challengeId) {
    setError("La verificación expiró. Vuelve a iniciar sesión.");
    return;
  }
  if (!twoFactorCode.trim()) {
    setError("Ingresa el código de autenticación.");
    return;
  }

  setLoading(true);
  setError("");
  try {
    const success = await completeTwoFactorLogin(challengeId, twoFactorCode.trim());
    if (!success) {
      setError("No fue posible completar el inicio de sesión.");
    }
  } catch (error) {
    if (error instanceof Error) {
      setError(error.message || "Error al verificar el código.");
    } else {
      setError("Error al verificar el código.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            desktop && styles.desktopContainer,
            {
              paddingTop: insets.top + (desktop ? 28 : Platform.OS === "web" ? 67 : 40),
              paddingBottom: insets.bottom + (desktop ? 28 : Platform.OS === "web" ? 34 : 20),
              paddingHorizontal: desktop ? metrics.gutter : 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.shell, desktop && { maxWidth: shellWidth }]}>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.push("/")}
                style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.white} />
                <Text style={styles.backLinkText}>Volver a la landing</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/planes")}
                style={({ pressed }) => [styles.topBarGhostBtn, pressed && styles.backLinkPressed]}
              >
                <Text style={styles.topBarGhostText}>Ver planes</Text>
              </Pressable>
            </View>

            <View style={[styles.layout, desktop && styles.desktopLayout]}>
              {desktop && showDesktopBrandPanel ? (
                <View style={[styles.brandPanel, styles.desktopBrandPanel]}>
                  <View style={styles.desktopPanelHeader}>
                    <View style={styles.logoSection}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="briefcase-outline" size={24} color={Colors.white} />
                      </View>
                      <View style={styles.brandTextStack}>
                        <Text style={styles.brandName}>ProcesoClaro</Text>
                        <Text style={styles.brandSub}>Acceso seguro a tu operacion juridica</Text>
                      </View>
                    </View>
                    <View style={styles.desktopStatusPill}>
                      <Text style={styles.desktopStatusText}>Plataforma legal</Text>
                    </View>
                  </View>

                  <View style={styles.desktopBrandContent}>
                    <Text style={styles.desktopBrandTitle}>Inicia sesion y continua con tu trabajo legal</Text>
                    <Text style={styles.desktopBrandText}>
                      Una entrada clara para abogados, bufetes y clientes que necesitan revisar procesos, documentos, mensajes y seguimiento en un entorno profesional.
                    </Text>
                    <View style={styles.desktopFeatureList}>
                      <View style={styles.desktopFeatureItem}>
                        <View style={styles.desktopFeatureIcon}>
                          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.white} />
                        </View>
                        <Text style={styles.desktopFeatureText}>Acceso seguro y segmentado por perfil de usuario.</Text>
                      </View>
                      <View style={styles.desktopFeatureItem}>
                        <View style={styles.desktopFeatureIcon}>
                          <Ionicons name="documents-outline" size={16} color={Colors.white} />
                        </View>
                        <Text style={styles.desktopFeatureText}>Procesos, documentos y conversaciones centralizados.</Text>
                      </View>
                      <View style={styles.desktopFeatureItem}>
                        <View style={styles.desktopFeatureIcon}>
                          <Ionicons name="time-outline" size={16} color={Colors.white} />
                        </View>
                        <Text style={styles.desktopFeatureText}>Seguimiento juridico con mejor trazabilidad y contexto.</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.desktopTrustRow}>
                    <View style={styles.desktopTrustItem}>
                      <Text style={styles.desktopTrustValue}>Clientes</Text>
                      <Text style={styles.desktopTrustLabel}>Portal y seguimiento</Text>
                    </View>
                    <View style={styles.desktopTrustDivider} />
                    <View style={styles.desktopTrustItem}>
                      <Text style={styles.desktopTrustValue}>Bufetes</Text>
                      <Text style={styles.desktopTrustLabel}>Operacion centralizada</Text>
                    </View>
                    <View style={styles.desktopTrustDivider} />
                    <View style={styles.desktopTrustItem}>
                      <Text style={styles.desktopTrustValue}>Abogados</Text>
                      <Text style={styles.desktopTrustLabel}>Control diario del caso</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={[styles.formColumn, desktop && styles.desktopFormColumn]}>
                <View style={[styles.formCard, desktop && styles.desktopFormCard]}>
                  {!desktop ? (
                    <View style={styles.mobileBrandHeader}>
                      <View style={styles.mobileBrandRow}>
                        <View style={styles.mobileBrandIcon}>
                          <Ionicons name="briefcase-outline" size={18} color={Colors.white} />
                        </View>
                        <View style={styles.mobileBrandTextWrap}>
                          <Text style={styles.mobileBrandName}>ProcesoClaro</Text>
                          <Text style={styles.mobileBrandSub}>Acceso a tu espacio juridico</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.formHeader}>
                    <View style={styles.formHeaderBadge}>
                      <Text style={styles.formHeaderBadgeText}>Acceso</Text>
                    </View>
                    <Text style={styles.formTitle}>Iniciar Sesion</Text>
                    <Text style={styles.formSubtitle}>Ingresa con tu correo y contrasena para continuar.</Text>
                  </View>

                  {!!error && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.formFields}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Correo electronico</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={correo}
                          onChangeText={setCorreo}
                          placeholder="tu@correo.com"
                          placeholderTextColor={Colors.textTertiary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {!challengeId ? (
                      <View style={styles.inputGroup}>
                        <View style={styles.passwordLabelRow}>
                          <Text style={styles.label}>Contrasena</Text>
                          <Pressable
                            onPress={() => router.push("/(auth)/forgot-password")}
                            style={({ pressed }) => [styles.inlineForgotBtn, pressed && styles.inlineForgotBtnPressed]}
                          >
                            <Text style={styles.inlineForgotText}>Recuperar acceso</Text>
                          </Pressable>
                        </View>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={[styles.input, styles.passwordInput]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Tu contrasena"
                            placeholderTextColor={Colors.textTertiary}
                            secureTextEntry={!showPassword}
                          />
                          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <View style={styles.passwordLabelRow}>
                          <Text style={styles.label}>Codigo 2FA o recovery code</Text>
                          <Pressable
                            onPress={() => {
                              setChallengeId(null);
                              setTwoFactorCode("");
                              setError("");
                            }}
                            style={({ pressed }) => [styles.inlineForgotBtn, pressed && styles.inlineForgotBtnPressed]}
                          >
                            <Text style={styles.inlineForgotText}>Volver</Text>
                          </Pressable>
                        </View>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={twoFactorCode}
                            onChangeText={setTwoFactorCode}
                            placeholder="123456 o ABCD-EFGH"
                            placeholderTextColor={Colors.textTertiary}
                            autoCapitalize="characters"
                            autoCorrect={false}
                          />
                        </View>
                        <Text style={styles.helperText}>
                          Usa el código de tu app autenticadora o uno de tus códigos de recuperación.
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={challengeId ? handleVerifyTwoFactor : handleLogin}
                    disabled={loading}
                    style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed, loading && styles.loginBtnDisabled]}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Text style={styles.loginBtnText}>{challengeId ? "Verificar y entrar" : "Ingresar"}</Text>
                        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                      </>
                    )}
                  </Pressable>

                  <View style={styles.helpCard}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
                    <View style={styles.helpCardTextWrap}>
                      <Text style={styles.helpCardTitle}>Acceso seguro</Text>
                      <Text style={styles.helpCardText}>Tus credenciales te llevan al panel segun tu perfil.</Text>
                    </View>
                  </View>

                  <View style={styles.formDivider} />

                  <View style={[styles.footer, desktop && styles.desktopFooter]}>
                    <Text style={[styles.footerText, desktop && styles.desktopFooterText]}>No tienes cuenta?</Text>
                    <Pressable onPress={() => router.push("/(auth)/register-type")}>
                      <Text style={styles.footerLink}>Registrate</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => router.push("/planes")}
                    style={[styles.verPlanesBtn, desktop && styles.desktopVerPlanesBtn]}
                  >
                    <Ionicons name="albums-outline" size={16} color={Colors.primary} />
                    <Text style={[styles.verPlanesBtnText, desktop && styles.desktopVerPlanesBtnText]}>Ver planes y precios</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSupportModalVisible(true)}
                    style={[styles.supportBtn, desktop && styles.desktopSupportBtn]}
                  >
                    <Ionicons name="headset-outline" size={16} color={Colors.primary} />
                    <Text style={styles.supportBtnText}>Contactar soporte</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PublicSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        source="login"
        initialEmail={correo}
        title="Soporte de acceso"
        subtitle="Si tienes problemas para entrar, déjanos tu mensaje y te contactamos."
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  desktopContainer: {
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  backLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backLinkPressed: {
    opacity: 0.86,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
  },
  topBarGhostBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  topBarGhostText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.86)",
  },
  layout: {
    width: "100%",
  },
  desktopLayout: {
    minHeight: 620,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 22,
  },
  brandPanel: {
    alignItems: "center",
  },
  desktopBrandPanel: {
    flex: 1,
    minWidth: 0,
    padding: 32,
    borderRadius: 24,
    backgroundColor: "rgba(8,18,31,0.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTextStack: { gap: 2 },
  brandName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: 0.2,
  },
  brandSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
  },
  desktopPanelHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  desktopStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  desktopStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.84)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  desktopBrandContent: {
    gap: 16,
    maxWidth: 500,
  },
  desktopBrandTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -0.4,
  },
  desktopBrandText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.76)",
  },
  desktopFeatureList: {
    gap: 12,
  },
  desktopFeatureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  desktopFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopFeatureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.82)",
  },
  desktopTrustRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  desktopTrustItem: {
    flex: 1,
    gap: 4,
  },
  desktopTrustDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  desktopTrustValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  desktopTrustLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.68)",
  },
  formColumn: {},
  desktopFormColumn: {
    width: 420,
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
  },
  desktopFormCard: {
    borderRadius: 22,
    padding: 28,
    shadowColor: "#0F2640",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  formHeader: {
    gap: 8,
  },
  formHeaderBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight + "16",
  },
  formHeaderBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  mobileBrandHeader: {
    paddingBottom: 4,
  },
  mobileBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mobileBrandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileBrandTextWrap: {
    gap: 2,
  },
  mobileBrandName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  mobileBrandSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  formFields: {
    gap: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.12)",
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
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.1)",
    minHeight: 52,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  inlineForgotBtn: {
    paddingVertical: 2,
  },
  inlineForgotBtnPressed: {
    opacity: 0.76,
  },
  inlineForgotText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    minHeight: 52,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  loginBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight + "10",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "22",
  },
  helpCardTextWrap: {
    flex: 1,
    gap: 2,
  },
  helpCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  helpCardText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  formDivider: {
    height: 1,
    backgroundColor: "rgba(15,38,64,0.08)",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
  },
  desktopFooter: {
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  desktopFooterText: {
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  verPlanesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  desktopVerPlanesBtn: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight + "12",
    paddingVertical: 12,
  },
  verPlanesBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  desktopVerPlanesBtnText: {
    color: Colors.primary,
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  desktopSupportBtn: {
    borderRadius: 14,
    backgroundColor: Colors.infoLight,
  },
  supportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  portalLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
  },
  portalLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
});
