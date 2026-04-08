/**
 * CalendarView
 * Cuadrícula mensual + lista de eventos del día seleccionado.
 * Los eventos provienen de 3 fuentes: tareas, etapas procesales y eventos manuales.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { CalendarEventDTO, CalendarEventSource } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const SOURCE_CONFIG: Record<CalendarEventSource, {
  label: string;
  icon: "checkmark-circle-outline" | "git-branch-outline" | "calendar-outline";
  bg: string;
  color: string;
}> = {
  tarea:  { label: "Tarea",  icon: "checkmark-circle-outline", bg: "#FEF3C7", color: "#D97706" },
  etapa:  { label: "Etapa",  icon: "git-branch-outline",       bg: "#EDE9FE", color: "#7C3AED" },
  manual: { label: "Evento", icon: "calendar-outline",         bg: "#EFF6FF", color: "#1D4ED8" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateKey(value: Date | string) {
  if (typeof value === "string") {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
    }
  }
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDaysLabel(days: number): string {
  if (days < 0)  return `Hace ${Math.abs(days)}d`;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days}d`;
}

function getDaysColor(days: number): string {
  if (days <= 0)  return "#EF4444";
  if (days <= 1)  return "#EF4444";
  if (days <= 3)  return "#F97316";
  return "#6B7280";
}

function getSourceTone(source: CalendarEventSource) {
  if (source === "tarea") return { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" };
  if (source === "etapa") return { bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" };
  return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EventCard
// ─────────────────────────────────────────────────────────────────────────────

interface EventItemProps {
  event: CalendarEventDTO;
  onPress: (event: CalendarEventDTO) => void;
}

function EventCard({ event, onPress }: EventItemProps) {
  const hora = new Date(event.fechaInicio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const src          = SOURCE_CONFIG[event.source];
  const isNavigable  = event.source === "tarea" || event.source === "etapa";
  const daysLabel    = getDaysLabel(event.diasRestantes);
  const daysColor    = getDaysColor(event.diasRestantes);
  const procesoLabel = [event.proceso?.radicado, event.proceso?.cliente]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.82 }]}
      onPress={() => onPress(event)}
      accessibilityRole="button"
      accessibilityLabel={`${src.label}: ${event.titulo}`}
    >
      {/* Color accent */}
      <View style={[styles.eventAccent, { backgroundColor: event.color }]} />

      <View style={styles.eventCardContent}>
        {/* Top row: source badge + time + days remaining */}
        <View style={styles.eventCardTop}>
          <View style={[styles.sourceBadge, { backgroundColor: src.bg }]}>
            <Ionicons name={src.icon} size={10} color={src.color} />
            <Text style={[styles.sourceBadgeText, { color: src.color }]}>{src.label}</Text>
          </View>
          <View style={styles.eventCardTopRight}>
            <Ionicons name="time-outline" size={11} color={Colors.textTertiary} />
            <Text style={styles.eventTime}>{hora}</Text>
            <View style={[styles.daysBadge, { backgroundColor: daysColor + "18" }]}>
              <Text style={[styles.daysBadgeText, { color: daysColor }]}>{daysLabel}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.eventTitle} numberOfLines={2}>{event.titulo}</Text>

        {/* Proceso info */}
        {!!procesoLabel && (
          <View style={styles.eventMeta}>
            <Ionicons name="folder-outline" size={11} color={Colors.textTertiary} />
            <Text style={styles.eventMetaText} numberOfLines={1}>{procesoLabel}</Text>
            {isNavigable && (
              <Ionicons name="arrow-forward" size={11} color={Colors.primary} />
            )}
          </View>
        )}

        {/* Description (manual events) */}
        {!!event.descripcion && (
          <Text style={styles.eventDesc} numberOfLines={1}>{event.descripcion}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CalendarView
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  events: CalendarEventDTO[];
  onEventPress: (event: CalendarEventDTO) => void;
  onAddPress: (date?: Date) => void;
  /** Called when month changes so parent can fetch new range */
  onMonthChange: (year: number, month: number) => void;
}

export function CalendarView({ events, onEventPress, onAddPress, onMonthChange }: Props) {
  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // Build events map: "YYYY-M-D" → CalendarEventDTO[]
  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEventDTO[]> = {};
    for (const ev of events) {
      const key = toDateKey(ev.fechaInicio);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const getEventsForDay = (d: Date) => {
    const key = toDateKey(d);
    return eventsMap[key] ?? [];
  };

  // Build calendar grid
  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    const nm = month === 0 ? 11 : month - 1;
    const ny = month === 0 ? year - 1 : year;
    setMonth(nm); setYear(ny);
    setSelectedDay(new Date(ny, nm, 1));
    onMonthChange(ny, nm);
  };

  const nextMonth = () => {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    setMonth(nm); setYear(ny);
    setSelectedDay(new Date(ny, nm, 1));
    onMonthChange(ny, nm);
  };

  const selectedEvents = getEventsForDay(selectedDay).sort(
    (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
  );
  const monthUrgentCount = events.filter((event) => event.diasRestantes >= 0 && event.diasRestantes <= 3).length;
  const monthTodayCount = getEventsForDay(today).length;
  const selectedLeadEvent = selectedEvents[0] ?? null;
  const eventSourceCounts = selectedEvents.reduce(
    (acc, event) => {
      acc[event.source] += 1;
      return acc;
    },
    { tarea: 0, etapa: 0, manual: 0 } as Record<CalendarEventSource, number>,
  );

  const isTodaySelected = isSameDay(selectedDay, today);
  const selectedDateLabel = isTodaySelected
    ? "Hoy, " + selectedDay.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    : selectedDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.container}>
      <View style={styles.monthPanel}>
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </Pressable>
            <View style={styles.monthTitleWrap}>
              <Text style={styles.monthTitle}>{MESES[month]} {year}</Text>
              {events.length > 0 ? (
                <Text style={styles.monthEventCount}>{events.length} evento{events.length !== 1 ? "s" : ""}</Text>
              ) : null}
            </View>
            <View style={styles.monthActions}>
              <Pressable
                onPress={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth());
                  setSelectedDay(today);
                  onMonthChange(today.getFullYear(), today.getMonth());
                }}
                hitSlop={12}
                style={styles.todayBtn}
              >
                <Text style={styles.todayBtnText}>Hoy</Text>
              </Pressable>
              <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.monthHighlights}>
            <View style={styles.monthHighlightCard}>
              <Text style={styles.monthHighlightValue}>{monthTodayCount}</Text>
              <Text style={styles.monthHighlightLabel}>hoy</Text>
            </View>
            <View style={styles.monthHighlightCard}>
              <Text style={styles.monthHighlightValue}>{monthUrgentCount}</Text>
              <Text style={styles.monthHighlightLabel}>próximos</Text>
            </View>
            <View style={styles.monthHighlightCardWide}>
              <Text style={styles.monthHighlightEyebrow}>Foco del mes</Text>
              <Text style={styles.monthHighlightText}>
                {monthUrgentCount > 0
                  ? `${monthUrgentCount} evento${monthUrgentCount !== 1 ? "s" : ""} necesita${monthUrgentCount === 1 ? "" : "n"} atención en los próximos 3 días.`
                  : "No hay eventos críticos en los próximos 3 días."}
              </Text>
            </View>
          </View>

          <View style={styles.weekHeader}>
            {DIAS_SEMANA.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;

              const cellDate = new Date(year, month, day);
              const isToday = isSameDay(cellDate, today);
              const isSelected = isSameDay(cellDate, selectedDay);
              const dayEvents = getEventsForDay(cellDate);
              const dotColors = dayEvents.slice(0, 3).map((e) => e.color);

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                  ]}
                  onPress={() => setSelectedDay(cellDate)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day} de ${MESES[month]}, ${dayEvents.length} eventos`}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                      isToday && !isSelected && styles.cellTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {dotColors.length > 0 ? (
                    <View style={styles.dotRow}>
                      {dotColors.map((c, i) => (
                        <View key={i} style={[styles.dot, { backgroundColor: isSelected ? "rgba(255,255,255,0.75)" : c }]} />
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
      </View>

      <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <View style={styles.daySectionLeft}>
              <Text style={styles.daySectionTitle} numberOfLines={1}>{selectedDateLabel}</Text>
              {selectedEvents.length > 0 ? (
                <View style={styles.eventCountBadge}>
                  <Text style={styles.eventCountText}>{selectedEvents.length}</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
              onPress={() => onAddPress(selectedDay)}
              accessibilityRole="button"
              accessibilityLabel="Agregar evento"
            >
              <Ionicons name="add" size={16} color={Colors.white} />
              <Text style={styles.addBtnText}>Nuevo</Text>
            </Pressable>
          </View>

          <View style={styles.dayOverview}>
            <View style={styles.dayOverviewMain}>
              <Text style={styles.dayOverviewLabel}>
                {selectedEvents.length > 0 ? "Lo más relevante del día" : "Agenda del día"}
              </Text>
              <Text style={styles.dayOverviewTitle}>
                {selectedLeadEvent ? selectedLeadEvent.titulo : "No hay eventos programados"}
              </Text>
              <Text style={styles.dayOverviewText}>
                {selectedLeadEvent
                  ? selectedLeadEvent.descripcion || "Abra el evento para ver su detalle, el caso vinculado y el siguiente paso."
                  : "Puede dejar este día libre o registrar una audiencia, recordatorio o evento manual."}
              </Text>
            </View>
            <View style={styles.dayOverviewMeta}>
              {selectedEvents.length > 0 ? (
                <>
                  {eventSourceCounts.tarea > 0 && (
                    <View style={[styles.dayOverviewChip, getSourceTone("tarea")]}>
                      <Ionicons name="checkmark-circle-outline" size={12} color={getSourceTone("tarea").text} />
                      <Text style={[styles.dayOverviewChipText, { color: getSourceTone("tarea").text }]}>
                        {eventSourceCounts.tarea} tarea{eventSourceCounts.tarea !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                  {eventSourceCounts.etapa > 0 && (
                    <View style={[styles.dayOverviewChip, getSourceTone("etapa")]}>
                      <Ionicons name="git-branch-outline" size={12} color={getSourceTone("etapa").text} />
                      <Text style={[styles.dayOverviewChipText, { color: getSourceTone("etapa").text }]}>
                        {eventSourceCounts.etapa} etapa{eventSourceCounts.etapa !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                  {eventSourceCounts.manual > 0 && (
                    <View style={[styles.dayOverviewChip, getSourceTone("manual")]}>
                      <Ionicons name="calendar-outline" size={12} color={getSourceTone("manual").text} />
                      <Text style={[styles.dayOverviewChipText, { color: getSourceTone("manual").text }]}>
                        {eventSourceCounts.manual} evento{eventSourceCounts.manual !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.dayOverviewHint}>
                  <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
                  <Text style={styles.dayOverviewHintText}>Úselo para anticipar audiencias, hitos y vencimientos.</Text>
                </View>
              )}
            </View>
          </View>

          {selectedEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-clear-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyDayTitle}>Sin eventos</Text>
              <Text style={styles.emptyDayText}>
                {isTodaySelected ? "Toca Nuevo para agregar un evento hoy" : "Toca Nuevo para agregar un evento"}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.eventList}
              contentContainerStyle={styles.eventListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {selectedEvents.map((ev) => (
                <EventCard key={ev.id} event={ev} onPress={onEventPress} />
              ))}
            </ScrollView>
          )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  monthPanel: {
    backgroundColor: Colors.surface,
  },

  // ── Month nav ──
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleWrap: {
    alignItems: "center",
    gap: 2,
  },
  monthActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textTransform: "capitalize",
  },
  monthEventCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary + "10",
  },
  todayBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  monthHighlights: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  monthHighlightCard: {
    width: 74,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthHighlightCardWide: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Colors.primary + "0F",
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  monthHighlightValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  monthHighlightLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthHighlightEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  monthHighlightText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },

  // ── Week header ──
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },

  // ── Grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  cell: {
    width: "14.2857%",
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    gap: 2,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellToday: {
    backgroundColor: Colors.primary + "15",
  },
  cellText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  cellTextSelected: {
    color: Colors.white,
    fontFamily: "Inter_700Bold",
  },
  cellTextToday: {
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── Day section ──
  daySection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 8,
  },
  daySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayOverview: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  dayOverviewMain: {
    gap: 4,
  },
  dayOverviewLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dayOverviewTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayOverviewText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  dayOverviewMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayOverviewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayOverviewChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dayOverviewHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayOverviewHintText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  daySectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  daySectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textTransform: "capitalize",
    flexShrink: 1,
  },
  eventCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  eventCountText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },

  // ── Empty ──
  emptyDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyDayTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptyDayText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // ── Event list ──
  eventList: {
    flex: 1,
  },
  eventListContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 24,
  },

  // ── Event card ──
  eventCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  eventCardContent: {
    flex: 1,
    padding: 12,
    gap: 5,
  },
  eventCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  eventCardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTime: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  daysBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  daysBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    lineHeight: 20,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    flex: 1,
  },
  eventDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});
