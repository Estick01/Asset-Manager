/**
 * Chat Schema
 * Tables for real-time messaging between firms, lawyers and clients.
 */

import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  boolean,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { users } from "./user.schema";

// ============================================================
// conversations
// ============================================================
export const conversations = mysqlTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  /** Human-readable name, optional (e.g. group chats in the future) */
  name: varchar("name", { length: 200 }),
  /** Who triggered this conversation: firm_lawyer | lawyer_client | community | direct | admin_support */
  type: mysqlEnum("type", ["firm_lawyer", "lawyer_client", "community", "direct", "admin_support"]).notNull(),
  /** Set when type === "community" — links the conversation to its originating post */
  sourcePostId: varchar("source_post_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============================================================
// conversation_participants
// ============================================================
export const conversationParticipants = mysqlTable(
  "conversation_participants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    /** Last time the user read this conversation */
    lastReadAt: timestamp("last_read_at"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  }
);

// ============================================================
// messages
// ============================================================
export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 36 }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).notNull(),
  /** Null for file-type messages */
  content: text("content"),
  type: mysqlEnum("type", ["text", "file"]).notNull().default("text"),
  /** Soft-delete flag */
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ── File attachment fields ──────────────────────────────────
  /** Internal S3 key — NEVER exposed to the frontend */
  fileKey: varchar("file_key", { length: 500 }),
  /** Original filename shown to the user */
  fileName: varchar("file_name", { length: 255 }),
  /** File size in bytes */
  fileSize: int("file_size"),
  /** MIME type (e.g. image/png, application/pdf) */
  fileMime: varchar("file_mime", { length: 100 }),
  /** SHA-256 hex digest of the file buffer — for audit only */
  fileHash: varchar("file_hash", { length: 64 }),
});

// ============================================================
// Relations
// ============================================================
export const conversationsRelations = relations(
  conversations,
  ({ many }) => ({
    participants: many(conversationParticipants),
    messages: many(messages),
  })
);

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// ============================================================
// TypeScript interfaces
// ============================================================

export type ConversationType = "firm_lawyer" | "lawyer_client" | "community" | "direct" | "admin_support";
export type MessageType = "text" | "file";

export interface Conversation {
  id: string;
  name: string | null;
  type: ConversationType;
  sourcePostId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  lastReadAt: Date | null;
  joinedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  /** Null for file-type messages */
  content: string | null;
  type: MessageType;
  isDeleted: boolean;
  createdAt: Date;
  // File metadata — fileKey is NEVER included here
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
  fileHash: string | null;
}

export interface InsertConversation {
  id: string;
  name?: string | null;
  type: ConversationType;
  sourcePostId?: string | null;
}

export interface InsertConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
}

export interface InsertMessage {
  id: string;
  conversationId: string;
  senderId: string;
  /** Null for file-type messages */
  content: string | null;
  type?: MessageType;
  /** Internal S3 key — stored in DB but never exposed to clients */
  fileKey?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
  fileHash?: string | null;
}

/** Conversation enriched with participants and latest message */
export interface ConversationDTO extends Conversation {
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    lastReadAt: Date | null;
  }>;
  lastMessage: Message | null;
  unreadCount: number;
}

/** Message enriched with sender info — fileKey is NEVER present */
export interface MessageDTO extends Message {
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

/** WebSocket event payloads */
export interface WsIncomingMessage {
  type: "send_message" | "mark_read" | "join" | "ping";
  conversationId?: string;
  content?: string;
}

export interface WsNotificationData {
  conversationId: string;
  senderName: string;
  preview: string;
}

/** Payload pushed when a new proceso/tarea/document notification is created */
export interface WsAppNotificationData {
  titulo: string;
  mensaje: string;
  tipo: string;
}

/** Payload pushed when a firm invitation is created/updated */
export interface WsInvitationData {
  invitationId: string;
  firmName?: string;
  action: "created" | "accepted" | "rejected" | "cancelled";
}

/** Payload pushed when a new case is matched to a lawyer */
export interface WsCaseMatchData {
  postId:   string;
  title:    string;
  caseType: string | null;
  isUrgent: number;
  city:     string | null;
  score:    number;
}

export interface WsOutgoingMessage {
  type:
    | "new_message"
    | "read_receipt"
    | "error"
    | "pong"
    | "notification"
    | "new_notification"
    | "new_invitation"
    | "new_case_match";
  data?:
    | (MessageDTO & { tempId?: string })
    | { conversationId: string; userId: string; readAt: string }
    | { message: string }
    | WsNotificationData
    | WsAppNotificationData
    | WsInvitationData
    | WsCaseMatchData;
}
