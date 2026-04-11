import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { useAuth } from "@/lib/auth-context";
import { listRecognizedDevices, revokeRecognizedDevice, type RecognizedDevice } from "@/lib/services/deviceSecurityService";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function getPlatformLabel(platform: string | null): string {
  if (!platform) return "Dispositivo";
  if (platform === "web") return "Web";
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  return platform;
}

export default function DevicesSecurityScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [devices, setDevices] = useState<RecognizedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<RecognizedDevice | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadDevices = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    try {
      const result = await listRecognizedDevices();
      setDevices(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los dispositivos.";
      toast.error(message);
    } finally {
      if (mode === "initial") setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadDevices("initial");
  }, [loadDevices]));

  const handleRevoke = useCallback(async () => {
    if (!selectedDevice) return;

    setRevoking(true);
    try {
      const result = await revokeRecognizedDevice(selectedDevice.id);
      if (result.currentDeviceRevoked) {
        toast.success("Este dispositivo fue cerrado. Debes iniciar sesión de nuevo.");
        setSelectedDevice(null);
        await logout();
        router.replace("/(auth)/login");
        return;
      }

      toast.success("Dispositivo revocado correctamente.");
      setSelectedDevice(null);
      await loadDevices("initial");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo revocar el dispositivo.";
      toast.error(message);
    } finally {
      setRevoking(false);
    }
  }, [loadDevices, logout, selectedDevice]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Dispositivos</Text>
          <Text style={styles.subtitle}>Revisa inicios de sesión activos y revoca los que no reconozcas.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDevices("refresh")} />}
        >
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
            <Text style={styles.infoText}>
              Cada inicio de sesión queda asociado a un dispositivo reconocido. Si revocas uno, sus sesiones activas se cierran.
            </Text>
          </View>

          {devices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="phone-portrait-outline" size={28} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No hay dispositivos registrados</Text>
              <Text style={styles.emptyText}>Cuando inicies sesión desde este equipo aparecerá aquí.</Text>
            </View>
          ) : (
            devices.map((device) => (
              <View key={device.id} style={[styles.deviceCard, device.isCurrentDevice && styles.deviceCardCurrent]}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceBadge}>
                    <Ionicons name={device.platform === "web" ? "globe-outline" : "phone-portrait-outline"} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.deviceCopy}>
                    <View style={styles.deviceTitleRow}>
                      <Text style={styles.deviceTitle}>{device.deviceName || "Dispositivo"}</Text>
                      {device.isCurrentDevice ? (
                        <View style={styles.currentPill}>
                          <Text style={styles.currentPillText}>Actual</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.deviceMeta}>{getPlatformLabel(device.platform)}</Text>
                  </View>
                </View>

                <View style={styles.deviceBody}>
                  <Text style={styles.deviceDetail}>Primer acceso: {formatDate(device.firstSeenAt)}</Text>
                  <Text style={styles.deviceDetail}>Ultimo acceso: {formatDate(device.lastSeenAt)}</Text>
                  {device.lastIp ? <Text style={styles.deviceDetail}>IP aproximada: {device.lastIp}</Text> : null}
                  <Text style={styles.deviceDetail}>
                    Sesiones activas: {device.activeSessionCount}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.revokeButton,
                    !device.hasActiveSessions && styles.revokeButtonDisabled,
                    pressed && device.hasActiveSessions && { opacity: 0.82 },
                  ]}
                  disabled={!device.hasActiveSessions}
                  onPress={() => setSelectedDevice(device)}
                >
                  <Ionicons name="power-outline" size={16} color={device.hasActiveSessions ? Colors.danger : Colors.textTertiary} />
                  <Text style={[styles.revokeButtonText, !device.hasActiveSessions && styles.revokeButtonTextDisabled]}>
                    {device.hasActiveSessions ? "Cerrar sesiones" : "Sin sesiones activas"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <StyledModal
        visible={!!selectedDevice}
        onClose={() => !revoking && setSelectedDevice(null)}
        title="Revocar dispositivo"
        onConfirm={handleRevoke}
        confirmText={revoking ? "Revocando..." : "Revocar"}
        confirmVariant="danger"
      >
        <Text style={styles.modalText}>
          Se cerrarán todas las sesiones activas de {selectedDevice?.deviceName || "este dispositivo"}.
        </Text>
        {selectedDevice?.isCurrentDevice ? (
          <Text style={styles.modalWarning}>
            Este es tu dispositivo actual. Si continúas, tu sesión local también se cerrará.
          </Text>
        ) : null}
      </StyledModal>
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
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.infoLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.primaryDark,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  deviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
  },
  deviceCardCurrent: {
    borderColor: Colors.primaryLight,
    backgroundColor: "#F8FBFF",
  },
  deviceHeader: {
    flexDirection: "row",
    gap: 12,
  },
  deviceBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F1FB",
  },
  deviceCopy: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  deviceTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  currentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.successLight,
  },
  currentPillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  deviceMeta: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deviceBody: {
    gap: 6,
  },
  deviceDetail: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  revokeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.dangerLight,
  },
  revokeButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  revokeButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
  revokeButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
  },
  modalWarning: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.danger,
  },
});
