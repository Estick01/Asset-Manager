// app/(admin-tabs)/_shell/Topbar.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useCallback } from "react";

const ROL_LABELS: Record<string, string> = {
  admin_super:    "Super Admin",
  admin_soporte:  "Admin Soporte",
  admin_finanzas: "Admin Finanzas",
};

interface Props {
  title: string;
}

export function Topbar({ title }: Props) {
  const { user, logout } = useAuth();
  const rolNombre = user?.user?.rol?.nombre ?? "";
  const rolLabel  = ROL_LABELS[rolNombre] ?? rolNombre;
  const userName  = user?.user?.name ?? user?.user?.email ?? "Admin";

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // logout errors are non-critical on the admin web portal
    }
  }, [logout]);

  return (
    <View style={styles.topbar}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRol}>{rolLabel}</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#1E293B",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  userName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1E293B",
  },
  userRol: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
  },
  logoutPressed: {
    backgroundColor: "#F1F5F9",
  },
});

export default Topbar;
