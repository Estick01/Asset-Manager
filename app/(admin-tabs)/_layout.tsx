// app/(admin-tabs)/_layout.tsx
import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useSegments } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { Platform } from "react-native";

const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"] as const;
const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: ["admin_super", "admin_soporte", "admin_finanzas"],
  usuarios: ["admin_super", "admin_soporte"],
  planes: ["admin_super", "admin_finanzas"],
  facturacion: ["admin_super", "admin_finanzas"],
  procesos: ["admin_super"],
  soporte: ["admin_super", "admin_soporte"],
  comunidad: ["admin_super", "admin_soporte"],
  configuracion: ["admin_super"],
};

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) return null;

  const rol = user?.user?.rol?.nombre;
  const currentSection = segments[1] ?? "dashboard";

  if (!rol || !(ADMIN_ROLES as readonly string[]).includes(rol)) {
    return <Redirect href="/login" />;
  }

  // El portal admin es exclusivamente web
  if (Platform.OS !== "web") {
    return <Redirect href="/login" />;
  }

  const allowedRoles = MODULE_ACCESS[currentSection] ?? [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(rol)) {
    return <Redirect href="/(admin-tabs)/dashboard" />;
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
