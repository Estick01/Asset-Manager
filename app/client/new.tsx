// app/client/new.tsx
import React, { useState } from "react";
import {
  View, Text, StyleSheet, Platform, KeyboardAvoidingView, Pressable
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { saveCliente } from "@/lib/services/clienteService";
import { ClientForm, ClientFormData } from "@/components/ClientForm";

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (data: ClientFormData) => {
    if (!data.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (!data.apellido.trim()) { setError("El apellido es obligatorio"); return; }
    if (!data.correo.trim()) { setError("El correo es obligatorio"); return; }
    if (!data.documento.trim()) { setError("El documento es obligatorio"); return; }
    if (!data.password?.trim()) { setError("La contraseña es obligatoria"); return; }

    const lawyerId = (user as any)?.id || (user as any)?.user?.id;

    setLoading(true);
    setError("");
    try {
      await saveCliente({
        nombre:          data.nombre.trim(),
        apellido:        data.apellido.trim(),
        correo:          data.correo.trim(),
        telefono:        data.telefono.trim(),
        documento:       data.documento.trim(),
        tipoDocumentoId: data.tipoDocumentoId,
        direccion:       data.direccion.trim(),
        password:        data.password,
        departamentoId:  data.departamentoId || null,
        municipioId:     data.municipioId || null,
        lawyerId:        lawyerId || null,
      } as any);
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