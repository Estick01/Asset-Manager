import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { CalendarView } from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";
import { EditarTareaModal } from "@/components/tareas/EditarTareaModal";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/services/calendarService";
import { getTareaById } from "@/lib/services/tareaService";
import type {
  CalendarEventDTO,
  CreateCalendarEventDTO,
  UpdateCalendarEventDTO,
  TareaResponseDTO,
} from "@/shared/schema";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1160, width - metrics.gutter * 2));

  const [events,        setEvents]        = useState<CalendarEventDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentYear,   setCurrentYear]   = useState(new Date().getFullYear());
  const [currentMonth,  setCurrentMonth]  = useState(new Date().getMonth());

  // Modal state — eventos manuales
  const [modalVisible,   setModalVisible]   = useState(false);
  const [selectedEvent,  setSelectedEvent]  = useState<CalendarEventDTO | null>(null);
  const [modalInitDate,  setModalInitDate]  = useState<Date | undefined>(undefined);

  // Modal state — tareas
  const [tareaModal,     setTareaModal]     = useState<TareaResponseDTO | null>(null);

  // ── Load events ────────────────────────────────────────────────────────────

  const loadEvents = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const from = new Date(year, month, 1);
      const to   = new Date(year, month + 1, 0, 23, 59, 59);
      const data = await getCalendarEvents(from, to);
      setEvents(data);
    } catch (e: any) {
      toast.error(e.message ?? "Error al cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents(currentYear, currentMonth);
    }, [loadEvents, currentYear, currentMonth]),
  );

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    loadEvents(year, month);
  };

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleEventPress = async (event: CalendarEventDTO) => {
    if (event.source === "tarea") {
      // Extraer el ID real (el evento tiene id "tarea-{uuid}")
      const tareaId = event.id.replace(/^tarea-/, "");
      try {
        const tarea = await getTareaById(tareaId);
        setTareaModal(tarea);
      } catch {
        toast.error("No se pudo cargar la tarea");
      }
      return;
    }
    if (event.source === "etapa") {
      if (event.proceso?.id) {
        router.push(`/case/${event.proceso.id}` as any);
      }
      return;
    }
    // Evento manual — abrir modal de edición
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleAddPress = (date?: Date) => {
    setSelectedEvent(null);
    setModalInitDate(date);
    setModalVisible(true);
  };

  const handleSave = async (dto: CreateCalendarEventDTO | UpdateCalendarEventDTO) => {
    try {
      if (selectedEvent) {
        await updateCalendarEvent(selectedEvent.id, dto as UpdateCalendarEventDTO);
        toast.success("Evento actualizado");
      } else {
        await createCalendarEvent(dto as CreateCalendarEventDTO);
        toast.success("Evento creado");
      }
      loadEvents(currentYear, currentMonth);
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar el evento");
      throw e; // propagate so modal stays open
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await deleteCalendarEvent(selectedEvent.id);
      toast.success("Evento eliminado");
      loadEvents(currentYear, currentMonth);
    } catch (e: any) {
      toast.error(e.message ?? "Error al eliminar el evento");
      throw e;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Count urgent events (≤ 3 days) to show in header
  const urgentCount = events.filter(e => e.diasRestantes >= 0 && e.diasRestantes <= 3).length;
  const manualCount = events.filter(e => e.source === "manual").length;
  const tareaCount = events.filter(e => e.source === "tarea").length;
  const todayCount = events.filter((event) => event.diasRestantes === 0).length;
  const stageCount = events.filter((event) => event.source === "etapa").length;
  const nextEvents = [...events]
    .filter((event) => event.diasRestantes >= 0)
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 4);
  const weekFocus = urgentCount > 0
    ? `${urgentCount} evento${urgentCount !== 1 ? "s" : ""} necesita${urgentCount === 1 ? "" : "n"} atención esta semana.`
    : "La agenda está controlada para esta semana.";
  const nextLead = nextEvents[0] ?? null;

  if (desktop) {
    return (
      <ScrollView
        style={styles.desktopScreen}
        contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: metrics.gutter, paddingBottom: metrics.gutter }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.desktopShell, { maxWidth: shellWidth }]}>
          <View style={styles.desktopHero}>
            <View style={styles.desktopHeroCopy}>
              <Text style={styles.desktopEyebrow}>Agenda legal</Text>
              <Text style={styles.desktopHeroTitle}>Calendario de trabajo</Text>
              <Text style={styles.desktopHeroText}>
                Centraliza audiencias, tareas, hitos procesales y seguimiento diario en una vista con más prioridad visual y mejor lectura de próximos movimientos.
              </Text>
              <View style={styles.desktopHeroInsight}>
                <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                <Text style={styles.desktopHeroInsightText}>{weekFocus}</Text>
              </View>
            </View>
            <View style={styles.desktopHeroStats}>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{events.length}</Text>
                <Text style={styles.desktopHeroLabel}>eventos</Text>
              </View>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{todayCount}</Text>
                <Text style={styles.desktopHeroLabel}>hoy</Text>
              </View>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{urgentCount}</Text>
                <Text style={styles.desktopHeroLabel}>próximos</Text>
              </View>
            </View>
          </View>

          <View style={styles.desktopBody}>
            <View style={styles.desktopMainColumn}>
              <View style={styles.calendarContainer}>
                <CalendarView
                  events={events}
                  onEventPress={handleEventPress}
                  onAddPress={handleAddPress}
                  onMonthChange={handleMonthChange}
                />
              </View>
            </View>

            <View style={styles.desktopAside}>
              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Siguiente hito</Text>
                <Text style={styles.desktopAsideTitle}>
                  {nextLead ? nextLead.titulo : "No hay eventos próximos"}
                </Text>
                <Text style={styles.desktopAsideBodyText}>
                  {nextLead
                    ? `${new Date(nextLead.fechaInicio).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })} · ${nextLead.proceso?.radicado ?? "Evento general"}`
                    : "Cuando agregue o cargue nuevos eventos, aquí verá el siguiente movimiento de la agenda."}
                </Text>
              </View>

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Resumen</Text>
                <Text style={styles.desktopAsideTitle}>Pulso del calendario</Text>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Eventos manuales</Text>
                  <Text style={styles.desktopAsideMetricValue}>{manualCount}</Text>
                </View>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Tareas</Text>
                  <Text style={styles.desktopAsideMetricValue}>{tareaCount}</Text>
                </View>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Etapas</Text>
                  <Text style={styles.desktopAsideMetricValue}>{stageCount}</Text>
                </View>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Próximos 3 días</Text>
                  <Text style={styles.desktopAsideMetricValue}>{urgentCount}</Text>
                </View>
              </View>

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Próximos movimientos</Text>
                <View style={styles.desktopUpcomingList}>
                  {nextEvents.length > 0 ? nextEvents.map((event) => (
                    <View key={event.id} style={styles.desktopUpcomingItem}>
                      <View style={[styles.desktopUpcomingDot, { backgroundColor: event.color }]} />
                      <View style={styles.desktopUpcomingCopy}>
                        <Text style={styles.desktopUpcomingTitle} numberOfLines={1}>{event.titulo}</Text>
                        <Text style={styles.desktopUpcomingMeta} numberOfLines={1}>
                          {new Date(event.fechaInicio).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          {" · "}
                          {event.proceso?.radicado ?? (event.source === "manual" ? "Evento manual" : "Agenda vinculada")}
                        </Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.desktopAsideBodyText}>
                      No hay movimientos próximos registrados.
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Acciones</Text>
                <Pressable
                  style={styles.desktopAsideAction}
                  onPress={() => {
                    setSelectedEvent(null);
                    setModalInitDate(new Date());
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.desktopAsideActionText}>Nuevo evento manual</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <EventModal
          visible={modalVisible}
          event={selectedEvent}
          initialDate={modalInitDate}
          onSave={handleSave}
          onDelete={selectedEvent ? handleDelete : undefined}
          onClose={() => {
            setModalVisible(false);
            setSelectedEvent(null);
          }}
        />

        <EditarTareaModal
          visible={tareaModal !== null}
          tarea={tareaModal}
          onClose={() => setTareaModal(null)}
          onUpdated={() => {
            loadEvents(currentYear, currentMonth);
            setTareaModal(null);
          }}
          onDeleted={() => {
            loadEvents(currentYear, currentMonth);
            setTareaModal(null);
          }}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={22} color={Colors.white} />
        <Text style={styles.headerTitle}>Calendario</Text>
        <View style={styles.headerRight}>
          {loading && <ActivityIndicator size="small" color={Colors.white} />}
          {!loading && urgentCount > 0 && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={12} color="#FEF3C7" />
              <Text style={styles.urgentBadgeText}>{urgentCount} urgente{urgentCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.mobileHero}>
        <View style={styles.mobileHeroTop}>
          <View style={styles.mobileHeroCopy}>
            <Text style={styles.mobileHeroEyebrow}>Agenda de seguimiento</Text>
            <Text style={styles.mobileHeroTitle}>Lo importante de esta semana</Text>
            <Text style={styles.mobileHeroText}>{weekFocus}</Text>
          </View>
          <Pressable style={styles.mobileHeroAction} onPress={() => handleAddPress(new Date())}>
            <Ionicons name="add" size={16} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.mobileHeroStats}>
          <View style={styles.mobileHeroStat}>
            <Text style={styles.mobileHeroValue}>{todayCount}</Text>
            <Text style={styles.mobileHeroLabel}>Hoy</Text>
          </View>
          <View style={styles.mobileHeroStat}>
            <Text style={styles.mobileHeroValue}>{urgentCount}</Text>
            <Text style={styles.mobileHeroLabel}>Próximos</Text>
          </View>
          <View style={styles.mobileHeroStat}>
            <Text style={styles.mobileHeroValue}>{events.length}</Text>
            <Text style={styles.mobileHeroLabel}>Mes</Text>
          </View>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <CalendarView
          events={events}
          onEventPress={handleEventPress}
          onAddPress={handleAddPress}
          onMonthChange={handleMonthChange}
        />
      </View>

      {/* Event Modal — eventos manuales */}
      <EventModal
        visible={modalVisible}
        event={selectedEvent}
        initialDate={modalInitDate}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
        onClose={() => {
          setModalVisible(false);
          setSelectedEvent(null);
        }}
      />

      {/* Tarea Modal */}
      <EditarTareaModal
        visible={tareaModal !== null}
        tarea={tareaModal}
        onClose={() => setTareaModal(null)}
        onUpdated={() => {
          loadEvents(currentYear, currentMonth);
          setTareaModal(null);
        }}
        onDeleted={() => {
          loadEvents(currentYear, currentMonth);
          setTareaModal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  desktopScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  desktopShell: {
    width: "100%",
    alignSelf: "center",
  },
  desktopHero: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: Colors.primaryLight + "12",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "28",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 22,
  },
  desktopHeroCopy: {
    flex: 1,
    gap: 8,
    maxWidth: 720,
  },
  desktopEyebrow: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  desktopHeroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  desktopHeroText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  desktopHeroInsight: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  desktopHeroInsightText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  desktopHeroStats: {
    flexDirection: "row",
    gap: 12,
  },
  desktopHeroStat: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  desktopHeroValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  desktopHeroLabel: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  desktopBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  desktopMainColumn: {
    flex: 1,
    minWidth: 0,
  },
  desktopAside: {
    width: 320,
    gap: 16,
  },
  desktopAsideCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  desktopAsideLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  desktopAsideTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  desktopAsideMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  desktopAsideMetricName: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  desktopAsideMetricValue: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  desktopAsideAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  desktopAsideActionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  desktopUpcomingList: {
    gap: 12,
  },
  desktopUpcomingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  desktopUpcomingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  desktopUpcomingCopy: {
    flex: 1,
    gap: 2,
  },
  desktopUpcomingTitle: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  desktopUpcomingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  headerRight: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  urgentBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FEF3C7",
  },
  mobileHero: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight + "12",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "24",
    gap: 14,
  },
  mobileHeroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  mobileHeroCopy: {
    flex: 1,
    gap: 3,
  },
  mobileHeroEyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: Colors.textTertiary,
    fontFamily: "Inter_700Bold",
  },
  mobileHeroTitle: {
    fontSize: 20,
    lineHeight: 25,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  mobileHeroText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  mobileHeroAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  mobileHeroStats: {
    flexDirection: "row",
    gap: 10,
  },
  mobileHeroStat: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  mobileHeroValue: {
    fontSize: 20,
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
  },
  mobileHeroLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
