import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { CalendarView } from "@/components/calendar/CalendarView";
import { EventModal } from "@/components/calendar/EventModal";
import { EditarTareaModal } from "@/components/tareas/EditarTareaModal";
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
