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

interface TipoDocumento { id: number; nombre: string; codigo: string; }
interface Departamento { id: string; codigo: string; nombre: string; }
interface Municipio { id: string; codigo: string; nombre: string; }
interface MunicipioResponse { data: Municipio[]; total: number; hasMore: boolean; }

export interface ClientFormData {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion: string;
  password?: string;
  departamentoId: string;
  municipioId: string;
}

interface ClientFormProps {
  initialData?: Partial<Cliente>;
  onSave: (data: ClientFormData) => Promise<void>;
  isLoading?: boolean;
  isEditing?: boolean;
  error?: string;
}

export function ClientForm({ initialData, onSave, isLoading, isEditing, error }: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>({
    nombre:          initialData?.nombre        ?? "",
    apellido:        initialData?.apellido       ?? "",
    correo:          initialData?.user?.email    ?? "",
    telefono:        initialData?.telefono       ?? "",
    documento:       initialData?.documento      ?? "",
    tipoDocumentoId: initialData?.tipoDocumentoId ?? 1,
    direccion:       initialData?.direccion      ?? "",
    password:        "",
    departamentoId:  initialData?.departamentoId ?? "",
    municipioId:     initialData?.municipioId    ?? "",
  });

  const [tiposDocumento, setTiposDocumento]   = useState<TipoDocumento[]>([]);
  const [departamentos, setDepartamentos]     = useState<Departamento[]>([]);
  const [municipios, setMunicipios]           = useState<Municipio[]>([]);
  const [loadingTipos, setLoadingTipos]       = useState(true);
  const [loadingDeptos, setLoadingDeptos]     = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingMoreMunicipios, setLoadingMoreMunicipios] = useState(false);
  const [showTipoModal, setShowTipoModal]     = useState(false);
  const [showDeptoModal, setShowDeptoModal]   = useState(false);
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [municipioPage, setMunicipioPage]     = useState(1);
  const [municipioTotal, setMunicipioTotal]   = useState(0);
  const [municipioHasMore, setMunicipioHasMore] = useState(false);
  const [municipioSearch, setMunicipioSearch] = useState("");

  // Nombres seleccionados para mostrar
  const [selectedDeptoName, setSelectedDeptoName]   = useState(initialData?.departamento?.nombre ?? "");
  const [selectedMunicipioName, setSelectedMunicipioName] = useState(initialData?.municipio?.nombre ?? "");

  useEffect(() => {
    apiRequest("GET", "/api/tipos-documento").then(async res => {
      if (res.ok) {
        const data: TipoDocumento[] = await res.json();
        setTiposDocumento(data);
      }
    }).finally(() => setLoadingTipos(false));

    apiRequest("GET", "/api/departamentos").then(async res => {
      if (res.ok) {
        const data: Departamento[] = await res.json();
        setDepartamentos(data);
      }
    }).finally(() => setLoadingDeptos(false));
  }, []);

  // Si viene con departamento, cargar sus municipios
  useEffect(() => {
    if (initialData?.departamentoId) {
      loadMunicipios(initialData.departamentoId, 1);
    }
  }, [initialData?.departamentoId]);

  const loadMunicipios = useCallback(async (deptoId: string, page: number = 1, search: string = "") => {
    page === 1 ? setLoadingMunicipios(true) : setLoadingMoreMunicipios(true);
    try {
      const params = new URLSearchParams({
        departamentoId: deptoId,
        page: page.toString(),
        pageSize: "10",
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
      setLoadingMoreMunicipios(false);
    }
  }, []);

  const updateField = (key: keyof ClientFormData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSelectDepartamento = (depto: Departamento) => {
    setForm(prev => ({ ...prev, departamentoId: depto.id, municipioId: "" }));
    setSelectedDeptoName(depto.nombre);
    setSelectedMunicipioName("");
    setMunicipios([]);
    setMunicipioSearch("");
    loadMunicipios(depto.id, 1);
    setShowDeptoModal(false);
  };

  const handleSelectMunicipio = (mun: Municipio) => {
    setForm(prev => ({ ...prev, municipioId: mun.id }));
    setSelectedMunicipioName(mun.nombre);
    setShowMunicipioModal(false);
  };

  const selectedTipo = tiposDocumento.find(t => t.id === form.tipoDocumentoId);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isEditing && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              El documento y contraseña permiten al cliente acceder al Portal del Cliente.
            </Text>
          </View>
        )}

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
            <TextInput style={styles.input} value={form.documento}
              onChangeText={v => updateField("documento", v)}
              placeholder="CC o NIT" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        {/* Correo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Correo electrónico <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={form.correo}
              onChangeText={v => updateField("correo", v)}
              placeholder="correo@ejemplo.com" placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        {/* Nombre */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={form.nombre}
              onChangeText={v => updateField("nombre", v)}
              placeholder="Nombre del cliente" placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words" />
          </View>
        </View>

        {/* Apellido */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Apellido <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={form.apellido}
              onChangeText={v => updateField("apellido", v)}
              placeholder="Apellido del cliente" placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words" />
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
            style={[styles.selectButton, !form.departamentoId && styles.selectButtonDisabled]}
            onPress={() => form.departamentoId && setShowMunicipioModal(true)}
            disabled={!form.departamentoId}
          >
            <Text style={[styles.selectButtonText, !form.departamentoId && styles.selectButtonTextDisabled]}>
              {selectedMunicipioName || (form.departamentoId ? "Seleccionar municipio" : "Seleccione un departamento primero")}
            </Text>
            {form.departamentoId && <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />}
          </TouchableOpacity>
        </View>

        {/* Teléfono */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={form.telefono}
              onChangeText={v => updateField("telefono", v)}
              placeholder="+57 300 000 0000" placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad" />
          </View>
        </View>

        {/* Dirección */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput style={styles.input} value={form.direccion}
              onChangeText={v => updateField("direccion", v)}
              placeholder="Dirección del cliente" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        {/* Contraseña - solo en creación */}
        {!isEditing && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña del portal <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput style={styles.input} value={form.password}
                onChangeText={v => updateField("password", v)}
                placeholder="Contraseña para acceso del cliente" placeholderTextColor={Colors.textTertiary}
                secureTextEntry />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => onSave(form)}
          disabled={isLoading}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, isLoading && styles.saveBtnDisabled]}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>{isEditing ? "Guardar Cambios" : "Guardar Cliente"}</Text>
          }
        </Pressable>
      </View>

      {/* Modal tipo documento */}
      <Modal visible={showTipoModal} transparent animationType="fade" onRequestClose={() => setShowTipoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTipoModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de documento</Text>
            {tiposDocumento.map(tipo => (
              <TouchableOpacity key={tipo.id}
                style={[styles.modalOption, form.tipoDocumentoId === tipo.id && styles.modalOptionSelected]}
                onPress={() => { setForm(p => ({ ...p, tipoDocumentoId: tipo.id })); setShowTipoModal(false); }}
              >
                <Text style={[styles.modalOptionText, form.tipoDocumentoId === tipo.id && styles.modalOptionTextSelected]}>
                  {tipo.nombre}
                </Text>
                {form.tipoDocumentoId === tipo.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
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
              {departamentos.map(depto => (
                <TouchableOpacity key={depto.id}
                  style={[styles.modalOption, form.departamentoId === depto.id && styles.modalOptionSelected]}
                  onPress={() => handleSelectDepartamento(depto)}
                >
                  <Text style={[styles.modalOptionText, form.departamentoId === depto.id && styles.modalOptionTextSelected]}>
                    {depto.nombre}
                  </Text>
                  {form.departamentoId === depto.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
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
                onChangeText={t => { setMunicipioSearch(t); loadMunicipios(form.departamentoId, 1, t); }}
                placeholder="Buscar municipio..." placeholderTextColor={Colors.textTertiary} autoCapitalize="none" />
              {municipioSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setMunicipioSearch(""); loadMunicipios(form.departamentoId, 1); }}>
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
                    style={[styles.modalOption, form.municipioId === item.id && styles.modalOptionSelected]}
                    onPress={() => handleSelectMunicipio(item)}
                  >
                    <Text style={[styles.modalOptionText, form.municipioId === item.id && styles.modalOptionTextSelected]}>
                      {item.nombre}
                    </Text>
                    {form.municipioId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                )}
                onEndReached={() => { if (municipioHasMore && !loadingMoreMunicipios) loadMunicipios(form.departamentoId, municipioPage + 1, municipioSearch); }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMoreMunicipios ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
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
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 12, alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 20, width: "100%", maxWidth: 400,
  },
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