# Community UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la interfaz de Community para que sea más atractiva, intuitiva y unificada visualmente, manteniendo la lógica de negocio existente.

**Architecture:** Refactor visual incremental — crear un archivo de tokens compartido y actualizar cada pantalla/componente para usarlo, mejorando jerarquía visual, navegación back, CTAs y organización de información sin tocar servicios ni backend.

**Tech Stack:** React Native, Expo Router, TypeScript, Ionicons, react-native-safe-area-context

**Spec:** `docs/superpowers/specs/2026-03-23-community-ui-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `constants/community-theme.ts` | CREATE | Single source of truth para todos los tokens de Community |
| `components/community/CommunityFeed.tsx` | MODIFY | Header unificado, tabs, CTA banner, PostCard mejorada |
| `components/community/LawyerMatchFeed.tsx` | MODIFY | Unificar estilo con CommunityFeed, section headers mejorados |
| `components/community/RecommendedLawyers.tsx` | MODIFY | LawyerCard mejorada con match %, botón Contactar más visible |
| `app/community/[id].tsx` | MODIFY | Status strip, back nav estandarizado, sticky comment input, restructura |
| `app/community/new.tsx` | MODIFY | Progress bar con labels, copy motivacional, success screen |

---

## Task 1: Crear design tokens compartidos

**Files:**
- Create: `constants/community-theme.ts`

- [ ] **Step 1: Crear el archivo de tokens**

```typescript
// constants/community-theme.ts

// ─── Color palette ────────────────────────────────────────────────────────
export const C = {
  NAVY:   "#0F2640",
  WHITE:  "#FFFFFF",
  BG:     "#F4F6F8",
  TEXT:   "#1B2B3B",
  TEXT2:  "#6B7B8D",
  TEXT3:  "#9AAABB",
  TEAL:   "#2196A6",
  TEAL_LIGHT: "#E8F4F5",
  GREEN:  "#27AE7A",
  AMBER:  "#F5A623",
  ROSE:   "#E05252",
  ROSE_LIGHT: "#FFF8F8",
  PURPLE: "#7C3AED",
  ORANGE: "#EA580C",
  BORDER: "#E8ECF0",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────
export const T = {
  postTitle:    { fontSize: 16, fontWeight: "600" as const, color: C.TEXT, lineHeight: 22 },
  postContent:  { fontSize: 14, fontWeight: "400" as const, color: C.TEXT, lineHeight: 20 },
  meta:         { fontSize: 12, fontWeight: "400" as const, color: C.TEXT2 },
  badgeLabel:   { fontSize: 11, fontWeight: "500" as const },
  sectionHeader:{ fontSize: 13, fontWeight: "600" as const, color: C.TEXT },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────
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
    shadowColor: C.NAVY,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardUrgent: {
    shadowColor: C.ROSE,
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
  familiar:       { bg: "#F5F3FF", text: C.PURPLE,  border: "#DDD6FE", icon: "people-outline",         label: "Familiar",       accent: C.PURPLE },
  mercantil:      { bg: "#ECFEFF", text: "#0891B2", border: "#A5F3FC", icon: "business-outline",       label: "Mercantil",      accent: "#0891B2" },
  administrativo: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", icon: "shield-outline",         label: "Administrativo", accent: "#16A34A" },
  tributario:     { bg: "#FFF7ED", text: C.ORANGE,  border: "#FED7AA", icon: "cash-outline",           label: "Tributario",     accent: C.ORANGE },
  inmobiliario:   { bg: "#F0FDFA", text: "#0F766E", border: "#99F6E4", icon: "home-outline",           label: "Inmobiliario",   accent: "#0F766E" },
  otro:           { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", icon: "help-circle-outline",    label: "Otro",           accent: "#6B7280" },
};

// ─── Avatar palette ───────────────────────────────────────────────────────
export const AVATAR_PALETTE = [
  { bg: "#E8F4FD", text: C.TEAL },
  { bg: "#E8F8F2", text: C.GREEN },
  { bg: "#FEF6E8", text: C.AMBER },
  { bg: "#FDEAEA", text: C.ROSE },
  { bg: "#EEE8FD", text: C.PURPLE },
  { bg: "#FDF0E8", text: C.ORANGE },
];

export function getAvatarColor(name: string) {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 65) % AVATAR_PALETTE.length];
}

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

// ─── Back button standard ─────────────────────────────────────────────────
// Usage: <BackButton /> anywhere in Community screens
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";

export function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{ padding: 4 }}
    >
      <Ionicons name="chevron-back" size={24} color={C.NAVY} />
    </Pressable>
  );
}
```

- [ ] **Step 2: Verificar que el archivo compila**

```bash
npx tsc --noEmit 2>&1 | grep "community-theme"
```
Expected: sin errores en ese archivo.

- [ ] **Step 3: Commit**

```bash
git add constants/community-theme.ts
git commit -m "feat: crear design tokens unificados para Community"
```

---

## Task 2: Mejorar CommunityFeed — header, tabs y PostCard

**Files:**
- Modify: `components/community/CommunityFeed.tsx`

Los cambios son quirúrgicos sobre el componente existente. No se toca la lógica de datos.

- [ ] **Step 1: Reemplazar tokens locales por imports del tema**

Al inicio del archivo, reemplazar el bloque `// ─── Tokens ───` (líneas 19-44 aprox) con:

