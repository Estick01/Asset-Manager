import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Cerrar Sesion", "Estas seguro de cerrar sesion?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar Sesion",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const sections = [
    {
      title: "Despacho",
      items: [
        { icon: "person-outline" as const, label: "Nombre", value: user?.nombre || "" },
        { icon: "business-outline" as const, label: "Despacho", value: user?.despacho || "" },
        { icon: "mail-outline" as const, label: "Correo", value: user?.correo || "" },
        { icon: "call-outline" as const, label: "Telefono", value: user?.telefono || "No registrado" },
      ],
    },
    {
      title: "Suscripcion",
      items: [
        { icon: "diamond-outline" as const, label: "Plan actual", value: user?.plan === "profesional" ? "Profesional" : "Basico" },
        { icon: "calendar-outline" as const, label: "Miembro desde", value: user ? new Date(user.fechaRegistro).toLocaleDateString("es-CO", { year: "numeric", month: "long" }) : "" },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Text style={styles.title}>Ajustes</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{user?.nombre?.charAt(0).toUpperCase() || "A"}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.nombre || "Abogado"}</Text>
            <Text style={styles.profileDespacho}>{user?.despacho || ""}</Text>
          </View>
          <View style={[styles.planBadge, user?.plan === "profesional" ? styles.planPro : styles.planBasic]}>
            <Text style={[styles.planText, user?.plan === "profesional" ? styles.planProText : styles.planBasicText]}>
              {user?.plan === "profesional" ? "PRO" : "Basico"}
            </Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.label} style={[styles.settingRow, idx < section.items.length - 1 && styles.settingRowBorder]}>
                  <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>Cerrar Sesion</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>LexTrack v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileDespacho: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  planBasic: {
    backgroundColor: Colors.surfaceSecondary,
  },
  planPro: {
    backgroundColor: Colors.accent + "20",
  },
  planText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  planBasicText: {
    color: Colors.textSecondary,
  },
  planProText: {
    color: Colors.accent,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: "50%",
    textAlign: "right",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    padding: 16,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    paddingVertical: 20,
  },
});
