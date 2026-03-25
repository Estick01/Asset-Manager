import React from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { ProcesoDTO, Actualizacion } from "@/shared/schema";
import { ActualizacionRelations } from "@/shared/schema/actualizaciones.schema";

function getTipoConfig(tipoNombre: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (tipoNombre) {
    case "documento": return { icon: "document-text", color: Colors.accent };
    case "nota":      return { icon: "create-outline",  color: Colors.info };
    case "llamada":   return { icon: "call-outline",     color: Colors.success };
    default:          return { icon: "ellipse",          color: Colors.primary };
  }
}

interface TimelineSectionProps {
  proceso: ProcesoDTO | null;
  rol: string | undefined;
  actualizaciones: ActualizacionRelations[];
  actualizacionesLoading: boolean;
  onDelete: (act: Actualizacion) => void;
}

export default function TimelineSection({
  proceso,
  rol,
  actualizaciones,
  actualizacionesLoading,
  onDelete,
}: TimelineSectionProps) {
  if (!proceso) return null;

  const canAdd = rol === "abogado" || rol === "bufete";
  const canDelete = rol === "abogado" || rol === "bufete";
  const canDownload = rol === "abogado" || rol === "bufete" || rol === "cliente";

  const handleDeleteUpdate = (act: Actualizacion) => {
    Alert.alert("Eliminar Actualizacion", "Estas seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          onDelete(act);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Actualizaciones</Text>
        {canAdd && (
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push({ pathname: "/update/new", params: { procesoId: proceso.id } })}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Agregar</Text>
          </Pressable>
        )}
      </View>

      {actualizaciones.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={36} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Sin actualizaciones</Text>
          {canAdd && (
            <Text style={styles.emptySubtext}>Agrega la primera actualizacion</Text>
          )}
        </View>
      ) : (
        <View>
          {actualizaciones.map((act, idx) => (
            <Pressable
              key={act.id}
              onLongPress={() => canDelete && handleDeleteUpdate(act)}
              style={styles.timelineItem}
            >
              <View style={styles.timelineLine}>
                <View style={[
                  styles.timelineDot,
                  idx === 0 && styles.timelineDotActive,
                  act.tipo.nombre === "documento" && styles.timelineDotDocument,
                ]}>
                  <Ionicons
                    name={getTipoConfig(act.tipo.nombre).icon}
                    size={9}
                    color={Colors.white}
                  />
                </View>
                {idx < actualizaciones.length - 1 && (
                  <View style={styles.timelineConnector} />
                )}
              </View>

              <View style={[
                styles.timelineCard,
                idx === 0 && styles.timelineCardActive,
              ]}>
                <View style={styles.timelineCardHeader}>
                  <Text style={styles.timelineDate}>
                    {new Date(act.fecha).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>

                  {act.tipo.nombre === "documento" && (
                    <View style={styles.docBadge}>
                      <Ionicons name="attach" size={12} color={Colors.accent} />
                      <Text style={styles.docBadgeText}>Documento</Text>
                      {canDownload && act.documentoId && (
                        <Pressable
                          onPress={() => router.push({ pathname: "/documento/[id]", params: { id: act.documentoId! } })}
                          hitSlop={4}
                          style={styles.docDownloadBadge}
                        >
                          <Ionicons name="download-outline" size={12} color={Colors.accent} />
                        </Pressable>
                      )}
                    </View>
                  )}

                  {canDelete && (
                    <Pressable onPress={() => handleDeleteUpdate(act)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={14} color={Colors.textTertiary} />
                    </Pressable>
                  )}
                </View>

                <Text style={styles.timelineTitle}>{act.titulo}</Text>
                {!!act.descripcion && (
                  <Text style={styles.timelineDesc}>{act.descripcion}</Text>
                )}
              </View>
            </Pressable>
          ))}

          {actualizacionesLoading && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: "center",
  },
  timelineItem: { flexDirection: "row" },
  timelineLine: { width: 28, alignItems: "center" },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  timelineDotDocument: {
    backgroundColor: Colors.accent,
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.borderLight,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginLeft: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timelineCardActive: {
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    flex: 1,
  },
  docBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  docBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  docDownloadBadge: { marginLeft: 4, padding: 2 },
  timelineTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 4,
  },
  timelineDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
});