```typescript
import { C, T, S, R, shadow, CASE_META, AVATAR_PALETTE, getAvatarColor, formatDate } from "@/constants/community-theme";

// Keep these local aliases for backwards compat within this file:
const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;
const PURPLE = C.PURPLE, ORANGE = C.ORANGE;
```

- [ ] **Step 2: Mejorar el componente PostCard dentro de CommunityFeed**

Busca el componente `PostCard` o donde se renderizan los items del FlatList. Agregar:

a) **Accent bar lateral** según tipo de caso:
```typescript
// Dentro del card View, antes del contenido:
<View style={{
  position: "absolute", left: 0, top: 0, bottom: 0,
  width: 3, borderTopLeftRadius: R.card, borderBottomLeftRadius: R.card,
  backgroundColor: CASE_META[post.caseType ?? "otro"]?.accent ?? C.TEXT3,
}} />
```

b) **Urgente: estilo diferenciado** — en el StyleSheet del card:
```typescript
// Aplicar condicionalmente al View del card:
style={[
  styles.card,
  post.isUrgent && { backgroundColor: C.ROSE_LIGHT, ...shadow.cardUrgent },
  !post.isUrgent && shadow.card,
]}
```

c) **Badge URGENTE** en top-right del card (si `post.isUrgent`):
```typescript
{post.isUrgent && (
  <View style={{
    position: "absolute", top: 10, right: 12,
    backgroundColor: C.ROSE, borderRadius: R.badge,
    paddingHorizontal: 7, paddingVertical: 2,
  }}>
    <Text style={{ ...T.badgeLabel, color: C.WHITE, fontSize: 10 }}>URGENTE</Text>
  </View>
)}
```

d) **Botón "Responder"** claro y teal al final de cada card:
```typescript
// En el footer row de la card, reemplazar o agregar:
<Pressable
  onPress={() => router.push(`/community/${post.id}`)}
  style={{
    backgroundColor: C.TEAL, borderRadius: R.button,
    paddingHorizontal: 14, paddingVertical: 7,
    flexDirection: "row", alignItems: "center", gap: 4,
  }}
>
  <Ionicons name="chatbubble-outline" size={13} color={C.WHITE} />
  <Text style={{ fontSize: 13, fontWeight: "600", color: C.WHITE }}>Responder</Text>
</Pressable>
```

- [ ] **Step 3: Agregar header unificado con botón CTA**

Busca el header/top-bar del componente y reemplazarlo con:

```typescript
{/* ── Header ── */}
<View style={{
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingHorizontal: S.cardPad, paddingVertical: 12,
  backgroundColor: C.WHITE, borderBottomWidth: 1, borderBottomColor: C.BORDER,
}}>
  <Text style={{ fontSize: 18, fontWeight: "700", color: C.NAVY }}>Comunidad</Text>
  <Pressable
    onPress={() => router.push("/community/new")}
    style={{
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: C.TEAL, borderRadius: R.button,
      paddingHorizontal: 14, paddingVertical: 8,
    }}
  >
    <Ionicons name="add" size={16} color={C.WHITE} />
    <Text style={{ fontSize: 13, fontWeight: "600", color: C.WHITE }}>Nueva publicación</Text>
  </Pressable>
</View>
```

