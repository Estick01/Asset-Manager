import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router, useSegments } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View, Text, useWindowDimensions } from "react-native";
import React, { useEffect, useState } from "react";
import Colors from "@/constants/colors";
import { useInvitations } from "@/lib/invitations-context";
import { useChatNotifications } from "@/lib/chat-context";
import { useGlobalSocket } from "@/lib/global-socket-context";
import { useNotifications } from "@/lib/notifications-context";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { FeatureLockedModal } from "@/components/subscription/FeatureLockedModal";
import { DesktopAppShell } from "@/components/web/DesktopAppShell";
import { isDesktopViewport } from "@/lib/ui/breakpoints";

// ── Mapa tab → feature code ──────────────────────────────────────────────────
const TAB_FEATURE: Record<string, string> = {
  chat:      "chat",
  community: "comunidad",
  calendar:  "calendario",
};

const SEGMENT_FEATURE_MAP: Record<string, string | undefined> = {
  chat: "chat",
  community: "comunidad",
  calendar: "calendario",
};

// ── Ícono con badge de notificación ──────────────────────────────────────────
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

// ── Ícono con candado superpuesto ─────────────────────────────────────────────
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

// ── NativeTabs (LiquidGlass, iOS 26+) ────────────────────────────────────────
function NativeTabLayout() {
  // TODO: feature gating for NativeTabs
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>Abogado</Label>
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

// ── ClassicTabLayout ──────────────────────────────────────────────────────────
function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const isIOS       = Platform.OS === "ios";
  const segments    = useSegments();
  const { width }   = useWindowDimensions();
  const desktopWeb  = Platform.OS === "web" && isDesktopViewport(width);
  const lowResolutionNav = !desktopWeb && width < 880;
  const compactMobileNav = !desktopWeb && width < 390;

  const { pendingCount }                  = useInvitations();
  const { unreadCount: unreadChatCount }  = useChatNotifications();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const { hasPermission }                 = useAuth();
  const { unseenCaseCount }               = useGlobalSocket();
  const { hasFeature, isLoading }         = useSubscription();

  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  // Mientras el plan carga, asumimos acceso para no parpadear
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
  const desktopTitleMap: Record<string, { title: string; subtitle: string }> = {
    index: { title: "Workspace de abogado", subtitle: "" },
    cases: { title: "Procesos", subtitle: "Gestiona tus casos con más densidad de información y menos desplazamiento." },
    clients: { title: "Clientes", subtitle: "Acceso rápido a tus relaciones activas y próximos seguimientos." },
    chat: { title: "Mensajes", subtitle: "Comunicación organizada en un layout preparado para pantallas amplias." },
    community: { title: "Comunidad", subtitle: "Explora publicaciones y conexiones profesionales sin patrón móvil estirado." },
    calendar: { title: "Calendario", subtitle: "Agenda de trabajo con espacio para contexto y próximos hitos." },
  };

  const desktopMeta = desktopTitleMap[activeSegment] ?? desktopTitleMap.index;
  const desktopNav = [
    { key: "index", label: "Dashboard", icon: "grid-outline" as const, href: "/(lawyer-tabs)" },
    { key: "cases", label: "Procesos", icon: "document-text-outline" as const, href: "/(lawyer-tabs)/cases" },
    { key: "clients", label: "Clientes", icon: "people-outline" as const, href: "/(lawyer-tabs)/clients" },
    { key: "chat", label: "Mensajes", icon: "chatbubble-ellipses-outline" as const, href: "/(lawyer-tabs)/chat", badgeCount: unreadChatCount, disabled: isLocked("chat") },
    { key: "community", label: "Comunidad", icon: "globe-outline" as const, href: "/(lawyer-tabs)/community", badgeCount: unseenCaseCount, disabled: isLocked("community") },
    { key: "calendar", label: "Calendario", icon: "calendar-outline" as const, href: "/(lawyer-tabs)/calendar", disabled: isLocked("calendar") },
  ];

  useEffect(() => {
    const featureCode = SEGMENT_FEATURE_MAP[activeSegment];
    if (!featureCode || isLoading) return;

    const featureLocked = !hasFeature(featureCode);
    if (!featureLocked) return;

    setLockedFeature(featureCode);
    if (activeSegment !== "index") {
      router.replace("/(lawyer-tabs)" as any);
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
      <Tabs.Screen name="calendar" listeners={tabListeners("calendar")} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="invitations" options={{ href: null }} />
    </Tabs>
  );

  if (desktopWeb) {
    return (
      <>
        <DesktopAppShell
          brand="ProcesoClaro"
          title={desktopMeta.title}
          subtitle={desktopMeta.subtitle}
          showTopbarCopy={false}
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
              onPress: () => router.push("/lawyer-componts/lawyer-notifications" as any),
            },
            {
              key: "settings",
              icon: "settings-outline",
              label: "Ajustes",
              onPress: () => router.push("/lawyer-componts/lawyer-settings" as any),
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
            title: compactMobileNav ? "Inicio" : "Abogado",
            tabBarIcon: ({ color, size }) => (
              <BadgeIcon name="briefcase" size={size} color={color} count={pendingCount} />
            ),
          }}
        />
        <Tabs.Screen
          name="cases"
          options={{
            title: compactMobileNav ? "Casos" : "Procesos",
            href: hasPermission("procesos.ver") ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: "Clientes",
            href: hasPermission("clientes.ver") ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />

        {/* Chat — bloqueado sin feature "chat" */}
        <Tabs.Screen
          name="chat"
          listeners={tabListeners("chat")}
          options={{
            title: compactMobileNav ? "Chat" : "Mensajes",
            tabBarLabelStyle: isLocked("chat")
              ? { fontFamily: "Inter_500Medium", fontSize: compactMobileNav ? 10 : 11, color: Colors.textTertiary, opacity: 0.5, marginBottom: compactMobileNav ? 0 : 2 }
              : { fontFamily: "Inter_500Medium", fontSize: compactMobileNav ? 10 : 11, marginBottom: compactMobileNav ? 0 : 2 },
            tabBarIcon: ({ color, size }) =>
              isLocked("chat") ? (
                <LockedIcon name="chatbubbles" size={size} color={color} />
              ) : (
                <BadgeIcon name="chatbubbles" size={size} color={color} count={unreadChatCount} />
              ),
          }}
        />

        {/* Comunidad — bloqueado sin feature "comunidad" */}
        <Tabs.Screen
          name="community"
          listeners={tabListeners("community")}
          options={{
            title: "Comunidad",
            tabBarLabelStyle: isLocked("community")
              ? { fontFamily: "Inter_500Medium", fontSize: compactMobileNav ? 10 : 11, color: Colors.textTertiary, opacity: 0.5, marginBottom: compactMobileNav ? 0 : 2 }
              : { fontFamily: "Inter_500Medium", fontSize: compactMobileNav ? 10 : 11, marginBottom: compactMobileNav ? 0 : 2 },
            tabBarIcon: ({ color, size }) =>
              isLocked("community") ? (
                <LockedIcon name="globe-outline" size={size} color={color} />
              ) : (
                <BadgeIcon name="globe-outline" size={size} color={color} count={unseenCaseCount} />
              ),
          }}
        />

        {/* Calendario — bloqueado sin feature "calendario" */}
        <Tabs.Screen
          name="calendar"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen name="settings"      options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="invitations"   options={{ href: null }} />
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

export default function LawyerTabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
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
