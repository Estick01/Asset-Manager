// app/lawyer-invitations.tsx
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Modal, Platform
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import Colors from "@/constants/colors";
import { StyledModal } from "@/components/StyledModal";
import { useInvitations } from "@/lib/invitations-context";
import { FirmInvitation, FirmInvitationWithDetails } from "@/lib/services/firmInvitationService";
import { acceptInvitation, getLawyerInvitations, rejectInvitation } from "@/lib/services/firmInvitationService";
import { ProcessDecisionWizard } from "@/components/proceso/ProcessDecisionWizard";

export default function LawyerInvitationsScreen() {
  const insets = useSafeAreaInsets();
  const [invitations, setInvitations] = useState<FirmInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [acceptModal, setAcceptModal] = useState<FirmInvitationWithDetails | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<{
    procesos: { id: string; radicado: string }[];
    bufeteId: string;
    bufeteNombre: string;
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; invitationId: string | null }>({
    visible: false,
    invitationId: null,
  });
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const { refreshCount } = useInvitations();

  const loadData = async () => {
    setLoading(true);
    const result = await getLawyerInvitations();
    if (result.data) setInvitations(result.data);
    if (result.error) toast.error(result.error);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

   const handleAccept = async () => {
     if (!acceptModal) return;
     setSubmitting(acceptModal.id);
     const result = await acceptInvitation(acceptModal.id);
     await refreshCount();
     if (result.error) {
       toast.error(result.error);
     } else if (!result.data) {
       toast.error("Error inesperado");
     } else {
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       toast.success(`¡Te uniste a ${acceptModal.firm?.name || "la firma"}!`);
       loadData();
       const firmaId = result.data.firmaId ?? acceptModal.firm?.id;
       if (!firmaId) {
         toast.error("Error: falta información de la firma");
       } else if (result.data.requiresProcessDecision && (result.data.procesos?.length ?? 0) > 0) {
         setWizardData({
           procesos: result.data.procesos!,
           bufeteId: firmaId,
           bufeteNombre: result.data.firmaNombre ?? acceptModal.firm?.name ?? "",
         });
         setShowWizard(true);
       }
     }
     setSubmitting(null);
     setAcceptModal(null);
   };

  const handleReject = (invitationId: string) => {
    setRejectModal({ visible: true, invitationId });
    setMotivoRechazo("");
  };

  const confirmReject = async () => {
    if (!rejectModal.invitationId) return;
    setSubmitting(rejectModal.invitationId);
    setRejectModal({ visible: false, invitationId: null });
    const result = await rejectInvitation(rejectModal.invitationId, motivoRechazo || undefined);
    if (result.error) {
      toast.error(result.error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Invitación rechazada");
      loadData();
    }
    setSubmitting(null);
    setMotivoRechazo("");
  };

  const pendingCount = invitations.filter((i: any) => {
    const exp = i.expiresAt ? new Date(i.expiresAt) : null;
    return !exp || exp >= new Date();
  }).length;

  const renderInvitation = ({ item }: { item: FirmInvitationWithDetails }) => {
    const isSubmitting = submitting === item.id;
    const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    return (
      <View style={[styles.card, isExpired && styles.cardExpired]}>
        {/* Barra lateral */}
        <View style={[styles.cardAccent, { backgroundColor: isExpired ? Colors.textTertiary : Colors.primary }]} />

        <View style={styles.cardBody}>
          {/* Firma header */}
          <View style={styles.firmHeader}>
            <View style={[styles.firmAvatar, { backgroundColor: isExpired ? Colors.textTertiary + "20" : Colors.primary + "15" }]}>
              <Ionicons name="business" size={22} color={isExpired ? Colors.textTertiary : Colors.primary} />
            </View>
            <View style={styles.firmInfo}>
              <Text style={styles.firmNombre}>{item.firm?.name || "Firma"}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.invitadoPor}>
                  {item.invitadoPorUser?.name || item.invitadoPorUser?.email}
                </Text>
              </View>
            </View>
            {isExpired ? (
              <View style={styles.expiredBadge}>
                <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                <Text style={styles.expiredText}>Expirada</Text>
              </View>
            ) : (
              <View style={styles.pendienteBadge}>
                <View style={styles.pendienteDot} />
                <Text style={styles.pendienteText}>Pendiente</Text>
              </View>
            )}
          </View>

          {/* Mensaje de la firma */}
          {item.mensaje && (
            <View style={styles.mensajeBox}>
              <Ionicons name="chatbubble-outline" size={13} color={Colors.primary} />
              <Text style={styles.mensaje}>{`"${item.mensaje}"`}</Text>
            </View>
          )}

          {/* Fechas */}
          <View style={styles.fechasRow}>
            <View style={styles.fechaItem}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
              <Text style={styles.fecha}>
                {new Date(item.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </Text>
            </View>
            {expiresAt && !isExpired && (
              <View style={styles.fechaItem}>
                <Ionicons name="alarm-outline" size={12} color={Colors.warning} />
                <Text style={styles.expira}>
                  Expira {expiresAt.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                </Text>
              </View>
            )}
          </View>

          {/* Acciones */}
          {!isExpired && (
            <View style={styles.actions}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => handleReject(item.id)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setAcceptModal(item)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                    <Text style={styles.acceptBtnText}>Aceptar</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Invitaciones</Text>
            <Text style={styles.headerSubtitle}>
              {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}` : "Sin pendientes"}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Resumen */}
        {invitations.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{invitations.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.warning }]}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pendientes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "rgba(255,255,255,0.6)" }]}>
                {invitations.length - pendingCount}
              </Text>
              <Text style={styles.summaryLabel}>Expiradas</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="mail-outline" size={38} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin invitaciones</Text>
          <Text style={styles.emptySubtext}>Aquí aparecerán las invitaciones de firmas de abogados</Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={item => item.id}
          renderItem={renderInvitation}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onRefresh={loadData}
          refreshing={loading}
        />
      )}

      {/* Modal de aceptación */}
      <StyledModal
        visible={acceptModal !== null}
        onClose={() => setAcceptModal(null)}
        title="Aceptar Invitación"
        confirmText="Unirme a la firma"
        cancelText="Cancelar"
        onConfirm={handleAccept}
      >
        <View style={styles.acceptModalContent}>
          <View style={styles.acceptModalAvatar}>
            <Ionicons name="business" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.acceptModalFirma}>{acceptModal?.firm?.name}</Text>
          <Text style={styles.acceptModalSub}>
            Al aceptar pasarás a formar parte de esta firma
          </Text>
          {acceptModal?.mensaje && (
            <View style={styles.mensajeBox}>
              <Ionicons name="chatbubble-outline" size={13} color={Colors.primary} />
              <Text style={styles.mensaje}>{`"${acceptModal.mensaje}"`}</Text>
            </View>
          )}
          <View style={styles.acceptWarning}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.warning} />
            <Text style={styles.acceptWarningText}>
              Solo puedes pertenecer a una firma a la vez
            </Text>
          </View>
        </View>
      </StyledModal>

      {/* ProcessDecisionWizard — aparece tras aceptar invitación si el abogado tiene procesos propios */}
      {wizardData && (
        <ProcessDecisionWizard
          visible={showWizard}
          bufeteId={wizardData.bufeteId}
          bufeteNombre={wizardData.bufeteNombre}
          procesos={wizardData.procesos}
          onClose={() => setShowWizard(false)}
          onCompleted={() => setShowWizard(false)}
        />
      )}

      {/* Modal de rechazo */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal({ visible: false, invitationId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContent}>
            {/* Icono */}
            <View style={styles.rejectModalIcon}>
              <Ionicons name="close-circle-outline" size={36} color={Colors.danger} />
            </View>

            <Text style={styles.rejectModalTitle}>Rechazar Invitación</Text>
            <Text style={styles.rejectModalSubtitle}>
              Puedes dejar un motivo para que la firma lo sepa (opcional)
            </Text>

            <TextInput
              style={styles.motivoInput}
              placeholder="Ej: No estoy buscando firma actualmente..."
              placeholderTextColor={Colors.textTertiary}
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal({ visible: false, invitationId: null })}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalRejectBtn} onPress={confirmReject}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
                <Text style={styles.modalRejectText}>Rechazar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.white },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // Summary
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpired: { opacity: 0.55 },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },

  // Firm header
  firmHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  firmAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  firmInfo: { flex: 1 },
  firmNombre: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  invitadoPor: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  // Badges
  expiredBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.textTertiary + "15",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  expiredText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textTertiary },
  pendienteBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pendienteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  pendienteText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.warning },

  // Mensaje
  mensajeBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    backgroundColor: Colors.primary + "08",
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: Colors.primary + "40",
  },
  mensaje: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, fontStyle: "italic" },

  // Fechas
  fechasRow: { flexDirection: "row", gap: 16 },
  fechaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  fecha: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  expira: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.warning },

  // Actions
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.danger + "60",
    backgroundColor: Colors.danger + "08",
  },
  rejectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },

  // Empty state
  emptyIconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", lineHeight: 20 },

  // Accept modal
  acceptModalContent: { alignItems: "center", gap: 8, paddingVertical: 8 },
  acceptModalAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: Colors.primary + "25",
    marginBottom: 4,
  },
  acceptModalFirma: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  acceptModalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },
  acceptWarning: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: Colors.warning + "10",
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
    width: "100%", marginTop: 4,
  },
  acceptWarningText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.warning },

  // Reject modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  rejectModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20, padding: 24,
    width: "100%", gap: 12, alignItems: "center",
  },
  rejectModalIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: Colors.danger + "10",
    alignItems: "center", justifyContent: "center",
  },
  rejectModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  rejectModalSubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center", lineHeight: 20,
  },
  motivoInput: {
    width: "100%",
    borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: 12, padding: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.text, minHeight: 90,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight, alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  modalRejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  modalRejectText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
