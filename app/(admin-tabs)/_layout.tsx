// app/(admin-tabs)/_layout.tsx
import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { Platform } from "react-native";

const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"] as const;

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const rol = user?.user?.rol?.nombre ?? "";

  if (!ADMIN_ROLES.includes(rol as any)) {
    return <Redirect href="/login" />;
  }

  // El portal admin es exclusivamente web
  if (Platform.OS !== "web") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    />
  );
}
