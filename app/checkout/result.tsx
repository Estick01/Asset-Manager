import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getPagoEstado, getMiSuscripcion } from "@/lib/services/suscripcionService";

type Estado = "verificando" | "aprobado" | "rechazado" | "timeout";

const MAX_INTENTOS = 5;
const INTERVALO_MS = 3000;

export default function CheckoutResultScreen() {
  const insets = useSafeAreaInsets();
  const { pagoId, planNombre, ciclo } = useLocalSearchParams<{
    pagoId?: string;
    planNombre?: string;
    ciclo?: string;
  }>();

  const [estado, setEstado] = useState<Estado>("verificando");
  const intentosRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detenerPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const verificar = async () => {
    if (!pagoId) {
      setEstado("timeout");
      detenerPolling();
      return;
    }

    intentosRef.current += 1;

    try {
      const data = await getPagoEstado(pagoId);

      if (data.estado === "aprobado") {
        // Refrescar suscripción en contexto
        await getMiSuscripcion().catch(() => {/* no bloquear si falla */});
        setEstado("aprobado");
        detenerPolling();
        return;
      }

      if (data.estado === "rechazado") {
        setEstado("rechazado");
        detenerPolling();
        return;
      }
    } catch {
      // Error de red — continuar intentando si hay intentos restantes
    }

    if (intentosRef.current >= MAX_INTENTOS) {
      setEstado("timeout");
      detenerPolling();
    }
  };

  useEffect(() => {
    verificar();
    intervalRef.current = setInterval(verificar, INTERVALO_MS);
    return detenerPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cicloLabel = ciclo === "anual" ? "Anual" : "Mensual";

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estado del pago</Text>
      </View>

      <View style={styles.content}>
        {estado === "verificando" && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.stateTitle}>Verificando tu pago...</Text>
            {!!planNombre && (
              <Text style={styles.stateSubtitle}>
                {planNombre} · {cicloLabel}
              </Text>
            )}
          </View>
        )}

        {estado === "aprobado" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="checkmark" size={48} color={Colors.success} />
            </View>
            <Text style={styles.stateTitle}>¡Plan activado!</Text>
            {!!planNombre && <Text style={styles.stateSubtitle}>{planNombre}</Text>}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {estado === "rechazado" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="close" size={48} color={Colors.danger} />
            </View>
            <Text style={styles.stateTitle}>Pago no aprobado</Text>
            <Text style={styles.stateBody}>
              Tu pago fue rechazado. Puedes intentar con otro método de pago.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/planes")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonOutline]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: Colors.textSecondary }]}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {estado === "timeout" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="time-outline" size={48} color={Colors.warning} />
            </View>
            <Text style={styles.stateTitle}>Estamos procesando tu pago</Text>
            <Text style={styles.stateBody}>
              Esto puede tardar unos minutos. Te notificaremos cuando se confirme.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stateContainer: {
    alignItems: "center",
    width: "100%",
  },
  spinner: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stateTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  stateSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  stateBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonOutline: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
  },
});
