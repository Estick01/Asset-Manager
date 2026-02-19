import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { isClientAuthenticated } from "@/lib/storage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      const { authenticated } = await isClientAuthenticated();
      const inPortalLogin = segments[segments.length - 1] === "login";

      if (authenticated && inPortalLogin) {
        router.replace("/portal");
        return;
      }

      if (!authenticated && !inPortalLogin) {
        router.replace("/portal/login");
        return;
      }
      
      setAuthInitialized(true);
    })();
  }, [segments]);

  if (!authInitialized) {
    return null;
  }

  return <>{children}</>;
}


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
