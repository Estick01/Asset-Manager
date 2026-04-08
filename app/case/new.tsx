import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { saveProceso, getTiposProceso } from '@/lib/services/procesoService';
import { CaseForm, type CaseFormData } from "@/components/CaseForm";
import { apiRequest } from "@/lib/query-client";
import { PlanGate } from "@/components/subscription/PlanGate";
import { LimitReachedError } from "@/lib/services/suscripcionService";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

export default function NewCaseScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1160, width - metrics.gutter * 2));
  const { user ,profile } = useAuth();
  const params = useLocalSearchParams<{ clienteId?: string; postId?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planGateVisible, setPlanGateVisible] = useState(false);
  const [limiteUso, setLimiteUso] = useState({ actual: 0, maximo: 0 });

  // null = sin firma / no aplica, true/false = política del bufete
  const [allowPrivateProcesos, setAllowPrivateProcesos] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.user?.rol?.nombre !== "abogado") return;
    apiRequest("GET", "/api/firm/settings/my-firm")
      .then(r => r.json())
      .then((data: { allowPrivateProcesos: boolean } | null) => {
        setAllowPrivateProcesos(data?.allowPrivateProcesos ?? null);
      })
      .catch(() => setAllowPrivateProcesos(null));
  }, [user]);


    const handleGoBack = () => {
      router.replace("/cases");
  };

  const handleSave = async (data: CaseFormData) => {
    if (!data.clienteId || !data.tipoProcesoId || !data.radicado.trim() || !data.juzgado.trim() || !data.estadoId) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      // Get the tipoProceso name from the ID
      const tiposProceso = await getTiposProceso();
      const tipoProcesoObj = tiposProceso.find((t) => t.id === data.tipoProcesoId);
      const tipoProceso = tipoProcesoObj?.nombre || "";

      await saveProceso({
        ...data,
        tipoProceso,
        lawyerId: profile?.id || user.user.id,
        clienteId: params.clienteId || data.clienteId,
        communityPostId: params.postId ?? null,
        esPrivado: data.esPrivado,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleGoBack();
    } catch (err) {
      if (err instanceof LimitReachedError) {
        setLimiteUso({ actual: err.actual, maximo: err.maximo });
        setPlanGateVisible(true);
        return;
      }
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, desktop && styles.desktopHeader, { paddingTop: insets.top + (desktop ? 24 : Platform.OS === "web" ? 67 : 8), paddingHorizontal: desktop ? metrics.gutter : 20 }]}>
          <View style={[styles.headerShell, desktop && { maxWidth: shellWidth }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => handleGoBack()} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Nuevo Proceso</Text>
              <View style={{ width: 28 }} />
            </View>
            {desktop && (
              <View style={styles.desktopHero}>
                <View style={styles.desktopHeroCopy}>
                  <Text style={styles.desktopHeroTitle}>Registra un nuevo proceso jurídico</Text>
                  <Text style={styles.desktopHeroText}>
                    Define cliente, tipo de proceso, radicado, juzgado y hechos jurídicamente relevantes en una vista más clara para escritorio.
                  </Text>
                </View>
                <View style={styles.desktopHeroStats}>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>1</Text>
                    <Text style={styles.desktopHeroLabel}>cliente</Text>
                  </View>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>1</Text>
                    <Text style={styles.desktopHeroLabel}>proceso</Text>
                  </View>
                  <View style={styles.desktopHeroStat}>
                    <Text style={styles.desktopHeroValue}>+1</Text>
                    <Text style={styles.desktopHeroLabel}>expediente</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
        <CaseForm
          initialData={{ clienteId: params.clienteId }}
          onSave={handleSave}
          isLoading={loading}
          error={error}
          firmAllowsPrivateProcesos={
            user?.user?.rol?.nombre === "abogado" ? allowPrivateProcesos : undefined
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
        tipo="procesos"
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
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});