- [ ] **Step 4: Agregar tabs (Todos / Para ti / Guardados)**

Debajo del header, antes del search bar:

```typescript
{/* ── Tabs ── */}
const TABS = ["Todos", "Para ti", "Guardados"] as const;
type Tab = typeof TABS[number];
const [activeTab, setActiveTab] = useState<Tab>("Todos");

// JSX:
<View style={{
  flexDirection: "row", backgroundColor: C.WHITE,
  borderBottomWidth: 1, borderBottomColor: C.BORDER,
}}>
  {TABS.map(tab => (
    <Pressable
      key={tab}
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1, alignItems: "center", paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? C.TEAL : "transparent",
      }}
    >
      <Text style={{
        fontSize: 14, fontWeight: activeTab === tab ? "600" : "400",
        color: activeTab === tab ? C.TEAL : C.TEXT2,
      }}>{tab}</Text>
    </Pressable>
  ))}
</View>
```

Nota: "Guardados" navega a `/community/bookmarks`, "Para ti" filtra por tipo de caso del usuario.

- [ ] **Step 5: Agregar banner motivacional cada 5 posts**

En el `renderItem` del FlatList, antes de retornar la card:

```typescript
// Mostrar banner cada 5 posts (índice 4, 9, 14...)
const showBanner = index > 0 && (index + 1) % 5 === 0;
const isLawyer = user?.rol?.nombre === "abogado" || user?.rol?.nombre === "firma";

// Banner JSX (renderizar antes de la card o entre items):
{showBanner && (
  <Pressable
    onPress={() => router.push("/community/new")}
    style={{
      backgroundColor: C.TEAL_LIGHT, borderRadius: R.card,
      marginHorizontal: S.cardPad, marginBottom: S.cardGap,
      padding: 14, flexDirection: "row", alignItems: "center", gap: 10,
    }}
  >
    <Ionicons name="megaphone-outline" size={22} color={C.TEAL} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.NAVY }}>
        {isLawyer
          ? "¿Tienes experiencia que compartir?"
          : "¿Tienes un caso legal?"}
      </Text>
      <Text style={{ fontSize: 12, color: C.TEXT2, marginTop: 2 }}>
        {isLawyer
          ? "Comparte tu experiencia con la comunidad →"
          : "Más de 200 abogados están listos para ayudarte →"}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={C.TEAL} />
  </Pressable>
)}
```

- [ ] **Step 6: Actualizar styles.card con el nuevo estilo**

```typescript
card: {
  backgroundColor: C.WHITE,
  borderRadius: R.card,
  marginHorizontal: S.cardPad,
  marginBottom: S.cardGap,
  padding: S.cardPad,
  paddingLeft: S.cardPad + 3, // espacio para accent bar
  overflow: "hidden",
  ...shadow.card,
},
```

- [ ] **Step 7: Verificar en simulador**

Abrir la pantalla Community en iOS sim — verificar:
- Header con botón "Nueva publicación" visible
- Cards con accent bar de color por tipo
- Cards urgentes con borde/fondo rosado
- Badge "URGENTE" visible en top-right
- Banner motivacional aparece cada 5 posts

- [ ] **Step 8: Commit**

```bash
git add components/community/CommunityFeed.tsx
git commit -m "feat(community): header unificado, PostCard mejorada, CTA banner"
```

---

## Task 3: Unificar LawyerMatchFeed con el nuevo estilo

**Files:**
- Modify: `components/community/LawyerMatchFeed.tsx`

- [ ] **Step 1: Reemplazar tokens locales por imports del tema**

Al inicio del archivo, reemplazar el bloque `// ─── Tokens ───` y `// ─── Case type meta ───` con:

```typescript
import { C, T, S, R, shadow, CASE_META, getAvatarColor, formatDate } from "@/constants/community-theme";

const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;
```

- [ ] **Step 2: Mejorar section headers**

Busca los headers de sección (🔥 Urgentes, 🎯 Recomendados, 🆕 Recientes) y reemplazarlos con:

