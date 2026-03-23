import { randomUUID } from "crypto";
import { storage } from "../storage/storeage/database-storage.js";
import { chatService } from "./chat.service.js";
import { matchingService } from "./matching.service.js";
import { broadcastToUser } from "../websocket/ws-server.js";
import type { Post, PostDTO, Comment, CommentDTO, Tag } from "@/shared/schema";
import type { PostsFilter } from "../storage/storeage/models/community-storage.js";

/** Helper: push a new_notification event to a user via WebSocket (fire-and-forget). */
function notify(userId: string, titulo: string, mensaje: string, tipo: string): void {
  broadcastToUser(userId, { type: "new_notification", data: { titulo, mensaje, tipo } });
}

export class CommunityService {

  // ── Posts ─────────────────────────────────────────────────────────────────

  async createPost(
    userId: string,
    data: { title: string; content: string; visibility?: "public" | "anonymous"; tagIds?: string[]; caseType?: string | null; isUrgent?: boolean; city?: string | null }
  ): Promise<PostDTO> {
    const post = await storage.community.createPost({
      userId,
      title:      data.title,
      content:    data.content,
      visibility: data.visibility,
      caseType:   data.caseType ?? null,
      isUrgent:   data.isUrgent ? 1 : 0,
      city:       data.city ?? null,
    });
    if (data.tagIds && data.tagIds.length > 0) {
      await storage.community.setPostTags(post.id, data.tagIds);
    }
    // Trigger lawyer matching asynchronously — never blocks the response
    matchingService.matchLawyersToPost(post).catch(() => {});
    return (await storage.community.getPostDTO(post.id, userId))!;
  }

  async getPosts(limit = 20, offset = 0, filter: PostsFilter = {}, userId?: string): Promise<PostDTO[]> {
    return storage.community.getPosts(limit, offset, filter, userId);
  }

  async getPost(id: string, userId?: string): Promise<PostDTO | undefined> {
    return storage.community.getPostDTO(id, userId);
  }

