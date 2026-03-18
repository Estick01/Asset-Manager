// components/ClientForm.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, Modal, TouchableOpacity, FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { Cliente } from "@/shared/schema";
import type { SaveClienteData } from "@/lib/services/clienteService";

interface TipoDocumento { id: number; nombre: string; codigo: string; }
interface Departamento { id: string; codigo: string; nombre: string; }
interface Municipio { id: string; codigo: string; nombre: string; }
interface MunicipioResponse { data: Municipio[]; total: number; hasMore: boolean; }

// Legacy alias — still accepted by consumers that use ClientFormData
export type ClientFormData = SaveClienteData;

interface ClientFormProps {
  initialData?: Partial<Cliente>;
  onSave: (data: SaveClienteData) => Promise<void>;
  isLoading?: boolean;
  isEditing?: boolean;
  error?: string;
}

type ClienteTipo = "natural" | "empresa";

export function ClientForm({ initialData, onSave, isLoading, isEditing, error }: ClientFormProps) {
  const initialTipo: ClienteTipo = (initialData as any)?.tipo ?? "natural";

  // Representante legal (empresa) — declared early so state initialisers can reference repPersona
  const repLegal = (initialData as any)?.empresa?.representanteLegal;
  const repPersona = repLegal?.persona;

  const [tipo, setTipo] = useState<ClienteTipo>(initialTipo);

  // Natural fields
  const [nombre, setNombre]                     = useState(initialData?.natural?.persona?.nombre ?? "");
  const [apellido, setApellido]                 = useState(initialData?.natural?.persona?.apellido ?? "");
  const [telefono, setTelefono]                 = useState(initialData?.natural?.persona?.telefono ?? "");
  const [documento, setDocumento]               = useState(initialData?.natural?.persona?.documento ?? "");
  const [tipoDocumentoId, setTipoDocumentoId]   = useState(initialData?.natural?.persona?.tipoDocumentoId ?? 1);
  const [direccion, setDireccion]               = useState(initialData?.natural?.persona?.direccion ?? "");
  const [departamentoId, setDepartamentoId]     = useState<string>(initialData?.natural?.persona?.departamentoId ?? repPersona?.departamentoId ?? "");
  const [municipioId, setMunicipioId]           = useState<string>(initialData?.natural?.persona?.municipioId ?? repPersona?.municipioId ?? "");

  // Empresa fields
  const [razonSocial, setRazonSocial]           = useState(initialData?.empresa?.razonSocial ?? "");
  const [nit, setNit]                           = useState(initialData?.empresa?.nit ?? "");
  const [sector, setSector]                     = useState(initialData?.empresa?.sector ?? "");
  const [repNombre, setRepNombre]               = useState(repPersona?.nombre ?? "");
  const [repApellido, setRepApellido]           = useState(repPersona?.apellido ?? "");
  const [repDocumento, setRepDocumento]         = useState(repPersona?.documento ?? "");
  const [repTipoDocId, setRepTipoDocId]         = useState(repPersona?.tipoDocumentoId ?? 1);
  const [repCargo, setRepCargo]                 = useState(repLegal?.cargo ?? "Representante Legal");
  const [repEmail, setRepEmail]                 = useState(repLegal?.email ?? "");
  const [repTelefono, setRepTelefono]           = useState(repPersona?.telefono ?? "");
  const [repDireccion, setRepDireccion]         = useState(repPersona?.direccion ?? "");

  // Common
  const [correo, setCorreo]     = useState(initialData?.user?.email ?? "");
  const [password, setPassword] = useState("");

  // Lookup data
  const [tiposDocumento, setTiposDocumento]           = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos]             = useState<Departamento[]>([]);
  const [municipios, setMunicipios]                   = useState<Municipio[]>([]);
  const [loadingTipos, setLoadingTipos]               = useState(true);
  const [loadingDeptos, setLoadingDeptos]             = useState(true);
  const [loadingMunicipios, setLoadingMunicipios]     = useState(false);
  const [loadingMoreMun, setLoadingMoreMun]           = useState(false);
  const [showTipoModal, setShowTipoModal]             = useState(false);
  const [showRepTipoModal, setShowRepTipoModal]       = useState(false);
  const [showDeptoModal, setShowDeptoModal]           = useState(false);
  const [showMunicipioModal, setShowMunicipioModal]   = useState(false);
  const [municipioPage, setMunicipioPage]             = useState(1);
  const [municipioTotal, setMunicipioTotal]           = useState(0);
  const [municipioHasMore, setMunicipioHasMore]       = useState(false);
  const [municipioSearch, setMunicipioSearch]         = useState("");
  const [selectedDeptoName, setSelectedDeptoName]     = useState(initialData?.natural?.persona?.departamento?.nombre ?? "");
  const [selectedMunicipioName, setSelectedMunicipioName] = useState(initialData?.natural?.persona?.municipio?.nombre ?? "");

  useEffect(() => {
    apiRequest("GET", "/api/tipos-documento").then(async res => {
      if (res.ok) setTiposDocumento(await res.json());
    }).finally(() => setLoadingTipos(false));

    apiRequest("GET", "/api/departamentos").then(async res => {
      if (res.ok) setDepartamentos(await res.json());
    }).finally(() => setLoadingDeptos(false));
  }, []);

  // Load municipios on mount when editing a record that already has a departamentoId
  useEffect(() => {
    const depId = initialData?.natural?.persona?.departamentoId ?? repPersona?.departamentoId;
    if (depId) loadMunicipios(depId, 1);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve departamento / municipio display names once the lookup lists are loaded
  useEffect(() => {
    if (!selectedDeptoName && departamentoId && departamentos.length > 0) {
      const found = departamentos.find(d => d.id === departamentoId);
      if (found) setSelectedDeptoName(found.nombre);
    }
  }, [departamentos, departamentoId]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMunicipioName && municipioId && municipios.length > 0) {
      const found = municipios.find(m => m.id === municipioId);
      if (found) setSelectedMunicipioName(found.nombre);
    }
  }, [municipios, municipioId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const loadMunicipios = useCallback(async (deptoId: string, page: number = 1, search = "") => {
    page === 1 ? setLoadingMunicipios(true) : setLoadingMoreMun(true);
    try {
      const params = new URLSearchParams({
        departamentoId: deptoId, page: page.toString(), pageSize: "10",
        ...(search ? { search } : {}),
      });
      const res = await apiRequest("GET", `/api/municipios?${params}`);
      if (res.ok) {
        const data: MunicipioResponse = await res.json();
        setMunicipios(prev => page === 1 ? data.data : [...prev, ...data.data]);
        setMunicipioTotal(data.total);
        setMunicipioHasMore(data.hasMore);
        setMunicipioPage(page);
      }
    } finally {
      setLoadingMunicipios(false);
      setLoadingMoreMun(false);
    }
  }, []);

  const handleSelectDepartamento = (depto: Departamento) => {
    setDepartamentoId(depto.id);
    setSelectedDeptoName(depto.nombre);
    setMunicipioId("");
    setSelectedMunicipioName("");
    setMunicipios([]);
    setMunicipioSearch("");
    loadMunicipios(depto.id, 1);
    setShowDeptoModal(false);
  };

  const handleSave = () => {
    if (tipo === "natural") {
      onSave({
        tipo: "natural",
        nombre, apellido, correo, telefono, documento,
        tipoDocumentoId,
        direccion: direccion || null,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null,
        password,
      });
    } else {
      onSave({
        tipo: "empresa",
        razonSocial, nit,
        sector: sector || null,
        correo, password,
        repNombre: repNombre || undefined,
        repApellido: repApellido || undefined,
        repDocumento: repDocumento || undefined,
        repTipoDocumentoId: repTipoDocId,
        repCargo: repCargo || undefined,
        repEmail: repEmail || undefined,
        repTelefono: repTelefono || undefined,
        repDireccion: repDireccion || undefined,
        repDepartamentoId: departamentoId || undefined,
        repMunicipioId: municipioId || undefined,
      });
    }
  };

  const selectedTipo    = tiposDocumento.find(t => t.id === tipoDocumentoId);
  const selectedRepTipo = tiposDocumento.find(t => t.id === repTipoDocId);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Tipo de cliente */}
        {!isEditing && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de cliente <Text style={styles.required}>*</Text></Text>
            <View style={styles.tipoRow}>
              {(["natural", "empresa"] as ClienteTipo[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoBtn, tipo === t && styles.tipoBtnActive]}
                  onPress={() => setTipo(t)}
                >
                  <Ionicons
                    name={t === "natural" ? "person-outline" : "business-outline"}
                    size={18}
                    color={tipo === t ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.tipoBtnText, tipo === t && styles.tipoBtnTextActive]}>
                    {t === "natural" ? "Persona natural" : "Empresa"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!isEditing && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              {tipo === "natural"
                ? "El documento y contraseña permiten al cliente acceder al Portal del Cliente."
                : "El correo y contraseña permiten a la empresa acceder al Portal Empresa."}
            </Text>
          </View>
        )}

        {/* Correo — ambos tipos */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={correo} onChangeText={setCorreo}
              placeholder="correo@ejemplo.com" placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        {tipo === "natural" ? (
          <>
            {/* Tipo documento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de documento <Text style={styles.required}>*</Text></Text>
              {loadingTipos ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowTipoModal(true)}>
                  <Text style={styles.selectButtonText}>{selectedTipo?.nombre || "Seleccionar tipo"}</Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Documento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de documento <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={documento} onChangeText={setDocumento}
                  placeholder="Número de documento" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>

            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={nombre} onChangeText={setNombre}
                  placeholder="Nombre del cliente" placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
              </View>
            </View>

            {/* Apellido */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apellido <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={apellido} onChangeText={setApellido}
                  placeholder="Apellido del cliente" placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
              </View>
            </View>

            {/* Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={telefono} onChangeText={setTelefono}
                  placeholder="+57 300 000 0000" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
              </View>
            </View>

            {/* Departamento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Departamento</Text>
              {loadingDeptos ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowDeptoModal(true)}>
                  <Text style={styles.selectButtonText}>{selectedDeptoName || "Seleccionar departamento"}</Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Municipio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Municipio</Text>
              <TouchableOpacity
                style={[styles.selectButton, !departamentoId && styles.selectButtonDisabled]}
                onPress={() => departamentoId && setShowMunicipioModal(true)}
                disabled={!departamentoId}
              >
                <Text style={[styles.selectButtonText, !departamentoId && styles.selectButtonTextDisabled]}>
                  {selectedMunicipioName || (departamentoId ? "Seleccionar municipio" : "Seleccione un departamento primero")}
                </Text>
                {departamentoId && <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />}
              </TouchableOpacity>
            </View>

            {/* Dirección */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={direccion} onChangeText={setDireccion}
                  placeholder="Dirección del cliente" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Razón social */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Razón social <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={razonSocial} onChangeText={setRazonSocial}
                  placeholder="Nombre legal de la empresa" placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
              </View>
            </View>

            {/* NIT */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NIT <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={nit} onChangeText={setNit}
                  placeholder="900.000.000-0" placeholderTextColor={Colors.textTertiary} keyboardType="numeric" />
              </View>
            </View>

            {/* Sector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sector</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={sector} onChangeText={setSector}
                  placeholder="Tecnología, construcción..." placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
              </View>
            </View>

            {/* Representante legal */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Representante Legal</Text>
              <Text style={styles.sectionSubtitle}>Opcional — puede completarse después</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de documento</Text>
              {loadingTipos ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowRepTipoModal(true)}>
                  <Text style={styles.selectButtonText}>{selectedRepTipo?.nombre || "Seleccionar tipo"}</Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Documento</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={repDocumento} onChangeText={setRepDocumento}
                  placeholder="Número de documento" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Nombre</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={repNombre} onChangeText={setRepNombre}
                    placeholder="Nombre" placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Apellido</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} value={repApellido} onChangeText={setRepApellido}
                    placeholder="Apellido" placeholderTextColor={Colors.textTertiary} autoCapitalize="words" />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cargo</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={repCargo} onChangeText={setRepCargo}
                  placeholder="Representante Legal" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email del representante</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={repEmail} onChangeText={setRepEmail}
                  placeholder="representante@empresa.com" placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono del representante</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={repTelefono} onChangeText={setRepTelefono}
                  placeholder="+57 300 000 0000" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Departamento del representante</Text>
              {loadingDeptos ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowDeptoModal(true)}>
                  <Text style={styles.selectButtonText}>{selectedDeptoName || "Seleccionar departamento"}</Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Municipio del representante</Text>
              <TouchableOpacity
                style={[styles.selectButton, !departamentoId && styles.selectButtonDisabled]}
                onPress={() => departamentoId && setShowMunicipioModal(true)}
                disabled={!departamentoId}
              >
                <Text style={[styles.selectButtonText, !departamentoId && styles.selectButtonTextDisabled]}>
                  {selectedMunicipioName || (departamentoId ? "Seleccionar municipio" : "Seleccione un departamento primero")}
                </Text>
                {departamentoId && <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección del representante</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput style={styles.input} value={repDireccion} onChangeText={setRepDireccion}
                  placeholder="Dirección del representante" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
          </>
        )}

        {/* Contraseña — solo en creación */}
        {!isEditing && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña del portal <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder="Contraseña para acceso al portal" placeholderTextColor={Colors.textTertiary}
                secureTextEntry />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable onPress={handleSave} disabled={isLoading}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, isLoading && styles.saveBtnDisabled]}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>{isEditing ? "Guardar Cambios" : "Guardar Cliente"}</Text>
          }
        </Pressable>
      </View>

      {/* Modal tipo documento — cliente natural */}
      <Modal visible={showTipoModal} transparent animationType="fade" onRequestClose={() => setShowTipoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTipoModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de documento</Text>
            {tiposDocumento.map(t => (
              <TouchableOpacity key={t.id}
                style={[styles.modalOption, tipoDocumentoId === t.id && styles.modalOptionSelected]}
                onPress={() => { setTipoDocumentoId(t.id); setShowTipoModal(false); }}
              >
                <Text style={[styles.modalOptionText, tipoDocumentoId === t.id && styles.modalOptionTextSelected]}>{t.nombre}</Text>
                {tipoDocumentoId === t.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal tipo documento — representante legal */}
      <Modal visible={showRepTipoModal} transparent animationType="fade" onRequestClose={() => setShowRepTipoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRepTipoModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de documento (Representante)</Text>
            {tiposDocumento.map(t => (
              <TouchableOpacity key={t.id}
                style={[styles.modalOption, repTipoDocId === t.id && styles.modalOptionSelected]}
                onPress={() => { setRepTipoDocId(t.id); setShowRepTipoModal(false); }}
              >
                <Text style={[styles.modalOptionText, repTipoDocId === t.id && styles.modalOptionTextSelected]}>{t.nombre}</Text>
                {repTipoDocId === t.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal departamento */}
      <Modal visible={showDeptoModal} transparent animationType="fade" onRequestClose={() => setShowDeptoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeptoModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar departamento</Text>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              {departamentos.map(d => (
                <TouchableOpacity key={d.id}
                  style={[styles.modalOption, departamentoId === d.id && styles.modalOptionSelected]}
                  onPress={() => handleSelectDepartamento(d)}
                >
                  <Text style={[styles.modalOptionText, departamentoId === d.id && styles.modalOptionTextSelected]}>{d.nombre}</Text>
                  {departamentoId === d.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal municipio */}
      <Modal visible={showMunicipioModal} transparent animationType="fade" onRequestClose={() => setShowMunicipioModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressIn={() => setShowMunicipioModal(false)}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Seleccionar municipio</Text>
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={Colors.textTertiary} />
              <TextInput style={styles.searchInput} value={municipioSearch}
                onChangeText={t => { setMunicipioSearch(t); loadMunicipios(departamentoId, 1, t); }}
                placeholder="Buscar municipio..." placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
              {municipioSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setMunicipioSearch(""); loadMunicipios(departamentoId, 1); }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.municipioCount}>{municipioTotal} municipio{municipioTotal !== 1 ? "s" : ""}</Text>
            {loadingMunicipios ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={municipios}
                keyExtractor={item => item.id}
                style={{ maxHeight: 250 }}
                nestedScrollEnabled
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalOption, municipioId === item.id && styles.modalOptionSelected]}
                    onPress={() => { setMunicipioId(item.id); setSelectedMunicipioName(item.nombre); setShowMunicipioModal(false); }}
                  >
                    <Text style={[styles.modalOptionText, municipioId === item.id && styles.modalOptionTextSelected]}>{item.nombre}</Text>
                    {municipioId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
                onEndReached={() => { if (municipioHasMore && !loadingMoreMun) loadMunicipios(departamentoId, municipioPage + 1, municipioSearch); }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMoreMun ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
                ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron municipios</Text>}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dangerLight, padding: 12, borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.danger, flex: 1 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.infoLight, padding: 12, borderRadius: 10,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.info, flex: 1, lineHeight: 18 },
  tipoRow: { flexDirection: "row", gap: 10 },
  tipoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  tipoBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tipoBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  tipoBtnTextActive: { color: Colors.white },
  sectionHeader: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  sectionSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 4 },
  required: { color: Colors.danger },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  selectButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  selectButtonDisabled: { backgroundColor: Colors.borderLight },
  selectButtonText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  selectButtonTextDisabled: { color: Colors.textTertiary },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalContent: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, width: "100%", maxWidth: 400 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 16, textAlign: "center" },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 4,
  },
  modalOptionSelected: { backgroundColor: Colors.primary + "15" },
  modalOptionText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  modalOptionTextSelected: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: 12, marginBottom: 8, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text },
  municipioCount: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  emptyText: { textAlign: "center", color: Colors.textTertiary, paddingVertical: 20 },
});