```typescript
function SectionHeader({ emoji, title, count }: { emoji: string; title: string; count?: number }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: S.cardPad, paddingTop: S.sectionGap, paddingBottom: 10,
    }}>
      <View style={{ width: 2, height: 16, backgroundColor: C.TEAL, borderRadius: 1 }} />
      <Text style={{ ...T.sectionHeader, fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {emoji} {title}
      </Text>
      {count !== undefined && (
        <View style={{
          backgroundColor: C.TEAL_LIGHT, borderRadius: 10,
          paddingHorizontal: 7, paddingVertical: 1,
        }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: C.TEAL }}>{count}</Text>
        </View>
      )}
    </View>
  );
}
```

Uso: `<SectionHeader emoji="🔥" title="Urgentes" count={feed.urgent.length} />`

- [ ] **Step 3: Aplicar accent bar y urgente styling a MatchCard**

En el componente `MatchCard` (o equivalente), aplicar los mismos cambios que en Task 2 Step 2 — accent bar, urgent background, badge URGENTE.

- [ ] **Step 4: Agregar botón "Responder" consistente**

Asegurarse de que el botón de acción principal sea igual al de CommunityFeed:
```typescript
<Pressable
  onPress={() => router.push(`/community/${post.id}`)}
  style={{
    backgroundColor: C.TEAL, borderRadius: R.button,
    paddingHorizontal: 14, paddingVertical: 7,
    flexDirection: "row", alignItems: "center", gap: 4,
  }}
>
  <Ionicons name="chatbubble-outline" size={13} color={C.WHITE} />
  <Text style={{ fontSize: 13, fontWeight: "600", color: C.WHITE }}>Responder</Text>
</Pressable>
```

- [ ] **Step 5: Actualizar styles.card**

```typescript
card: {
  backgroundColor: C.WHITE,
  borderRadius: R.card,
  marginHorizontal: S.cardPad,
  marginBottom: S.cardGap,
  padding: S.cardPad,
  paddingLeft: S.cardPad + 3,
  overflow: "hidden",
  ...shadow.card,
},
```

- [ ] **Step 6: Commit**

```bash
git add components/community/LawyerMatchFeed.tsx
git commit -m "feat(community): unificar estilo LawyerMatchFeed con CommunityFeed"
```

---

## Task 4: Mejorar RecommendedLawyers

**Files:**
- Modify: `components/community/RecommendedLawyers.tsx`

- [ ] **Step 1: Reemplazar tokens locales por imports del tema**

```typescript
import { C, R, S, shadow, getAvatarColor } from "@/constants/community-theme";
const NAVY = C.NAVY, WHITE = C.WHITE, TEAL = C.TEAL, GREEN = C.GREEN;
const AMBER = C.AMBER, TEXT = C.TEXT, TEXT2 = C.TEXT2, TEXT3 = C.TEXT3;
```

- [ ] **Step 2: Agregar barra de progreso de match %**

En `LawyerCard`, reemplazar el `cardScoreBar` actual con una barra de progreso etiquetada:

```typescript
{/* Match % progress bar */}
<View style={{ marginBottom: 8 }}>
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
    <Text style={{ fontSize: 10, color: C.TEXT3 }}>Compatibilidad</Text>
    <Text style={{ fontSize: 10, fontWeight: "600", color: lawyer.isFallback ? C.AMBER : C.TEAL }}>
      {Math.round(lawyer.finalScore)}%
    </Text>
  </View>
  <View style={{ height: 4, backgroundColor: C.BORDER, borderRadius: 2, overflow: "hidden" }}>
    <View style={{
      width: `${lawyer.finalScore}%` as any,
      height: "100%",
      backgroundColor: lawyer.isFallback ? C.AMBER : C.TEAL,
      borderRadius: 2,
    }} />
  </View>
</View>
```

- [ ] **Step 3: Mejorar el botón "Contactar"**

```typescript
<Pressable
  onPress={handleContact}
  disabled={loading}
  style={{
    backgroundColor: loading ? C.BORDER : C.TEAL,
    borderRadius: R.button,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  }}
>
  {loading
    ? <ActivityIndicator size="small" color={C.WHITE} />
    : <>
        <Ionicons name="chatbubble-outline" size={13} color={C.WHITE} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: C.WHITE }}>Contactar</Text>
      </>
  }
</Pressable>
```

- [ ] **Step 4: Actualizar styles.card**

