import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { saveActualizacion } from "@/lib/services/procesoService";

export default function NewUpdateScreen() {
  const insets = useSafeAreaInsets();
  const { procesoId } = useLocalSearchParams<{ procesoId: string }>();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoBack = (id: string) => {
    router.replace({ pathname: "/case/[id]", params: { id } });
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      setError("El título es obligatorio");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!procesoId) return;
    setLoading(true);
    setError("");
    try {
      await saveActualizacion({
        procesoId,
        fecha: new Date().toISOString(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo: "manual",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleGoBack(procesoId);
    } catch (error) {
      setError("Error al guardar");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8), paddingBottom: 16 }]}>
        <Pressable onPress={() => handleGoBack(procesoId)} hitSlop={8} style={styles.backButton}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Nueva Actualización</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.infoText}>
            Las actualizaciones aparecen en la línea de tiempo del proceso. 
            Agrega información relevante sobre audiencias, resoluciones o cualquier novedad.
          </Text>
        </View>

        {/* Error Message */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Título Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.label}>Título <Text style={styles.required}>*</Text></Text>
            </View>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={(text) => {
                setTitulo(text);
                if (error) setError("");
              }}
              placeholder="Ej: Audiencia programada para el 15 de marzo"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* Descripción Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.label}>Descripción</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Agrega detalles sobre la actualización..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [
              styles.saveBtn, 
              pressed && styles.saveBtnPressed, 
              loading && styles.saveBtnDisabled
            ]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>Guardar Actualización</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { 
    fontSize: 17, 
    fontFamily: "Inter_600SemiBold", 
    color: Colors.text 
  },
  placeholder: { width: 32 },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dangerLight,
    padding: 14,
    borderRadius: 12,
  },
  errorText: { 
    fontSize: 14, 
    fontFamily: "Inter_500Medium", 
    color: Colors.danger, 
    flex: 1 
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: { 
    fontSize: 13, 
    fontFamily: "Inter_600SemiBold", 
    color: Colors.textSecondary 
  },
  required: { 
    color: Colors.danger,
    fontFamily: "Inter_500Medium",
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  buttonContainer: {
    marginTop: "auto",
    paddingTop: 8,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnPressed: { 
    opacity: 0.9, 
    transform: [{ scale: 0.98 }],
    elevation: 2,
  },
  saveBtnDisabled: { 
    opacity: 0.6,
    backgroundColor: Colors.textTertiary,
    shadowOpacity: 0,
  },
  saveBtnText: { 
    fontSize: 16, 
    fontFamily: "Inter_600SemiBold", 
    color: Colors.white 
  },
});
