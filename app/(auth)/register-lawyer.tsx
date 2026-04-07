import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Platform, Modal, FlatList, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { API_URL } from "@/lib/config";
import { toast } from "sonner-native";
import { EnumRol } from "@/shared/schema/user.schema";
import { useAuth } from "@/lib/auth-context";
import {
  getTiposDocumento, getDepartamentos, getMunicipios,
  type TipoDocumento, type Departamento, type Municipio,
} from "@/lib/services/ubicacionService";

const getRedirectPath = (role: string) => {
  switch (role?.toLowerCase()) {
    case EnumRol.BUFETE.nombre:  return "/(firm-tabs)";
    case EnumRol.ABOGADO.nombre: return "/(lawyer-tabs)";
    case EnumRol.CLIENTE.nombre: return "/portal";
    case EnumRol.ADMIN.nombre:   return "/(tabs)";
    default:                     return "/(firm-tabs)";
  }
};

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.required}> *</Text>}</Text>
      {children}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  group: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 2 },
  required: { color: Colors.danger },
});

// ─── StyledInput ─────────────────────────────────────────────────────────────
function StyledInput({ icon, rightIcon, onRightPress, isSelect, disabled, ...props }: any) {
  const inner = (
    <View style={[inputStyles.wrapper, disabled && inputStyles.wrapperDisabled]}>
      {icon && <Ionicons name={icon} size={18} color={Colors.textTertiary} style={inputStyles.icon} />}
      {isSelect ? (
        <Text style={[inputStyles.input, !props.value && { color: Colors.textTertiary }]}>
          {props.value || props.placeholder}
        </Text>
      ) : (
        <TextInput style={inputStyles.input} placeholderTextColor={Colors.textTertiary} {...props} />
      )}
      {rightIcon && (
        <Pressable onPress={onRightPress} style={inputStyles.rightIcon} hitSlop={8}>
          <Ionicons name={rightIcon} size={18} color={Colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
  return isSelect ? <Pressable onPress={props.onPress} disabled={disabled}>{inner}</Pressable> : inner;
}
const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, minHeight: 50,
  },
  wrapperDisabled: { opacity: 0.5 },
  icon: { marginLeft: 14 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  rightIcon: { marginRight: 14 },
});

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({ title, subtitle, iconName, iconColor }: { title: string; subtitle?: string; iconName: string; iconColor: string }) {
  return (
    <View style={sectionStyles.header}>
      <View style={[sectionStyles.icon, { backgroundColor: iconColor + "15" }]}>
        <Ionicons name={iconName as any} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={sectionStyles.title}>{title}</Text>
        {subtitle && <Text style={sectionStyles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
});

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function RegisterLawyerScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [firstName, setFirstName]         = useState("");
  const [lastName, setLastName]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [licenseNumber, setLicense]       = useState("");
  const [specialty, setSpecialty]         = useState("");
  const [phone, setPhone]                 = useState("");
  const [documento, setDocumento]         = useState("");
  const [direccion, setDireccion]         = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos]   = useState<Departamento[]>([]);
  const [municipios, setMunicipios]         = useState<Municipio[]>([]);
  const [loadingTipos, setLoadingTipos]     = useState(true);
  const [loadingDeptos, setLoadingDeptos]   = useState(true);
  const [loadingMun, setLoadingMun]         = useState(false);
  const [loadingMoreMun, setLoadingMoreMun] = useState(false);

  const [tipoDocumentoId, setTipoDocumentoId]     = useState<number>(1);
  const [departamentoId, setDepartamentoId]       = useState("");
  const [selectedDeptoName, setSelectedDeptoName] = useState("");
  const [municipioId, setMunicipioId]             = useState("");
  const [selectedMunName, setSelectedMunName]     = useState("");
  const [munPage, setMunPage]                     = useState(1);
  const [munHasMore, setMunHasMore]               = useState(false);
  const [munSearch, setMunSearch]                 = useState("");

  const [showTipoModal, setShowTipoModal]   = useState(false);
  const [showDeptoModal, setShowDeptoModal] = useState(false);
  const [showMunModal, setShowMunModal]     = useState(false);
  const [loading, setLoading]               = useState(false);

  useEffect(() => {
    getTiposDocumento().then(setTiposDocumento).finally(() => setLoadingTipos(false));
    getDepartamentos().then(setDepartamentos).finally(() => setLoadingDeptos(false));
  }, []);

  const loadMunicipios = useCallback(async (deptoId: string, page = 1, search = "") => {
    if (page === 1) { setLoadingMun(true); } else { setLoadingMoreMun(true); }
    try {
      const data = await getMunicipios(deptoId, page, 10, search);
      setMunicipios(prev => page === 1 ? data.data : [...prev, ...data.data]);
      setMunHasMore(data.hasMore);
      setMunPage(page);
    } finally { setLoadingMun(false); setLoadingMoreMun(false); }
  }, []);

  const handleSelectDepto = (depto: Departamento) => {
    setDepartamentoId(depto.id); setSelectedDeptoName(depto.nombre);
    setMunicipioId(""); setSelectedMunName(""); setMunicipios([]); setMunSearch("");
    loadMunicipios(depto.id, 1);
    setShowDeptoModal(false);
  };

  const selectedTipo = tiposDocumento.find(t => t.id === tipoDocumentoId);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !licenseNumber.trim()) {
      toast.error("Completa los campos obligatorios"); return;
    }
    if (!documento.trim()) { toast.error("El documento de identidad es obligatorio"); return; }
    if (!phone.trim()) { toast.error("El teléfono es obligatorio"); return; }
    if (password !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register/lawyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, firstName, lastName, phone, documento, tipoDocumentoId,
          direccion: direccion || undefined,
          departamentoId: departamentoId || undefined,
          municipioId: municipioId || undefined,
          licenseNumber, specialty: specialty || undefined, isIndependent: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.details?.[0]?.message || data.error || data.message || "Error al registrar.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return;
      }
      const loggedIn = await login(email, password);
      if (loggedIn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(lawyer-tabs)" as any);
      } else {
        toast.error("Error al iniciar sesión después del registro.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch { toast.error("Error al conectar con el servidor"); } finally { setLoading(false); }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Crear Cuenta</Text>
            <Text style={styles.headerSubtitle}>Abogado Independiente</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Ionicons name="briefcase" size={22} color={Colors.primary} />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Acceso */}
          <View style={styles.card}>
            <Section title="Acceso" iconName="lock-closed-outline" iconColor={Colors.primary} />
            <Field label="Correo electrónico" required>
              <StyledInput icon="mail-outline" placeholder="juan@ejemplo.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </Field>
            <Field label="Contraseña" required>
              <StyledInput
                icon="lock-closed-outline" placeholder="Mínimo 8 caracteres"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPass}
                rightIcon={showPass ? "eye-off-outline" : "eye-outline"}
                onRightPress={() => setShowPass(!showPass)}
              />
            </Field>
            <Field label="Confirmar contraseña" required>
              <View style={[
                inputStyles.wrapper,
                confirmPassword.length > 0 && { borderColor: password === confirmPassword ? Colors.success : Colors.danger }
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={{ marginLeft: 14 }} />
                <TextInput
                  style={inputStyles.input} placeholder="Repite tu contraseña"
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword} onChangeText={setConfirm} secureTextEntry={!showConfirm}
                />
                {confirmPassword.length > 0 && (
                  <Ionicons
                    name={password === confirmPassword ? "checkmark-circle" : "close-circle"}
                    size={18} color={password === confirmPassword ? Colors.success : Colors.danger}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ marginRight: 14 }} hitSlop={8}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </Field>
          </View>

          {/* Información personal */}
          <View style={styles.card}>
            <Section title="Información Personal" iconName="person-outline" iconColor={Colors.info} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Nombre" required>
                  <StyledInput icon="person-outline" placeholder="Juan" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Apellido" required>
                  <StyledInput placeholder="Pérez" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </Field>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Tipo doc." required>
                  {loadingTipos ? <ActivityIndicator color={Colors.primary} /> : (
                    <StyledInput icon="card-outline" isSelect value={selectedTipo?.codigo} placeholder="Selec." onPress={() => setShowTipoModal(true)} rightIcon="chevron-down" />
                  )}
                </Field>
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Número de documento" required>
                  <StyledInput icon="document-outline" placeholder="12345678" value={documento} onChangeText={setDocumento} keyboardType="number-pad" />
                </Field>
              </View>
            </View>
            <Field label="Teléfono" required>
              <StyledInput icon="call-outline" placeholder="300 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </Field>
          </View>

          {/* Información profesional */}
          <View style={styles.card}>
            <Section title="Información Profesional" iconName="briefcase-outline" iconColor={Colors.accent} />
            <Field label="Tarjeta profesional" required>
              <StyledInput icon="id-card-outline" placeholder="123456789" value={licenseNumber} onChangeText={setLicense} />
            </Field>
            <Field label="Especialidad">
              <StyledInput icon="school-outline" placeholder="Civil, Penal, Laboral..." value={specialty} onChangeText={setSpecialty} />
            </Field>
          </View>

          {/* Ubicación */}
          <View style={styles.card}>
            <Section title="Ubicación" subtitle="Opcional" iconName="location-outline" iconColor={Colors.success} />
            <Field label="Departamento">
              {loadingDeptos ? <ActivityIndicator color={Colors.primary} /> : (
                <StyledInput icon="map-outline" isSelect value={selectedDeptoName} placeholder="Seleccionar departamento" onPress={() => setShowDeptoModal(true)} rightIcon="chevron-down" />
              )}
            </Field>
            <Field label="Municipio">
              <StyledInput
                icon="pin-outline" isSelect value={selectedMunName}
                placeholder={departamentoId ? "Seleccionar municipio" : "Primero selecciona un departamento"}
                onPress={() => departamentoId && setShowMunModal(true)}
                disabled={!departamentoId}
                rightIcon={departamentoId ? "chevron-down" : undefined}
              />
            </Field>
            <Field label="Dirección">
              <StyledInput icon="home-outline" placeholder="Calle 123 # 45-67" value={direccion} onChangeText={setDireccion} />
            </Field>
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, loading && styles.submitBtnDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Ionicons name="briefcase-outline" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Crear Cuenta</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
            <Text style={[styles.loginLinkText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>Inicia sesión</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: Tipo documento */}
      <Modal visible={showTipoModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowTipoModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tipo de documento</Text>
            <FlatList
              data={tiposDocumento} keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sheetItem, tipoDocumentoId === item.id && styles.sheetItemSelected]}
                  onPress={() => { setTipoDocumentoId(item.id); setShowTipoModal(false); }}
                >
                  <View>
                    <Text style={styles.sheetItemText}>{item.nombre}</Text>
                    <Text style={styles.sheetItemSub}>{item.codigo}</Text>
                  </View>
                  {tipoDocumentoId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Departamento */}
      <Modal visible={showDeptoModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowDeptoModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Departamento</Text>
            <FlatList
              data={departamentos} keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sheetItem, departamentoId === item.id && styles.sheetItemSelected]}
                  onPress={() => handleSelectDepto(item)}
                >
                  <Text style={styles.sheetItemText}>{item.nombre}</Text>
                  {departamentoId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Municipio */}
      <Modal visible={showMunModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowMunModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Municipio</Text>
            <View style={styles.sheetSearch}>
              <Ionicons name="search-outline" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.sheetSearchInput} placeholder="Buscar municipio..."
                placeholderTextColor={Colors.textTertiary} value={munSearch}
                onChangeText={text => { setMunSearch(text); loadMunicipios(departamentoId, 1, text); }}
              />
            </View>
            {loadingMun ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={municipios} keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.sheetItem, municipioId === item.id && styles.sheetItemSelected]}
                    onPress={() => { setMunicipioId(item.id); setSelectedMunName(item.nombre); setShowMunModal(false); }}
                  >
                    <Text style={styles.sheetItemText}>{item.nombre}</Text>
                    {municipioId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
                onEndReached={() => { if (munHasMore && !loadingMoreMun) loadMunicipios(departamentoId, munPage + 1, munSearch); }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMoreMun ? <ActivityIndicator color={Colors.primary} /> : null}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.white },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
  },

  scrollContent: { padding: 16, gap: 14, paddingBottom: 48 },
  row: { flexDirection: "row", gap: 12 },

  // Card
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.danger + "12",
    borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.danger,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.danger },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },

  // Login link
  loginLink: { flexDirection: "row", justifyContent: "center", paddingBottom: 8 },
  loginLinkText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  // Modal / Sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  sheetSearch: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  sheetItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  sheetItemSelected: { backgroundColor: Colors.primary + "08" },
  sheetItemText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  sheetItemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
});