```typescript
card: {
  width: 160,
  backgroundColor: C.WHITE,
  borderRadius: R.card,
  padding: 12,
  marginRight: 10,
  overflow: "hidden",
  ...shadow.card,
},
```

- [ ] **Step 5: Agregar section header**

Encima del FlatList:
```typescript
<View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
  <View style={{ width: 2, height: 16, backgroundColor: C.TEAL, borderRadius: 1 }} />
  <Text style={{ fontSize: 13, fontWeight: "600", color: C.TEXT, textTransform: "uppercase", letterSpacing: 0.3 }}>
    🎯 Abogados disponibles
  </Text>
  {lawyers.length > 0 && (
    <View style={{ backgroundColor: C.TEAL_LIGHT, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: C.TEAL }}>{lawyers.length}</Text>
    </View>
  )}
</View>
```

- [ ] **Step 6: Commit**

```bash
git add components/community/RecommendedLawyers.tsx
git commit -m "feat(community): mejorar LawyerCard con match %, botón Contactar rediseñado"
```

---

## Task 5: Rediseñar detalle del post [id].tsx

**Files:**
- Modify: `app/community/[id].tsx`

- [ ] **Step 1: Reemplazar tokens locales por imports del tema**

```typescript
import { C, T, S, R, shadow, CASE_META, getAvatarColor, formatDate } from "@/constants/community-theme";
const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;
```

- [ ] **Step 2: Estandarizar back navigation**

Busca el header con el botón de volver y reemplazarlo:

```typescript
{/* ── Header ── */}
<View style={{
  flexDirection: "row", alignItems: "center",
  paddingHorizontal: S.cardPad, paddingVertical: 12,
  backgroundColor: C.WHITE, borderBottomWidth: 1, borderBottomColor: C.BORDER,
  gap: 10,
}}>
  <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
    <Ionicons name="chevron-back" size={24} color={C.NAVY} />
  </Pressable>
  <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: C.NAVY }} numberOfLines={1}>
    Detalle del caso
  </Text>
  {/* overflow menu (···) si existe */}
  {isOwner && (
    <Pressable onPress={openActionSheet} hitSlop={12} style={{ padding: 4 }}>
      <Ionicons name="ellipsis-horizontal" size={22} color={C.NAVY} />
    </Pressable>
  )}
</View>
```

- [ ] **Step 3: Agregar status strip**

Después del header, antes del contenido del post:

```typescript
function StatusStrip({ status, takenByName }: { status: string; takenByName?: string }) {
  const configs = {
    open:        { bg: C.GREEN,  text: C.WHITE, label: "Buscando abogado",          icon: "search-outline" },
    in_progress: { bg: C.TEAL,   text: C.WHITE, label: `En atención${takenByName ? ` · ${takenByName}` : ""}`, icon: "person-outline" },
    closed:      { bg: C.TEXT3,  text: C.WHITE, label: "Caso resuelto",             icon: "checkmark-circle-outline" },
  };
  const cfg = configs[status as keyof typeof configs] ?? configs.open;

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: cfg.bg, paddingHorizontal: S.cardPad, paddingVertical: 8,
    }}>
      <Ionicons name={cfg.icon as any} size={14} color={cfg.text} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}
```

Agregar en el JSX justo después del header: `<StatusStrip status={post.status} takenByName={takenByName} />`

- [ ] **Step 4: Mejorar el sticky comment input**

Busca el input de comentario al final y asegúrate de que esté en un `KeyboardAvoidingView` con `position: absolute` o como último elemento fijo:

```typescript
{/* ── Sticky comment input ── */}
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={insets.bottom + 10}
>
  <View style={{
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    padding: 12, paddingBottom: insets.bottom + 12,
    backgroundColor: C.WHITE, borderTopWidth: 1, borderTopColor: C.BORDER,
  }}>
    <TextInput
      style={{
        flex: 1, backgroundColor: C.BG, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 9,
        fontSize: 14, color: C.TEXT, maxHeight: 100,
      }}
      placeholder={
        user?.rol?.nombre === "abogado" || user?.rol?.nombre === "firma"
          ? "Responde como abogado..."
          : "Comparte más detalles..."
      }
      placeholderTextColor={C.TEXT3}
      value={newComment}
      onChangeText={setNewComment}
      multiline
    />
    <Pressable
      onPress={handleSubmitComment}
      disabled={!newComment.trim() || submitting}
      style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: newComment.trim() ? C.TEAL : C.BORDER,
        alignItems: "center", justifyContent: "center",
      }}
    >
      {submitting
        ? <ActivityIndicator size="small" color={C.WHITE} />
        : <Ionicons name="arrow-up" size={18} color={C.WHITE} />
      }
    </Pressable>
  </View>
</KeyboardAvoidingView>
```

