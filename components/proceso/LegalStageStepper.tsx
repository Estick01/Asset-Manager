/**
 * LegalStageStepper
 * Muestra el progreso jurídico de un proceso como una barra de etapas horizontal.
 * - Completadas: círculo verde con ✔
 * - Actual:      círculo azul destacado + badge de vencimiento
 * - Futuras:     círculo gris
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO, LegalStagesResponseDTO } from "@/shared/schema";

const STAGE_STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; help: string }> = {
  COMPLETADA: {
    label: "Completada",
    color: Colors.success,
    icon: "checkmark-circle",
    help: "La etapa ya fue cerrada correctamente y el proceso continuo.",
  },
  INICIADA: {
    label: "En curso",
    color: Colors.primary,
    icon: "play-circle",
    help: "Esta etapa esta abierta y sigue siendo la referencia actual del proceso.",
  },
  EN_PROCESO: {
    label: "En curso",
    color: Colors.primary,
    icon: "play-circle",
    help: "La etapa sigue activa y aun no ha sido resuelta.",
  },
  REINTENTO: {
    label: "Reintento",
    color: Colors.warning,
    icon: "refresh-circle",
    help: "La etapa tuvo que repetirse o retomarse antes de poder avanzar.",
  },
  APLAZADA: {
    label: "Aplazada",
    color: Colors.info,
    icon: "calendar-outline",
    help: "La etapa continua abierta, pero quedo reprogramada o demorada.",
  },
  SUBSANADA: {
    label: "Subsanada",
    color: Colors.info,
    icon: "build-outline",
    help: "Se registro una subsanacion dentro de esta etapa y aun puede requerir seguimiento.",
  },
  SUSPENDIDA: {
    label: "Suspendida",
    color: Colors.danger,
    icon: "pause-circle",
    help: "La etapa quedo detenida formalmente hasta nueva decision.",
  },
  CANCELADA: {
    label: "Cancelada",
    color: Colors.danger,
    icon: "close-circle",
    help: "La etapa fue cerrada de forma excepcional y no siguio su curso normal.",
  },
  NO_ADMITIDA: {
    label: "No admitida",
    color: Colors.danger,
    icon: "alert-circle",
    help: "La etapa fue rechazada o no admitida formalmente.",
  },
  FALLIDA: {
    label: "Fallida",
    color: Colors.danger,
    icon: "alert-circle",
    help: "La etapa termino con una incidencia formal que impidio su cierre normal.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: etapa individual
// ─────────────────────────────────────────────────────────────────────────────

interface StepProps {
  etapa: EtapaProcesoDTO;
  isLast: boolean;
  blockerCount?: number;
  ultimoEstado?: string; // Último estado del historial para esta etapa
  isSelected?: boolean;
}

function Step({ etapa, isLast, blockerCount, ultimoEstado, isSelected = false }: StepProps) {
  // Determinar estado basado en el historial
  const estadosExitosos = ['COMPLETADA'];
  const estadosFallidos = ['NO_ADMITIDA', 'FALLIDA', 'CANCELADA', 'SUSPENDIDA'];
  const estadosEnCurso = ['INICIADA', 'EN_PROCESO', 'REINTENTO', 'APLAZADA', 'SUBSANADA'];

  const isDone = ultimoEstado ? estadosExitosos.includes(ultimoEstado) : etapa.completada;
  const isError = ultimoEstado ? estadosFallidos.includes(ultimoEstado) : false;
  const isCurrent = ultimoEstado
    ? estadosEnCurso.includes(ultimoEstado)
    : etapa.esActual;
  const statusMeta = ultimoEstado ? STAGE_STATUS_META[ultimoEstado] ?? null : null;

  const circleStyle = isDone
    ? styles.circleDone
    : isError
    ? styles.circleError
    : isCurrent
    ? styles.circleCurrent
    : styles.circleFuture;

  const labelStyle = isError
    ? styles.labelError
    : isCurrent
    ? styles.labelCurrent
    : isDone
    ? styles.labelDone
    : styles.labelFuture;

  // badge de vencimiento solo en etapa actual
  const diasRestantes = etapa.diasRestantes ?? null;
  let urgencyColor: string | null = null;
  let urgencyText = "";
  if (isCurrent && diasRestantes !== null) {
    if (diasRestantes <= 0) {
      urgencyColor = Colors.danger;
      urgencyText  = diasRestantes === 0 ? "Vence hoy" : `Venció hace ${Math.abs(diasRestantes)}d`;
    } else if (diasRestantes <= 3) {
      urgencyColor = Colors.warning;
      urgencyText  = `${diasRestantes}d restantes`;
    } else {
      urgencyColor = Colors.success;
      urgencyText  = `${diasRestantes}d restantes`;
    }
  }

  return (
    <View
      style={[styles.stepWrapper, isSelected && styles.stepWrapperSelected]}
      accessibilityRole="button"
      accessibilityLabel={`${etapa.nombre}. ${statusMeta?.label ?? (isDone ? "Completada" : isCurrent ? "Actual" : "Pendiente")}`}
      accessibilityHint={statusMeta?.help}
    >
      {/* Conector izquierdo */}
      <View style={styles.connectorRow}>
        <View style={[styles.connectorLine, isDone ? styles.connectorDone : styles.connectorFuture]} />

        {/* Círculo */}
        <View style={[styles.circle, circleStyle]}>
          {isDone ? (
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          ) : isCurrent ? (
            <View style={styles.circleDot} />
          ) : null}
        </View>

        {statusMeta && !isDone && (
          <View style={[styles.statusIconBadge, { backgroundColor: statusMeta.color }]}>
            <Ionicons name={statusMeta.icon} size={10} color={Colors.white} />
          </View>
        )}

        {/* Conector derecho (oculto si es último) */}
        {!isLast && (
          <View style={[styles.connectorLine, isDone ? styles.connectorDone : styles.connectorFuture]} />
        )}
        {isLast && <View style={styles.connectorLineSpacer} />}
      </View>

      {/* Etiqueta */}
      <Text style={[styles.label, labelStyle]} numberOfLines={2}>
        {etapa.nombre}
      </Text>

      {statusMeta && (
        <View style={[styles.statusPill, { backgroundColor: statusMeta.color + "18" }]}>
          <Ionicons name={statusMeta.icon} size={10} color={statusMeta.color} />
          <Text style={[styles.statusPillText, { color: statusMeta.color }]} numberOfLines={1}>
            {statusMeta.label}
          </Text>
        </View>
      )}

      {/* Badge de urgencia */}
      {isCurrent && urgencyColor && (
        <View style={[styles.badge, { backgroundColor: urgencyColor + "22" }]}>
          <Text style={[styles.badgeText, { color: urgencyColor }]}>{urgencyText}</Text>
        </View>
      )}

      {/* Blocker badge */}
      {blockerCount != null && blockerCount > 0 && (
        <View style={styles.blockerBadge}>
          <Text style={styles.blockerBadgeText}>⚠ {blockerCount}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  data: LegalStagesResponseDTO;
  /** Muestra botón "Avanzar etapa" si se pasa el handler */
  onAdvance?: () => void;
  canAdvance?: boolean;
  /** Abre el detalle de la etapa al presionar */
  onStagePress?: (etapa: EtapaProcesoDTO) => void;
  /** Último estado de cada etapa del historial */
  ultimosEstadosPorEtapa?: Record<string, string>;
  /** Muestra botón de historial si se pasa el handler */
  onShowHistorial?: () => void;
  selectedStageCode?: string | null;
  onShowStageHistory?: (etapa: EtapaProcesoDTO) => void;
}

export function LegalStageStepper({ data, onAdvance, canAdvance = false, onStagePress, ultimosEstadosPorEtapa, onShowHistorial, selectedStageCode = null, onShowStageHistory }: Props) {
  const { etapas, etapaActual, siguienteEtapa } = data;
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const activeStage = etapas.find((etapa) => etapa.codigo === selectedStageCode) ?? etapaActual ?? null;
  const activeStatus = activeStage ? STAGE_STATUS_META[ultimosEstadosPorEtapa?.[activeStage.codigo] ?? ""] ?? null : null;

  const scrollBy = (delta: number) => {
    const node: any = scrollRef.current;
    if (!node?.scrollTo) return;
    const nextX = Math.max(0, scrollXRef.current + delta);
    node.scrollTo({ x: nextX, animated: true });
    scrollXRef.current = nextX;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Etapa procesal</Text>
        <View style={styles.headerActions}>
          {onShowHistorial && (
            <Pressable
              style={styles.historialBtn}
              onPress={onShowHistorial}
              hitSlop={8}
            >
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.historialBtnText}>Historial</Text>
            </Pressable>
          )}
          {etapaActual && (
            <View style={[styles.currentBadge, { backgroundColor: (etapaActual as any).color + "22" }]}>
              <Text style={[styles.currentBadgeText, { color: (etapaActual as any).color || Colors.primary }]}>
                {etapaActual.nombre}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stepper horizontal scrollable */}
      <View style={styles.stepsScrollWrap}>
        {Platform.OS === "web" && (
          <Pressable
            onPress={() => scrollBy(-240)}
            style={({ pressed }) => [styles.scrollArrow, styles.scrollArrowLeft, pressed && { opacity: 0.82 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </Pressable>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={Platform.OS === "web"}
          style={styles.stepsScroll}
          contentContainerStyle={styles.stepsRow}
          onScroll={(event) => {
            scrollXRef.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
        >
          {etapas.map((etapa, idx) => (
            <Pressable key={etapa.codigo} onPress={() => onStagePress?.(etapa)}>
              <Step
                etapa={etapa}
                isLast={idx === etapas.length - 1}
                ultimoEstado={ultimosEstadosPorEtapa?.[etapa.codigo]}
                isSelected={selectedStageCode === etapa.codigo}
              />
            </Pressable>
          ))}
        </ScrollView>

        {Platform.OS === "web" && (
          <Pressable
            onPress={() => scrollBy(240)}
            style={({ pressed }) => [styles.scrollArrow, styles.scrollArrowRight, pressed && { opacity: 0.82 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>
        )}
      </View>

      {activeStage && activeStatus && (
        <View style={styles.stageStatePanel}>
          <View style={styles.stageStateHeader}>
            <View style={[styles.stageStateIconWrap, { backgroundColor: activeStatus.color + "18" }]}>
              <Ionicons name={activeStatus.icon} size={16} color={activeStatus.color} />
            </View>
            <View style={styles.stageStateCopy}>
              <Text style={styles.stageStateEyebrow}>Estado actual de esta etapa</Text>
              <Text style={[styles.stageStateTitle, { color: activeStatus.color }]}>
                {activeStatus.label}
              </Text>
              <Text style={styles.stageStateText}>{activeStatus.help}</Text>
            </View>
          </View>

          {onShowStageHistory && (
            <Pressable
              style={styles.stageHistoryBtn}
              onPress={() => onShowStageHistory(activeStage)}
            >
              <Ionicons name="time-outline" size={15} color={Colors.primary} />
              <Text style={styles.stageHistoryBtnText}>Mirar historial de estados de esta etapa</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Botón avanzar etapa */}
      {canAdvance && onAdvance && siguienteEtapa && (
        <Pressable
          style={({ pressed }) => [styles.advanceBtn, pressed && { opacity: 0.8 }]}
          onPress={onAdvance}
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.advanceBtnText}>Avanzar a: {siguienteEtapa.nombre}</Text>
        </Pressable>
      )}

      {!siguienteEtapa && etapaActual && (
        <View style={styles.finalizedRow}>
          <Ionicons name="checkmark-done-circle" size={16} color={Colors.success} />
          <Text style={styles.finalizedText}>Proceso en etapa final</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 24;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  historialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
  },
  historialBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Stepper row
  stepsScrollWrap: {
    position: "relative",
  },
  stepsScroll: {
    marginHorizontal: Platform.OS === "web" ? 34 : -4,
    paddingHorizontal: 4,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 4,
    paddingRight: 16,
  },
  scrollArrow: {
    position: "absolute",
    top: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  scrollArrowLeft: {
    left: 0,
  },
  scrollArrowRight: {
    right: 0,
  },
  stepWrapper: {
    alignItems: "center",
    width: 72,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepWrapperSelected: {
    backgroundColor: Colors.primary + "08",
  },

  // Connector + circle row
  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  connectorLine: {
    flex: 1,
    height: 2,
  },
  connectorLineSpacer: {
    flex: 1,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  connectorFuture: {
    backgroundColor: Colors.border,
  },

  // Circles
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: Colors.success,
  },
  circleError: {
    backgroundColor: Colors.danger,
  },
  circleCurrent: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  circleFuture: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  statusIconBadge: {
    position: "absolute",
    top: -4,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  // Labels
  label: {
    marginTop: 6,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  labelDone: {
    color: Colors.textSecondary,
  },
  labelError: {
    color: Colors.danger,
    fontWeight: "600",
  },
  labelCurrent: {
    color: Colors.primary,
    fontWeight: "700",
  },
  labelFuture: {
    color: Colors.textTertiary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 68,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Urgency badge
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
  },

  // Advance button
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  advanceBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Blocker badge
  blockerBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#E05252", borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  blockerBadgeText: { fontSize: 8, color: "#fff", fontWeight: "700" },

  stageStatePanel: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  stageStateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stageStateIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stageStateCopy: {
    flex: 1,
    gap: 2,
  },
  stageStateEyebrow: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stageStateTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stageStateText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  stageHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary + "12",
  },
  stageHistoryBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Finalized row
  finalizedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 12,
  },
  finalizedText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500",
  },
});
