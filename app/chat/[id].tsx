import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, Image, Linking, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { useChat } from "@/lib/hooks/useChat";
import {
  getMessages,
  markConversationRead,
  sendMessageRest,
  uploadChatFile,
  getFileDownloadUrl,
  type UploadableFile,
} from "@/lib/services/chatService";
import { useChatNotifications } from "@/lib/chat-context";
import type { MessageDTO } from "@/shared/schema";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/keys";
import { Tooltip } from "@/components/Tooltip";
import { LinearGradient } from "expo-linear-gradient";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY  = "#0F2640";
const WHITE = "#FFFFFF";
const BG    = "#EEF2F7";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL  = "#2196A6";
const GREEN = "#27AE7A";
const RED   = "#E05252";

const AVATAR_COLORS = [
  { bg: "#E8F4FD", text: TEAL },
  { bg: "#E8F8F2", text: GREEN },
  { bg: "#FEF6E8", text: "#F5A623" },
  { bg: "#EEE8FD", text: "#7B5EA7" },
  { bg: "#FDEAEA", text: RED },
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── Local message type (extends DTO with optimistic-upload fields) ────────
type LocalMessage = MessageDTO & {
  tempId?: string;
  uploading?: boolean;
  uploadProgress?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(date: Date | string): string {
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a), db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth()    === db.getMonth()    &&
    da.getDate()     === db.getDate()
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

// ─── File bubble ──────────────────────────────────────────────────────────
function FileBubble({ msg, isOwn }: { msg: LocalMessage; isOwn: boolean }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl]   = useState(false);
  const [imgFull, setImgFull]         = useState(false);

  // For image previews, fetch the signed URL once on mount
  useEffect(() => {
    if (!isImage(msg.fileMime) || msg.uploading) return;
    setLoadingUrl(true);
    getFileDownloadUrl(msg.id)
      .then(setDownloadUrl)
      .catch(() => {/* silently fail – user can tap to retry */})
      .finally(() => setLoadingUrl(false));
  }, [msg.id, msg.fileMime, msg.uploading]);

  const handleDownload = async () => {
    try {
      setLoadingUrl(true);
      const url = await getFileDownloadUrl(msg.id);
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "No se pudo abrir el archivo");
    } finally {
      setLoadingUrl(false);
    }
  };

  const bubbleBase = [
    styles.fileBubble,
    isOwn ? styles.fileBubbleOwn : styles.fileBubbleOther,
  ];

  // ── Uploading placeholder ──
  if (msg.uploading) {
    return (
      <View style={bubbleBase}>
        <Ionicons name="document-attach-outline" size={22} color={isOwn ? WHITE : TEAL} />
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, isOwn && styles.fileNameOwn]} numberOfLines={1}>
            {msg.fileName ?? "Archivo"}
          </Text>
          <Text style={[styles.fileMeta, isOwn && styles.fileMetaOwn]}>
            {msg.uploadProgress != null ? `${msg.uploadProgress}%` : "Subiendo..."}
          </Text>
          {msg.uploadProgress != null && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${msg.uploadProgress}%` as any }]} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Image bubble ──
  if (isImage(msg.fileMime)) {
    return (
      <>
        <Pressable onPress={() => downloadUrl && setImgFull(true)} style={bubbleBase}>
          {loadingUrl && !downloadUrl ? (
            <View style={styles.imgPlaceholder}>
              <ActivityIndicator size="small" color={isOwn ? WHITE : TEAL} />
            </View>
          ) : downloadUrl ? (
            <Image
              source={{ uri: downloadUrl }}
              style={styles.imgThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name="image-outline" size={28} color={isOwn ? WHITE : TEAL} />
            </View>
          )}
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, isOwn && styles.fileNameOwn]} numberOfLines={1}>
              {msg.fileName}
            </Text>
            <Text style={[styles.fileMeta, isOwn && styles.fileMetaOwn]}>
              {formatBytes(msg.fileSize)} · {downloadUrl ? "Ver" : "Cargando..."}
            </Text>
          </View>
        </Pressable>

        {/* Fullscreen image modal */}
        <Modal visible={imgFull} transparent animationType="fade" onRequestClose={() => setImgFull(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setImgFull(false)}>
            <Image
              source={{ uri: downloadUrl! }}
              style={styles.imgFullscreen}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      </>
    );
  }

  // ── Document bubble ──
  return (
    <Pressable onPress={handleDownload} style={bubbleBase}>
      <Ionicons name="document-outline" size={22} color={isOwn ? WHITE : TEAL} />
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, isOwn && styles.fileNameOwn]} numberOfLines={1}>
          {msg.fileName}
        </Text>
        <Text style={[styles.fileMeta, isOwn && styles.fileMetaOwn]}>
          {formatBytes(msg.fileSize)} · {loadingUrl ? "Abriendo..." : "Descargar"}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, showAvatar }: {
  msg: LocalMessage; isOwn: boolean; showAvatar: boolean;
}) {
  const av      = avatarColor(msg.sender.name || "?");
  const initial = (msg.sender.name?.charAt(0) ?? "?").toUpperCase();

  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
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
        msg.type === "file" && styles.bubbleFile,
      ]}>
        {!isOwn && showAvatar && (
          <Text style={[styles.senderName, { color: av.text }]}>{msg.sender.name}</Text>
        )}

        {msg.type === "file" ? (
          <FileBubble msg={msg} isOwn={isOwn} />
        ) : (
          <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
            {msg.content}
          </Text>
        )}

        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
            {formatTime(msg.createdAt)}
          </Text>
          {isOwn && !msg.uploading && (
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

// ─── Attach picker modal ──────────────────────────────────────────────────
function AttachModal({ visible, onClose, onDocument, onImage }: {
  visible: boolean;
  onClose: () => void;
  onDocument: () => void;
  onImage: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.attachOverlay} onPress={onClose}>
        <Pressable style={styles.attachSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.attachHandle} />
          <Pressable style={styles.attachOption} onPress={onDocument}>
            <View style={[styles.attachIcon, { backgroundColor: "#E8F0FE" }]}>
              <Ionicons name="document-outline" size={22} color="#4A7CF7" />
            </View>
            <Text style={styles.attachLabel}>Documento</Text>
          </Pressable>
          <Pressable style={styles.attachOption} onPress={onImage}>
            <View style={[styles.attachIcon, { backgroundColor: "#E8F8F2" }]}>
              <Ionicons name="image-outline" size={22} color={GREEN} />
            </View>
            <Text style={styles.attachLabel}>Imagen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const metrics = getDesktopMetrics(width);
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const shellWidth = Math.min(1480, Math.max(1180, width - metrics.gutter * 2));
  const router = useRouter();
  const { id: conversationId, name, from, procesoId, userId, support } =
    useLocalSearchParams<{ id: string; name: string; from: string; procesoId?: string; userId?: string; support?: string }>();

  const { clearConversation } = useChatNotifications();

  const [msgs, setMsgs]               = useState<LocalMessage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [inputText, setInputText]     = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending]     = useState(false);
  const [showAttach, setShowAttach]   = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef    = useRef<TextInput>(null);

  // Clear badge when conversation opens
  useEffect(() => {
    if (conversationId) clearConversation(conversationId);
  }, [conversationId, clearConversation]);

  // Load current user id
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.USER).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setCurrentUserId(parsed?.user?.id ?? parsed?.id ?? null);
      } catch {}
    });
  }, []);

  // Initial message load
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    getMessages(conversationId, PAGE_SIZE, 0)
      .then((data) => {
        setMsgs(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  // Load older messages on scroll
  const handleLoadMore = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const older = await getMessages(conversationId, PAGE_SIZE, msgs.length);
      if (older.length > 0) {
        setMsgs((prev) => [...prev, ...older]);
        setHasMore(older.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch {}
    finally { setLoadingMore(false); }
  }, [conversationId, loadingMore, hasMore, msgs.length]);

  // WS new_message handler — replaces optimistic placeholder if tempId matches
  const handleNewMessage = useCallback((incoming: MessageDTO & { tempId?: string }) => {
    setMsgs((prev) => {
      if (incoming.tempId) {
        const idx = prev.findIndex((m) => m.tempId === incoming.tempId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...incoming, uploading: false };
          return updated;
        }
      }
      // Guard against duplicates (e.g. REST + WS echo)
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [{ ...incoming }, ...prev];
    });
  }, []);

  const { status, sendMessage, markRead } = useChat({
    conversationId: conversationId ?? "",
    onNewMessage: handleNewMessage as (msg: MessageDTO) => void,
  });

  // ── Send text ──────────────────────────────────────────────────
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

  // ── Upload file ────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: UploadableFile) => {
    setShowAttach(false);

    const tempId = randomUUID();
    const placeholder: LocalMessage = {
      id: tempId,
      tempId,
      conversationId,
      senderId: currentUserId ?? "",
      content: null,
      type: "file",
      isDeleted: false,
      createdAt: new Date(),
      fileName: file.name,
      fileSize: file.size,
      fileMime: file.mimeType,
      fileHash: null,
      uploading: true,
      uploadProgress: 0,
      sender: { id: currentUserId ?? "", name: "Tú", email: "" },
    };

    setMsgs((prev) => [placeholder, ...prev]);

    try {
      await uploadChatFile(
        conversationId,
        procesoId ?? null,
        file,
        tempId,
        (pct) => {
          setMsgs((prev) =>
            prev.map((m) => (m.tempId === tempId ? { ...m, uploadProgress: pct } : m))
          );
        }
      );
      // The WS broadcast from the server will replace the placeholder via handleNewMessage.
      // If WS is not connected, fall back to removing placeholder and reloading.
      if (status !== "connected") {
        const updated = await getMessages(conversationId, PAGE_SIZE, 0);
        setMsgs(updated);
      }
    } catch (err: any) {
      // Remove placeholder on error
      setMsgs((prev) => prev.filter((m) => m.tempId !== tempId));
      Alert.alert("Error al subir archivo", err?.message ?? "Intenta de nuevo");
    }
  }, [conversationId, procesoId, currentUserId, status]);

  // ── Pick document ──────────────────────────────────────────────
  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await handleUpload({
        uri:      asset.uri,
        name:     asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
        size:     asset.size ?? 0,
      });
    } catch {
      Alert.alert("Error", "No se pudo seleccionar el documento");
    }
  }, [handleUpload]);

  // ── Pick image ─────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permiso requerido", "Se necesita acceso a la galería");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name  = asset.uri.split("/").pop() ?? "imagen.jpg";
      await handleUpload({
        uri:      asset.uri,
        name,
        mimeType: asset.mimeType ?? "image/jpeg",
        size:     asset.fileSize ?? 0,
      });
    } catch {
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  }, [handleUpload]);

  // ── Render item ────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: LocalMessage; index: number }) => {
    const isOwn      = item.senderId === currentUserId;
    const olderMsg   = msgs[index + 1];
    const newerMsg   = msgs[index - 1];
    const showSep    = !olderMsg || !isSameDay(olderMsg.createdAt, item.createdAt);
    const showAvatar = !isOwn && (!newerMsg || newerMsg.senderId !== item.senderId ||
      !isSameDay(newerMsg.createdAt, item.createdAt));

    return (
      <>
        {showSep && <DateSeparator date={item.createdAt} />}
        <MessageBubble msg={item} isOwn={isOwn} showAvatar={showAvatar} />
      </>
    );
  };

  const isOnline      = status === "connected";
  const displayInitial = (name ?? "C").charAt(0).toUpperCase();
  const av            = avatarColor(name ?? "Chat");
  const isSupportChat = support === "1";

  if (desktop) {
    return (
      <KeyboardAvoidingView style={styles.desktopScreen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.desktopShell, { maxWidth: shellWidth, paddingTop: insets.top + 24 }]}>
          <View style={styles.desktopHero}>
            <LinearGradient colors={[NAVY, "#17365B"]} style={styles.desktopHeroGradient}>
              <View style={styles.desktopHeroRow}>
                <View style={styles.desktopHeroMain}>
                  <Pressable
                    onPress={() => router.canGoBack() ? router.back() : router.replace((from as any) ?? "/(firm-tabs)/chat")}
                    style={styles.desktopBackBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-back" size={20} color={WHITE} />
                  </Pressable>

                  <View style={[styles.desktopHeroAvatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.desktopHeroAvatarText, { color: av.text }]}>{displayInitial}</Text>
                  </View>

                  <View style={styles.desktopHeroCopy}>
                    <Text style={styles.desktopEyebrow}>Conversación</Text>
                    <Text style={styles.desktopHeroTitle} numberOfLines={1}>{name ?? "Chat"}</Text>
                    <View style={styles.desktopStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: isSupportChat ? TEAL : isOnline ? GREEN : TEXT3 }]} />
                      <Text style={styles.desktopHeroStatus}>
                        {isSupportChat ? "Canal de soporte" : isOnline ? "En línea" : "Conectando..."}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.desktopHeroActions}>
                  {!isSupportChat && !!userId && (
                    <Pressable style={styles.desktopHeroAction} onPress={() => router.push(`/community/profile/${userId}` as any)}>
                      <Ionicons name="person-outline" size={16} color={WHITE} />
                      <Text style={styles.desktopHeroActionText}>Perfil</Text>
                    </Pressable>
                  )}
                  <View style={styles.desktopStatusPill}>
                    <Text style={styles.desktopStatusPillText}>{status === "connected" ? "WS activa" : "Modo REST"}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={[styles.desktopChatLayout, { marginTop: 22 }]}>
            <View style={styles.desktopConversationColumn}>
              <View style={styles.desktopConversationPanel}>
                {loading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color={TEAL} />
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={msgs}
                    inverted
                    keyExtractor={(item) => item.tempId ?? item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, styles.desktopListContent]}
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

                <View style={styles.desktopInputBar}>
                  <Tooltip label="Adjuntar archivo">
                    <Pressable onPress={() => setShowAttach(true)} style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.7 }]} hitSlop={8}>
                      <Ionicons name="attach" size={22} color={TEXT2} />
                    </Pressable>
                  </Tooltip>

                  <TextInput
                    ref={inputRef}
                    style={[styles.input, styles.desktopInput]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor={TEXT3}
                    multiline
                    maxLength={2000}
                  />

                  <Tooltip label="Enviar mensaje">
                    <Pressable
                      onPress={handleSend}
                      disabled={!inputText.trim() || isSending}
                      style={({ pressed }) => [
                        styles.sendBtn,
                        (!inputText.trim() || isSending) && styles.sendBtnDisabled,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      {isSending ? <ActivityIndicator size="small" color={WHITE} /> : <Ionicons name="send" size={18} color={WHITE} />}
                    </Pressable>
                  </Tooltip>
                </View>
              </View>
            </View>

            <View style={styles.desktopAside}>
              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Resumen</Text>
                <Text style={styles.desktopAsideTitle}>{isSupportChat ? "Soporte ProcesoClaro" : name ?? "Contacto"}</Text>
                <Text style={styles.desktopAsideText}>
                  {isSupportChat
                    ? "Canal para resolver incidencias operativas o dudas de plataforma."
                    : "Conversación directa con seguimiento en tiempo real y archivos adjuntos."}
                </Text>
              </View>

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Actividad</Text>
                <View style={styles.desktopMetaRow}>
                  <Text style={styles.desktopMetaKey}>Mensajes cargados</Text>
                  <Text style={styles.desktopMetaValue}>{msgs.length}</Text>
                </View>
                <View style={styles.desktopMetaRow}>
                  <Text style={styles.desktopMetaKey}>Conexión</Text>
                  <Text style={styles.desktopMetaValue}>{isOnline ? "En línea" : "Sincr. diferida"}</Text>
                </View>
                <View style={styles.desktopMetaRow}>
                  <Text style={styles.desktopMetaKey}>Archivos</Text>
                  <Text style={styles.desktopMetaValue}>Permitidos</Text>
                </View>
              </View>

              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Accesos</Text>
                {!isSupportChat && !!userId && (
                  <Pressable style={styles.desktopAsideAction} onPress={() => router.push(`/community/profile/${userId}` as any)}>
                    <Ionicons name="person-outline" size={16} color={TEXT2} />
                    <Text style={styles.desktopAsideActionText}>Ver perfil</Text>
                  </Pressable>
                )}
                <Pressable style={styles.desktopAsideAction} onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}>
                  <Ionicons name="arrow-up-outline" size={16} color={TEXT2} />
                  <Text style={styles.desktopAsideActionText}>Ir al último mensaje</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <AttachModal
          visible={showAttach}
          onClose={() => setShowAttach(false)}
          onDocument={handlePickDocument}
          onImage={handlePickImage}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace((from as any) ?? "/(firm-tabs)/chat")}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={WHITE} />
        </Pressable>

        <Tooltip label="Ver perfil" style={{ flex: 1 }}>
          <Pressable
            style={styles.headerProfileBtn}
            onPress={() => userId && router.push(`/community/profile/${userId}` as any)}
            disabled={!userId || isSupportChat}
            hitSlop={8}
          >
            <View style={[styles.headerAvatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.headerAvatarText, { color: av.text }]}>{displayInitial}</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{name ?? "Chat"}</Text>
              <View style={styles.headerStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: isSupportChat ? TEAL : isOnline ? GREEN : TEXT3 }]} />
                <Text style={styles.headerStatus}>
                  {isSupportChat ? "Canal de soporte" : isOnline ? "En línea" : "Conectando..."}
                </Text>
              </View>
            </View>
          </Pressable>
        </Tooltip>

        <Tooltip label="Opciones">
          <Pressable style={styles.headerAction} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </Tooltip>
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
          keyExtractor={(item) => item.tempId ?? item.id}
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
        {/* Attach button */}
        <Tooltip label="Adjuntar archivo">
          <Pressable
            onPress={() => setShowAttach(true)}
            style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="attach" size={22} color={TEXT2} />
          </Pressable>
        </Tooltip>

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

        <Tooltip label="Enviar mensaje">
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
        </Tooltip>
      </View>

      {/* ── Attach picker modal ── */}
      <AttachModal
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onDocument={handlePickDocument}
        onImage={handlePickImage}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  desktopScreen: { flex: 1, backgroundColor: BG, paddingHorizontal: 24, paddingBottom: 24 },
  desktopShell: { width: "100%", alignSelf: "center", flex: 1 },
  desktopHero: { borderRadius: 28, overflow: "hidden" },
  desktopHeroGradient: { paddingHorizontal: 28, paddingVertical: 24 },
  desktopHeroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  desktopHeroMain: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1, minWidth: 0 },
  desktopBackBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  desktopHeroAvatar: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: "center", justifyContent: "center",
  },
  desktopHeroAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  desktopHeroCopy: { flex: 1, minWidth: 0 },
  desktopEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.64)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  desktopHeroTitle: { fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold", color: WHITE },
  desktopStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  desktopHeroStatus: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.72)" },
  desktopHeroActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  desktopHeroAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  desktopHeroActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  desktopStatusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  desktopStatusPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.76)" },
  desktopChatLayout: { flex: 1, flexDirection: "row", alignItems: "stretch", gap: 24, minHeight: 0 },
  desktopConversationColumn: { flex: 1.55, minWidth: 0 },
  desktopConversationPanel: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    overflow: "hidden",
    minHeight: 0,
  },
  desktopListContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, flexGrow: 1 },
  desktopInputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: "#E0E7EF",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10,
  },
  desktopInput: { minHeight: 46, borderRadius: 24 },
  desktopAside: { width: 320, gap: 16 },
  desktopAsideCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E1E8F0",
  },
  desktopAsideLabel: {
    fontSize: 11,
    color: TEXT3,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  desktopAsideTitle: { fontSize: 18, lineHeight: 24, color: TEXT, fontFamily: "Inter_700Bold" },
  desktopAsideText: { fontSize: 13, lineHeight: 20, color: TEXT2, fontFamily: "Inter_400Regular" },
  desktopMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  desktopMetaKey: { fontSize: 12, color: TEXT3, fontFamily: "Inter_500Medium" },
  desktopMetaValue: { fontSize: 13, color: TEXT, fontFamily: "Inter_600SemiBold", textAlign: "right", flexShrink: 1 },
  desktopAsideAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "#E5EBF2",
  },
  desktopAsideActionText: { fontSize: 13, color: TEXT2, fontFamily: "Inter_600SemiBold" },

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
  headerProfileBtn: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
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
  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: "#DDE3EA" },
  dateSepPill: {
    backgroundColor: WHITE,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  dateSepText: { fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT2 },

  // Bubble
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 3, gap: 8 },
  bubbleRowOwn:   { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },

  avatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarPlaceholder: { width: 30, flexShrink: 0 },
  avatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  bubble: {
    maxWidth: "75%", borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  bubbleOwn:   { backgroundColor: TEAL },
  bubbleOther: { backgroundColor: WHITE },
  bubbleTailOwn:   { borderBottomRightRadius: 4 },
  bubbleTailOther: { borderBottomLeftRadius: 4 },
  bubbleFile: { paddingHorizontal: 10, paddingVertical: 10 },
  senderName: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  bubbleText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 20 },
  bubbleTextOwn: { color: WHITE },
  bubbleMeta:    { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 },
  bubbleTime:    { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3 },
  bubbleTimeOwn: { color: "rgba(255,255,255,0.65)" },

  // File bubble
  fileBubble: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
  fileBubbleOwn:   {},
  fileBubbleOther: {},
  fileInfo:    { flex: 1 },
  fileName:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 2 },
  fileNameOwn: { color: WHITE },
  fileMeta:    { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2 },
  fileMetaOwn: { color: "rgba(255,255,255,0.75)" },

  // Progress bar
  progressBar:  { height: 3, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2, marginTop: 4 },
  progressFill: { height: 3, backgroundColor: WHITE, borderRadius: 2 },

  // Image thumbnail
  imgThumbnail:  { width: 180, height: 180, borderRadius: 10 },
  imgPlaceholder: {
    width: 180, height: 140, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center", justifyContent: "center",
  },

  // Fullscreen image
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  imgFullscreen: { width: "100%", height: "100%" },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: "#E0E7EF",
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
  },
  attachBtn: {
    width: 38, height: 42,
    alignItems: "center", justifyContent: "center",
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
  emptySub:   { fontSize: 13, color: TEXT3, fontFamily: "Inter_400Regular" },

  // Attach modal
  attachOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  attachSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36,
    gap: 4,
  },
  attachHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#DDE3EA",
    alignSelf: "center", marginBottom: 16,
  },
  attachOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F0F4F8",
  },
  attachIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  attachLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
});
