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
      const d = new Date(ev.fechaInicio);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const getEventsForDay = (d: Date) => {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

  const isTodaySelected = isSameDay(selectedDay, today);
  const selectedDateLabel = isTodaySelected
    ? "Hoy, " + selectedDay.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    : selectedDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.container}>
      {/* ── Month nav ── */}
      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>{MESES[month]} {year}</Text>
          {events.length > 0 && (
            <Text style={styles.monthEventCount}>{events.length} evento{events.length !== 1 ? "s" : ""}</Text>
          )}
        </View>
        <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* ── Week header ── */}
      <View style={styles.weekHeader}>
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* ── Grid ── */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;

          const cellDate   = new Date(year, month, day);
          const isToday    = isSameDay(cellDate, today);
          const isSelected = isSameDay(cellDate, selectedDay);
          const dayEvents  = getEventsForDay(cellDate);
          const dotColors  = dayEvents.slice(0, 3).map(e => e.color);

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
              <Text style={[
                styles.cellText,
                isSelected && styles.cellTextSelected,
                isToday && !isSelected && styles.cellTextToday,
              ]}>
                {day}
              </Text>
              {dotColors.length > 0 && (
                <View style={styles.dotRow}>
                  {dotColors.map((c, i) => (
                    <View
                      key={i}
                      style={[styles.dot, { backgroundColor: isSelected ? "rgba(255,255,255,0.75)" : c }]}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Day section ── */}
      <View style={styles.daySection}>
        <View style={styles.daySectionHeader}>
          <View style={styles.daySectionLeft}>
            <Text style={styles.daySectionTitle} numberOfLines={1}>
              {selectedDateLabel}
            </Text>
            {selectedEvents.length > 0 && (
              <View style={styles.eventCountBadge}>
                <Text style={styles.eventCountText}>{selectedEvents.length}</Text>
              </View>
            )}
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
            {selectedEvents.map(ev => (
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
    width: `${100 / 7}%` as any,
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
