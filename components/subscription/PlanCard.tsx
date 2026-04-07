import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface PlanFeature {
  code: string;
  nombre: string;
  value: string;
}

interface Plan {
  id: string;
  nombre: string;
  tipo: "abogado" | "bufete";
  precioMensualCop: string;
  precioAnualCop: string;
  precioMensualUsd: string;
  precioAnualUsd: string;
  maxProcesos: number;
  maxClientes: number;
  maxStorageGb: number;
  includedUsers: number;
  maxUsers: number;
  precioUsuarioExtraCop: string | null;
  features: PlanFeature[];
}

interface PlanCardProps {
  plan: Plan;
  ciclo: "mensual" | "anual";
  selected?: boolean;
  onSelect: () => void;
  destacado?: boolean;
  esPlanActual?: boolean;
  extraUsers?: number; // total de usuarios en la firma (bufete)
}

const FEATURE_LABELS: Record<string, string> = {
  calendario: "Calendario legal",
  etapas_procesales: "Etapas procesales",
  privacidad_basica: "Privacidad básica",
  privacidad_avanzada: "Privacidad avanzada",
  comunidad: "Comunidad LexTrack",
  chat: "Chat con clientes",
  dashboard_bufete: "Dashboard de firma",
  roles_custom: "Roles personalizados",
  soporte_prioritario: "Soporte prioritario",
};

const PLAN_DESC: Record<string, string> = {
  Gratis: "Para empezar sin compromisos",
  Esencial: "Para el abogado activo",
  Pro: "Sin límites, todo incluido",
  Starter: "Para equipos pequeños",
  Business: "Para firmas en crecimiento",
  Enterprise: "Para grandes firmas",
};

function formatCOP(valor: string): string {
  const num = parseInt(valor, 10);
  if (isNaN(num)) return valor;
  return new Intl.NumberFormat("es-CO").format(num);
}

function formatRecurso(valor: number): string {
  if (valor === -1 || valor === 0) return "Ilimitados";
  return String(valor);
}

function isFeatureActiva(value: string): boolean {
  return value === "true" || value === "1" || value === "enabled";
}

