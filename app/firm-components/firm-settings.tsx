import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { apiRequest } from "@/lib/query-client";
import { getOrCreateSupportConversation } from "@/lib/services/chatService";
import { toast } from "sonner-native";
import { UsageBars } from "@/components/subscription/UsageBars";
import { useSubscription } from "@/lib/subscription-context";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY      = "#0F2640";
const NAVY_MID  = "#1B3A5C";
const TEAL      = "#2196A6";
const AMBER     = "#D4A853";
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
  tint?: string;
};

function SettingsSection({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, i) => {
          const iconColor = item.danger ? DANGER : (item.tint ?? TEAL);
          const iconBg    = iconColor + "12";
          return (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.row,
                i < items.length - 1 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name={item.icon as any} size={18} color={iconColor} />
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
          );
        })}
      </View>
    </View>
  );
}

// ─── Modal de cambio de contraseña ────────────────────────────────────────────
function PwdModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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

          <PwdField label="Contraseña actual"    value={currentPwd} onChange={setCurrentPwd} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder="Tu contraseña actual" />
          <PwdField label="Nueva contraseña"     value={newPwd}     onChange={setNewPwd}     show={showNew}     onToggle={() => setShowNew(p => !p)}     placeholder="Mínimo 6 caracteres" />
          <PwdField label="Confirmar contraseña" value={confirmPwd} onChange={setConfirmPwd} show={showConfirm} onToggle={() => setShowConfirm(p => !p)} placeholder="Repite la nueva contraseña" />

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

// ─── Tipos de configuración de privacidad ─────────────────────────────────────
interface FirmPrivacySettings {
  allowPrivateClientes:       boolean;
  allowPrivateProcesos:       boolean;
  defaultClienteEsCompartido: boolean;
  defaultProcesoEsCompartido: boolean;
}

