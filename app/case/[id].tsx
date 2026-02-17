import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getProceso, getCliente, getActualizaciones, deleteProceso, deleteActualizacion, type Proceso, type Cliente, type Actualizacion } from "@/lib/storage";

const ESTADO_COLORS: Record<string, string> = {
  activo: Colors.success,
  en_tramite: Colors.warning,
  finalizado: Colors.info,
  archivado: Colors.textTertiary,
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  en_tramite: "En Tramite",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;
    const p = await getProceso(id);
    setProceso(p);
    if (p) {
      const c = await getCliente(p.clienteId);
      setCliente(c);
      const acts = await getActualizaciones(p.id);
      setActualizaciones(acts);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDelete = () => {
    if (!proceso) return;
    Alert.alert("Eliminar Proceso", "Estas seguro de eliminar este proceso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteProceso(proceso.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const handleDeleteUpdate = (act: Actualizacion) => {
    Alert.alert("Eliminar Actualizacion", "Estas seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteActualizacion(act.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  if (!proceso) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const statusColor = ESTADO_COLORS[proceso.estadoActual] || Colors.textTertiary;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Proceso</Text>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topCardInfo}>
              <Text style={styles.radicado}>{proceso.radicado}</Text>
              <Text style={styles.tipoProceso}>{proceso.tipoProceso}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: statusColor + "15" }]}>
              <View style={[styles.estadoDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.estadoText, { color: statusColor }]}>{ESTADO_LABELS[proceso.estadoActual]}</Text>
            </View>
          </View>
          {!!proceso.descripcionEstado && <Text style={styles.descripcion}>{proceso.descripcionEstado}</Text>}
        </View>

        <View style={styles.infoCard}>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{cliente?.nombre || "Desconocido"}</Text>
            </View>
            {cliente && (
              <Pressable onPress={() => router.push({ pathname: "/client/[id]", params: { id: cliente.id } })}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Juzgado</Text>
              <Text style={styles.infoValue}>{proceso.juzgado}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha de creacion</Text>
              <Text style={styles.infoValue}>{new Date(proceso.fechaCreacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linea de Tiempo</Text>
          <Pressable
            style={styles.addUpdateBtn}
            onPress={() => router.push({ pathname: "/update/new", params: { procesoId: proceso.id } })}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addUpdateText}>Agregar</Text>
          </Pressable>
        </View>

        {actualizaciones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Sin actualizaciones</Text>
            <Text style={styles.emptySubtext}>Agrega la primera actualizacion</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {actualizaciones.map((act, idx) => (
              <Pressable key={act.id} onLongPress={() => handleDeleteUpdate(act)} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, idx === 0 && styles.timelineDotActive]} />
                  {idx < actualizaciones.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={[styles.timelineCard, idx === 0 && styles.timelineCardActive]}>
                  <Text style={styles.timelineDate}>
                    {new Date(act.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                  </Text>
                  <Text style={styles.timelineTitle}>{act.titulo}</Text>
                  {!!act.descripcion && <Text style={styles.timelineDesc}>{act.descripcion}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  content: { padding: 20, paddingBottom: 40 },
  topCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topCardInfo: { flex: 1, marginRight: 12 },
  radicado: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  tipoProceso: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
  estadoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  descripcion: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 16,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  addUpdateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addUpdateText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.white },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row" },
  timelineLine: { width: 24, alignItems: "center" },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.surfaceSecondary,
    marginTop: 18,
  },
  timelineDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary + "30" },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
  },
  timelineCardActive: {
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  timelineDate: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  timelineTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 4 },
  timelineDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
});
