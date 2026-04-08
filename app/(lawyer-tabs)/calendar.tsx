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
                Visualiza audiencias, tareas, etapas y eventos manuales en una composición más clara para pantalla grande.
              </Text>
            </View>
            <View style={styles.desktopHeroStats}>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{events.length}</Text>
                <Text style={styles.desktopHeroLabel}>eventos</Text>
              </View>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{urgentCount}</Text>
                <Text style={styles.desktopHeroLabel}>urgentes</Text>
              </View>
              <View style={styles.desktopHeroStat}>
                <Text style={styles.desktopHeroValue}>{tareaCount}</Text>
                <Text style={styles.desktopHeroLabel}>tareas</Text>
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
                <Text style={styles.desktopAsideLabel}>Resumen</Text>
                <Text style={styles.desktopAsideTitle}>Distribución del mes</Text>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Eventos manuales</Text>
                  <Text style={styles.desktopAsideMetricValue}>{manualCount}</Text>
                </View>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Tareas</Text>
                  <Text style={styles.desktopAsideMetricValue}>{tareaCount}</Text>
                </View>
                <View style={styles.desktopAsideMetricRow}>
                  <Text style={styles.desktopAsideMetricName}>Urgentes</Text>
                  <Text style={styles.desktopAsideMetricValue}>{urgentCount}</Text>
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
  calendarContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
