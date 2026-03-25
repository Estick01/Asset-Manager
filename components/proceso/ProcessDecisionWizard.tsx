// components/proceso/ProcessDecisionWizard.tsx
import React, { useState } from "react";
import {
  Modal, View, Text, Pressable, ScrollView,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { toast } from "sonner-native";
import { submitBatchDecisions, type BatchDecision } from "@/lib/services/ownershipService";

type Action = "privado" | "compartir" | "transferir";
type Permission = "ver" | "comentar" | "editar";

interface DecisionRow {
  procesoId:  string;
  titulo:     string;
  action:     Action;
  permission: Permission;
}

interface Props {
  visible:      boolean;
  bufeteId:     string;
  bufeteNombre: string;
  procesos:     { id: string; radicado: string }[];
  onClose:      () => void;
  onCompleted:  () => void;
}

export function ProcessDecisionWizard({ visible, bufeteId, bufeteNombre, procesos, onClose, onCompleted }: Props) {
  const [decisions, setDecisions] = useState<DecisionRow[]>(
    procesos.map(p => ({ procesoId: p.id, titulo: p.radicado, action: "privado", permission: "ver" })),
  );
  const [loading, setLoading] = useState(false);

  const setAction = (procesoId: string, action: Action) => {
    setDecisions(prev => prev.map(d => d.procesoId === procesoId ? { ...d, action } : d));
  };

  const setPermission = (procesoId: string, permission: Permission) => {
    setDecisions(prev => prev.map(d => d.procesoId === procesoId ? { ...d, permission } : d));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const batch: BatchDecision[] = decisions.map(d => ({
        procesoId:  d.procesoId,
        action:     d.action,
        permission: d.action === "compartir" ? d.permission : undefined,
      }));
      await submitBatchDecisions(bufeteId, batch);
      toast.success("Decisiones guardadas");
      onCompleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus procesos y el bufete</Text>
          <Text style={styles.subtitle}>
            Ahora perteneces a {bufeteNombre}. ¿Qué hacemos con tus {procesos.length} proceso(s)?
          </Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }}>
          {decisions.map(d => (
            <View key={d.procesoId} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{d.titulo}</Text>
              <View style={styles.options}>
                {(["privado", "compartir", "transferir"] as Action[]).map(a => (
                  <Pressable
                    key={a}
                    style={[styles.option, d.action === a && styles.optionSelected]}
                    onPress={() => setAction(d.procesoId, a)}
                  >
                    <Text style={[styles.optionText, d.action === a && styles.optionTextSelected]}>
                      {a === "privado" ? "Privado" : a === "compartir" ? "Compartir" : "Transferir"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {d.action === "compartir" && (
                <View style={styles.permRow}>
                  <Text style={styles.permLabel}>Permiso:</Text>
                  {(["ver", "comentar", "editar"] as Permission[]).map(p => (
                    <Pressable
                      key={p}
                      style={[styles.permChip, d.permission === p && styles.permChipSelected]}
                      onPress={() => setPermission(d.procesoId, p)}
                    >
                      <Text style={[styles.permText, d.permission === p && styles.permTextSelected]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>Decidir después</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={handleConfirm} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Confirmar</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#F9FAFB" },
  header:           { padding: 20, paddingTop: 40, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  title:            { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle:         { fontSize: 14, color: "#6B7280" },
  list:             { flex: 1 },
  card:             { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 14, gap: 10 },
  cardTitle:        { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  options:          { flexDirection: "row", gap: 8 },
  option:           { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center" },
  optionSelected:   { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  optionText:       { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  optionTextSelected: { color: "#3B82F6" },
  permRow:          { flexDirection: "row", alignItems: "center", gap: 6 },
  permLabel:        { fontSize: 12, color: "#6B7280" },
  permChip:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#D1D5DB" },
  permChipSelected: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  permText:         { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  permTextSelected: { color: "#3B82F6" },
  footer:           { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#fff" },
  btnSecondary:     { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center" },
  btnSecondaryText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  btnPrimary:       { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#3B82F6", alignItems: "center" },
  btnPrimaryText:   { fontSize: 14, fontWeight: "600", color: "#fff" },
});