- [ ] **Step 5: Verificar scroll + sticky input**

En simulador iOS: escribir un comentario, verificar que el keyboard no tape el input.

- [ ] **Step 6: Commit**

```bash
git add app/community/[id].tsx
git commit -m "feat(community): status strip, back nav unificado, sticky comment input mejorado"
```

---

## Task 6: Mejorar flujo de crear post (new.tsx)

**Files:**
- Modify: `app/community/new.tsx`

- [ ] **Step 1: Reemplazar tokens locales por imports del tema**

```typescript
import { C, T, S, R, shadow, CASE_META } from "@/constants/community-theme";
const NAVY = C.NAVY, WHITE = C.WHITE, BG = C.BG, TEXT = C.TEXT;
const TEXT2 = C.TEXT2, TEXT3 = C.TEXT3, TEAL = C.TEAL;
const GREEN = C.GREEN, AMBER = C.AMBER, ROSE = C.ROSE;
```

- [ ] **Step 2: Reemplazar ProgressDot con ProgressBar con labels**

Reemplazar el componente `ProgressDot` y `pd` StyleSheet con:

```typescript
function ProgressBar({ step, total = 3 }: { step: number; total?: number }) {
  const STEP_LABELS = ["Contenido", "Tipo de caso", "Opciones"];
  return (
    <View style={{ paddingHorizontal: S.cardPad, paddingTop: 4, paddingBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
        {Array.from({ length: total }).map((_, i) => (
          <React.Fragment key={i}>
            {/* Circle */}
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: i < step ? C.GREEN : i === step ? C.TEAL : "rgba(255,255,255,0.25)",
              alignItems: "center", justifyContent: "center",
              borderWidth: i === step ? 2 : 0, borderColor: C.WHITE,
            }}>
              {i < step
                ? <Ionicons name="checkmark" size={13} color={C.WHITE} />
                : <Text style={{ fontSize: 11, fontWeight: "700", color: C.WHITE }}>{i + 1}</Text>
              }
            </View>
            {/* Line between circles */}
            {i < total - 1 && (
              <View style={{
                flex: 1, height: 2,
                backgroundColor: i < step ? C.GREEN : "rgba(255,255,255,0.2)",
              }} />
            )}
          </React.Fragment>
        ))}
      </View>
      {/* Step label */}
      <Text style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500" }}>
        Paso {step + 1} de {total}: {STEP_LABELS[step]}
      </Text>
    </View>
  );
}
```

Uso: `<ProgressBar step={currentStep} />` (donde `currentStep` es 0, 1 o 2)

- [ ] **Step 3: Agregar placeholder motivacional en Step 1**

En el TextInput del título:
```typescript
placeholder="Ej: Necesito ayuda con un contrato laboral"
```

En el TextInput del contenido:
```typescript
placeholder="Describe tu situación con el mayor detalle posible. Cuanto más detallas, mejores respuestas recibirás..."
```

Agregar tip motivacional debajo del contador de caracteres:
```typescript
{content.length > 50 && (
  <View style={{
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.TEAL_LIGHT, borderRadius: R.badge,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 6,
  }}>
    <Ionicons name="bulb-outline" size={13} color={C.TEAL} />
    <Text style={{ fontSize: 12, color: C.TEAL, flex: 1 }}>
      Los casos con más detalle reciben 3x más respuestas
    </Text>
  </View>
)}
```

- [ ] **Step 4: Mejorar grid de tipos de caso en Step 2**

Los chips de tipo de caso deben usar `CASE_META` para mostrar icono + color cuando están seleccionados:

