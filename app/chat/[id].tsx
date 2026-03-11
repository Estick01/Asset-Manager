import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useChat } from "@/lib/hooks/useChat";
import { getMessages, markConversationRead, sendMessageRest } from "@/lib/services/chatService";
import { useChatNotifications } from "@/lib/chat-context";
import type { MessageDTO } from "@/shared/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/keys";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY = "#0F2640";
const WHITE = "#FFFFFF";
const BG = "#EEF2F7";
const TEXT = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL = "#2196A6";
const GREEN = "#27AE7A";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: "#F5A623" },
  { bg: "#EEE8FD", text: "#7B5EA7" },
  { bg: "#FDEAEA", text: "#E05252" },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// ─── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, showAvatar }: {
  msg: MessageDTO; isOwn: boolean; showAvatar: boolean;
}) {
  const av = avatarColor(msg.sender.name || "?");
  const initial = (msg.sender.name?.charAt(0) ?? "?").toUpperCase();

  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      {/* Avatar placeholder for alignment */}
      {!isOwn && (
        showAvatar ? (
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
          </View>
        ) : (
          <View style={styles.avatarPlaceholder} />
        )
      )}

      <View style={[
        styles.bubble,
        isOwn ? styles.bubbleOwn : styles.bubbleOther,
        isOwn ? styles.bubbleTailOwn : styles.bubbleTailOther,
      ]}>
        {!isOwn && showAvatar && (
          <Text style={[styles.senderName, { color: av.text }]}>{msg.sender.name}</Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
          {msg.content}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
            {formatTime(msg.createdAt)}
          </Text>
          {isOwn && (
            <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.65)" />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────
function DateSeparator({ date }: { date: Date | string }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateSepLine} />
      <View style={styles.dateSepPill}>
        <Text style={styles.dateSepText}>{formatDateSeparator(date)}</Text>
      </View>
      <View style={styles.dateSepLine} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: conversationId, name, from } = useLocalSearchParams<{ id: string; name: string; from: string }>();

  const { clearConversation } = useChatNotifications();

  const [msgs, setMsgs] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Clear badge count for this conversation when opened
  useEffect(() => {
    if (conversationId) clearConversation(conversationId);
  }, [conversationId, clearConversation]);

  // Load current user
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.USER).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const userId =
            parsed?.user?.id ??
            parsed?.id ??
            null;
          setCurrentUserId(userId);
        }
        catch { }
      }
    });
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    getMessages(conversationId, PAGE_SIZE, 0)
      .then((data) => {
        // API devuelve DESC (más nuevo primero) — inverted lo muestra bien, NO reverse
        setMsgs(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
    markConversationRead(conversationId).catch(() => { });
  }, [conversationId]);

  // Load more — scroll al TOP del FlatList normal = mensajes más antiguos
  const handleLoadMore = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const olderMessages = await getMessages(conversationId, PAGE_SIZE, msgs.length);
      if (olderMessages.length > 0) {
        // DESC: más viejos van al FINAL del array (inverted los muestra arriba)
        // NO reverse — append directo
        setMsgs(prev => [...prev, ...olderMessages]);
        setHasMore(olderMessages.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch { }
    finally { setLoadingMore(false); }
  }, [conversationId, loadingMore, hasMore, msgs.length]);

  const handleNewMessage = useCallback((msg: MessageDTO) => {
    // Prepend newest message to front of DESC array; inverted FlatList shows it at bottom
    setMsgs(prev => [msg, ...prev]);
  }, []);

  const { status, sendMessage, markRead } = useChat({
    conversationId: conversationId ?? "",
    onNewMessage: handleNewMessage,
  });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText("");
    setIsSending(true);
    try {
      if (status === "connected") {
        sendMessage(text);
        markRead();
      } else {
        await sendMessageRest(conversationId, text);
        const updated = await getMessages(conversationId, PAGE_SIZE, 0);
        setMsgs(updated);
      }
    } catch {
      Alert.alert("Error", "No se pudo enviar el mensaje");
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({ item, index }: { item: MessageDTO; index: number }) => {
    const isOwn = item.senderId === currentUserId;
    // Data is DESC (index 0 = newest). msgs[index+1] is older.
    // Show date separator at the oldest message of each day (top of each day group, visual top).
    const olderMsg = msgs[index + 1];
    const newerMsg = msgs[index - 1];
    const showSeparator = !olderMsg || !isSameDay(olderMsg.createdAt, item.createdAt);
    // Show avatar at the bottom of a sender group (newerMsg = visually below = index-1 in DESC).
    const showAvatar =
      !isOwn && (!newerMsg || newerMsg.senderId !== item.senderId ||
        !isSameDay(newerMsg.createdAt, item.createdAt));

    return (
      <>
        {showSeparator && <DateSeparator date={item.createdAt} />}
        <MessageBubble msg={item} isOwn={isOwn} showAvatar={showAvatar} />
      </>
    );
  };

  const isOnline = status === "connected";
  const displayInitial = (name ?? "C").charAt(0).toUpperCase();
  const av = avatarColor(name ?? "Chat");

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace((from as any) ?? "/(firm-tabs)/chat")} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={WHITE} />
        </Pressable>

        <View style={[styles.headerAvatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.headerAvatarText, { color: av.text }]}>{displayInitial}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{name ?? "Chat"}</Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? GREEN : TEXT3 }]} />
            <Text style={styles.headerStatus}>
              {isOnline ? "En línea" : "Conectando..."}
            </Text>
          </View>
        </View>

        <Pressable style={styles.headerAction} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={msgs}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 12 }]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={TEAL} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-outline" size={36} color={TEXT3} />
              </View>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptySub}>Sé el primero en escribir</Text>
            </View>
          }
        />
      )}

      {/* ── Input bar ── */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 12 : 8) }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={TEXT3}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!inputText.trim() || isSending) && styles.sendBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
        >
          {isSending
            ? <ActivityIndicator size="small" color={WHITE} />
            : <Ionicons name="send" size={18} color={WHITE} />
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: NAVY,
    paddingHorizontal: 14, paddingBottom: 14, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatus: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  headerAction: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 14, paddingTop: 16, flexGrow: 1 },

  // Date separator
  dateSep: {
    flexDirection: "row", alignItems: "center",
    marginVertical: 16, gap: 10,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: "#DDE3EA" },
  dateSepPill: {
    backgroundColor: WHITE,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  dateSepText: { fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT2 },

  // Bubble
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 3, gap: 8 },
  bubbleRowOwn: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },

  avatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarPlaceholder: { width: 30, flexShrink: 0 },
  avatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  bubbleOwn: { backgroundColor: TEAL },
  bubbleOther: { backgroundColor: WHITE },
  bubbleTailOwn: { borderBottomRightRadius: 4 },
  bubbleTailOther: { borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 20 },
  bubbleTextOwn: { color: WHITE },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3 },
  bubbleTimeOwn: { color: "rgba(255,255,255,0.65)" },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: "#E0E7EF",
    paddingHorizontal: 12, paddingTop: 10, gap: 10,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    backgroundColor: BG, borderRadius: 21,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
    borderWidth: 1, borderColor: "#DDE3EA",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: TEAL,
    alignItems: "center", justifyContent: "center",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: "#C5D0DB", shadowOpacity: 0 },

  loadingMore: { paddingVertical: 16, alignItems: "center" },

  // Empty
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT },
  emptySub: { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular" },
});