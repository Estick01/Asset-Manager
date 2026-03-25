// app/firm-components/firm-broadcast.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getAbogadosByFirma } from "@/lib/services/procesoLawyerService";
import { getOrCreateConversation, sendMessageRest } from "@/lib/services/chatService";
import { StyledModal } from "@/components/StyledModal";
import { type FirmProfile } from "@/shared/schema";
import { LawyerProfileRelations } from "@/shared/schema/lawyer-profile.schema";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const NAVY     = "#0F2640";
const NAVY_MID = "#243447";
const WHITE    = "#FFFFFF";
const BG       = "#F4F6F8";
const TEXT     = "#1B2B3B";
const TEXT2    = "#6B7B8D";
const TEXT3    = "#9AAABB";
const TEAL     = "#2196A6";
const GREEN    = "#27AE7A";
const AMBER    = "#F5A623";
const RED_S    = "#E05252";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: AMBER },
  { bg: "#FDEAEA", text: RED_S },
  { bg: "#EEE8FD", text: "#7B5EA7" },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Lawyer {
  id: string;
  userId: string;
  nombre: string;
  specialization: string;
}

type SendMode = "todos" | "seleccion";

type SendResult = { nombre: string; ok: boolean; error?: string };

// ─── Card de abogado seleccionable ───────────────────────────────────────────
function LawyerSelectCard({
  item,
  selected,
  onToggle,
  disabled,
}: {
  item: Lawyer;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const av = avatarColor(item.nombre || "?");
  return (
    <Pressable
      style={({ pressed }) => [
        styles.lawyerCard,
        selected && styles.lawyerCardSelected,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onToggle}
      disabled={disabled}
    >
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>
          {item.nombre?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>

      <View style={styles.lawyerInfo}>
        <Text style={styles.lawyerName} numberOfLines={1}>{item.nombre}</Text>
        {item.specialization ? (
          <Text style={styles.lawyerRole} numberOfLines={1}>{item.specialization}</Text>
        ) : null}
      </View>

      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color={WHITE} />}
      </View>
    </Pressable>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function FirmBroadcastScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<SendMode>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Resultados
  const [resultModal, setResultModal] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });

  const firmId = (user?.profile as FirmProfile)?.id;
  const currentUserId = user?.user?.id;

  // ── Cargar abogados ──────────────────────────────────────────────────────
  const fetchLawyers = useCallback(async () => {
    if (!firmId) { setLoading(false); return; }
    const result = await getAbogadosByFirma(firmId);
    if (result.data) {
      setLawyers(
        result.data
          .filter((l: LawyerProfileRelations) => l.userId !== currentUserId)
          .map((l: LawyerProfileRelations) => ({
            id: l.id,
            userId: l.userId,
            nombre: `${l.persona?.nombre || ""} ${l.persona?.apellido || ""}`.trim(),
            specialization: l.specialization || "Abogado",
          }))
      );
    }
    setLoading(false);
  }, [firmId, currentUserId]);

  useEffect(() => { fetchLawyers(); }, [fetchLawyers]);

  // ── Toggle selección ─────────────────────────────────────────────────────
  const toggleLawyer = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === lawyers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(lawyers.map((l) => l.id)));
    }
  };

  // ── Destinatarios ────────────────────────────────────────────────────────
  const recipients: Lawyer[] =
    mode === "todos" ? lawyers : lawyers.filter((l) => selected.has(l.id));

  const canSend = message.trim().length > 0 && recipients.length > 0 && !sending;

  // ── Enviar ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend) return;
    const text = message.trim();
    setSending(true);
    const sendResults: SendResult[] = [];

    for (const lawyer of recipients) {
      try {
        const conv = await getOrCreateConversation(lawyer.userId, "firm_lawyer");
        await sendMessageRest(conv.id, text);
        sendResults.push({ nombre: lawyer.nombre, ok: true });
      } catch {
        sendResults.push({ nombre: lawyer.nombre, ok: false, error: "No se pudo enviar" });
      }
    }

    setSending(false);
    setMessage("");
    setSelected(new Set());
    setResults(sendResults);
    setResultModal(true);
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const allSelected = selected.size === lawyers.length && lawyers.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Enviar Mensaje</Text>
            <Text style={styles.headerSub}>
              {recipients.length} destinatario{recipients.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {/* Botón enviar en header */}
          <Pressable
            style={({ pressed }) => [
              styles.sendHeaderBtn,
              !canSend && styles.sendHeaderBtnDisabled,
              pressed && canSend && { opacity: 0.8 },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Ionicons name="send" size={18} color={WHITE} />
            )}
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>

          {/* ── Selector de modo ── */}
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeBtn, mode === "todos" && styles.modeBtnActive]}
              onPress={() => setMode("todos")}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={mode === "todos" ? WHITE : TEXT2}
              />
              <Text style={[styles.modeBtnText, mode === "todos" && styles.modeBtnTextActive]}>
                Todos los abogados
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === "seleccion" && styles.modeBtnActive]}
              onPress={() => setMode("seleccion")}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={mode === "seleccion" ? WHITE : TEXT2}
              />
              <Text style={[styles.modeBtnText, mode === "seleccion" && styles.modeBtnTextActive]}>
                Seleccionar
              </Text>
            </Pressable>
          </View>

          {/* ── Lista de abogados (solo en modo selección) ── */}
          {mode === "seleccion" && (
            <View style={styles.lawyerSection}>
              {/* Seleccionar todos */}
              <Pressable style={styles.selectAllRow} onPress={toggleAll}>
                <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
                  {allSelected && <Ionicons name="checkmark" size={14} color={WHITE} />}
                </View>
                <Text style={styles.selectAllText}>
                  {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </Text>
                <Text style={styles.selectAllCount}>
                  {selected.size}/{lawyers.length}
                </Text>
              </Pressable>

              <FlatList
                data={lawyers}
                keyExtractor={(l) => l.id}
                renderItem={({ item }) => (
                  <LawyerSelectCard
                    item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleLawyer(item.id)}
                    disabled={sending}
                  />
                )}
                style={styles.lawyerList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Ionicons name="people-outline" size={28} color={TEXT3} />
                    <Text style={styles.emptyListText}>Sin abogados en el bufete</Text>
                  </View>
                }
              />
            </View>
          )}

          {/* ── Resumen destinatarios (modo todos) ── */}
          {mode === "todos" && (
            <View style={styles.allBadge}>
              <Ionicons name="people" size={18} color={TEAL} />
              <Text style={styles.allBadgeText}>
                Mensaje para <Text style={{ fontFamily: "Inter_700Bold" }}>{lawyers.length}</Text> abogado{lawyers.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {/* ── Área de mensaje ── */}
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Mensaje</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Escribe el mensaje aquí…"
              placeholderTextColor={TEXT3}
              multiline
              value={message}
              onChangeText={setMessage}
              editable={!sending}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{message.length}/2000</Text>
          </View>

          {/* ── Botón enviar ── */}
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              !canSend && styles.sendBtnDisabled,
              pressed && canSend && { opacity: 0.85 },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color={WHITE} />
                <Text style={styles.sendBtnText}>
                  Enviar a {recipients.length} destinatario{recipients.length !== 1 ? "s" : ""}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Modal de resultados ── */}
      <StyledModal
        visible={resultModal}
        onClose={() => setResultModal(false)}
        title="Mensaje enviado"
        hideConfirm
        cancelText="Cerrar"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {results.map((r, i) => (
            <View key={i} style={styles.resultRow}>
              <View style={[
                styles.resultIcon,
                { backgroundColor: r.ok ? "#E8F8F2" : "#FDEAEA" },
              ]}>
                <Ionicons
                  name={r.ok ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={18}
                  color={r.ok ? GREEN : RED_S}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{r.nombre}</Text>
                {!r.ok && (
                  <Text style={styles.resultError}>{r.error}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </StyledModal>

      {/* ── Modal de error ── */}
      <StyledModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, message: "" })}
        title="Error"
        hideConfirm
        cancelText="Cerrar"
      >
        <Text style={{ fontSize: 14, color: TEXT2, fontFamily: "Inter_400Regular", lineHeight: 22 }}>
          {errorModal.message}
        </Text>
      </StyledModal>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  centered: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 8,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", marginTop: 1 },
  sendHeaderBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: TEAL,
    alignItems: "center", justifyContent: "center",
  },
  sendHeaderBtnDisabled: { backgroundColor: "rgba(255,255,255,0.15)" },

  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16,
  },

  // Modo
  modeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: "#E5EAF0",
  },
  modeBtnActive: { backgroundColor: NAVY_MID, borderColor: NAVY_MID },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  modeBtnTextActive: { color: WHITE },

  // Lista abogados
  lawyerSection: { flex: 1, marginBottom: 12 },
  selectAllRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8,
  },
  selectAllText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  selectAllCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },

  lawyerList: { flex: 1 },
  lawyerCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 12, padding: 12,
    marginBottom: 8, gap: 12,
    borderWidth: 1.5, borderColor: "transparent",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  lawyerCardSelected: { borderColor: TEAL, backgroundColor: "#F0FAFB" },

  avatar: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  lawyerInfo: { flex: 1 },
  lawyerName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT },
  lawyerRole: { fontSize: 12, color: TEXT2, fontFamily: "Inter_400Regular", marginTop: 2 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#D0D9E3",
    alignItems: "center", justifyContent: "center",
    backgroundColor: WHITE,
  },
  checkboxSelected: { backgroundColor: TEAL, borderColor: TEAL },

  emptyList: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyListText: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular" },

  // Badge "todos"
  allBadge: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#E8F4FD", borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  allBadgeText: { fontSize: 14, color: TEAL, fontFamily: "Inter_500Medium" },

  // Mensaje
  messageSection: { marginBottom: 16 },
  messageLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT2, marginBottom: 8 },
  messageInput: {
    backgroundColor: WHITE, borderRadius: 12,
    borderWidth: 1, borderColor: "#E5EAF0",
    padding: 14, minHeight: 120,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 11, color: TEXT3, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },

  // Botón enviar
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: TEAL, borderRadius: 14,
    paddingVertical: 16,
  },
  sendBtnDisabled: { backgroundColor: "#B0C4D4" },
  sendBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Resultados
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F4F8",
  },
  resultIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  resultName: { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT },
  resultError: { fontSize: 12, color: RED_S, fontFamily: "Inter_400Regular", marginTop: 2 },
});