  async updatePost(postId: string, userId: string, data: { title?: string; content?: string; tagIds?: string[]; caseType?: string | null; isUrgent?: boolean; city?: string | null }): Promise<PostDTO> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.updatePost(postId, {
      title:    data.title,
      content:  data.content,
      caseType: data.caseType,
      isUrgent: data.isUrgent !== undefined ? (data.isUrgent ? 1 : 0) : undefined,
      city:     data.city,
    });
    if (data.tagIds !== undefined) {
      await storage.community.setPostTags(postId, data.tagIds);
    }
    return (await storage.community.getPostDTO(postId, userId))!;
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.deletePost(postId);
  }

  async incrementView(postId: string, userId?: string): Promise<void> {
    const post = await storage.community.getPost(postId);
    if (!post) return;
    // Don't count the author's own views
    if (userId && post.userId === userId) return;
    if (userId) {
      await storage.community.recordUserView(postId, userId);
    } else {
      await storage.community.incrementViewCount(postId);
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string | null
  ): Promise<Comment> {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");

    if (parentId) {
      const parent = await storage.community.getComment(parentId);
      if (!parent || parent.postId !== postId) throw new Error("Comentario padre inválido");
    }

    const comment = await storage.community.createComment({ postId, userId, content, parentId });

    // Notify post owner when someone else comments
    if (post.userId !== userId) {
      const commenter = await storage.users.getUserById(userId);
      const commenterName = commenter?.name ?? "Alguien";
      const titulo  = "Nuevo comentario";
      const mensaje = `${commenterName} comentó tu publicación "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.userId, "new_comment", titulo, mensaje,
        { postId, commentId: comment.id, commenterName },
      ).catch(() => {});
      notify(post.userId, titulo, mensaje, "new_comment");
    }

    // Notify parent comment author when someone replies
    if (parentId) {
      const parent = await storage.community.getComment(parentId);
      if (parent && parent.userId !== userId && parent.userId !== post.userId) {
        const commenter = await storage.users.getUserById(userId);
        const commenterName = commenter?.name ?? "Alguien";
        const titulo  = "Nueva respuesta";
        const mensaje = `${commenterName} respondió tu comentario`;
        await storage.appNotifications.createNotification(
          parent.userId, "new_reply", titulo, mensaje,
          { postId, commentId: comment.id, commenterName },
        ).catch(() => {});
        notify(parent.userId, titulo, mensaje, "new_reply");
      }
    }

    return comment;
  }

  async getComments(postId: string): Promise<CommentDTO[]> {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");
    return storage.community.getCommentsByPost(postId);
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<void> {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    if (comment.userId !== userId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.updateComment(commentId, content);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    if (comment.userId !== userId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.deleteComment(commentId);
  }

  // ── Likes ─────────────────────────────────────────────────────────────────

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    const result = await storage.community.togglePostLike(postId, userId);

    if (result.liked && post.userId !== userId) {
      const liker = await storage.users.getUserById(userId);
      const likerName = liker?.name ?? "Alguien";
      const titulo  = "Le gustó tu publicación";
      const mensaje = `A ${likerName} le gustó tu publicación "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.userId, "post_liked", titulo, mensaje,
        { postId, likerName },
      ).catch(() => {});
      notify(post.userId, titulo, mensaje, "post_liked");
    }

    return result;
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    return storage.community.toggleBookmark(postId, userId);
  }

  async getBookmarks(userId: string): Promise<PostDTO[]> {
    return storage.community.getBookmarkedPosts(userId);
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  async getTags(): Promise<Tag[]> {
    return storage.community.getAllTags();
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async reportPost(postId: string, reporterUserId: string, reason: string, detail?: string): Promise<void> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    await storage.community.createReport({ reporterUserId, postId, reason, detail });
  }

  async reportComment(commentId: string, reporterUserId: string, reason: string, detail?: string): Promise<void> {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    await storage.community.createReport({ reporterUserId, commentId, reason, detail });
  }

  // ── Chat integration ──────────────────────────────────────────────────────

  async startChat(postId: string, initiatorUserId: string): Promise<{ conversationId: string }> {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");
    if (post.userId === initiatorUserId) throw new Error("No puedes iniciar un chat contigo mismo");
    const result = await chatService.getOrCreateCommunityConversation(initiatorUserId, post.userId, postId);
    return { conversationId: result.id };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getUserProfile(userId: string, viewerUserId?: string) {
    return storage.community.getUserProfile(userId, viewerUserId);
  }

  // ── Case take ─────────────────────────────────────────────────────────────

  /**
   * Lawyer claims an open post.
   * - Updates post status to "in_progress"
   * - Notifies the post author (client) in real-time
   * - Notifies all other matched lawyers that the case is gone
   */
  async takePost(
    postId:       string,
    lawyerId:     string,   // lawyer_profiles.id
    lawyerUserId: string,   // users.id of the lawyer
    lawyerName:   string,
  ): Promise<PostDTO> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.status !== "open") throw Object.assign(new Error("Este caso ya fue tomado"), { status: 409 });

    const taken = await storage.community.takePost(postId, lawyerId, lawyerUserId);
    if (!taken) throw Object.assign(new Error("Este caso ya fue tomado"), { status: 409 });

    // Notify client (post author) — real-time
    const clientTitulo  = "¡Un abogado tomó tu caso!";
    const clientMensaje = `${lawyerName} ha aceptado revisar tu caso "${post.title}"`;
    await storage.appNotifications.createNotification(
      post.userId, "case_taken", clientTitulo, clientMensaje,
      { postId, lawyerId, lawyerName },
    ).catch(() => {});
    notify(post.userId, clientTitulo, clientMensaje, "case_taken");

    // Notify all other matched lawyers (fire-and-forget)
    storage.matching.getMatchedLawyerUserIds(postId).then(async (userIds) => {
      for (const uid of userIds) {
        if (uid === lawyerUserId) continue;
        const titulo  = "Caso ya tomado";
        const mensaje = `El caso "${post.title}" fue tomado por otro abogado`;
        await storage.appNotifications.createNotification(
          uid, "case_taken", titulo, mensaje, { postId },
        ).catch(() => {});
        notify(uid, titulo, mensaje, "case_taken");
      }
    }).catch(() => {});

    return (await storage.community.getPostDTO(postId, lawyerUserId))!;
  }

  /** Client rejects the lawyer who took their post → post reopens. */
  async rejectTake(postId: string, clientUserId: string): Promise<PostDTO> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== clientUserId) throw Object.assign(new Error("Sin permiso"), { status: 403 });

    const lawyerUserId = post.takenByUserId;
    const ok = await storage.community.rejectTake(postId, clientUserId);
    if (!ok) throw Object.assign(new Error("No hay representación pendiente"), { status: 409 });

    // Notify the rejected lawyer — real-time
    if (lawyerUserId) {
      const titulo  = "Representación rechazada";
      const mensaje = `El cliente rechazó tu solicitud para el caso "${post.title}"`;
      await storage.appNotifications.createNotification(
        lawyerUserId, "case_rejected", titulo, mensaje, { postId },
      ).catch(() => {});
      notify(lawyerUserId, titulo, mensaje, "case_rejected");
    }

    // Re-run matching so other lawyers see the post again
    matchingService.matchLawyersToPost(post).catch(() => {});

    return (await storage.community.getPostDTO(postId, clientUserId))!;
  }

  /** Client accepts the lawyer → confirms representation and links them as lawyer-client. */
  async acceptTake(postId: string, clientUserId: string): Promise<PostDTO> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== clientUserId) throw Object.assign(new Error("Sin permiso"), { status: 403 });

    const ok = await storage.community.acceptTake(postId, clientUserId);
    if (!ok) throw Object.assign(new Error("No hay representación pendiente"), { status: 409 });

    if (post.takenByUserId) {
      // Create lawyerClients relationship so the client appears in the lawyer's client list
      const [lawyerProfile, clientRecord] = await Promise.all([
        storage.abogados.getLawyerByUserId(post.takenByUserId),
        storage.clientes.getClienteByUser(clientUserId),
      ]);
      if (lawyerProfile && clientRecord) {
        const exists = await storage.lawyerClients.getActiveLawyerClient(lawyerProfile.id, clientRecord.id);
        if (!exists) {
          await storage.lawyerClients.createLawyerClient({
            id:        randomUUID(),
            lawyerId:  lawyerProfile.id,
            clientId:  clientRecord.id,
            createdBy: post.takenByUserId,
          });
        }
      }

      // Notify the lawyer — real-time
      const titulo  = "¡Representación aceptada!";
      const mensaje = `El cliente aceptó tu representación en "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.takenByUserId, "case_accepted", titulo, mensaje, { postId },
      ).catch(() => {});
      notify(post.takenByUserId, titulo, mensaje, "case_accepted");
    }

    return (await storage.community.getPostDTO(postId, clientUserId))!;
  }

  /**
   * Expire stale in_progress posts (48h timeout, no client response).
   * Call this lazily from any route — it's a no-op when nothing is stale.
   */
  async runExpiry(): Promise<void> {
    const expired = await storage.community.expireStale();
    for (const p of expired) {
      // Notify client — real-time
      const clientTitulo  = "Tu caso está disponible nuevamente";
      const clientMensaje = `El abogado no respondió a tiempo. Tu caso "${p.title}" está abierto de nuevo.`;
      await storage.appNotifications.createNotification(
        p.userId, "case_expired", clientTitulo, clientMensaje, { postId: p.id },
      ).catch(() => {});
      notify(p.userId, clientTitulo, clientMensaje, "case_expired");

      // Notify the lawyer whose reservation expired — real-time
      if (p.takenByUserId) {
        const lawyerTitulo  = "Reserva de caso expirada";
        const lawyerMensaje = `Tu reserva para el caso "${p.title}" expiró sin respuesta del cliente.`;
        await storage.appNotifications.createNotification(
          p.takenByUserId, "case_expired", lawyerTitulo, lawyerMensaje, { postId: p.id },
        ).catch(() => {});
        notify(p.takenByUserId, lawyerTitulo, lawyerMensaje, "case_expired");
      }
    }
  }

  /** Post author marks their own case as resolved. */
  async closePost(postId: string, userId: string): Promise<PostDTO> {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.closePost(postId, userId);
    return (await storage.community.getPostDTO(postId, userId))!;
  }
}

export const communityService = new CommunityService();
