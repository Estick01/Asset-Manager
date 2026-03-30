import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { saveProceso, getTiposProceso } from '@/lib/services/procesoService';
import { CaseForm, type CaseFormData } from "@/components/CaseForm";
import { apiRequest } from "@/lib/query-client";

export default function NewCaseScreen() {
  const insets = useSafeAreaInsets();
  const { user ,profile } = useAuth();
  const params = useLocalSearchParams<{ clienteId?: string; postId?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => handleGoBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo Proceso</Text>
          <View style={{ width: 28 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});

