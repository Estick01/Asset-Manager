import { randomUUID } from "crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { storage } from "../storage/storeage/database-storage";
import { getPresignedDownloadUrl } from "./s3-storage";
import { subscriptionService } from "./subscription.service.js";
import type {
  ConversationDTO,
  ConversationType,
  MessageDTO,
} from "@/shared/schema";
import { roles, users } from "@/shared/schema";
import { ADMIN_ROLES } from "../admin/middleware/require-admin.js";
import type { JWTPayload } from "@/shared/model.schema.js";

export class ChatService {
  private async resolveSupportAgentUserId(requesterId: string): Promise<string> {
    const db = (storage as any).db;
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(roles, eq(users.rolId, roles.id))
      .where(
        and(
          eq(users.isActive, true),
          inArray(roles.nombre, ["admin_soporte", "admin_super", "admin_finanzas"]),
        )
      )
      .orderBy(
        sql`CASE ${roles.nombre}
          WHEN 'admin_soporte' THEN 0
          WHEN 'admin_super' THEN 1
          WHEN 'admin_finanzas' THEN 2
          ELSE 9
        END`,
        asc(users.createdAt),
      );

    const supportAgent = rows.find((row: { id: string }) => row.id !== requesterId) ?? rows[0];
    if (!supportAgent) {
      throw new Error("NO_SUPPORT_ADMIN");
    }

    return supportAgent.id;
  }

  async assertConversationAccess(user: JWTPayload, conversationId: string): Promise<{ id: string; type: ConversationType }> {
    const conversation = await storage.chat.getConversation(conversationId);
    if (!conversation) throw new Error("NotFound");

    const isMember = await storage.chat.isParticipant(conversationId, user.id);
    if (!isMember) throw new Error("Forbidden");

    if (conversation.type === "admin_support" || user.rol?.nombre === "cliente") {
      return { id: conversation.id, type: conversation.type };
    }

    const hasChat = await subscriptionService.hasFeature(user.id, "chat");
    if (!hasChat) throw new Error("FeatureUnavailable");

    return { id: conversation.id, type: conversation.type };
  }

  /**
   * Get or create a direct (1-to-1) conversation between two users.
   * userIdA must already be validated as the authenticated caller.
   */
  async getOrCreateConversation(
    userIdA: string,
    userIdB: string,
    type: ConversationType
  ): Promise<ConversationDTO> {
    const existing = await storage.chat.findTwoPartyConversation(userIdA, userIdB, type);
    if (existing) {
      const dtos = await storage.chat.getConversationsForUser(userIdA);
      return dtos.find((c) => c.id === existing.id)!;
    }

    const convId = randomUUID();
    await storage.chat.createConversation({
      id: convId,
      type,
      name: type === "admin_support" ? "Soporte LexTrack" : null,
    });

    await storage.chat.addParticipant({
      id: randomUUID(),
      conversationId: convId,
      userId: userIdA,
    });
    await storage.chat.addParticipant({
      id: randomUUID(),
      conversationId: convId,
      userId: userIdB,
    });

    const dtos = await storage.chat.getConversationsForUser(userIdA);
    return dtos.find((c) => c.id === convId)!;
  }

  async getOrCreateSupportConversationForUser(userId: string): Promise<ConversationDTO> {
    const supportAgentId = await this.resolveSupportAgentUserId(userId);
    return this.getOrCreateConversation(userId, supportAgentId, "admin_support");
  }

  async getOrCreateSupportConversationForAdmin(adminUserId: string, targetUserId: string): Promise<ConversationDTO> {
    return this.getOrCreateConversation(adminUserId, targetUserId, "admin_support");
  }

  async getConversations(
    userId: string,
    limit = 20,
    offset = 0,
    type?: ConversationType
  ): Promise<{ conversations: ConversationDTO[]; total: number }> {
    const conversations = await storage.chat.getConversationsForUser(userId, limit, offset, type);
    const total = await storage.chat.getConversationsCount(userId, type);
    return { conversations, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return storage.chat.getTotalUnreadCount(userId);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageDTO[]> {
    const isMember = await storage.chat.isParticipant(conversationId, userId);
    if (!isMember) throw new Error("Forbidden");
    // Return oldest-first for the UI
    const msgs = await storage.chat.getMessages(conversationId, limit, offset);
    return msgs;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageDTO> {
    const isMember = await storage.chat.isParticipant(conversationId, senderId);
    if (!isMember) throw new Error("Forbidden");

    return storage.chat.createMessage({
      id: randomUUID(),
      conversationId,
      senderId,
      content,
      type: "text",
    });
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await storage.chat.markRead(conversationId, userId);
  }

  /**
   * Get or create a community conversation between two users for a specific post.
   * Enforces one conversation per (userA, userB, postId).
   */
  async getOrCreateCommunityConversation(
    initiatorId: string,
    authorId: string,
    sourcePostId: string
  ): Promise<{ id: string }> {
    const existing = await storage.chat.findConversationByPost(initiatorId, authorId, sourcePostId);
    if (existing) return { id: existing.id };

    const convId = randomUUID();
    await storage.chat.createConversation({ id: convId, type: "community", sourcePostId });
    await storage.chat.addParticipant({ id: randomUUID(), conversationId: convId, userId: initiatorId });
    await storage.chat.addParticipant({ id: randomUUID(), conversationId: convId, userId: authorId });

    return { id: convId };
  }

  async getParticipantUserIds(conversationId: string): Promise<string[]> {
    return storage.chat.getParticipantUserIds(conversationId);
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    return storage.chat.softDeleteMessage(messageId, userId);
  }

  /**
   * Insert a file message after the file has already been uploaded to S3.
   * The caller is responsible for the S3 upload; this method only writes to DB.
   * fileKey is stored in DB but NEVER returned to the frontend.
   */
  async sendFileMessage(params: {
    conversationId: string;
    senderId: string;
    fileKey: string;
    fileName: string;
    fileSize: number;
    fileMime: string;
    fileHash: string;
  }): Promise<MessageDTO> {
    const isMember = await storage.chat.isParticipant(params.conversationId, params.senderId);
    if (!isMember) throw new Error("Forbidden");

    return storage.chat.createMessage({
      id: randomUUID(),
      conversationId: params.conversationId,
      senderId: params.senderId,
      content: null,
      type: "file",
      fileKey: params.fileKey,
      fileName: params.fileName,
      fileSize: params.fileSize,
      fileMime: params.fileMime,
      fileHash: params.fileHash,
    });
  }

  /**
   * Generate a short-lived signed URL (60 s) for a file message.
   * Validates that the requesting user is a participant before issuing the URL.
   */
  async getDownloadUrl(messageId: string, userId: string): Promise<string> {
    const msg = await storage.chat.getRawMessage(messageId);
    if (!msg || msg.type !== "file" || !msg.fileKey) {
      throw new Error("NotFound");
    }

    const isMember = await storage.chat.isParticipant(msg.conversationId, userId);
    if (!isMember) throw new Error("Forbidden");

    return getPresignedDownloadUrl(msg.fileKey, msg.fileName ?? "archivo", 60);
  }
}

export const chatService = new ChatService();
