/**
 * Professional Registration Screen
 * 
 * Shows only Abogado and Bufete (Firm) registration options.
 * Accessed from professional login.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function ProfessionalRegisterScreen() {
  const insets = useSafeAreaInsets();

  const handleRegisterLawyer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(auth)/register-lawyer");
  };

  const handleRegisterFirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(auth)/register-firm");
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>
            Selecciona el tipo de cuenta profesional
          </Text>
        </View>

        {/* Options */}
        <View style={styles.cardsContainer}>
          {/* Abogado */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={handleRegisterLawyer}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={32} color={Colors.white} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Abogado</Text>
              <Text style={styles.cardDescription}>
                Soy abogado independiente
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.white} />
          </Pressable>

          {/* Bufete */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={handleRegisterFirm}
          >
            <View style={[styles.iconContainer, styles.firmIconContainer]}>
              <Ionicons name="business" size={32} color={Colors.white} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Bufete de Abogados</Text>
              <Text style={styles.cardDescription}>
                Represento a un bufete o firma legal
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.white} />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Ya tienes cuenta?{" "}
          </Text>
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.footerLink}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  cardPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  firmIconContainer: {
    backgroundColor: "rgba(76, 175, 80, 0.6)",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingBottom: 32,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  footerLink: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
});
