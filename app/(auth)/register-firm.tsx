import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform,
  Modal, FlatList, TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { toast } from "sonner-native";
import { API_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import {
  getTiposDocumento, getDepartamentos, getMunicipios,
  type TipoDocumento, type Departamento, type Municipio,
} from "@/lib/services/ubicacionService";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

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
export default function RegisterFirmScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1140, width - metrics.gutter * 2));
  const { login } = useAuth();

  // firma
  const [firmName, setFirmName]           = useState("");
  const [nit, setNit]                     = useState("");
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [address, setAddress]             = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  // representante legal — datos básicos
  const [repNombre, setRepNombre]         = useState("");
  const [repApellido, setRepApellido]     = useState("");
  const [repDocumento, setRepDocumento]   = useState("");
  const [repCargo, setRepCargo]           = useState("Representante Legal");
  const [repEmail, setRepEmail]           = useState("");
  const [repTelefono, setRepTelefono]     = useState("");
  const [repDireccion, setRepDireccion]   = useState("");

  // representante legal — lookups
  const [tiposDocumento, setTiposDocumento]   = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos]     = useState<Departamento[]>([]);
  const [municipios, setMunicipios]           = useState<Municipio[]>([]);
  const [loadingTipos, setLoadingTipos]       = useState(true);
  const [loadingDeptos, setLoadingDeptos]     = useState(true);
  const [loadingMun, setLoadingMun]           = useState(false);
  const [loadingMoreMun, setLoadingMoreMun]   = useState(false);

  const [repTipoDocumentoId, setRepTipoDocumentoId]   = useState<number>(1);
  const [repDepartamentoId, setRepDepartamentoId]     = useState("");
  const [selectedDeptoName, setSelectedDeptoName]     = useState("");
  const [repMunicipioId, setRepMunicipioId]           = useState("");
  const [selectedMunName, setSelectedMunName]         = useState("");
  const [munPage, setMunPage]                         = useState(1);
  const [munHasMore, setMunHasMore]                   = useState(false);
  const [munSearch, setMunSearch]                     = useState("");

  // modals
  const [showTipoModal, setShowTipoModal]   = useState(false);
  const [showDeptoModal, setShowDeptoModal] = useState(false);
  const [showMunModal, setShowMunModal]     = useState(false);

  const [loading, setLoading] = useState(false);

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
    setRepDepartamentoId(depto.id); setSelectedDeptoName(depto.nombre);
    setRepMunicipioId(""); setSelectedMunName(""); setMunicipios([]); setMunSearch("");
    loadMunicipios(depto.id, 1);
    setShowDeptoModal(false);
  };

  const selectedTipo = tiposDocumento.find(t => t.id === repTipoDocumentoId);

  const handleRegister = async () => {
    if (!firmName.trim() || !nit.trim() || !email.trim() || !password.trim()) {
      toast.error("Completa los campos obligatorios"); return;
    }
    if (password !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register/firm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password,
          name: firmName, nit,
          phone: phone || undefined,
          address: address || undefined,
          repNombre: repNombre || undefined,
          repApellido: repApellido || undefined,
          repDocumento: repDocumento || undefined,
          repTipoDocumentoId: repDocumento ? repTipoDocumentoId : undefined,
          repCargo: repCargo || undefined,
          repEmail: repEmail || undefined,
          repTelefono: repTelefono || undefined,
          repDireccion: repDireccion || undefined,
          repDepartamentoId: repDepartamentoId || undefined,
          repMunicipioId: repMunicipioId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || data.error || "Error al registrar. Intenta de nuevo.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return;
      }
      const loggedIn = await login(email, password);
      if (loggedIn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(firm-tabs)" as any);
      } else {
        toast.error("Error al iniciar sesión después del registro.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      toast.error("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, desktop && styles.desktopHeader, { paddingTop: insets.top + (desktop ? 28 : 16), paddingHorizontal: desktop ? metrics.gutter : 20 }]}
      >
        <View style={[styles.headerShell, desktop && { maxWidth: shellWidth }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Crear Cuenta</Text>
            <Text style={styles.headerSubtitle}>Bufete de Abogados</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Ionicons name="business" size={22} color={Colors.primary} />
          </View>
        </View>
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={18} color="rgba(255,255,255,0.9)" />
          <Text style={styles.infoBannerText}>
            Registro empresarial — accede a todas las funciones del bufete
          </Text>
        </View>
        {desktop && (
          <View style={styles.desktopHeaderBody}>
            <Text style={styles.desktopHeaderTitle}>Activa la operación completa de tu firma jurídica</Text>
            <Text style={styles.desktopHeaderText}>
              Registra el bufete, configura el acceso principal y añade la información del representante para comenzar a administrar clientes, abogados y procesos.
            </Text>
          </View>
        )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, desktop && styles.desktopScrollContent, desktop && { paddingHorizontal: metrics.gutter }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.scrollShell, desktop && { maxWidth: shellWidth }]}>
          <View style={[styles.desktopLayout, desktop && styles.desktopLayoutActive]}>
          <View style={styles.formColumn}>
          {/* Información del bufete */}
          <View style={styles.card}>
            <Section title="Información del Bufete" iconName="business-outline" iconColor={Colors.primary} />
            <Field label="Nombre del bufete" required>
              <StyledInput icon="business-outline" placeholder="Lex & Associates" value={firmName} onChangeText={setFirmName} autoCapitalize="words" />
            </Field>
            <Field label="NIT" required>
              <StyledInput icon="document-text-outline" placeholder="123456789-0" value={nit} onChangeText={setNit} keyboardType="numbers-and-punctuation" />
            </Field>
          </View>

          {/* Contacto */}
          <View style={styles.card}>
            <Section title="Contacto" iconName="call-outline" iconColor={Colors.info} />
            <Field label="Correo electrónico" required>
              <StyledInput icon="mail-outline" placeholder="contacto@bufete.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </Field>
            <Field label="Teléfono">
              <StyledInput icon="call-outline" placeholder="300 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </Field>
            <Field label="Dirección">
              <StyledInput icon="location-outline" placeholder="Calle 123 #45-67" value={address} onChangeText={setAddress} />
            </Field>
          </View>
          {/* Representante Legal */}
          <View style={styles.card}>
            <Section title="Representante Legal" subtitle="Opcional — puede completarse después" iconName="person-outline" iconColor={Colors.warning} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Nombre">
                  <StyledInput icon="person-outline" placeholder="Juan" value={repNombre} onChangeText={setRepNombre} autoCapitalize="words" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Apellido">
                  <StyledInput placeholder="Pérez" value={repApellido} onChangeText={setRepApellido} autoCapitalize="words" />
                </Field>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Tipo doc.">
                  {loadingTipos ? <ActivityIndicator color={Colors.primary} /> : (
                    <StyledInput icon="card-outline" isSelect value={selectedTipo?.codigo} placeholder="Selec." onPress={() => setShowTipoModal(true)} rightIcon="chevron-down" />
                  )}
                </Field>
              </View>
              <View style={{ flex: 2 }}>
                <Field label="Documento">
                  <StyledInput icon="document-outline" placeholder="Número de documento" value={repDocumento} onChangeText={setRepDocumento} />
                </Field>
              </View>
            </View>

            <Field label="Cargo">
              <StyledInput icon="briefcase-outline" placeholder="Representante Legal" value={repCargo} onChangeText={setRepCargo} />
            </Field>
            <Field label="Correo">
              <StyledInput icon="mail-outline" placeholder="rep@bufete.com" value={repEmail} onChangeText={setRepEmail} keyboardType="email-address" autoCapitalize="none" />
            </Field>
            <Field label="Teléfono">
              <StyledInput icon="call-outline" placeholder="300 123 4567" value={repTelefono} onChangeText={setRepTelefono} keyboardType="phone-pad" />
            </Field>

            <Field label="Departamento">
              {loadingDeptos ? <ActivityIndicator color={Colors.primary} /> : (
                <StyledInput icon="map-outline" isSelect value={selectedDeptoName} placeholder="Seleccionar departamento" onPress={() => setShowDeptoModal(true)} rightIcon="chevron-down" />
              )}
            </Field>
            <Field label="Municipio">
              <StyledInput
                icon="pin-outline" isSelect value={selectedMunName}
                placeholder={repDepartamentoId ? "Seleccionar municipio" : "Primero selecciona un departamento"}
                onPress={() => repDepartamentoId && setShowMunModal(true)}
                disabled={!repDepartamentoId}
                rightIcon={repDepartamentoId ? "chevron-down" : undefined}
              />
            </Field>
            <Field label="Dirección">
              <StyledInput icon="home-outline" placeholder="Calle 123 # 45-67" value={repDireccion} onChangeText={setRepDireccion} />
            </Field>
          </View>
                    {/* Seguridad */}
          <View style={styles.card}>
            <Section title="Seguridad" iconName="lock-closed-outline" iconColor={Colors.success} />
            <Field label="Contraseña" required>
              <StyledInput
                icon="lock-closed-outline" placeholder="Mínimo 6 caracteres"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPass}
                rightIcon={showPass ? "eye-off-outline" : "eye-outline"}
                onRightPress={() => setShowPass(!showPass)}
              />
            </Field>
            <Field label="Confirmar contraseña" required>
              <View style={[inputStyles.wrapper, confirmPassword.length > 0 && { borderColor: password === confirmPassword ? Colors.success : Colors.danger }]}>
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

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, loading && styles.submitBtnDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Ionicons name="business-outline" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Crear Cuenta de Bufete</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
            <Text style={[styles.loginLinkText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>Inicia sesión</Text>
          </Pressable>
          </View>
          {desktop && (
            <View style={styles.desktopAside}>
              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Operación</Text>
                <Text style={styles.desktopAsideTitle}>Cuenta institucional del bufete</Text>
                <Text style={styles.desktopAsideText}>El registro habilita la estructura base para trabajar con equipo y cartera jurídica.</Text>
                <View style={styles.desktopBulletList}>
                  <Text style={styles.desktopBullet}>Datos corporativos del bufete</Text>
                  <Text style={styles.desktopBullet}>Canales de contacto institucional</Text>
                  <Text style={styles.desktopBullet}>Representación legal y ubicación</Text>
                  <Text style={styles.desktopBullet}>Acceso al panel operativo del bufete</Text>
                </View>
              </View>
            </View>
          )}
          </View>
          </View>
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
                  style={[styles.sheetItem, repTipoDocumentoId === item.id && styles.sheetItemSelected]}
                  onPress={() => { setRepTipoDocumentoId(item.id); setShowTipoModal(false); }}
                >
                  <View>
                    <Text style={styles.sheetItemText}>{item.nombre}</Text>
                    <Text style={styles.sheetItemSub}>{item.codigo}</Text>
                  </View>
                  {repTipoDocumentoId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
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
                  style={[styles.sheetItem, repDepartamentoId === item.id && styles.sheetItemSelected]}
                  onPress={() => handleSelectDepto(item)}
                >
                  <Text style={styles.sheetItemText}>{item.nombre}</Text>
                  {repDepartamentoId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
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
                onChangeText={text => { setMunSearch(text); loadMunicipios(repDepartamentoId, 1, text); }}
              />
            </View>
            {loadingMun ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={municipios} keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.sheetItem, repMunicipioId === item.id && styles.sheetItemSelected]}
                    onPress={() => { setRepMunicipioId(item.id); setSelectedMunName(item.nombre); setShowMunModal(false); }}
                  >
                    <Text style={styles.sheetItemText}>{item.nombre}</Text>
                    {repMunicipioId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
                onEndReached={() => { if (munHasMore && !loadingMoreMun) loadMunicipios(repDepartamentoId, munPage + 1, munSearch); }}
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
  desktopHeader: { paddingBottom: 28 },
  headerShell: { width: "100%", alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
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
  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12, padding: 12,
  },
  infoBannerText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)", lineHeight: 18,
  },
  desktopHeaderBody: { marginTop: 18, maxWidth: 780, gap: 8 },
  desktopHeaderTitle: { fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold", color: Colors.white },
  desktopHeaderText: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)" },

  scrollContent: { padding: 16, gap: 14, paddingBottom: 48 },
  desktopScrollContent: { paddingTop: 24, paddingBottom: 32 },
  scrollShell: { width: "100%", alignSelf: "center" },
  desktopLayout: { width: "100%" },
  desktopLayoutActive: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  formColumn: { flex: 1, minWidth: 0, maxWidth: 980, gap: 16 },
  desktopAside: { width: 340, gap: 16 },
  desktopAsideCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 18, gap: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  desktopAsideLabel: { fontSize: 11, color: Colors.textTertiary, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.7 },
  desktopAsideTitle: { fontSize: 18, lineHeight: 24, color: Colors.text, fontFamily: "Inter_700Bold" },
  desktopAsideText: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  desktopBulletList: { gap: 8 },
  desktopBullet: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
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
