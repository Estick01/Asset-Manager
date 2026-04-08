// app/(admin-tabs)/usuarios/[id].tsx
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";
import { StyledModal } from "@/components/StyledModal";
import {
  adminUsersService,
  type UserAdminDetail,
  type SuscripcionResumen,
} from "@/lib/services/adminService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActiva = estado === "activa";
  return (
    <View style={[
      styles.badge,
      isActiva ? styles.badgeActivo : styles.badgeOtro,
    ]}>
      <Text style={[
        styles.badgeText,
        isActiva ? styles.badgeTextoActivo : styles.badgeTextoOtro,
      ]}>
        {estado}
      </Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function UsuarioDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();

  // Modals
  const [modalEstado,     setModalEstado]     = useState(false);
  const [modalPlan,       setModalPlan]       = useState(false);
  const [modalReset,      setModalReset]      = useState(false);
  const [resetToken,      setResetToken]      = useState<string | null>(null);
  const [errorEstado,  setErrorEstado]  = useState<string | null>(null);
  const [errorPlan,    setErrorPlan]    = useState<string | null>(null);
  const [errorReset,   setErrorReset]   = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user", id],
    queryFn:  () => adminUsersService.getById(id),
    enabled:  !!id,
  });

  const user: UserAdminDetail | undefined = data?.data;

  // Mutaciones
  const mutEstado = useMutation({
    mutationFn: (activo: boolean) => adminUsersService.updateEstado(id, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user",  id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalEstado(false);
      setErrorEstado(null);
    },
    onError: () => setErrorEstado("Error al cambiar el estado del usuario."),
  });

  useMutation({
    mutationFn: (planId: string) => adminUsersService.updatePlan(id, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user",  id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalPlan(false);
      setErrorPlan(null);
    },
    onError: () => setErrorPlan("Error al cambiar el plan."),
  });

  const mutReset = useMutation({
    mutationFn: () => adminUsersService.resetPassword(id),
    onSuccess: (result) => {
      setResetToken(result.token);
      setModalReset(false);
      setErrorReset(null);
    },
    onError: () => setErrorReset("Error al generar el token de reset."),
  });

  if (isLoading) {
    return (
      <AdminShell title="Usuario">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </AdminShell>
    );
  }

  if (isError || !user) {
    return (
      <AdminShell title="Usuario">
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>Error al cargar el usuario.</Text>
        </View>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={user.name ?? user.email} scrollable={false}>
      {/* Botón volver */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      >
        <Ionicons name="arrow-back-outline" size={16} color="#2563EB" />
        <Text style={styles.backBtnText}>Volver a Usuarios</Text>
      </Pressable>

      <View style={styles.layout}>
        {/* ── Columna izquierda: Datos ── */}
        <ScrollView style={styles.leftCol} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Datos del usuario</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="person-outline"   label="Nombre"  value={user.name ?? "—"} />
            <InfoRow icon="mail-outline"     label="Email"   value={user.email} />
            <InfoRow
              icon="shield-checkmark-outline"
              label="Correo"
              value={user.emailVerified ? "Verificado" : "Pendiente"}
              valueColor={user.emailVerified ? "#16A34A" : "#D97706"}
            />
            <InfoRow icon="shield-outline"   label="Rol"     value={user.rol.nombre} />
            {user.firma && (
              <InfoRow icon="business-outline" label="Firma" value={user.firma.nombre} />
            )}
            <InfoRow
              icon="calendar-outline"
              label="Registro"
              value={formatDate(user.createdAt)}
            />
            <InfoRow
              icon="ellipse-outline"
              label="Estado"
              value={user.isActive ? "Activo" : "Suspendido"}
              valueColor={user.isActive ? "#16A34A" : "#DC2626"}
            />
          </View>

          {user.lawyerVerification && (
            <>
              <Text style={styles.sectionTitle}>Verificación profesional</Text>
              <View style={styles.infoCard}>
                <InfoRow icon="card-outline" label="Tarjeta" value={user.lawyerVerification.licenseNumber ?? "—"} />
                <InfoRow icon="ribbon-outline" label="Estado" value={user.lawyerVerification.status} />
                <InfoRow icon="document-text-outline" label="Notas" value={user.lawyerVerification.reviewNotes ?? "—"} />
              </View>
            </>
          )}

          {/* Suscripción activa */}
          <Text style={styles.sectionTitle}>Suscripción activa</Text>
          {user.suscripcionActiva ? (
            <View style={styles.infoCard}>
              <InfoRow icon="layers-outline" label="Plan"  value={user.suscripcionActiva.planNombre} />
              <InfoRow icon="repeat-outline" label="Ciclo" value={user.suscripcionActiva.ciclo} />
              <InfoRow
                icon="calendar-outline"
                label="Vence"
                value={formatDate(user.suscripcionActiva.fechaFin)}
              />
            </View>
          ) : (
            <Text style={styles.emptyText}>Sin suscripción activa.</Text>
          )}

          {/* Historial de suscripciones */}
          {user.historialSuscripciones.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Historial de suscripciones</Text>
              {user.historialSuscripciones.map((s: SuscripcionResumen) => (
                <View key={s.id} style={styles.historialRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historialPlan}>{s.planNombre}</Text>
                    <Text style={styles.historialFecha}>
                      {formatDate(s.fechaInicio)} → {formatDate(s.fechaFin)}
                    </Text>
                  </View>
                  <EstadoBadge estado={s.estado} />
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* ── Columna derecha: Acciones ── */}
        <View style={styles.rightCol}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          {/* Reset token generado */}
          {resetToken && (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Token de reset (válido 1 hora):</Text>
              <Text style={styles.tokenValue} selectable>{resetToken}</Text>
              <Pressable onPress={() => setResetToken(null)} style={styles.tokenClose}>
                <Ionicons name="close-outline" size={16} color="#64748B" />
              </Pressable>
            </View>
          )}

          <ActionButton
            icon={user.isActive ? "ban-outline" : "checkmark-circle-outline"}
            label={user.isActive ? "Suspender usuario" : "Activar usuario"}
            color={user.isActive ? "#DC2626" : "#16A34A"}
            onPress={() => setModalEstado(true)}
          />
          {errorEstado && (
            <Text style={styles.inlineError}>{errorEstado}</Text>
          )}
          <ActionButton
            icon="layers-outline"
            label="Cambiar plan"
            color="#2563EB"
            onPress={() => setModalPlan(true)}
            disabled={!user.suscripcionActiva}
          />
          {errorPlan && (
            <Text style={styles.inlineError}>{errorPlan}</Text>
          )}
          <ActionButton
            icon="key-outline"
            label="Generar reset de contraseña"
            color="#9333EA"
            onPress={() => setModalReset(true)}
          />
          {errorReset && (
            <Text style={styles.inlineError}>{errorReset}</Text>
          )}
        </View>
      </View>

      {/* Modal: cambiar estado */}
      <StyledModal
        visible={modalEstado}
        onClose={() => setModalEstado(false)}
        title={user.isActive ? "Suspender usuario" : "Activar usuario"}
        confirmText={user.isActive ? "Suspender" : "Activar"}
        confirmVariant={user.isActive ? "danger" : "primary"}
        onConfirm={() => { if (!mutEstado.isPending) mutEstado.mutate(!user.isActive); }}
      >
        <Text style={styles.modalBody}>
          {user.isActive
            ? `¿Confirmas suspender a ${user.name ?? user.email}? No podrá ingresar al sistema.`
            : `¿Confirmas reactivar a ${user.name ?? user.email}?`}
        </Text>
      </StyledModal>

      {/* Modal: cambiar plan */}
      <StyledModal
        visible={modalPlan}
        onClose={() => setModalPlan(false)}
        title="Cambiar plan"
        confirmText="Confirmar"
        confirmVariant="primary"
        onConfirm={() => {
          // TODO Fase 3: conectar con selector de planes dinámico.
          // Por ahora el modal informa que esta función se completa en Fase 3.
        }}
        hideConfirm
      >
        <Text style={styles.modalBody}>
          El selector de planes se habilitará en la Fase 3 (módulo de Planes).
        </Text>
      </StyledModal>

      {/* Modal: reset password */}
      <StyledModal
        visible={modalReset}
        onClose={() => setModalReset(false)}
        title="Generar reset de contraseña"
        confirmText="Generar token"
        confirmVariant="primary"
        onConfirm={() => { if (!mutReset.isPending) mutReset.mutate(); }}
      >
        <Text style={styles.modalBody}>
          Se generará un token de reset válido por 1 hora para{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>
            {user.name ?? user.email}
          </Text>
          . El token se mostrará aquí para que puedas compartirlo con el usuario.
        </Text>
      </StyledModal>
    </AdminShell>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#94A3B8" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
  disabled = false,
}: {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  color:    string;
  onPress:  () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: color + "40" },
        pressed  && styles.actionBtnPressed,
        disabled && styles.actionBtnDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? "#CBD5E1" : color}
      />
      <Text style={[
        styles.actionBtnText,
        { color: disabled ? "#CBD5E1" : color },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 16,
    padding: 4,
  },
  backBtnPressed: { opacity: 0.7 },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
  },
  leftCol: {
    flex: 2,
  },
  rightCol: {
    width: 260,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1E293B",
  },
  historialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 6,
  },
  historialPlan: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1E293B",
  },
  historialFecha: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeActivo: { backgroundColor: "#DCFCE7" },
  badgeOtro:   { backgroundColor: "#F1F5F9" },
  badgeText:   { fontSize: 12, fontFamily: "Inter_500Medium" },
  badgeTextoActivo: { color: "#16A34A" },
  badgeTextoOtro:   { color: "#64748B" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    marginBottom: 8,
  },
  tokenBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: "relative",
  },
  tokenLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#16A34A",
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#166534",
    wordBreak: "break-all" as any,
  },
  tokenClose: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  actionBtnPressed: { opacity: 0.8 },
  actionBtnDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    lineHeight: 22,
  },
  inlineError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    marginTop: -4,
    marginBottom: 4,
  },
});
