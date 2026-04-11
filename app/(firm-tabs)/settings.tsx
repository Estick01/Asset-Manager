import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, ActivityIndicator, Switch, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";
import { apiRequest } from "@/lib/query-client";
import { getOrCreateSupportConversation } from "@/lib/services/chatService";
import { getPlanes } from "@/lib/services/suscripcionService";
import { toast } from "sonner-native";
import { UsageBars } from "@/components/subscription/UsageBars";
import { getFeatureMinPlan, useSubscription } from "@/lib/subscription-context";

type FirmPrivacySettings = {
  allowPrivateClientes: boolean;
  allowPrivateProcesos: boolean;
  defaultClienteEsCompartido: boolean;
  defaultProcesoEsCompartido: boolean;
};

export default function FirmSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { plan, uso, hasFeature } = useSubscription();
  const isDesktop = width >= 1200;
  const isWideDesktop = width >= 1500;
  const [teamCount, setTeamCount] = useState<number | null>(null);
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
  const [upgradeTarget, setUpgradeTarget] = useState<{ code: string; label: string; planName: string } | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<FirmPrivacySettings>({
    allowPrivateClientes: false,
    allowPrivateProcesos: false,
    defaultClienteEsCompartido: true,
    defaultProcesoEsCompartido: true,
  });
  const [privacySavingField, setPrivacySavingField] = useState<keyof FirmPrivacySettings | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    mensajes: true,
    vencimientos: true,
    cambiosProcesos: true,
    equipoInvitaciones: true,
    alertasPlan: true,
    resumenSemanal: false,
  });
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  useEffect(() => {
    const firmId = (user?.profile as { id?: string } | undefined)?.id;
    if (!firmId) {
      setTeamCount(null);
      return;
    }

    apiRequest("GET", `/api/lawyer-firma-history/count/${firmId}`, undefined, { silent: true })
      .then(async (res) => {
        if (!res.ok) {
          setTeamCount(null);
          return;
        }
        const data = await res.json();
        setTeamCount(typeof data.count === "number" ? data.count : null);
      })
      .catch(() => setTeamCount(null));
  }, [user?.profile]);

  useEffect(() => {
    const firmId = (user?.profile as { id?: string } | undefined)?.id;
    if (!firmId) return;

    apiRequest("GET", "/api/firm/settings", undefined, { silent: true })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setPrivacySettings({
          allowPrivateClientes: data.allowPrivateClientes ?? false,
          allowPrivateProcesos: data.allowPrivateProcesos ?? false,
          defaultClienteEsCompartido: data.defaultClienteEsCompartido ?? true,
          defaultProcesoEsCompartido: data.defaultProcesoEsCompartido ?? true,
        });
        setNotificationPrefs({
          mensajes: data.notifMensajes ?? true,
          vencimientos: data.notifVencimientos ?? true,
          cambiosProcesos: data.notifCambiosProcesos ?? true,
          equipoInvitaciones: data.notifEquipoInvitaciones ?? true,
          alertasPlan: data.notifAlertasPlan ?? true,
          resumenSemanal: data.notifResumenSemanal ?? false,
        });
      })
      .catch(() => {});
  }, [user?.profile]);

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

  const openSupportChat = async () => {
    try {
      const conversation = await getOrCreateSupportConversation();
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: conversation.id,
          name: conversation.name ?? "Soporte ProcesoClaro",
          from: "/(firm-tabs)/settings",
          support: "1",
        },
      });
    } catch {
      toast.error("No se pudo abrir el chat de soporte.");
    }
  };

  const openFirmRoles = () => {
    if (hasFeature("roles_custom")) {
      router.push("/firm-components/firm-roles" as any);
      return;
    }

    setUpgradeTarget({
      code: "roles_custom",
      label: "Roles personalizados",
      planName: getFeatureMinPlan("roles_custom", user?.user?.rol?.nombre),
    });
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
      title: "Perfil del Bufete",
      items: [
        { icon: "business-outline", label: "Informacion del Bufete", onPress: () => router.push("/firm-info") },
        { icon: "person-outline", label: "Editar Perfil", onPress: () => router.push("/profile/firm") },
        { icon: "key-outline", label: "Cambiar Contrasena", onPress: openPwdModal },
      ],
    },
    {
      title: "Seguridad",
      items: [
        { icon: "lock-closed-outline", label: "Autenticacion en dos pasos", onPress: () => router.push("/security/two-factor" as any) },
        { icon: "shield-checkmark-outline", label: "Dispositivos e Inicio de Sesion", onPress: () => router.push("/security/devices" as any) },
      ],
    },
    {
      title: "Equipo",
      items: [
        { icon: "person-add-outline", label: "Invitar Abogado", onPress: () => router.push("/firm-components/firm-invite-lawyer" as any) },
        { icon: "mail-outline", label: "Ver Invitaciones", onPress: () => router.push("/firm-components/firm-invitations" as any) },
        {
          icon: "people-outline",
          label: "Gestionar Permisos",
          sublabel: hasFeature("roles_custom")
            ? "Roles personalizados activos para tu equipo"
            : `Disponible desde ${getFeatureMinPlan("roles_custom", user?.user?.rol?.nombre)}`,
          onPress: openFirmRoles,
        },
      ],
    },
    {
      title: "Facturacion",
      items: [
        { icon: "card-outline", label: "Plan y Facturacion", onPress: () => router.push("/(auth)/planes" as any) },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        { icon: "notifications-outline", label: "Configurar Notificaciones", onPress: () => setShowNotificationsModal(true) },
      ],
    },
    {
      title: "Aplicacion",
      items: [
        { icon: "help-circle-outline", label: "Ayuda y Soporte", onPress: openSupportChat },
        { icon: "information-circle-outline", label: "Acerca de", onPress: () => setShowAboutModal(true) },
      ],
    },
  ];

  const lockedFeatureSections = [
    { code: "privacidad_avanzada", icon: "shield-half-outline", label: "Privacidad avanzada" },
    { code: "roles_custom", icon: "keypad-outline", label: "Roles personalizados" },
    { code: "chat", icon: "chatbubble-ellipses-outline", label: "Chat con clientes" },
    { code: "comunidad", icon: "people-circle-outline", label: "Comunidad ProcesoClaro" },
    { code: "soporte_prioritario", icon: "flash-outline", label: "Soporte prioritario" },
  ].filter((item) => !hasFeature(item.code));

  const handleUpgradeFeature = async () => {
    if (!upgradeTarget) return;
    setUpgradeLoading(true);
    try {
      const plans = await getPlanes("bufete");
      const targetPlan = plans.find((item) => item.nombre.toLowerCase() === upgradeTarget.planName.toLowerCase());

      if (!targetPlan) {
        toast.error(`No se encontró el plan ${upgradeTarget.planName}.`);
        return;
      }

      router.push({
        pathname: "/checkout",
        params: {
          planId: targetPlan.id,
          ciclo: "mensual",
          extraUsers: String(Math.max(teamCount ?? targetPlan.includedUsers, targetPlan.includedUsers)),
          planNombre: targetPlan.nombre,
        },
      });
      setUpgradeTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el cambio de plan.";
      toast.error(message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setNotificationsSaving(true);
    try {
      await apiRequest("PATCH", "/api/firm/settings", {
        notifMensajes: notificationPrefs.mensajes,
        notifVencimientos: notificationPrefs.vencimientos,
        notifCambiosProcesos: notificationPrefs.cambiosProcesos,
        notifEquipoInvitaciones: notificationPrefs.equipoInvitaciones,
        notifAlertasPlan: notificationPrefs.alertasPlan,
        notifResumenSemanal: notificationPrefs.resumenSemanal,
      });
      toast.success("Preferencias guardadas.");
      setShowNotificationsModal(false);
    } catch {
      toast.error("No se pudieron guardar las preferencias.");
    } finally {
      setNotificationsSaving(false);
    }
  };

  const handlePrivacyToggle = async (field: keyof FirmPrivacySettings, value: boolean) => {
    const previous = privacySettings;
    const next: FirmPrivacySettings = { ...privacySettings, [field]: value };

    if (field === "allowPrivateClientes" && !value) {
      next.defaultClienteEsCompartido = true;
    }
    if (field === "allowPrivateProcesos" && !value) {
      next.defaultProcesoEsCompartido = true;
    }

    setPrivacySettings(next);
    setPrivacySavingField(field);
    try {
      await apiRequest("PATCH", "/api/firm/settings", { [field]: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setPrivacySettings(previous);
      toast.error("No se pudo guardar la configuración de privacidad.");
    } finally {
      setPrivacySavingField(null);
    }
  };

  const profileName = user?.user.name || "Mi Bufete";
  const profileEmail = user?.user?.email || "";
  const initials = profileName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const planPanel = (
    <View style={[styles.suscripcionCard, isDesktop && styles.suscripcionCardDesktop]}>
      <LinearGradient colors={["#0F2640", "#1B3A5C"]} style={styles.suscripcionBanner}>
        <View style={styles.suscripcionBannerLeft}>
          <View style={styles.suscripcionBannerIconWrap}>
            <Ionicons name="card-outline" size={22} color={Colors.accent} />
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

      <View style={styles.planStatsRow}>
        <View style={styles.planStatCard}>
          <Text style={styles.planStatLabel}>Procesos</Text>
          <Text style={styles.planStatValue}>
            {plan ? (plan.maxProcesos === -1 ? "Ilimitado" : plan.maxProcesos) : "—"}
          </Text>
        </View>
        <View style={styles.planStatCard}>
          <Text style={styles.planStatLabel}>Clientes</Text>
          <Text style={styles.planStatValue}>
            {plan ? (plan.maxClientes === -1 ? "Ilimitado" : plan.maxClientes) : "—"}
          </Text>
        </View>
        <View style={styles.planStatCard}>
          <Text style={styles.planStatLabel}>Capacidad</Text>
          <Text style={styles.planStatValue}>
            {plan ? `${plan.includedUsers}${plan.maxUsers === -1 ? "+" : `/${plan.maxUsers}`}` : "—"}
          </Text>
        </View>
        <View style={styles.planStatCard}>
          <Text style={styles.planStatLabel}>Equipo actual</Text>
          <Text style={styles.planStatValue}>
            {teamCount == null ? "—" : `${teamCount}${plan ? `/${plan.maxUsers === -1 ? "∞" : plan.maxUsers}` : ""}`}
          </Text>
        </View>
      </View>

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
        <Ionicons name="chevron-forward" size={15} color={Colors.primary} />
      </Pressable>
    </View>
  );

  const privacyRows = [
    {
      field: "allowPrivateClientes" as const,
      icon: "person-circle-outline",
      label: "Permitir clientes privados",
      sublabel: "Los abogados pueden crear clientes visibles solo para ellos.",
      available: hasFeature("privacidad_basica"),
    },
    {
      field: "defaultClienteEsCompartido" as const,
      icon: "people-outline",
      label: "Clientes compartidos por defecto",
      sublabel: "Si no se marca privado, el nuevo cliente pertenecerá al bufete.",
      available: hasFeature("privacidad_basica"),
      enabled: privacySettings.allowPrivateClientes,
    },
    {
      field: "allowPrivateProcesos" as const,
      icon: "document-text-outline",
      label: "Permitir procesos privados",
      sublabel: "Los abogados pueden crear procesos visibles solo para ellos.",
      available: hasFeature("privacidad_avanzada"),
    },
    {
      field: "defaultProcesoEsCompartido" as const,
      icon: "folder-open-outline",
      label: "Procesos compartidos por defecto",
      sublabel: "Si no se marca privado, el nuevo proceso pertenecerá al bufete.",
      available: hasFeature("privacidad_avanzada"),
      enabled: privacySettings.allowPrivateProcesos,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#0F2640", "#1B3A5C", "#355E84"]} style={styles.header}>
        <View style={[styles.headerInner, isWideDesktop && styles.headerInnerWide]}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </Pressable>
            <View style={styles.headerChip}>
              <Text style={styles.headerChipText}>Workspace del bufete</Text>
            </View>
          </View>

          <View style={[styles.heroRow, isDesktop && styles.heroRowDesktop]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>CONFIGURACIÓN INSTITUCIONAL</Text>
              <Text style={styles.title}>Ajustes del bufete</Text>
              <Text style={styles.heroText}>
                Administra identidad, equipo, permisos y capacidad del plan desde una experiencia optimizada para escritorio.
              </Text>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroCardTop}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>{initials}</Text>
                </View>
                <View style={styles.heroCardInfo}>
                  <Text style={styles.heroName}>{profileName}</Text>
                  <Text style={styles.heroEmail}>{profileEmail}</Text>
                </View>
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaChip}>
                  <Ionicons name="star" size={12} color="#B7791F" />
                  <Text style={styles.heroMetaText}>{plan?.nombre ?? "Gratis"}</Text>
                </View>
                <View style={styles.heroMetaChip}>
                  <Ionicons name="people-outline" size={12} color="#2563EB" />
                  <Text style={styles.heroMetaText}>{teamCount == null ? "Equipo —" : `${teamCount} abogados`}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={[styles.pageShell, isWideDesktop && styles.pageShellWide]}>
          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={styles.mainColumn}>
              <LinearGradient colors={["#FFFFFF", "#F7FAFC"]} style={[styles.userCard, isDesktop && styles.userCardDesktop]}>
                <View style={[styles.userCardTop, isDesktop && styles.userCardTopDesktop]}>
                  <View style={styles.userCardIdentity}>
                    <View style={styles.userCardBadge}>
                      <Ionicons name="business-outline" size={14} color="#0F2640" />
                      <Text style={styles.userCardBadgeText}>Cuenta institucional</Text>
                    </View>
                    <Text style={styles.userName}>{profileName}</Text>
                    <Text style={styles.userEmail}>{profileEmail}</Text>
                    <Text style={styles.userPlan}>{plan?.nombre ?? "Gratis"}</Text>
                  </View>
                  <View style={styles.userCardActions}>
                    <Pressable style={({ pressed }) => [styles.primaryAction, pressed && { opacity: 0.9 }]} onPress={() => router.push("/profile/firm")}>
                      <Text style={styles.primaryActionText}>Editar perfil</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.secondaryAction, pressed && { opacity: 0.85 }]} onPress={openFirmRoles}>
                      <Text style={styles.secondaryActionText}>Roles y permisos</Text>
                    </Pressable>
                    {!hasFeature("roles_custom") && (
                      <View style={styles.inlinePremiumBadge}>
                        <Ionicons name="sparkles-outline" size={12} color="#7B5E00" />
                        <Text style={styles.inlinePremiumBadgeText}>
                          Desde {getFeatureMinPlan("roles_custom", user?.user?.rol?.nombre)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>

              <View style={[styles.sectionsGrid, isDesktop && styles.sectionsGridDesktop]}>
                {settingsSections.map((section, sectionIndex) => (
                  <View key={sectionIndex} style={[styles.section, isDesktop && styles.sectionDesktop]}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={[styles.sectionContent, isDesktop && styles.sectionContentDesktop]}>
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
                            <View style={styles.settingIconBadge}>
                              <Ionicons name={item.icon as any} size={20} color={Colors.white} />
                            </View>
                            <View style={styles.settingCopy}>
                              <Text style={styles.settingItemLabel}>{item.label}</Text>
                              {"sublabel" in item && typeof item.sublabel === "string" && item.sublabel ? (
                                <Text style={styles.settingItemSubLabel}>{item.sublabel}</Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {privacyRows.some((item) => item.available) && (
                <View style={[styles.section, styles.privacySection, isDesktop && styles.sectionDesktop]}>
                  <Text style={styles.sectionTitle}>Privacidad y propiedad</Text>
                  <View style={[styles.sectionContent, isDesktop && styles.sectionContentDesktop]}>
                    {privacyRows.filter((item) => item.available).map((item, index, arr) => {
                      const disabled = item.enabled === false;
                      const saving = privacySavingField === item.field;
                      return (
                        <View
                          key={item.field}
                          style={[
                            styles.settingItem,
                            index < arr.length - 1 && styles.settingItemBorder,
                            disabled && styles.settingItemDisabled,
                          ]}
                        >
                          <View style={styles.settingItemLeft}>
                            <View style={[styles.settingIconBadge, styles.settingIconBadgePrivacy]}>
                              <Ionicons name={item.icon as any} size={20} color={Colors.white} />
                            </View>
                            <View style={styles.settingCopy}>
                              <Text style={styles.settingItemLabel}>{item.label}</Text>
                              <Text style={styles.settingItemSubLabel}>{item.sublabel}</Text>
                            </View>
                          </View>
                          {saving ? (
                            <ActivityIndicator size="small" color="#0F2640" />
                          ) : (
                            <Switch
                              value={privacySettings[item.field]}
                              onValueChange={(value) => {
                                if (disabled) return;
                                handlePrivacyToggle(item.field, value);
                              }}
                              disabled={disabled}
                              trackColor={{ false: "#D9E2EC", true: "#9CC3E6" }}
                              thumbColor={privacySettings[item.field] ? "#0F2640" : "#FFFFFF"}
                              ios_backgroundColor="#D9E2EC"
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {lockedFeatureSections.length > 0 && (
                <View style={[styles.section, styles.lockedSection, isDesktop && styles.sectionDesktop]}>
                  <Text style={styles.sectionTitle}>Disponible al mejorar plan</Text>
                  <View style={[styles.sectionContent, isDesktop && styles.sectionContentDesktop]}>
                    {lockedFeatureSections.map((item, index) => (
                      <Pressable
                        key={item.code}
                        style={({ pressed }) => [
                          styles.settingItem,
                          index < lockedFeatureSections.length - 1 && styles.settingItemBorder,
                          pressed && styles.settingItemPressed,
                        ]}
                        onPress={() =>
                          setUpgradeTarget({
                            code: item.code,
                            label: item.label,
                            planName: getFeatureMinPlan(item.code, user?.user?.rol?.nombre),
                          })
                        }
                      >
                        <View style={styles.settingItemLeft}>
                          <View style={[styles.settingIconBadge, styles.settingIconBadgeLocked]}>
                            <Ionicons name={item.icon as any} size={20} color={Colors.white} />
                          </View>
                          <View style={styles.settingCopy}>
                            <Text style={styles.settingItemLabel}>{item.label}</Text>
                            <Text style={styles.settingItemSubLabel}>
                              Disponible desde {getFeatureMinPlan(item.code, user?.user?.rol?.nombre)}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="lock-closed-outline" size={18} color="#B7791F" />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {!isDesktop && planPanel}
            </View>

            {isDesktop && (
              <View style={styles.sideColumn}>
                <View style={styles.sideIntroCard}>
                  <Text style={styles.sideIntroEyebrow}>RESUMEN</Text>
                  <Text style={styles.sideIntroTitle}>Centro de control del bufete</Text>
                  <Text style={styles.sideIntroText}>
                    Revisa capacidad, crecimiento del equipo y accesos clave desde una columna lateral persistente.
                  </Text>
                </View>
                {planPanel}
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed, isDesktop && styles.logoutButtonDesktop]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
            <Text style={styles.logoutButtonText}>Cerrar Sesion</Text>
          </Pressable>

          <Text style={styles.version}>ProcesoClaro v1.0.0 - {plan?.nombre ?? "Gratis"}</Text>
        </View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        userName={user?.user.name!}
      />

      <Modal visible={upgradeTarget !== null} transparent animationType="fade" onRequestClose={() => !upgradeLoading && setUpgradeTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.upgradeModal}>
            <View style={styles.upgradeModalIcon}>
              <Ionicons name="rocket-outline" size={22} color={Colors.white} />
            </View>
            <Text style={styles.upgradeModalTitle}>Habilitar funcionalidad</Text>
            <Text style={styles.upgradeModalText}>
              {upgradeTarget?.label} no está incluida en tu plan actual.
            </Text>
            <Text style={styles.upgradeModalText}>
              Puedes cambiar directamente al plan <Text style={styles.upgradeModalHighlight}>{upgradeTarget?.planName}</Text> para habilitarla.
            </Text>

            <View style={styles.upgradeModalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setUpgradeTarget(null)}
                disabled={upgradeLoading}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.upgradeNowBtn, pressed && { opacity: 0.9 }, upgradeLoading && { opacity: 0.7 }]}
                onPress={handleUpgradeFeature}
                disabled={upgradeLoading}
              >
                {upgradeLoading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.upgradeNowBtnText}>Cambiar plan</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAboutModal} transparent animationType="fade" onRequestClose={() => setShowAboutModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.aboutModal}>
            <LinearGradient colors={["#0F2640", "#1B3A5C"]} style={styles.aboutHeader}>
              <View style={styles.aboutIconWrap}>
                <Ionicons name="information-circle-outline" size={26} color={Colors.white} />
              </View>
              <Text style={styles.aboutTitle}>ProcesoClaro</Text>
              <Text style={styles.aboutSubtitle}>Sistema de gestión jurídica para bufetes y abogados</Text>
            </LinearGradient>

            <View style={styles.aboutBody}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Versión</Text>
                <Text style={styles.aboutValue}>1.0.0</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Plan actual</Text>
                <Text style={styles.aboutValue}>{plan?.nombre ?? "Gratis"}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Producto</Text>
                <Text style={styles.aboutValue}>Workspace legal web</Text>
              </View>

              <Text style={styles.aboutDescription}>
                ProcesoClaro centraliza operación jurídica, clientes, procesos, equipo, mensajería y suscripción en una sola plataforma.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.aboutCloseBtn, pressed && { opacity: 0.9 }]}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.aboutCloseBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotificationsModal} transparent animationType="fade" onRequestClose={() => setShowNotificationsModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.notificationsModal}>
            <LinearGradient colors={["#0F2640", "#1B3A5C"]} style={styles.notificationsHeader}>
              <View style={styles.notificationsHeaderIcon}>
                <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              </View>
              <Text style={styles.notificationsTitle}>Configurar notificaciones</Text>
              <Text style={styles.notificationsSubtitle}>
                Elige qué alertas quieres recibir en la operación diaria del bufete.
              </Text>
            </LinearGradient>

            <View style={styles.notificationsBody}>
              {[
                { key: "mensajes", label: "Mensajes y chats", sublabel: "Avisos por nuevas conversaciones o respuestas" },
                { key: "vencimientos", label: "Vencimientos", sublabel: "Recordatorios de fechas próximas y tareas urgentes" },
                { key: "cambiosProcesos", label: "Cambios de procesos", sublabel: "Actualizaciones relevantes en expedientes y estados" },
                { key: "equipoInvitaciones", label: "Equipo e invitaciones", sublabel: "Invitaciones, altas y movimientos del equipo" },
                { key: "alertasPlan", label: "Alertas del plan", sublabel: "Uso alto, límites y cambios de capacidad" },
                { key: "resumenSemanal", label: "Resumen semanal", sublabel: "Digest con actividad operativa consolidada" },
              ].map((item, index, arr) => (
                <View key={item.key} style={[styles.notificationRow, index < arr.length - 1 && styles.notificationRowBorder]}>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationRowTitle}>{item.label}</Text>
                    <Text style={styles.notificationRowSub}>{item.sublabel}</Text>
                  </View>
                  <Switch
                    value={notificationPrefs[item.key as keyof typeof notificationPrefs]}
                    onValueChange={(value) =>
                      setNotificationPrefs((current) => ({ ...current, [item.key]: value }))
                    }
                    trackColor={{ false: "#D9E2EC", true: "#9CC3E6" }}
                    thumbColor={notificationPrefs[item.key as keyof typeof notificationPrefs] ? "#0F2640" : "#FFFFFF"}
                    ios_backgroundColor="#D9E2EC"
                  />
                </View>
              ))}
            </View>

            <View style={styles.notificationsActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setShowNotificationsModal(false)}
                disabled={notificationsSaving}
              >
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.notificationsSaveBtn, pressed && { opacity: 0.9 }, notificationsSaving && { opacity: 0.7 }]}
                onPress={handleSaveNotificationPrefs}
                disabled={notificationsSaving}
              >
                {notificationsSaving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.notificationsSaveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal cambiar contrasena */}
      <Modal visible={showPwdModal} transparent animationType="fade" onRequestClose={() => setShowPwdModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pwdModal}>
            <View style={styles.pwdModalHeader}>
              <Text style={styles.pwdModalTitle}>Cambiar Contrasena</Text>
              <Pressable onPress={() => setShowPwdModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Contrasena actual</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Tu contrasena actual"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showCurrent}
              />
              <Pressable onPress={() => setShowCurrent(p => !p)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Nueva contrasena</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Minimo 6 caracteres"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showNew}
              />
              <Pressable onPress={() => setShowNew(p => !p)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <Text style={styles.pwdLabel}>Confirmar nueva contrasena</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Repite la nueva contrasena"
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
  container: { flex: 1, backgroundColor: "#0F2640" },
  header: { paddingBottom: 24 },
  headerInner: { width: "100%", alignSelf: "center", paddingHorizontal: 18, paddingTop: 14 },
  headerInnerWide: { maxWidth: 1520, paddingHorizontal: 24 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  headerChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.76)" },
  heroRow: { gap: 18 },
  heroRowDesktop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  heroCopy: { maxWidth: 760 },
  heroEyebrow: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2,
    color: "rgba(255,255,255,0.58)", marginBottom: 8,
  },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", color: Colors.white, letterSpacing: -0.7, marginBottom: 10 },
  heroText: { fontSize: 15, lineHeight: 24, color: "rgba(255,255,255,0.76)" },
  heroCard: {
    minWidth: 320, maxWidth: 390, borderRadius: 24, padding: 18, gap: 14,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  heroCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroAvatar: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
  },
  heroAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white },
  heroCardInfo: { flex: 1 },
  heroName: { fontSize: 19, fontFamily: "Inter_700Bold", color: Colors.white, marginBottom: 3 },
  heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.68)" },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroMetaChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroMetaText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.white },
  scroll: {
    flex: 1, backgroundColor: "#F4F7FB", borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  content: { padding: 16, paddingBottom: 40 },
  contentDesktop: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 56 },
  pageShell: { width: "100%", alignSelf: "center" },
  pageShellWide: { maxWidth: 1520 },
  columns: { width: "100%" },
  columnsDesktop: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: 400, gap: 18 },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 24, padding: 18, marginBottom: 24,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 2,
    borderWidth: 1, borderColor: "rgba(15,23,42,0.06)",
  },
  userCardDesktop: { padding: 24, marginBottom: 28 },
  userCardTop: { gap: 16 },
  userCardTopDesktop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  userCardIdentity: { flex: 1 },
  userCardBadge: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E8EEF6", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, marginBottom: 14,
  },
  userCardBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0F2640" },
  userCardActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  primaryAction: {
    backgroundColor: "#0F2640", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
  },
  primaryActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  secondaryAction: {
    backgroundColor: "#E8EEF6", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
  },
  secondaryActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F2640" },
  inlinePremiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF4D6",
    borderWidth: 1,
    borderColor: "#F3DE9B",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  inlinePremiumBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#7B5E00" },
  userName: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, letterSpacing: -0.5 },
  userEmail: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  userPlan: { fontSize: 13, color: Colors.accent, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  sectionsGrid: { gap: 18 },
  sectionsGridDesktop: { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch" },
  section: { marginBottom: 2 },
  privacySection: { marginTop: 18, marginBottom: 4 },
  lockedSection: { marginTop: 18, marginBottom: 10 },
  sectionDesktop: { flexGrow: 1, minWidth: 320 },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.white, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionContentDesktop: {},
  settingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 18, backgroundColor: Colors.white,
  },
  settingItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingItemPressed: { backgroundColor: Colors.surfaceSecondary },
  settingItemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1, paddingRight: 12 },
  settingCopy: { flex: 1, gap: 2 },
  settingIconBadge: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#0F2640",
    alignItems: "center", justifyContent: "center",
  },
  settingIconBadgePrivacy: { backgroundColor: "#1B3A5C" },
  settingIconBadgeLocked: { backgroundColor: "#B7791F" },
  settingItemDisabled: { opacity: 0.48 },
  settingItemLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  settingItemSubLabel: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  sideIntroCard: {
    borderRadius: 22, backgroundColor: "#EAF1F8", padding: 20,
    borderWidth: 1, borderColor: "#D8E3EF",
  },
  sideIntroEyebrow: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#64748B", letterSpacing: 1.4, marginBottom: 8 },
  sideIntroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#0F2640", marginBottom: 10, lineHeight: 28 },
  sideIntroText: { fontSize: 14, lineHeight: 22, color: "#475569" },
  suscripcionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  suscripcionCardDesktop: { borderRadius: 22 },
  suscripcionBanner: {
    backgroundColor: "#0F2640",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  suscripcionBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  suscripcionBannerIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
  },
  suscripcionBannerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 2,
  },
  suscripcionBannerNombre: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  suscripcionActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  suscripcionActiveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
  },
  suscripcionActiveText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  suscripcionUsageWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  planStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  planStatCard: {
    minWidth: 130,
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  planStatLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  planStatValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  upgradeBtn: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: Colors.dangerLight, padding: 16, borderRadius: 14, marginTop: 40,
  },
  logoutButtonDesktop: { maxWidth: 320, alignSelf: "center", width: "100%", marginTop: 24 },
  logoutButtonPressed: { opacity: 0.8 },
  logoutButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  version: { textAlign: "center", fontSize: 12, color: Colors.textTertiary, marginTop: 24 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  upgradeModal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  upgradeModalIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "#0F2640", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  upgradeModalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  upgradeModalText: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary, textAlign: "center" },
  upgradeModalHighlight: { fontFamily: "Inter_700Bold", color: "#0F2640" },
  upgradeModalActions: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
  upgradeNowBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: "#0F2640", alignItems: "center",
  },
  upgradeNowBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  aboutModal: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: "hidden",
  },
  aboutHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
  },
  aboutIconWrap: {
    width: 54, height: 54, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  aboutTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white, marginBottom: 4 },
  aboutSubtitle: {
    fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.74)", textAlign: "center",
  },
  aboutBody: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, gap: 12 },
  aboutRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  aboutLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  aboutValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  aboutDescription: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary, marginTop: 4 },
  aboutCloseBtn: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: "#0F2640",
    paddingVertical: 13,
    alignItems: "center",
  },
  aboutCloseBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  notificationsModal: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: "hidden",
  },
  notificationsHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  notificationsHeaderIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  notificationsTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white, marginBottom: 4 },
  notificationsSubtitle: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.74)", textAlign: "center" },
  notificationsBody: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 6 },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  notificationRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  notificationCopy: { flex: 1, paddingRight: 10 },
  notificationRowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 2 },
  notificationRowSub: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  notificationsActions: { flexDirection: "row", gap: 10, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 },
  notificationsSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#0F2640",
    alignItems: "center",
  },
  notificationsSaveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
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
