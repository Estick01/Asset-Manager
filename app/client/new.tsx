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

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allowPrivateClientes, setAllowPrivateClientes] = useState<boolean | null>(null);

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
        const body = await response.json();
        throw new Error(body.error || body.message || "Error al guardar cliente");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/clients");
    } catch (err: any) {
      setError(err.message || "Error al guardar");
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