import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getEstadosProceso, getTiposProceso } from '@/lib/services/procesoService';
import { Cliente, EstadoProceso, TiposProceso } from "@/shared/schema";
import { getClientes } from "@/lib/services/clienteService";


// Type for form data (simplified for the form)
export type CaseFormData = {
  clienteId: string;
  tipoProcesoId: number;
  radicado: string;
  juzgado: string;
  estadoId: number;
  descripcionEstado: string;
};

type CaseFormProps = {
  initialData?: Partial<CaseFormData>;
  onSave: (data: CaseFormData) => Promise<void>;
  isLoading: boolean;
  error: string;
};

const CLIENTES_LIMIT = 10;

export function CaseForm({ initialData, onSave, isLoading, error }: CaseFormProps) {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesOffset, setClientesOffset] = useState(0);
  const [hasMoreClientes, setHasMoreClientes] = useState(true);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [estadosProceso, setEstadosProceso] = useState<EstadoProceso[]>([]);
  const [tiposProceso, setTiposProceso] = useState<TiposProceso[]>([]);
  const [form, setForm] = useState<CaseFormData>({
    clienteId: initialData?.clienteId || "",
    tipoProcesoId: initialData?.tipoProcesoId ?? 0,
    radicado: initialData?.radicado || "",
    juzgado: initialData?.juzgado || "",
    estadoId: initialData?.estadoId || 0,
    descripcionEstado: initialData?.descripcionEstado || "",
  });
  const [showClientes, setShowClientes] = useState(false);
  const [showTipos, setShowTipos] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const loadClientes = useCallback(async (reset: boolean = false) => {
    if (!user || isLoadingMoreRef.current || (!reset && !hasMoreClientes)) return;

    if (reset) {
      setClientesOffset(0);
    }

    isLoadingMoreRef.current = true;
    setIsLoadingClientes(true);

    try {
      const offset = reset ? 0 : clientesOffset;
      const data = await getClientes(CLIENTES_LIMIT, offset, clienteSearch || undefined);

      if (reset) {
        setClientes(data);
        setClientesOffset(data.length);
        setHasMoreClientes(data.length === CLIENTES_LIMIT);
      } else {
        setClientes(prev => [...prev, ...data]);
        setClientesOffset(prev => prev + data.length);
        setHasMoreClientes(data.length === CLIENTES_LIMIT);
      }
    } catch (err) {
      console.error("Error loading clientes:", err);
    } finally {
      setIsLoadingClientes(false);
      isLoadingMoreRef.current = false;
    }
  }, [user, hasMoreClientes, clienteSearch, clientesOffset]);

  // Load initial clientes and estados/tipos
  useEffect(() => {
    if (user) {
      loadClientes(true);
      const loadData = async () => {
        const [estados, tipos] = await Promise.all([
          getEstadosProceso(),
          getTiposProceso()
        ]);
        setEstadosProceso(estados);
        setTiposProceso(tipos);
      };
      loadData();
    }
  }, [user]);

  // Reload clientes when search changes
  useEffect(() => {
    loadClientes(true);
  }, [clienteSearch]);

  const updateField = (
    key: keyof CaseFormData,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "tipoProcesoId" ? Number(value) : value,
    }));
  };
  const selectedCliente = clientes.find((c) => c.id === form.clienteId);

  const handleSave = () => {
    if (!form.clienteId || !form.tipoProcesoId || !form.radicado.trim() || !form.juzgado.trim() || !form.estadoId) {
      onSave(form);
      return;
    }
    onSave(form);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cliente <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.selectBtn} onPress={() => {
            setShowClientes(!showClientes);
            if (!showClientes && clientes.length === 0) {
              loadClientes(true);
            }
          }}>
            <Ionicons name="person-outline" size={20} color={Colors.textTertiary} />
            <Text style={[styles.selectText, !selectedCliente && styles.placeholder]}>
              {selectedCliente ? selectedCliente.nombre : "Seleccionar cliente"}
            </Text>
            <Ionicons name={showClientes ? "chevron-up" : "chevron-down"} size={20} color={Colors.textTertiary} />
          </Pressable>
          {showClientes && (
            <View style={styles.dropdown}>
              {/* Search input */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={16} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar cliente..."
                  placeholderTextColor={Colors.textTertiary}
                  value={clienteSearch}
                  onChangeText={setClienteSearch}
                />
                {clienteSearch.length > 0 && (
                  <Pressable onPress={() => setClienteSearch("")}>
                    <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                  </Pressable>
                )}
              </View>
              {clientes.length === 0 ? (
                <Text style={styles.dropdownEmpty}>
                  {isLoadingClientes ? "Cargando..." : "Sin clientes. Crea uno primero."}
                </Text>
              ) : (
                <FlatList
                  data={clientes}
                  keyExtractor={(c) => c.id}
                  scrollEnabled={false}  // ← agregar esto
                  renderItem={({ item: c }) => (
                    <Pressable
                      style={[styles.dropdownItem, form.clienteId === c.id && styles.dropdownItemActive]}
                      onPress={() => {
                        updateField("clienteId", c.id);
                        setShowClientes(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, form.clienteId === c.id && styles.dropdownTextActive]}>{c.nombre}</Text>
                      <Text style={styles.dropdownSubtext}>{c.documento}</Text>
                    </Pressable>
                  )}
                  onEndReached={() => loadClientes(false)}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    isLoadingClientes ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingFooter} />
                    ) : null
                  }
                  style={styles.dropdownList}
                />
              )}
            </View>
          )}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de Proceso <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.selectBtn} onPress={() => setShowTipos(!showTipos)}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.textTertiary} />
            <Text style={[styles.selectText, !form.tipoProcesoId && styles.placeholder]}>
              {tiposProceso.find(t => Number(t.id) === Number(form.tipoProcesoId))?.nombre || "Seleccionar tipo"}
            </Text>
            <Ionicons name={showTipos ? "chevron-up" : "chevron-down"} size={20} color={Colors.textTertiary} />
          </Pressable>
          {showTipos && (
            <View style={styles.dropdown}>
              {tiposProceso.map((tipo) => (
                <Pressable
                  key={tipo.id}
                  style={[styles.dropdownItem, Number(form.tipoProcesoId) === Number(tipo.id) && styles.dropdownItemActive]}
                  onPress={() => {
                    updateField("tipoProcesoId", tipo.id);
                    setShowTipos(false);
                  }}
                >
                  <Text style={[styles.dropdownText, Number(form.tipoProcesoId) === Number(tipo.id) && styles.dropdownTextActive]}>{tipo.nombre}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Radicado <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.radicado}
              onChangeText={(v) => updateField("radicado", v)}
              placeholder="Numero de radicado"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Juzgado <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="business-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.juzgado}
              onChangeText={(v) => updateField("juzgado", v)}
              placeholder="Nombre del juzgado"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.estadoGrid}>
            {estadosProceso.map((estado) => (
              <Pressable
                key={estado.id}
                style={[styles.estadoChip, form.estadoId === estado.id && styles.estadoChipActive]}
                onPress={() => updateField("estadoId", estado.id!)}
              >
                <Text style={[styles.estadoChipText, form.estadoId === estado.id && styles.estadoChipTextActive]}>
                  {estado.nombre}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripcion del estado</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.descripcionEstado}
              onChangeText={(v) => updateField("descripcionEstado", v)}
              placeholder="Descripcion del estado actual del proceso"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={isLoading}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, isLoading && styles.saveBtnDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{initialData ? "Guardar Cambios" : "Crear Proceso"}</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 120 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.danger, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 4 },
  required: { color: Colors.danger },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  textAreaWrapper: { alignItems: "flex-start" },
  textArea: { minHeight: 80, paddingTop: 14 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  selectText: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  placeholder: { color: Colors.textTertiary },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemActive: { backgroundColor: Colors.primary + "10" },
  dropdownText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  dropdownTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  dropdownEmpty: { padding: 16, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center" },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    margin: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  loadingFooter: {
    paddingVertical: 12,
  },
  estadoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  estadoChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  estadoChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  estadoChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  estadoChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24, // Adjust this based on safe area
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
