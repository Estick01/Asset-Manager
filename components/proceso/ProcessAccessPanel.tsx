// components/proceso/ProcessAccessPanel.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { toast } from "sonner-native";
import {
  getOwnershipHistory, getSharingList,
  shareProcess, revokeSharing,
} from "@/lib/services/ownershipService";
import type { ProcesoOwnershipDTO, ProcesoSharingDTO, CreateSharingDTO } from "@/shared/schema";

interface Props {
  procesoId:     string;
  isOwner:       boolean;
  bufeteId?:     string;
  bufeteNombre?: string;
}

export function ProcessAccessPanel({ procesoId, isOwner, bufeteId, bufeteNombre }: Props) {
  const [ownership, setOwnership] = useState<ProcesoOwnershipDTO[]>([]);
  const [sharing,   setSharing]   = useState<ProcesoSharingDTO[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    load();
  }, [procesoId]);

  async function load() {
    setLoading(true);
    try {
      const [ownershipData, sharingData] = await Promise.all([
        getOwnershipHistory(procesoId),
        getSharingList(procesoId),
      ]);
      setOwnership(ownershipData);
      setSharing(sharingData);
    } catch {
      toast.error("Error al cargar información de acceso");
    } finally {
      setLoading(false);
    }
  }

  async function handleShareToBufete() {
    if (!bufeteId) return;
    try {
      const dto: CreateSharingDTO = { sharedWithType: "bufete", sharedWithId: bufeteId, permission: "editar" };
      await shareProcess(procesoId, dto);
      toast.success("Proceso compartido con el bufete");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleRevoke(shareId: string) {
    Alert.alert("Revocar acceso", "¿Seguro que quieres revocar este acceso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Revocar", style: "destructive",
        onPress: async () => {
          try {
            await revokeSharing(procesoId, shareId);
            toast.success("Acceso revocado");
            load();
          } catch (e: any) { toast.error(e.message); }
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  const currentOwner = ownership.find(o => o.activo);

  return (
    <View style={styles.container}>
      {/* Ownership section */}
      <Text style={styles.sectionTitle}>Propietario actual</Text>
      {currentOwner ? (
        <View style={styles.card}>
          <Text style={styles.label}>Tipo: <Text style={styles.value}>{currentOwner.ownerType}</Text></Text>
          {currentOwner.razon && <Text style={styles.label}>Razón: <Text style={styles.value}>{currentOwner.razon}</Text></Text>}
        </View>
      ) : (
        <Text style={styles.empty}>Sin propietario registrado</Text>
      )}

      {/* Sharing section */}
      <View style={styles.row}>
        <Text style={styles.sectionTitle}>Accesos compartidos</Text>
        {isOwner && bufeteId && (
          <Pressable style={styles.addBtn} onPress={handleShareToBufete}>
            <Text style={styles.addBtnText}>+ Compartir con bufete</Text>
          </Pressable>
        )}
      </View>
      {sharing.length === 0 ? (
        <Text style={styles.empty}>Sin accesos compartidos</Text>
      ) : (
        sharing.map(s => (
          <View key={s.id} style={styles.shareCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{s.sharedWithType} — <Text style={styles.value}>{s.permission}</Text></Text>
              {s.razon && <Text style={styles.meta}>{s.razon}</Text>}
            </View>
            {isOwner && (
              <Pressable onPress={() => handleRevoke(s.id)}>
                <Text style={styles.revokeText}>Revocar</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      {/* History section */}
      {ownership.length > 1 && (
        <>
          <Text style={styles.sectionTitle}>Historial de ownership</Text>
          {ownership.filter(o => !o.activo).map(o => (
            <View key={o.id} style={styles.historyCard}>
              <Text style={styles.meta}>{o.ownerType} — {new Date(o.fechaInicio).toLocaleDateString()} → {o.fechaFin ? new Date(o.fechaFin).toLocaleDateString() : "activo"}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 16 },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginTop: 16, marginBottom: 8 },
  card:         { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  shareCard:    { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center" },
  historyCard:  { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10, marginBottom: 6 },
  label:        { fontSize: 13, color: "#6B7280" },
  value:        { color: "#1F2937", fontWeight: "600" },
  meta:         { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  empty:        { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginBottom: 8 },
  row:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addBtn:       { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText:   { fontSize: 12, fontWeight: "600", color: "#3B82F6" },
  revokeText:   { fontSize: 12, color: "#EF4444", fontWeight: "600" },
});
