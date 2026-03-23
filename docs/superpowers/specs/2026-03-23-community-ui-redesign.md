# Community UI Redesign — Design Spec

## Context

The Community feature connects lawyers and clients in a legal-tech platform. Currently the interface has inconsistent styles between LawyerMatchFeed and CommunityFeed, cluttered information hierarchy, non-standardized back navigation, and lacks strong CTAs to encourage post creation. The goal is a polished, unified, and intuitive experience for both user types — lawyers seeking cases and clients seeking legal help — while preserving the existing color palette and business logic.

**Approach:** Incremental visual refactor (Option A) — no rewrites of business logic, only UI/UX improvements layered on top of existing components.

---

## Architecture

**New file:** `constants/community-theme.ts`
Single source of truth for all Community design tokens. Imported by all community screens and components.

**Modified files:**
- `components/community/CommunityFeed.tsx` — unified header, tabs, CTA banner, PostCard
- `components/community/LawyerMatchFeed.tsx` — unified with CommunityFeed style
- `components/community/PostCard.tsx` *(extract from feed or update existing)* — new card anatomy
- `components/community/RecommendedLawyers.tsx` — improved lawyer cards
- `app/community/[id].tsx` — restructured layout, sticky comment input, status badges
- `app/community/new.tsx` — improved progress bar, motivational copy, success screen

---

## Section 1: Design Tokens (`constants/community-theme.ts`)

### Typography
| Role | Size | Weight | Color |
|------|------|--------|-------|
| Post title | 16px | 600 | #1B2B3B |
| Post content | 14px | 400 | #1B2B3B |
| Meta (author, time) | 12px | 400 | #6B7B8D |
| Badge label | 11px | 500 | varies |
| Section header | 13px | 600 | #1B2B3B |

### Spacing (8dp grid)
- Card padding: 16px
- Between cards: 10px
- Section gap: 24px
- Header height: 56px

### Border radius
- Cards: 12px
- Badges: 6px
- Buttons: 10px
- Avatars: 9999px (circle)

### Elevation
- Normal card: `shadowColor: #0F2640, shadowOpacity: 0.06, elevation: 2`
- Urgent card: `shadowColor: #E05252, shadowOpacity: 0.12, elevation: 4`

### Palette (unchanged)
```
NAVY   = "#0F2640"
WHITE  = "#FFFFFF"
BG     = "#F4F6F8"
TEXT   = "#1B2B3B"
TEXT2  = "#6B7B8D"
TEXT3  = "#9AAABB"
TEAL   = "#2196A6"
GREEN  = "#27AE7A"
AMBER  = "#F5A623"
ROSE   = "#E05252"
```

### Back navigation standard
All Community screens: `Ionicons name="chevron-back"` size=24, color=NAVY, hitSlop=12 all sides. No text labels, no custom back buttons.

---

## Section 2: PostCard & Feed

### PostCard anatomy
```
[3px accent bar] [Avatar 36px] [Name · time]        [Type badge]
                 [Title — 2 lines max, semibold]
                 [Content preview — 3 lines, fade out]
                 [📍 City]  [⚡ URGENT badge — if urgent]
                 [♡ N]  [💬 N]  [↗]          [Responder →]
```

- **Accent bar:** 3px left border, color matches case type (`CASE_META[type].bg`)
- **Urgent cards:** Rose left border + `URGENTE` badge top-right + background `#FFF8F8`
- **Responder button:** Teal fill, rounded, right-aligned — visible and tappable without scrolling

### Feed layout
```
Header (sticky):
  [🏛 Community logo/title]     [+ Nueva publicación]

Search bar + [Filtros ▾] row

Tabs: Todos | Para ti | Guardados

List of PostCards (10px gap)
```

- `+ Nueva publicación` button: always visible in header, teal background, white text
- Tabs replace current filter chips — cleaner top area

### Motivational CTA banner (every 5 posts)
- **For clients:** *"¿Tienes un caso legal? Más de 200 abogados están listos para ayudarte →"*
- **For lawyers:** *"Comparte tu experiencia con la comunidad →"*
- Style: soft teal background `#E8F4F5`, teal text, rounded 12px, dismissable

### Empty state
- Illustration (simple SVG icon) + headline + subtext + large CTA button
- Example: *"Aún no hay publicaciones aquí"* / *"Sé el primero en compartir un caso →"*

### Unified style between LawyerMatchFeed and CommunityFeed
- Both use the same PostCard component
- LawyerMatchFeed section headers: `🔥 Urgentes`, `🎯 Para ti`, `🆕 Recientes` — styled as `TEXT2` 13px uppercase labels with a teal left accent 2px

