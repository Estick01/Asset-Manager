import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";
import { apiRequest } from "@/lib/query-client";
import { LawyerProfile } from "@/shared/schema";
import { toast } from "sonner-native";
import { getMiSuscripcion, type MiSuscripcion } from "@/lib/services/suscripcionService";
import { UsageBars } from "@/components/subscription/UsageBars";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY      = "#0F2640";
const NAVY_MID  = "#1B3A5C";
const TEAL      = "#2196A6";
const WHITE     = "#FFFFFF";
const BG        = "#F4F6F8";
const TEXT      = "#1B2B3B";
const TEXT2     = "#6B7B8D";
const TEXT3     = "#9AAABB";
const DANGER    = "#E05252";
const DANGER_BG = "#FDEAEA";
const BORDER    = "#E5E7EB";

// ─── Sección de ajustes ───────────────────────────────────────────────────────
type SettingItem = {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
};

function SettingsSection({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.row,
              i < items.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={item.onPress}
          >
            <View style={[styles.rowIconWrap, item.danger && styles.rowIconDanger]}>
              <Ionicons
                name={item.icon as any}
                size={18}
                color={item.danger ? DANGER : TEAL}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, item.danger && { color: DANGER }]}>
                {item.label}
              </Text>
              {item.sublabel && (
                <Text style={styles.rowSublabel}>{item.sublabel}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT3} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Modal de cambio de contraseña ────────────────────────────────────────────
function PwdModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);

  const reset = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!currentPwd) { toast.error("Ingresa tu contraseña actual."); return; }
    if (newPwd.length < 6) { toast.error("Mínimo 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { toast.error("Las contraseñas no coinciden."); return; }
    setSaving(true);
    try {
      const res  = await apiRequest("PUT", "/api/auth/change-password", { currentPassword: currentPwd, newPassword: newPwd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al cambiar la contraseña."); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Contraseña actualizada.");
      handleClose();
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const PwdField = ({
    label, value, onChange, show, onToggle, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <View style={styles.pwdGroup}>
      <Text style={styles.pwdLabel}>{label}</Text>
      <View style={styles.pwdRow}>
        <TextInput
          style={styles.pwdInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={TEXT3}
          secureTextEntry={!show}
        />
        <Pressable onPress={onToggle} hitSlop={8} style={styles.eyeBtn}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={TEXT3} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="lock-closed" size={20} color={TEAL} />
            </View>
            <Text style={styles.sheetTitle}>Cambiar contraseña</Text>
          </View>

          <PwdField label="Contraseña actual"     value={currentPwd} onChange={setCurrentPwd} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder="Tu contraseña actual" />
          <PwdField label="Nueva contraseña"      value={newPwd}     onChange={setNewPwd}     show={showNew}     onToggle={() => setShowNew(p => !p)}     placeholder="Mínimo 6 caracteres" />
          <PwdField label="Confirmar contraseña"  value={confirmPwd} onChange={setConfirmPwd} show={showConfirm} onToggle={() => setShowConfirm(p => !p)} placeholder="Repite la nueva contraseña" />

          <View style={styles.sheetActions}>
            <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]} onPress={handleClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Text style={styles.saveBtnText}>Guardar</Text>
              }
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function LawyerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut]           = useState(false);
  const [showPwdModal, setShowPwdModal]       = useState(false);
  const [miSuscripcion, setMiSuscripcion]     = useState<MiSuscripcion | null>(null);

  useEffect(() => {
    getMiSuscripcion().then(setMiSuscripcion).catch(() => {});
  }, []);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
    } catch {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const profile     = user?.profile as LawyerProfile | undefined;
  const displayName = user?.user.name || "Abogado";
  const email       = user?.user.email || "";
  const firmName    = profile?.firm?.name;
  const initials    = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const sections = [
    {
      title: "Perfil",
      items: [
        { icon: "person-outline",        label: "Editar perfil",          sublabel: displayName,         onPress: () => router.push("/profile/lawyer") },
        { icon: "key-outline",           label: "Cambiar contraseña",                                    onPress: () => setShowPwdModal(true) },
        { icon: "mail-outline",          label: "Invitaciones de firmas",                                onPress: () => router.push("/lawyer-componts/lawyer-invitations" as any) },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        { icon: "notifications-outline", label: "Ver notificaciones",                                    onPress: () => router.push("/lawyer-componts/lawyer-notifications" as any) },
      ],
    },
    {
      title: "Información",
      items: [
        { icon: "help-circle-outline",   label: "Ayuda y soporte",        sublabel: "soporte@lextrack.com", onPress: () => Alert.alert("Soporte", "soporte@lextrack.com") },
        { icon: "information-circle-outline", label: "Acerca de",         sublabel: "LexTrack v1.0.0",      onPress: () => {} },
      ],
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header navy ── */}
      <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>MI CUENTA</Text>
          <Text style={styles.headerTitle}>Ajustes</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

        {/* ── Tarjeta de usuario ── */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
            {firmName ? (
              <View style={styles.firmBadge}>
                <Ionicons name="business-outline" size={11} color={TEAL} />
                <Text style={styles.firmBadgeText}>{firmName}</Text>
              </View>
            ) : (
              <View style={styles.firmBadge}>
                <Ionicons name="person-outline" size={11} color={TEXT2} />
                <Text style={[styles.firmBadgeText, { color: TEXT2 }]}>Independiente</Text>
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.editAvatarBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/profile/lawyer")}
          >
            <Ionicons name="pencil-outline" size={16} color={TEAL} />
          </Pressable>
        </View>

        {/* ── Secciones ── */}
        {sections.map(s => (
          <SettingsSection key={s.title} title={s.title} items={s.items} />
        ))}

        {/* ── Mi Suscripción ── */}
        {miSuscripcion?.uso && (
          <View style={styles.suscripcionCard}>
            <View style={styles.suscripcionHeader}>
              <Text style={styles.suscripcionTitle}>Mi Suscripción</Text>
              <Pressable onPress={() => router.push("/planes")}>
                <Text style={styles.cambiarPlanText}>Cambiar plan</Text>
              </Pressable>
            </View>
            <Text style={styles.planNombreText}>{miSuscripcion.plan?.nombre ?? "Plan activo"}</Text>
            <UsageBars uso={miSuscripcion.uso} onUpgrade={() => router.push("/planes")} />
          </View>
        )}

        {/* ── Cerrar sesión ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Ionicons name="log-out-outline" size={20} color={DANGER} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.version}>LexTrack v1.0.0</Text>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        userName={displayName}
      />

      <PwdModal visible={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 20,
    gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11, letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26, fontFamily: "Inter_700Bold",
    color: WHITE, letterSpacing: -0.3,
  },

  // Body
  body: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { padding: 16, paddingBottom: 48 },

  // User card
  userCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 18,
    padding: 16, marginBottom: 24, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: NAVY, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: WHITE },
  userInfo: { flex: 1 },
  userName:  { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT },
  userEmail: { fontSize: 13, color: TEXT2, marginTop: 2 },
  firmBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 6, backgroundColor: TEAL + "12",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    alignSelf: "flex-start",
  },
  firmBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEAL },
  editAvatarBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: TEAL + "15",
    alignItems: "center", justifyContent: "center",
  },

  // Secciones
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT3,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: WHITE, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16, gap: 14,
    backgroundColor: WHITE,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  rowPressed: { backgroundColor: BG },
  rowIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: TEAL + "12",
    alignItems: "center", justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: DANGER + "12" },
  rowText: { flex: 1 },
  rowLabel:    { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
  rowSublabel: { fontSize: 12, color: TEXT3, marginTop: 1 },

  // Suscripción
  suscripcionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  suscripcionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  suscripcionTitle:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT },
  cambiarPlanText:   { fontSize: 13, fontFamily: "Inter_500Medium", color: NAVY_MID },
  planNombreText:    { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2, marginBottom: 12 },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: DANGER + "12",
    padding: 16, borderRadius: 16, marginTop: 4,
    borderWidth: 1, borderColor: DANGER + "25",
  },
  logoutBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: DANGER },

  version: {
    textAlign: "center", fontSize: 12,
    color: TEXT3, marginTop: 24,
  },

  // Overlay modal
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: BORDER, alignSelf: "center", marginBottom: 4,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  sheetIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: TEAL + "15", alignItems: "center", justifyContent: "center",
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },

  // Password form
  pwdGroup: { gap: 6 },
  pwdLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  pwdRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: BG, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, overflow: "hidden",
  },
  pwdInput: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT,
  },
  eyeBtn: { paddingHorizontal: 14 },

  // Sheet actions
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: BG, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: NAVY, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },
});
