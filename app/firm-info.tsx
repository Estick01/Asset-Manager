/**
 * Información del Bufete
 * Pantalla completa de información del bufete con representante legal
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { FirmProfile } from "@/shared/schema";

export default function FirmInfoScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<FirmProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiRequest("GET", "/api/firm-profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Información del Bufete</Text>
        <Pressable onPress={() => router.push("/profile/firm")} style={styles.headerBtn}>
          <Ionicons name="create-outline" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Ionicons name="business" size={44} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.avatarName}>{profile?.name || "Sin nombre"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Bufete de Abogados</Text>
            </View>
          </View>

          {/* Datos del bufete */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del Bufete</Text>

            <InfoRow icon="business-outline" label="Nombre" value={profile?.name} />
            <InfoRow icon="card-outline" label="NIT" value={profile?.nit} />
            <InfoRow icon="call-outline" label="Teléfono" value={profile?.phone} />
            <InfoRow icon="location-outline" label="Dirección" value={profile?.address} last />
          </View>

          {/* Representante Legal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Representante Legal</Text>

            {profile?.representanteLegal ? (
              <>
                <InfoRow
                  icon="person-outline"
                  label="Nombre"
                  value={`${profile.representanteLegal.persona?.nombre ?? ""} ${profile.representanteLegal.persona?.apellido ?? ""}`.trim()}
                />
                <InfoRow
                  icon="briefcase-outline"
                  label="Cargo"
                  value={profile.representanteLegal.cargo}
                />
                <InfoRow
                  icon="mail-outline"
                  label="Correo"
                  value={profile.representanteLegal.email}
                />
                <InfoRow
                  icon="call-outline"
                  label="Teléfono"
                  value={profile.representanteLegal.persona?.telefono}
                  last
                />
              </>
            ) : (
              <View style={styles.emptyRow}>
                <Ionicons name="person-add-outline" size={20} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Sin representante legal registrado</Text>
              </View>
            )}
          </View>

          {/* Botón editar */}
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/profile/firm")}
          >
            <Ionicons name="create-outline" size={20} color={Colors.white} />
            <Text style={styles.editButtonText}>Editar Información</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={16} color={Colors.textTertiary} style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },

  content: { padding: 20, paddingBottom: 48 },

  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarRing: {
    padding: 3,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight + "22",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight + "44",
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryLight,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black ?? "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center" },
  infoIcon: { marginRight: 8 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    maxWidth: "55%",
    textAlign: "right",
  },

  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  editButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
