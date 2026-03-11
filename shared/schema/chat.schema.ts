/**
 * Chat Schema
 * Tables for real-time messaging between firms, lawyers and clients.
 */

import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
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
  /** Who triggered this conversation: firm_lawyer | lawyer_client */
  type: mysqlEnum("type", ["firm_lawyer", "lawyer_client"]).notNull(),
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
  content: text("content").notNull(),
  type: mysqlEnum("type", ["text", "file"]).notNull().default("text"),
  /** Soft-delete flag */
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export type ConversationType = "firm_lawyer" | "lawyer_client";
export type MessageType = "text" | "file";

export interface Conversation {
  id: string;
  name: string | null;
  type: ConversationType;
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
  content: string;
  type: MessageType;
  isDeleted: boolean;
  createdAt: Date;
}

export interface InsertConversation {
  id: string;
  name?: string | null;
  type: ConversationType;
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
  content: string;
  type?: MessageType;
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

/** Message enriched with sender info */
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

export interface WsOutgoingMessage {
  type: "new_message" | "read_receipt" | "error" | "pong" | "notification";
  data?: MessageDTO | { conversationId: string; userId: string; readAt: string } | { message: string } | WsNotificationData;
}