```typescript
// Reemplazar el grid de tipos con:
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: S.cardPad }}>
  {CASE_TYPES.map(ct => {
    const meta = CASE_META[ct.key];
    const isSelected = selectedCaseType === ct.key;
    return (
      <Pressable
        key={ct.key}
        onPress={() => setSelectedCaseType(ct.key)}
        style={[{
          flexDirection: "row", alignItems: "center", gap: 6,
          paddingHorizontal: 12, paddingVertical: 9,
          borderRadius: R.badge + 4, borderWidth: 1.5,
          backgroundColor: isSelected ? meta.bg : C.WHITE,
          borderColor: isSelected ? meta.accent : C.BORDER,
        }]}
      >
        <Ionicons name={meta.icon as any} size={14} color={isSelected ? meta.accent : C.TEXT3} />
        <Text style={{ fontSize: 13, fontWeight: isSelected ? "600" : "400", color: isSelected ? meta.accent : C.TEXT2 }}>
          {ct.label}
        </Text>
      </Pressable>
    );
  })}
</View>
```

- [ ] **Step 5: Agregar pantalla de éxito**

Agregar estado `showSuccess` y pantalla de éxito tras crear post exitosamente:

```typescript
const [showSuccess, setShowSuccess] = useState(false);

// En el handler de submit, después de createPost():
setShowSuccess(true);

// JSX — mostrar en lugar del form:
{showSuccess && (
  <View style={{
    flex: 1, backgroundColor: C.BG,
    alignItems: "center", justifyContent: "center",
    padding: 40,
  }}>
    <View style={{
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: "#E8F8F2", alignItems: "center", justifyContent: "center",
      marginBottom: 20,
    }}>
      <Ionicons name="checkmark-circle" size={48} color={C.GREEN} />
    </View>
    <Text style={{ fontSize: 22, fontWeight: "700", color: C.NAVY, textAlign: "center", marginBottom: 8 }}>
      ¡Tu publicación está lista!
    </Text>
    <Text style={{ fontSize: 15, color: C.TEXT2, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
      Ya es visible para la comunidad legal
    </Text>
    <Pressable
      onPress={() => router.replace(`/community/${createdPostId}`)}
      style={{
        backgroundColor: C.TEAL, borderRadius: R.button,
        paddingHorizontal: 24, paddingVertical: 13,
        width: "100%", alignItems: "center", marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: C.WHITE }}>Ver mi publicación</Text>
    </Pressable>
    <Pressable
      onPress={() => router.replace("/community")}
      style={{
        borderWidth: 1.5, borderColor: C.NAVY, borderRadius: R.button,
        paddingHorizontal: 24, paddingVertical: 13,
        width: "100%", alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: C.NAVY }}>Volver al feed</Text>
    </Pressable>
  </View>
)}
```

Necesitarás guardar el `createdPostId` al momento de crear:
```typescript
const result = await createPost(payload);
setCreatedPostId(result.id); // agregar este estado
setShowSuccess(true);
```

- [ ] **Step 6: Estandarizar back nav del header**

```typescript
<Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
  <Ionicons name="chevron-back" size={24} color={C.WHITE} />
</Pressable>
```

- [ ] **Step 7: Verificar el flujo completo**

1. Tap "Nueva publicación" desde el feed
2. Completar Paso 1 (ver tip motivacional al escribir)
3. Avanzar a Paso 2 (ver chips de tipos con colores)
4. Avanzar a Paso 3 (ver reach preview)
5. Publicar → ver pantalla de éxito
6. Tap "Ver mi publicación" → navega al detalle

- [ ] **Step 8: Commit**

```bash
git add app/community/new.tsx
git commit -m "feat(community): progress bar, chips mejorados, success screen, copy motivacional"
```

---

## Verificación final

- [ ] Abrir CommunityFeed — verificar header con CTA, cards con accent bar, urgentes destacados, banner cada 5 posts
- [ ] Abrir LawyerMatchFeed — verificar section headers con acento teal, mismo estilo de cards
- [ ] Abrir detalle de post — verificar back `←` chevron, status strip, RecommendedLawyers con match %, sticky input
- [ ] Crear un post — verificar progress bar con labels, chips de tipo coloridos, success screen
- [ ] Verificar que no hay errores de TypeScript: `npx tsc --noEmit 2>&1 | grep -E "(community|CommunityFeed|LawyerMatch|RecommendedLawyers)"`
