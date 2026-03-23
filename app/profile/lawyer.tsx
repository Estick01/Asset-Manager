import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Pressable, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/auth-context";
import {
  getLawyerProfile, getLawyerProfileByid, updateLawyerProfile,
  type UpdateLawyerProfile,
} from "@/lib/services/abogadoService";
import {
  getDepartamentos, getMunicipios,
  type Departamento, type Municipio,
} from "@/lib/services/ubicacionService";

// ── Design tokens ─────────────────────────────────────────────────────────
const NAVY  = "#0F2640";
const TEAL  = "#2196A6";
const WHITE = "#FFFFFF";
const BG    = "#F4F6F8";
const TEXT  = "#1B2B3B";
const TEXT2 = "#6B7B8D";
const TEXT3 = "#9AAABB";
const BORDER = "#DDE3EA";
const SURFACE = "#F8FAFC";
const GREEN = "#27AE7A";

interface LawyerForm {
  firstName:      string;
  lastName:       string;
  licenseNumber:  string;
  specialization: string;
  phone:          string;
  address:        string;
  departamentoId: string;
  municipioId:    string;
}

const EMPTY: LawyerForm = {
  firstName: "", lastName: "", licenseNumber: "",
  specialization: "", phone: "", address: "",
  departamentoId: "", municipioId: "",
};

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({
  label, icon, children, half,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  half?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, half && styles.fieldHalf]}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={13} color={TEXT3} style={{ marginRight: 4 }} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Read-only value ────────────────────────────────────────────────────────
function ReadValue({ value, placeholder }: { value?: string | null; placeholder?: string }) {
  return (
    <View style={styles.readBox}>
      <Text style={[styles.readText, !value && styles.readPlaceholder]} numberOfLines={2}>
        {value || placeholder || "—"}
      </Text>
    </View>
  );
}

