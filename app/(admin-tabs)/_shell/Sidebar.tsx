// app/(admin-tabs)/_shell/Sidebar.tsx
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type NavItem = {
  label: string;
  route: string;         // segmento relativo, ej: "dashboard"
  icon:  keyof typeof Ionicons.glyphMap;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    route: "dashboard",
    icon:  "grid-outline",
    roles: ["admin_super", "admin_soporte", "admin_finanzas"],
  },
  {
    label: "Usuarios",
    route: "usuarios",
    icon:  "people-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Planes",
    route: "planes",
    icon:  "layers-outline",
    roles: ["admin_super", "admin_finanzas"],
  },
  {
    label: "Facturación",
    route: "facturacion",
    icon:  "card-outline",
    roles: ["admin_super", "admin_finanzas"],
  },
  {
    label: "Procesos",
    route: "procesos",
    icon:  "document-text-outline",
    roles: ["admin_super"],
  },
  {
    label: "Soporte",
    route: "soporte",
    icon:  "chatbox-ellipses-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Comunidad",
    route: "comunidad",
    icon:  "globe-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Configuración",
    route: "configuracion",
    icon:  "settings-outline",
    roles: ["admin_super"],
  },
];

interface Props {
  rol: string;
}

export function Sidebar({ rol }: Props) {
  const segments = useSegments();
  const currentSegment = segments[1] ?? "dashboard";   // segments[0] = "(admin-tabs)"

  const visible = NAV_ITEMS.filter(item => item.roles.includes(rol));

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <Ionicons name="scale-outline" size={22} color="#2563EB" />
        <Text style={styles.logoText}>LexTrack</Text>
      </View>
      <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {visible.map(item => {
          const active = currentSegment === item.route ||
                         currentSegment.startsWith(item.route + "/");
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(`/(admin-tabs)/${item.route}` as any)}
              style={({ pressed }) => [
                styles.item,
                active   && styles.itemActive,
                pressed  && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={active ? "#2563EB" : "#64748B"}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 24,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1E293B",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: "#EFF6FF",
  },
  itemPressed: {
    backgroundColor: "#F1F5F9",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  labelActive: {
    color: "#2563EB",
    fontFamily: "Inter_600SemiBold",
  },
});
