import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { disableTwoFactor, getTwoFactorStatus, startTwoFactorSetup, verifyTwoFactorSetup, type TwoFactorSetupResponse, type TwoFactorStatus } from "@/lib/services/twoFactorService";

export default function TwoFactorScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getTwoFactorStatus());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el estado del 2FA.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadStatus();
  }, [loadStatus]));

  const handleStartSetup = useCallback(async () => {
    try {
      const result = await startTwoFactorSetup();
      setSetupData(result);
      setSetupCode("");
      setRecoveryCodes(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar la configuración.";
      toast.error(message);
    }
  }, []);

  const handleVerifySetup = useCallback(async () => {
    if (!setupCode.trim()) {
      toast.error("Ingresa el código de autenticación.");
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyTwoFactorSetup(setupCode.trim());
      setRecoveryCodes(result.recoveryCodes);
      await loadStatus();
      toast.success("Autenticación de dos pasos activada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo activar la autenticación.";
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  }, [loadStatus, setupCode]);

  const handleDisable = useCallback(async () => {
    if (!disablePassword) {
      toast.error("Ingresa tu contraseña actual.");
      return;
    }

    setDisableLoading(true);
    try {
      await disableTwoFactor(disablePassword);
      setShowDisableModal(false);
      setDisablePassword("");
      setSetupData(null);
      setRecoveryCodes(null);
      await loadStatus();
      toast.success("Autenticación de dos pasos desactivada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo desactivar la autenticación.";
      toast.error(message);
    } finally {
      setDisableLoading(false);
    }
  }, [disablePassword, loadStatus]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Autenticación en dos pasos</Text>
          <Text style={styles.subtitle}>Protege tu cuenta con códigos TOTP desde una app autenticadora.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIcon, status?.enabled ? styles.statusIconEnabled : styles.statusIconDisabled]}>
                <Ionicons name={status?.enabled ? "shield-checkmark" : "shield-outline"} size={20} color={status?.enabled ? Colors.success : Colors.warning} />
              </View>
              <View style={styles.statusCopy}>
                <Text style={styles.statusTitle}>{status?.enabled ? "2FA activo" : "2FA inactivo"}</Text>
                <Text style={styles.statusText}>
                  {status?.enabled
                    ? `Tienes ${status.recoveryCodesRemaining} códigos de recuperación disponibles.`
                    : "Tu inicio de sesión depende solo de la contraseña."}
                </Text>
              </View>
            </View>

            {status?.enabled ? (
              <Pressable style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.82 }]} onPress={() => setShowDisableModal(true)}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
                <Text style={styles.dangerButtonText}>Desactivar 2FA</Text>
              </Pressable>
            ) : (
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.84 }]} onPress={handleStartSetup}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Activar 2FA</Text>
              </Pressable>
            )}
          </View>

          {!status?.enabled && setupData ? (
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Configura tu app autenticadora</Text>
              <Text style={styles.setupText}>
                En Google Authenticator, Authy o 1Password elige agregar cuenta manualmente y usa esta clave secreta.
              </Text>

              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>Clave manual</Text>
                <Text style={styles.secretValue}>{setupData.manualEntryKey}</Text>
              </View>

              <Text style={styles.setupHelper}>URI OTP</Text>
              <Text style={styles.uriValue}>{setupData.otpAuthUrl}</Text>

              <Text style={styles.inputLabel}>Código de verificación</Text>
              <TextInput
                style={styles.input}
                value={setupCode}
                onChangeText={setSetupCode}
                placeholder="123456"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
              />

              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.84 }, verifying && { opacity: 0.7 }]} onPress={handleVerifySetup} disabled={verifying}>
                {verifying ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>Verificar y activar</Text>}
              </Pressable>
            </View>
          ) : null}

          {recoveryCodes ? (
            <View style={styles.recoveryCard}>
              <Text style={styles.recoveryTitle}>Guarda estos códigos de recuperación</Text>
              <Text style={styles.setupText}>
                Cada código sirve una sola vez si pierdes acceso a tu app autenticadora.
              </Text>
              <View style={styles.recoveryGrid}>
                {recoveryCodes.map((code) => (
                  <View key={code} style={styles.recoveryCode}>
                    <Text style={styles.recoveryCodeText}>{code}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <StyledModal
        visible={showDisableModal}
        onClose={() => !disableLoading && setShowDisableModal(false)}
        title="Desactivar 2FA"
        onConfirm={handleDisable}
        confirmText={disableLoading ? "Desactivando..." : "Desactivar"}
        confirmVariant="danger"
      >
        <Text style={styles.modalText}>Para desactivar la autenticación en dos pasos confirma tu contraseña actual.</Text>
        <TextInput
          style={styles.input}
          value={disablePassword}
          onChangeText={setDisablePassword}
          placeholder="Contraseña actual"
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
        />
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14 },
  statusCard: { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 18, gap: 16 },
  statusHeader: { flexDirection: "row", gap: 12 },
  statusIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusIconEnabled: { backgroundColor: Colors.successLight },
  statusIconDisabled: { backgroundColor: Colors.warningLight },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  statusText: { marginTop: 4, fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  primaryButton: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
  },
  primaryButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  dangerButton: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
  },
  dangerButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  setupCard: { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 18, gap: 12 },
  setupTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  setupText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  secretBox: { backgroundColor: Colors.surfaceSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  secretLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  secretValue: { fontSize: 18, lineHeight: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  setupHelper: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  uriValue: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 4 },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
  },
  recoveryCard: { backgroundColor: Colors.successLight, borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: "#A7F3D0" },
  recoveryTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  recoveryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recoveryCode: { backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#D1FAE5" },
  recoveryCodeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  modalText: { marginBottom: 12, fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
});
