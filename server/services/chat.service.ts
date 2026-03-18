import { randomUUID } from "crypto";
import { storage } from "../storage/storeage/database-storage";
import { getPresignedDownloadUrl } from "./s3-storage";
import type {
  ConversationDTO,
  ConversationType,
  MessageDTO,
} from "@/shared/schema";

export class ChatService {
  /**
   * Get or create a direct (1-to-1) conversation between two users.
   * userIdA must already be validated as the authenticated caller.
   */
  async getOrCreateConversation(
    userIdA: string,
    userIdB: string,
    type: ConversationType
  ): Promise<ConversationDTO> {
    const existing = await storage.chat.findDirectConversation(userIdA, userIdB);
    if (existing) {
      const dtos = await storage.chat.getConversationsForUser(userIdA);
      return dtos.find((c) => c.id === existing.id)!;
    }

    const convId = randomUUID();
    await storage.chat.createConversation({ id: convId, type });

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

  async getConversations(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ conversations: ConversationDTO[]; total: number }> {
    const conversations = await storage.chat.getConversationsForUser(userId, limit, offset);
    const total = await storage.chat.getConversationsCount(userId);
    return { conversations, total };
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
