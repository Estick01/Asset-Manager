import { Stack } from "expo-router";

export default function PortalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="case" />
    </Stack>
  );
}
