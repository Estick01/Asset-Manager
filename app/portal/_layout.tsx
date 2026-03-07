import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import Colors from "@/constants/colors";
import { useUnifiedAuth } from "@/lib/auth-context";

export default function PortalLayout() {
  const {isLoading } = useUnifiedAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <>
        <Stack.Screen name="index" />
        <Stack.Screen name="case" />
        <Stack.Screen name="profile" />
      </>
    </Stack>
  );
}
