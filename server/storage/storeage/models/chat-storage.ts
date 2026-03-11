import { eq, and, desc, sql, inArray, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  conversations,
  conversationParticipants,
  messages,
  type InsertConversation,
  type InsertConversationParticipant,
  type InsertMessage,
  type Conversation,
  type ConversationParticipant,
  type Message,
  type ConversationDTO,
  type MessageDTO,
} from "@/shared/schema";
import { users } from "@/shared/schema/user.schema";
import type { Database } from "../database-storage";

export class ChatStorage {
  constructor(private db: Database) {}

  // ----------------------------------------------------------------
  // Conversations
  // ----------------------------------------------------------------

  async createConversation(data: InsertConversation): Promise<Conversation> {
    // Explicitly set timestamps to ensure correct timezone (UTC)
    const conversationData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.db.insert(conversations).values(conversationData);
    const result = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, data.id),
    });
    return result!;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });
  }

  /** Returns all conversations a user participates in, newest-updated first (paginated) */
  async getConversationsForUser(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<ConversationDTO[]> {
    // 1. Get conversation IDs this user is part of
    const participations = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (participations.length === 0) return [];

    const convIds = participations.map((p) => p.conversationId);

    // 2. Fetch conversations with pagination
    const convs = await this.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // 3. For each conversation, fetch participants (with user info) + last message
    const dtos: ConversationDTO[] = await Promise.all(
      convs.map(async (conv) => {
        const parts = await this.db
          .select({
            userId: conversationParticipants.userId,
            lastReadAt: conversationParticipants.lastReadAt,
            name: users.name,
            email: users.email,
          })
          .from(conversationParticipants)
          .leftJoin(users, eq(conversationParticipants.userId, users.id))
          .where(eq(conversationParticipants.conversationId, conv.id));

        const lastMsg = await this.db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isDeleted, false)
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Unread count: messages after lastReadAt for this user
        const myParticipation = parts.find((p) => p.userId === userId);
        let unreadCount = 0;
        if (myParticipation) {
          const unreadResult = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conv.id),
                eq(messages.isDeleted, false),
                myParticipation.lastReadAt
                  ? gt(messages.createdAt, myParticipation.lastReadAt)
                  : sql`1=1`
              )
            );
          unreadCount = Number(unreadResult[0]?.count ?? 0);
        }

        return {
          ...conv,
          participants: parts.map((p) => ({
            userId: p.userId,
            name: p.name ?? "",
            email: p.email ?? "",
            lastReadAt: p.lastReadAt,
          })),
          lastMessage: lastMsg[0] ?? null,
          unreadCount,
        };
      })
    );

    return dtos;
  }

  /** Get total count of conversations for a user */
  async getConversationsCount(userId: string): Promise<number> {
    const participations = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    return Number(participations[0]?.count ?? 0);
  }

  /** Find existing 1-to-1 conversation between two users */
  async findDirectConversation(
    userIdA: string,
    userIdB: string
  ): Promise<Conversation | undefined> {
    // Conversations where both users are participants
    const result = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userIdA));

    for (const { conversationId } of result) {
      const other = await this.db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userIdB)
          )
        )
        .limit(1);

      if (other.length > 0) {
        // Verify it's a direct (2-participant) conversation
        const total = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conversationId));

        if (Number(total[0]?.count) === 2) {
          return this.getConversation(conversationId);
        }
      }
    }
    return undefined;
  }

  // ----------------------------------------------------------------
  // Participants
  // ----------------------------------------------------------------

  async addParticipant(
    data: InsertConversationParticipant
  ): Promise<ConversationParticipant> {
    await this.db.insert(conversationParticipants).values(data);
    const result = await this.db.query.conversationParticipants.findFirst({
      where: eq(conversationParticipants.id, data.id),
    });
    return result!;
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getParticipantUserIds(conversationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    return rows.map((r) => r.userId);
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  // ----------------------------------------------------------------
  // Messages
  // ----------------------------------------------------------------

  async createMessage(data: InsertMessage): Promise<MessageDTO> {
    // Explicitly set createdAt to ensure correct timezone (UTC)
    const messageData = {
      ...data,
      type: data.type ?? "text",
      createdAt: new Date(),
    };
    
    await this.db.insert(messages).values(messageData);

    // Update conversation.updatedAt
    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));

    return this.getMessageWithSender(data.id);
  }

  async getMessageWithSender(messageId: string): Promise<MessageDTO> {
    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        senderName: users.name,
        senderEmail: users.email,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId))
      .limit(1);

    const row = rows[0];
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      content: row.content,
      type: row.type,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        name: row.senderName ?? "",
        email: row.senderEmail ?? "",
      },
    };
  }

  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageDTO[]> {
    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        senderName: users.name,
        senderEmail: users.email,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      content: row.content,
      type: row.type,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        name: row.senderName ?? "",
        email: row.senderEmail ?? "",
      },
    }));
  }

  async softDeleteMessage(messageId: string, userId: string): Promise<boolean> {
    const msg = await this.db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });
    if (!msg || msg.senderId !== userId) return false;
    await this.db
      .update(messages)
      .set({ isDeleted: true })
      .where(eq(messages.id, messageId));
    return true;
  }
}
