import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";
import { apiRequest } from "@/lib/query-client";
import { LawyerProfile } from "@/shared/schema";
import { toast } from "sonner-native";

export default function LawyerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleLogout = () => setShowLogoutModal(true);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const openPwdModal = () => {
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setShowPwdModal(true);
  };

  const handleChangePassword = async () => {
    if (!currentPwd) { toast.error("Ingresa tu contraseña actual."); return; }
    if (newPwd.length < 6) { toast.error("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { toast.error("Las contraseñas nuevas no coinciden."); return; }
    setPwdSaving(true);
    try {
      const res = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al cambiar la contraseña."); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Contraseña actualizada correctamente.");
      setShowPwdModal(false);
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setPwdSaving(false);
    }
  };

  const settingsSections = [
    {
      title: "Perfil",
      items: [
        { icon: "person-outline", label: "Editar Perfil", onPress: () => router.push("/profile/lawyer") },
        { icon: "key-outline", label: "Cambiar Contraseña", onPress: openPwdModal },
        { icon: "mail-outline", label: "Invitaciones de Firmas", onPress: () => router.push("/lawyer-componts/lawyer-invitations" as any) },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        { icon: "notifications-outline", label: "Configurar Notificaciones", onPress: () => Alert.alert("Próximamente", "Esta función estará disponible pronto.") },
      ],
    },
    {
      title: "Aplicación",
      items: [
        { icon: "help-circle-outline", label: "Ayuda y Soporte", onPress: () => Alert.alert("Ayuda", "Contacta a soporte@lextrack.com") },
        { icon: "information-circle-outline", label: "Acerca de", onPress: () => Alert.alert("LexTrack", "Versión 1.0.0\nSistema de Seguimiento Jurídico") },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.user.name || "Usuario"}</Text>
            <Text style={styles.userEmail}>{user?.user.email}</Text>
            <Text style={styles.userFirm}>{(user?.profile as LawyerProfile)?.firm?.name}</Text>
          </View>
        </View>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={itemIndex}
                  style={({ pressed }) => [
                    styles.settingItem,
                    itemIndex < section.items.length - 1 && styles.settingItemBorder,
                    pressed && styles.settingItemPressed,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                    <Text style={styles.settingItemLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </Pressable>

        <Text style={styles.version}>LexTrack v1.0.0</Text>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        userName={user?.user.name || "Usuario"}
      />

      {/* Modal cambiar contraseña */}
      <Modal visible={showPwdModal} transparent animationType="fade" onRequestClose={() => setShowPwdModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pwdModal}>
            <View style={styles.pwdModalHeader}>
              <Text style={styles.pwdModalTitle}>Cambiar Contraseña</Text>
              <Pressable onPress={() => setShowPwdModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Contraseña actual</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Tu contraseña actual"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showCurrent}
              />
              <Pressable onPress={() => setShowCurrent(p => !p)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Nueva contraseña</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showNew}
              />
              <Pressable onPress={() => setShowNew(p => !p)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Confirmar nueva contraseña</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm(p => !p)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.pwdActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setShowPwdModal(false)}
                disabled={pwdSaving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, pwdSaving && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={pwdSaving}
              >
                {pwdSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Guardar</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text },
  content: { padding: 16, paddingBottom: 40 },
  userCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.white,
    borderRadius: 16, padding: 16, marginBottom: 24, gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  userEmail: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  userFirm: { fontSize: 13, color: Colors.primary, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  settingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, backgroundColor: Colors.white,
  },
  settingItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingItemPressed: { backgroundColor: Colors.surfaceSecondary },
  settingItemLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  settingItemLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: Colors.dangerLight, padding: 16, borderRadius: 14, marginTop: 8,
  },
  logoutButtonPressed: { opacity: 0.8 },
  logoutButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  version: { textAlign: "center", fontSize: 12, color: Colors.textTertiary, marginTop: 24 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  pwdModal: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, gap: 12 },
  pwdModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  pwdModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  pwdLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: -4 },
  pwdRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  pwdInput: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  eyeBtn: { paddingHorizontal: 14 },
  pwdActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
