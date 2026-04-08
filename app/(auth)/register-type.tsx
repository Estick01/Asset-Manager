import React from "react";
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

const ACCOUNT_TYPES = [
  {
    type: "lawyer" as const,
    icon: "briefcase" as const,
    title: "Abogado",
    description: "Gestiona tus propios casos como abogado independiente",
    accent: Colors.primary,
  },
  {
    type: "firm" as const,
    icon: "business" as const,
    title: "Bufete de Abogados",
    description: "Administra una firma jurídica con múltiples abogados",
    accent: Colors.warning,
  },
  {
    type: "client" as const,
    icon: "person" as const,
    title: "Cliente",
    description: "Sigue el estado de tus procesos legales en tiempo real",
    accent: Colors.success,
  },
] as const;

export default function RegisterTypeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1360, Math.max(1120, width - metrics.gutter * 2));

  const handleSelectType = (type: "lawyer" | "firm" | "client") => {
    const routes = {
      lawyer: "/register-lawyer",
      firm:   "/register-firm",
      client: "/register-cliente",
    };
    router.push(routes[type] as any);
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary]}
      style={styles.container}
    >
      <View style={[styles.shell, desktop && { maxWidth: shellWidth, paddingHorizontal: metrics.gutter, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
        <View style={[styles.topSection, desktop && styles.desktopTopSection, { paddingTop: desktop ? 0 : insets.top + (Platform.OS === "web" ? 67 : 24) }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <View style={[styles.titleSection, desktop && styles.desktopTitleSection]}>
            <View style={styles.titleIconWrap}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.white} />
            </View>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>
              Elige el tipo de cuenta que mejor describe tu rol
            </Text>
            {desktop && (
              <Text style={styles.desktopLead}>
                Selecciona el acceso que corresponde a tu operación dentro de la plataforma para continuar con un registro guiado y coherente.
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.cardsContainer, desktop && styles.desktopCardsContainer]}>
          {desktop && (
            <View style={styles.desktopInfoPanel}>
              <Text style={styles.desktopInfoTitle}>Un mismo sistema, accesos distintos</Text>
              <Text style={styles.desktopInfoText}>
                Cada registro activa permisos, vistas y flujos específicos para clientes, abogados independientes o firmas jurídicas.
              </Text>
              <View style={styles.desktopInfoList}>
                <View style={styles.desktopInfoItem}>
                  <Ionicons name="person-outline" size={18} color={Colors.white} />
                  <Text style={styles.desktopInfoItemText}>Clientes siguen procesos, documentos y conversaciones.</Text>
                </View>
                <View style={styles.desktopInfoItem}>
                  <Ionicons name="briefcase-outline" size={18} color={Colors.white} />
                  <Text style={styles.desktopInfoItemText}>Abogados gestionan casos y captación profesional.</Text>
                </View>
                <View style={styles.desktopInfoItem}>
                  <Ionicons name="business-outline" size={18} color={Colors.white} />
                  <Text style={styles.desktopInfoItemText}>Bufetes administran equipos, cartera y operación jurídica.</Text>
                </View>
              </View>
            </View>
          )}

          <View style={[styles.cardsColumn, desktop && styles.desktopCardsColumn]}>
            {ACCOUNT_TYPES.map(({ type, icon, title, description, accent }) => (
              <Pressable
                key={type}
                style={({ pressed }) => [styles.card, desktop && styles.desktopCard, pressed && styles.cardPressed]}
                onPress={() => handleSelectType(type)}
              >
                <View style={[styles.cardAccent, { backgroundColor: accent }]} />

                <View style={styles.cardBody}>
                  <View style={[styles.iconWrap, { backgroundColor: accent + "20" }]}>
                    <Ionicons name={icon} size={24} color={accent} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardDescription}>{description}</Text>
                  </View>

                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.footer, desktop && styles.desktopFooter, { paddingBottom: desktop ? 0 : insets.bottom + 24 }]}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <Pressable onPress={() => router.push("/login")} hitSlop={8}>
            <Text style={styles.footerLink}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  shell: { flex: 1 },

  // ── Top ──────────────────────────────────────────────────────
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  desktopTopSection: {
    paddingHorizontal: 0,
    paddingBottom: 22,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  titleSection: { gap: 8 },
  desktopTitleSection: { maxWidth: 720 },
  titleIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  desktopLead: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
  },

  // ── Cards ─────────────────────────────────────────────────────
  cardsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 24,
    gap: 12,
  },
  desktopCardsContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 24,
  },
  desktopInfoPanel: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    backgroundColor: Colors.primary,
    gap: 16,
  },
  desktopInfoTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  desktopInfoText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
  },
  desktopInfoList: { gap: 12 },
  desktopInfoItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  desktopInfoItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.88)",
  },
  cardsColumn: { gap: 12 },
  desktopCardsColumn: { width: 520, justifyContent: "center", gap: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopCard: { minHeight: 132 },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardAccent: { width: 4 },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.background,
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  desktopFooter: {
    backgroundColor: Colors.background,
    paddingTop: 18,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
});
