/**
 * Landing Page - Access Type Selector
 * 
 * New entry point for the app.
 * Allows users to select between Professional (Lawyer/Firm) or Client access.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  const handleProfessionalAccess = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/login");
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="scale-outline" size={48} color={Colors.accent} />
          </View>
          <Text style={styles.brandName}>LexTrack</Text>
          <Text style={styles.brandSubtitle}>Sistema de Gestión Legal</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Bienvenido</Text>
          <Text style={styles.welcomeSubtitle}>
            Selecciona el tipo de acceso para continuar
          </Text>
        </View>

        {/* Access Options */}
        <View style={styles.cardsContainer}>
          {/* Login - Single login for all users */}
          <Pressable
            style={({ pressed }) => [
              styles.accessCard,
              pressed && styles.cardPressed,
            ]}
            onPress={handleProfessionalAccess}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="log-in" size={32} color={Colors.white} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Iniciar Sesion</Text>
              <Text style={styles.cardDescription}>
                Abogado, Bufete o Cliente
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.white} />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿No tienes cuenta?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register-type")}>
            <Text style={styles.footerLink}>Regístrate aquí</Text>
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
  logoSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandName: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.white,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  cardsContainer: {
    gap: 16,
  },
  accessCard: {
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
  clientCard: {
    marginTop: 8,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  clientIconContainer: {
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
