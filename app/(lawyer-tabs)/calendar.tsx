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
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/services/calendarService";
import type {
  CalendarEventDTO,
  CreateCalendarEventDTO,
  UpdateCalendarEventDTO,
} from "@/shared/schema";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();

  const [events,        setEvents]        = useState<CalendarEventDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentYear,   setCurrentYear]   = useState(new Date().getFullYear());
  const [currentMonth,  setCurrentMonth]  = useState(new Date().getMonth());

  // Modal state
  const [modalVisible,   setModalVisible]   = useState(false);
  const [selectedEvent,  setSelectedEvent]  = useState<CalendarEventDTO | null>(null);
  const [modalInitDate,  setModalInitDate]  = useState<Date | undefined>(undefined);

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

  const handleEventPress = (event: CalendarEventDTO) => {
    if (event.source === "tarea" || event.source === "etapa") {
      // Navegar al proceso
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={22} color={Colors.white} />
        <Text style={styles.headerTitle}>Calendario</Text>
        {loading && <ActivityIndicator size="small" color={Colors.white} style={{ marginLeft: "auto" }} />}
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

      {/* Event Modal */}
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
    fontWeight: "700",
    color: Colors.white,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