// ─── Sección de privacidad con toggles ────────────────────────────────────────
function PrivacySection({
  settings,
  saving,
  onToggle,
}: {
  settings: FirmPrivacySettings;
  saving: string | null;
  onToggle: (field: keyof FirmPrivacySettings, value: boolean) => void;
}) {
  type ToggleRow = {
    field:    keyof FirmPrivacySettings;
    icon:     string;
    label:    string;
    sublabel: string;
    enabled?: boolean; // si false, desactiva el toggle visualmente
  };

  const rows: ToggleRow[] = [
    {
      field:    "allowPrivateClientes",
      icon:     "person-circle-outline",
      label:    "Clientes privados",
      sublabel: "Los abogados pueden tener clientes visibles solo para ellos",
    },
    {
      field:    "defaultClienteEsCompartido",
      icon:     "people-outline",
      label:    "Clientes compartidos por defecto",
      sublabel: "Nuevos clientes pertenecen al bufete si no se indica lo contrario",
      enabled:  settings.allowPrivateClientes,
    },
    {
      field:    "allowPrivateProcesos",
      icon:     "document-text-outline",
      label:    "Procesos privados",
      sublabel: "Los abogados pueden tener procesos visibles solo para ellos",
    },
    {
      field:    "defaultProcesoEsCompartido",
      icon:     "folder-open-outline",
      label:    "Procesos compartidos por defecto",
      sublabel: "Nuevos procesos pertenecen al bufete si no se indica lo contrario",
      enabled:  settings.allowPrivateProcesos,
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Privacidad</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, i) => {
          const isDisabled = row.enabled === false;
          const isSaving   = saving === row.field;
          return (
            <View
              key={row.field}
              style={[
                styles.row,
                i < rows.length - 1 && styles.rowBorder,
                isDisabled && { opacity: 0.45 },
              ]}
            >
              <View style={[styles.rowIconWrap, { backgroundColor: TEAL + "12" }]}>
                <Ionicons name={row.icon as any} size={18} color={TEAL} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowSublabel}>{row.sublabel}</Text>
              </View>
              {isSaving ? (
                <ActivityIndicator size="small" color={TEAL} style={{ marginRight: 2 }} />
              ) : (
                <Switch
                  value={settings[row.field]}
                  onValueChange={v => {
                    if (isDisabled) return;
                    onToggle(row.field, v);
                  }}
                  disabled={isDisabled}
                  trackColor={{ false: BORDER, true: TEAL + "80" }}
                  thumbColor={settings[row.field] ? TEAL : "#ccc"}
                  ios_backgroundColor={BORDER}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function FirmSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut]           = useState(false);
  const [showPwdModal, setShowPwdModal]       = useState(false);

  const { plan, uso } = useSubscription();

  const [privacy, setPrivacy]     = useState<FirmPrivacySettings>({
    allowPrivateClientes:       false,
    allowPrivateProcesos:       false,
    defaultClienteEsCompartido: true,
    defaultProcesoEsCompartido: true,
  });
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/firm/settings")
      .then(r => r.json())
      .then((data: FirmPrivacySettings) => setPrivacy(data))
      .catch(() => toast.error("No se pudo cargar la configuración de privacidad."));
  }, []);

  const handlePrivacyToggle = useCallback(
    async (field: keyof FirmPrivacySettings, value: boolean) => {
      const prev = privacy;
      const next = { ...privacy, [field]: value };

      // Si desactivan "clientes privados", forzar compartido por defecto
      if (field === "allowPrivateClientes" && !value) {
        next.defaultClienteEsCompartido = true;
      }
      if (field === "allowPrivateProcesos" && !value) {
        next.defaultProcesoEsCompartido = true;
      }

      setPrivacy(next);
      setSavingField(field);
      try {
        await apiRequest("PATCH", "/api/firm/settings", { [field]: value });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        setPrivacy(prev);
        toast.error("Error al guardar la configuración.");
      } finally {
        setSavingField(null);
      }
    },
    [privacy],
  );

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

  const displayName = user?.user.name || "Mi Bufete";
  const email       = user?.user.email || "";
  const initials    = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const openSupportChat = async () => {
    try {
      const conversation = await getOrCreateSupportConversation();
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: conversation.id,
          name: conversation.name ?? "Soporte LexTrack",
          from: "/firm-components/firm-settings",
          support: "1",
        },
      });
    } catch {
      toast.error("No se pudo abrir el chat de soporte.");
    }
  };

  const sections = [
    {
      title: "Bufete",
      items: [
        { icon: "business-outline",      label: "Información del bufete",  sublabel: displayName,             onPress: () => router.push("/firm-info"),                                          tint: NAVY_MID },
        { icon: "person-outline",        label: "Editar perfil",                                              onPress: () => router.push("/profile/firm") },
        { icon: "key-outline",           label: "Cambiar contraseña",                                         onPress: () => setShowPwdModal(true) },
      ],
    },
    {
      title: "Equipo",
      items: [
        { icon: "person-add-outline",    label: "Invitar abogado",                                            onPress: () => router.push("/firm-components/firm-invite-lawyer" as any) },
        { icon: "mail-outline",          label: "Ver invitaciones",                                           onPress: () => router.push("/firm-components/firm-invitations" as any) },
        { icon: "shield-checkmark-outline", label: "Gestionar roles",                                         onPress: () => router.push("/firm-components/firm-roles" as any),                  tint: AMBER },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        { icon: "notifications-outline", label: "Ver notificaciones",                                         onPress: () => router.push("/firm-components/firm-notifications" as any) },
      ],
    },
    {
      title: "Plan",
      items: [
        { icon: "card-outline",          label: "Plan y facturación",      sublabel: plan?.nombre ?? "Gratis", onPress: () => router.push("/(auth)/planes" as any),                            tint: AMBER },
      ],
    },
    {
      title: "Información",
      items: [
        { icon: "help-circle-outline",   label: "Ayuda y soporte",         sublabel: "Respuesta por chat",   onPress: openSupportChat },
        { icon: "information-circle-outline", label: "Acerca de",          sublabel: "LexTrack v1.0.0",        onPress: () => {} },
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
          <Text style={styles.eyebrow}>GESTIÓN</Text>
          <Text style={styles.headerTitle}>Ajustes</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

        {/* ── Tarjeta de usuario ── */}
        <View style={styles.userCard}>
          <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
            <View style={styles.planBadge}>
              <Ionicons name="star" size={10} color={AMBER} />
              <Text style={styles.planBadgeText}>{plan?.nombre ?? "Gratis"}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/profile/firm")}
          >
            <Ionicons name="pencil-outline" size={16} color={TEAL} />
          </Pressable>
        </View>

        {/* ── Secciones estáticas ── */}
        {sections.map(s => (
          <SettingsSection key={s.title} title={s.title} items={s.items} />
        ))}

        {/* ── Privacidad ── */}
        <FeatureGate featureCode="privacidad_basica">
          <PrivacySection
            settings={privacy}
            saving={savingField}
            onToggle={handlePrivacyToggle}
          />
        </FeatureGate>

        {/* ── Mi Suscripción ── */}
        <View style={styles.suscripcionCard}>
          {/* Banner del plan */}
          <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.suscripcionBanner}>
            <View style={styles.suscripcionBannerLeft}>
              <View style={styles.suscripcionBannerIconWrap}>
                <Ionicons name="business" size={22} color={AMBER} />
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

          {/* Barras de uso */}
          {uso && (
            <View style={styles.suscripcionUsageWrap}>
              <UsageBars uso={uso} onUpgrade={() => router.push("/(auth)/planes" as any)} />
            </View>
          )}

          {/* Botón de upgrade */}
          <Pressable
            style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/(auth)/planes" as any)}
          >
            <Text style={styles.upgradeBtnText}>Ver planes y mejorar</Text>
            <Ionicons name="chevron-forward" size={15} color={NAVY} />
          </Pressable>
        </View>

        {/* ── Cerrar sesión ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Ionicons name="log-out-outline" size={20} color={DANGER} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.version}>LexTrack v1.0.0 · {plan?.nombre ?? "Gratis"}</Text>
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
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: WHITE },
  userInfo: { flex: 1 },
  userName:  { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT },
  userEmail: { fontSize: 13, color: TEXT2, marginTop: 2 },
  planBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 6, backgroundColor: AMBER + "18",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    alignSelf: "flex-start",
  },
  planBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: AMBER },
  editBtn: {
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
    alignItems: "center", justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel:    { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
  rowSublabel: { fontSize: 12, color: TEXT3, marginTop: 1 },

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

  // Suscripción
  suscripcionCard: {
    backgroundColor: WHITE, borderRadius: 20,
    marginBottom: 12, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
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
    gap: 8, backgroundColor: AMBER,
    margin: 16, marginTop: 8,
    borderRadius: 12, paddingVertical: 13,
  },
  upgradeBtnText: {
    fontSize: 14, fontFamily: "Inter_600SemiBold",
    color: NAVY, flex: 1, textAlign: "center",
  },

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
