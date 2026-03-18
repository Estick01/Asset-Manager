import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

import { getDashboardStats } from '@/lib/services/adminService';
import { getProcesos } from '@/lib/services/procesoService';
import { type ProcesoDTO } from '@/shared/schema';
import { AbogadoUser, useAuth } from "@/lib/auth-context";
import { useInvitations } from "@/lib/invitations-context";
import { useNotifications } from "@/lib/notifications-context";



export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalClientes: 0, totalProcesos: 0, procesosActivos: 0, procesosFinalizados: 0, totalTareas: 0, tareasPendientes: 0, tareasEnProgreso: 0, tareasCompletadas: 0 });
  const [recentCases, setRecentCases] = useState<ProcesoDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { pendingCount, refreshCount } = useInvitations();
  const { unreadCount: unreadNotifCount } = useNotifications();

  const loadData = async () => {
    const [s, procesos] = await Promise.all([
      getDashboardStats(),
      getProcesos(5, 0),
    ]);

    setStats(s);
    setRecentCases(procesos.data);
  };


  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  const statCards = [
    { label: "Clientes", value: stats.totalClientes, icon: "people" as const, color: Colors.primary },
    { label: "Procesos", value: stats.totalProcesos, icon: "document-text" as const, color: Colors.info },
    { label: "Activos", value: stats.procesosActivos, icon: "pulse" as const, color: Colors.success },
    { label: "Finalizados", value: stats.procesosFinalizados, icon: "checkmark-circle" as const, color: Colors.accent },
    { label: "Tareas Pendientes", value: stats.tareasPendientes, icon: "time" as const, color: Colors.warning },
    { label: "Tareas En Progreso", value: stats.tareasEnProgreso, icon: "reload" as const, color: Colors.info },
    { label: "Tareas Completadas", value: stats.tareasCompletadas, icon: "checkmark-done" as const, color: Colors.success },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={[styles.headerGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Bienvenido</Text>
              <Text style={styles.userName}>
                {user?.profile && 'firstName' in user.profile
                  ? `${user.profile.firstName || ''} ${('lastName' in user.profile ? user.profile.lastName : '')}`.trim()
                  : user?.user?.name || 'Abogado'}
              </Text>
              <Text style={styles.despacho}>
                {user?.profile && 'specialization' in user.profile ? user.profile.specialization : ''}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIconBtn}
                onPress={() => router.push("/lawyer-componts/lawyer-notifications")}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => router.push("/profile/lawyer")} style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            {statCards.map((card) => (
              <View key={card.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: card.color + "15" }]}>
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.quickActions}>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]} onPress={() => router.push("/client/new")}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + "15" }]}>
                <Ionicons name="person-add" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>Nuevo Cliente</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]} onPress={() => router.push("/case/new")}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + "15" }]}>
                <Ionicons name="add-circle" size={20} color={Colors.success} />
              </View>
              <Text style={styles.actionText}>Nuevo Proceso</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnInvitation, pressed && styles.actionBtnPressed]}
              onPress={() => router.push("/lawyer-componts/lawyer-invitations")}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + "15" }]}>
                <Ionicons name="mail" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.actionText}>Invitaciones</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{pendingCount}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Procesos Recientes</Text>

          </View>

          {recentCases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin procesos</Text>
              <Text style={styles.emptySubtitle}>Crea tu primer proceso para comenzar</Text>
            </View>
          ) : (
            recentCases.map((caso, index) => {
              const estadoColor = caso.estado?.color ?? Colors.textTertiary;
              const ubicacion = [
                caso.clienteMunicipio?.nombre,
                caso.clienteDepartamento?.nombre,
              ].filter(Boolean).join(", ");

              return (
                <Pressable
                  key={caso.id}
                  style={({ pressed }) => [styles.caseCard, pressed && styles.caseCardPressed]}
                  onPress={() => router.push({ pathname: "/case/[id]", params: { id: caso.id } })}
                >
                  {/* Acento lateral de color */}
                  <View style={[styles.caseAccent, { backgroundColor: estadoColor }]} />

                  <View style={styles.caseCardInner}>
                    {/* Header: radicado + tipo + badge estado */}
                    <View style={styles.caseCardHeader}>
                      <View style={styles.caseInfo}>
                        <Text style={styles.caseRadicado} numberOfLines={1}>{caso.radicado}</Text>
                        {caso.tipoProceso?.nombre && (
                          <Text style={styles.caseTipo} numberOfLines={1}>{caso.tipoProceso.nombre}</Text>
                        )}
                      </View>
                      <View style={[styles.estadoBadge, { backgroundColor: estadoColor + "1A" }]}>
                        <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
                        <Text style={[styles.estadoText, { color: estadoColor }]}>
                          {caso.estado?.nombre ?? "—"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.caseDivider} />

                    {/* Footer: cliente, juzgado, responsable */}
                    <View style={styles.caseCardFooter}>
                      <View style={styles.clienteRow}>
                        <View style={[styles.caseIconWrap, { backgroundColor: Colors.primary + "15" }]}>
                          <Ionicons
                            name={caso.tipoCliente === "empresa" ? "business-outline" : "person-outline"}
                            size={11}
                            color={Colors.primary}
                          />
                        </View>
                        <Text style={styles.clienteText} numberOfLines={1}>
                          {caso.clienteNombre || "Sin cliente"}
                          {caso.tipoCliente
                            ? <Text style={styles.clienteTextMuted}> · {caso.tipoCliente}</Text>
                            : null}
                        </Text>
                      </View>

                      <View style={styles.clienteRow}>
                        <View style={[styles.caseIconWrap, { backgroundColor: Colors.warning + "15" }]}>
                          <Ionicons name="document-text-outline" size={11} color={Colors.warning} />
                        </View>
                        <Text style={styles.clienteText} numberOfLines={1}>
                          {caso.juzgado || "—"}
                        </Text>
                      </View>

                      <View style={styles.clienteRow}>
                        <View style={[styles.caseIconWrap, {
                          backgroundColor: (caso.responsable ? Colors.success : Colors.danger) + "15"
                        }]}>
                          <Ionicons
                            name="person-circle-outline"
                            size={11}
                            color={caso.responsable ? Colors.success : Colors.danger}
                          />
                        </View>
                        <Text style={[
                          styles.clienteText,
                          !caso.responsable && { color: Colors.danger }
                        ]} numberOfLines={1}>
                          {caso.responsable
                            ? `${caso.responsable.lawyer?.persona?.nombre} ${caso.responsable.lawyer?.persona?.apellido}`
                            : "Sin responsable"}
                        </Text>
                      </View>
                    </View>

                    {/* Info extra: solo persona natural */}
                    {caso.tipoCliente === "natural" && (
                      <View style={styles.caseExtraRow}>
                        {caso.clienteDocumento && (
                          <View style={styles.caseExtraItem}>
                            <Ionicons name="card-outline" size={11} color={Colors.textTertiary} />
                            <Text style={styles.caseExtraText}>CC {caso.clienteDocumento}</Text>
                          </View>
                        )}
                        {caso.clienteTelefono && (
                          <View style={styles.caseExtraItem}>
                            <Ionicons name="call-outline" size={11} color={Colors.textTertiary} />
                            <Text style={styles.caseExtraText}>{caso.clienteTelefono}</Text>
                          </View>
                        )}
                        {ubicacion.length > 0 && (
                          <View style={styles.caseExtraItem}>
                            <Ionicons name="location-outline" size={11} color={Colors.textTertiary} />
                            <Text style={styles.caseExtraText}>{ubicacion}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Representante legal: solo empresa */}
                    {caso.representanteLegal && (
                      <View style={styles.caseRepBox}>
                        <Text style={styles.caseRepLabel}>Rep. legal</Text>
                        <View style={styles.caseRepRow}>
                          <View style={styles.caseExtraItem}>
                            <Ionicons name="person-outline" size={11} color={Colors.textTertiary} />
                            <Text style={styles.caseExtraText}>
                              {caso.representanteLegal.nombre} {caso.representanteLegal.apellido}
                              {caso.representanteLegal.cargo
                                ? <Text style={styles.clienteTextMuted}> · {caso.representanteLegal.cargo}</Text>
                                : null}
                            </Text>
                          </View>
                          {caso.representanteLegal.email && (
                            <View style={styles.caseExtraItem}>
                              <Ionicons name="mail-outline" size={11} color={Colors.textTertiary} />
                              <Text style={styles.caseExtraText} numberOfLines={1}>
                                {caso.representanteLegal.email}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Tareas */}
                    {caso.tareasConteo && caso.tareasConteo.total > 0 && (
                      <View style={styles.caseTareasRow}>
                        <Ionicons name="checkmark-circle-outline" size={11} color={Colors.textTertiary} />
                        <Text style={styles.caseTareasTotal}>{caso.tareasConteo.total} tareas</Text>
                        {caso.tareasConteo.pendientes > 0 && (
                          <View style={[styles.caseTareasPill, { backgroundColor: Colors.warning + "20" }]}>
                            <Text style={[styles.caseTareasPillTxt, { color: Colors.warning }]}>
                              {caso.tareasConteo.pendientes} pend.
                            </Text>
                          </View>
                        )}
                        {caso.tareasConteo.en_progreso > 0 && (
                          <View style={[styles.caseTareasPill, { backgroundColor: Colors.info + "20" }]}>
                            <Text style={[styles.caseTareasPillTxt, { color: Colors.info }]}>
                              {caso.tareasConteo.en_progreso} prog.
                            </Text>
                          </View>
                        )}
                        {caso.tareasConteo.completadas > 0 && (
                          <View style={[styles.caseTareasPill, { backgroundColor: Colors.success + "20" }]}>
                            <Text style={[styles.caseTareasPillTxt, { color: Colors.success }]}>
                              {caso.tareasConteo.completadas} listas
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Fecha */}
                    <Text style={styles.caseFecha}>
                      Creado: {new Date(caso.fechaCreacion).toLocaleDateString("es-CO", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary}
                    style={{ flexShrink: 0, marginRight: 4 }} />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  userName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
    marginTop: 2,
  },
  despacho: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  notifBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    minHeight: 56,
    minWidth: "47%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },

  actionBtnInvitation: {
    borderWidth: 1.5,
    borderColor: Colors.warning + "40",
  },
  actionBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  caseCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: Colors.white,
  borderRadius: 16,
  marginBottom: 12,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
},
caseCardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
caseAccent:      { width: 4, alignSelf: "stretch", flexShrink: 0 },
caseCardInner:   { flex: 1, padding: 14 },
caseCardHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 10,
},
caseInfo:        { flex: 1, marginRight: 10 },
caseRadicado:    { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
caseTipo:        { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
estadoBadge: {
  flexDirection: "row", alignItems: "center", gap: 6,
  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0,
},
estadoDot:  { width: 6, height: 6, borderRadius: 3 },
estadoText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
caseDivider:{ height: 1, backgroundColor: "#F0F2F4", marginBottom: 10 },
caseCardFooter: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
clienteRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
caseIconWrap: {
  width: 20, height: 20, borderRadius: 6,
  alignItems: "center", justifyContent: "center",
},
clienteText:     { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flexShrink: 1 },
clienteTextMuted:{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
caseExtraRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
caseExtraItem:   { flexDirection: "row", alignItems: "center", gap: 4 },
caseExtraText:   { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
caseRepBox:      { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
caseRepLabel: {
  fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary,
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5,
},
caseRepRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
caseTareasRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
caseTareasTotal: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginLeft: 2 },
caseTareasPill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
caseTareasPillTxt:{ fontSize: 11, fontFamily: "Inter_600SemiBold" },
caseFecha:       { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 8 },
});