// ── Editable input ─────────────────────────────────────────────────────────
function EditInput({
  value, onChange, placeholder, keyboard, multiline, focused, onFocus, onBlur,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboard?: any; multiline?: boolean; focused?: boolean;
  onFocus: () => void; onBlur: () => void;
}) {
  return (
    <TextInput
      style={[styles.editInput, multiline && styles.editInputMulti, focused && styles.editInputFocused]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={TEXT3}
      keyboardType={keyboard}
      multiline={multiline}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

// ── Selector row ───────────────────────────────────────────────────────────
function SelectorBtn({
  label, onPress, editing,
}: { label: string; onPress: () => void; editing: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.selectorBtn,
        editing && styles.selectorBtnActive,
        pressed && editing && { opacity: 0.85 },
      ]}
      onPress={editing ? onPress : undefined}
    >
      <Text style={[styles.selectorText, !label && styles.readPlaceholder]}
        numberOfLines={1}>
        {label || "—"}
      </Text>
      {editing && <Ionicons name="chevron-down" size={14} color={TEXT2} />}
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function LawyerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isOwn = !id;

  const [form,         setForm]         = useState<LawyerForm>(EMPTY);
  const [email,        setEmail]        = useState<string | null>(null);
  const [firm,         setFirm]         = useState<{ id: string; name: string } | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [focused,      setFocused]      = useState<string | null>(null);
  const savedForm                       = useRef<LawyerForm>(EMPTY);

  // Departamento / Municipio lists
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios,    setMunicipios]    = useState<Municipio[]>([]);
  const [deptName,      setDeptName]      = useState("");
  const [muniName,      setMuniName]      = useState("");

  // Selectors visibility
  const [showDepts, setShowDepts] = useState(false);
  const [showMunis, setShowMunis] = useState(false);

  // ── Load profile ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const lawyer = isOwn ? await getLawyerProfile() : await getLawyerProfileByid(id!);
      if (!lawyer) return;

      const loaded: LawyerForm = {
        firstName:      lawyer.firstName      ?? "",
        lastName:       lawyer.lastName       ?? "",
        licenseNumber:  lawyer.licenseNumber  ?? "",
        specialization: lawyer.specialization ?? "",
        phone:          lawyer.phone          ?? "",
        address:        lawyer.address        ?? "",
        departamentoId: lawyer.departamentoId ?? "",
        municipioId:    lawyer.municipioId    ?? "",
      };
      setForm(loaded);
      savedForm.current = loaded;
      setEmail(lawyer.user?.email ?? null);
      setFirm(lawyer.firm ?? null);

      // Resolve names
      if (lawyer.departamentoId) {
        const depts = await getDepartamentos();
        setDepartamentos(depts);
        const d = depts.find(x => x.id === lawyer.departamentoId);
        setDeptName(d?.nombre ?? "");
        if (lawyer.municipioId) {
          const { data: munis } = await getMunicipios(lawyer.departamentoId, 1, 200);
          setMunicipios(munis);
          const m = munis.find(x => x.id === lawyer.municipioId);
          setMuniName(m?.nombre ?? "");
        }
      }
    } catch {
      Alert.alert("Error", "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, [id, isOwn]);

  useEffect(() => { load(); }, [load]);

  // ── Departamento selected ─────────────────────────────────────────────
  const selectDept = async (dept: Departamento) => {
    setForm(p => ({ ...p, departamentoId: dept.id, municipioId: "" }));
    setDeptName(dept.nombre);
    setMuniName("");
    setMunicipios([]);
    setShowDepts(false);
    const { data } = await getMunicipios(dept.id, 1, 200);
    setMunicipios(data);
  };

  const openDepts = async () => {
    if (departamentos.length === 0) {
      const depts = await getDepartamentos();
      setDepartamentos(depts);
    }
    setShowDepts(true);
    setShowMunis(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert("Error", "El nombre y apellido son requeridos");
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateLawyerProfile = {
        firstName:      form.firstName      || undefined,
        lastName:       form.lastName       || undefined,
        phone:          form.phone          || undefined,
        address:        form.address        || undefined,
        specialization: form.specialization || undefined,
        licenseNumber:  form.licenseNumber  || undefined,
        departamentoId: form.departamentoId || undefined,
        municipioId:    form.municipioId    || undefined,
      };
      await updateLawyerProfile(payload);
      savedForm.current = form;
      setEditing(false);
      Alert.alert("Éxito", "Perfil actualizado correctamente");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm.current);
    setEditing(false);
    setFocused(null);
  };

  const f = (field: string) => focused === field;
  const upd = (key: keyof LawyerForm) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Sin nombre";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </Pressable>
        <Text style={styles.headerTitle}>{isOwn ? "Mi Perfil" : "Perfil del Abogado"}</Text>
        {isOwn ? (
          <Pressable
            style={styles.headerBtn} hitSlop={8}
            onPress={() => { if (editing) handleCancel(); else setEditing(true); }}
          >
            <Ionicons name={editing ? "close" : "create-outline"} size={22} color={WHITE} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Avatar hero ── */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {(form.firstName[0] ?? "?").toUpperCase()}{(form.lastName[0] ?? "").toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.heroName}>{fullName}</Text>
          {form.specialization ? (
            <Text style={styles.heroSpec}>{form.specialization}</Text>
          ) : null}
          <View style={styles.heroBadge}>
            <Ionicons name="briefcase-outline" size={11} color={WHITE} />
            <Text style={styles.heroBadgeText}>Abogado</Text>
          </View>
        </View>

        {/* ── Información Personal ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: TEAL + "15" }]}>
              <Ionicons name="person-outline" size={15} color={TEAL} />
            </View>
            <Text style={styles.cardLabel}>Información Personal</Text>
          </View>

          <View style={styles.row}>
            <Field label="Nombre" icon="person-outline" half>
              {editing ? (
                <EditInput value={form.firstName} onChange={upd("firstName")} placeholder="Juan"
                  focused={f("firstName")} onFocus={() => setFocused("firstName")} onBlur={() => setFocused(null)} />
              ) : (
                <ReadValue value={form.firstName} placeholder="Sin nombre" />
              )}
            </Field>
            <Field label="Apellido" icon="person-outline" half>
              {editing ? (
                <EditInput value={form.lastName} onChange={upd("lastName")} placeholder="Pérez"
                  focused={f("lastName")} onFocus={() => setFocused("lastName")} onBlur={() => setFocused(null)} />
              ) : (
                <ReadValue value={form.lastName} />
              )}
            </Field>
          </View>

          <Field label="Teléfono" icon="call-outline">
            {editing ? (
              <EditInput value={form.phone} onChange={upd("phone")} placeholder="+57 300 000 0000"
                keyboard="phone-pad" focused={f("phone")}
                onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} />
            ) : (
              <ReadValue value={form.phone} />
            )}
          </Field>

          <Field label="Dirección" icon="location-outline">
            {editing ? (
              <EditInput value={form.address} onChange={upd("address")} placeholder="Calle 123 #45-67"
                multiline focused={f("address")}
                onFocus={() => setFocused("address")} onBlur={() => setFocused(null)} />
            ) : (
              <ReadValue value={form.address} />
            )}
          </Field>

          <Field label="Departamento" icon="map-outline">
            <SelectorBtn label={deptName} editing={editing} onPress={openDepts} />
          </Field>

          <Field label="Municipio" icon="pin-outline">
            <SelectorBtn
              label={muniName}
              editing={editing && !!form.departamentoId}
              onPress={() => { setShowMunis(true); setShowDepts(false); }}
            />
          </Field>
        </View>

        {/* ── Información Profesional ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: NAVY + "12" }]}>
              <Ionicons name="briefcase-outline" size={15} color={NAVY} />
            </View>
            <Text style={styles.cardLabel}>Información Profesional</Text>
          </View>

          <Field label="Tarjeta profesional" icon="card-outline">
            {editing ? (
              <EditInput value={form.licenseNumber} onChange={upd("licenseNumber")} placeholder="123456789"
                focused={f("licenseNumber")} onFocus={() => setFocused("licenseNumber")} onBlur={() => setFocused(null)} />
            ) : (
              <ReadValue value={form.licenseNumber} />
            )}
          </Field>

          <Field label="Especialidad" icon="school-outline">
            {editing ? (
              <EditInput value={form.specialization} onChange={upd("specialization")} placeholder="Civil, Penal, Laboral…"
                focused={f("specialization")} onFocus={() => setFocused("specialization")} onBlur={() => setFocused(null)} />
            ) : (
              <ReadValue value={form.specialization} />
            )}
          </Field>

          {/* Firma asociada */}
          {firm ? (
            <View style={styles.firmRow}>
              <View style={styles.firmRowIcon}>
                <Ionicons name="business-outline" size={16} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.firmRowLabel}>Bufete asociado</Text>
                <Text style={styles.firmRowName}>{firm.name}</Text>
              </View>
              <View style={styles.firmBadge}>
                <View style={styles.firmBadgeDot} />
                <Text style={styles.firmBadgeText}>Activo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.firmRow}>
              <View style={[styles.firmRowIcon, { backgroundColor: TEXT3 + "18" }]}>
                <Ionicons name="business-outline" size={16} color={TEXT3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.firmRowLabel}>Bufete</Text>
                <Text style={[styles.firmRowName, { color: TEXT3 }]}>Independiente</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Departamento list ── */}
        {editing && showDepts && (
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar departamento</Text>
              <Pressable onPress={() => setShowDepts(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={TEXT2} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {departamentos.map(d => (
                <Pressable
                  key={d.id}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    d.id === form.departamentoId && styles.pickerItemActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => selectDept(d)}
                >
                  <Text style={[styles.pickerItemText, d.id === form.departamentoId && styles.pickerItemTextActive]}>
                    {d.nombre}
                  </Text>
                  {d.id === form.departamentoId && (
                    <Ionicons name="checkmark" size={16} color={TEAL} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Municipio list ── */}
        {editing && showMunis && (
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar municipio</Text>
              <Pressable onPress={() => setShowMunis(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={TEXT2} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList} nestedScrollEnabled>
              {municipios.map(m => (
                <Pressable
                  key={m.id}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    m.id === form.municipioId && styles.pickerItemActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    setForm(p => ({ ...p, municipioId: m.id }));
                    setMuniName(m.nombre);
                    setShowMunis(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, m.id === form.municipioId && styles.pickerItemTextActive]}>
                    {m.nombre}
                  </Text>
                  {m.id === form.municipioId && (
                    <Ionicons name="checkmark" size={16} color={TEAL} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Cuenta ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Información de la Cuenta</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="mail-outline" size={15} color={TEXT3} />
              <Text style={styles.infoKey}>Correo</Text>
            </View>
            <Text style={styles.infoVal} numberOfLines={1}>
              {isOwn ? (user?.user?.email ?? "—") : (email ?? "—")}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-checkmark-outline" size={15} color={TEXT3} />
              <Text style={styles.infoKey}>Estado</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Activo</Text>
            </View>
          </View>
        </View>

        {/* ── Save / Cancel ── */}
        {editing && isOwn && (
          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.8 }]}
              onPress={handleCancel}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSave, pressed && { opacity: 0.85 }, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={WHITE} size="small" />
                : <Text style={styles.btnSaveText}>Guardar cambios</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16,
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Body
  body: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { padding: 16, gap: 12 },

  // Hero
  hero: { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatarRing: {
    padding: 3, borderRadius: 60, borderWidth: 2.5,
    borderColor: TEAL + "60", marginBottom: 8,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: NAVY, alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { fontSize: 30, fontFamily: "Inter_700Bold", color: WHITE },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT },
  heroSpec: { fontSize: 13, color: TEXT2, fontFamily: "Inter_400Regular" },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 2,
  },
  heroBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE },

  firmBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GREEN + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  firmBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  firmBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: GREEN },

  // Firm row (inside professional card)
  firmRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  firmRowIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: TEAL + "15", alignItems: "center", justifyContent: "center",
  },
  firmRowLabel: { fontSize: 11, color: TEXT3, fontFamily: "Inter_400Regular" },
  firmRowName:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, marginTop: 1 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16, gap: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } as any
      : { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }),
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardHeaderIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT3,
    textTransform: "uppercase", letterSpacing: 0.8,
  },

  // Row
  row: { flexDirection: "row", gap: 10 },

  // Field
  fieldWrap: { gap: 5 },
  fieldHalf: { flex: 1 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT2 },

  // Read-only
  readBox: {
    backgroundColor: SURFACE, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: BORDER,
  },
  readText:        { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT },
  readPlaceholder: { color: TEXT3 },

  // Edit input
  editInput: {
    backgroundColor: WHITE, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
    borderWidth: 1.5, borderColor: BORDER,
  },
  editInputMulti: { minHeight: 70, textAlignVertical: "top" },
  editInputFocused: { borderColor: TEAL },

  // Selector
  selectorBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: SURFACE, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: BORDER,
  },
  selectorBtnActive: { borderColor: TEAL + "80", backgroundColor: WHITE },
  selectorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, flex: 1, marginRight: 4 },

  // Picker
  pickerCard: {
    backgroundColor: WHITE, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } as any
      : { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }),
  },
  pickerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  pickerTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT },
  pickerList: { maxHeight: 200 },
  pickerItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: BG,
  },
  pickerItemActive: { backgroundColor: TEAL + "0D" },
  pickerItemText:       { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT },
  pickerItemTextActive: { fontFamily: "Inter_600SemiBold", color: TEAL },

  // Account info rows
  infoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BG,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoKey:  { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT2 },
  infoVal:  { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT, maxWidth: "55%", textAlign: "right" },

  // Active badge
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: GREEN + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  activeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: GREEN },

  // Buttons
  btnRow: { flexDirection: "row", gap: 10 },
  btnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: "center", backgroundColor: WHITE,
    borderWidth: 1, borderColor: BORDER,
  },
  btnCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT2 },
  btnSave: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: "center", backgroundColor: TEAL,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 12px rgba(33,150,166,0.35)" } as any
      : { shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 }),
  },
  btnSaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },
});
