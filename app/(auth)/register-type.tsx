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
  const shellWidth = Math.min(1120, Math.max(940, width - metrics.gutter * 2));

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
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push("/")} style={styles.topBarBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={Colors.white} />
            <Text style={styles.topBarBtnText}>Volver a la landing</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/login")} style={styles.topBarGhostBtn} hitSlop={8}>
            <Text style={styles.topBarGhostText}>Ya tengo cuenta</Text>
          </Pressable>
        </View>

        <View style={[styles.topSection, desktop && styles.desktopTopSection, { paddingTop: desktop ? 0 : insets.top + (Platform.OS === "web" ? 12 : 10) }]}>
          <View style={styles.titleHeader}>
            <View style={styles.titleIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
            </View>

          <View style={[styles.titleSection, desktop && styles.desktopTitleSection]}>
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
        </View>

        <View style={[styles.cardsContainer, desktop && styles.desktopCardsContainer]}>
          {desktop && (
            <View style={styles.desktopInfoPanel}>
              <Text style={styles.desktopInfoEyebrow}>Registro guiado</Text>
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
          <Pressable onPress={() => router.push("/login")} hitSlop={8} style={styles.footerAction}>
            <Text style={styles.footerLink}>Iniciar sesión</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.white} />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  shell: { flex: 1, alignSelf: "center", width: "100%", paddingHorizontal: 20 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },
  topBarBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topBarBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
  },
  topBarGhostBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  topBarGhostText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.86)",
  },

  // ── Top ──────────────────────────────────────────────────────
  topSection: {
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  desktopTopSection: {
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  titleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  titleSection: { gap: 6, flex: 1 },
  desktopTitleSection: { maxWidth: 680 },
  titleIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 30,
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
    backgroundColor: Colors.background,
    borderRadius: 28,
    padding: 20,
    paddingTop: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
  },
  desktopCardsContainer: {
    borderRadius: 28,
    padding: 28,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 22,
    alignSelf: "stretch",
  },
  desktopInfoPanel: {
    flex: 1,
    borderRadius: 22,
    padding: 24,
    backgroundColor: "rgba(15, 38, 64, 0.96)",
    gap: 14,
  },
  desktopInfoEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  desktopInfoTitle: {
    fontSize: 26,
    lineHeight: 32,
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
  desktopCardsColumn: { width: 460, justifyContent: "center", gap: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
    shadowColor: "#0F2640",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  desktopCard: { minHeight: 118 },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardAccent: { width: 4 },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cardArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  desktopFooter: {
    paddingTop: 18,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.78)",
  },
  footerAction: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
});
