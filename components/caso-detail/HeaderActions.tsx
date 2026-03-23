import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { ProcesoDTO } from "@/shared/schema";
import { Tooltip } from "@/components/Tooltip";

const WHITE = "#FFFFFF";

interface HeaderActionsProps {
  proceso: ProcesoDTO | null;
  rol: string | undefined;
  onDelete: () => void;
  onGoBack: () => void;
}

export default function HeaderActions({ proceso, rol, onDelete, onGoBack }: HeaderActionsProps) {
  const insets = useSafeAreaInsets();

  const canEdit   = rol === "abogado" || rol === "bufete";
  const canDelete = rol === "abogado" || rol === "bufete";
  const hasActions = canEdit || canDelete;

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary]}
      style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) }]}
    >
      {/* Back */}
      <Pressable
        onPress={onGoBack}
        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color={WHITE} />
      </Pressable>

      {/* Title + radicado */}
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Proceso</Text>
        {!!proceso?.radicado && (
          <Text style={styles.headerSub} numberOfLines={1}>{proceso.radicado}</Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.headerActions}>
        {canEdit && (
          <Tooltip label="Editar proceso">
            <Pressable
              onPress={() => router.push({ pathname: "/case/edit/[id]", params: { id: proceso?.id! } })}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={20} color={WHITE} />
            </Pressable>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip label="Eliminar proceso">
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.iconBtn, styles.iconBtnDanger, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color={WHITE} />
            </Pressable>
          </Tooltip>
        )}
        {/* Placeholder to balance layout when no actions */}
        {!hasActions && <View style={styles.iconBtn} />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: {
    backgroundColor: "rgba(220,53,69,0.25)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: WHITE,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
