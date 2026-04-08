import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router, useSegments } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View, Text, useWindowDimensions } from "react-native";
import React, { useEffect, useState } from "react";
import Colors from "@/constants/colors";
import { useChatNotifications } from "@/lib/chat-context";
import { useNotifications } from "@/lib/notifications-context";
import { useSubscription } from "@/lib/subscription-context";
import { FeatureLockedModal } from "@/components/subscription/FeatureLockedModal";
import { DesktopAppShell } from "@/components/web/DesktopAppShell";
import { isDesktopViewport } from "@/lib/ui/breakpoints";

const TAB_FEATURE: Record<string, string> = {
  chat: "chat",
  community: "comunidad",
};

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

function LockedIcon({ name, size, color }: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
}) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} style={{ opacity: 0.4 }} />
      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={9} color={Colors.white} />
      </View>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "building.2", selected: "building.2.fill" }} />
        <Label>Bufete</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cases">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Procesos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Clientes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Mensajes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <Icon sf={{ default: "globe", selected: "globe.fill" }} />
        <Label>Comunidad</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const desktopWeb = Platform.OS === "web" && isDesktopViewport(width);

  const { unreadCount: unreadChatCount } = useChatNotifications();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const { hasFeature, isLoading } = useSubscription();

  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const isLocked = (tab: string) =>
    !isLoading && TAB_FEATURE[tab] !== undefined && !hasFeature(TAB_FEATURE[tab]);

  const tabListeners = (tab: string) => ({
    tabPress: (e: any) => {
      if (isLocked(tab)) {
        e.preventDefault();
        setLockedFeature(TAB_FEATURE[tab]);
      }
    },
  });

  const activeSegment = (segments[1] as string | undefined) ?? "index";
  const segmentFeatureMap: Record<string, string | undefined> = {
    chat: "chat",
    community: "comunidad",
  };

  const desktopTitleMap: Record<string, { title: string; subtitle: string }> = {
    index: { title: "Workspace del bufete", subtitle: "Vista de escritorio para supervisar operación, clientes y equipo." },
    cases: { title: "Procesos", subtitle: "Seguimiento jurídico del bufete con más densidad y mejor lectura horizontal." },
    clients: { title: "Clientes", subtitle: "Relaciones activas, procesos y contexto del portafolio en una sola capa." },
    team: { title: "Equipo", subtitle: "Gestión del equipo jurídico del bufete sin salir del workspace web." },
    chat: { title: "Mensajes", subtitle: "Conversaciones del bufete organizadas para escritorio." },
    community: { title: "Comunidad", subtitle: "Visibilidad comercial y publicaciones sin patrones móviles estirados." },
    notifications: { title: "Notificaciones", subtitle: "Alertas operativas y eventos recientes del bufete." },
    invitations: { title: "Invitaciones", subtitle: "Altas pendientes, seguimiento y coordinación de incorporaciones." },
    settings: { title: "Ajustes", subtitle: "Configuración general del bufete dentro del mismo entorno de trabajo." },
  };

  const desktopMeta = desktopTitleMap[activeSegment] ?? desktopTitleMap.index;
  const desktopNav = [
    { key: "index", label: "Dashboard", icon: "grid-outline" as const, href: "/(firm-tabs)" },
    { key: "cases", label: "Procesos", icon: "document-text-outline" as const, href: "/(firm-tabs)/cases" },
    { key: "clients", label: "Clientes", icon: "people-outline" as const, href: "/(firm-tabs)/clients" },
    { key: "team", label: "Equipo", icon: "people-circle-outline" as const, href: "/(firm-tabs)/team" },
    { key: "chat", label: "Mensajes", icon: "chatbubble-ellipses-outline" as const, href: "/(firm-tabs)/chat", badgeCount: unreadChatCount, disabled: isLocked("chat") },
    { key: "community", label: "Comunidad", icon: "globe-outline" as const, href: "/(firm-tabs)/community", disabled: isLocked("community") },
  ];

  useEffect(() => {
    const featureCode = segmentFeatureMap[activeSegment];
    if (!featureCode || isLoading) return;

    const featureLocked = !hasFeature(featureCode);
    if (!featureLocked) return;

    setLockedFeature(featureCode);
    if (activeSegment !== "index") {
      router.replace("/(firm-tabs)" as any);
    }
  }, [activeSegment, hasFeature, isLoading]);

  const webTabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cases" />
      <Tabs.Screen name="clients" />
      <Tabs.Screen name="chat" listeners={tabListeners("chat")} />
      <Tabs.Screen name="community" listeners={tabListeners("community")} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="invitations" options={{ href: null }} />
      <Tabs.Screen name="invite-lawyer" options={{ href: null }} />
    </Tabs>
  );

  if (desktopWeb) {
    return (
      <>
        <DesktopAppShell
          brand="LexTrack"
          title={desktopMeta.title}
          subtitle={desktopMeta.subtitle}
          navItems={desktopNav}
          activeKey={activeSegment}
          onNavigate={(href) => {
            const item = desktopNav.find((entry) => entry.href === href);
            if (item?.disabled) {
              const featureCode = TAB_FEATURE[item.key];
              if (featureCode) setLockedFeature(featureCode);
              return;
            }
            router.push(href as any);
          }}
          actions={[
            {
              key: "notifications",
              icon: "notifications-outline",
              label: "Notificaciones",
              badgeCount: unreadNotifCount,
              onPress: () => router.push("/(firm-tabs)/notifications" as any),
            },
            {
              key: "settings",
              icon: "settings-outline",
              label: "Ajustes",
              onPress: () => router.push("/(firm-tabs)/settings" as any),
            },
          ]}
        >
          {webTabs}
        </DesktopAppShell>

        <FeatureLockedModal
          visible={lockedFeature !== null}
          featureCode={lockedFeature ?? ""}
          onClose={() => setLockedFeature(null)}
          onVerPlanes={() => {
            setLockedFeature(null);
            router.push("/(auth)/planes" as any);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : isDark ? "#000" : "#fff",
            borderTopWidth: desktopWeb ? 1 : 0,
            borderTopColor: Colors.border,
            elevation: 0,
            ...(desktopWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            ) : desktopWeb ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.white }]} />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Bufete",
            tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cases"
          options={{
            title: "Procesos",
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: "Clientes",
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          listeners={tabListeners("chat")}
          options={{
            title: "Mensajes",
            tabBarLabelStyle: isLocked("chat")
              ? { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textTertiary, opacity: 0.5 }
              : { fontFamily: "Inter_500Medium", fontSize: 11 },
            tabBarIcon: ({ color, size }) =>
              isLocked("chat") ? (
                <LockedIcon name="chatbubbles" size={size} color={color} />
              ) : (
                <BadgeIcon name="chatbubbles" size={size} color={color} count={unreadChatCount} />
              ),
          }}
        />
        <Tabs.Screen
          name="community"
          listeners={tabListeners("community")}
          options={{
            title: "Comunidad",
            tabBarLabelStyle: isLocked("community")
              ? { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textTertiary, opacity: 0.5 }
              : { fontFamily: "Inter_500Medium", fontSize: 11 },
            tabBarIcon: ({ color, size }) =>
              isLocked("community") ? (
                <LockedIcon name="globe-outline" size={size} color={color} />
              ) : (
                <Ionicons name="globe-outline" size={size} color={color} />
              ),
          }}
        />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="team" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="invitations" options={{ href: null }} />
        <Tabs.Screen name="invite-lawyer" options={{ href: null }} />
      </Tabs>

      <FeatureLockedModal
        visible={lockedFeature !== null}
        featureCode={lockedFeature ?? ""}
        onClose={() => setLockedFeature(null)}
        onVerPlanes={() => {
          setLockedFeature(null);
          router.push("/(auth)/planes" as any);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.white,
  },
});

export default function FirmTabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
