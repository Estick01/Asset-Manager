import { Redirect, Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnifiedAuthProvider, useAuth } from "@/lib/auth-context";
import { View, StyleSheet, Dimensions, Platform, LogBox } from "react-native";
import "./global.css";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import * as SplashScreen from "expo-splash-screen";
import { GlobalSocketProvider } from "@/lib/global-socket-context";
import { InvitationsProvider } from "@/lib/invitations-context";
import { ChatNotificationProvider } from "@/lib/chat-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { Toaster } from "sonner-native";

// Suppress known Expo Router + iOS splash screen warning on view controller
// transitions (logout, deep links). This handles both warnings and uncaught errors.
const SPLASH_SCREEN_ERRORS = [
  "No native splash screen registered for given view controller",
  "SplashScreen.show",
];

LogBox.ignoreLogs(SPLASH_SCREEN_ERRORS);

// Also handle any uncaught promise errors related to splash screen
SplashScreen.preventAutoHideAsync().catch((error: any) => {
  // Silently ignore splash screen errors on iOS during transitions
  if (error?.message?.includes("splash screen") || error?.message?.includes("view controller")) {
    return;
  }
  console.warn("SplashScreen error:", error);
});

const queryClient = new QueryClient();

type AppRoute = "/(lawyer-tabs)" | "/(firm-tabs)" | "/portal";


const ROLE_ROUTES: Record<string, AppRoute> = {
  abogado: "/(lawyer-tabs)",
  bufete: "/(firm-tabs)",
  cliente: "/portal",
};

const PUBLIC_GROUPS = ["profile", "client", "case", "update", "chat", "portal", "community","notifications"];

const PUBLIC_GRUPS_FIRM = ["firm-components","firm-info"]

const PUBLIC_GROUPS_LAWYER = ["lawyer-componts"]


function AuthRouteProtection({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const segments = useSegments();

  if (isLoading) return null;

  const currentGroup = segments[0];


  if (!isLoggedIn) {
    if (currentGroup !== "(auth)") {
      return <Redirect href="/login" />;
    }
    return <>{children}</>;
  }


  const targetRoute = ROLE_ROUTES[user?.user?.rol?.nombre || ""];

  if (!targetRoute) {
    return <Redirect href="/login" />;
  }


  if(PUBLIC_GRUPS_FIRM.includes(currentGroup) && user?.user?.rol?.nombre === "bufete"){
    return <>{children}</>;
  }

  if(PUBLIC_GROUPS_LAWYER.includes(currentGroup) && user?.user?.rol?.nombre === "abogado"){
    return <>{children}</>;
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
    if (loaded) {
      SplashScreen.hideAsync().catch((error: any) => {
        // Silently ignore splash screen errors on iOS during transitions
        if (error?.message?.includes("splash screen") || error?.message?.includes("view controller")) {
          return;
        }
        console.warn("SplashScreen hide error:", error);
      });
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.contentWrapper}>
        <QueryClientProvider client={queryClient}>
          <UnifiedAuthProvider>
            <GlobalSocketProvider>
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
            </GlobalSocketProvider>
          </UnifiedAuthProvider>
        </QueryClientProvider>
        <Toaster />
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