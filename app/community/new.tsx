import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable,
  ScrollView, ActivityIndicator, Switch,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { createPost, getTags, type Tag } from "@/lib/services/communityService";
import { CityPickerModal } from "@/components/community/CityPickerModal";

// ─── Design tokens ────────────────────────────────────────────────────────
const NAVY  = "#0F2640";
const WHITE = "#FFFFFF";
const BG    = "#F0F3F6";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const TEAL  = "#2196A6";
const GREEN = "#27AE7A";
const AMBER = "#F5A623";
const ROSE  = "#E05252";
const CARD  = "#FFFFFF";

// ─── Case types with icons ────────────────────────────────────────────────
const CASE_TYPES: { key: string; label: string; icon: string }[] = [
  { key: "civil",          label: "Civil",          icon: "people-outline" },
  { key: "penal",          label: "Penal",          icon: "shield-outline" },
  { key: "laboral",        label: "Laboral",        icon: "briefcase-outline" },
  { key: "familiar",       label: "Familiar",       icon: "home-outline" },
  { key: "mercantil",      label: "Mercantil",      icon: "business-outline" },
  { key: "administrativo", label: "Administrativo", icon: "document-text-outline" },
  { key: "tributario",     label: "Tributario",     icon: "cash-outline" },
  { key: "inmobiliario",   label: "Inmobiliario",   icon: "map-outline" },
  { key: "otro",           label: "Otro",           icon: "ellipsis-horizontal-circle-outline" },
];

// ─── Progress step ────────────────────────────────────────────────────────
function ProgressDot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <View style={[
      pd.dot,
      done   && pd.done,
      active && !done && pd.active,
    ]}>
      {done && <Ionicons name="checkmark" size={10} color={WHITE} />}
    </View>
  );
}
const pd = StyleSheet.create({
  dot:    { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  done:   { backgroundColor: GREEN },
  active: { backgroundColor: "rgba(255,255,255,0.45)", borderWidth: 1.5, borderColor: WHITE },
});

// ─── Section header ────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, optional }: {
  icon: string; title: string; subtitle?: string; optional?: boolean;
}) {
  return (
    <View style={sh.wrap}>
      <View style={sh.iconWrap}>
        <Ionicons name={icon as any} size={14} color={TEAL} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={sh.title}>{title}</Text>
          {optional && <View style={sh.optPill}><Text style={sh.optText}>opcional</Text></View>}
        </View>
        {subtitle && <Text style={sh.sub}>{subtitle}</Text>}
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap:    { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  iconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: TEAL + "14", alignItems: "center", justifyContent: "center", marginTop: 1 },
  title:   { fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT },
  sub:     { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2 },
  optPill: { backgroundColor: "#F0F2F4", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  optText: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT3 },
});

