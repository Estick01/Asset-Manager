import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// ─── Color palette ────────────────────────────────────────────────────────
export const C = {
  NAVY:       "#0F2640",
  WHITE:      "#FFFFFF",
  BG:         "#F4F6F8",
  TEXT:       "#1B2B3B",
  TEXT2:      "#6B7B8D",
  TEXT3:      "#9AAABB",
  TEAL:       "#2196A6",
  TEAL_LIGHT: "#E8F4F5",
  GREEN:      "#27AE7A",
  AMBER:      "#F5A623",
  ROSE:       "#E05252",
  ROSE_LIGHT: "#FFF8F8",
  PURPLE:     "#7C3AED",
  ORANGE:     "#EA580C",
  BORDER:     "#E8ECF0",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────
export const T = {
  postTitle:     { fontSize: 16, fontWeight: "600" as const, color: C.TEXT,  lineHeight: 22 },
  postContent:   { fontSize: 14, fontWeight: "400" as const, color: C.TEXT,  lineHeight: 20 },
  meta:          { fontSize: 12, fontWeight: "400" as const, color: C.TEXT2 },
  badgeLabel:    { fontSize: 11, fontWeight: "500" as const },
  sectionHeader: { fontSize: 13, fontWeight: "600" as const, color: C.TEXT  },
} as const;

// ─── Spacing (8dp grid) ───────────────────────────────────────────────────
export const S = {
  cardPad:    16,
  cardGap:    10,
  sectionGap: 24,
  headerH:    56,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────
export const R = {
  card:   12,
  badge:  6,
  button: 10,
  avatar: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────
export const shadow = {
  card: {
    shadowColor:  C.NAVY,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardUrgent: {
    shadowColor:  C.ROSE,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ─── Case type meta ───────────────────────────────────────────────────────
export const CASE_META: Record<string, {
  bg: string; text: string; border: string; icon: string; label: string; accent: string;
}> = {
  civil:          { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE", icon: "document-text-outline", label: "Civil",          accent: "#4F46E5" },
  penal:          { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", icon: "warning-outline",        label: "Penal",          accent: "#DC2626" },
  laboral:        { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", icon: "briefcase-outline",      label: "Laboral",        accent: "#D97706" },
  familiar:       { bg: "#F5F3FF", text: C.PURPLE,  border: "#DDD6FE", icon: "people-outline",         label: "Familiar",       accent: C.PURPLE  },
  mercantil:      { bg: "#ECFEFF", text: "#0891B2", border: "#A5F3FC", icon: "business-outline",       label: "Mercantil",      accent: "#0891B2" },
  administrativo: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", icon: "shield-outline",         label: "Administrativo", accent: "#16A34A" },
  tributario:     { bg: "#FFF7ED", text: C.ORANGE,  border: "#FED7AA", icon: "cash-outline",           label: "Tributario",     accent: C.ORANGE  },
  inmobiliario:   { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4", icon: "home-outline",           label: "Inmobiliario",   accent: "#0F766E" },
  otro:           { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", icon: "help-circle-outline",    label: "Otro",           accent: "#6B7280" },
};

// ─── Avatar palette ───────────────────────────────────────────────────────
export const AVATAR_PALETTE = [
  { bg: "#E8F4FD", text: C.TEAL   },
  { bg: "#E8F8F2", text: C.GREEN  },
  { bg: "#FEF6E8", text: C.AMBER  },
  { bg: "#FDEAEA", text: C.ROSE   },
  { bg: "#EEE8FD", text: C.PURPLE },
  { bg: "#FDF0E8", text: C.ORANGE },
];

export function getAvatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}

// ─── Date formatter ───────────────────────────────────────────────────────
export function formatDate(dateStr: string, full = false): string {
  const date = new Date(dateStr);
  if (full) {
    return date.toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)     return "ahora";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── Standard back button for all Community screens ───────────────────────
export function BackButton() {
  return React.createElement(
    Pressable,
    {
      onPress: () => router.back(),
      hitSlop: 12,
      style: { padding: 4 },
      accessibilityLabel: "Volver",
      accessibilityRole: "button",
    },
    React.createElement(Ionicons, {
      name: "chevron-back",
      size: 24,
      color: C.NAVY,
    })
  );
}
