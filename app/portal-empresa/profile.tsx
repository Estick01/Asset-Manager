// app/portal-empresa/profile.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { useUnifiedAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { Cliente } from "@/shared/schema";

export default function PortalEmpresaProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useUnifiedAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/cliente/me");
      if (res.ok) setCliente(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
      // AuthRouteProtection handles the redirect automatically
    } catch {
      setLoggingOut(false);
    }
  };

  const empresa = cliente?.empresa;
  const rep     = empresa?.representanteLegal;
  const repPersona = rep?.persona;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#0D3B66", "#1B5A8C"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}>
            <Ionicons name="business" size={32} color={Colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerName} numberOfLines={2}>
              {empresa?.razonSocial ?? user?.user?.name ?? "Empresa"}
            </Text>
            <Text style={styles.headerEmail}>{user?.user?.email}</Text>
          </View>
          <Pressable onPress={() => setIsLogoutModalVisible(true)} style={styles.logoutBtn} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Datos empresa */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Datos de la Empresa</Text>
              <InfoRow icon="business-outline" label="Razón Social" value={empresa?.razonSocial} />
              <InfoRow icon="card-outline"     label="NIT"          value={empresa?.nit} />
              {empresa?.sector && <InfoRow icon="briefcase-outline" label="Sector" value={empresa.sector} />}
              <InfoRow icon="mail-outline"     label="Correo"       value={user?.user?.email} />
            </View>

            {/* Representante legal */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Representante Legal</Text>
              {rep ? (
                <>
                  <InfoRow icon="person-outline"    label="Nombre"   value={`${repPersona?.nombre ?? ""} ${repPersona?.apellido ?? ""}`.trim()} />
                  <InfoRow icon="card-outline"      label="Documento" value={repPersona?.documento} />
                  <InfoRow icon="briefcase-outline" label="Cargo"     value={rep.cargo} />
                  <InfoRow icon="mail-outline"      label="Email"     value={rep.email} />
                  {repPersona?.telefono && <InfoRow icon="call-outline" label="Teléfono" value={repPersona.telefono} />}
                </>
              ) : (
                <Text style={styles.noRep}>No hay representante legal registrado</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <StyledModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        title="Cerrar Sesión"
        onConfirm={handleLogout}
        confirmText={loggingOut ? "Saliendo..." : "Salir"}
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>¿Deseas cerrar tu sesión?</Text>
      </StyledModal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white, marginBottom: 2 },
  headerEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  content: { padding: 16, gap: 14, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center",
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 1 },
  noRep: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", paddingVertical: 8 },
  modalText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
