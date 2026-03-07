import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { AbogadoUser, useAuth } from "@/lib/auth-context";
import { LogoutModal } from "@/components/LogoutModal";

export default function LawyerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error during logout:", error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const settingsSections = [
    {
      title: "Perfil",
      items: [
        {
          icon: "person-outline",
          label: "Editar Perfil",
          onPress: () => router.push("/profile/lawyer"),
        },
        {
          icon: "key-outline",
          label: "Cambiar Contraseña",
          onPress: () => Alert.alert("Próximamente", "Esta función estará disponible pronto."),
        },
      ],
    },
    {
      title: "Notificaciones",
      items: [
        {
          icon: "notifications-outline",
          label: "Configurar Notificaciones",
          onPress: () => Alert.alert("Próximamente", "Esta función estará disponible pronto."),
        },
      ],
    },
    {
      title: "Aplicación",
      items: [
        {
          icon: "help-circle-outline",
          label: "Ayuda y Soporte",
          onPress: () => Alert.alert("Ayuda", "Contacta a soporte@lextrack.com"),
        },
        {
          icon: "information-circle-outline",
          label: "Acerca de",
          onPress: () => Alert.alert("LexTrack", "Versión 1.0.0\nSistema de Seguimiento Jurídico"),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.nombre || "Usuario"}</Text>
            <Text style={styles.userEmail}>{user?.correo}</Text>
            <Text style={styles.userFirm}>{(user as AbogadoUser).despacho}</Text>
          </View>
        </View>

        {/* Settings Sections */}
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

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </Pressable>

        <Text style={styles.version}>LexTrack v1.0.0</Text>
      </ScrollView>

      {/* Custom Logout Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
        userName={user?.nombre}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userFirm: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.white,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingItemPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  settingItemLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dangerLight,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 24,
  },
});
