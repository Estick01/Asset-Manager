import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams, Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getProceso, saveProceso, updateProceso, getTiposProceso, type Proceso } from "@/lib/storage";
import { CaseForm, type CaseFormData } from "@/components/CaseForm";

export default function EditCaseScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoBack = (id: string) => {
    router.replace({ pathname: "/case/[id]", params: { id } });
  };

  useEffect(() => {
    if (id) {
      getProceso(id).then((p) => {
        if (p) {
          setProceso({
            ...p,
          });
        }
      });
    }
  }, [id]);

  const handleSave = async (data: CaseFormData) => {
    if (!data.clienteId || !data.tipoProcesoId || !data.radicado.trim() || !data.juzgado.trim() || !data.estadoId) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    if (!user || !id) return;
    setLoading(true);
    setError("");
    try {
      const tiposProceso = await getTiposProceso();
      const tipoProcesoObj = tiposProceso.find((t) => t.id === data.tipoProcesoId);
      const tipoProceso = tipoProcesoObj?.nombre || "";

      await updateProceso(id, {
        ...data,
        tipoProceso,
        abogadoId: user.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleGoBack(id);
      
    } catch (error) {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => handleGoBack(id)} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Editar Proceso</Text>
          <View style={{ width: 28 }} />
        </View>
        {proceso ? (
          <CaseForm
            initialData={proceso}
            onSave={handleSave}
            isLoading={loading}
            error={error}
          />
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Cargando proceso...</Text>
          </View>
        )}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
