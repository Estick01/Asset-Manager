import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
}

const FEATURE_LABELS: Record<string, string> = {
  calendario: "Calendario",
  etapas_procesales: "Etapas procesales",
  privacidad_basica: "Privacidad básica",
  privacidad_avanzada: "Privacidad avanzada",
  comunidad: "Comunidad",
  chat: "Chat",
  dashboard_bufete: "Dashboard bufete",
  roles_custom: "Roles personalizados",
  soporte_prioritario: "Soporte prioritario",
};

function formatCOP(valor: string): string {
  const num = parseInt(valor, 10);
  if (isNaN(num)) return valor;
  return new Intl.NumberFormat("es-CO").format(num);
}

function formatRecurso(valor: number): string {
  if (valor === -1) return "Ilimitados";
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
}: PlanCardProps) {
  const precioCOP =
    ciclo === "mensual" ? plan.precioMensualCop : plan.precioAnualCop;
  const precioFormateado = formatCOP(precioCOP);
  const esBufete = plan.tipo === "bufete";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        destacado && styles.cardDestacado,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onSelect}
    >
      {/* Badges superiores */}
      <View style={styles.badgesRow}>
        {destacado && (
          <View style={styles.badgePopular}>
            <Text style={styles.badgePopularText}>Más popular</Text>
          </View>
        )}
        {ciclo === "anual" && (
          <View style={styles.badgeAnual}>
            <Text style={styles.badgeAnualText}>2 meses gratis</Text>
          </View>
        )}
      </View>

      {/* Nombre del plan */}
      <Text style={[styles.planNombre, destacado && styles.planNombreDestacado]}>
        {plan.nombre}
      </Text>

      {/* Precio */}
      <View style={styles.precioContainer}>
        <Text style={styles.precioSymbol}>$</Text>
        <Text style={styles.precioValor}>{precioFormateado}</Text>
        <Text style={styles.precioPeriodo}>
          COP/{ciclo === "mensual" ? "mes" : "año"}
        </Text>
      </View>

      {/* Separador */}
      <View style={styles.separador} />

      {/* Límites */}
      <View style={styles.limitesContainer}>
        <View style={styles.limiteRow}>
          <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.limiteText}>
            {formatRecurso(plan.maxProcesos)} procesos
          </Text>
        </View>

        <View style={styles.limiteRow}>
          <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.limiteText}>
            {formatRecurso(plan.maxClientes)} clientes
          </Text>
        </View>

        <View style={styles.limiteRow}>
          <Ionicons name="cloud-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.limiteText}>
            {plan.maxStorageGb > 0 ? `${plan.maxStorageGb} GB` : "Sin almacenamiento"}
          </Text>
        </View>

        {esBufete && (
          <View style={styles.limiteRow}>
            <Ionicons name="person-add-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.limiteText}>
              {plan.includedUsers} usuario{plan.includedUsers !== 1 ? "s" : ""} incluido
              {plan.maxUsers > plan.includedUsers
                ? ` (máx. ${plan.maxUsers})`
                : ""}
            </Text>
          </View>
        )}

        {esBufete && plan.precioUsuarioExtraCop !== null && (
          <View style={styles.limiteRow}>
            <Ionicons name="add-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.limiteText}>
              +${formatCOP(plan.precioUsuarioExtraCop)} COP/usuario extra
            </Text>
          </View>
        )}
      </View>

      {/* Features */}
      {plan.features.length > 0 && (
        <>
          <View style={styles.separador} />
          <View style={styles.featuresContainer}>
            {plan.features.map((feature) => {
              const activa = isFeatureActiva(feature.value);
              const etiqueta =
                FEATURE_LABELS[feature.code] ?? feature.nombre;
              return (
                <View key={feature.code} style={styles.featureRow}>
                  <Ionicons
                    name={activa ? "checkmark-circle" : "close-circle-outline"}
                    size={16}
                    color={activa ? Colors.success : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      !activa && styles.featureTextInactiva,
                    ]}
                  >
                    {etiqueta}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Botón selección */}
      <Pressable
        style={[
          styles.selectButton,
          selected && styles.selectButtonSelected,
          destacado && !selected && styles.selectButtonDestacado,
        ]}
        onPress={onSelect}
      >
        <Text
          style={[
            styles.selectButtonText,
            selected && styles.selectButtonTextSelected,
            destacado && !selected && styles.selectButtonTextDestacado,
          ]}
        >
          {selected ? "Seleccionado" : "Seleccionar"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 14,
  },
  cardDestacado: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  cardSelected: {
    backgroundColor: "#EEF3FA",
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 0,
  },
  badgePopular: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  badgePopularText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  badgeAnual: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  badgeAnualText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  planNombre: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  planNombreDestacado: {
    color: Colors.primary,
  },
  precioContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  precioSymbol: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 32,
  },
  precioValor: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    lineHeight: 36,
  },
  precioPeriodo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
    marginLeft: 2,
  },
  separador: {
    height: 1,
    backgroundColor: Colors.border,
  },
  limitesContainer: {
    gap: 8,
  },
  limiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  limiteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  featureTextInactiva: {
    color: Colors.textTertiary,
    textDecorationLine: "line-through",
  },
  selectButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    marginTop: 4,
  },
  selectButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectButtonDestacado: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  selectButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  selectButtonTextSelected: {
    color: Colors.white,
  },
  selectButtonTextDestacado: {
    color: Colors.white,
  },
});
