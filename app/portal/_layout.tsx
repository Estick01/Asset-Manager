import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { isClientAuthenticated } from "@/lib/storage";
import Colors from "@/constants/colors";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedAuth = useRef(false);
  
  // Get current route name from segments
  const currentRoute = segments[segments.length - 1] || "";
  
  // For login route, skip auth check entirely
  const isLoginRoute = currentRoute === "login";

  useEffect(() => {
    // Skip if already checked or on login route
    if (hasCheckedAuth.current || isLoginRoute) {
      setIsChecking(false);
      return;
    }
    
    hasCheckedAuth.current = true;
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { authenticated } = await isClientAuthenticated();
        
        if (!isMounted) return;
        
        if (!authenticated) {
          // Use setTimeout to avoid navigation during render
          setTimeout(() => {
            router.replace("/portal/login");
          }, 100);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isLoginRoute]);

  if (isChecking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});

export default function PortalLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
        <Stack.Screen name="case" />
        <Stack.Screen name="profile" />
      </Stack>
    </AuthGuard>
  );
}
