/**
 * CalendarView
 * Muestra los eventos del mes en una cuadrícula mensual.
 * Cada día con eventos muestra un punto de color.
 * Al tocar un día aparece la lista de eventos de ese día.
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
import type { CalendarEventDTO } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event item (dentro de la lista diaria)
// ─────────────────────────────────────────────────────────────────────────────

interface EventItemProps {
  event: CalendarEventDTO;
  onPress: (event: CalendarEventDTO) => void;
}

function EventItem({ event, onPress }: EventItemProps) {
  const hora = new Date(event.fechaInicio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sourceIcon =
    event.source === "tarea"  ? "checkmark-circle-outline" :
    event.source === "etapa"  ? "git-branch-outline"       :
                                 "calendar-outline";

  return (
    <Pressable
      style={({ pressed }) => [styles.eventItem, pressed && { opacity: 0.75 }]}
      onPress={() => onPress(event)}
    >
      <View style={[styles.eventDot, { backgroundColor: event.color }]} />
      <View style={styles.eventItemBody}>
        <Text style={styles.eventItemTitle} numberOfLines={1}>{event.titulo}</Text>
        {event.proceso && (
          <Text style={styles.eventItemMeta} numberOfLines={1}>
            {event.proceso.radicado} · {event.proceso.cliente}
          </Text>
        )}
      </View>
      <View style={styles.eventItemRight}>
        <Text style={styles.eventItemTime}>{hora}</Text>
        <Ionicons name={sourceIcon as any} size={13} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
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
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // Build events map: "YYYY-MM-DD" -> CalendarEventDTO[]
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
  const firstDay  = startOfMonth(year, month).getDay(); // 0 = Sunday
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
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
    (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
  );

  return (
    <View style={styles.container}>
      {/* ── Navegador de mes ── */}
      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {MESES[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* ── Encabezado días de la semana ── */}
      <View style={styles.weekHeader}>
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* ── Grid ── */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;

          const cellDate = new Date(year, month, day);
          const isToday  = isSameDay(cellDate, today);
          const isSelected = isSameDay(cellDate, selectedDay);
          const dayEvents  = getEventsForDay(cellDate);

          // Take up to 3 dot colors
          const dotColors = dayEvents.slice(0, 3).map(e => e.color);

          return (
            <Pressable
              key={day}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
              ]}
              onPress={() => setSelectedDay(cellDate)}
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
                    <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Lista de eventos del día seleccionado ── */}
      <View style={styles.daySection}>
        <View style={styles.daySectionHeader}>
          <Text style={styles.daySectionTitle}>
            {selectedDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
            onPress={() => onAddPress(selectedDay)}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
          </Pressable>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="calendar-clear-outline" size={28} color={Colors.textTertiary} />
            <Text style={styles.emptyDayText}>Sin eventos este día</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.eventList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {selectedEvents.map(ev => (
              <EventItem key={ev.id} event={ev} onPress={onEventPress} />
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

  // Month nav
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    textTransform: "capitalize",
  },

  // Week header
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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
    color: Colors.text,
  },
  cellTextSelected: {
    color: Colors.white,
    fontWeight: "700",
  },
  cellTextToday: {
    color: Colors.primary,
    fontWeight: "700",
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

  // Day section
  daySection: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  daySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  daySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "capitalize",
  },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },

  // Empty
  emptyDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyDayText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },

  // Event list
  eventList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  eventItemBody: {
    flex: 1,
    gap: 2,
  },
  eventItemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  eventItemMeta: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  eventItemRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  eventItemTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
