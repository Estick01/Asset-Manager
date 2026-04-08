// app/client/new.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Platform, KeyboardAvoidingView, Pressable, useWindowDimensions
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { ClientForm } from "@/components/ClientForm";
import type { SaveClienteData } from "@/lib/services/clienteService";
import { PlanGate } from "@/components/subscription/PlanGate";
import { handleApiError, LimitReachedError } from "@/lib/services/suscripcionService";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1160, width - metrics.gutter * 2));
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allowPrivateClientes, setAllowPrivateClientes] = useState<boolean | null>(null);
  const [planGateVisible, setPlanGateVisible] = useState(false);
  const [limiteUso, setLimiteUso] = useState({ actual: 0, maximo: 0 });

  useEffect(() => {
    if (user?.user?.rol?.nombre !== "abogado") return;
    apiRequest("GET", "/api/firm/settings/my-firm")
      .then(r => r.json())
      .then((data: { allowPrivateClientes: boolean } | null) => {
        setAllowPrivateClientes(data?.allowPrivateClientes ?? null);
      })
      .catch(() => setAllowPrivateClientes(null));
  }, [user]);

  const handleSave = async (data: SaveClienteData) => {
    setLoading(true);
    setError("");
    try {
      // POST /api/clientes reads lawyerId from JWT — no need to pass it explicitly
      const response = await apiRequest("POST", "/api/clientes", data);
      if (!response.ok) {
        await handleApiError(response);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/clients");
    } catch (err) {
      if (err instanceof LimitReachedError) {
        setLimiteUso({ actual: err.actual, maximo: err.maximo });
        setPlanGateVisible(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.header,
            desktop && styles.desktopHeader,
            {
              paddingTop: insets.top + (desktop ? 24 : Platform.OS === "web" ? 67 : 8),
              paddingHorizontal: desktop ? metrics.gutter : 20,
            },
          ]}
        >
          <View style={[styles.headerShell, desktop && { maxWidth: shellWidth }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.replace("/clients")} hitSlop={8}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Nuevo Cliente</Text>
              <View style={{ width: 26 }} />
            </View>

            {desktop && (
              <View style={styles.desktopHero}>
                <View style={styles.desktopHeroCopy}>
                  <Text style={styles.desktopHeroTitle}>Registra un cliente con una vista clara para escritorio</Text>
                  <Text style={styles.desktopHeroText}>
                    Organiza datos de acceso, identidad y ubicación en una estructura más limpia para persona natural o empresa.
                  </Text>
                </View>
                <View style={styles.desktopHeroStats}>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>2</Text>
                    <Text style={styles.desktopHeroLabel}>tipos</Text>
                  </View>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>1</Text>
                    <Text style={styles.desktopHeroLabel}>portal</Text>
                  </View>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>+1</Text>
                    <Text style={styles.desktopHeroLabel}>cliente</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <ClientForm
          onSave={handleSave}
          isLoading={loading}
          error={error}
          isEditing={false}
          firmAllowsPrivateClientes={
            user?.user?.rol?.nombre === "abogado" ? allowPrivateClientes : undefined
          }
        />
      </KeyboardAvoidingView>
      <PlanGate
        visible={planGateVisible}
        onClose={() => setPlanGateVisible(false)}
        onVerPlanes={() => {
          setPlanGateVisible(false);
          router.push("/planes");
        }}
        tipo="clientes"
        actual={limiteUso.actual}
        maximo={limiteUso.maximo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  desktopHeader: {
    paddingBottom: 20,
  },
  headerShell: {
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  desktopHero: {
    marginTop: 18,
    borderRadius: 24,
    padding: 22,
    backgroundColor: Colors.primaryLight + "10",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "22",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
  },
  desktopHeroCopy: {
    flex: 1,
    maxWidth: 760,
    gap: 8,
  },
  desktopHeroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  desktopHeroText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  desktopHeroStats: {
    flexDirection: "row",
    gap: 12,
  },
  desktopHeroStat: {
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  desktopHeroValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  desktopHeroLabel: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
