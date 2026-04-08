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
  const { unreadCount: unreadChatCount } = useChatNotifications();
  const { unreadCount: unreadNotifCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1B5A8C",
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
          title: "Procesos",
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
          title: "Mensajes",
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
  badge: {
    position: "absolute", top: -4, right: -8,
    backgroundColor: Colors.danger, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: Colors.white,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.white },
});
