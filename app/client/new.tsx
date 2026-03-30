// app/client/new.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Platform, KeyboardAvoidingView, Pressable
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

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
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
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Pressable onPress={() => router.replace("/clients")} hitSlop={8}>
            <Ionicons name="close" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuevo Cliente</Text>
          <View style={{ width: 26 }} />
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