export function PlanCard({
  plan,
  ciclo,
  selected = false,
  onSelect,
  destacado = false,
  esPlanActual = false,
  extraUsers,
}: PlanCardProps) {
  const precioMensualNum = parseInt(plan.precioMensualCop, 10);
  const precioAnualNum   = parseInt(plan.precioAnualCop, 10);
  const esGratis  = precioMensualNum === 0;
  const esBufete  = plan.tipo === "bufete";
  const descripcion = PLAN_DESC[plan.nombre] ?? "";

  // ── Usuarios extra (solo bufete) ───────────────────────────────────────────
  const precioExtraCop = plan.precioUsuarioExtraCop
    ? parseInt(plan.precioUsuarioExtraCop, 10)
    : 0;
  const usuariosExtraCount =
    esBufete && extraUsers !== undefined && plan.includedUsers > 0
      ? Math.max(0, extraUsers - plan.includedUsers)
      : 0;
  const costoExtraMensual = usuariosExtraCount * precioExtraCop;

  // Precio base + extra (mensual)
  const precioMensualTotal = precioMensualNum + costoExtraMensual;
  // Para anual: precio base anual + extra * 12
  const precioAnualTotal   = precioAnualNum + costoExtraMensual * 12;

  const precioCOPTotal =
    ciclo === "mensual"
      ? String(precioMensualTotal)
      : String(precioAnualTotal);

  const ahorroAnual =
    ciclo === "anual" && !esGratis && precioMensualNum > 0
      ? Math.round(((precioMensualTotal * 12 - precioAnualTotal) / (precioMensualTotal * 12)) * 100)
      : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        destacado && styles.cardDestacado,
        esPlanActual && !destacado && styles.cardPlanActual,
        selected && !destacado && !esPlanActual && styles.cardSelected,
        pressed && { opacity: 0.97, transform: [{ scale: 0.995 }] },
      ]}
      onPress={onSelect}
    >
      {/* ── Top row: badges ── */}
      <View style={styles.topRow}>
        {esPlanActual ? (
          <View style={styles.badgePlanActual}>
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={styles.badgePlanActualText}>Tu plan actual</Text>
          </View>
        ) : destacado ? (
          <View style={styles.badgePopular}>
            <Ionicons name="flash" size={11} color={Colors.primaryDark} />
            <Text style={styles.badgePopularText}>Más popular</Text>
          </View>
        ) : (
          <View style={{ height: 24 }} />
        )}
        {ciclo === "anual" && ahorroAnual > 0 && (
          <View style={styles.badgeAhorro}>
            <Text style={styles.badgeAhorroText}>−{ahorroAnual}%</Text>
          </View>
        )}
      </View>

      {/* ── Plan name + description ── */}
      <View style={styles.nameBlock}>
        <Text style={[styles.planNombre, destacado && styles.planNombreDestacado]}>
          {plan.nombre}
        </Text>
        {!!descripcion && (
          <Text style={[styles.planDesc, destacado && styles.planDescDestacado]}>
            {descripcion}
          </Text>
        )}
      </View>

      {/* ── Price ── */}
      <View style={styles.precioBlock}>
        {esGratis ? (
          <Text style={[styles.precioGratis, destacado && { color: Colors.accentLight }]}>
            Gratis
          </Text>
        ) : (
          <View style={styles.precioRow}>
            <Text style={[styles.precioSymbol, destacado && styles.precioDestacado]}>$</Text>
            <Text style={[styles.precioValor, destacado && styles.precioDestacado]}>
              {formatCOP(precioCOPTotal)}
            </Text>
            <Text style={[styles.precioPeriodo, destacado && styles.precioPeriodoDestacado]}>
              {"\n"}COP/{ciclo === "mensual" ? "mes" : "año"}
            </Text>
          </View>
        )}

        {/* Nota anual */}
        {ciclo === "anual" && ahorroAnual > 0 && (
          <Text style={[styles.precioAnualNota, destacado && { color: "rgba(255,255,255,0.5)" }]}>
            equivale a ${formatCOP(String(Math.round(precioAnualTotal / 12)))} COP/mes
          </Text>
        )}

        {/* Desglose de usuarios extra */}
        {esBufete && !esGratis && extraUsers !== undefined && (
          <View style={[styles.precioDesglose, destacado && styles.precioDesgloseDestacado]}>
            <View style={styles.precioDesgloseRow}>
              <Ionicons name="people-outline" size={12} color={destacado ? "rgba(255,255,255,0.5)" : Colors.textTertiary} />
              <Text style={[styles.precioDesgloseText, destacado && styles.precioDesgloseTextDestacado]}>
                {plan.includedUsers} usuario{plan.includedUsers !== 1 ? "s" : ""} incluido{plan.includedUsers !== 1 ? "s" : ""}
              </Text>
            </View>
            {usuariosExtraCount > 0 && (
              <View style={styles.precioDesgloseRow}>
                <Ionicons name="add-circle-outline" size={12} color={destacado ? Colors.accentLight : Colors.primary} />
                <Text style={[styles.precioDesgloseExtra, destacado && { color: Colors.accentLight }]}>
                  +{usuariosExtraCount} extra × ${formatCOP(String(precioExtraCop))}/mes
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, destacado && styles.dividerDestacado]} />

      {/* ── Recursos ── */}
      <View style={styles.recursosGrid}>
        <RecursoItem
          icon="document-text-outline"
          label={`${formatRecurso(plan.maxProcesos)} procesos`}
          destacado={destacado}
        />
        <RecursoItem
          icon="people-outline"
          label={`${formatRecurso(plan.maxClientes)} clientes`}
          destacado={destacado}
        />
        <RecursoItem
          icon="cloud-outline"
          label={plan.maxStorageGb > 0 ? `${plan.maxStorageGb} GB` : "Sin almacenamiento"}
          destacado={destacado}
        />
        {esBufete && (
          <RecursoItem
            icon="person-add-outline"
            label={`${plan.includedUsers} usuario${plan.includedUsers !== 1 ? "s" : ""} incluido${plan.maxUsers > plan.includedUsers ? ` (máx. ${plan.maxUsers})` : ""}`}
            destacado={destacado}
          />
        )}
      </View>

      {/* ── Features ── */}
      {plan.features.length > 0 && (
        <>
          <View style={[styles.divider, destacado && styles.dividerDestacado]} />
          <View style={styles.featuresBlock}>
            {plan.features.map((feature) => {
              const activa = isFeatureActiva(feature.value);
              const etiqueta = FEATURE_LABELS[feature.code] ?? feature.nombre;
              return (
                <FeatureItem
                  key={feature.code}
                  label={etiqueta}
                  activa={activa}
                  destacado={destacado}
                />
              );
            })}
          </View>
        </>
      )}

      {/* ── CTA Button ── */}
      <Pressable
        style={({ pressed }) => [
          styles.ctaBtn,
          destacado ? styles.ctaBtnDestacado : styles.ctaBtnBase,
          selected && styles.ctaBtnSelected,
          pressed && { opacity: 0.88 },
        ]}
        onPress={onSelect}
      >
        {selected && (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={destacado ? Colors.primaryDark : Colors.white}
          />
        )}
        <Text
          style={[
            styles.ctaBtnText,
            destacado && styles.ctaBtnTextDestacado,
            selected && styles.ctaBtnTextSelected,
          ]}
        >
          {esPlanActual && !selected
            ? "Plan activo"
            : selected
            ? "Seleccionado"
            : esGratis
            ? "Empezar gratis"
            : "Seleccionar plan"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecursoItem({
  icon,
  label,
  destacado,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destacado: boolean;
}) {
  return (
    <View style={styles.recursoRow}>
      <View style={[styles.recursoIconWrap, destacado && styles.recursoIconWrapDestacado]}>
        <Ionicons
          name={icon}
          size={14}
          color={destacado ? Colors.accentLight : Colors.primary}
        />
      </View>
      <Text style={[styles.recursoText, destacado && styles.recursoTextDestacado]}>
        {label}
      </Text>
    </View>
  );
}

function FeatureItem({
  label,
  activa,
  destacado,
}: {
  label: string;
  activa: boolean;
  destacado: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={activa ? "checkmark-circle" : "remove-circle-outline"}
        size={17}
        color={
          activa
            ? destacado
              ? Colors.accentLight
              : Colors.success
            : destacado
            ? "rgba(255,255,255,0.25)"
            : Colors.border
        }
      />
      <Text
        style={[
          styles.featureText,
          !activa && styles.featureTextInactiva,
          destacado && (activa ? styles.featureTextDestacado : styles.featureTextInactivaDestacado),
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Card base
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  cardDestacado: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.accent,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: "#EEF3FA",
  },
  cardPlanActual: {
    borderColor: "#16A34A",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },

  // Top row
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 24,
  },
  badgePopular: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgePopularText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
  },
  badgePlanActual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16A34A",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgePlanActualText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  badgeAhorro: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeAhorroText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },

  // Name block
  nameBlock: { gap: 3 },
  planNombre: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  planNombreDestacado: { color: Colors.white },
  planDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  planDescDestacado: { color: "rgba(255,255,255,0.6)" },

  // Price
  precioBlock: { gap: 4 },
  precioGratis: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  precioRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  precioSymbol: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 36,
  },
  precioValor: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 40,
  },
  precioDestacado: { color: Colors.accentLight },
  precioPeriodo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
    marginLeft: 4,
  },
  precioPeriodoDestacado: { color: "rgba(255,255,255,0.5)" },
  precioAnualNota: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  precioDesglose: {
    marginTop: 8,
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  precioDesgloseDestacado: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  precioDesgloseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  precioDesgloseText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  precioDesgloseTextDestacado: {
    color: "rgba(255,255,255,0.45)",
  },
  precioDesgloseExtra: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border },
  dividerDestacado: { backgroundColor: "rgba(255,255,255,0.1)" },

  // Resources
  recursosGrid: { gap: 8 },
  recursoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recursoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  recursoIconWrapDestacado: { backgroundColor: "rgba(212,168,83,0.15)" },
  recursoText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  recursoTextDestacado: { color: "rgba(255,255,255,0.85)" },

  // Features
  featuresBlock: { gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
  },
  featureTextDestacado: { color: "rgba(255,255,255,0.9)" },
  featureTextInactiva: { color: Colors.textTertiary },
  featureTextInactivaDestacado: { color: "rgba(255,255,255,0.3)" },

  // CTA
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 13,
    marginTop: 4,
  },
  ctaBtnBase: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ctaBtnDestacado: {
    backgroundColor: Colors.accent,
    borderWidth: 0,
  },
  ctaBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ctaBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  ctaBtnTextDestacado: { color: Colors.primaryDark },
  ctaBtnTextSelected: { color: Colors.white },
});
