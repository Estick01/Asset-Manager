import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ProcesoDTO } from "@/shared/schema";

interface LawyersSectionProps {
  proceso: ProcesoDTO | null;
  rol: string | undefined;
  currentLawyerId?: string;
  onAddAsistente?: () => void;
  onTransferirCaso?: () => void;
}

export default function LawyersSection({
  proceso,
  rol,
  currentLawyerId,
  onAddAsistente,
  onTransferirCaso,
}: LawyersSectionProps) {
  const hasLawyers = proceso?.lawyers && proceso.lawyers.length > 0;
  const hasResponsable = !!proceso?.responsable;

  if (!hasLawyers && !hasResponsable) return null;

  const canSeeRazonAsignacion = rol === "abogado" || rol === "bufete";
  const canSeeTipoAsignacion = rol === "abogado" || rol === "bufete";
  const canSeeAsignadoPor = rol === "bufete" || rol === "abogado";
  const canSeeFechaFin = rol === "abogado" || rol === "bufete";
  const canNavigateLawyer = rol === "bufete";

  // Solo bufete puede asignar/cambiar responsable
  const canSetResponsable = rol === "bufete";

  // Solo bufete puede transferir el caso
  const canTransferirCaso = rol === "bufete";

  const lawyers = rol === "cliente"
    ? (proceso?.lawyers ?? []).filter(l => l.rol === "principal")
    : (proceso?.lawyers ?? []);

  const responsable = proceso?.responsable;

  return (
    <View style={styles.container}>
      {/* ── Sección Responsable ── */}
      {(canSetResponsable || hasResponsable) && (
        <View style={styles.responsableSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Responsable del Proceso</Text>
            </View>
            {canSetResponsable && (
              <Pressable style={styles.actionBtn} onPress={onAddAsistente}>
                <Ionicons name="person-add-outline" size={14} color={Colors.primary} />
                <Text style={styles.actionBtnText}>
                  {hasResponsable ? "Cambiar" : "Asignar"}
                </Text>
              </Pressable>
            )}
          </View>

          {responsable ? (
            <View style={styles.responsableCard}>
              <View style={styles.responsableAvatar}>
                <Text style={styles.avatarText}>
                  {responsable.lawyer?.persona?.nombre?.charAt(0).toUpperCase() || "R"}
                </Text>
              </View>
              <View style={styles.lawyerInfo}>
                <Text style={styles.lawyerNombre}>
                  {responsable.lawyer?.persona?.nombre && responsable.lawyer?.persona?.apellido
                    ? `${responsable.lawyer.persona.nombre} ${responsable.lawyer.persona.apellido}`
                    : responsable.lawyer?.persona?.nombre ?? ""}
                </Text>
                {responsable.lawyer?.specialization && (
                  <Text style={styles.responsableSpec}>{responsable.lawyer.specialization}</Text>
                )}
                {proceso?.responsable?.fechaAsignacion && (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.detailLabel}>Asignado:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(proceso.responsable.fechaAsignacion).toLocaleDateString("es-CO", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </Text>
                  </View>
                )}
                {proceso?.responsable?.asignadoPorNombre && (
                  <View style={styles.detailRow}>
                    <Ionicons name="person-add-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.detailLabel}>Por:</Text>
                    <Text style={styles.detailValue}>{proceso.responsable.asignadoPorNombre}</Text>
                  </View>
                )}
                {proceso?.responsable?.razon && (
                  <View style={styles.detailRow}>
                    <Ionicons name="information-circle-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.detailLabel}>Razón:</Text>
                    <Text style={styles.detailValue}>{proceso.responsable.razon}</Text>
                  </View>
                )}
              </View>
              {canNavigateLawyer && (
                <Pressable
                  onPress={() => router.push({ pathname: "/profile/lawyer", params: { id: responsable.id } })}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.emptyResponsable}>
              <Ionicons name="person-outline" size={18} color={Colors.textTertiary} />
              <Text style={styles.emptyResponsableText}>Sin responsable asignado</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Sección Abogados Asignados ── */}
      {hasLawyers && (
        <View style={[styles.lawyersSection, (canSetResponsable || hasResponsable) && styles.lawyersSectionBorder]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {rol === "cliente" ? "Tu Abogado" : "Abogados Asignados"}
            </Text>
            {canTransferirCaso && (
              <Pressable style={[styles.actionBtn, styles.actionBtnWarning]} onPress={onTransferirCaso}>
                <Ionicons name="swap-horizontal-outline" size={14} color={Colors.warning} />
                <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Transferir</Text>
              </Pressable>
            )}
          </View>

          {lawyers.map((l, idx) => (
            <View
              key={l.id}
              style={[
                styles.lawyerCard,
                idx < lawyers.length - 1 && styles.lawyerCardBorder,
              ]}
            >
              <View style={styles.lawyerHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {l.lawyer?.persona?.nombre?.charAt(0).toUpperCase() || "A"}
                  </Text>
                </View>
                <View style={styles.lawyerInfo}>
                  <Text style={styles.lawyerNombre}>
                    {l.lawyer?.persona?.nombre
                      ? `${l.lawyer.persona.nombre} ${l.lawyer.persona.apellido}`
                      : l.asignadoPorUser?.name
                    }
                  </Text>
                  <View style={styles.rolBadge}>
                    <Text style={styles.rolText}>{l.rol}</Text>
                  </View>
                </View>
                {canNavigateLawyer && (
                  <Pressable
                    onPress={() => router.push({ pathname: "/profile/lawyer", params: { id: l.lawyerId } })}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                  </Pressable>
                )}
              </View>

              {canSeeTipoAsignacion && l.tipoAsignacion && (
                <View style={styles.detailRow}>
                  <Ionicons name="git-branch-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Tipo:</Text>
                  <Text style={styles.detailValue}>{l.tipoAsignacion.nombre}</Text>
                </View>
              )}

              {canSeeRazonAsignacion && l.razonAsignacion && (
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Razon:</Text>
                  <Text style={styles.detailValue}>{l.razonAsignacion}</Text>
                </View>
              )}

              {canSeeAsignadoPor && l.asignadoPorUser && (
                <View style={styles.detailRow}>
                  <Ionicons name="person-add-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Asignado por:</Text>
                  <Text style={styles.detailValue}>
                    {l.asignadoPorUser.name || l.asignadoPorUser.email}
                  </Text>
                </View>
              )}

              {canSeeFechaFin && l.fechaFin && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.detailLabel}>Fecha fin:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(l.fechaFin).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}

              <View style={[
                styles.statusBadge,
                { backgroundColor: l.status === "activo" ? Colors.success + "15" : Colors.textTertiary + "15" }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: l.status === "activo" ? Colors.success : Colors.textTertiary }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: l.status === "activo" ? Colors.success : Colors.textTertiary }
                ]}>
                  {l.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  responsableSection: {
    marginBottom: 4,
  },
  lawyersSection: {
    marginTop: 4,
  },
  lawyersSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    marginTop: 12,
  },
  responsableCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.primary + "08",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  responsableAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  responsableSpec: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyResponsable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
  },
  emptyResponsableText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  lawyerCard: {
    paddingVertical: 12,
    gap: 8,
  },
  lawyerCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lawyerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  lawyerInfo: { flex: 1 },
  lawyerNombre: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  rolBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  rolText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "capitalize",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnWarning: {
    backgroundColor: Colors.warning + "15",
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});