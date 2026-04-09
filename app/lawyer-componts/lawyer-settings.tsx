import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";
import { apiRequest } from "@/lib/query-client";
import { getOrCreateSupportConversation } from "@/lib/services/chatService";
import { LawyerProfile } from "@/shared/schema";
import { toast } from "sonner-native";
import { UsageBars } from "@/components/subscription/UsageBars";
import { useSubscription } from "@/lib/subscription-context";

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
  centered = false,
}: {
  visible: boolean;
  onClose: () => void;
  centered?: boolean;
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
      <Pressable style={[styles.overlay, centered && styles.overlayCentered]} onPress={handleClose}>
        <Pressable style={[styles.sheet, centered && styles.sheetCentered]} onPress={e => e.stopPropagation()}>
          {!centered && <View style={styles.sheetHandle} />}
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
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut]           = useState(false);
  const [showPwdModal, setShowPwdModal]       = useState(false);
  const { plan, uso }                         = useSubscription();
  const isDesktop = width >= 1100;
  const isWideDesktop = width >= 1440;

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
  const verificationStatus = profile?.professionalVerificationStatus ?? "pendiente";
  const isProfessionallyVerified = verificationStatus === "verificado";
  const initials    = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const openSupportChat = async () => {
    try {
      const conversation = await getOrCreateSupportConversation();
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: conversation.id,
          name: conversation.name ?? "Soporte ProcesoClaro",
          from: "/lawyer-componts/lawyer-settings",
          support: "1",
        },
      });
    } catch {
      toast.error("No se pudo abrir el chat de soporte.");
    }
  };

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
        { icon: "help-circle-outline",   label: "Ayuda y soporte",        sublabel: "Respuesta por chat", onPress: openSupportChat },
        { icon: "information-circle-outline", label: "Acerca de",         sublabel: "ProcesoClaro v1.0.0",      onPress: () => {} },
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

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          isDesktop && styles.bodyContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.shell, isWideDesktop && styles.shellWide]}>
          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.mainColumn, isDesktop && styles.mainColumnDesktop]}>
              <LinearGradient
                colors={[WHITE, "#F8FBFD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.userCard, isDesktop && styles.userCardDesktop]}
              >
                <View style={[styles.userCardTop, isDesktop && styles.userCardTopDesktop]}>
                  <View style={[styles.avatar, isDesktop && styles.avatarDesktop]}>
                    <Text style={[styles.avatarText, isDesktop && styles.avatarTextDesktop]}>{initials}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userEyebrow}>PERFIL PROFESIONAL</Text>
                    <Text style={[styles.userName, isDesktop && styles.userNameDesktop]}>{displayName}</Text>
                    <Text style={[styles.userEmail, isDesktop && styles.userEmailDesktop]}>{email}</Text>
                    <View style={styles.badgesRow}>
                      {firmName ? (
                        <View style={styles.firmBadge}>
                          <Ionicons name="business-outline" size={11} color={TEAL} />
                          <Text style={styles.firmBadgeText}>{firmName}</Text>
                        </View>
                      ) : (
                        <View style={styles.neutralBadge}>
                          <Ionicons name="sparkles-outline" size={11} color={TEXT2} />
                          <Text style={styles.neutralBadgeText}>Práctica independiente</Text>
                        </View>
                      )}
                      <View style={styles.neutralBadge}>
                        <Ionicons name="card-outline" size={11} color={TEXT2} />
                        <Text style={styles.neutralBadgeText}>{plan?.nombre ?? "Gratis"}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.editAvatarBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push("/profile/lawyer")}
                  >
                    <Ionicons name="pencil-outline" size={16} color={TEAL} />
                  </Pressable>
                </View>

                {isDesktop && (
                  <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatCard}>
                      <Text style={styles.heroStatLabel}>Área</Text>
                      <Text style={styles.heroStatValue}>{profile?.specialization || "General"}</Text>
                    </View>
                    <View style={styles.heroStatCard}>
                      <Text style={styles.heroStatLabel}>Firma</Text>
                      <Text style={styles.heroStatValue}>{firmName || "Independiente"}</Text>
                    </View>
                    <View style={styles.heroStatCard}>
                      <Text style={styles.heroStatLabel}>Acceso</Text>
                      <Text style={styles.heroStatValue}>Configuración y soporte</Text>
                    </View>
                  </View>
                )}

                {!isProfessionallyVerified && (
                  <View style={styles.verificationNotice}>
                    <View style={styles.verificationNoticeIcon}>
                      <Ionicons name="shield-outline" size={18} color="#B45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verificationNoticeTitle}>
                        Tarjeta profesional en {verificationStatus === "rechazado" ? "revisión pendiente de corrección" : "verificación administrativa"}
                      </Text>
                      <Text style={styles.verificationNoticeText}>
                        Mientras no esté verificada, podrás usar la plataforma pero no podrás tomar casos desde comunidad ni aparecer en recomendaciones públicas.
                      </Text>
                    </View>
                  </View>
                )}
              </LinearGradient>

              <View style={[styles.sectionsGrid, isDesktop && styles.sectionsGridDesktop]}>
                {sections.map(s => (
                  <View key={s.title} style={isDesktop && styles.sectionGridItem}>
                    <SettingsSection title={s.title} items={s.items} />
                  </View>
                ))}
              </View>

              {!isDesktop && (
                <>
                  <View style={styles.suscripcionCard}>
                    <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.suscripcionBanner}>
                      <View style={styles.suscripcionBannerLeft}>
                        <View style={styles.suscripcionBannerIconWrap}>
                          <Ionicons name="shield-checkmark" size={22} color={TEAL} />
                        </View>
                        <View>
                          <Text style={styles.suscripcionBannerLabel}>Plan activo</Text>
                          <Text style={styles.suscripcionBannerNombre}>{plan?.nombre ?? "Gratis"}</Text>
                        </View>
                      </View>
                      <View style={styles.suscripcionActiveBadge}>
                        <View style={styles.suscripcionActiveDot} />
                        <Text style={styles.suscripcionActiveText}>Activo</Text>
                      </View>
                    </LinearGradient>

                    {uso && (
                      <View style={styles.suscripcionUsageWrap}>
                        <UsageBars uso={uso} onUpgrade={() => router.push("/(auth)/planes" as any)} />
                      </View>
                    )}

                    <Pressable
                      style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.88 }]}
                      onPress={() => router.push("/(auth)/planes" as any)}
                    >
                      <Text style={styles.upgradeBtnText}>Ver planes y mejorar</Text>
                      <Ionicons name="chevron-forward" size={15} color={NAVY} />
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setShowLogoutModal(true)}
                  >
                    <Ionicons name="log-out-outline" size={20} color={DANGER} />
                    <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                  </Pressable>
                </>
              )}
            </View>

            {isDesktop && (
              <View style={styles.sideColumn}>
                <View style={styles.desktopQuickPanel}>
                  <Text style={styles.desktopQuickTitle}>Accesos rápidos</Text>
                  <Text style={styles.desktopQuickText}>
                    Administra tu cuenta, revisa tu plan y entra rápido a soporte o notificaciones.
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => router.push("/lawyer-componts/lawyer-notifications" as any)}
                  >
                    <Ionicons name="notifications-outline" size={18} color={WHITE} />
                    <Text style={styles.quickActionBtnText}>Abrir notificaciones</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.quickActionSecondary, pressed && { opacity: 0.78 }]}
                    onPress={openSupportChat}
                  >
                    <Ionicons name="help-circle-outline" size={18} color={NAVY} />
                    <Text style={styles.quickActionSecondaryText}>Contactar soporte</Text>
                  </Pressable>
                </View>

                <View style={[styles.suscripcionCard, styles.suscripcionCardDesktop]}>
                  <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.suscripcionBanner}>
                    <View style={styles.suscripcionBannerLeft}>
                      <View style={styles.suscripcionBannerIconWrap}>
                        <Ionicons name="shield-checkmark" size={22} color={TEAL} />
                      </View>
                      <View>
                        <Text style={styles.suscripcionBannerLabel}>Plan activo</Text>
                        <Text style={styles.suscripcionBannerNombre}>{plan?.nombre ?? "Gratis"}</Text>
                      </View>
                    </View>
                    <View style={styles.suscripcionActiveBadge}>
                      <View style={styles.suscripcionActiveDot} />
                      <Text style={styles.suscripcionActiveText}>Activo</Text>
                    </View>
                  </LinearGradient>

                  {uso && (
                    <View style={styles.suscripcionUsageWrap}>
                      <UsageBars uso={uso} onUpgrade={() => router.push("/(auth)/planes" as any)} />
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.88 }]}
                    onPress={() => router.push("/(auth)/planes" as any)}
                  >
                    <Text style={styles.upgradeBtnText}>Ver planes y mejorar</Text>
                    <Ionicons name="chevron-forward" size={15} color={NAVY} />
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.logoutBtn, styles.logoutBtnDesktop, pressed && { opacity: 0.85 }]}
                  onPress={() => setShowLogoutModal(true)}
                >
                  <Ionicons name="log-out-outline" size={20} color={DANGER} />
                  <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.version}>ProcesoClaro v1.0.0</Text>
        </View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        userName={displayName}
      />

      <PwdModal visible={showPwdModal} onClose={() => setShowPwdModal(false)} centered={isDesktop} />
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
  bodyContentDesktop: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 56 },
  shell: { width: "100%", alignSelf: "center" },
  shellWide: { maxWidth: 1480, alignSelf: "center" },
  columns: { width: "100%" },
  columnsDesktop: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  mainColumn: { minWidth: 0 },
  mainColumnDesktop: { flex: 1 },
  sideColumn: { width: 360, gap: 18 },

  // User card
  userCard: {
    backgroundColor: WHITE, borderRadius: 18,
    padding: 16, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: "rgba(15,38,64,0.06)",
  },
  userCardDesktop: { padding: 24, borderRadius: 24, marginBottom: 28 },
  userCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  userCardTopDesktop: { alignItems: "flex-start" },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: NAVY, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarDesktop: { width: 76, height: 76, borderRadius: 22 },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: WHITE },
  avatarTextDesktop: { fontSize: 26 },
  userInfo: { flex: 1 },
  userEyebrow: {
    fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase",
    color: TEXT3, fontFamily: "Inter_600SemiBold", marginBottom: 6,
  },
  userName:  { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT },
  userNameDesktop: { fontSize: 28, letterSpacing: -0.5 },
  userEmail: { fontSize: 13, color: TEXT2, marginTop: 2 },
  userEmailDesktop: { fontSize: 14, marginTop: 4 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  firmBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: TEAL + "12",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    alignSelf: "flex-start",
  },
  firmBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEAL },
  neutralBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EEF2F6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    alignSelf: "flex-start",
  },
  neutralBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  editAvatarBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: TEAL + "15",
    alignItems: "center", justifyContent: "center",
  },
  heroStatsRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  heroStatCard: {
    flex: 1, minWidth: 0, backgroundColor: WHITE,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  heroStatLabel: {
    fontSize: 11, color: TEXT3, textTransform: "uppercase", letterSpacing: 1.1,
    fontFamily: "Inter_600SemiBold", marginBottom: 6,
  },
  heroStatValue: { fontSize: 14, color: TEXT, fontFamily: "Inter_600SemiBold" },
  verificationNotice: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 14,
  },
  verificationNoticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  verificationNoticeTitle: {
    fontSize: 14,
    color: "#9A3412",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  verificationNoticeText: {
    fontSize: 13,
    color: "#9A3412",
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },

  // Secciones
  section: { marginBottom: 20 },
  sectionsGrid: { width: "100%" },
  sectionsGridDesktop: { flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "flex-start" },
  sectionGridItem: { flexBasis: 320, minWidth: 320, flexGrow: 1, flexShrink: 1 },
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

  desktopQuickPanel: {
    backgroundColor: NAVY, borderRadius: 24, padding: 22,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 4,
  },
  desktopQuickTitle: { fontSize: 22, color: WHITE, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  desktopQuickText: { fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 20, marginTop: 10, marginBottom: 18 },
  quickActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  quickActionBtnText: { fontSize: 14, color: WHITE, fontFamily: "Inter_600SemiBold" },
  quickActionSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: WHITE, borderRadius: 14, paddingVertical: 13,
  },
  quickActionSecondaryText: { fontSize: 14, color: NAVY, fontFamily: "Inter_600SemiBold" },

  // Suscripción
  suscripcionCard: {
    backgroundColor: WHITE, borderRadius: 20,
    marginBottom: 12, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  suscripcionCardDesktop: { marginBottom: 0 },
  suscripcionBanner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 18,
  },
  suscripcionBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  suscripcionBannerIconWrap: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  suscripcionBannerLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)", letterSpacing: 0.4,
    marginBottom: 2,
  },
  suscripcionBannerNombre: {
    fontSize: 20, fontFamily: "Inter_700Bold",
    color: WHITE, letterSpacing: -0.3,
  },
  suscripcionActiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  suscripcionActiveDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80",
  },
  suscripcionActiveText: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
  },
  suscripcionUsageWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL,
    margin: 16, marginTop: 8,
    borderRadius: 12, paddingVertical: 13,
  },
  upgradeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE, flex: 1, textAlign: "center" },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: DANGER + "12",
    padding: 16, borderRadius: 16, marginTop: 4,
    borderWidth: 1, borderColor: DANGER + "25",
  },
  logoutBtnDesktop: { marginTop: 0 },
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
  overlayCentered: { justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  sheetCentered: {
    width: "100%", maxWidth: 520, borderRadius: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
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
