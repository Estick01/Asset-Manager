import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { useSubscription } from "@/lib/subscription-context";

type TipoPlan = "abogado" | "bufete";
type Ciclo = "mensual" | "anual";

const MIN_ABOGADOS = 3;
const MAX_ABOGADOS = 50;

export default function PlanesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { isLoggedIn, user } = useAuth();
  const { suscripcion, uso } = useSubscription();
  const isDesktop = width >= 1180;
  const isWideDesktop = width >= 1440;

  const rolNombre = user?.user?.rol?.nombre;
  const tipoInicial: TipoPlan = rolNombre === "bufete" ? "bufete" : "abogado";

  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [tipoPlan, setTipoPlan] = useState<TipoPlan>(tipoInicial);
  const [ciclo, setCiclo] = useState<Ciclo>("mensual");
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanPublico | null>(null);
  const [extraUsers, setExtraUsers] = useState(MIN_ABOGADOS);

  const canGoBack = navigation.canGoBack();

  // Mínimo dinámico: no puede bajar de los usuarios incluidos en el plan
  const minUsers = Math.max(MIN_ABOGADOS, planSeleccionado?.includedUsers ?? MIN_ABOGADOS);

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

  const handleSelectPlan = (plan: PlanPublico) => {
    setPlanSeleccionado(plan);
    // Al cambiar de plan, ajustar usuarios al mínimo del nuevo plan si hace falta
    setExtraUsers((prev) =>
      Math.max(prev, plan.includedUsers ?? MIN_ABOGADOS)
    );
  };

  const handleExtraUsersChange = (delta: number) => {
    setExtraUsers((prev) =>
      Math.min(MAX_ABOGADOS, Math.max(minUsers, prev + delta))
    );
  };

  const handleExtraUsersInput = (text: string) => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) {
      setExtraUsers(Math.min(MAX_ABOGADOS, Math.max(minUsers, parsed)));
    }
  };

  // Chips de selección rápida (solo los que sean >= minUsers)
  const QUICK_SIZES = [3, 5, 8, 10, 15, 20, 30];

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

  const esGratisSeleccionado = planSeleccionado?.precioMensualCop === "0";
  const precioBaseSeleccionado = planSeleccionado
    ? parseInt(
        ciclo === "mensual" ? planSeleccionado.precioMensualCop : planSeleccionado.precioAnualCop,
        10,
      )
    : 0;
  const extraSeleccionadoMensual =
    tipoPlan === "bufete" && planSeleccionado?.precioUsuarioExtraCop
      ? Math.max(0, extraUsers - (planSeleccionado.includedUsers ?? 0)) *
        parseInt(planSeleccionado.precioUsuarioExtraCop, 10)
      : 0;
  const extraSeleccionadoTotal =
    ciclo === "mensual" ? extraSeleccionadoMensual : extraSeleccionadoMensual * 12;
  const totalSeleccionado = precioBaseSeleccionado + extraSeleccionadoTotal;
  const fmtCop = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={["#0F2640", "#1B3A5C", "#2A5A8C"]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        {/* Nav row */}
        <View style={styles.headerNav}>
          <Pressable style={styles.volverBtn} onPress={handleVolver} hitSlop={8}>
            <Ionicons
              name={canGoBack ? "arrow-back" : "close"}
              size={22}
              color={Colors.white}
            />
          </Pressable>
          <View style={styles.headerBrand}>
            <View style={styles.headerBrandDot} />
            <Text style={styles.headerBrandName}>LexTrack</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero copy */}
        <View style={[styles.headerHero, isDesktop && styles.headerHeroDesktop]}>
          <View style={styles.headerHeroCopy}>
            <Text style={styles.headerTitulo}>Precios claros,</Text>
            <Text style={styles.headerTituloAccent}>sin sorpresas</Text>
            <Text style={styles.headerSubtitulo}>
              Empieza gratis y escala cuando lo necesites.{"\n"}
              Sin contratos, cancela cuando quieras.
            </Text>
          </View>

          {isDesktop && (
            <View style={styles.headerHighlightCard}>
              <Text style={styles.headerHighlightEyebrow}>Hecho para crecer</Text>
              <Text style={styles.headerHighlightTitle}>
                Elige el plan correcto para tu práctica o firma y ajusta la capacidad cuando tu operación cambie.
              </Text>
              <View style={styles.headerHighlightStats}>
                <View style={styles.headerHighlightStat}>
                  <Text style={styles.headerHighlightValue}>2</Text>
                  <Text style={styles.headerHighlightLabel}>modalidades</Text>
                </View>
                <View style={styles.headerHighlightStat}>
                  <Text style={styles.headerHighlightValue}>0</Text>
                  <Text style={styles.headerHighlightLabel}>costos ocultos</Text>
                </View>
                <View style={styles.headerHighlightStat}>
                  <Text style={styles.headerHighlightValue}>24/7</Text>
                  <Text style={styles.headerHighlightLabel}>acceso continuo</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Trust strip */}
        <View style={[styles.trustStrip, isDesktop && styles.trustStripDesktop]}>
          {["Sin tarjeta de crédito", "Activa en 2 min", "Cancela cuando quieras"].map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.accentLight} />
              <Text style={styles.trustText}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── BODY ── */}
      <ScrollView
        style={styles.cuerpo}
        contentContainerStyle={[
          styles.cuerpoContent,
          isDesktop && styles.cuerpoContentDesktop,
          { paddingBottom: isDesktop ? insets.bottom + 40 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.pageShell, isWideDesktop && styles.pageShellWide]}>
          <View style={[styles.pageColumns, isDesktop && styles.pageColumnsDesktop]}>
            <View style={styles.mainColumn}>
        {/* Toggles row */}
        <View style={[styles.controlsRow, isDesktop && styles.controlsRowDesktop]}>
          {/* Tipo de plan — solo visible si no está logueado */}
          {!isLoggedIn && (
            <View style={styles.controlBlock}>
              <Text style={styles.controlLabel}>Tipo de cuenta</Text>
              <View style={styles.segmented}>
                {(["abogado", "bufete"] as TipoPlan[]).map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[styles.segOpt, tipoPlan === tipo && styles.segOptActivo]}
                    onPress={() => handleTipoChange(tipo)}
                  >
                    <Ionicons
                      name={tipo === "abogado" ? "person-outline" : "business-outline"}
                      size={14}
                      color={tipoPlan === tipo ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.segOptText, tipoPlan === tipo && styles.segOptTextActivo]}>
                      {tipo === "abogado" ? "Abogado" : "Bufete"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Ciclo */}
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Facturación</Text>
            <View style={styles.segmented}>
              {(["mensual", "anual"] as Ciclo[]).map((c) => (
                <Pressable
                  key={c}
                  style={[styles.segOpt, ciclo === c && styles.segOptActivo]}
                  onPress={() => handleCicloChange(c)}
                >
                  <Text style={[styles.segOptText, ciclo === c && styles.segOptTextActivo]}>
                    {c === "mensual" ? "Mensual" : "Anual"}
                  </Text>
                  {c === "anual" && (
                    <View style={styles.ahorroChip}>
                      <Text style={styles.ahorroChipText}>−17%</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Stepper bufete */}
        {tipoPlan === "bufete" && (
          <View style={styles.stepperCard}>
            {/* Fila título */}
            <View style={styles.stepperTop}>
              <View style={styles.stepperCardLeft}>
                <View style={styles.stepperIconWrap}>
                  <Ionicons name="people" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.stepperLabel}>Abogados en tu firma</Text>
                  <Text style={styles.stepperHint}>
                    Mínimo {minUsers} · máximo {MAX_ABOGADOS}
                  </Text>
                </View>
              </View>
              {/* Input + botones */}
              <View style={styles.stepperControls}>
                <Pressable
                  style={[styles.stepperBtn, extraUsers <= minUsers && styles.stepperBtnOff]}
                  onPress={() => handleExtraUsersChange(-1)}
                  disabled={extraUsers <= minUsers}
                >
                  <Ionicons name="remove" size={18} color={extraUsers <= minUsers ? Colors.textTertiary : Colors.primary} />
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
                  style={[styles.stepperBtn, extraUsers >= MAX_ABOGADOS && styles.stepperBtnOff]}
                  onPress={() => handleExtraUsersChange(1)}
                  disabled={extraUsers >= MAX_ABOGADOS}
                >
                  <Ionicons name="add" size={18} color={extraUsers >= MAX_ABOGADOS ? Colors.textTertiary : Colors.primary} />
                </Pressable>
              </View>
            </View>

            {/* Chips de selección rápida */}
            <View style={styles.quickChipsRow}>
              {QUICK_SIZES.filter((s) => s >= minUsers).map((size) => (
                <Pressable
                  key={size}
                  style={[styles.quickChip, extraUsers === size && styles.quickChipActivo]}
                  onPress={() => setExtraUsers(size)}
                >
                  <Text style={[styles.quickChipText, extraUsers === size && styles.quickChipTextActivo]}>
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Resumen de costo */}
            {planSeleccionado?.precioUsuarioExtraCop && (() => {
              const incluidos  = planSeleccionado.includedUsers ?? 0;
              const extra      = Math.max(0, extraUsers - incluidos);
              const costoExtra = extra * parseInt(planSeleccionado.precioUsuarioExtraCop, 10);
              const fmt        = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)}`;
              return (
                <View style={styles.stepperResumen}>
                  <View style={styles.stepperResumenRow}>
                    <Ionicons name="person-outline" size={13} color={Colors.textTertiary} />
                    <Text style={styles.stepperResumenText}>
                      {incluidos} usuario{incluidos !== 1 ? "s" : ""} incluido{incluidos !== 1 ? "s" : ""} en el plan base
                    </Text>
                  </View>
                  {extra > 0 ? (
                    <View style={styles.stepperResumenRow}>
                      <Ionicons name="add-circle-outline" size={13} color={Colors.primary} />
                      <Text style={[styles.stepperResumenText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                        +{extra} extra × {fmt(parseInt(planSeleccionado.precioUsuarioExtraCop, 10))}/mes = +{fmt(costoExtra)} COP/mes
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.stepperResumenRow}>
                      <Ionicons name="checkmark-circle-outline" size={13} color={Colors.success} />
                      <Text style={[styles.stepperResumenText, { color: Colors.success }]}>
                        Dentro del plan — sin costo adicional
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* Lista de planes */}
        {cargando ? (
          <View style={styles.skeletonContainer}>
            {[280, 340, 380].map((h, i) => (
              <View key={i} style={[styles.skeletonCard, { height: h }]} />
            ))}
          </View>
        ) : planesFiltrados.length === 0 ? (
          <View style={styles.vacioCont}>
            <View style={styles.vacioIconCircle}>
              <Ionicons name="albums-outline" size={32} color={Colors.textTertiary} />
            </View>
            <Text style={styles.vacioTitulo}>Sin planes disponibles</Text>
            <Text style={styles.vacioTexto}>
              No hay planes disponibles en este momento. Intenta más tarde.
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
                onSelect={() => handleSelectPlan(plan)}
                destacado={esDestacado(plan)}
                esPlanActual={isLoggedIn && suscripcion?.planId === plan.id}
                extraUsers={tipoPlan === "bufete" ? extraUsers : undefined}
              />
            ))}
          </View>
        )}

        {/* Nota de pie */}
        <Text style={styles.footerNota}>
          Todos los precios en pesos colombianos (COP) · IVA no incluido
        </Text>
            </View>

            {isDesktop && (
              <View style={styles.sideColumn}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryEyebrow}>Resumen</Text>
                  <Text style={styles.summaryTitle}>
                    {planSeleccionado ? `Plan ${planSeleccionado.nombre}` : "Selecciona un plan"}
                  </Text>
                  <Text style={styles.summaryText}>
                    {planSeleccionado
                      ? "Revisa el total estimado y continúa al checkout o activación."
                      : "Elige una tarjeta para ver aquí el precio final y el resumen de compra."}
                  </Text>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Modalidad</Text>
                    <Text style={styles.summaryValue}>{tipoPlan === "abogado" ? "Abogado" : "Bufete"}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Facturación</Text>
                    <Text style={styles.summaryValue}>{ciclo === "mensual" ? "Mensual" : "Anual"}</Text>
                  </View>
                  {tipoPlan === "bufete" && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Usuarios</Text>
                      <Text style={styles.summaryValue}>{extraUsers}</Text>
                    </View>
                  )}

                  <View style={styles.summaryPriceBlock}>
                    <Text style={styles.summaryPriceLabel}>Total estimado</Text>
                    <Text style={styles.summaryPriceValue}>
                      {!planSeleccionado
                        ? "—"
                        : esGratisSeleccionado
                        ? "Gratis"
                        : `${fmtCop(totalSeleccionado)} COP/${ciclo === "mensual" ? "mes" : "año"}`}
                    </Text>
                    {!!planSeleccionado && extraSeleccionadoTotal > 0 && (
                      <Text style={styles.summaryPriceMeta}>
                        Base {fmtCop(precioBaseSeleccionado)} + {fmtCop(extraSeleccionadoTotal)} en usuarios extra
                      </Text>
                    )}
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.continuarBtn,
                      styles.continuarBtnDesktop,
                      (!planSeleccionado || procesando) && styles.continuarBtnOff,
                      pressed && planSeleccionado && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                    ]}
                    onPress={handleContinuar}
                    disabled={!planSeleccionado || procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <Text style={styles.continuarBtnTexto}>
                          {planSeleccionado ? "Continuar" : "Selecciona un plan"}
                        </Text>
                        {!!planSeleccionado && (
                          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                        )}
                      </>
                    )}
                  </Pressable>
                </View>

                <View style={styles.assuranceCard}>
                  <Text style={styles.assuranceTitle}>Qué incluye tu compra</Text>
                  {[
                    "Activación inmediata del plan seleccionado",
                    "Cambio o cancelación cuando quieras",
                    "Acceso desde web y móvil con la misma cuenta",
                  ].map((item) => (
                    <View key={item} style={styles.assuranceRow}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={styles.assuranceText}>{item}</Text>
                    </View>
                  ))}

                  {isLoggedIn && uso && (
                    <View style={styles.currentUsageBox}>
                      <Text style={styles.currentUsageTitle}>Uso actual</Text>
                      <Text style={styles.currentUsageText}>
                        {uso.procesosUsados} procesos · {uso.clientesUsados} clientes · {Math.round(uso.storageUsadoMb)} MB usados
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── STICKY FOOTER CTA ── */}
      {!isDesktop && (
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + 12 }]}>
        {planSeleccionado && (() => {
          return (
            <View style={styles.footerPlanInfo}>
              <View>
                <Text style={styles.footerPlanNombre}>{planSeleccionado.nombre}</Text>
                {extraSeleccionadoTotal > 0 && (
                  <Text style={styles.footerPlanDetalle}>
                    Base {fmtCop(precioBaseSeleccionado)} + {fmtCop(extraSeleccionadoTotal)} extra
                  </Text>
                )}
              </View>
              <Text style={styles.footerPlanPrecio}>
                {esGratisSeleccionado ? "Gratis" : `${fmtCop(totalSeleccionado)} COP/${ciclo === "mensual" ? "mes" : "año"}`}
              </Text>
            </View>
          );
        })()}
        <Pressable
          style={({ pressed }) => [
            styles.continuarBtn,
            (!planSeleccionado || procesando) && styles.continuarBtnOff,
            pressed && planSeleccionado && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
          onPress={handleContinuar}
          disabled={!planSeleccionado || procesando}
        >
          {procesando ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.continuarBtnTexto}>
                {planSeleccionado ? "Continuar" : "Selecciona un plan"}
              </Text>
              {!!planSeleccionado && (
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              )}
            </>
          )}
        </Pressable>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Container ────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header gradient ──────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  // Nav row (back + brand + spacer)
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  volverBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  headerBrandName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Hero copy
  headerHero: {
    gap: 2,
    marginBottom: 16,
  },
  headerHeroDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 28,
    marginBottom: 22,
  },
  headerHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitulo: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    lineHeight: 34,
  },
  headerTituloAccent: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.accentLight,
    lineHeight: 34,
  },
  headerSubtitulo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    lineHeight: 18,
  },
  headerHighlightCard: {
    width: 390,
    borderRadius: 24,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerHighlightEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  headerHighlightTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  headerHighlightStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  headerHighlightStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  headerHighlightValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.accentLight,
    marginBottom: 4,
  },
  headerHighlightLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.64)",
  },

  // Trust strip
  trustStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trustStripDesktop: {
    gap: 16,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },

  // ── Cuerpo ──────────────────────────────────────────────────────────────
  cuerpo: {
    flex: 1,
  },
  cuerpoContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  cuerpoContentDesktop: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 20,
  },
  pageShell: {
    width: "100%",
    alignSelf: "center",
  },
  pageShellWide: {
    maxWidth: 1500,
    alignSelf: "center",
  },
  pageColumns: {
    width: "100%",
  },
  pageColumnsDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  sideColumn: {
    width: 360,
    gap: 18,
  },

  // ── Controls row (tipo + ciclo) ──────────────────────────────────────────
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlsRowDesktop: {
    marginBottom: 4,
  },
  controlBlock: {
    flex: 1,
    gap: 6,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginLeft: 2,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segOpt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segOptActivo: {
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  segOptText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  segOptTextActivo: {
    color: Colors.white,
  },
  ahorroChip: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  ahorroChipText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },

  // ── Stepper bufete ────────────────────────────────────────────────────────
  stepperCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  stepperCardDesktop: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  stepperTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stepperTopDesktop: {
    alignItems: "flex-start",
  },
  stepperIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  stepperHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  quickChipActivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  quickChipTextActivo: {
    color: Colors.white,
  },
  stepperResumen: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperResumenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperResumenText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  stepperBtnOff: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  stepperInput: {
    width: 52,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 16,
  },
  skeletonContainerDesktop: {
    flexDirection: "row",
    gap: 18,
  },
  skeletonCard: {
    height: 320,
    borderRadius: 20,
    backgroundColor: Colors.border,
    opacity: 0.45,
  },
  skeletonCardDesktop: {
    flex: 1,
  },

  // ── Vacío ─────────────────────────────────────────────────────────────────
  vacioCont: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 12,
  },
  vacioIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  vacioTitulo: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  vacioTexto: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },

  // ── Lista de planes ───────────────────────────────────────────────────────
  planesLista: {
    gap: 16,
  },
  planesListaDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "stretch",
  },

  // ── Nota de pie ───────────────────────────────────────────────────────────
  footerNota: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 4,
  },
  continuarBtnDesktop: {
    marginTop: 18,
  },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  summaryEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  summaryPriceBlock: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryPriceLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Colors.textTertiary,
    marginBottom: 6,
  },
  summaryPriceValue: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  summaryPriceMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 6,
  },
  assuranceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assuranceTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 14,
  },
  assuranceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  assuranceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  currentUsageBox: {
    marginTop: 8,
    backgroundColor: "#EEF3FA",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentUsageTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  currentUsageText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },

  // ── Sticky footer CTA ─────────────────────────────────────────────────────
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
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 8 },
    }),
  },
  footerPlanInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerPlanNombre: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  footerPlanDetalle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  footerPlanPrecio: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
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
  continuarBtnOff: {
    backgroundColor: Colors.border,
  },
  continuarBtnTexto: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