// ─── Reach preview ────────────────────────────────────────────────────────
function ReachPreview({ caseType, city, isUrgent }: {
  caseType: string | null; city: string | null; isUrgent: boolean;
}) {
  const typeLabel = CASE_TYPES.find(c => c.key === caseType)?.label ?? null;

  if (!caseType && !city) {
    return (
      <View style={rp.wrap}>
        <View style={rp.iconWrap}>
          <Ionicons name="radio-outline" size={16} color={TEXT3} />
        </View>
        <Text style={rp.hint}>
          Selecciona el <Text style={rp.bold}>tipo de caso</Text> y tu <Text style={rp.bold}>ciudad</Text> para que abogados relevantes reciban una notificación automática.
        </Text>
      </View>
    );
  }

  return (
    <View style={[rp.wrap, rp.wrapActive]}>
      <View style={[rp.iconWrap, { backgroundColor: TEAL + "18" }]}>
        <Ionicons name="radio-outline" size={16} color={TEAL} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={rp.title}>Alcance estimado</Text>
        <Text style={rp.body}>
          Abogados
          {typeLabel ? <Text style={rp.bold}> especialistas en {typeLabel}</Text> : " de la plataforma"}
          {city ? <Text style={rp.bold}> en {city}</Text> : " de todo el país"}
          {" "}recibirán una notificación.
          {isUrgent && <Text style={{ color: ROSE }}> Este caso está marcado como urgente.</Text>}
        </Text>
      </View>
    </View>
  );
}
const rp = StyleSheet.create({
  wrap:       { flexDirection: "row", gap: 10, backgroundColor: "#F8FAFB", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E8ECF0", marginBottom: 24 },
  wrapActive: { backgroundColor: TEAL + "08", borderColor: TEAL + "28" },
  iconWrap:   { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EFF1F3", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title:      { fontSize: 12, fontFamily: "Inter_700Bold", color: TEAL },
  body:       { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT2, lineHeight: 18 },
  hint:       { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3, lineHeight: 18 },
  bold:       { fontFamily: "Inter_600SemiBold", color: TEXT },
});

// ─── Main screen ──────────────────────────────────────────────────────────
export default function NewPostScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [anonymous, setAnonymous]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tags, setTags]             = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [caseType, setCaseType]     = useState<string | null>(null);
  const [isUrgent, setIsUrgent]     = useState(false);
  const [city, setCity]             = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const contentRef = useRef<TextInput>(null);

  const titleOk   = title.trim().length >= 3;
  const contentOk = content.trim().length >= 1;
  const canSubmit = titleOk && contentOk;
  const charPct   = Math.min(content.length / 5000, 1);
  const charWarn  = content.length > 4500;

  // Progress steps
  const step1 = titleOk && contentOk;
  const step2 = !!caseType;
  const step3 = !!(city || isUrgent || anonymous || selectedTags.length > 0);

  useEffect(() => { getTags().then(setTags); }, []);

  const toggleTag = (id: string) =>
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const post = await createPost({
      title:      title.trim(),
      content:    content.trim(),
      visibility: anonymous ? "anonymous" : "public",
      tagIds:     selectedTags,
      caseType:   caseType || null,
      isUrgent,
      city:       city || null,
    });
    if (post) {
      toast.success("Publicación creada");
      router.replace(`/community/${post.id}` as any);
    }
    setSubmitting(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={20} color={WHITE} />
          </Pressable>

          {/* Progress dots */}
          <View style={styles.progress}>
            <ProgressDot done={step1} active={!step1} />
            <View style={styles.progressLine} />
            <ProgressDot done={step2} active={step1 && !step2} />
            <View style={styles.progressLine} />
            <ProgressDot done={step3} active={step1 && step2 && !step3} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.publishBtn,
              canSubmit && styles.publishBtnReady,
              (!canSubmit || submitting) && styles.publishBtnDisabled,
              pressed && canSubmit && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons name="send" size={13} color={WHITE} />
                <Text style={styles.publishText}>Publicar</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* Visibility badge */}
            <View style={styles.visibilityRow}>
              <View style={[
                styles.visibilityBadge,
                anonymous ? styles.visibilityBadgeAnon : styles.visibilityBadgePublic,
              ]}>
                <Ionicons
                  name={anonymous ? "eye-off-outline" : "globe-outline"}
                  size={12}
                  color={anonymous ? TEXT3 : TEAL}
                />
                <Text style={[styles.visibilityText, { color: anonymous ? TEXT3 : TEAL }]}>
                  {anonymous ? "Publicación anónima" : "Visible para todos"}
                </Text>
              </View>
              {isUrgent && (
                <View style={styles.urgentBadge}>
                  <Ionicons name="flash" size={11} color={ROSE} />
                  <Text style={styles.urgentBadgeText}>Urgente</Text>
                </View>
              )}
            </View>

            {/* ── 1. Contenido ── */}
            <SectionHeader
              icon="create-outline"
              title="Contenido"
              subtitle="Describe tu caso o consulta con claridad"
            />

            <View style={styles.formCard}>
              {/* Título */}
              <View style={styles.titleBlock}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="¿Cuál es tu consulta o situación?"
                  placeholderTextColor={TEXT3}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={255}
                  returnKeyType="next"
                  onSubmitEditing={() => contentRef.current?.focus()}
                />
                {title.length > 0 && !titleOk && (
                  <View style={styles.hintRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={AMBER} />
                    <Text style={styles.hintWarn}>Mínimo 3 caracteres</Text>
                  </View>
                )}
              </View>

              <View style={styles.fieldDivider} />

              {/* Contenido */}
              <View style={styles.contentBlock}>
                <Text style={styles.contentLabel}>DETALLE</Text>
                <TextInput
                  ref={contentRef}
                  style={styles.contentInput}
                  placeholder="Explica los hechos, fechas relevantes, qué necesitas..."
                  placeholderTextColor={TEXT3}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  maxLength={5000}
                />
                <View style={styles.charBarWrap}>
                  <View style={styles.charBarBg}>
                    <View style={[
                      styles.charBarFill,
                      { width: `${charPct * 100}%` as any },
                      charWarn && { backgroundColor: AMBER },
                    ]} />
                  </View>
                  <Text style={[styles.charCount, charWarn && { color: AMBER }]}>
                    {content.length}/5000
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 2. Tipo de caso ── */}
            <SectionHeader
              icon="scale-outline"
              title="Tipo de caso"
              subtitle="Ayuda a los abogados correctos a encontrarte"
              optional
            />

            <View style={styles.caseCard}>
              <View style={styles.caseGrid}>
                {CASE_TYPES.map(ct => {
                  const active = caseType === ct.key;
                  return (
                    <Pressable
                      key={ct.key}
                      style={({ pressed }) => [
                        styles.caseChip,
                        active && styles.caseChipActive,
                        pressed && !active && { opacity: 0.75 },
                      ]}
                      onPress={() => setCaseType(active ? null : ct.key)}
                    >
                      <Ionicons
                        name={ct.icon as any}
                        size={14}
                        color={active ? WHITE : TEXT3}
                      />
                      <Text style={[styles.caseChipText, active && styles.caseChipTextActive]}>
                        {ct.label}
                      </Text>
                      {active && (
                        <View style={styles.caseChipCheck}>
                          <Ionicons name="checkmark" size={9} color={TEAL} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── 3. Opciones ── */}
            <SectionHeader
              icon="options-outline"
              title="Opciones"
              subtitle="Personaliza la visibilidad y prioridad de tu publicación"
            />

            <View style={styles.optionsCard}>
              {/* Urgente */}
              <View style={[styles.optionRow, isUrgent && styles.optionRowUrgent]}>
                <View style={[styles.optionIconWrap, { backgroundColor: isUrgent ? ROSE + "18" : "#F0F2F4" }]}>
                  <Ionicons name="flash" size={18} color={isUrgent ? ROSE : TEXT3} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, isUrgent && { color: ROSE }]}>Caso urgente</Text>
                  <Text style={styles.optionDesc}>Notificación prioritaria a abogados</Text>
                </View>
                <Switch
                  value={isUrgent}
                  onValueChange={setIsUrgent}
                  trackColor={{ false: "#E0E5EA", true: ROSE + "55" }}
                  thumbColor={isUrgent ? ROSE : WHITE}
                  ios_backgroundColor="#E0E5EA"
                />
              </View>

              <View style={styles.optionDivider} />

              {/* Ciudad */}
              <Pressable
                style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.8 }]}
                onPress={() => setCityPickerOpen(true)}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: city ? TEAL + "15" : "#F0F2F4" }]}>
                  <Ionicons name="location-outline" size={18} color={city ? TEAL : TEXT3} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Ciudad</Text>
                  <Text style={[styles.optionDesc, city && { color: TEAL, fontFamily: "Inter_500Medium" }]}>
                    {city ?? "Seleccionar municipio…"}
                  </Text>
                </View>
                {city ? (
                  <Pressable onPress={() => setCity(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={TEXT3} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={TEXT3} />
                )}
              </Pressable>

              <View style={styles.optionDivider} />

              {/* Anónimo */}
              <View style={[styles.optionRow, anonymous && styles.optionRowAnon]}>
                <View style={[styles.optionIconWrap, { backgroundColor: anonymous ? "#F0F2F4" : TEAL + "12" }]}>
                  <Ionicons name="eye-off-outline" size={18} color={anonymous ? TEXT3 : TEAL} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Publicar de forma anónima</Text>
                  <Text style={styles.optionDesc}>
                    {anonymous ? "Tu nombre no será visible" : "Tu nombre aparecerá en la publicación"}
                  </Text>
                </View>
                <Switch
                  value={anonymous}
                  onValueChange={setAnonymous}
                  trackColor={{ false: "#E0E5EA", true: TEAL + "60" }}
                  thumbColor={anonymous ? TEAL : WHITE}
                  ios_backgroundColor="#E0E5EA"
                />
              </View>
            </View>

            <CityPickerModal
              visible={cityPickerOpen}
              selected={city}
              onClose={() => setCityPickerOpen(false)}
              onSelect={setCity}
            />

            {/* ── Categorías (si existen) ── */}
            {tags.length > 0 && (
              <>
                <SectionHeader
                  icon="pricetag-outline"
                  title="Categorías"
                  optional
                />
                <View style={styles.tagsCard}>
                  <View style={styles.tagsWrap}>
                    {tags.map(tag => {
                      const active = selectedTags.includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          style={[styles.tagChip, active && styles.tagChipActive]}
                          onPress={() => toggleTag(tag.id)}
                        >
                          {active && <Ionicons name="checkmark" size={11} color={WHITE} />}
                          <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                            #{tag.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* ── Reach preview ── */}
            <ReachPreview caseType={caseType} city={city} isUrgent={isUrgent} />

            {/* ── Publish CTA (mobile bottom) ── */}
            <Pressable
              style={({ pressed }) => [
                styles.bottomPublishBtn,
                canSubmit && styles.bottomPublishBtnReady,
                (!canSubmit || submitting) && styles.bottomPublishBtnDisabled,
                pressed && canSubmit && { opacity: 0.88 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <View style={styles.bottomPublishIcon}>
                    <Ionicons name="send" size={16} color={canSubmit ? TEAL : TEXT3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomPublishTitle, canSubmit && { color: WHITE }]}>
                      Publicar en la comunidad
                    </Text>
                    <Text style={[styles.bottomPublishSub, canSubmit && { color: "rgba(255,255,255,0.7)" }]}>
                      {canSubmit ? "Todo listo · los abogados serán notificados" : "Completa el título y contenido para continuar"}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={22}
                    color={canSubmit ? "rgba(255,255,255,0.6)" : TEXT3}
                  />
                </>
              )}
            </Pressable>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  progress: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressLine: { width: 20, height: 1.5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 1 },
  publishBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    minWidth: 90, justifyContent: "center",
  },
  publishBtnReady: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  publishBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  publishText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },

  // ── Body ──
  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },

  // ── Visibility row ──
  visibilityRow: { flexDirection: "row", gap: 8, marginBottom: 18, alignItems: "center" },
  visibilityBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  visibilityBadgePublic: { backgroundColor: TEAL + "14" },
  visibilityBadgeAnon:   { backgroundColor: "#EAEEF2" },
  visibilityText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  urgentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
    backgroundColor: ROSE + "14",
  },
  urgentBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: ROSE },

  // ── Form card (title + content) ──
  formCard: {
    backgroundColor: CARD, borderRadius: 18, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  titleBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  titleInput: {
    fontSize: 19, fontFamily: "Inter_700Bold", color: TEXT,
    paddingVertical: 4, lineHeight: 27, minHeight: 32,
  },
  hintRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  hintWarn: { fontSize: 11, fontFamily: "Inter_400Regular", color: AMBER },
  fieldDivider: { height: 1, backgroundColor: "#F0F2F4", marginHorizontal: 16 },
  contentBlock:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  contentLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold", color: TEXT3,
    letterSpacing: 1.2, marginBottom: 8,
  },
  contentInput: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT,
    paddingVertical: 0, minHeight: 160, lineHeight: 24,
  },
  charBarWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  charBarBg: {
    flex: 1, height: 3, backgroundColor: "#E8ECF0",
    borderRadius: 2, overflow: "hidden",
  },
  charBarFill: { height: 3, backgroundColor: TEAL, borderRadius: 2 },
  charCount: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3,
    minWidth: 48, textAlign: "right",
  },

  // ── Case type ──
  caseCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  caseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  caseChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22,
    borderWidth: 1.5, borderColor: "#E0E5EA", backgroundColor: "#F8FAFB",
  },
  caseChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  caseChipText:   { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  caseChipTextActive: { color: WHITE, fontFamily: "Inter_600SemiBold" },
  caseChipCheck: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
  },

  // ── Options card ──
  optionsCard: {
    backgroundColor: CARD, borderRadius: 16, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  optionRowUrgent: { backgroundColor: ROSE + "06" },
  optionRowAnon:   { backgroundColor: "#F8FAFB" },
  optionDivider:   { height: 1, backgroundColor: "#F0F2F4", marginHorizontal: 14 },
  optionIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  optionInfo:  { flex: 1 },
  optionLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT },
  optionDesc:  { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2 },

  // ── Tags ──
  tagsCard: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "#E0E5EA", backgroundColor: "#F8FAFB",
  },
  tagChipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  tagChipText:       { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT2 },
  tagChipTextActive: { color: WHITE },

  // ── Bottom publish CTA ──
  bottomPublishBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 16, marginBottom: 8,
    backgroundColor: "#E8ECF0",
    borderWidth: 1.5, borderColor: "transparent",
  },
  bottomPublishBtnReady: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  bottomPublishBtnDisabled: {
    backgroundColor: "#EAEEF2",
  },
  bottomPublishIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  bottomPublishTitle: {
    fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT2,
  },
  bottomPublishSub: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT3, marginTop: 2,
  },
});
