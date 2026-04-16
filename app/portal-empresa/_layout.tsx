import React from "react";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View, Text, useWindowDimensions } from "react-native";
import Colors from "@/constants/colors";
import { useChatNotifications } from "@/lib/chat-context";
import { useNotifications } from "@/lib/notifications-context";
import { isDesktopViewport } from "@/lib/ui/breakpoints";

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

export default function PortalEmpresaLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const { width } = useWindowDimensions();
  const desktopWeb = Platform.OS === "web" && isDesktopViewport(width);
  const lowResolutionNav = !desktopWeb && width < 880;
  const compactMobileNav = !desktopWeb && width < 390;
  const { unreadCount: unreadChatCount } = useChatNotifications();
  const { unreadCount: unreadNotifCount } = useNotifications();

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
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
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
        name="profile"
        options={{
          title: "Empresa",
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="case" options={{ href: null }} />
    </Tabs>
  );
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
    position: "absolute", top: -4, right: -8,
    backgroundColor: Colors.danger, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: Colors.white,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.white },
});
