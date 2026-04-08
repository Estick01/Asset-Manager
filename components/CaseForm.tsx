import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, FlatList, Switch, Modal, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getEstadosProceso, getTiposProceso } from '@/lib/services/procesoService';
import { Cliente, EstadoProceso, TiposProceso } from "@/shared/schema";
import { getClientes } from "@/lib/services/clienteService";
import { getDesktopMetrics, isDesktopViewport } from "@/lib/ui/breakpoints";

// ─── Helpers para normalizar cliente natural o empresa ──────────────────────
function getClienteDisplayName(c: Cliente): string {
  if (c.tipo === "natural" && c.natural?.persona) {
    const { nombre, apellido } = c.natural.persona;
    return `${nombre ?? ""} ${apellido ?? ""}`.trim();
  }
  if (c.tipo === "empresa" && c.empresa) {
    return c.empresa.razonSocial ?? "Sin razón social";
  }
  return "Sin nombre";
}

function getClienteDocumento(c: Cliente): string {
  if (c.tipo === "natural" && c.natural?.persona) {
    return c.natural.persona.documento ?? "Sin documento";
  }
  if (c.tipo === "empresa" && c.empresa) {
    return `NIT: ${c.empresa.nit ?? "Sin NIT"}`;
  }
  return "Sin documento";
}

function getClienteIcon(c: Cliente): "business-outline" | "person-outline" {
  return c.tipo === "empresa" ? "business-outline" : "person-outline";
}

// ─── Types ─────────────────────────────────────────────────────────────────
export type CaseFormData = {
  clienteId: string;
  tipoProcesoId: number;
  radicado: string;
  juzgado: string;
  estadoId: number;
  descripcionEstado: string;
  esPrivado: boolean;
};

type CaseFormProps = {
  initialData?: Partial<CaseFormData>;
  onSave: (data: CaseFormData) => Promise<void>;
  isLoading: boolean;
  error: string;
  /**
   * undefined  = usuario no es abogado → no mostrar sección
   * null       = abogado sin firma → no mostrar sección
   * true       = bufete permite procesos privados → mostrar toggle
   * false      = bufete NO permite privados → mostrar mensaje informativo
   */
  firmAllowsPrivateProcesos?: boolean | null;
};

const CLIENTES_LIMIT = 10;

// ─── Tarjeta informativa: proceso compartido con el bufete ────────────────────
function FirmOwnershipInfoCard() {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <>
      <View style={infoStyles.card}>
        {/* Franja izquierda */}
        <View style={infoStyles.stripe} />

        <View style={infoStyles.body}>
          {/* Fila superior: ícono + textos + botón info */}
          <View style={infoStyles.row}>
            <View style={infoStyles.iconWrap}>
              <Ionicons name="business" size={16} color={Colors.info} />
            </View>

            <View style={infoStyles.texts}>
              <Text style={infoStyles.title}>
                Este proceso será propiedad del bufete. Solo el bufete y el responsable asignado tendrán acceso.
              </Text>
              <Text style={infoStyles.subtitle}>
                El acceso depende de tu vinculación activa con la firma.
              </Text>
            </View>

            <Pressable
              onPress={() => setTooltipVisible(true)}
              hitSlop={10}
              style={infoStyles.infoBtn}
              accessibilityLabel="Más información sobre propiedad del proceso"
            >
              <Ionicons name="information-circle" size={20} color={Colors.info} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Tooltip modal ── */}
      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <Pressable style={infoStyles.overlay} onPress={() => setTooltipVisible(false)}>
          <Pressable style={infoStyles.tooltip} onPress={e => e.stopPropagation()}>
            <View style={infoStyles.tooltipHeader}>
              <View style={infoStyles.tooltipIconWrap}>
                <Ionicons name="business" size={18} color={Colors.info} />
              </View>
              <Text style={infoStyles.tooltipTitle}>Propiedad del proceso</Text>
              <Pressable onPress={() => setTooltipVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <Text style={infoStyles.tooltipText}>
              El proceso pertenece al bufete. Solo el bufete y el responsable asignado tendrán acceso.
              Si te desvinculas de la firma, el proceso permanece en ella y perderás el acceso.
            </Text>

            <View style={infoStyles.tooltipDivider} />

            <Text style={infoStyles.tooltipFooter}>
              Esta configuración la gestiona el administrador del bufete desde los ajustes de privacidad.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const infoStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.info + "30",
    overflow: "hidden",
  },
  stripe: {
    width: 4,
    backgroundColor: Colors.info,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.info + "18",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  texts: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  infoBtn: {
    marginTop: 1,
    flexShrink: 0,
  },

  // Tooltip
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  tooltip: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tooltipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.infoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  tooltipFooter: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});

