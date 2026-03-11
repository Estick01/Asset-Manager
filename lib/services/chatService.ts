import { apiRequest } from "../query-client";
import type { ConversationDTO, ConversationType, MessageDTO } from "@/shared/schema";

// ----------------------------------------------------------------
// Conversations
// ----------------------------------------------------------------

export async function getConversations(
  limit = 20,
  offset = 0
): Promise<{ conversations: ConversationDTO[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await apiRequest("GET", `/api/chat/conversations?${params}`);
  if (!res.ok) throw new Error("Error al cargar conversaciones");
  return res.json();
}

export async function getOrCreateConversation(
  targetUserId: string,
  type: ConversationType
): Promise<ConversationDTO> {
  const res = await apiRequest("POST", "/api/chat/conversations", {
    targetUserId,
    type,
  });
  if (!res.ok) throw new Error("Error al crear conversación");
  return res.json();
}

// ----------------------------------------------------------------
// Messages
// ----------------------------------------------------------------

export async function getMessages(
  conversationId: string,
  limit = 20,
  offset = 0
): Promise<MessageDTO[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await apiRequest(
    "GET",
    `/api/chat/conversations/${conversationId}/messages?${params}`
  );
  if (!res.ok) throw new Error("Error al cargar mensajes");
  return res.json();
}

export async function sendMessageRest(
  conversationId: string,
  content: string
): Promise<MessageDTO> {
  const res = await apiRequest(
    "POST",
    `/api/chat/conversations/${conversationId}/messages`,
    { content }
  );
  if (!res.ok) throw new Error("Error al enviar mensaje");
  return res.json();
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiRequest("POST", `/api/chat/conversations/${conversationId}/read`);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/chat/messages/${messageId}`);
  if (!res.ok) throw new Error("Error al eliminar mensaje");
}
