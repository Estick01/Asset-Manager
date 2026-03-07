import React from "react";
import { View, Text, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { ProcesoDTO } from "@/shared/schema";

interface HeaderActionsProps {
  proceso: ProcesoDTO | null;
  rol: string | undefined;
  onDelete: () => void;
  onGoBack: () => void;
}

export default function HeaderActions({ proceso, rol, onDelete, onGoBack }: HeaderActionsProps) {
  const insets = useSafeAreaInsets();

  const canEdit = rol === "abogado" || rol === "bufete";
  const canDelete = rol === "abogado" || rol === "bufete";

  return (
    <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
      <Pressable onPress={onGoBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </Pressable>

      <Text style={styles.headerTitle}>Proceso</Text>

      <View style={styles.headerActions}>
        {canEdit && (
          <Pressable
            onPress={() => router.push({ pathname: "/case/edit/[id]", params: { id: proceso?.id! } })}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </Pressable>
        )}

        {canDelete && (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});