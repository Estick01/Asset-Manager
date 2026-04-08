// components/proceso/ProcessAccessPanel.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getOwnershipHistory } from "@/lib/services/ownershipService";
import type { ProcesoOwnershipDTO } from "@/shared/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function ownerLabel(ownerType: string): string {
  if (ownerType === "bufete")    return "Bufete";
  if (ownerType === "abogado")   return "Abogado";
  if (ownerType === "sin_owner") return "Sin propietario";
  return ownerType;
}

function ownerIcon(ownerType: string): keyof typeof Ionicons.glyphMap {
  if (ownerType === "bufete")  return "business";
  if (ownerType === "abogado") return "person";
  return "help-circle-outline";
}

function ownerColor(ownerType: string): string {
  if (ownerType === "bufete")  return Colors.info;
  if (ownerType === "abogado") return Colors.warning;
  return Colors.textTertiary;
}

function ownerBg(ownerType: string): string {
  if (ownerType === "bufete")  return Colors.infoLight;
  if (ownerType === "abogado") return Colors.warningLight;
  return Colors.surfaceSecondary;
}

// ─── Componente actual owner ──────────────────────────────────────────────────

function CurrentOwnerCard({ entry }: { entry: ProcesoOwnershipDTO }) {
  const color = ownerColor(entry.ownerType);
  const bg    = ownerBg(entry.ownerType);
  const icon  = ownerIcon(entry.ownerType);

  return (
    <View style={[currentStyles.card, { borderColor: color + "40" }]}>
      <View style={[currentStyles.stripe, { backgroundColor: color }]} />

      <View style={currentStyles.body}>
        <View style={currentStyles.row}>
          <View style={[currentStyles.iconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>

          <View style={currentStyles.info}>
            <View style={currentStyles.labelRow}>
              <Text style={currentStyles.ownerType}>{ownerLabel(entry.ownerType)}</Text>
              <View style={[currentStyles.activeBadge, { backgroundColor: Colors.successLight }]}>
                <View style={[currentStyles.activeDot, { backgroundColor: Colors.success }]} />
                <Text style={[currentStyles.activeBadgeText, { color: Colors.success }]}>Activo</Text>
              </View>
            </View>

            <Text style={currentStyles.since}>
              Desde {formatDate(entry.fechaInicio)}
            </Text>

            {!!entry.razon && (
              <Text style={currentStyles.razon}>&quot;{entry.razon}&quot;</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const currentStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stripe: { width: 4 },
  body:   { flex: 1, padding: 16 },
  row:    { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  info:     { flex: 1, gap: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ownerType: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text,
  },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  activeDot:      { width: 6, height: 6, borderRadius: 3 },
  activeBadgeText:{ fontSize: 11, fontFamily: "Inter_600SemiBold" },
  since: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
  },
  razon: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, fontStyle: "italic", marginTop: 2,
  },
});

// ─── Fila de historial ────────────────────────────────────────────────────────

function HistoryRow({
  entry,
  isLast,
}: {
  entry:  ProcesoOwnershipDTO;
  isLast: boolean;
}) {
  const color = ownerColor(entry.ownerType);
  const bg    = ownerBg(entry.ownerType);
  const icon  = ownerIcon(entry.ownerType);

  return (
    <View style={histStyles.wrapper}>
      {/* Línea de tiempo */}
      <View style={histStyles.timelineCol}>
        <View style={[histStyles.dot, { backgroundColor: color }]} />
        {!isLast && <View style={histStyles.line} />}
      </View>

      {/* Contenido */}
      <View style={[histStyles.card, isLast && { marginBottom: 0 }]}>
        <View style={histStyles.cardRow}>
          <View style={[histStyles.iconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={histStyles.ownerType}>{ownerLabel(entry.ownerType)}</Text>
            <Text style={histStyles.dates}>
              {formatDate(entry.fechaInicio)}
              {" → "}
              {entry.fechaFin ? formatDate(entry.fechaFin) : "activo"}
            </Text>
            {!!entry.razon && (
              <Text style={histStyles.razon}>&quot;{entry.razon}&quot;</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const histStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    gap: 12,
  },
  timelineCol: {
    alignItems: "center",
    width: 16,
    paddingTop: 14,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
  },
  line: {
    flex: 1, width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  ownerType: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text,
  },
  dates: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, marginTop: 2,
  },
  razon: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, fontStyle: "italic", marginTop: 3,
  },
});

// ─── Panel principal ──────────────────────────────────────────────────────────

interface Props {
  procesoId: string;
  isOwner:   boolean;
  // Mantenemos la firma para no romper el uso en case/[id].tsx
  bufeteId?:     string;
  bufeteNombre?: string;
}

export function ProcessAccessPanel({ procesoId }: Props) {
  const [history, setHistory] = useState<ProcesoOwnershipDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getOwnershipHistory(procesoId)
      .then(setHistory)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [procesoId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
        <Text style={styles.errorText}>No se pudo cargar el historial de propiedad.</Text>
      </View>
    );
  }

  const current  = history.find(h => h.activo);
  const previous = history.filter(h => !h.activo);

  return (
    <View style={styles.container}>
      {/* ── Propietario actual ── */}
      <Text style={styles.sectionLabel}>PROPIETARIO ACTUAL</Text>

      {current ? (
        <CurrentOwnerCard entry={current} />
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="help-circle-outline" size={20} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Sin propietario registrado</Text>
        </View>
      )}

      {/* ── Historial ── */}
      {previous.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>HISTORIAL DE TRANSFERENCIAS</Text>
          <View style={styles.historyList}>
            {previous.map((entry, i) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                isLast={i === previous.length - 1}
              />
            ))}
          </View>
        </>
      )}

      {previous.length === 0 && current && (
        <View style={styles.noHistoryRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.noHistoryText}>
            Este proceso no ha tenido transferencias de propiedad.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingTop: 4,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 2,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.danger,
    textAlign: "center",
  },

  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },

  historyList: {
    gap: 0,
  },

  noHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noHistoryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    flex: 1,
  },
});
