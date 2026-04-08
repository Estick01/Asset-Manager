// app/portal/profile.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Platform, ActivityIndicator, Modal,
  TouchableOpacity, ScrollView, FlatList, useWindowDimensions
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useUnifiedAuth } from "@/lib/auth-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { apiRequest } from "@/lib/query-client";
import { extractApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner-native";
import { isDesktopViewport } from "@/lib/ui/breakpoints";

const PORTAL_BLUE = "#1B5A8C";
const PORTAL_BLUE_DARK = "#0D3B66";

interface TipoDocumento { id: number; nombre: string; }
interface Departamento { id: string; nombre: string; }
interface Municipio { id: string; nombre: string; }
interface MunicipioRes { data: Municipio[]; total: number; hasMore: boolean; }

export default function ClientProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const compactMobile = width < 420;
  const { user, updateProfile } = useUnifiedAuth();

  // Client type loaded from API (not from cached auth profile)
  const [clienteTipo, setClienteTipo] = useState<"natural" | "empresa" | undefined>(undefined);
  const isEmpresa = clienteTipo === "empresa";

  // ── Natural person fields ──────────────────────────────────
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [documento, setDocumento] = useState("");
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number>(1);
  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");

  // ── Empresa fields ─────────────────────────────────────────
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");
  const [sector, setSector] = useState("");

  // ── Representante legal fields ─────────────────────────────
  const [repNombre, setRepNombre] = useState("");
  const [repApellido, setRepApellido] = useState("");
  const [repTelefono, setRepTelefono] = useState("");
  const [repDocumento, setRepDocumento] = useState("");
  const [repTipoDocumentoId, setRepTipoDocumentoId] = useState<number>(1);
  const [repCargo, setRepCargo] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repDireccion, setRepDireccion] = useState("");

  // ── Common fields ──────────────────────────────────────────
  const [correo, setCorreo] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ── Catálogos ──────────────────────────────────────────────
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedDeptoName, setSelectedDeptoName] = useState("");
  const [selectedMunicipioName, setSelectedMunicipioName] = useState("");

  // ── Municipio pagination ───────────────────────────────────
  const [munPage, setMunPage] = useState(1);
  const [munTotal, setMunTotal] = useState(0);
  const [munHasMore, setMunHasMore] = useState(false);
  const [munSearch, setMunSearch] = useState("");
  const [loadingMun, setLoadingMun] = useState(false);
  const [loadingMoreMun, setLoadingMoreMun] = useState(false);

  // ── Modals ─────────────────────────────────────────────────
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showRepTipoModal, setShowRepTipoModal] = useState(false);
  const [showDeptoModal, setShowDeptoModal] = useState(false);
  const [showMunModal, setShowMunModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (departamentoId && departamentos.length > 0) {
      const d = departamentos.find(d => d.id === departamentoId);
      if (d) setSelectedDeptoName(d.nombre);
    }
  }, [departamentoId, departamentos]);

  useEffect(() => {
    if (municipioId && municipios.length > 0) {
      const m = municipios.find(m => m.id === municipioId);
      if (m) setSelectedMunicipioName(m.nombre);
    }
  }, [municipioId, municipios]);

  const loadCatalogos = useCallback(async () => {
    const [tiposRes, deptosRes] = await Promise.all([
      apiRequest("GET", "/api/tipos-documento"),
      apiRequest("GET", "/api/departamentos"),
    ]);
    if (tiposRes.ok) setTiposDocumento(await tiposRes.json());
    if (deptosRes.ok) setDepartamentos(await deptosRes.json());
  }, []);

  const loadMunicipios = useCallback(async (deptoId: string, page = 1, search = "") => {
    if (page === 1) {
      setLoadingMun(true);
    } else {
      setLoadingMoreMun(true);
    }
    try {
      const params = new URLSearchParams({
        departamentoId: deptoId, page: String(page), pageSize: "10",
        ...(search ? { search } : {}),
      });
      const res = await apiRequest("GET", `/api/municipios?${params}`);
      if (res.ok) {
        const data: MunicipioRes = await res.json();
        setMunicipios(prev => page === 1 ? data.data : [...prev, ...data.data]);
        setMunTotal(data.total);
        setMunHasMore(data.hasMore);
        setMunPage(page);
      }
    } finally {
      setLoadingMun(false);
      setLoadingMoreMun(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await loadCatalogos();

    // Always fetch fresh data from the API (includes representante legal for empresa)
    setCorreo((user as any)?.user?.email || "");
    try {
      const res = await apiRequest("GET", "/api/cliente/me");
      if (res.ok) {
        const p = await res.json();
        setClienteTipo(p.tipo);

        if (p.tipo === "empresa") {
          setRazonSocial(p.empresa?.razonSocial || "");
          setNit(p.empresa?.nit || "");
          setSector(p.empresa?.sector || "");
          const rep = p.empresa?.representanteLegal;
          if (rep) {
            setRepCargo(rep.cargo || "");
            setRepEmail(rep.email || "");
            const persona = rep.persona;
            if (persona) {
              setRepNombre(persona.nombre || "");
              setRepApellido(persona.apellido || "");
              setRepTelefono(persona.telefono || "");
              setRepDocumento(persona.documento || "");
              setRepDireccion(persona.direccion || "");
              if (persona.tipoDocumentoId) setRepTipoDocumentoId(Number(persona.tipoDocumentoId));
              // Reusar los estados de depto/municipio para el representante
              const deptoId = persona.departamentoId;
              if (deptoId) {
                setDepartamentoId(deptoId);
                await loadMunicipios(deptoId, 1);
              }
              if (persona.municipioId) setMunicipioId(persona.municipioId);
            }
          }
        } else {
          setNombre(p.natural?.persona?.nombre || "");
          setApellido(p.natural?.persona?.apellido || "");
          setTelefono(p.natural?.persona?.telefono || "");
          setDireccion(p.natural?.persona?.direccion || "");
          setDocumento(p.natural?.persona?.documento || "");
          if (p.natural?.persona?.tipoDocumentoId) setTipoDocumentoId(Number(p.natural.persona.tipoDocumentoId));
          const deptoId = p.natural?.persona?.departamentoId;
          if (deptoId) {
            setDepartamentoId(deptoId);
            await loadMunicipios(deptoId, 1);
          }
          const munId = p.natural?.persona?.municipioId;
          if (munId) setMunicipioId(munId);
        }
      }
    } catch {
      toast.error("No se pudo cargar el perfil.");
    }
    setLoading(false);
  }, [user, loadCatalogos, loadMunicipios]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    if (!correo.trim()) { toast.error("El correo es obligatorio."); return; }
    if (isEmpresa && !razonSocial.trim()) { toast.error("La razón social es obligatoria."); return; }
    if (!isEmpresa && !nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (newPassword || confirmPassword) {
      if (!currentPassword) { toast.error("Debes ingresar tu contraseña actual."); return; }
      if (newPassword.length < 6) { toast.error("La contraseña nueva debe tener al menos 6 caracteres."); return; }
      if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden."); return; }
    }
    setSaving(true);
    try {
      const updates: Record<string, any> = { correo: correo.trim() };
      if (newPassword) {
        updates.password = newPassword;
        updates.currentPassword = currentPassword;
      }

      if (isEmpresa) {
        updates.razonSocial = razonSocial.trim();
        updates.nit = nit.trim();
        updates.sector = sector.trim() || null;
        updates.repNombre = repNombre.trim();
        updates.repApellido = repApellido.trim();
        updates.repTelefono = repTelefono.trim();
        updates.repDocumento = repDocumento.trim();
        updates.repTipoDocumentoId = repTipoDocumentoId;
        updates.repCargo = repCargo.trim();
        updates.repEmail = repEmail.trim();
        updates.repDireccion = repDireccion.trim() || null;
        updates.repDepartamentoId = departamentoId || null;
        updates.repMunicipioId = municipioId || null;
      } else {
        updates.nombre = nombre.trim();
        updates.apellido = apellido.trim();
        updates.telefono = telefono.trim();
        updates.direccion = direccion.trim();
        updates.documento = documento.trim();
        updates.tipoDocumentoId = tipoDocumentoId;
        updates.departamentoId = departamentoId || null;
        updates.municipioId = municipioId || null;
      }

      const res = await apiRequest("PUT", "/api/cliente/me", updates);
      if (!res.ok) {
        throw new Error(await extractApiErrorMessage(res, "Error al guardar"));
      }
      const updated = await res.json();
      await updateProfile({ profile: updated } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Perfil actualizado correctamente.");
      setTimeout(() => router.replace("/portal"), 1500);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar los datos.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const selectedTipo = tiposDocumento.find(t => t.id === tipoDocumentoId);
  const selectedRepTipo = tiposDocumento.find(t => t.id === repTipoDocumentoId);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PORTAL_BLUE} />
      </View>
    );
  }

  const avatarText = isEmpresa
    ? (razonSocial.charAt(0) || "E").toUpperCase()
    : `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || "C";

  const avatarName = isEmpresa ? razonSocial : `${nombre} ${apellido}`;

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingBottom: 85 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[PORTAL_BLUE_DARK, PORTAL_BLUE]}
          style={[
            styles.header,
            desktop && styles.desktopHeader,
            compactMobile && styles.headerCompact,
            { paddingTop: insets.top + 16 },
          ]}
        >
          <View style={[styles.headerRow, desktop && styles.desktopHeaderRow]}>
            <Pressable onPress={() => router.replace("/portal")} style={styles.headerBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={[styles.avatarWrap, desktop && styles.desktopAvatarWrap]}>
            <View style={[styles.avatar, desktop && styles.desktopAvatar]}>
              <Text style={styles.avatarText}>{avatarText}</Text>
            </View>
            <Text style={styles.avatarName}>{avatarName}</Text>
            <Text style={styles.avatarEmail}>{correo}</Text>
            {isEmpresa && (
              <View style={styles.badge}>
                <Ionicons name="business-outline" size={12} color="#fff" />
                <Text style={styles.badgeText}>Empresa</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.content, desktop && styles.desktopContent, compactMobile && styles.contentCompact]}>
          {/* ── Correo (común) ── */}
          <View style={[styles.section, desktop && styles.desktopSection]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: PORTAL_BLUE + "15" }]}>
                <Ionicons name="mail-outline" size={16} color={PORTAL_BLUE} />
              </View>
              <Text style={styles.sectionTitle}>Cuenta</Text>
            </View>
            <Field label="Correo electrónico" required>
              <TextInput style={styles.input} value={correo} onChangeText={setCorreo}
                placeholder="tu@correo.com" placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address" autoCapitalize="none" />
            </Field>
          </View>

          {isEmpresa ? (
            <>
              {/* ── Datos empresa ── */}
              <View style={[styles.section, desktop && styles.desktopSection]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: PORTAL_BLUE + "15" }]}>
                    <Ionicons name="business-outline" size={16} color={PORTAL_BLUE} />
                  </View>
                  <Text style={styles.sectionTitle}>Datos de la Empresa</Text>
                </View>
                <Field label="Razón social" required>
                  <TextInput style={styles.input} value={razonSocial} onChangeText={setRazonSocial}
                    placeholder="Nombre de la empresa" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="NIT">
                  <TextInput style={styles.input} value={nit} onChangeText={setNit}
                    placeholder="NIT de la empresa" placeholderTextColor={Colors.textTertiary} />
                </Field>
                <Field label="Sector">
                  <TextInput style={styles.input} value={sector} onChangeText={setSector}
                    placeholder="Ej: Tecnología, Comercio..." placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
              </View>

              {/* ── Representante legal ── */}
              <View style={[styles.section, desktop && styles.desktopSection]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: Colors.warning + "15" }]}>
                    <Ionicons name="person-outline" size={16} color={Colors.warning} />
                  </View>
                  <Text style={styles.sectionTitle}>Representante Legal</Text>
                </View>
                <Field label="Nombre">
                  <TextInput style={styles.input} value={repNombre} onChangeText={setRepNombre}
                    placeholder="Nombre" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="Apellido">
                  <TextInput style={styles.input} value={repApellido} onChangeText={setRepApellido}
                    placeholder="Apellido" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="Cargo">
                  <TextInput style={styles.input} value={repCargo} onChangeText={setRepCargo}
                    placeholder="Ej: Gerente General" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="Correo del representante">
                  <TextInput style={styles.input} value={repEmail} onChangeText={setRepEmail}
                    placeholder="correo@empresa.com" placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address" autoCapitalize="none" />
                </Field>
                <Field label="Teléfono">
                  <TextInput style={styles.input} value={repTelefono} onChangeText={setRepTelefono}
                    placeholder="+57 300 000 0000" placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad" />
                </Field>
                <Field label="Tipo de documento">
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowRepTipoModal(true)}>
                    <Text style={styles.selectBtnText}>{selectedRepTipo?.nombre || "Seleccionar tipo"}</Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </Field>
                <Field label="Número de documento">
                  <TextInput style={styles.input} value={repDocumento} onChangeText={setRepDocumento}
                    placeholder="CC, CE, NIT..." placeholderTextColor={Colors.textTertiary} />
                </Field>
                <Field label="Dirección">
                  <TextInput style={styles.input} value={repDireccion} onChangeText={setRepDireccion}
                    placeholder="Dirección del representante" placeholderTextColor={Colors.textTertiary} />
                </Field>
                <Field label="Departamento">
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDeptoModal(true)}>
                    <Text style={styles.selectBtnText}>{selectedDeptoName || "Seleccionar departamento"}</Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </Field>
                <Field label="Municipio">
                  <TouchableOpacity
                    style={[styles.selectBtn, !departamentoId && styles.selectBtnDisabled]}
                    onPress={() => departamentoId && setShowMunModal(true)}
                    disabled={!departamentoId}
                  >
                    <Text style={[styles.selectBtnText, !departamentoId && { color: Colors.textTertiary }]}>
                      {selectedMunicipioName || (departamentoId ? "Seleccionar municipio" : "Seleccione un departamento primero")}
                    </Text>
                    {departamentoId && <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />}
                  </TouchableOpacity>
                </Field>
              </View>
            </>
          ) : (
            <>
              {/* ── Datos personales ── */}
              <View style={[styles.section, desktop && styles.desktopSection]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: PORTAL_BLUE + "15" }]}>
                    <Ionicons name="person-outline" size={16} color={PORTAL_BLUE} />
                  </View>
                  <Text style={styles.sectionTitle}>Datos Personales</Text>
                </View>
                <Field label="Nombre" required>
                  <TextInput style={styles.input} value={nombre} onChangeText={setNombre}
                    placeholder="Tu nombre" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="Apellido" required>
                  <TextInput style={styles.input} value={apellido} onChangeText={setApellido}
                    placeholder="Tu apellido" placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words" />
                </Field>
                <Field label="Teléfono">
                  <TextInput style={styles.input} value={telefono} onChangeText={setTelefono}
                    placeholder="+57 300 000 0000" placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad" />
                </Field>
                <Field label="Dirección">
                  <TextInput style={styles.input} value={direccion} onChangeText={setDireccion}
                    placeholder="Tu dirección" placeholderTextColor={Colors.textTertiary} />
                </Field>
              </View>

              {/* ── Documento ── */}
              <View style={[styles.section, desktop && styles.desktopSection]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: Colors.warning + "15" }]}>
                    <Ionicons name="card-outline" size={16} color={Colors.warning} />
                  </View>
                  <Text style={styles.sectionTitle}>Documento de Identidad</Text>
                </View>
                <Field label="Tipo de documento">
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTipoModal(true)}>
                    <Text style={styles.selectBtnText}>{selectedTipo?.nombre || "Seleccionar tipo"}</Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </Field>
                <Field label="Número de documento">
                  <TextInput style={styles.input} value={documento} onChangeText={setDocumento}
                    placeholder="CC, NIT, etc." placeholderTextColor={Colors.textTertiary} />
                </Field>
              </View>

              {/* ── Ubicación ── */}
              <View style={[styles.section, desktop && styles.desktopSection]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: Colors.success + "15" }]}>
                    <Ionicons name="location-outline" size={16} color={Colors.success} />
                  </View>
                  <Text style={styles.sectionTitle}>Ubicación</Text>
                </View>
                <Field label="Departamento">
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDeptoModal(true)}>
                    <Text style={styles.selectBtnText}>{selectedDeptoName || "Seleccionar departamento"}</Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </Field>
                <Field label="Municipio">
                  <TouchableOpacity
                    style={[styles.selectBtn, !departamentoId && styles.selectBtnDisabled]}
                    onPress={() => departamentoId && setShowMunModal(true)}
                    disabled={!departamentoId}
                  >
                    <Text style={[styles.selectBtnText, !departamentoId && { color: Colors.textTertiary }]}>
                      {selectedMunicipioName || (departamentoId ? "Seleccionar municipio" : "Seleccione un departamento primero")}
                    </Text>
                    {departamentoId && <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />}
                  </TouchableOpacity>
                </Field>
              </View>
            </>
          )}

          {/* ── Contraseña ── */}
          <View style={[styles.section, desktop && styles.desktopSection]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.accent + "15" }]}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Cambiar Contraseña</Text>
            </View>
            <Text style={styles.sectionHint}>Deja en blanco si no deseas cambiarla</Text>
            <Field label="Contraseña actual">
              <View style={styles.pwdWrapper}>
                <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={currentPassword} onChangeText={setCurrentPassword}
                  placeholder="Tu contraseña actual" placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showCurrentPwd} />
                <Pressable onPress={() => setShowCurrentPwd(p => !p)} hitSlop={8} style={styles.pwdEye}>
                  <Ionicons name={showCurrentPwd ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </Field>
            <Field label="Nueva contraseña">
              <View style={styles.pwdWrapper}>
                <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={newPassword} onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres" placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showNewPwd} />
                <Pressable onPress={() => setShowNewPwd(p => !p)} hitSlop={8} style={styles.pwdEye}>
                  <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </Field>
            <Field label="Confirmar contraseña">
              <View style={styles.pwdWrapper}>
                <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={confirmPassword} onChangeText={setConfirmPassword}
                  placeholder="Repite la contraseña" placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showConfirmPwd} />
                <Pressable onPress={() => setShowConfirmPwd(p => !p)} hitSlop={8} style={styles.pwdEye}>
                  <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </Field>
          </View>

          {/* ── Guardar ── */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, desktop && styles.desktopSaveBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}
          >
            <LinearGradient colors={[PORTAL_BLUE_DARK, PORTAL_BLUE]} style={styles.saveBtnGradient}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                </>
              }
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      {/* ── Modal tipo documento (natural) ── */}
      <Modal visible={showTipoModal} transparent animationType="fade" onRequestClose={() => setShowTipoModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowTipoModal(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Tipo de documento</Text>
            {tiposDocumento.map(t => (
              <TouchableOpacity key={t.id}
                style={[styles.modalOpt, tipoDocumentoId === t.id && styles.modalOptSelected]}
                onPress={() => { setTipoDocumentoId(t.id); setShowTipoModal(false); }}
              >
                <Text style={[styles.modalOptText, tipoDocumentoId === t.id && styles.modalOptTextSelected]}>{t.nombre}</Text>
                {tipoDocumentoId === t.id && <Ionicons name="checkmark" size={18} color={PORTAL_BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal tipo documento (representante) ── */}
      <Modal visible={showRepTipoModal} transparent animationType="fade" onRequestClose={() => setShowRepTipoModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowRepTipoModal(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Tipo de documento</Text>
            {tiposDocumento.map(t => (
              <TouchableOpacity key={t.id}
                style={[styles.modalOpt, repTipoDocumentoId === t.id && styles.modalOptSelected]}
                onPress={() => { setRepTipoDocumentoId(t.id); setShowRepTipoModal(false); }}
              >
                <Text style={[styles.modalOptText, repTipoDocumentoId === t.id && styles.modalOptTextSelected]}>{t.nombre}</Text>
                {repTipoDocumentoId === t.id && <Ionicons name="checkmark" size={18} color={PORTAL_BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal departamento ── */}
      <Modal visible={showDeptoModal} transparent animationType="fade" onRequestClose={() => setShowDeptoModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDeptoModal(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Departamento</Text>
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
              {departamentos.map(d => (
                <TouchableOpacity key={d.id}
                  style={[styles.modalOpt, departamentoId === d.id && styles.modalOptSelected]}
                  onPress={() => {
                    setDepartamentoId(d.id);
                    setSelectedDeptoName(d.nombre);
                    setMunicipioId("");
                    setSelectedMunicipioName("");
                    setMunicipios([]);
                    setMunSearch("");
                    loadMunicipios(d.id, 1);
                    setShowDeptoModal(false);
                  }}
                >
                  <Text style={[styles.modalOptText, departamentoId === d.id && styles.modalOptTextSelected]}>{d.nombre}</Text>
                  {departamentoId === d.id && <Ionicons name="checkmark" size={18} color={PORTAL_BLUE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal municipio ── */}
      <Modal visible={showMunModal} transparent animationType="fade" onRequestClose={() => setShowMunModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPressIn={() => setShowMunModal(false)}>
          <View style={[styles.modal, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Municipio</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={Colors.textTertiary} />
              <TextInput style={styles.searchInput} value={munSearch}
                onChangeText={t => { setMunSearch(t); loadMunicipios(departamentoId, 1, t); }}
                placeholder="Buscar..." placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
              {munSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setMunSearch(""); loadMunicipios(departamentoId, 1); }}>
                  <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.munCount}>{munTotal} municipio{munTotal !== 1 ? "s" : ""}</Text>
            {loadingMun
              ? <ActivityIndicator size="large" color={PORTAL_BLUE} style={{ marginVertical: 20 }} />
              : (
                <FlatList
                  data={municipios}
                  keyExtractor={i => i.id}
                  style={{ maxHeight: 260 }}
                  nestedScrollEnabled
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalOpt, municipioId === item.id && styles.modalOptSelected]}
                      onPress={() => {
                        setMunicipioId(item.id);
                        setSelectedMunicipioName(item.nombre);
                        setShowMunModal(false);
                      }}
                    >
                      <Text style={[styles.modalOptText, municipioId === item.id && styles.modalOptTextSelected]}>{item.nombre}</Text>
                      {municipioId === item.id && <Ionicons name="checkmark" size={18} color={PORTAL_BLUE} />}
                    </TouchableOpacity>
                  )}
                  onEndReached={() => { if (munHasMore && !loadingMoreMun) loadMunicipios(departamentoId, munPage + 1, munSearch); }}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={loadingMoreMun ? <ActivityIndicator size="small" color={PORTAL_BLUE} /> : null}
                  ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron municipios</Text>}
                />
              )
            }
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>
        {label}{required && <Text style={{ color: Colors.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  group: { gap: 5 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 2 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerCompact: { paddingHorizontal: 16, paddingBottom: 20 },
  desktopHeader: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  desktopHeaderRow: { marginBottom: 26 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },

  avatarWrap: { alignItems: "center", gap: 6 },
  desktopAvatarWrap: { gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  desktopAvatar: {
    width: 88,
    height: 88,
    borderRadius: 30,
  },
  avatarText: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },

  content: { padding: 16, gap: 12 },
  contentCompact: { padding: 12, gap: 10 },
  desktopContent: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 1120,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 18,
  },

  section: {
    backgroundColor: Colors.white,
    borderRadius: 16, padding: 16, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  desktopSection: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15,38,64,0.08)",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: -8 },

  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  selectBtnDisabled: { backgroundColor: Colors.borderLight },
  selectBtnText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, flex: 1 },

  pwdWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    overflow: "hidden",
  },
  pwdEye: { paddingHorizontal: 14 },

  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  desktopSaveBtn: {
    alignSelf: "flex-start",
    minWidth: 260,
  },
  saveBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },


  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modal: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 20, width: "100%", maxWidth: 400,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 14, textAlign: "center" },
  modalOpt: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, marginBottom: 3,
  },
  modalOptSelected: { backgroundColor: PORTAL_BLUE + "15" },
  modalOptText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  modalOptTextSelected: { fontFamily: "Inter_600SemiBold", color: PORTAL_BLUE },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 10, paddingHorizontal: 12, gap: 8, marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: Colors.text },
  munCount: { fontSize: 11, color: Colors.textTertiary, marginBottom: 6 },
  emptyText: { textAlign: "center", color: Colors.textTertiary, paddingVertical: 20 },
});
