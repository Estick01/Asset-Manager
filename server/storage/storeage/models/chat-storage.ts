import { eq, and, desc, sql, inArray, gt } from "drizzle-orm";
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
    offset = 0,
    type?: Conversation["type"]
  ): Promise<ConversationDTO[]> {
    const participations = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (participations.length === 0) return [];

    const convIds = participations.map((p) => p.conversationId);

    const convs = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          inArray(conversations.id, convIds),
          type ? eq(conversations.type, type) : undefined
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

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
          .select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            content: messages.content,
            type: messages.type,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
            fileName: messages.fileName,
            fileSize: messages.fileSize,
            fileMime: messages.fileMime,
            fileHash: messages.fileHash,
          })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isDeleted, false)
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

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

        const rawLast = lastMsg[0];
        const lastMessage: Message | null = rawLast
          ? {
              id: rawLast.id,
              conversationId: rawLast.conversationId,
              senderId: rawLast.senderId,
              content: rawLast.content ?? null,
              type: rawLast.type,
              isDeleted: rawLast.isDeleted,
              createdAt: rawLast.createdAt,
              fileName: rawLast.fileName ?? null,
              fileSize: rawLast.fileSize ?? null,
              fileMime: rawLast.fileMime ?? null,
              fileHash: rawLast.fileHash ?? null,
            }
          : null;

        return {
          ...conv,
          participants: parts.map((p) => ({
            userId: p.userId,
            name: p.name ?? "",
            email: p.email ?? "",
            lastReadAt: p.lastReadAt,
          })),
          lastMessage,
          unreadCount,
        };
      })
    );

    return dtos;
  }

  async getConversationsCount(userId: string, type?: Conversation["type"]): Promise<number> {
    if (!type) {
      const participations = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId));
      return Number(participations[0]?.count ?? 0);
    }

    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .where(
        and(
          eq(conversationParticipants.userId, userId),
          eq(conversations.type, type)
        )
      );

    return Number(rows[0]?.count ?? 0);
  }

  /** Total de mensajes no leídos del usuario en todas sus conversaciones. */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, messages.conversationId),
          eq(conversationParticipants.userId, userId),
        )
      )
      .where(
        and(
          eq(messages.isDeleted, false),
          sql`(${conversationParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationParticipants.lastReadAt})`
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Finds a community conversation between two users that was started
   * from a specific post. Returns undefined if none exists.
   * Used by start-chat to enforce the one-conversation-per-(userA,userB,post) rule.
   */
  async findConversationByPost(
    userIdA: string,
    userIdB: string,
    sourcePostId: string
  ): Promise<Conversation | undefined> {
    // Get all community conversations for userA linked to this post
    const rows = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .innerJoin(
        conversations,
        eq(conversationParticipants.conversationId, conversations.id)
      )
      .where(
        and(
          eq(conversationParticipants.userId, userIdA),
          eq(conversations.type, "community"),
          eq(conversations.sourcePostId, sourcePostId)
        )
      );

    for (const { conversationId } of rows) {
      const other = await this.db
        .select({ id: conversationParticipants.id })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userIdB)
          )
        )
        .limit(1);

      if (other.length > 0) {
        return this.getConversation(conversationId);
      }
    }

    return undefined;
  }

  async findTwoPartyConversation(
    userIdA: string,
    userIdB: string,
    type: Conversation["type"]
  ): Promise<Conversation | undefined> {
    const result = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .where(
        and(
          eq(conversationParticipants.userId, userIdA),
          eq(conversations.type, type)
        )
      );

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
    const messageData = {
      ...data,
      type: data.type ?? "text",
      createdAt: new Date(),
    };

    await this.db.insert(messages).values(messageData);

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
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileMime: messages.fileMime,
        fileHash: messages.fileHash,
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
      content: row.content ?? null,
      type: row.type,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      fileName: row.fileName ?? null,
      fileSize: row.fileSize ?? null,
      fileMime: row.fileMime ?? null,
      fileHash: row.fileHash ?? null,
      sender: {
        id: row.senderId,
        name: row.senderName ?? "",
        email: row.senderEmail ?? "",
      },
    };
  }

  /**
   * Returns the raw message row including fileKey — for internal use only
   * (download endpoint). Never expose this to the frontend directly.
   */
  async getRawMessage(
    messageId: string
  ): Promise<(Message & { fileKey: string | null }) | undefined> {
    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        fileKey: messages.fileKey,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileMime: messages.fileMime,
        fileHash: messages.fileHash,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!rows[0]) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      conversationId: r.conversationId,
      senderId: r.senderId,
      content: r.content ?? null,
      type: r.type,
      isDeleted: r.isDeleted,
      createdAt: r.createdAt,
      fileKey: r.fileKey ?? null,
      fileName: r.fileName ?? null,
      fileSize: r.fileSize ?? null,
      fileMime: r.fileMime ?? null,
      fileHash: r.fileHash ?? null,
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
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileMime: messages.fileMime,
        fileHash: messages.fileHash,
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
      content: row.content ?? null,
      type: row.type,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      fileName: row.fileName ?? null,
      fileSize: row.fileSize ?? null,
      fileMime: row.fileMime ?? null,
      fileHash: row.fileHash ?? null,
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
