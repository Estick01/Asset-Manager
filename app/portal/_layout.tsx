import { Tabs, router, useSegments } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View, Text, useWindowDimensions } from "react-native";
import React from "react";
import Colors from "@/constants/colors";
import { useChatNotifications } from "@/lib/chat-context";
import { useNotifications } from "@/lib/notifications-context";
import { isDesktopViewport } from "@/lib/ui/breakpoints";
import { DesktopAppShell } from "@/components/web/DesktopAppShell";
import { useUnifiedAuth } from "@/lib/auth-context";

function BadgeIcon({ name, size, color, count }: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  count?: number;
}) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {count && count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </View>
  );
}


function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const desktopWeb = Platform.OS === "web" && isDesktopViewport(width);
  const lowResolutionNav = !desktopWeb && width < 880;
  const compactMobileNav = !desktopWeb && width < 390;
  const { unreadCount: unreadChatCount } = useChatNotifications();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const { logout } = useUnifiedAuth();
  const activeSegment = (segments[1] as string | undefined) ?? "index";

  const desktopTitleMap: Record<string, { title: string; subtitle: string }> = {
    index: { title: "Portal del cliente", subtitle: "Seguimiento claro de procesos, alertas y mensajes en una vista de escritorio." },
    notifications: { title: "Alertas", subtitle: "Novedades, hitos y recordatorios relevantes de tus procesos." },
    chat: { title: "Mensajes", subtitle: "Conversaciones con abogados y soporte en un entorno web más claro." },
    community: { title: "Comunidad", subtitle: "Espacio comunitario con mejor lectura y jerarquía en escritorio." },
    profile: { title: "Perfil", subtitle: "Datos de cuenta y accesos del portal del cliente." },
    case: { title: "Detalle del proceso", subtitle: "Consulta el expediente y su estado desde una vista más amplia." },
  };

  const desktopMeta = desktopTitleMap[activeSegment] ?? desktopTitleMap.index;
  const desktopNav = [
    { key: "index", label: "Procesos", icon: "grid-outline" as const, href: "/portal" },
    { key: "notifications", label: "Alertas", icon: "notifications-outline" as const, href: "/portal/notifications", badgeCount: unreadNotifCount },
    { key: "chat", label: "Mensajes", icon: "chatbubble-ellipses-outline" as const, href: "/portal/chat", badgeCount: unreadChatCount },
    { key: "community", label: "Comunidad", icon: "globe-outline" as const, href: "/portal/community" },
    { key: "profile", label: "Perfil", icon: "person-outline" as const, href: "/portal/profile" },
  ];

  const webTabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="case" options={{ href: null }} />
    </Tabs>
  );

  if (desktopWeb) {
    return (
      <DesktopAppShell
        brand="ProcesoClaro"
        title={desktopMeta.title}
        subtitle={desktopMeta.subtitle}
        showTopbarCopy={false}
        navItems={desktopNav}
        activeKey={activeSegment}
        onNavigate={(href) => router.push(href as any)}
        actions={[
          {
            key: "notifications",
            icon: "notifications-outline",
            label: "Notificaciones",
            badgeCount: unreadNotifCount,
            onPress: () => router.push("/portal/notifications" as any),
          },
          {
            key: "profile",
            icon: "person-outline",
            label: "Perfil",
            onPress: () => router.push("/portal/profile" as any),
          },
          {
            key: "logout",
            icon: "log-out-outline",
            label: "Cerrar sesión",
            onPress: () => {
              void logout();
            },
          },
        ]}
      >
        {webTabs}
      </DesktopAppShell>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: compactMobileNav ? 10 : 11,
          marginBottom: compactMobileNav ? 0 : 2,
        },
        tabBarItemStyle: {
          borderRadius: compactMobileNav ? 16 : 18,
          marginHorizontal: compactMobileNav ? 1 : 2,
          marginTop: compactMobileNav ? 4 : 6,
          marginBottom: compactMobileNav ? 4 : 6,
          paddingVertical: compactMobileNav ? 1 : 3,
        },
        tabBarStyle: {
          position: "absolute",
          left: compactMobileNav ? 8 : 12,
          right: compactMobileNav ? 8 : 12,
          bottom: compactMobileNav ? 8 : 12,
          height: compactMobileNav
            ? (isIOS ? 82 : 72)
            : lowResolutionNav
              ? 100
              : (isIOS ? 86 : 74),
          paddingTop: compactMobileNav ? 5 : lowResolutionNav ? 9 : 8,
          paddingBottom: compactMobileNav
            ? (isIOS ? 14 : 8)
            : lowResolutionNav
              ? (isIOS ? 24 : 12)
              : (isIOS ? 20 : 10),
          paddingHorizontal: compactMobileNav ? 5 : 8,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          ...Platform.select({
            android: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.14,
              shadowRadius: 24,
            },
            web: {
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
            },
          }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={styles.mobileTabBarBlur} />
          ) : (
            <View
              style={[
                styles.mobileTabBarSurface,
                { backgroundColor: isDark ? "rgba(12,18,28,0.84)" : "rgba(255,255,255,0.82)" },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: compactMobileNav ? "Casos" : "Procesos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="notifications" size={size} color={color} count={unreadNotifCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: compactMobileNav ? "Chat" : "Mensajes",
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="chatbubbles" size={size} color={color} count={unreadChatCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Comunidad",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="case" options={{ href: null }} />
    </Tabs>
  );
}

export default function PortalLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  mobileTabBarBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  mobileTabBarSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(4px)",
      },
    }),
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
});
