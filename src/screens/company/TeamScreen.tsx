// src/screens/company/TeamScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, useWindowDimensions, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import companyService, { TeamMember } from '../../api/companyService';

// Mapa de roles (Ajusta según tu DB real)
const ROLE_MAP: Record<number, string> = {
  1: 'Super Admin', 2: 'Admin', 3: 'Supervisor', 4: 'Operador'
};

const TeamScreen = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);

  // --- CARGAR DATOS ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // El ID lo toma el backend del token, como acordamos
      const data = await companyService.getCompanyEmployees();
      setMembers(data);
    } catch (error: any) {
      console.error("Error cargando equipo:", error);
      // Alert.alert("Error", "No se pudo cargar la lista."); // Descomentar en prod
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // --- MANEJADORES DE ACCIÓN (SIMULADOS) ---
  const handleEdit = (user: TeamMember) => {
    // Navegar a pantalla de edición pasando el usuario
    // navigation.navigate('EditMemberScreen', { user });
    Alert.alert("Editar", `Editando a ${user.name}`);
  };

  const handleToggleStatus = async (user: TeamMember) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const actionVerb = newStatus === 'active' ? 'Activar' : 'Suspender';

    Alert.alert(
      `${actionVerb} Usuario`,
      `¿Estás seguro de que deseas ${actionVerb.toLowerCase()} a ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => {
            // Aquí llamarías a la API: companyService.updateUserStatus(user.id, newStatus)
            console.log(`${actionVerb} ID: ${user.id}`);
            // Simulación de actualización local
            setMembers(prev => prev.map(m => m.id === user.id ? {...m, status: newStatus} : m));
        }}
      ]
    );
  };

  const handleDelete = (user: TeamMember) => {
    Alert.alert(
        "Eliminar Usuario",
        `¿Realmente deseas eliminar a ${user.name}? Esta acción no se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => {
              // Aquí llamarías a la API: companyService.deleteUser(user.id)
              console.log(`Eliminando ID: ${user.id}`);
              // Simulación de eliminación local
              setMembers(prev => prev.filter(m => m.id !== user.id));
          }}
        ]
      );
  };


  // --- HELPERS UI ---
  const getRoleName = (roles: any[]) => {
    if (!roles || roles.length === 0) return 'Usuario';
    const firstRole = roles[0];
    const roleId = typeof firstRole === 'object' ? firstRole.id : firstRole;
    return ROLE_MAP[roleId] || 'Usuario';
  };
  const getRoleId = (roles: any[]) => {
    if (!roles || roles.length === 0) return 0;
    const firstRole = roles[0];
    return typeof firstRole === 'object' ? firstRole.id : firstRole;
  };
  const getRoleColor = (roleId: number) => {
    switch(roleId) {
        case 2: return { bg: '#EEF2FF', text: '#4F46E5' }; // Admin (Azul)
        case 3: return { bg: '#ECFDF5', text: '#059669' }; // Supervisor (Verde)
        default: return { bg: '#F3F4F6', text: '#374151' }; // Otros (Gris)
    }
  };

  // --- RENDER VISTA ESCRITORIO ---
  const renderDesktopRow = ({ item }: { item: TeamMember }) => {
    const roleStyle = getRoleColor(getRoleId(item.roles));
    const isActive = item.account.status === 'active';

    return (
      <View style={styles.tableRow}>
        {/* Info Principal */}
        <View style={[styles.col, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          <View>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{item.account.email}</Text>
          </View>
        </View>
        <View style={[styles.col, { flex: 1.5 }]}>
          <Text style={styles.cellText}>{item.position || '-'}</Text>
        </View>
        <View style={[styles.col, { flex: 1.5 }]}>
          <Text style={styles.cellText}>{item.phone || '-'}</Text>
        </View>
        
        {/* Estado Visual */}
        <View style={[styles.col, { flex: 1 }]}>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusSuspended]}>
                <View style={[styles.statusDot, isActive ? {backgroundColor:'#16a34a'} : {backgroundColor:'#dc2626'}]} />
                <Text style={[styles.statusText, isActive ? {color:'#166534'} : {color:'#991b1b'}]}>
                  {isActive ? 'Activo' : 'Suspendido'}
                </Text>
            </View>
        </View>

        {/* Rol */}
        <View style={[styles.col, { flex: 1 }]}>
           <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[styles.badgeText, { color: roleStyle.text }]}>{getRoleName(item.roles)}</Text>
           </View>
        </View>

        {/* --- BOTONES DE ACCIÓN (ESCRITORIO) --- */}
        <View style={[styles.col, { flex: 1.2, alignItems: 'flex-end', flexDirection:'row', justifyContent:'flex-end', gap: 8 }]}>
          
          {/* Botón Activar/Suspender */}
          <TouchableOpacity 
            style={[styles.iconActionBtn, isActive ? styles.btnSuspend : styles.btnActivate]} 
            onPress={() => handleToggleStatus(item)}
             // Tooltip casero para web
            {...Platform.select({web: {title: isActive ? "Suspender usuario" : "Activar usuario"}} as any)}
          >
            <Ionicons name={isActive ? "pause-outline" : "play-outline"} size={18} color={isActive ? "#991b1b" : "#166534"} />
          </TouchableOpacity>

          {/* Botón Editar */}
          <TouchableOpacity style={[styles.iconActionBtn, styles.btnEdit]} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#1F2937" />
          </TouchableOpacity>

           {/* Botón Eliminar */}
           <TouchableOpacity style={[styles.iconActionBtn, styles.btnDelete]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- RENDER VISTA MÓVIL ---
  const renderMobileCard = ({ item }: { item: TeamMember }) => {
    const roleStyle = getRoleColor(getRoleId(item.roles));
    const isActive = item.status === 'active';
    
    return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarTextSmall}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>{item.position || 'Sin puesto'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
               <Text style={[styles.badgeText, { color: roleStyle.text }]}>{getRoleName(item.roles)}</Text>
            </View>
          </View>
          
          <View style={styles.cardBody}>
            <View style={styles.infoRow}><Ionicons name="mail-outline" size={16} color="#9CA3AF" /><Text style={styles.infoText}>{item.account.email}</Text></View>
            {item.phone && (<View style={styles.infoRow}><Ionicons name="call-outline" size={16} color="#9CA3AF" /><Text style={styles.infoText}>{item.phone}</Text></View>)}
            <View style={styles.infoRow}>
                <View style={[styles.statusDot, isActive ? {backgroundColor:'#16a34a'} : {backgroundColor:'#dc2626'}, {marginRight: 6}]} />
                <Text style={[styles.infoText, {fontWeight: '600', color: isActive ? '#166534' : '#991b1b'}]}>{isActive ? 'Activo' : 'Suspendido'}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* --- BOTONES DE ACCIÓN (MÓVIL - FOOTER) --- */}
          <View style={styles.cardFooter}>
             <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleToggleStatus(item)}>
                <Ionicons name={isActive ? "pause-circle-outline" : "play-circle-outline"} size={20} color={isActive ? "#DC2626" : "#16a34a"} />
                <Text style={[styles.cardActionText, {color: isActive ? "#DC2626" : "#16a34a"}]}>{isActive ? "Suspender" : "Activar"}</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="create-outline" size={20} color="#4B5563" />
                <Text style={styles.cardActionText}>Editar</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={[styles.cardActionText, {color: "#DC2626"}]}>Eliminar</Text>
             </TouchableOpacity>
          </View>
        </View>
      );
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <View style={styles.container}>
      {/* ... (El Header y Toolbar son iguales al código anterior) ... */}
      {/* Por brevedad no los repito, solo asegúrate de que el botón "Nuevo Usuario" navegue a 'AddMemberScreen' */}
       <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
           <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View>
           <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
           <Text style={styles.headerSubtitle}>Administra los accesos de tu equipo</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput style={styles.searchInput} placeholder="Buscar usuario..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddMemberScreen')}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Nuevo Usuario</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {isDesktop && (
            <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 2.5 }]}>COLABORADOR</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>PUESTO</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>TELÉFONO</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>ESTADO</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>ROL</Text>
            <Text style={[styles.headerText, { flex: 1.2, textAlign: 'right' }]}>ACCIONES</Text>
            </View>
        )}
        <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={isDesktop ? renderDesktopRow : renderMobileCard}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Estilos anteriores básicos) ...
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 24 },
  navHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: '#E5E7EB'},
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' },
  searchContainer: { flex: 1, minWidth: 280, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1F2937', ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  addButton: { backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, gap: 8, height: 44 },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  contentArea: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', flex: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10 },
  listContent: { paddingBottom: 20 },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerText: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white' },
  col: { justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  rowSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  cellText: { fontSize: 13, color: '#374151' },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // --- NUEVOS ESTILOS PARA ESTADO Y ACCIONES ---
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusSuspended: { backgroundColor: '#FEE2E2' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },

  iconActionBtn: { padding: 8, borderRadius: 6, marginLeft: 4, borderWidth: 1 },
  btnEdit: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  btnDelete: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  btnActivate: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  btnSuspend: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  // Estilos Móvil Actualizados
  card: { padding: 16, backgroundColor: 'white' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { color: '#4F46E5', fontWeight: 'bold' },
  cardBody: { gap: 8, marginTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#4B5563' },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  cardActionText: { fontSize: 13, fontWeight: '500', color: '#4B5563' }
});

export default TeamScreen;