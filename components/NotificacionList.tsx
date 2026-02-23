import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { type Notificacion } from "@/lib/storage";

interface NotificacionListProps {
  notificaciones: Notificacion[];
  onMarkAsRead: (notificacionId: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  emptyMessage?: string;
  isCliente?: boolean;
}

export function NotificacionList({
  notificaciones,
  onMarkAsRead,
  onRefresh,
  isRefreshing = false,
  emptyMessage = "No hay notificaciones",
  isCliente = false,
}: NotificacionListProps) {
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "estado_cambio":
        return "swap-horizontal";
      case "actualizacion":
        return "document-text";
      case "recordatorio":
        return "alarm";
      default:
        return "notifications";
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "estado_cambio":
        return Colors.primary;
      case "actualizacion":
        return "#22C55E";
      case "recordatorio":
        return "#F59E0B";
      default:
        return Colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString("es-CO");
  };

  const handlePress = async (notificacion: Notificacion) => {
    // Navigate to the proceso
    router.push(`/case/${notificacion.procesoId}`);
    
    // Mark as read if not already
    const isRead = isCliente ? notificacion.leidoCliente : notificacion.leidoAbogado;
    if (!isRead) {
      await onMarkAsRead(notificacion.id);
    }
  };

  const renderItem = ({ item }: { item: Notificacion }) => {
    const isRead = isCliente ? item.leidoCliente : item.leidoAbogado;
    const tipoColor = getTipoColor(item.tipo);

    return (
      <Pressable
        style={[styles.notificationItem, !isRead && styles.unreadItem]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: tipoColor + "20" }]}>
          <Ionicons name={getTipoIcon(item.tipo) as any} size={24} color={tipoColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, !isRead && styles.unreadText]} numberOfLines={1}>
              {item.titulo}
            </Text>
            {!isRead && <View style={styles.unreadBadge} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.mensaje}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </Pressable>
    );
  };

  return (
    <FlatList
      data={notificaciones}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={notificaciones.length === 0 && styles.emptyContainer}
      ListEmptyComponent={
        <View style={styles.emptyContent}>
          <Ionicons name="notifications-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  unreadItem: {
    backgroundColor: Colors.primary + "08",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  unreadText: {
    fontFamily: "Inter_700Bold",
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
