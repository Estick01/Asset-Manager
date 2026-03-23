import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
  TouchableOpacity, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { useAuth } from "@/lib/auth-context";
import { Tooltip } from "@/components/Tooltip";
import {
  getPost, getComments, addComment, startChat, startDirectChat,
  toggleLike, toggleBookmark, sharePost,
  deletePost, updatePost, deleteComment, updateComment,
  reportPost, reportComment, getTags, takePost, closePost, acceptTake, rejectTake,
  linkProcesoToPost,
  type PostDTO, type CommentDTO, type Tag,
} from "@/lib/services/communityService";
import { getProcesos } from "@/lib/services/procesoService";
import { CityPickerModal } from "@/components/community/CityPickerModal";
import RecommendedLawyers from "@/components/community/RecommendedLawyers";
import { EnumRol, users } from "@/shared/schema/user.schema";
import { C, T, S, R, shadow, CASE_META, getAvatarColor, formatDate } from "@/constants/community-theme";

// ─── Design tokens (aliases from community-theme) ──────────────────────────
const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;

const CASE_TYPES = [
  { key: "civil",          label: "Civil" },
  { key: "penal",          label: "Penal" },
  { key: "laboral",        label: "Laboral" },
  { key: "familiar",       label: "Familiar" },
  { key: "mercantil",      label: "Mercantil" },
  { key: "administrativo", label: "Administrativo" },
  { key: "tributario",     label: "Tributario" },
  { key: "inmobiliario",   label: "Inmobiliario" },
  { key: "otro",           label: "Otro" },
];

// ─── Skeleton ──────────────────────────────────────────────────────────────
function SkeletonBlock({ w, h, r = 8, mb = 0 }: { w?: number | `${number}%`; h: number; r?: number; mb?: number }) {
  return (
    <View style={{
      width: w ?? "100%",
      height: h,
      borderRadius: r,
      backgroundColor: "#E8ECF0",
      marginBottom: mb,
      opacity: 0.7,
    }} />
  );
}

function PostSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.postAccent} />
      <View style={[styles.postInner, { gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <SkeletonBlock w={48} h={48} r={24} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock w="50%" h={13} r={6} />
            <SkeletonBlock w="35%" h={10} r={6} />
          </View>
        </View>
        <SkeletonBlock h={22} r={6} />
        <SkeletonBlock h={22} w="75%" r={6} />
        <View style={{ height: 1, backgroundColor: "#F0F2F4" }} />
        <SkeletonBlock h={14} r={6} />
        <SkeletonBlock h={14} r={6} />
        <SkeletonBlock h={14} w="60%" r={6} />
      </View>
    </View>
  );
}

// ─── Action Sheet ─────────────────────────────────────────────────────────
interface ActionItem {
  label: string;
  icon:  string;
  color?: string;
  onPress: () => void;
}

function ActionSheet({
  visible, onClose, items,
}: { visible: boolean; onClose: () => void; items: ActionItem[] }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheetContainer}>
          {items.map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.sheetItem, pressed && { backgroundColor: "#F4F6F8" }]}
              onPress={() => { onClose(); item.onPress(); }}
            >
              <Ionicons name={item.icon as any} size={20} color={item.color ?? TEXT} />
              <Text style={[styles.sheetItemText, item.color ? { color: item.color } : {}]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.7 }]}
            onPress={onClose}
          >
            <Text style={styles.sheetCancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────
const REPORT_REASONS = [
  "Contenido inapropiado",
  "Spam",
  "Desinformación",
  "Acoso",
  "Otro",
];

function ReportModal({
  visible, onClose, onSubmit,
}: { visible: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [selected, setSelected] = useState("");
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetContainer, { paddingBottom: 8 }]}>
          <Text style={styles.reportTitle}>Reportar contenido</Text>
          <Text style={styles.reportSub}>Selecciona el motivo del reporte</Text>
          {REPORT_REASONS.map(r => (
            <Pressable
              key={r}
              style={[styles.sheetItem, selected === r && styles.sheetItemSelected]}
              onPress={() => setSelected(r)}
            >
              <Ionicons
                name={selected === r ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={selected === r ? TEAL : TEXT3}
              />
              <Text style={[styles.sheetItemText, selected === r && { color: TEAL }]}>{r}</Text>
            </Pressable>
          ))}
          <View style={styles.reportBtns}>
            <Pressable style={styles.reportCancel} onPress={onClose}>
              <Text style={styles.reportCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.reportSubmit, !selected && styles.reportSubmitDisabled]}
              disabled={!selected}
              onPress={() => { if (selected) { onClose(); onSubmit(selected); } }}
            >
              <Text style={styles.reportSubmitText}>Reportar</Text>
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────
function CommentItem({
  comment, currentUserId, onReply, onDeleted, onEdited, depth = 0,
}: {
  comment: CommentDTO;
  currentUserId?: string;
  onReply: (id: string, name: string) => void;
  onDeleted: (id: string) => void;
  onEdited: (id: string, content: string) => void;
  depth?: number;
}) {
  const av = getAvatarColor(comment.author.name || "?");
  const isOwn = comment.userId === currentUserId;
  const isLawyer = comment.author.rol === "abogado" || comment.author.rol === "bufete";
  const [contacting, setContacting] = useState(false);

  const [sheetOpen, setSheetOpen]   = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editText, setEditText]     = useState(comment.content);
  const [saving, setSaving]         = useState(false);

  const sheetItems: ActionItem[] = isOwn
    ? [
        { label: "Editar comentario", icon: "create-outline", onPress: () => setEditing(true) },
        { label: "Eliminar comentario", icon: "trash-outline", color: ROSE, onPress: handleDelete },
      ]
    : [
        { label: "Reportar comentario", icon: "flag-outline", color: AMBER, onPress: () => setReportOpen(true) },
      ];

  async function handleDelete() {
    const ok = await deleteComment(comment.id);
    if (ok) { toast.success("Comentario eliminado"); onDeleted(comment.id); }
  }

  async function handleSaveEdit() {
    const t = editText.trim();
    if (!t || t === comment.content) { setEditing(false); return; }
    setSaving(true);
    const ok = await updateComment(comment.id, t);
    if (ok) { toast.success("Comentario editado"); onEdited(comment.id, t); setEditing(false); }
    setSaving(false);
  }

  async function handleReport(reason: string) {
    const ok = await reportComment(comment.id, reason);
    if (ok) toast.success("Reporte enviado");
  }

  async function handleContact() {
    if (contacting) return;
    setContacting(true);
    const result = await startDirectChat(comment.userId);
    setContacting(false);
    if (result) router.push(`/chat/${result.id}` as any);
    else toast.error("No se pudo iniciar el chat");
  }

  return (
    <View style={[
      styles.comment,
      isLawyer && !isOwn && styles.commentLawyer,
      depth > 0 && styles.commentReply,
    ]}>
      {depth > 0 && <View style={styles.threadLine} />}

      {/* ── Lawyer verified banner ── */}
      {isLawyer && !isOwn && (
        <View style={styles.lawyerVerifiedBanner}>
          <Ionicons name="shield-checkmark" size={13} color={TEAL} />
          <Text style={styles.lawyerVerifiedText}>Abogado verificado</Text>
          <View style={styles.lawyerVerifiedDot} />
          <View style={styles.lawyerVerifiedStars}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name="star" size={9} color={i <= 4 ? AMBER : "#E8ECF0"} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.commentHeader}>
        <Tooltip label={isOwn ? "Tu comentario" : "Ver perfil"}>
          <Pressable
            style={styles.commentAuthorBtn}
            onPress={() => router.push(`/community/profile/${comment.userId}` as any)}
          >
            <View style={{ position: "relative" }}>
              <View style={[
                styles.commentAvatar,
                { backgroundColor: isLawyer && !isOwn ? TEAL + "18" : av.bg },
              ]}>
                <Text style={[styles.commentAvatarText, { color: isLawyer && !isOwn ? TEAL : av.text }]}>
                  {comment.author.name?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              {isLawyer && (
                <View style={styles.lawyerBadgeDot}>
                  <Ionicons name="shield-checkmark" size={10} color={WHITE} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.commentAuthor, { color: isLawyer && !isOwn ? TEAL : isOwn ? NAVY : TEXT }]}>
                {comment.author.name}
                {isOwn && <Text style={styles.youBadge}> · tú</Text>}
              </Text>
              <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
            </View>
          </Pressable>
        </Tooltip>

        <View style={styles.commentActions}>
          <Pressable
            onPress={() => onReply(comment.id, comment.author.name)}
            style={({ pressed }) => [styles.replyBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="return-down-forward-outline" size={13} color={TEAL} />
            <Text style={styles.replyBtnText}>Responder</Text>
          </Pressable>
          <Pressable onPress={() => setSheetOpen(true)} hitSlop={8} style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={16} color={TEXT3} />
          </Pressable>
        </View>
      </View>

      {editing ? (
        <View style={styles.editWrap}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            maxLength={1000}
          />
          <View style={styles.editBtns}>
            <Pressable style={styles.editCancel} onPress={() => setEditing(false)}>
              <Text style={styles.editCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.editSave, saving && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Text style={styles.editSaveText}>Guardar</Text>
              }
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.commentContent}>{editText}</Text>

          {/* ── Lawyer CTA — full width prominent button ── */}
          {isLawyer && !isOwn && (
            <Pressable
              style={({ pressed }) => [
                styles.lawyerCtaFull,
                contacting && { opacity: 0.6 },
                pressed && { opacity: 0.88 },
              ]}
              onPress={handleContact}
              disabled={contacting}
            >
              {contacting ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <View style={styles.lawyerCtaFullIcon}>
                    <Ionicons name="chatbubble-ellipses" size={16} color={TEAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lawyerCtaFullTitle}>Hablar con este abogado</Text>
                    <Text style={styles.lawyerCtaFullSub}>Chat directo · Sin compromiso</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color={TEAL + "60"} />
                </>
              )}
            </Pressable>
          )}
        </>
      )}

      {comment.replies.length > 0 && (
        <View style={styles.repliesWrap}>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDeleted={onDeleted}
              onEdited={onEdited}
              depth={depth + 1}
            />
          ))}
        </View>
      )}

      <ActionSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} items={sheetItems} />
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────
export default function PostDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const [post, setPost]             = useState<PostDTO | null>(null);
  const [comments, setComments]     = useState<CommentDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo]       = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [takingCase,    setTakingCase]    = useState(false);
  const [closingCase,   setClosingCase]   = useState(false);
  const [acceptingCase, setAcceptingCase] = useState(false);
  const [rejectingCase, setRejectingCase] = useState(false);

  // Link existing proceso modal
  const [linkModalOpen, setLinkModalOpen]   = useState(false);
  const [procesos,      setProcesos]        = useState<{ id: string; radicado: string; clienteNombre?: string }[]>([]);
  const [loadingProc,   setLoadingProc]     = useState(false);
  const [linkingProc,   setLinkingProc]     = useState<string | null>(null);

  // Like / bookmark state
  const [liked,      setLiked]      = useState(false);
  const [likeCount,  setLikeCount]  = useState(0);
  const [liking,     setLiking]     = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  // Menus
  const [postSheetOpen, setPostSheetOpen]   = useState(false);
  const [reportPostOpen, setReportPostOpen] = useState(false);

  // Edit post modal
  const [editModalOpen, setEditModalOpen]   = useState(false);
  const [editTitle, setEditTitle]           = useState("");
  const [editContent, setEditContent]       = useState("");
  const [editCaseType, setEditCaseType]     = useState<string | null>(null);
  const [editIsUrgent, setEditIsUrgent]     = useState(false);
  const [editCity, setEditCity]             = useState<string | null>(null);
  const [editCityPickerOpen, setEditCityPickerOpen] = useState(false);
  const [editTags, setEditTags]             = useState<string[]>([]);
  const [allTags, setAllTags]               = useState<Tag[]>([]);
  const [savingEdit, setSavingEdit]         = useState(false);

  const inputRef = useRef<TextInput>(null);
  const currentUserId = user?.user?.id as string | undefined;

  useEffect(() => {
    Promise.all([getPost(id), getComments(id)]).then(([p, c]) => {
      if (p) {
        setPost(p);
        setLiked(p.isLiked ?? false);
        setLikeCount(p.likeCount ?? 0);
        setBookmarked(p.isBookmarked ?? false);
      }
      setComments(c);
      setLoading(false);
    });
  }, [id]);

  const handleReply = useCallback((commentId: string, name: string) => {
    setReplyTo({ id: commentId, name });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    const result = await addComment(id, text, replyTo?.id ?? null);
    if (result) {
      toast.success("Comentario publicado");
      setCommentText("");
      setReplyTo(null);
      const updated = await getComments(id);
      setComments(updated);
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
    }
    setSubmitting(false);
  };

  const handleStartChat = async () => {
    if (!post) return;
    setStartingChat(true);
    const result = await startChat(post.id);
    if (result) {
      const authorName = post.author?.name ?? "Usuario";
      router.push({
        pathname: "/chat/[id]",
        params: { id: result.conversationId, name: authorName, userId: post.userId },
      } as any);
    }
    setStartingChat(false);
  };

  const handleLike = async () => {
    if (liking || !post) return;
    setLiking(true);
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    const result = await toggleLike(post.id);
    if (result) { setLiked(result.liked); setLikeCount(result.likeCount); }
    else         { setLiked(prev => !prev); setLikeCount(prev => liked ? prev + 1 : prev - 1); }
    setLiking(false);
  };

  const handleBookmark = async () => {
    if (bookmarking || !post) return;
    setBookmarking(true);
    setBookmarked(prev => !prev);
    const result = await toggleBookmark(post.id);
    if (result) setBookmarked(result.bookmarked);
    else        setBookmarked(prev => !prev);
    setBookmarking(false);
  };

  const handleShare = () => { if (post) sharePost(post); };

  const handleTakeCase = async () => {
    if (!post || takingCase) return;
    setTakingCase(true);
    try {
      const updated = await takePost(post.id);
      setPost(updated);
      toast.success("¡Caso tomado! El cliente fue notificado.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo tomar el caso");
    }
    setTakingCase(false);
  };

  const handleCloseCase = async () => {
    if (!post || closingCase) return;
    setClosingCase(true);
    try {
      const updated = await closePost(post.id);
      setPost(updated);
      toast.success("Caso marcado como resuelto.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cerrar el caso");
    }
    setClosingCase(false);
  };

  const handleAcceptTake = async () => {
    if (!post || acceptingCase) return;
    setAcceptingCase(true);
    try {
      const updated = await acceptTake(post.id);
      setPost(updated);
      toast.success("Representación aceptada. El abogado fue notificado.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo aceptar");
    }
    setAcceptingCase(false);
  };

  const openLinkModal = async () => {
    setLinkModalOpen(true);
    setLoadingProc(true);
    try {
      const list = await getProcesos(50, 0);
      setProcesos((list as any[]).map((p: any) => ({
        id: p.id,
        radicado: p.radicado,
        clienteNombre: p.clienteNombre ?? p.cliente?.nombre ?? "",
      })));
    } catch { toast.error("No se pudieron cargar los procesos"); }
    finally { setLoadingProc(false); }
  };

  const handleLinkProceso = async (procesoId: string) => {
    if (!post) return;
    setLinkingProc(procesoId);
    try {
      await linkProcesoToPost(procesoId, post.id);
      const updated = await getPost(post.id);
      if (updated) setPost(updated);
      setLinkModalOpen(false);
      toast.success("Proceso vinculado correctamente");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo vincular");
    } finally { setLinkingProc(null); }
  };

  const handleRejectTake = async () => {
    if (!post || rejectingCase) return;
    setRejectingCase(true);
    try {
      const updated = await rejectTake(post.id);
      setPost(updated);
      toast.success("Rechazado. Tu caso está disponible para otros abogados.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo rechazar");
    }
    setRejectingCase(false);
  };

  const handleDeletePost = async () => {
    if (!post) return;
    const ok = await deletePost(post.id);
    if (ok) { toast.success("Publicación eliminada"); router.back(); }
    else    toast.error("No se pudo eliminar");
  };

  const handleReportPost = async (reason: string) => {
    if (!post) return;
    const ok = await reportPost(post.id, reason);
    if (ok) toast.success("Reporte enviado");
  };

  const openEditPost = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCaseType(post.caseType ?? null);
    setEditIsUrgent(post.isUrgent === 1);
    setEditCity(post.city ?? null);
    setEditTags(post.tags?.map(t => t.id) ?? []);
    if (allTags.length === 0) getTags().then(setAllTags);
    setEditModalOpen(true);
  };

  const handleSaveEditPost = async () => {
    if (!post) return;
    const t = editTitle.trim();
    const c = editContent.trim();
    if (!t || !c) return;
    setSavingEdit(true);
    const updated = await updatePost(post.id, {
      title:    t,
      content:  c,
      caseType: editCaseType,
      isUrgent: editIsUrgent,
      city:     editCity,
      tagIds:   editTags,
    });
    if (updated) {
      setPost(updated);
      toast.success("Publicación actualizada");
      setEditModalOpen(false);
    }
    setSavingEdit(false);
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => {
      const removeById = (list: CommentDTO[]): CommentDTO[] =>
        list.filter(c => c.id !== commentId).map(c => ({
          ...c,
          replies: removeById(c.replies),
        }));
      return removeById(prev);
    });
    setPost(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
  };

  const handleCommentEdited = (commentId: string, content: string) => {
    const updateContent = (list: CommentDTO[]): CommentDTO[] =>
      list.map(c => c.id === commentId
        ? { ...c, content }
        : { ...c, replies: updateContent(c.replies) }
      );
    setComments(prev => updateContent(prev));
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={WHITE} />
          </Pressable>
        </View>
        <View style={styles.bodyBg}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <PostSkeleton />
            <View style={{ gap: 10 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.comment, { gap: 10 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <SkeletonBlock w={34} h={34} r={17} />
                    <View style={{ flex: 1, gap: 5 }}>
                      <SkeletonBlock w="40%" h={12} r={5} />
                      <SkeletonBlock w="25%" h={10} r={5} />
                    </View>
                  </View>
                  <SkeletonBlock h={13} r={5} />
                  <SkeletonBlock h={13} w="70%" r={5} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={WHITE} />
          </Pressable>
        </View>
        <View style={styles.bodyBg}>
          <View style={styles.centered}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="alert-circle-outline" size={28} color={TEXT3} />
            </View>
            <Text style={styles.notFoundText}>Publicación no encontrada</Text>
          </View>
        </View>
      </View>
    );
  }

  const isAnon      = post.visibility === "anonymous";
  const isOwnPost   = post.userId === currentUserId;
  const canChat     = !isOwnPost && !isAnon && !!currentUserId;
  const postStatus     = (post as any).status as "open" | "in_progress" | "closed";
  const clientAccepted = (post as any).clientAccepted as number | null;
  const takenByName    = (post as any).takenByName   as string | null;
  const takenExpiresAt = (post as any).takenExpiresAt as string | null;
  const takenByUserId  = (post as any).takenByUserId as string | null;
  const isLawyerUser   = (user?.user as any)?.rol?.nombre === "abogado";
  const canTake        = isLawyerUser && !isOwnPost && postStatus === "open";
  const canClose       = isOwnPost && postStatus !== "closed";
  const showDecision   = isOwnPost && postStatus === "in_progress" && clientAccepted === null;
  const procesoId      = post.procesoId ?? null;
  // Lawyer who took the case can create proceso once client accepted
  const canCreateProceso = isLawyerUser && takenByUserId === currentUserId && clientAccepted === 1 && !procesoId;

  // Countdown helper: "vence en Xh Ym" or "Expiró"
  const expiryLabel = (() => {
    if (!takenExpiresAt) return null;
    const ms = new Date(takenExpiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expirado";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `Vence en ${h}h ${m}m` : `Vence en ${m}m`;
  })();
  const authorName = isAnon ? "Anónimo" : (post.author?.name ?? "Usuario");
  const initial    = isAnon ? "?" : (post.author?.name?.[0]?.toUpperCase() ?? "?");
  const av         = getAvatarColor(isAnon ? "?" : authorName);

  const postSheetItems: ActionItem[] = isOwnPost
    ? [
        { label: "Editar publicación",   icon: "create-outline", onPress: openEditPost },
        { label: "Eliminar publicación", icon: "trash-outline",  color: ROSE, onPress: handleDeletePost },
      ]
    : [
        { label: "Reportar publicación", icon: "flag-outline", color: AMBER, onPress: () => setReportPostOpen(true) },
      ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top bar navy ── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={WHITE} />
          </Pressable>

          <View style={styles.topBarRight}>
            <View style={styles.topBarMeta}>
              <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.topBarMetaText}>{post.viewCount ?? 0}</Text>
            </View>
            <View style={styles.topBarMeta}>
              <Ionicons name="chatbubble-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.topBarMetaText}>{post.commentCount}</Text>
            </View>
            <Pressable
              onPress={() => setPostSheetOpen(true)}
              style={({ pressed }) => [styles.topBarMore, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.bodyBg}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Post card */}
            <View style={styles.postCard}>
              <View style={styles.postAccent} />
              <View style={styles.postInner}>

                {/* Author row */}
                <Tooltip label={isAnon ? "Publicación anónima" : "Ver perfil"}>
                  <Pressable
                    style={styles.postAuthorRow}
                    onPress={() => !isAnon && router.push(`/community/profile/${post.userId}` as any)}
                    disabled={isAnon}
                  >
                    <View style={[styles.postAvatar, isAnon ? styles.postAvatarAnon : { backgroundColor: av.bg }]}>
                      {isAnon
                        ? <Ionicons name="eye-off-outline" size={18} color={TEXT3} />
                        : <Text style={[styles.postAvatarText, { color: av.text }]}>{initial}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.authorNameRow}>
                        <Text style={[styles.postAuthorName, !isAnon && { color: NAVY }]}>{authorName}</Text>
                        {isAnon && (
                          <View style={styles.anonBadge}>
                            <Ionicons name="eye-off-outline" size={9} color={TEXT3} />
                            <Text style={styles.anonText}>Anónimo</Text>
                          </View>
                        )}
                        {isOwnPost && !isAnon && (
                          <View style={styles.ownBadge}>
                            <Text style={styles.ownBadgeText}>Tú</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.postDate}>{formatDate(post.createdAt, true)}</Text>
                    </View>
                    {!isAnon && (
                      <View style={styles.profileChevron}>
                        <Ionicons name="chevron-forward" size={13} color={TEAL} />
                      </View>
                    )}
                  </Pressable>
                </Tooltip>

                {/* ── Full-width status strip ── */}
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
                  marginBottom: 10,
                  backgroundColor:
                    postStatus === "open"        ? "#E8F8F2" :
                    postStatus === "in_progress" ? C.TEAL + "18" :
                    "#F3F4F6",
                }}>
                  <View style={{
                    width: 7, height: 7, borderRadius: 4, marginRight: 8,
                    backgroundColor:
                      postStatus === "open"        ? C.GREEN :
                      postStatus === "in_progress" ? C.TEAL :
                      C.TEXT3,
                  }} />
                  <Text style={{
                    fontSize: 13, fontWeight: "600",
                    color:
                      postStatus === "open"        ? C.GREEN :
                      postStatus === "in_progress" ? C.TEAL :
                      C.TEXT3,
                  }}>
                    {postStatus === "open"
                      ? "Buscando abogado"
                      : postStatus === "in_progress"
                      ? `En atención${takenByName ? ` · ${takenByName}` : ""}`
                      : "Caso resuelto"}
                  </Text>
                </View>

                {/* ── Meta strip: status · tipo · ciudad · urgencia ── */}
                <View style={styles.metaStrip}>
                  {/* Status pill */}
                  <View style={[
                    styles.metaPill,
                    postStatus === "open"        && styles.metaPillOpen,
                    postStatus === "in_progress" && styles.metaPillProgress,
                    postStatus === "closed"      && styles.metaPillClosed,
                  ]}>
                    <View style={[
                      styles.metaDot,
                      postStatus === "open"        && { backgroundColor: GREEN },
                      postStatus === "in_progress" && { backgroundColor: AMBER },
                      postStatus === "closed"      && { backgroundColor: TEXT3 },
                    ]} />
                    <Text style={[
                      styles.metaPillText,
                      postStatus === "open"        && { color: GREEN },
                      postStatus === "in_progress" && { color: AMBER },
                      postStatus === "closed"      && { color: TEXT3 },
                    ]}>
                      {postStatus === "open" ? "Abierto" : postStatus === "in_progress" ? "En progreso" : "Cerrado"}
                    </Text>
                  </View>

                  {/* Urgente */}
                  {post.isUrgent === 1 && (
                    <View style={[styles.metaPill, styles.metaPillUrgent]}>
                      <Ionicons name="flash" size={10} color={ROSE} />
                      <Text style={[styles.metaPillText, { color: ROSE }]}>Urgente</Text>
                    </View>
                  )}

                  {/* Tipo de caso */}
                  {post.caseType && (
                    <View style={[styles.metaPill, styles.metaPillType]}>
                      <Ionicons name="scale-outline" size={10} color={TEAL} />
                      <Text style={[styles.metaPillText, { color: TEAL }]}>
                        {CASE_TYPES.find(c => c.key === post.caseType)?.label ?? post.caseType}
                      </Text>
                    </View>
                  )}

                  {/* Ciudad */}
                  {post.city && (
                    <View style={[styles.metaPill, styles.metaPillCity]}>
                      <Ionicons name="location-outline" size={10} color={TEXT2} />
                      <Text style={[styles.metaPillText, { color: TEXT2 }]}>{post.city}</Text>
                    </View>
                  )}
                </View>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <View style={styles.postTags}>
                    {post.tags.map(tag => (
                      <View key={tag.id} style={styles.postTagChip}>
                        <Text style={styles.postTagText}>#{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Título */}
                <Text style={styles.postTitle}>{post.title}</Text>
                <View style={styles.postDivider} />
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Actions row */}
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionPill, liked && styles.actionPillLiked]}
                    onPress={handleLike}
                    disabled={liking}
                  >
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? ROSE : TEXT2} />
                    <Text style={[styles.actionPillText, liked && { color: ROSE, fontFamily: "Inter_600SemiBold" }]}>
                      {likeCount > 0 ? likeCount : "Me gusta"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionPill, bookmarked && styles.actionPillBookmarked]}
                    onPress={handleBookmark}
                    disabled={bookmarking}
                  >
                    <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={16} color={bookmarked ? TEAL : TEXT2} />
                    <Text style={[styles.actionPillText, bookmarked && { color: TEAL }]}>
                      {bookmarked ? "Guardado" : "Guardar"}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.actionPill} onPress={handleShare}>
                    <Ionicons name="share-outline" size={16} color={TEXT2} />
                    <Text style={styles.actionPillText}>Compartir</Text>
                  </Pressable>
                </View>

                {/* Chat button */}
                {canChat && (
                  <Pressable
                    style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.88 }]}
                    onPress={handleStartChat}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <ActivityIndicator size="small" color={WHITE} />
                    ) : (
                      <>
                        <View style={styles.chatBtnIcon}>
                          <Ionicons name="chatbubble-ellipses" size={16} color={WHITE} />
                        </View>
                        <View>
                          <Text style={styles.chatBtnText}>Chatear con el autor</Text>
                          <Text style={styles.chatBtnSub}>Envía un mensaje directo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: "auto" }} />
                      </>
                    )}
                  </Pressable>
                )}

                {/* ── Take case (lawyer only, open posts) ── */}
                {canTake && (
                  <Pressable
                    style={({ pressed }) => [styles.takeCaseBtn, pressed && { opacity: 0.88 }]}
                    onPress={handleTakeCase}
                    disabled={takingCase}
                  >
                    {takingCase ? (
                      <ActivityIndicator size="small" color={WHITE} />
                    ) : (
                      <>
                        <View style={styles.takeCaseBtnIcon}>
                          <Ionicons name="briefcase" size={16} color={WHITE} />
                        </View>
                        <View>
                          <Text style={styles.takeCaseBtnText}>Tomar este caso</Text>
                          <Text style={styles.takeCaseBtnSub}>El cliente sera notificado</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: "auto" }} />
                      </>
                    )}
                  </Pressable>
                )}

                {/* ── Decision panel: client accepts or rejects the lawyer ── */}
                {showDecision && (() => {
                  const lawyerInitial = (takenByName ?? "A").charAt(0).toUpperCase();
                  const lawyerAv      = getAvatarColor(takenByName ?? "A");
                  const isExpiringSoon = takenExpiresAt
                    ? new Date(takenExpiresAt).getTime() - Date.now() < 3_600_000
                    : false;
                  return (
                    <View style={styles.decisionCard}>
                      {/* Header accent */}
                      <View style={styles.decisionCardAccent} />

                      {/* Title row */}
                      <View style={styles.decisionTitleRow}>
                        <View style={styles.decisionTitleIcon}>
                          <Ionicons name="hand-right" size={14} color={TEAL} />
                        </View>
                        <Text style={styles.decisionCardTitle}>Un abogado quiere representarte</Text>
                      </View>

                      {/* Lawyer card */}
                      <View style={styles.decisionLawyerCard}>
                        <View style={[styles.decisionLawyerAvatar, { backgroundColor: lawyerAv.bg }]}>
                          <Text style={[styles.decisionLawyerAvatarText, { color: lawyerAv.text }]}>
                            {lawyerInitial}
                          </Text>
                          <View style={styles.decisionLawyerBadge}>
                            <Ionicons name="shield-checkmark" size={10} color={WHITE} />
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.decisionLawyerName}>{takenByName ?? "Abogado"}</Text>
                          <View style={styles.decisionLawyerMeta}>
                            <View style={styles.decisionVerifiedPill}>
                              <Ionicons name="shield-checkmark" size={10} color={TEAL} />
                              <Text style={styles.decisionVerifiedText}>Verificado</Text>
                            </View>
                            <Text style={styles.decisionLawyerRole}>· Abogado</Text>
                          </View>
                        </View>
                        {takenByUserId && (
                          <Pressable
                            style={({ pressed }) => [styles.decisionChatBtn, pressed && { opacity: 0.8 }]}
                            onPress={async () => {
                              const result = await startDirectChat(takenByUserId);
                              if (result?.id) router.push(`/chat/${result.id}` as any);
                            }}
                          >
                            <Ionicons name="chatbubble-ellipses" size={14} color={TEAL} />
                            <Text style={styles.decisionChatBtnText}>Chatear</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Countdown */}
                      {expiryLabel && (
                        <View style={[styles.decisionCountdown, isExpiringSoon && styles.decisionCountdownUrgent]}>
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={isExpiringSoon ? ROSE : AMBER}
                          />
                          <Text style={[styles.decisionCountdownText, isExpiringSoon && { color: ROSE }]}>
                            {expiryLabel} para tomar una decisión
                          </Text>
                        </View>
                      )}

                      {/* Note */}
                      <Text style={styles.decisionNote}>
                        Si aceptas, el abogado tendrá acceso a los detalles de tu caso y podrás comunicarte directamente con él.
                      </Text>

                      {/* Buttons */}
                      <View style={styles.decisionBtns}>
                        <Pressable
                          style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.88 }]}
                          onPress={handleAcceptTake}
                          disabled={acceptingCase || rejectingCase}
                        >
                          {acceptingCase
                            ? <ActivityIndicator size={14} color={WHITE} />
                            : <>
                                <Ionicons name="checkmark-circle" size={18} color={WHITE} />
                                <View>
                                  <Text style={styles.acceptBtnText}>Aceptar representación</Text>
                                  <Text style={styles.acceptBtnSub}>Confirmar a {takenByName ?? "este abogado"}</Text>
                                </View>
                              </>
                          }
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.88 }]}
                          onPress={handleRejectTake}
                          disabled={acceptingCase || rejectingCase}
                        >
                          {rejectingCase
                            ? <ActivityIndicator size={14} color={ROSE} />
                            : <>
                                <Ionicons name="close-circle-outline" size={16} color={ROSE} />
                                <Text style={styles.rejectBtnText}>Rechazar y buscar otro abogado</Text>
                              </>
                          }
                        </Pressable>
                      </View>
                    </View>
                  );
                })()}

                {/* ── Lawyer waiting card: lawyer took it, pending client decision ── */}
                {isLawyerUser && takenByUserId === currentUserId && clientAccepted === null && postStatus === "in_progress" && (
                  <View style={styles.waitingCard}>
                    <View style={styles.waitingCardTop}>
                      <View style={styles.waitingIconWrap}>
                        <Ionicons name="hourglass-outline" size={16} color={AMBER} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.waitingTitle}>Esperando respuesta del cliente</Text>
                        <Text style={styles.waitingSub}>
                          {expiryLabel ?? "El cliente debe aceptar tu solicitud"}
                        </Text>
                      </View>
                      <View style={styles.waitingDot} />
                    </View>
                    <Text style={styles.waitingNote}>
                      Si el cliente acepta, podrás crear o vincular un proceso jurídico. Si no responde antes de que expire, el caso volverá a estar disponible.
                    </Text>
                  </View>
                )}

                {/* ── Proceso vinculado ── */}
                {procesoId && (() => {
                  const rol = (user?.user as any)?.rol?.nombre;
                  const isCliente = rol === "cliente";
                  const navigateToProceso = () => {
                    if (isCliente) {
                      router.push({ pathname: "/portal/case", params: { id: procesoId } } as any);
                    } else {
                      router.push(`/case/${procesoId}` as any);
                    }
                  };
                  return (
                    <View style={styles.procesoCard}>
                      {/* Header row */}
                      <View style={styles.procesoCardHeader}>
                        <View style={styles.procesoCardIconWrap}>
                          <Ionicons name="briefcase" size={16} color={GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.procesoCardTitle}>
                            {isCliente ? "Tu caso tiene abogado" : "Proceso jurídico activo"}
                          </Text>
                          <Text style={styles.procesoCardSub}>
                            {isCliente
                              ? "Este caso ya está siendo gestionado"
                              : "Este post está vinculado a un proceso"}
                          </Text>
                        </View>
                        <View style={styles.procesoCardStatus}>
                          <View style={styles.procesoCardDot} />
                          <Text style={styles.procesoCardStatusText}>Activo</Text>
                        </View>
                      </View>

                      {/* Lawyer info row (show for client) */}
                      {isCliente && takenByName && (
                        <View style={styles.procesoLawyerRow}>
                          <View style={styles.procesoLawyerAvatar}>
                            <Text style={styles.procesoLawyerAvatarText}>
                              {takenByName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.procesoLawyerName}>{takenByName}</Text>
                            <Text style={styles.procesoLawyerRole}>Abogado responsable</Text>
                          </View>
                          <View style={styles.procesoVerifiedBadge}>
                            <Ionicons name="shield-checkmark" size={11} color={TEAL} />
                            <Text style={styles.procesoVerifiedText}>Verificado</Text>
                          </View>
                        </View>
                      )}

                      {/* CTA */}
                      <Pressable
                        style={({ pressed }) => [styles.procesoCardBtn, pressed && { opacity: 0.85 }]}
                        onPress={navigateToProceso}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="eye-outline" size={15} color={WHITE} />
                          <Text style={styles.procesoCardBtnText}>
                            {isCliente ? "Ver mi proceso" : "Abrir proceso"}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={"rgba(255,255,255,0.7)"} />
                      </Pressable>
                    </View>
                  );
                })()}

                {/* ── Crear proceso / Vincular proceso existente ── */}
                {canCreateProceso && (
                  <View style={styles.procesoActionsWrap}>
                    <View style={styles.procesoActionsHeader}>
                      <View style={styles.procesoActionsIconWrap}>
                        <Ionicons name="git-merge-outline" size={14} color={TEAL} />
                      </View>
                      <Text style={styles.procesoActionsTitle}>Gestionar este caso</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <Pressable
                        style={({ pressed }) => [styles.procesoActionBtn, styles.procesoActionBtnPrimary, pressed && { opacity: 0.88 }]}
                        onPress={() => router.push({ pathname: "/case/new", params: { postId: post.id } } as any)}
                      >
                        <View style={styles.procesoActionBtnIcon}>
                          <Ionicons name="add-circle" size={18} color={WHITE} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.procesoActionBtnTitle}>Crear proceso</Text>
                          <Text style={styles.procesoActionBtnSub}>Nuevo expediente para este cliente</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={"rgba(255,255,255,0.6)"} />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.procesoActionBtn, styles.procesoActionBtnSecondary, pressed && { opacity: 0.88 }]}
                        onPress={openLinkModal}
                      >
                        <View style={[styles.procesoActionBtnIcon, { backgroundColor: NAVY + "22" }]}>
                          <Ionicons name="link" size={18} color={NAVY} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.procesoActionBtnTitle, { color: NAVY }]}>Vincular existente</Text>
                          <Text style={[styles.procesoActionBtnSub, { color: TEXT2 }]}>Asociar un proceso ya creado</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={TEXT3} />
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── Close/resolve (post owner only) ── */}
                {canClose && (
                  <Pressable
                    style={({ pressed }) => [styles.closeCaseBtn, pressed && { opacity: 0.88 }]}
                    onPress={handleCloseCase}
                    disabled={closingCase}
                  >
                    {closingCase ? (
                      <ActivityIndicator size="small" color={GREEN} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done-circle-outline" size={18} color={GREEN} />
                        <Text style={styles.closeCaseBtnText}>
                          {postStatus === "open" ? "Marcar como resuelto" : "Caso resuelto"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>


            {/* Recommended lawyers — only visible to clients, not to lawyers/firms */}
            {![EnumRol.ABOGADO.nombre, EnumRol.BUFETE.nombre].includes((user?.user as any)?.rol.nombre) && (
              <RecommendedLawyers postId={post.id} />
            )}

            {/* Comments section */}
            <View style={styles.commentsSection}>
              <View style={styles.commentsHeaderRow}>
                <View style={styles.commentCountChip}>
                  <Ionicons name="chatbubbles" size={12} color={TEAL} />
                  <Text style={styles.commentCountText}>
                    {comments.length === 0
                      ? "Sin comentarios"
                      : `${comments.length} comentario${comments.length !== 1 ? "s" : ""}`}
                  </Text>
                </View>
                <View style={styles.sectionLine} />
              </View>

              {comments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="chatbubbles-outline" size={26} color={TEXT3} />
                  </View>
                  <Text style={styles.emptyCommentsTitle}>Aún no hay comentarios</Text>
                  <Text style={styles.emptyCommentsText}>Sé el primero en comentar esta publicación</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {comments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      onDeleted={handleCommentDeleted}
                      onEdited={handleCommentEdited}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Input bar ── */}
          <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
            {replyTo && (
              <View style={styles.replyBanner}>
                <View style={styles.replyBannerLeft}>
                  <Ionicons name="return-down-forward-outline" size={13} color={TEAL} />
                  <Text style={styles.replyBannerText}>
                    Respondiendo a{" "}
                    <Text style={{ fontFamily: "Inter_700Bold", color: TEXT }}>{replyTo.name}</Text>
                  </Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={TEXT3} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder={isLawyerUser ? "Responde como abogado..." : "Comparte más detalles..."}
                placeholderTextColor={TEXT3}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <Tooltip label="Enviar comentario">
                <Pressable
                  style={({ pressed }) => [
                    styles.sendBtn,
                    (!commentText.trim() || submitting) && styles.sendBtnDisabled,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleSubmit}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Ionicons name="send" size={16} color={WHITE} />
                  }
                </Pressable>
              </Tooltip>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Post action sheet */}
      <ActionSheet
        visible={postSheetOpen}
        onClose={() => setPostSheetOpen(false)}
        items={postSheetItems}
      />
      <ReportModal
        visible={reportPostOpen}
        onClose={() => setReportPostOpen(false)}
        onSubmit={handleReportPost}
      />

      {/* ── Link existing proceso modal ── */}
      <Modal animationType="slide" transparent visible={linkModalOpen} onRequestClose={() => setLinkModalOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setLinkModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.linkModal}>
            <View style={styles.linkModalHeader}>
              <Ionicons name="link-outline" size={20} color={NAVY} />
              <Text style={styles.linkModalTitle}>Vincular proceso existente</Text>
              <Pressable onPress={() => setLinkModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={TEXT2} />
              </Pressable>
            </View>

            {loadingProc ? (
              <ActivityIndicator size="large" color={TEAL} style={{ paddingVertical: 32 }} />
            ) : procesos.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
                <Ionicons name="briefcase-outline" size={36} color={TEXT3} />
                <Text style={{ color: TEXT2, fontFamily: "Inter_400Regular" }}>No tienes procesos activos</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {procesos.map(p => (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [styles.linkProcesoRow, pressed && { backgroundColor: "#F4F6F8" }]}
                    onPress={() => handleLinkProceso(p.id)}
                    disabled={linkingProc === p.id}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkProcesoRadicado}>{p.radicado}</Text>
                      {!!p.clienteNombre && (
                        <Text style={styles.linkProcesoCliente}>{p.clienteNombre}</Text>
                      )}
                    </View>
                    {linkingProc === p.id
                      ? <ActivityIndicator size="small" color={TEAL} />
                      : <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                    }
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit post modal ── */}
      <Modal animationType="slide" visible={editModalOpen} onRequestClose={() => setEditModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.editPostScreen}>

            {/* Top bar */}
            <View style={styles.editPostTopBar}>
              <Pressable
                onPress={() => setEditModalOpen(false)}
                style={({ pressed }) => [styles.editPostCancelBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="arrow-back" size={20} color={WHITE} />
                <Text style={styles.editPostCancelBtnText}>Cancelar</Text>
              </Pressable>
              <Text style={styles.editPostTopTitle}>Editar publicación</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.editPostSaveBtn,
                  (!editTitle.trim() || !editContent.trim() || savingEdit) && styles.editPostSaveBtnDisabled,
                  pressed && editTitle.trim() && editContent.trim() && { opacity: 0.85 },
                ]}
                onPress={handleSaveEditPost}
                disabled={!editTitle.trim() || !editContent.trim() || savingEdit}
              >
                {savingEdit
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <><Ionicons name="checkmark" size={15} color={WHITE} /><Text style={styles.editPostSaveBtnText}>Guardar</Text></>
                }
              </Pressable>
            </View>

            {/* Body */}
            <ScrollView
              style={styles.editPostBody}
              contentContainerStyle={styles.editPostScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Título + Contenido */}
              <View style={styles.editPostFormCard}>
                <View style={styles.editPostFieldBlock}>
                  <Text style={styles.editPostLabel}>TÍTULO</Text>
                  <TextInput
                    style={styles.editPostTitleInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    maxLength={255}
                    placeholder="Título de la publicación"
                    placeholderTextColor={TEXT3}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.editPostFieldDivider} />
                <View style={styles.editPostFieldBlock}>
                  <Text style={styles.editPostLabel}>CONTENIDO</Text>
                  <TextInput
                    style={styles.editPostContentInput}
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                    placeholder="Contenido de la publicación"
                    placeholderTextColor={TEXT3}
                  />
                </View>
              </View>

              {/* Tipo de caso */}
              <View style={styles.editPostSectionRow}>
                <Text style={styles.editPostSectionTitle}>Tipo de caso</Text>
                <View style={styles.editPostSectionLine} />
                <Text style={styles.editPostSectionOptional}>opcional</Text>
              </View>
              <View style={styles.editPostCaseCard}>
                <View style={styles.editPostTagsWrap}>
                  {CASE_TYPES.map(ct => {
                    const active = editCaseType === ct.key;
                    return (
                      <Pressable
                        key={ct.key}
                        style={[styles.editPostTagChip, active && styles.editPostTagChipActive]}
                        onPress={() => setEditCaseType(active ? null : ct.key)}
                      >
                        {active && <Ionicons name="checkmark" size={12} color={WHITE} />}
                        <Text style={[styles.editPostTagChipText, active && styles.editPostTagChipTextActive]}>
                          {ct.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Urgente */}
              <View style={styles.editPostOptionCard}>
                <View style={[styles.editPostOptionIcon, { backgroundColor: editIsUrgent ? ROSE + "18" : "#F0F2F4" }]}>
                  <Ionicons name="flash-outline" size={20} color={editIsUrgent ? ROSE : TEXT3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editPostOptionLabel}>Caso urgente</Text>
                  <Text style={styles.editPostOptionDesc}>Requiere atención o respuesta rápida</Text>
                </View>
                <Switch
                  value={editIsUrgent}
                  onValueChange={setEditIsUrgent}
                  trackColor={{ false: "#E0E5EA", true: ROSE + "55" }}
                  thumbColor={editIsUrgent ? ROSE : WHITE}
                  ios_backgroundColor="#E0E5EA"
                />
              </View>

              {/* Ciudad */}
              <Pressable
                style={({ pressed }) => [styles.editPostCityCard, pressed && { opacity: 0.85 }]}
                onPress={() => setEditCityPickerOpen(true)}
              >
                <View style={[styles.editPostOptionIcon, { backgroundColor: editCity ? TEAL + "18" : "#F0F2F4" }]}>
                  <Ionicons name="location-outline" size={20} color={editCity ? TEAL : TEXT3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editPostLabel}>CIUDAD</Text>
                  <Text style={[styles.editPostCityValue, !editCity && styles.editPostCityPlaceholder]}>
                    {editCity ?? "Seleccionar municipio…"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={TEXT3} />
              </Pressable>

              {/* Tags */}
              {allTags.length > 0 && (
                <>
                  <View style={styles.editPostSectionRow}>
                    <Text style={styles.editPostSectionTitle}>Categorías</Text>
                    <View style={styles.editPostSectionLine} />
                  </View>
                  <View style={styles.editPostCaseCard}>
                    <View style={styles.editPostTagsWrap}>
                      {allTags.map(tag => {
                        const active = editTags.includes(tag.id);
                        return (
                          <Pressable
                            key={tag.id}
                            style={[styles.editPostTagChip, active && styles.editPostTagChipActive]}
                            onPress={() => setEditTags(prev =>
                              prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                            )}
                          >
                            {active && <Ionicons name="checkmark" size={12} color={WHITE} />}
                            <Text style={[styles.editPostTagChipText, active && styles.editPostTagChipTextActive]}>
                              #{tag.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <CityPickerModal
          visible={editCityPickerOpen}
          selected={editCity}
          onClose={() => setEditCityPickerOpen(false)}
          onSelect={setEditCity}
        />
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: NAVY },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  notFoundText: { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT2 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  topBarMetaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  topBarMore: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Body
  bodyBg: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // Post card
  postCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  postAccent: { height: 4, backgroundColor: TEAL },
  postInner:  { padding: 18 },

  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    backgroundColor: BG,
    borderRadius: 14,
    padding: 10,
  },
  postAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  postAvatarAnon: { backgroundColor: "#F0F2F4" },
  postAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  authorNameRow:  { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  postAuthorName: { fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT },
  anonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F2F4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  anonText: { fontSize: 10, fontFamily: "Inter_500Medium", color: TEXT3 },
  ownBadge: {
    backgroundColor: NAVY + "14",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: NAVY },
  postDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  profileChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TEAL + "12",
    alignItems: "center",
    justifyContent: "center",
  },

  // Meta strip
  metaStrip: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14, marginTop: 4 },
  metaPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
    backgroundColor: "#F0F2F4",
  },
  metaPillOpen:     { backgroundColor: GREEN + "14" },
  metaPillProgress: { backgroundColor: AMBER + "14" },
  metaPillClosed:   { backgroundColor: "#EAEEF2" },
  metaPillUrgent:   { backgroundColor: ROSE  + "12" },
  metaPillType:     { backgroundColor: TEAL  + "12" },
  metaPillCity:     { backgroundColor: "#F0F2F4" },
  metaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEXT3 },
  metaPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT2 },

  // Post tags
  postTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  postTagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: TEAL + "12",
    borderWidth: 1,
    borderColor: TEAL + "20",
  },
  postTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },

  postTitle: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    lineHeight: 30,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  postDivider: { height: 1, backgroundColor: "#EEF1F4", marginBottom: 14 },
  postContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    lineHeight: 25,
    marginBottom: 20,
  },

  // Action pills
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: "#E0E5EA",
  },
  actionPillLiked:      { backgroundColor: ROSE + "0D",  borderColor: ROSE + "35" },
  actionPillBookmarked: { backgroundColor: TEAL + "0D",  borderColor: TEAL + "35" },
  actionPillText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },

  // Chat button
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },
  chatBtnSub:  { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 1 },

  // Comments section
  commentsSection: { marginBottom: 8 },
  commentsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  commentCountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: TEAL + "14",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  commentCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#E8ECF0" },

  // Comment item
  comment: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  commentReply: {
    backgroundColor: "#FAFBFC",
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: TEAL + "35",
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 12,
    marginTop: 8,
  },
  threadLine: {
    position: "absolute",
    left: -2,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: TEAL + "35",
    borderRadius: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  commentAuthorBtn:  { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  commentAuthor:     { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  youBadge:          { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  commentDate:       { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 1 },
  commentActions:    { flexDirection: "row", alignItems: "center", gap: 6 },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: TEAL + "12",
  },
  replyBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEAL },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    lineHeight: 22,
  },
  repliesWrap: { marginTop: 4, gap: 0 },

  // Inline edit
  editWrap:   { marginTop: 4 },
  editInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    padding: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    minHeight: 60,
    maxHeight: 120,
  },
  editBtns:       { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  editCancel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E5EA",
  },
  editCancelText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  editSave: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: TEAL,
    minWidth: 70,
    alignItems: "center",
  },
  editSaveText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Empty states
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEF1F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyComments: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: WHITE,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyCommentsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT2, marginBottom: 4 },
  emptyCommentsText:  { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT3, textAlign: "center" },

  // Input bar
  inputBar: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: TEAL + "10",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  replyBannerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  replyBannerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: TEXT3, shadowOpacity: 0, elevation: 0 },

  // Action sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  sheetItemSelected: { backgroundColor: TEAL + "10" },
  sheetItemText: { fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F4F6F8",
    borderRadius: 14,
  },
  sheetCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2 },

  // Report modal
  reportTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    textAlign: "center",
    paddingVertical: 12,
  },
  reportSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: TEXT3,
    textAlign: "center",
    marginBottom: 8,
  },
  reportBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingBottom: 8,
  },
  reportCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F4F6F8",
    borderRadius: 14,
  },
  reportCancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT2 },
  reportSubmit: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: ROSE,
    borderRadius: 14,
  },
  reportSubmitDisabled: { backgroundColor: TEXT3 },
  reportSubmitText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Edit post modal
  editPostSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  editPostHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E5EA",
    alignSelf: "center",
    marginBottom: 8,
  },
  editPostTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: TEXT,
    marginBottom: 4,
  },
  editPostLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: TEXT3,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  editPostTitleInput: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: TEXT,
  },
  editPostContentInput: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E5EA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT,
    minHeight: 140,
    maxHeight: 260,
  },
  editPostBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  editPostCancel: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#F4F6F8",
    borderRadius: 14,
  },
  editPostCancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT2 },
  editPostSave: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: TEAL,
    borderRadius: 14,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  editPostSaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Edit post full-screen modal ──
  editPostScreen: { flex: 1, backgroundColor: NAVY },
  editPostTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 18,
  },
  editPostCancelBtn:     { flexDirection: "row", alignItems: "center", gap: 6 },
  editPostCancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  editPostTopTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    flex: 1,
    textAlign: "center",
  },
  editPostSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editPostSaveBtnDisabled: { backgroundColor: "rgba(255,255,255,0.2)" },
  editPostSaveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  editPostBody: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  editPostScroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, gap: 12 },

  editPostFormCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  editPostFieldBlock: { paddingHorizontal: 16, paddingVertical: 12 },
  editPostFieldDivider: { height: 1, backgroundColor: "#EEF1F4", marginHorizontal: 16 },

  editPostSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  editPostSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  editPostSectionLine: { flex: 1, height: 1, backgroundColor: "#E0E5EA" },
  editPostSectionOptional: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: TEXT3,
    backgroundColor: "#EEF1F4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },

  editPostCaseCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  editPostTagsWrap:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editPostTagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: "#E0E5EA",
  },
  editPostTagChipActive:     { backgroundColor: NAVY, borderColor: NAVY },
  editPostTagChipText:       { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  editPostTagChipTextActive: { color: WHITE, fontFamily: "Inter_600SemiBold" },

  editPostOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  editPostOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editPostOptionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 2 },
  editPostOptionDesc:  { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3 },

  editPostCityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  editPostCityValue:       { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT, marginTop: 3 },
  editPostCityPlaceholder: { color: TEXT3, fontFamily: "Inter_400Regular" },

  // ── Lawyer badge + CTA ──
  lawyerBadgeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  lawyerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: TEAL,
  },
  lawyerCtaLoading: { opacity: 0.6 },
  lawyerCtaText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Lawyer comment elevated styles ──
  commentLawyer: {
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    backgroundColor: "#F0FBFC",
    shadowColor: TEAL,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lawyerVerifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TEAL + "12",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  lawyerVerifiedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: TEAL,
    flex: 1,
  },
  lawyerVerifiedDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEAL + "50",
  },
  lawyerVerifiedStars: { flexDirection: "row", gap: 1 },

  // ── Full-width lawyer CTA ──
  lawyerCtaFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1.5,
    borderColor: TEAL + "35",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  lawyerCtaFullIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: TEAL + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  lawyerCtaFullTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: TEAL,
    marginBottom: 2,
  },
  lawyerCtaFullSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT3,
  },

  // ── Take / Close case buttons ──
  takeCaseBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: TEAL, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, marginTop: 10,
  },
  takeCaseBtnIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  takeCaseBtnText: { fontSize: 14, fontFamily: "Inter_700Bold",    color: WHITE },
  takeCaseBtnSub:  { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 1 },

  closeCaseBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: GREEN + "14", borderWidth: 1.5, borderColor: GREEN + "40",
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8,
  },
  closeCaseBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GREEN },

  // ── Decision panel (accept / reject) ──
  decisionPanel: {   // kept for safety, unused now
    marginTop: 12, borderRadius: 16, borderWidth: 1.5,
    borderColor: TEAL + "30", backgroundColor: TEAL + "08", padding: 14, gap: 12,
  },
  decisionHeader:  { flexDirection: "row", alignItems: "center", gap: 10 },
  decisionIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: TEAL + "18", alignItems: "center", justifyContent: "center" },
  decisionTitle:   { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  decisionExpiry:  { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2 },

  // Decision card (new rich version)
  decisionCard: {
    marginTop: 12, borderRadius: 18, overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: TEAL + "25",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  decisionCardAccent: {
    height: 4, backgroundColor: TEAL,
  },
  decisionTitleRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  decisionTitleIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: TEAL + "14", alignItems: "center", justifyContent: "center",
  },
  decisionCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT },

  decisionLawyerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F8FAFB", marginHorizontal: 12, marginTop: 10,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#EEF1F4",
  },
  decisionLawyerAvatar: {
    width: 50, height: 50, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, position: "relative",
  },
  decisionLawyerAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  decisionLawyerBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: TEAL, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: WHITE,
  },
  decisionLawyerName: { fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT },
  decisionLawyerMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  decisionVerifiedPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: TEAL + "14", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  decisionVerifiedText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: TEAL },
  decisionLawyerRole:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3 },
  decisionChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: TEAL + "12", paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: TEAL + "25",
  },
  decisionChatBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEAL },

  decisionCountdown: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 12, marginTop: 10,
    backgroundColor: AMBER + "12", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: AMBER + "30",
  },
  decisionCountdownUrgent: { backgroundColor: ROSE + "10", borderColor: ROSE + "30" },
  decisionCountdownText: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: AMBER, flex: 1,
  },
  decisionNote: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 18,
    marginHorizontal: 16, marginTop: 10,
  },

  decisionBtns: { gap: 8, padding: 12, paddingTop: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center",
    gap: 10, backgroundColor: TEAL, borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 14,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  acceptBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  acceptBtnSub:  { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 1 },
  rejectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: ROSE + "10", borderWidth: 1.5, borderColor: ROSE + "30",
    borderRadius: 14, paddingVertical: 12,
  },
  rejectBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: ROSE },
  // ── Waiting card (lawyer pending client decision) ──
  waitingCard: {
    marginTop: 12, borderRadius: 16, overflow: "hidden",
    backgroundColor: AMBER + "0A", borderWidth: 1.5, borderColor: AMBER + "30",
    padding: 14, gap: 10,
  },
  waitingCardTop:  { flexDirection: "row", alignItems: "center", gap: 10 },
  waitingIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: AMBER + "18", alignItems: "center", justifyContent: "center" },
  waitingTitle:    { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  waitingSub:      { fontSize: 11, fontFamily: "Inter_400Regular", color: AMBER, marginTop: 2 },
  waitingDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER },
  waitingNote:     { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 18 },

  createProcesoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12,
  },
  createProcesoBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },

  // ── Proceso vinculado card ──
  procesoCard: {
    marginTop: 12, borderRadius: 16, overflow: "hidden",
    borderWidth: 1.5, borderColor: GREEN + "35",
    backgroundColor: GREEN + "08",
  },
  procesoCardHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, paddingBottom: 10,
  },
  procesoCardIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: GREEN + "20", alignItems: "center", justifyContent: "center",
  },
  procesoCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  procesoCardSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 1 },
  procesoCardStatus: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: GREEN + "18", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  procesoCardDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN,
  },
  procesoCardStatusText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GREEN },

  procesoLawyerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: WHITE, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: "#E8ECF0",
  },
  procesoLawyerAvatar: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: TEAL + "20", alignItems: "center", justifyContent: "center",
  },
  procesoLawyerAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: TEAL },
  procesoLawyerName:       { fontSize: 12, fontFamily: "Inter_700Bold", color: TEXT },
  procesoLawyerRole:       { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 1 },
  procesoVerifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: TEAL + "14", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  procesoVerifiedText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: TEAL },

  procesoCardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    margin: 14, marginTop: 4,
    backgroundColor: GREEN, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14,
  },
  procesoCardBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  // ── Crear / vincular proceso actions ──
  procesoActionsWrap: {
    marginTop: 12, borderRadius: 16, overflow: "hidden",
    borderWidth: 1.5, borderColor: TEAL + "28",
    backgroundColor: TEAL + "06", padding: 14, gap: 10,
  },
  procesoActionsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  procesoActionsIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: TEAL + "18", alignItems: "center", justifyContent: "center",
  },
  procesoActionsTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },

  procesoActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12,
  },
  procesoActionBtnPrimary:   { backgroundColor: TEAL },
  procesoActionBtnSecondary: { backgroundColor: WHITE, borderWidth: 1.5, borderColor: "#DDE3EA" },
  procesoActionBtnIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  procesoActionBtnTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  procesoActionBtnSub:   { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 1 },

  // Link proceso modal
  linkModal: {
    backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    marginTop: "auto", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32,
  },
  linkModalHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
  },
  linkModalTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },
  linkProcesoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F2F4",
  },
  linkProcesoRadicado: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT },
  linkProcesoCliente:  { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, marginTop: 2 },
});
