// app/(firm-tabs)/_layout.tsx

import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View, Text } from "react-native";
import React, { useState } from "react";
import Colors from "@/constants/colors";
import { useChatNotifications } from "@/lib/chat-context";
import { useSubscription } from "@/lib/subscription-context";
import { FeatureLockedModal } from "@/components/subscription/FeatureLockedModal";

// ── Mapa tab → feature code ──────────────────────────────────────────────────
const TAB_FEATURE: Record<string, string> = {
  chat:      "chat",
  community: "comunidad",
};

// ── Ícono con badge ───────────────────────────────────────────────────────────
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

// ── ClassicTabLayout ──────────────────────────────────────────────────────────
function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const isWeb       = Platform.OS === "web";
  const isIOS       = Platform.OS === "ios";

  const { unreadCount: unreadChatCount } = useChatNotifications();
  const { hasFeature, isLoading }        = useSubscription();

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
            borderTopWidth: isWeb ? 1 : 0,
            borderTopColor: Colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            ) : isWeb ? (
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

        {/* Chat — bloqueado sin feature "chat" */}
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

        {/* Comunidad — bloqueado sin feature "comunidad" */}
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

        {/* Pantallas ocultas del tab bar pero accesibles por navegación */}
        <Tabs.Screen name="settings"      options={{ href: null }} />
        <Tabs.Screen name="team"          options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="invitations"   options={{ href: null }} />
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
