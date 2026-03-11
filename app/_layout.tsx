import { Redirect, Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnifiedAuthProvider, useAuth } from "@/lib/auth-context";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import "./global.css";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import * as SplashScreen from "expo-splash-screen";
import { InvitationsProvider } from "@/lib/invitations-context";
import { ChatNotificationProvider } from "@/lib/chat-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { Toaster } from "sonner-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type AppRoute = "/(lawyer-tabs)" | "/(firm-tabs)" | "/portal";


const ROLE_ROUTES: Record<string, AppRoute> = {
  abogado: "/(lawyer-tabs)",
  bufete: "/(firm-tabs)",
  cliente: "/portal",
};

const PUBLIC_GROUPS = ["profile", "client", "case", "update", "chat"];

function AuthRouteProtection({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const segments = useSegments();

  if (isLoading) return null;

  const currentGroup = segments[0];

  
  if (!isLoggedIn) {
    if (currentGroup !== "(auth)") {
      return <Redirect href="/(auth)/login" />;
    }
    return <>{children}</>;
  }
  
  
  const targetRoute = ROLE_ROUTES[user?.user?.rol?.nombre || ""];
  
  if (!targetRoute) {
    return <Redirect href="/(auth)/login" />;
  }
  
  if (PUBLIC_GROUPS.includes(currentGroup)) {
    return <>{children}</>;
  }
  const targetGroup = targetRoute.replace("/", "");
  if (currentGroup !== targetGroup) {
    return <Redirect href={targetRoute} />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.contentWrapper}>
        <QueryClientProvider client={queryClient}>
          <UnifiedAuthProvider>
            <InvitationsProvider>
              <ChatNotificationProvider>
              <NotificationsProvider>
              <AuthRouteProtection>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(lawyer-tabs)" />
                  <Stack.Screen name="(firm-tabs)" />
                  <Stack.Screen name="portal" />
                </Stack>
              </AuthRouteProtection>
              </NotificationsProvider>
              </ChatNotificationProvider>
            </InvitationsProvider>
          </UnifiedAuthProvider>
        </QueryClientProvider>
        <Toaster/>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    ...(Platform.OS === 'web' ? {
      maxWidth: 1200,
      marginHorizontal: 'auto',
    } : {}),
  },
});