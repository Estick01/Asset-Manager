import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";
import { AuthRequestError } from "@/lib/auth/unified";


export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1360, Math.max(1120, width - metrics.gutter * 2));
  const { login, user } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      // Redirect is handled by useEffect when user state changes

    } else {
      setError("Correo o contrasena incorrectos");
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
    }

  } catch (error) {
    if (error instanceof AuthRequestError && error.requiresEmailVerification) {
      setError(error.message);
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: correo.trim(), next: "/login" },
      } as any);
    } else if (error instanceof Error) {
      setError(error.message || "Error al iniciar sesion");
    } else {
      setError("Error al iniciar sesion");
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
          <View style={[styles.layout, desktop && styles.desktopLayout]}>
          <View style={[styles.brandPanel, desktop && styles.desktopBrandPanel]}>
            <View style={styles.logoSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={40} color={Colors.accent} />
              </View>
              <Text style={styles.brandName}>LexTrack</Text>
              <Text style={styles.brandSub}>Sistema de Seguimiento Juridico</Text>
            </View>

            {desktop && (
              <View style={styles.desktopBrandContent}>
                <Text style={styles.desktopBrandTitle}>Accede a tu espacio de trabajo legal</Text>
                <Text style={styles.desktopBrandText}>
                  Gestiona procesos, conversaciones, alertas y comunidad desde una interfaz más clara para escritorio.
                </Text>
                <View style={styles.desktopFeatureList}>
                  <View style={styles.desktopFeatureItem}>
                    <View style={styles.desktopFeatureIcon}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={Colors.white} />
                    </View>
                    <Text style={styles.desktopFeatureText}>Acceso seguro para clientes, bufetes y abogados.</Text>
                  </View>
                  <View style={styles.desktopFeatureItem}>
                    <View style={styles.desktopFeatureIcon}>
                      <Ionicons name="grid-outline" size={18} color={Colors.white} />
                    </View>
                    <Text style={styles.desktopFeatureText}>Procesos, documentos y mensajes en un solo lugar.</Text>
                  </View>
                  <View style={styles.desktopFeatureItem}>
                    <View style={styles.desktopFeatureIcon}>
                      <Ionicons name="sparkles-outline" size={18} color={Colors.white} />
                    </View>
                    <Text style={styles.desktopFeatureText}>Seguimiento centralizado de actuaciones, documentos y comunicación legal.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.formColumn, desktop && styles.desktopFormColumn]}>
            <View style={[styles.formCard, desktop && styles.desktopFormCard]}>
              <Text style={styles.formTitle}>Iniciar Sesion</Text>
              {desktop && <Text style={styles.formSubtitle}>Ingresa con tu correo y contraseña para continuar.</Text>}

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electronico</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contrasena</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
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

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed, loading && styles.loginBtnDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.loginBtnText}>Ingresar</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push("/(auth)/forgot-password")}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

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
                <Ionicons name="albums-outline" size={16} color={desktop ? Colors.primary : "rgba(255,255,255,0.8)"} />
                <Text style={[styles.verPlanesBtnText, desktop && styles.desktopVerPlanesBtnText]}>Ver planes y precios</Text>
              </Pressable>
            </View>
          </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  layout: {
    width: "100%",
  },
  desktopLayout: {
    minHeight: 720,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 28,
  },
  brandPanel: {
    alignItems: "center",
  },
  desktopBrandPanel: {
    flex: 1,
    minWidth: 0,
    padding: 36,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  desktopBrandContent: {
    gap: 18,
    maxWidth: 520,
  },
  desktopBrandTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -0.6,
  },
  desktopBrandText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.76)",
  },
  desktopFeatureList: {
    gap: 14,
  },
  desktopFeatureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  desktopFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopFeatureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.82)",
  },
  formColumn: {},
  desktopFormColumn: {
    width: 460,
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  desktopFormCard: {
    borderRadius: 28,
    padding: 32,
    shadowColor: "#0F2640",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 10,
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
    marginTop: -4,
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
  inputGroup: {
    gap: 6,
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
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
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
  forgotBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 6,
  },
  desktopFooter: {
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
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
    color: "rgba(255,255,255,0.8)",
  },
  desktopVerPlanesBtnText: {
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
