import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import Colors from "@/constants/colors";
import {
  checkout,
  getPlanes,
  type PlanPublico,
} from "@/lib/services/suscripcionService";
import { PlanCard } from "@/components/subscription/PlanCard";
import { useAuth } from "@/lib/auth-context";

type TipoPlan = "abogado" | "bufete";
type Ciclo = "mensual" | "anual";

const MIN_ABOGADOS = 3;
const MAX_ABOGADOS = 50;

export default function PlanesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();

  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [tipoPlan, setTipoPlan] = useState<TipoPlan>("abogado");
  const [ciclo, setCiclo] = useState<Ciclo>("mensual");
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanPublico | null>(null);
  const [extraUsers, setExtraUsers] = useState(MIN_ABOGADOS);

  const canGoBack = navigation.canGoBack();

  // ── Carga de planes ────────────────────────────────────────────────────────

  const cargarPlanes = useCallback(async () => {
    setCargando(true);
    setPlanSeleccionado(null);
    try {
      const data = await getPlanes();
      setPlanes(data);
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : "Error al cargar los planes";
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPlanes();
  }, [cargarPlanes]);

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const planesFiltrados = planes.filter((p) => p.tipo === tipoPlan);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTipoChange = (nuevoTipo: TipoPlan) => {
    setTipoPlan(nuevoTipo);
    setPlanSeleccionado(null);
  };

  const handleCicloChange = (nuevoCiclo: Ciclo) => {
    setCiclo(nuevoCiclo);
  };

  const handleExtraUsersChange = (delta: number) => {
    setExtraUsers((prev) =>
      Math.min(MAX_ABOGADOS, Math.max(MIN_ABOGADOS, prev + delta))
    );
  };

  const handleExtraUsersInput = (text: string) => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) {
      setExtraUsers(Math.min(MAX_ABOGADOS, Math.max(MIN_ABOGADOS, parsed)));
    }
  };

  const handleContinuar = async () => {
    if (!planSeleccionado || procesando) return;

    // Sin sesión → llevar al registro con el plan preseleccionado
    if (!isLoggedIn) {
      router.push({
        pathname: "/register-type",
        params: {
          planId: planSeleccionado.id,
          ciclo,
          extraUsers: (tipoPlan === "bufete" ? extraUsers : 0).toString(),
          planNombre: planSeleccionado.nombre,
        },
      });
      return;
    }

    const esPlanGratis = planSeleccionado.precioMensualCop === "0";

    if (esPlanGratis) {
      setProcesando(true);
      try {
        await checkout({
          planId: planSeleccionado.id,
          ciclo,
          extraUsers: tipoPlan === "bufete" ? extraUsers : undefined,
        });
        router.replace("/");
      } catch (error: unknown) {
        const mensaje =
          error instanceof Error ? error.message : "Error al activar el plan";
        toast.error(mensaje);
      } finally {
        setProcesando(false);
      }
    } else {
      router.push({
        pathname: "/checkout",
        params: {
          planId: planSeleccionado.id,
          ciclo,
          extraUsers: (tipoPlan === "bufete" ? extraUsers : 0).toString(),
          planNombre: planSeleccionado.nombre,
        },
      });
    }
  };

  const handleVolver = () => {
    if (canGoBack) {
      router.back();
    } else if (isLoggedIn) {
      router.replace("/");
    } else {
      router.replace("/login");
    }
  };

  // ── Destacados ────────────────────────────────────────────────────────────

  const esDestacado = (plan: PlanPublico): boolean => {
    const nombre = plan.nombre.toLowerCase();
    return nombre === "pro" || nombre === "business";
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={Colors.gradientPrimary}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable style={styles.volverBtn} onPress={handleVolver} hitSlop={8}>
          <Ionicons
            name={canGoBack ? "arrow-back" : "close"}
            size={22}
            color={Colors.white}
          />
        </Pressable>
        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>Elige tu plan</Text>
          <Text style={styles.headerSubtitulo}>
            Selecciona el plan que mejor se adapta a ti
          </Text>
        </View>
      </LinearGradient>

      {/* Cuerpo scrollable */}
      <ScrollView
        style={styles.cuerpo}
        contentContainerStyle={[
          styles.cuerpoContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toggle tipo */}
        <View style={styles.seccionToggle}>
          <Text style={styles.toggleLabel}>Tipo de cuenta</Text>
          <View style={styles.togglePill}>
            <Pressable
              style={[
                styles.pillOpcion,
                tipoPlan === "abogado" && styles.pillOpcionActiva,
              ]}
              onPress={() => handleTipoChange("abogado")}
            >
              <Text
                style={[
                  styles.pillOpcionTexto,
                  tipoPlan === "abogado" && styles.pillOpcionTextoActivo,
                ]}
              >
                Abogado
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.pillOpcion,
                tipoPlan === "bufete" && styles.pillOpcionActiva,
              ]}
              onPress={() => handleTipoChange("bufete")}
            >
              <Text
                style={[
                  styles.pillOpcionTexto,
                  tipoPlan === "bufete" && styles.pillOpcionTextoActivo,
                ]}
              >
                Bufete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Toggle ciclo */}
        <View style={styles.seccionToggle}>
          <Text style={styles.toggleLabel}>Facturación</Text>
          <View style={styles.togglePill}>
            <Pressable
              style={[
                styles.pillOpcion,
                ciclo === "mensual" && styles.pillOpcionActiva,
              ]}
              onPress={() => handleCicloChange("mensual")}
            >
              <Text
                style={[
                  styles.pillOpcionTexto,
                  ciclo === "mensual" && styles.pillOpcionTextoActivo,
                ]}
              >
                Mensual
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.pillOpcion,
                ciclo === "anual" && styles.pillOpcionActiva,
              ]}
              onPress={() => handleCicloChange("anual")}
            >
              <View style={styles.pillAnualRow}>
                <Text
                  style={[
                    styles.pillOpcionTexto,
                    ciclo === "anual" && styles.pillOpcionTextoActivo,
                  ]}
                >
                  Anual
                </Text>
                <View style={styles.badgeAhorro}>
                  <Text style={styles.badgeAhorroTexto}>2 meses gratis</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Stepper de abogados (solo bufete) */}
        {tipoPlan === "bufete" && (
          <View style={styles.seccionStepper}>
            <Text style={styles.stepperLabel}>
              Número de abogados en tu firma
            </Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={[
                  styles.stepperBtn,
                  extraUsers <= MIN_ABOGADOS && styles.stepperBtnDeshabilitado,
                ]}
                onPress={() => handleExtraUsersChange(-1)}
                disabled={extraUsers <= MIN_ABOGADOS}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={
                    extraUsers <= MIN_ABOGADOS
                      ? Colors.textTertiary
                      : Colors.primary
                  }
                />
              </Pressable>
              <TextInput
                style={styles.stepperInput}
                value={String(extraUsers)}
                onChangeText={handleExtraUsersInput}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Pressable
                style={[
                  styles.stepperBtn,
                  extraUsers >= MAX_ABOGADOS && styles.stepperBtnDeshabilitado,
                ]}
                onPress={() => handleExtraUsersChange(1)}
                disabled={extraUsers >= MAX_ABOGADOS}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={
                    extraUsers >= MAX_ABOGADOS
                      ? Colors.textTertiary
                      : Colors.primary
                  }
                />
              </Pressable>
            </View>
            <Text style={styles.stepperHint}>Mínimo {MIN_ABOGADOS} abogados</Text>
          </View>
        )}

        {/* Lista de planes */}
        {cargando ? (
          <View style={styles.skeletonContainer}>
            {[0, 1].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : planesFiltrados.length === 0 ? (
          <View style={styles.vacioCont}>
            <Ionicons
              name="albums-outline"
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.vacioTexto}>
              No hay planes disponibles en este momento.
            </Text>
          </View>
        ) : (
          <View style={styles.planesLista}>
            {planesFiltrados.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                ciclo={ciclo}
                selected={planSeleccionado?.id === plan.id}
                onSelect={() => setPlanSeleccionado(plan)}
                destacado={esDestacado(plan)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón sticky Continuar */}
      <View
        style={[
          styles.footerContainer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Pressable
          style={[
            styles.continuarBtn,
            (!planSeleccionado || procesando) && styles.continuarBtnDeshabilitado,
          ]}
          onPress={handleContinuar}
          disabled={!planSeleccionado || procesando}
        >
          {procesando ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.continuarBtnTexto}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  volverBtn: {
    alignSelf: "flex-start",
    marginBottom: 12,
    padding: 4,
  },
  headerTextos: {
    gap: 4,
  },
  headerTitulo: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  headerSubtitulo: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },

  // ── Cuerpo ──────────────────────────────────────────────────────────────
  cuerpo: {
    flex: 1,
  },
  cuerpoContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },

  // ── Toggles ─────────────────────────────────────────────────────────────
  seccionToggle: {
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  togglePill: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  pillOpcion: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  pillOpcionActiva: {
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  pillOpcionTexto: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  pillOpcionTextoActivo: {
    color: Colors.white,
  },
  pillAnualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeAhorro: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeAhorroTexto: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },

  // ── Stepper ─────────────────────────────────────────────────────────────
  seccionStepper: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  stepperLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  stepperBtnDeshabilitado: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  stepperInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
  },
  stepperHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },

  // ── Skeleton ─────────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 16,
  },
  skeletonCard: {
    height: 320,
    borderRadius: 16,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },

  // ── Vacío ────────────────────────────────────────────────────────────────
  vacioCont: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  vacioTexto: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // ── Lista de planes ──────────────────────────────────────────────────────
  planesLista: {
    gap: 16,
  },

  // ── Footer sticky ────────────────────────────────────────────────────────
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continuarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  continuarBtnDeshabilitado: {
    backgroundColor: Colors.border,
  },
  continuarBtnTexto: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
