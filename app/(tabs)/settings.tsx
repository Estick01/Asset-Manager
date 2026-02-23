import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator, TextInput, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { StyledModal } from "@/components/StyledModal";
import { getRoles, getRolWithPermisos, updateRolePermisos, getAllAbogados, getAllPermisos, updateAbogadoRol, updateAbogadoEstado, updateAbogadoPlan, createRol, deleteRol, getAllPlanes, getAllTiposProceso, createTipoProceso, updateTipoProceso, deleteTipoProceso, type Rol, type Permiso, type Abogado, type TiposProceso } from "@/lib/storage";

const MODULOS = ["clientes", "procesos", "actualizaciones", "documentos", "configuracion", "usuarios", "dashboard", "perfil", "admin"];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, hasPermission, isLoggedIn, isLoading } = useAuth();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, isLoggedIn]);
  const [isPermisosModalVisible, setIsPermisosModalVisible] = useState(false);
  const [isUsuariosModalVisible, setIsUsuariosModalVisible] = useState(false);
  const [isCreateRolModalVisible, setIsCreateRolModalVisible] = useState(false);
  const [newRolNombre, setNewRolNombre] = useState("");
  const [newRolDescripcion, setNewRolDescripcion] = useState("");
  const [planes, setPlanes] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedAbogado, setSelectedAbogado] = useState<Abogado | null>(null);
  const [isEditUserModalVisible, setIsEditUserModalVisible] = useState(false);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null);
  const [rolPermisos, setRolPermisos] = useState<Permiso[]>([]);
  const [allPermisos, setAllPermisos] = useState<Permiso[]>([]);
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Tipos de Proceso state
  const [isTiposProcesoModalVisible, setIsTiposProcesoModalVisible] = useState(false);
  const [isCreateTipoProcesoModalVisible, setIsCreateTipoProcesoModalVisible] = useState(false);
  const [tiposProceso, setTiposProceso] = useState<TiposProceso[]>([]);
  const [newTipoProcesoNombre, setNewTipoProcesoNombre] = useState("");
  const [newTipoProcesoDescripcion, setNewTipoProcesoDescripcion] = useState("");

  const canManagePermissions = hasPermission("configuracion.ver");
  const canEditPermissions = hasPermission("configuracion.editar");
  const canManageUsers = hasPermission("usuarios.ver");
  const canManageProcesos = hasPermission("procesos.ver");

  const loadRoles = useCallback(async () => {
    if (!canManagePermissions) return;
    setLoading(true);
    try {
      const [rolesData, permisosData] = await Promise.all([
        getRoles(),
        getAllPermisos()
      ]);
      setRoles(rolesData);
      setAllPermisos(permisosData);
    } catch (error: any) {
      console.error("Error loading roles:", error);
      // Check if it's a 401 error - redirect to login
      if (error.message?.includes("401")) {
        router.replace("/(auth)/login");
      }
    } finally {
      setLoading(false);
    }
  }, [canManagePermissions]);

  const loadRolPermisos = async (rol: Rol) => {
    setLoading(true);
    try {
      const data = await getRolWithPermisos(rol.id);
      if (data) {
        setRolPermisos(data.permisos);
      }
    } catch (error) {
      console.error("Error loading rol permisos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermisos = async () => {
    await loadRoles();
    setIsPermisosModalVisible(true);
  };

  const handleCreateRol = async () => {
    if (!newRolNombre.trim()) {
      Alert.alert("Error", "El nombre del rol es requerido");
      return;
    }
    setSaving(true);
    try {
      await createRol(newRolNombre.trim(), newRolDescripcion.trim());
      setNewRolNombre("");
      setNewRolDescripcion("");
      setIsCreateRolModalVisible(false);
      await loadRoles();
      Alert.alert("Éxito", "Rol creado correctamente");
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRol = async (rolId: number) => {
    Alert.alert(
      "Eliminar Rol",
      "¿Estás seguro de eliminar este rol? Los usuarios con este rol quedarán sin rol asignado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRol(rolId);
              await loadRoles();
              Alert.alert("Éxito", "Rol eliminado correctamente");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el rol");
            }
          },
        },
      ]
    );
  };

  // Tipos de Proceso handlers
  const loadTiposProceso = async () => {
    setLoading(true);
    try {
      const data = await getAllTiposProceso();
      setTiposProceso(data);
    } catch (error) {
      console.error("Error loading tipos proceso:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTiposProceso = async () => {
    await loadTiposProceso();
    setIsTiposProcesoModalVisible(true);
  };

  const handleCreateTipoProceso = async () => {
    if (!newTipoProcesoNombre.trim()) {
      Alert.alert("Error", "El nombre es requerido");
      return;
    }
    setSaving(true);
    try {
      await createTipoProceso({ nombre: newTipoProcesoNombre.trim(), descripcion: newTipoProcesoDescripcion.trim() });
      setNewTipoProcesoNombre("");
      setNewTipoProcesoDescripcion("");
      setIsCreateTipoProcesoModalVisible(false);
      await loadTiposProceso();
      Alert.alert("Éxito", "Tipo de proceso creado correctamente");
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear el tipo de proceso");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTipoProcesoActivo = async (tipo: TiposProceso) => {
    setSaving(true);
    try {
      await updateTipoProceso(tipo.id, { activo: !tipo.activo });
      await loadTiposProceso();
    } catch (error) {
      Alert.alert("Error", "No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTipoProceso = async (tipoId: number) => {
    Alert.alert(
      "Eliminar Tipo de Proceso",
      "¿Estás seguro de eliminar este tipo de proceso?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTipoProceso(tipoId);
              await loadTiposProceso();
              Alert.alert("Éxito", "Tipo de proceso eliminado correctamente");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el tipo de proceso");
            }
          },
        },
      ]
    );
  };

  const handleEditUser = (abogado: Abogado) => {
    setSelectedAbogado(abogado);
    setIsEditUserModalVisible(true);
  };

  const handleUpdateUserRol = async (rolId: number | null) => {
    if (!selectedAbogado || rolId === null) return;
    setSaving(true);
    try {
      await updateAbogadoRol(selectedAbogado.id, rolId);
      await loadUsuarios();
      // Update local state
      setSelectedAbogado(prev => prev ? { ...prev, rolId } : null);
      Alert.alert("Éxito", "Rol actualizado correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserActivo = async () => {
    if (!selectedAbogado) return;
    setSaving(true);
    try {
      const newActivo = !selectedAbogado.activo;
      await updateAbogadoEstado(selectedAbogado.id, newActivo);
      await loadUsuarios();
      setSelectedAbogado(prev => prev ? { ...prev, activo: newActivo } : null);
      Alert.alert("Éxito", newActivo ? "Usuario habilitado" : "Usuario deshabilitado");
    } catch (error) {
      Alert.alert("Error", "No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const loadUsuarios = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    try {
      const [abogadosData, rolesData, permisosData] = await Promise.all([
        getAllAbogados(),
        getRoles(),
        getAllPermisos(),
      ]);
      setAbogados(abogadosData);
      setRoles(rolesData);
      setAllPermisos(permisosData);
    } catch (error) {
      console.error("Error loading usuarios:", error);
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  const handleOpenUsuarios = async () => {
    await loadUsuarios();
    // Load planes for plan selection
    try {
      const planesData = await getAllPlanes();
      setPlanes(planesData);
    } catch (e) {
      console.error("Error loading planes:", e);
    }
    setIsUsuariosModalVisible(true);
  };

  const handleSelectRol = async (rol: Rol) => {
    setSelectedRol(rol);
    await loadRolPermisos(rol);
  };

  const handleSavePermisos = async (permisoId: number) => {
    if (!selectedRol) return;
    
    const isSelected = rolPermisos.some(p => p.id === permisoId);
    let newPermisos: Permiso[];
    
    if (isSelected) {
      newPermisos = rolPermisos.filter(p => p.id !== permisoId);
    } else {
      // Need to load all permisos to add the new one
      // For simplicity, we'll just toggle locally and save all
      newPermisos = [...rolPermisos, { id: permisoId, codigo: "", nombre: "", descripcion: undefined, modulo: "", activo: true, createdAt: "", updatedAt: "" } as Permiso];
    }
    
    setSaving(true);
    try {
      const currentIds = rolPermisos.map(p => p.id);
      const newIds = isSelected 
        ? currentIds.filter(id => id !== permisoId)
        : [...currentIds, permisoId];
      
      await updateRolePermisos(selectedRol.id, newIds);
      await loadRolPermisos(selectedRol);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar los permisos");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmLogout = async () => {
    await logout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLogoutModalVisible(false);
    router.replace("/(auth)/login");
  };

  const sections = [
    {
      title: "Despacho",
      items: [
        { icon: "person-outline" as const, label: "Nombre", value: user?.nombre || "" },
        { icon: "business-outline" as const, label: "Despacho", value: user?.despacho || "" },
        { icon: "mail-outline" as const, label: "Correo", value: user?.correo || "" },
        { icon: "call-outline" as const, label: "Telefono", value: user?.telefono || "No registrado" },
      ],
    },
    {
      title: "Suscripcion",
      items: [
        { icon: "diamond-outline" as const, label: "Plan actual", value: user?.plan?.nombre === "Profesional" ? "Profesional" : (user?.plan?.nombre || "Basico") },
        { icon: "calendar-outline" as const, label: "Miembro desde", value: user ? new Date(user.fechaRegistro).toLocaleDateString("es-CO", { year: "numeric", month: "long" }) : "" },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
          <Text style={styles.title}>Ajustes</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{user?.nombre?.charAt(0).toUpperCase() || "A"}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.nombre || "Abogado"}</Text>
            <Text style={styles.profileDespacho}>{user?.despacho || ""}</Text>
          </View>
          <View style={[styles.planBadge, user?.plan?.nombre === "Profesional" ? styles.planPro : styles.planBasic]}>
            <Text style={[styles.planText, user?.plan?.nombre === "Profesional" ? styles.planProText : styles.planBasicText]}>
              {user?.plan?.nombre === "Profesional" ? "PRO" : "Basico"}
            </Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.label} style={[styles.settingRow, idx < section.items.length - 1 && styles.settingRowBorder]}>
                  <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {canManagePermissions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administracion</Text>
            {canManageUsers && (
              <Pressable 
                style={({ pressed }) => [styles.permisosBtn, pressed && styles.permisosBtnPressed]}
                onPress={handleOpenUsuarios}
              >
                <Ionicons name="people-outline" size={22} color={Colors.primary} />
                <Text style={styles.permisosBtnText}>Gestionar Usuarios</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
            <Pressable 
              style={({ pressed }) => [styles.permisosBtn, pressed && styles.permisosBtnPressed, { marginTop: 10 }]}
              onPress={handleOpenPermisos}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
              <Text style={styles.permisosBtnText}>Gestionar Permisos</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </Pressable>
            {canManagePermissions && (
              <Pressable 
                style={({ pressed }) => [styles.permisosBtn, pressed && styles.permisosBtnPressed, { marginTop: 10, backgroundColor: Colors.success + "20" }]}
                onPress={() => setIsCreateRolModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={22} color={Colors.success} />
                <Text style={[styles.permisosBtnText, { color: Colors.success }]}>Crear Nuevo Rol</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
            {canManageProcesos && (
              <Pressable 
                style={({ pressed }) => [styles.permisosBtn, pressed && styles.permisosBtnPressed, { marginTop: 10 }]}
                onPress={handleOpenTiposProceso}
              >
                <Ionicons name="folder-outline" size={22} color={Colors.primary} />
                <Text style={styles.permisosBtnText}>Gestionar Tipos de Proceso</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]} onPress={() => setIsLogoutModalVisible(true)}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>Cerrar Sesion</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>LexTrack v1.0.0</Text>
      </ScrollView>
        <StyledModal
        visible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        title="Cerrar Sesión"
        onConfirm={handleConfirmLogout}
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>¿Estás seguro de cerrar sesión?</Text>
      </StyledModal>

      <StyledModal
        visible={isPermisosModalVisible}
        onClose={() => { setIsPermisosModalVisible(false); setSelectedRol(null); }}
        title="Gestionar Permisos"
        confirmText=""
        hideConfirm
        fullHeight
      >
        <Text style={styles.sectionTitle}>Seleccionar Rol</Text>
        {loading && !selectedRol ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View style={styles.rolList}>
            {roles.map((rol) => (
              <Pressable
                key={rol.id}
                style={[styles.rolItem, selectedRol?.id === rol.id && styles.rolItemSelected]}
                onPress={() => handleSelectRol(rol)}
              >
                <Ionicons 
                  name={selectedRol?.id === rol.id ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={selectedRol?.id === rol.id ? Colors.primary : Colors.textTertiary} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{rol.nombre}</Text>
                  {rol.descripcion && (
                    <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{rol.descripcion}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {selectedRol && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Permisos de {selectedRol.nombre}</Text>
            {!canEditPermissions && (
              <Text style={{ fontSize: 12, color: Colors.warning, marginBottom: 8 }}>
                Necesitas el permiso configuracion.editar para modificar permisos
              </Text>
            )}
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.permisosList}>
                {/* Show all unique module names from permissions, including any not in MODULOS */}
                {[...new Set(allPermisos.filter(p => p.modulo).map(p => p.modulo))].map((modulo) => {
                  const moduloPermisos = allPermisos.filter(p => p.modulo === modulo);
                  const moduloAssignedIds = rolPermisos.map(p => p.id);
                  return (
                    <View key={modulo || 'unknown'}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 12, marginBottom: 4, textTransform: "uppercase" }}>
                        {(modulo || 'unknown').charAt(0).toUpperCase() + (modulo || 'unknown').slice(1)}
                      </Text>
                      {moduloPermisos.map((permiso) => {
                        const isAssigned = moduloAssignedIds.includes(permiso.id);
                        return (
                          <Pressable
                            key={permiso.id}
                            style={[styles.permisoItem]}
                            onPress={async () => {
                              try {
                                const currentPermisoIds = rolPermisos.map(p => p.id);
                                let newPermisoIds: number[];
                                if (isAssigned) {
                                  newPermisoIds = currentPermisoIds.filter(id => id !== permiso.id);
                                } else {
                                  newPermisoIds = [...currentPermisoIds, permiso.id];
                                }
                                await updateRolePermisos(selectedRol.id, newPermisoIds);
                                await loadRolPermisos(selectedRol);
                              } catch (error: any) {
                                console.error("Error updating permission:", error);
                                Alert.alert("Error", error?.message || "No se pudo actualizar el permiso");
                              }
                            }}
                          >
                            <Ionicons 
                              name={isAssigned ? "checkbox" : "square-outline"} 
                              size={18} 
                              color={isAssigned ? Colors.success : Colors.textTertiary} 
                            />
                            <Text style={{ flex: 1, fontSize: 14, marginLeft: 8 }}>{permiso.nombre}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </StyledModal>

      {/* Modal para gestionar usuarios */}
      <StyledModal
        visible={isUsuariosModalVisible}
        onClose={() => { setIsUsuariosModalVisible(false); }}
        title="Gestionar Usuarios"
        confirmText=""
        hideConfirm
        fullHeight
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Usuarios del sistema</Text>
            {abogados.map((abogado) => {
              const rol = roles.find(r => r.id === abogado.rolId);
              return (
                <Pressable key={abogado.id} style={styles.usuarioItem} onPress={() => handleEditUser(abogado)}>
                  <View style={styles.usuarioInfo}>
                    <Text style={styles.usuarioNombre}>{abogado.nombre}</Text>
                    <Text style={styles.usuarioCorreo}>{abogado.correo}</Text>
                  </View>
                  <View style={styles.usuarioRol}>
                    <Text style={[styles.usuarioRolText, !rol && styles.usuarioRolDefault]}>
                      {rol?.nombre || "Sin rol"}
                    </Text>
                    {!abogado.activo && (
                      <Text style={{ fontSize: 10, color: Colors.danger }}>Inactivo</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
            {abogados.length === 0 && (
              <Text style={{ textAlign: "center", color: Colors.textSecondary, marginTop: 20 }}>
                No hay usuarios registrados
              </Text>
            )}
          </View>
        )}
      </StyledModal>

      {/* Modal para crear nuevo rol */}
      <StyledModal
        visible={isCreateRolModalVisible}
        onClose={() => { setIsCreateRolModalVisible(false); setNewRolNombre(""); setNewRolDescripcion(""); }}
        title="Crear Nuevo Rol"
        confirmText="Crear"
        onConfirm={handleCreateRol}
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>Nombre del rol:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newRolNombre}
            onChangeText={setNewRolNombre}
            placeholder="Ej: Editor"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <Text style={[styles.modalText, { marginTop: 12 }]}>Descripción (opcional):</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={newRolDescripcion}
            onChangeText={setNewRolDescripcion}
            placeholder="Descripción del rol..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </View>
      </StyledModal>

      {/* Modal para gestionar tipos de proceso */}
      <StyledModal
        visible={isTiposProcesoModalVisible}
        onClose={() => { setIsTiposProcesoModalVisible(false); }}
        title="Tipos de Proceso"
        confirmText=""
        hideConfirm
        fullHeight
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View>
            <Pressable 
              style={[styles.permisosBtn, { backgroundColor: Colors.success + "20", marginBottom: 16 }]}
              onPress={() => setIsCreateTipoProcesoModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.success} />
              <Text style={[styles.permisosBtnText, { color: Colors.success }]}>Agregar Tipo</Text>
            </Pressable>
            {tiposProceso.map((tipo) => (
              <View key={tipo.id} style={styles.usuarioItem}>
                <View style={styles.usuarioInfo}>
                  <Text style={styles.usuarioNombre}>{tipo.nombre}</Text>
                  {tipo.descripcion && (
                    <Text style={styles.usuarioCorreo}>{tipo.descripcion}</Text>
                  )}
                </View>
                <View style={styles.usuarioRol}>
                  <Switch
                    value={tipo.activo}
                    onValueChange={() => handleToggleTipoProcesoActivo(tipo)}
                    trackColor={{ false: Colors.border, true: Colors.success }}
                  />
                  <Pressable onPress={() => handleDeleteTipoProceso(tipo.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
            {tiposProceso.length === 0 && (
              <Text style={{ textAlign: "center", color: Colors.textSecondary, marginTop: 20 }}>
                No hay tipos de proceso registrados
              </Text>
            )}
          </View>
        )}
      </StyledModal>

      {/* Modal para crear tipo de proceso */}
      <StyledModal
        visible={isCreateTipoProcesoModalVisible}
        onClose={() => { setIsCreateTipoProcesoModalVisible(false); setNewTipoProcesoNombre(""); setNewTipoProcesoDescripcion(""); }}
        title="Nuevo Tipo de Proceso"
        confirmText="Crear"
        onConfirm={handleCreateTipoProceso}
        cancelText="Cancelar"
      >
        <Text style={styles.modalText}>Nombre:</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newTipoProcesoNombre}
            onChangeText={setNewTipoProcesoNombre}
            placeholder="Ej: Civil"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <Text style={[styles.modalText, { marginTop: 12 }]}>Descripción (opcional):</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={newTipoProcesoDescripcion}
            onChangeText={setNewTipoProcesoDescripcion}
            placeholder="Descripción del tipo de proceso..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </View>
      </StyledModal>

      {/* Modal para editar usuario */}
      <StyledModal
        visible={isEditUserModalVisible}
        onClose={() => { setIsEditUserModalVisible(false); setSelectedAbogado(null); }}
        title={`Editar: ${selectedAbogado?.nombre || "Usuario"}`}
        confirmText=""
        hideConfirm
      >
        {selectedAbogado && (
          <View>
            <Text style={[styles.modalText, { fontWeight: "600" }]}>Rol:</Text>
            <View style={styles.rolList}>
              <Pressable
                style={[styles.rolItem, selectedAbogado.rolId === null && styles.rolItemSelected]}
                onPress={() => handleUpdateUserRol(null)}
              >
                <Ionicons 
                  name={selectedAbogado.rolId === null ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={selectedAbogado.rolId === null ? Colors.primary : Colors.textTertiary} 
                />
                <Text style={styles.settingLabel}>Sin rol</Text>
              </Pressable>
              {roles.map((rol) => (
                <Pressable
                  key={rol.id}
                  style={[styles.rolItem, selectedAbogado.rolId === rol.id && styles.rolItemSelected]}
                  onPress={() => handleUpdateUserRol(rol.id)}
                >
                  <Ionicons 
                    name={selectedAbogado.rolId === rol.id ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedAbogado.rolId === rol.id ? Colors.primary : Colors.textTertiary} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>{rol.nombre}</Text>
                    {rol.descripcion && (
                      <Text style={{ fontSize: 11, color: Colors.textSecondary }}>{rol.descripcion}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border }}>
              <View>
                <Text style={[styles.modalText, { fontWeight: "600" }]}>Estado:</Text>
                <Text style={{ fontSize: 12, color: selectedAbogado.activo ? Colors.success : Colors.danger }}>
                  {selectedAbogado.activo ? "Activo" : "Inactivo"}
                </Text>
              </View>
              <Switch
                value={selectedAbogado.activo}
                onValueChange={handleToggleUserActivo}
                trackColor={{ false: Colors.danger, true: Colors.success }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        )}
      </StyledModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileDespacho: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  planBasic: {
    backgroundColor: Colors.surfaceSecondary,
  },
  planPro: {
    backgroundColor: Colors.accent + "20",
  },
  planText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  planBasicText: {
    color: Colors.textSecondary,
  },
  planProText: {
    color: Colors.accent,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: "50%",
    textAlign: "right",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    padding: 16,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
  permisosBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  permisosBtnPressed: {
    opacity: 0.8,
  },
  permisosBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  modalContent: {
    maxHeight: 300,
  },
  rolList: {
    gap: 8,
  },
  rolItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    gap: 10,
  },
  rolItemSelected: {
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  permisosList: {
    gap: 6,
    marginTop: 16,
  },
  permisoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    gap: 10,
  },
  permisoItemSelected: {
    backgroundColor: Colors.success + "15",
    borderWidth: 1,
    borderColor: Colors.success,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    paddingVertical: 20,
  },
  modalText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  usuarioItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  usuarioCorreo: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  usuarioRol: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
  },
  usuarioRolText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  usuarioRolDefault: {
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceSecondary,
  },
  inputContainer: {
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
})