// ─── Component ─────────────────────────────────────────────────────────────
export function CaseForm({ initialData, onSave, isLoading, error, firmAllowsPrivateProcesos }: CaseFormProps) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && isDesktopViewport(width);
  const metrics = getDesktopMetrics(width);
  const shellWidth = Math.min(1480, Math.max(1160, width - metrics.gutter * 2));
  const [clientes,       setClientes]       = useState<Cliente[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [clienteSearch,  setClienteSearch]  = useState("");
  const [estadosProceso, setEstadosProceso] = useState<EstadoProceso[]>([]);
  const [tiposProceso,   setTiposProceso]   = useState<TiposProceso[]>([]);
  const [form, setForm] = useState<CaseFormData>({
    clienteId:         initialData?.clienteId         || "",
    tipoProcesoId:     initialData?.tipoProcesoId      ?? 0,
    radicado:          initialData?.radicado           || "",
    juzgado:           initialData?.juzgado            || "",
    estadoId:          initialData?.estadoId           || 0,
    descripcionEstado: initialData?.descripcionEstado  || "",
    esPrivado:         initialData?.esPrivado          ?? false,
  });
  const [showClientes, setShowClientes] = useState(false);
  const [showTipos,    setShowTipos]    = useState(false);
  const isLoadingMoreRef = useRef(false);
  const clientesOffsetRef = useRef(0);
  const hasMoreClientesRef = useRef(true);

  // ── Load clientes ────────────────────────────────────────────
  const loadClientes = useCallback(async (reset: boolean = false, searchTerm?: string) => {
    if (!user || isLoadingMoreRef.current || (!reset && !hasMoreClientesRef.current)) return;
    const effectiveSearch = searchTerm ?? clienteSearch;

    isLoadingMoreRef.current = true;
    setIsLoadingClientes(true);
    try {
      const offset = reset ? 0 : clientesOffsetRef.current;
      const data = await getClientes(CLIENTES_LIMIT, offset, effectiveSearch || undefined);
      if (reset) {
        setClientes(data);
        clientesOffsetRef.current = data.length;
        hasMoreClientesRef.current = data.length === CLIENTES_LIMIT;
      } else {
        setClientes(prev => [...prev, ...data]);
        const nextOffset = clientesOffsetRef.current + data.length;
        clientesOffsetRef.current = nextOffset;
        hasMoreClientesRef.current = data.length === CLIENTES_LIMIT;
      }
    } catch (err) {
      console.error("Error loading clientes:", err);
    } finally {
      setIsLoadingClientes(false);
      isLoadingMoreRef.current = false;
    }
  }, [user, clienteSearch]);

  useEffect(() => {
    if (user) {
      loadClientes(true, "");
      (async () => {
        const [estados, tipos] = await Promise.all([getEstadosProceso(), getTiposProceso()]);
        setEstadosProceso(estados);
        setTiposProceso(tipos);
      })();
    }
  }, [user, loadClientes]);

  useEffect(() => {
    if (!user) return;
    loadClientes(true, clienteSearch);
  }, [clienteSearch, loadClientes, user]);

  const updateField = (key: keyof CaseFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: key === "tipoProcesoId" ? Number(value) : value }));
  };

  const selectedCliente = clientes.find(c => c.id === form.clienteId);

  const handleSave = () => onSave(form);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, desktop && styles.desktopContent, desktop && { paddingHorizontal: metrics.gutter }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.shell, desktop && { maxWidth: shellWidth }]}>
          <View style={[styles.desktopLayout, desktop && styles.desktopLayoutActive]}>
            <View style={styles.mainColumn}>
              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Cliente y tipo de proceso</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cliente <Text style={styles.required}>*</Text></Text>
                  <Pressable
                    style={styles.selectBtn}
                    onPress={() => {
                      setShowClientes(!showClientes);
                      if (!showClientes && clientes.length === 0) loadClientes(true);
                    }}
                  >
                    <Ionicons
                      name={selectedCliente ? getClienteIcon(selectedCliente) : "person-outline"}
                      size={20}
                      color={Colors.textTertiary}
                    />
                    <Text style={[styles.selectText, !selectedCliente && styles.placeholder]}>
                      {selectedCliente ? getClienteDisplayName(selectedCliente) : "Seleccionar cliente"}
                    </Text>
                    <Ionicons name={showClientes ? "chevron-up" : "chevron-down"} size={20} color={Colors.textTertiary} />
                  </Pressable>

                  {showClientes && (
                    <View style={styles.dropdown}>
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
                          keyExtractor={c => c.id}
                          scrollEnabled={false}
                          renderItem={({ item: c }) => {
                            const displayName = getClienteDisplayName(c);
                            const documento   = getClienteDocumento(c);
                            const icon        = getClienteIcon(c);
                            const isActive    = form.clienteId === c.id;
                            return (
                              <Pressable
                                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                                onPress={() => {
                                  updateField("clienteId", c.id);
                                  setShowClientes(false);
                                }}
                              >
                                <View style={styles.dropdownItemRow}>
                                  <Ionicons
                                    name={icon}
                                    size={16}
                                    color={isActive ? Colors.primary : Colors.textTertiary}
                                    style={{ marginRight: 8 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.dropdownText, isActive && styles.dropdownTextActive]}>
                                      {displayName}
                                    </Text>
                                    <Text style={styles.dropdownSubtext}>{documento}</Text>
                                  </View>
                                  <View style={[
                                    styles.tipoBadge,
                                    c.tipo === "empresa" ? styles.tipoBadgeEmpresa : styles.tipoBadgeNatural,
                                  ]}>
                                    <Text style={[
                                      styles.tipoBadgeText,
                                      { color: c.tipo === "empresa" ? "#F5A623" : "#2196A6" },
                                    ]}>
                                      {c.tipo === "empresa" ? "Empresa" : "Natural"}
                                    </Text>
                                  </View>
                                </View>
                              </Pressable>
                            );
                          }}
                          onEndReached={() => loadClientes(false)}
                          onEndReachedThreshold={0.5}
                          ListFooterComponent={
                            isLoadingClientes
                              ? <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingFooter} />
                              : null
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
                      {tiposProceso.map(tipo => (
                        <Pressable
                          key={tipo.id}
                          style={[styles.dropdownItem, Number(form.tipoProcesoId) === Number(tipo.id) && styles.dropdownItemActive]}
                          onPress={() => { updateField("tipoProcesoId", tipo.id); setShowTipos(false); }}
                        >
                          <Text style={[styles.dropdownText, Number(form.tipoProcesoId) === Number(tipo.id) && styles.dropdownTextActive]}>
                            {tipo.nombre}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Datos del expediente</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Radicado <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="document-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={form.radicado}
                      onChangeText={v => updateField("radicado", v)}
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
                      onChangeText={v => updateField("juzgado", v)}
                      placeholder="Nombre del juzgado"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Estado y hechos relevantes</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Estado</Text>
                  <View style={styles.estadoGrid}>
                    {estadosProceso.map(estado => (
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
                  <Text style={styles.label}>Descripción de los hechos jurídicamente relevantes </Text>
                  <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={form.descripcionEstado}
                      onChangeText={v => updateField("descripcionEstado", v)}
                      placeholder="Descripción de los hechos jurídicamente relevantes"
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {firmAllowsPrivateProcesos === true && (
                <View style={styles.formCard}>
                  <Text style={styles.cardTitle}>Privacidad</Text>
                  <View style={styles.privadoRow}>
                    <View style={styles.privadoInfo}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.privadoLabel}>Proceso privado</Text>
                        <Text style={styles.privadoSublabel}>Solo tú podrás ver este proceso</Text>
                      </View>
                    </View>
                    <Switch
                      value={form.esPrivado}
                      onValueChange={v => setForm(prev => ({ ...prev, esPrivado: v }))}
                      trackColor={{ false: Colors.border, true: Colors.primary + "80" }}
                      thumbColor={form.esPrivado ? Colors.primary : "#ccc"}
                      ios_backgroundColor={Colors.border}
                    />
                  </View>
                </View>
              )}

              {firmAllowsPrivateProcesos === false && (
                <FirmOwnershipInfoCard />
              )}
            </View>

            {desktop && (
              <View style={styles.desktopAside}>
                <View style={styles.desktopAsideCard}>
                  <Text style={styles.desktopAsideLabel}>Resumen</Text>
                  <Text style={styles.desktopAsideTitle}>Configuración del proceso</Text>
                  <View style={styles.desktopMetaList}>
                    <View style={styles.desktopMetaRow}>
                      <Text style={styles.desktopMetaKey}>Cliente</Text>
                      <Text style={styles.desktopMetaValue}>{selectedCliente ? getClienteDisplayName(selectedCliente) : "Sin seleccionar"}</Text>
                    </View>
                    <View style={styles.desktopMetaRow}>
                      <Text style={styles.desktopMetaKey}>Tipo</Text>
                      <Text style={styles.desktopMetaValue}>{tiposProceso.find(t => Number(t.id) === Number(form.tipoProcesoId))?.nombre || "Sin seleccionar"}</Text>
                    </View>
                    <View style={styles.desktopMetaRow}>
                      <Text style={styles.desktopMetaKey}>Estado</Text>
                      <Text style={styles.desktopMetaValue}>{estadosProceso.find(e => e.id === form.estadoId)?.nombre || "Sin seleccionar"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.desktopAsideCard}>
                  <Text style={styles.desktopAsideLabel}>Checklist</Text>
                  <Text style={styles.desktopAsideTitle}>Campos clave</Text>
                  <View style={styles.desktopBulletList}>
                    <Text style={styles.desktopBullet}>Selecciona el cliente correcto antes de guardar.</Text>
                    <Text style={styles.desktopBullet}>Asigna el tipo de proceso y el estado inicial.</Text>
                    <Text style={styles.desktopBullet}>Registra radicado y juzgado con precisión.</Text>
                    <Text style={styles.desktopBullet}>Describe los hechos jurídicamente relevantes.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, desktop && styles.desktopFooter]}>
        <Pressable
          onPress={handleSave}
          disabled={isLoading}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed, isLoading && styles.saveBtnDisabled]}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>{initialData ? "Guardar Cambios" : "Crear Proceso"}</Text>
          }
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 120 },
  desktopContent: { paddingTop: 24, paddingBottom: 140 },
  shell: { width: "100%", alignSelf: "center" },
  desktopLayout: { width: "100%" },
  desktopLayoutActive: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  mainColumn: { flex: 1, minWidth: 0, maxWidth: 980, gap: 16 },
  desktopAside: { width: 340, gap: 16 },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  desktopAsideCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopAsideLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  desktopAsideTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  desktopMetaList: { gap: 10 },
  desktopMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  desktopMetaKey: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
  },
  desktopMetaValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  desktopBulletList: { gap: 8 },
  desktopBullet: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dangerLight, padding: 12, borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.danger, flex: 1 },
  inputGroup: { gap: 6 },
  label:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginLeft: 4 },
  required: { color: Colors.danger },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon:       { marginLeft: 14 },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  textAreaWrapper: { alignItems: "flex-start" },
  textArea:        { minHeight: 80, paddingTop: 14 },
  selectBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, paddingHorizontal: 14, gap: 10,
  },
  selectText:  { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  placeholder: { color: Colors.textTertiary },
  dropdown: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  dropdownItem:       { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemActive: { backgroundColor: Colors.primary + "10" },
  dropdownItemRow:    { flexDirection: "row", alignItems: "center" },
  dropdownText:       { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  dropdownTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  dropdownSubtext:    { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  dropdownEmpty: {
    padding: 16, fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, textAlign: "center",
  },
  dropdownList: { maxHeight: 300 },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8, paddingHorizontal: 10, margin: 8, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: Colors.text },
  loadingFooter: { paddingVertical: 12 },

  // Tipo badge dentro del dropdown
  tipoBadge:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  tipoBadgeNatural: { backgroundColor: "#2196A618" },
  tipoBadgeEmpresa: { backgroundColor: "#F5A62322" },
  tipoBadgeText:    { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  estadoGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  estadoChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  estadoChipActive:     { backgroundColor: Colors.primary + "15", borderColor: Colors.primary },
  estadoChipText:       { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  estadoChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },

  privadoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  privadoInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  privadoLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  privadoSublabel: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  desktopFooter: {
    paddingHorizontal: 32,
    paddingTop: 14,
    paddingBottom: 20,
  },
  saveBtn:         { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveBtnPressed:  { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
