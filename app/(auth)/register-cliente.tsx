import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, ScrollView,
  Platform, Modal, FlatList, TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { toast } from "sonner-native";
import { API_URL } from "@/lib/config";
import { extractApiErrorMessage } from "@/lib/api-error";
import {
  getTiposDocumento, getDepartamentos, getMunicipios,
  type TipoDocumento, type Departamento, type Municipio,
} from "@/lib/services/ubicacionService";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";
type TipoCliente = "natural" | "empresa";

async function triggerHaptic(type: "success" | "error") {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  await Haptics.notificationAsync(
    type === "success"
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}

// ─── Componente reutilizable de campo ────────────────────────────────────────
function Field({
  label, required, icon, children,
}: {
  label: string; required?: boolean; icon?: string; children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>
        {label}{required && <Text style={fieldStyles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 2 },
  required: { color: Colors.danger },
});

// ─── Componente de input con icono ───────────────────────────────────────────
function StyledInput({
  icon, rightIcon, onRightPress, isSelect, disabled, ...props
}: any) {
  const inner = (
    <View style={[inputStyles.wrapper, disabled && inputStyles.wrapperDisabled]}>
      {icon && <Ionicons name={icon} size={18} color={Colors.textTertiary} style={inputStyles.icon} />}
      {isSelect ? (
        <Text style={[inputStyles.input, !props.value && { color: Colors.textTertiary }]}>
          {props.value || props.placeholder}
        </Text>
      ) : (
        <TextInput
          style={inputStyles.input}
          placeholderTextColor={Colors.textTertiary}
          {...props}
        />
      )}
      {rightIcon && (
        <Pressable onPress={onRightPress} style={inputStyles.rightIcon} hitSlop={8}>
          <Ionicons name={rightIcon} size={18} color={Colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );

  if (isSelect) {
    return (
      <Pressable onPress={props.onPress} disabled={disabled}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    minHeight: 50,
  },
  wrapperDisabled: { opacity: 0.5 },
  icon: { marginLeft: 14 },
  input: {
    flex: 1, paddingVertical: 13, paddingHorizontal: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  rightIcon: { marginRight: 14 },
});

// ─── Componente de sección ───────────────────────────────────────────────────
function Section({
  title, subtitle, iconName, iconColor,
}: {
  title: string; subtitle?: string; iconName: string; iconColor: string;
}) {
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
export default function RegisterClienteScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1140, width - metrics.gutter * 2));
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("natural");

  // natural
  const [correo, setCorreo]                   = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombre, setNombre]                   = useState("");
  const [apellido, setApellido]               = useState("");
  const [documento, setDocumento]             = useState("");
  const [telefono, setTelefono]               = useState("");
  const [direccion, setDireccion]             = useState("");
  const [showPass, setShowPass]               = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // empresa
  const [razonSocial, setRazonSocial]               = useState("");
  const [nit, setNit]                               = useState("");
  const [sector, setSector]                         = useState("");
  const [empCorreo, setEmpCorreo]                   = useState("");
  const [empPassword, setEmpPassword]               = useState("");
  const [empConfirmPassword, setEmpConfirmPassword] = useState("");
  const [showEmpPass, setShowEmpPass]               = useState(false);
  const [showEmpConfirm, setShowEmpConfirm]         = useState(false);

  // representante
  const [repNombre, setRepNombre]       = useState("");
  const [repApellido, setRepApellido]   = useState("");
  const [repDocumento, setRepDocumento] = useState("");
  const [repCargo, setRepCargo]         = useState("");
  const [repEmail, setRepEmail]         = useState("");
  const [repTelefono, setRepTelefono]   = useState("");

  // lookups
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos]   = useState<Departamento[]>([]);
  const [municipios, setMunicipios]         = useState<Municipio[]>([]);
  const [loadingTipos, setLoadingTipos]     = useState(false);
  const [loadingDeptos, setLoadingDeptos]   = useState(false);
  const [loadingMun, setLoadingMun]         = useState(false);
  const [loadingMoreMun, setLoadingMoreMun] = useState(false);

  // selected
  const [tipoDocumentoId, setTipoDocumentoId]     = useState<number>(1);
  const [departamentoId, setDepartamentoId]       = useState("");
  const [selectedDeptoName, setSelectedDeptoName] = useState("");
  const [municipioId, setMunicipioId]             = useState("");
  const [selectedMunName, setSelectedMunName]     = useState("");

  // pagination
  const [munPage, setMunPage]     = useState(1);
  const [munHasMore, setMunHasMore] = useState(false);
  const [munSearch, setMunSearch]   = useState("");

  // modals
  const [showTipoModal, setShowTipoModal]   = useState(false);
  const [showDeptoModal, setShowDeptoModal] = useState(false);
  const [showMunModal, setShowMunModal]     = useState(false);

  const [loading, setLoading] = useState(false);

  const loadTiposDocumento = useCallback(async () => {
    if (tiposDocumento.length > 0 || loadingTipos) return;
    setLoadingTipos(true);
    try {
      setTiposDocumento(await getTiposDocumento());
    } finally {
      setLoadingTipos(false);
    }
  }, [tiposDocumento.length, loadingTipos]);

  const loadDepartamentos = useCallback(async () => {
    if (departamentos.length > 0 || loadingDeptos) return;
    setLoadingDeptos(true);
    try {
      setDepartamentos(await getDepartamentos());
    } finally {
      setLoadingDeptos(false);
    }
  }, [departamentos.length, loadingDeptos]);

  const openTipoModal = useCallback(async () => {
    await loadTiposDocumento();
    setShowTipoModal(true);
  }, [loadTiposDocumento]);

  const openDeptoModal = useCallback(async () => {
    await loadDepartamentos();
    setShowDeptoModal(true);
  }, [loadDepartamentos]);

  const loadMunicipios = useCallback(async (deptoId: string, page = 1, search = "") => {
    if (page === 1) setLoadingMun(true);
    else setLoadingMoreMun(true);
    try {
      const data = await getMunicipios(deptoId, page, 10, search);
      setMunicipios(prev => page === 1 ? data.data : [...prev, ...data.data]);
      setMunHasMore(data.hasMore);
      setMunPage(page);
    } finally {
      setLoadingMun(false);
      setLoadingMoreMun(false);
    }
  }, []);

  const openMunModal = useCallback(async () => {
    if (!departamentoId) return;
    if (municipios.length === 0 && !loadingMun) {
      await loadMunicipios(departamentoId, 1, munSearch);
    }
    setShowMunModal(true);
  }, [departamentoId, loadingMun, loadMunicipios, municipios.length, munSearch]);

  const handleSelectDepto = (depto: Departamento) => {
    setDepartamentoId(depto.id);
    setSelectedDeptoName(depto.nombre);
    setMunicipioId(""); setSelectedMunName("");
    setMunicipios([]); setMunSearch("");
    loadMunicipios(depto.id, 1);
    setShowDeptoModal(false);
  };

  const selectedTipo = tiposDocumento.find(t => t.id === tipoDocumentoId);

  const handleRegister = async () => {
    if (tipoCliente === "natural") {
      if (!correo.trim() || !password.trim() || !nombre.trim() || !apellido.trim() || !documento.trim()) {
        toast.error("Completa los campos obligatorios"); return;
      }
      if (!telefono.trim()) { toast.error("El teléfono es obligatorio"); return; }
      if (password !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
      if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/register/cliente`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre, apellido, correo, password, documento, tipoDocumentoId,
            telefono, direccion: direccion || undefined,
            departamentoId: departamentoId || undefined,
            municipioId: municipioId || undefined,
          }),
        });
        if (!response.ok) {
          toast.error(await extractApiErrorMessage(response, "Error al registrar."));
          void triggerHaptic("error"); return;
        }
        const data = await response.json();
        void triggerHaptic("success");
        toast.success(data.message || "Revisa tu correo para verificar la cuenta.");
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: correo, next: "/login" },
        } as any);
      } catch { toast.error("Error al conectar con el servidor"); } finally { setLoading(false); }
    } else {
      if (!razonSocial.trim() || !nit.trim() || !empCorreo.trim() || !empPassword.trim()) {
        toast.error("Completa los campos obligatorios de la empresa"); return;
      }
      if (empPassword !== empConfirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
      if (empPassword.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/register/empresa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razonSocial, nit, sector: sector || undefined, correo: empCorreo, password: empPassword,
            repNombre: repNombre || undefined, repApellido: repApellido || undefined,
            repDocumento: repDocumento || undefined, repCargo: repCargo || undefined,
            repEmail: repEmail || undefined, repTelefono: repTelefono || undefined,
          }),
        });
        if (!response.ok) {
          toast.error(await extractApiErrorMessage(response, "Error al registrar."));
          void triggerHaptic("error"); return;
        }
        const data = await response.json();
        void triggerHaptic("success");
        toast.success(data.message || "Revisa tu correo para verificar la cuenta.");
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: empCorreo, next: "/login" },
        } as any);
      } catch { toast.error("Error al conectar con el servidor"); } finally { setLoading(false); }
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
            <Text style={styles.headerSubtitle}>Portal del Cliente</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Ionicons name={tipoCliente === "natural" ? "person-add" : "business"} size={22} color={Colors.primary} />
          </View>
        </View>

        {/* Tipo selector */}
        <View style={styles.tipoSelector}>
          <Pressable
            style={[styles.tipoBtn, tipoCliente === "natural" && styles.tipoBtnActive]}
            onPress={() => setTipoCliente("natural")}
          >
            <Ionicons name="person-outline" size={16} color={tipoCliente === "natural" ? Colors.primary : "rgba(255,255,255,0.7)"} />
            <Text style={[styles.tipoBtnText, tipoCliente === "natural" && styles.tipoBtnTextActive]}>
              Persona Natural
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tipoBtn, tipoCliente === "empresa" && styles.tipoBtnActive]}
            onPress={() => setTipoCliente("empresa")}
          >
            <Ionicons name="business-outline" size={16} color={tipoCliente === "empresa" ? Colors.primary : "rgba(255,255,255,0.7)"} />
            <Text style={[styles.tipoBtnText, tipoCliente === "empresa" && styles.tipoBtnTextActive]}>
              Empresa
            </Text>
          </Pressable>
        </View>
        {desktop && (
          <View style={styles.desktopHeaderBody}>
            <Text style={styles.desktopHeaderTitle}>Crea tu acceso al portal del cliente</Text>
            <Text style={styles.desktopHeaderText}>
              Registra una cuenta personal o empresarial para consultar procesos, documentos, mensajes y novedades jurídicas desde un mismo entorno.
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

          {/* ══════════════════ PERSONA NATURAL ══════════════════ */}
          {tipoCliente === "natural" && (
            <>
              {/* Acceso */}
              <View style={styles.card}>
                <Section title="Acceso" iconName="lock-closed-outline" iconColor={Colors.primary} />
                <Field label="Correo electrónico" required>
                  <StyledInput
                    icon="mail-outline"
                    placeholder="juan@ejemplo.com"
                    value={correo}
                    onChangeText={setCorreo}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </Field>
                <Field label="Contraseña" required>
                  <StyledInput
                    icon="lock-closed-outline"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChangeText={setPassword}
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
                      style={inputStyles.input}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={Colors.textTertiary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                    />
                    {confirmPassword.length > 0 && (
                      <Ionicons
                        name={password === confirmPassword ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={password === confirmPassword ? Colors.success : Colors.danger}
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
                      <StyledInput icon="person-outline" placeholder="Juan" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Apellido" required>
                      <StyledInput placeholder="Pérez" value={apellido} onChangeText={setApellido} autoCapitalize="words" />
                    </Field>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Tipo doc." required>
                      {loadingTipos ? <ActivityIndicator color={Colors.primary} /> : (
                        <StyledInput
                          icon="card-outline"
                          isSelect
                          value={selectedTipo?.codigo}
                          placeholder="Selec."
                          onPress={openTipoModal}
                          rightIcon="chevron-down"
                        />
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
                  <StyledInput icon="call-outline" placeholder="300 123 4567" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
                </Field>
              </View>

              {/* Ubicación */}
              <View style={styles.card}>
                <Section title="Ubicación" subtitle="Opcional" iconName="location-outline" iconColor={Colors.success} />
                <Field label="Departamento">
                  {loadingDeptos ? <ActivityIndicator color={Colors.primary} /> : (
                    <StyledInput
                      icon="map-outline"
                      isSelect
                      value={selectedDeptoName}
                      placeholder="Seleccionar departamento"
                      onPress={openDeptoModal}
                      rightIcon="chevron-down"
                    />
                  )}
                </Field>
                <Field label="Municipio">
                  <StyledInput
                    icon="pin-outline"
                    isSelect
                    value={selectedMunName}
                    placeholder={departamentoId ? "Seleccionar municipio" : "Primero selecciona un departamento"}
                    onPress={openMunModal}
                    disabled={!departamentoId}
                    rightIcon={departamentoId ? "chevron-down" : undefined}
                  />
                </Field>
                <Field label="Dirección">
                  <StyledInput icon="home-outline" placeholder="Calle 123 # 45-67" value={direccion} onChangeText={setDireccion} />
                </Field>
              </View>
            </>
          )}

          {/* ══════════════════ EMPRESA ══════════════════ */}
          {tipoCliente === "empresa" && (
            <>
              {/* Datos empresa */}
              <View style={styles.card}>
                <Section title="Datos de la Empresa" iconName="business-outline" iconColor={Colors.primary} />
                <Field label="Razón Social" required>
                  <StyledInput icon="business-outline" placeholder="Empresa S.A.S." value={razonSocial} onChangeText={setRazonSocial} autoCapitalize="words" />
                </Field>
                <Field label="NIT" required>
                  <StyledInput icon="document-text-outline" placeholder="900123456-7" value={nit} onChangeText={setNit} keyboardType="numbers-and-punctuation" />
                </Field>
                <Field label="Sector">
                  <StyledInput icon="briefcase-outline" placeholder="Tecnología, Salud, Construcción..." value={sector} onChangeText={setSector} />
                </Field>
              </View>

              {/* Acceso empresa */}
              <View style={styles.card}>
                <Section title="Acceso" iconName="lock-closed-outline" iconColor={Colors.info} />
                <Field label="Correo electrónico" required>
                  <StyledInput icon="mail-outline" placeholder="contacto@empresa.com" value={empCorreo} onChangeText={setEmpCorreo} autoCapitalize="none" keyboardType="email-address" />
                </Field>
                <Field label="Contraseña" required>
                  <StyledInput
                    icon="lock-closed-outline" placeholder="Mínimo 8 caracteres"
                    value={empPassword} onChangeText={setEmpPassword}
                    secureTextEntry={!showEmpPass}
                    rightIcon={showEmpPass ? "eye-off-outline" : "eye-outline"}
                    onRightPress={() => setShowEmpPass(!showEmpPass)}
                  />
                </Field>
                <Field label="Confirmar contraseña" required>
                  <View style={[
                    inputStyles.wrapper,
                    empConfirmPassword.length > 0 && { borderColor: empPassword === empConfirmPassword ? Colors.success : Colors.danger }
                  ]}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={{ marginLeft: 14 }} />
                    <TextInput
                      style={inputStyles.input}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={Colors.textTertiary}
                      value={empConfirmPassword}
                      onChangeText={setEmpConfirmPassword}
                      secureTextEntry={!showEmpConfirm}
                    />
                    {empConfirmPassword.length > 0 && (
                      <Ionicons
                        name={empPassword === empConfirmPassword ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={empPassword === empConfirmPassword ? Colors.success : Colors.danger}
                        style={{ marginRight: 10 }}
                      />
                    )}
                    <Pressable onPress={() => setShowEmpConfirm(!showEmpConfirm)} style={{ marginRight: 14 }} hitSlop={8}>
                      <Ionicons name={showEmpConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textTertiary} />
                    </Pressable>
                  </View>
                </Field>
              </View>

              {/* Representante legal */}
              <View style={styles.card}>
                <Section title="Representante Legal" subtitle="Opcional" iconName="person-circle-outline" iconColor={Colors.accent} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Nombre">
                      <StyledInput placeholder="María" value={repNombre} onChangeText={setRepNombre} autoCapitalize="words" />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Apellido">
                      <StyledInput placeholder="García" value={repApellido} onChangeText={setRepApellido} autoCapitalize="words" />
                    </Field>
                  </View>
                </View>
                <Field label="Documento">
                  <StyledInput icon="card-outline" placeholder="12345678" value={repDocumento} onChangeText={setRepDocumento} keyboardType="number-pad" />
                </Field>
                <Field label="Cargo">
                  <StyledInput icon="briefcase-outline" placeholder="Gerente General" value={repCargo} onChangeText={setRepCargo} autoCapitalize="words" />
                </Field>
                <Field label="Correo del representante">
                  <StyledInput icon="mail-outline" placeholder="rep@empresa.com" value={repEmail} onChangeText={setRepEmail} autoCapitalize="none" keyboardType="email-address" />
                </Field>
                <Field label="Teléfono del representante">
                  <StyledInput icon="call-outline" placeholder="300 123 4567" value={repTelefono} onChangeText={setRepTelefono} keyboardType="phone-pad" />
                </Field>
              </View>
            </>
          )}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Ionicons name="person-add-outline" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Crear Cuenta</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
            <Text style={[styles.loginLinkText, { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Inicia sesión
            </Text>
          </Pressable>
          </View>
          {desktop && (
            <View style={styles.desktopAside}>
              <View style={styles.desktopAsideCard}>
                <Text style={styles.desktopAsideLabel}>Portal</Text>
                <Text style={styles.desktopAsideTitle}>{tipoCliente === "natural" ? "Cuenta de cliente personal" : "Cuenta de cliente empresa"}</Text>
                <Text style={styles.desktopAsideText}>
                  {tipoCliente === "natural"
                    ? "Ideal para personas que necesitan seguimiento directo de sus procesos."
                    : "Pensado para empresas que gestionan asuntos jurídicos desde un acceso institucional."}
                </Text>
                <View style={styles.desktopBulletList}>
                  <Text style={styles.desktopBullet}>Consulta de procesos y etapas</Text>
                  <Text style={styles.desktopBullet}>Acceso a documentos y novedades</Text>
                  <Text style={styles.desktopBullet}>Comunicación con tu abogado o firma</Text>
                  <Text style={styles.desktopBullet}>Vista adaptada al tipo de cliente</Text>
                </View>
              </View>
            </View>
          )}
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: Tipo documento ── */}
      <Modal visible={showTipoModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowTipoModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tipo de documento</Text>
            <FlatList
              data={tiposDocumento}
              keyExtractor={item => String(item.id)}
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

      {/* ── Modal: Departamento ── */}
      <Modal visible={showDeptoModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowDeptoModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Departamento</Text>
            <FlatList
              data={departamentos}
              keyExtractor={item => item.id}
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

      {/* ── Modal: Municipio ── */}
      <Modal visible={showMunModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowMunModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Municipio</Text>
            <View style={styles.sheetSearch}>
              <Ionicons name="search-outline" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="Buscar municipio..."
                placeholderTextColor={Colors.textTertiary}
                value={munSearch}
                onChangeText={text => { setMunSearch(text); loadMunicipios(departamentoId, 1, text); }}
              />
            </View>
            {loadingMun ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={municipios}
                keyExtractor={item => item.id}
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

  // Tipo selector
  tipoSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, padding: 4, gap: 4,
  },
  tipoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tipoBtnActive: { backgroundColor: Colors.white },
  tipoBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  tipoBtnTextActive: { fontFamily: "Inter_700Bold", color: Colors.primary },
  desktopHeaderBody: { marginTop: 18, maxWidth: 780, gap: 8 },
  desktopHeaderTitle: { fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold", color: Colors.white },
  desktopHeaderText: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)" },

  // Scroll
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

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16, padding: 16, gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  row: { flexDirection: "row", gap: 12 },

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
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "70%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center", marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 12 },
  sheetSearch: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  sheetItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  sheetItemSelected: { backgroundColor: Colors.primary + "08" },
  sheetItemText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  sheetItemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
});
