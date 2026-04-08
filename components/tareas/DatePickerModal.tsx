import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  onClose: () => void;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getDaysInMonth(year: number, month: number): number {
  if (month === 1) { // February
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  }
  return DAYS_IN_MONTH[month];
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 = Sunday, 1 = Monday, etc.
  const date = new Date(year, month, 1);
  return date.getDay();
}

export function DatePickerModal({ visible, value, onChange, onClose }: Props) {
  const today = new Date();
  const initialYear = value ? parseInt(value.split("-")[0]) : today.getFullYear();
  const initialMonth = value ? parseInt(value.split("-")[1]) - 1 : today.getMonth();
  const initialDay = value ? parseInt(value.split("-")[2]) : today.getDate();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);

  React.useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      setYear(y);
      setMonth(m - 1);
      setDay(d);
    }
  }, [value, visible]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  // Add empty slots for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  function handleDayPress(d: number) {
    const newDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(newDate);
    onClose();
  }

  function goToPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isToday = selectedDateStr === todayStr;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Seleccionar fecha</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable onPress={goToPrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={24} color="#1B5A8C" />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
            <Pressable onPress={goToNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color="#1B5A8C" />
            </Pressable>
          </View>

          {/* Day names */}
          <View style={styles.dayNames}>
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((name) => (
              <Text key={name} style={styles.dayName}>{name}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {days.map((d, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  d === null && styles.emptyCell,
                  d === day && styles.selectedDay,
                  d === day && !isToday && styles.selectedDayBlue,
                  d === today.getDate() && month === today.getMonth() && year === today.getFullYear() && d !== day && styles.todayCell,
                ]}
                onPress={() => d && handleDayPress(d)}
                disabled={d === null}
              >
                <Text
                  style={[
                    styles.dayText,
                    d === null && styles.emptyText,
                    d === day && styles.selectedDayText,
                    d === today.getDate() && month === today.getMonth() && year === today.getFullYear() && d !== day && styles.todayText,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Clear button */}
          <View style={styles.footer}>
            <Pressable style={styles.clearBtn} onPress={() => { onChange(""); onClose(); }}>
              <Text style={styles.clearBtnText}>Limpiar</Text>
            </Pressable>
            <Pressable style={styles.todayBtn} onPress={() => {
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
              onChange(todayStr);
              onClose();
            }}>
              <Text style={styles.todayBtnText}>Hoy</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  navBtn: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  dayNames: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    paddingVertical: 6,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  emptyCell: {
    opacity: 0,
  },
  selectedDay: {
    backgroundColor: "#1B5A8C",
  },
  selectedDayBlue: {
    backgroundColor: "#1B5A8C",
  },
  todayCell: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#1B5A8C",
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#374151",
  },
  emptyText: {
    fontSize: 14,
    color: "transparent",
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  todayText: {
    color: "#1B5A8C",
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  todayBtn: {
    backgroundColor: "#1B5A8C",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
