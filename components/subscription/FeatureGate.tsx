import React, { type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSubscription, FEATURE_LABELS, FEATURE_MIN_PLAN } from "@/lib/subscription-context";

interface FeatureGateProps {
  featureCode: string;
  children: ReactNode;
  /** Reemplaza el fallback por defecto */
  fallback?: ReactNode;
}

/**
 * Muestra `children` si el usuario tiene la feature en su plan.
 * Si no la tiene, muestra un bloque de "Upgrade" con el plan mínimo requerido.
 */
export function FeatureGate({ featureCode, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useSubscription();

  // Mientras carga → asumir acceso para no parpadear
  if (isLoading) return <>{children}</>;

  if (hasFeature(featureCode)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const nombre  = FEATURE_LABELS[featureCode]  ?? featureCode;
  const minPlan = FEATURE_MIN_PLAN[featureCode] ?? "Pro";

  return (
    <View style={styles.container}>
      <View style={styles.iconoWrap}>
        <Ionicons name="lock-closed" size={24} color={Colors.primary} />
      </View>
      <Text style={styles.titulo}>{nombre}</Text>
      <Text style={styles.subtitulo}>
        Disponible desde el plan{" "}
        <Text style={styles.planName}>{minPlan}</Text>
      </Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        onPress={() => router.push("/(auth)/planes" as any)}
      >
        <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.white} />
        <Text style={styles.btnTexto}>Actualizar plan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
    margin: 4,
  },
  iconoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF3FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  titulo: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  planName: {
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  btnTexto: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