---

## Section 3: Post Detail (`[id].tsx`)

### Header
```
← (back)    [Post title truncated]    [···] (overflow menu)
```

### Layout (top to bottom)
1. **Status strip** — full-width pill:
   - `Abierto` → green background, white text, *"Buscando abogado"*
   - `En progreso` → teal background, white text, *"En atención · [Lawyer name]"*
   - `Cerrado` → gray background, white text, *"Caso resuelto"*

2. **Post header block:**
   - Type badge + Urgent badge (if applicable)
   - Title (20px bold)
   - Meta row: `📍 Ciudad · ⏱ hace 3h · 👤 Anónimo`

3. **Post content:** Full text, line-height 1.6

4. **Tags row:** Horizontal scroll chips

5. **Action bar:** `♡ Like` · `💬 N comentarios` · `↗ Compartir` · Primary action button (`Tomar caso` / `Cerrar caso`)

6. **Recommended lawyers section** *(clients only)*:
   - Section header: *"🎯 Abogados disponibles (N)"*
   - Horizontal carousel of LawyerCards
   - Each card: avatar, name, top specialty, rating stars, match % progress bar, `Contactar` button

7. **Comments section:**
   - Section header with count: *"💬 Comentarios (12)"*
   - Lazy load — show 5 first, "Ver más" button
   - Each comment: avatar, name, time, text, `Responder` link
   - 2-level nesting only (current behavior kept)

8. **Sticky comment input (bottom):**
   - Fixed bar above safe-area inset
   - Placeholder: *"Responde como abogado..."* or *"Comparte más detalles..."* depending on role
   - Send button: teal arrow icon

### RecommendedLawyers card
```
[Avatar 48px]
[Name — 14px semibold]
[Specialty — 12px TEXT2]
[★★★★☆ 4.2]
[████░░ 92% compatible]
[Contactar →] (teal button, full width)
```
- Max 5 cards in carousel, 148px wide
- No overflow text (ellipsis)

---

## Section 4: Create Post (`new.tsx`)

### Progress indicator
Replace dots with labeled step bar:
```
● ─────── ○ ─────── ○
Paso 1       2       3
```
Active step: teal filled circle. Inactive: gray outline.

### Step 1 — Content
- Title input: placeholder *"Ej: Necesito ayuda con un contrato laboral"*
- Content textarea: tall (min 120px), placeholder *"Describe tu situación con el mayor detalle posible..."*
- Character counter: `0 / 5000` below textarea with color warning when >4500
- Motivational tip chip: `💡 Los casos con más detalle reciben 3x más respuestas`

### Step 2 — Case type
- 3×3 grid of type chips (icon + label)
- Selected: teal border 2px + teal tinted background `#E8F4F5`
- Unselected: gray border + white background
- Tap animation: scale 0.97 → 1.0

### Step 3 — Options
- `⚡ Urgente` — large toggle row with description text: *"Notifica inmediatamente a abogados disponibles"*
- City picker row with `📍` icon
- Anonymous toggle with description: *"Tu nombre no será visible en la publicación"*
- Reach preview card: *"~47 abogados serán notificados"* with teal progress bar

### Success screen (new)
```
✅ (large green checkmark)
¡Tu publicación está lista!
Ya es visible para la comunidad legal.

[Ver mi publicación]    (teal, filled)
[Volver al feed]        (ghost, navy border)
```

---

## Verification

1. Run app on iOS simulator — check all community screens render without errors
2. Verify PostCard shows urgent styling on posts with `isUrgent = true`
3. Verify back navigation works on: feed → detail, detail → feed, new post → feed
4. Verify `+ Nueva publicación` CTA is visible without scrolling on feed header
5. Verify post detail sticky comment input stays above keyboard on iOS/Android
6. Verify unified styles between LawyerMatchFeed and CommunityFeed sections
7. Verify success screen appears after creating a post
8. Verify step progress bar advances correctly through the 3 steps

---

## Files to Modify

| File | Change |
|------|--------|
| `constants/community-theme.ts` | **CREATE** — all design tokens |
| `components/community/CommunityFeed.tsx` | Unified header, tabs, CTA banner |
| `components/community/LawyerMatchFeed.tsx` | Unified style with CommunityFeed |
| `components/community/RecommendedLawyers.tsx` | Improved lawyer cards |
| `app/community/[id].tsx` | Status strip, sticky input, restructured layout |
| `app/community/new.tsx` | Progress bar, motivational copy, success screen |

## Files to Keep Unchanged
- All service files (`communityService.ts`, `matchingService.ts`, etc.)
- All schema/type files
- Backend routes
- Navigation structure
