import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import {
  checkout,
  type CheckoutResult,
} from "@/lib/services/suscripcionService";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Estado = "loading" | "error" | "activated";

// ── Componente ─────────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();

  const { planId, ciclo, extraUsers, planNombre } = useLocalSearchParams<{
    planId: string;
    ciclo: "mensual" | "anual";
    extraUsers?: string;
    planNombre?: string;
  }>();

  const [estado, setEstado] = useState<Estado>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [nombrePlan, setNombrePlan] = useState<string>(planNombre ?? "");

  const iniciarCheckout = async () => {
    setEstado("loading");
    setErrorMsg("");

    try {
      const result: CheckoutResult = await checkout({
        planId,
        ciclo,
        extraUsers: Number(extraUsers ?? 0),
      });

      if (result.planNombre) {
        setNombrePlan(result.planNombre);
      }

      if (result.activated) {
        toast.success("¡Plan activado!");
        setEstado("activated");
        return;
      }

      if (result.payment_url) {
        await WebBrowser.openBrowserAsync(result.payment_url);
        // Después de cerrar el navegador, el webhook procesará el pago de forma async
        router.replace({
          pathname: "/checkout/result",
          params: {
            pagoId: result.pagoId ?? "",
            planNombre: result.planNombre ?? nombrePlan,
            ciclo,
          },
        });
        return;
      }

      // Si no hay payment_url ni activated, asumir pendiente
      router.replace({
        pathname: "/checkout/result",
        params: {
          pagoId: "",
          planNombre: nombrePlan,
          ciclo,
        },
      });
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error inesperado al procesar el pago";
      setErrorMsg(mensaje);
      setEstado("error");
    }
  };

  useEffect(() => {
    iniciarCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cicloLabel = ciclo === "anual" ? "Anual" : "Mensual";

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checkout seguro 🔒</Text>
      </View>

      {/* Contenido según estado */}
      <View style={styles.content}>
        {estado === "loading" && (
          <LoadingView nombrePlan={nombrePlan} cicloLabel={cicloLabel} />
        )}

        {estado === "error" && (
          <ErrorView
            errorMsg={errorMsg}
            onRetry={iniciarCheckout}
            onBack={() => router.back()}
          />
        )}

        {estado === "activated" && (
          <ActivatedView
            nombrePlan={nombrePlan}
            onGoHome={() => router.replace("/")}
          />
        )}
      </View>
    </View>
  );
}

// ── Sub-vistas ─────────────────────────────────────────────────────────────────

function LoadingView({
  nombrePlan,
  cicloLabel,
}: {
  nombrePlan: string;
  cicloLabel: string;
}) {
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      <Text style={styles.stateTitle}>Preparando tu pago...</Text>
      {!!nombrePlan && (
        <Text style={styles.stateSubtitle}>
          {nombrePlan} · {cicloLabel}
        </Text>
      )}
    </View>
  );
}

function ErrorView({
  errorMsg,
  onRetry,
  onBack,
}: {
  errorMsg: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.stateContainer}>
      <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
        <Ionicons name="close" size={48} color={Colors.danger} />
      </View>
      <Text style={styles.stateTitle}>No pudimos procesar tu solicitud</Text>
      {!!errorMsg && <Text style={styles.errorMessage}>{errorMsg}</Text>}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Intentar de nuevo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonOutline]}
        onPress={onBack}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: Colors.textSecondary }]}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

function ActivatedView({
  nombrePlan,
  onGoHome,
}: {
  nombrePlan: string;
  onGoHome: () => void;
}) {
  return (
    <View style={styles.stateContainer}>
      <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
        <Ionicons name="checkmark" size={48} color={Colors.success} />
      </View>
      <Text style={styles.stateTitle}>¡Plan activado!</Text>
      {!!nombrePlan && <Text style={styles.stateSubtitle}>{nombrePlan}</Text>}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors.primary }]}
        onPress={onGoHome}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Ir al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

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
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.danger,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
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
