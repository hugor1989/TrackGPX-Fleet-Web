import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import companyService, { TeamMember } from '../../api/companyService';

// Mapa de roles
const ROLE_MAP: Record<number, string> = {
  1: 'Super Admin', 2: 'Admin', 3: 'Supervisor', 4: 'Operador'
};

export default function TeamScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompanyEmployees();
      setMembers(data);
    } catch (error: any) {
      console.error("Error cargando equipo:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recargar datos cada vez que la pantalla gana foco (útil al volver de Editar)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // --- ACCIONES CONECTADAS ---
  
  // 1. EDITAR (Navegar a la pantalla nueva)
  const handleEdit = (user: TeamMember) => {
    navigation.navigate('EditMemberScreen', { user });
  };

  // 2. SUSPENDER (Llamar al endpoint)
  const handleToggleStatus = async (user: TeamMember) => {
    const currentStatus = user.account?.status || user.status || 'inactive';
    const isActive = currentStatus === 'active';
    const actionText = isActive ? 'suspender' : 'reactivar';

    Alert.alert(
      `Confirmar acción`,
      `¿Deseas ${actionText} el acceso de ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              // Llamada a la API real
              await companyService.suspendMember(user.id);
              // Recargar lista
              onRefresh();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (user: TeamMember) => {
    // Si tuvieras endpoint de eliminar, iría aquí.
    // Por ahora solo simulación o warning
    Alert.alert("Aviso", "Para eliminar permanentemente contacta a soporte o usa Suspender.");
  };

  // --- RENDERIZADO ---

  // Componente Badge de Rol
  const RoleBadge = ({ roleId }: { roleId: number }) => {
    const style = roleId === 2 ? { bg: '#e0e7ff', text: '#3730a3' } : 
                  roleId === 3 ? { bg: '#dcfce7', text: '#166534' } : 
                  { bg: '#f3f4f6', text: '#374151' };
    
    return (
      <View style={[styles.roleBadge, { backgroundColor: style.bg }]}>
        <Text style={[styles.roleText, { color: style.text }]}>
          {ROLE_MAP[roleId] || 'Sin Rol'}
        </Text>
      </View>
    );
  };

  // Fila de Escritorio
  const renderDesktopRow = ({ item }: { item: TeamMember }) => {
    const isActive = (item.account?.status === 'active') || (item.status === 'active');
    
    let roleId = 0;
    if (item.roles && item.roles.length > 0) {
      const firstRole = item.roles[0];
      roleId = typeof firstRole === 'object' ? firstRole.id : firstRole;
    }

    return (
      <View style={styles.tableRow}>
        {/* COLUMNA USUARIO (Alineada Correctamente) */}
        <View style={[styles.col, styles.userCol]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.cellTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cellSubtitle} numberOfLines={1}>{item.account.email}</Text>
          </View>
        </View>
        
        <View style={[styles.col, { flex: 2 }]}>
          <Text style={styles.cellText}>{item.position || '-'}</Text>
        </View>

        <View style={[styles.col, { flex: 2 }]}>
          <Text style={styles.cellText}>{item.phone || '-'}</Text>
        </View>
        
        <View style={[styles.col, { flex: 1.5 }]}>
          <RoleBadge roleId={roleId} />
        </View>

        <View style={[styles.col, { flex: 1.5 }]}>
          <View style={[styles.statusIndicator, isActive ? styles.statusActive : styles.statusSuspended]}>
            <View style={[styles.dot, isActive ? { backgroundColor: '#10b981' } : { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.statusLabel, isActive ? { color: '#047857' } : { color: '#b91c1c' }]}>
              {isActive ? 'Activo' : 'Suspendido'}
            </Text>
          </View>
        </View>

        <View style={[styles.col, { flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }]}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleToggleStatus(item)} style={styles.iconButton}>
            <Ionicons name={isActive ? "ban-outline" : "refresh-outline"} size={18} color={isActive ? "#eab308" : "#10b981"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // (El renderMobileCard y resto del código es igual al anterior, solo cambia renderDesktopRow y actions)
  // ... Copia el resto del componente renderMobileCard y return del código anterior ...
  // Para ahorrar espacio aquí solo pongo la lógica repetida necesaria si la necesitas, 
  // pero el cambio crucial está arriba en renderDesktopRow y handleToggleStatus.
  
  // AQUI ABAJO REPLICO EL RENDER MOBILE Y RETURN COMPLETO PARA QUE SOLO COPIES Y PEGUES TODO EL ARCHIVO:
  
  const renderMobileCard = ({ item }: { item: TeamMember }) => {
    const isActive = (item.account?.status === 'active') || (item.status === 'active');
    let roleId = 0;
    if (item.roles && item.roles.length > 0) {
      const firstRole = item.roles[0];
      roleId = typeof firstRole === 'object' ? firstRole.id : firstRole;
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={[styles.avatar, { width: 42, height: 42 }]}>
                <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.position || 'Sin puesto'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardInfoRow}>
            <Ionicons name="mail-outline" size={16} color="#9ca3af" />
            <Text style={styles.cardInfoText}>{item.account.email}</Text>
          </View>
          {item.phone && (
            <View style={styles.cardInfoRow}>
              <Ionicons name="call-outline" size={16} color="#226bfc" />
              <Text style={[styles.cardInfoText, { color: '#226bfc' }]}>{item.phone}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <RoleBadge roleId={roleId} />
          <TouchableOpacity 
            onPress={() => handleToggleStatus(item)}
            style={[styles.miniActionBtn, isActive ? { backgroundColor: '#fef2f2' } : { backgroundColor: '#ecfdf5' }]}
          >
            <Ionicons name={isActive ? "power" : "refresh"} size={16} color={isActive ? "#ef4444" : "#10b981"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredData = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Equipo</Text>
          <Text style={styles.screenSubtitle}>Gestiona el acceso de tus colaboradores</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddMemberScreen')}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>{isDesktop ? 'Invitar Usuario' : 'Nuevo'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {isDesktop && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>USUARIO</Text>
            <Text style={[styles.th, { flex: 2 }]}>PUESTO</Text>
            <Text style={[styles.th, { flex: 2 }]}>TELÉFONO</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>ROL</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>ESTADO</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>ACCIONES</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#226bfc" />
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={isDesktop ? renderDesktopRow : renderMobileCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#226bfc']} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  screenSubtitle: { fontSize: 14, color: '#6b7280' },
  toolbar: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1f2937' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#226bfc', borderRadius: 10, paddingHorizontal: 16, height: 44 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  contentContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  listContainer: { paddingBottom: 20 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  
  col: { justifyContent: 'center' },
  // ESTILOS NUEVOS PARA ALINEACIÓN USUARIO
  userCol: { flex: 3, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-start' },
  userInfo: { justifyContent: 'center', flex: 1 }, // Asegura que el texto ocupe espacio y se centre verticalmente
  
  cellTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cellSubtitle: { fontSize: 12, color: '#6b7280' },
  cellText: { fontSize: 13, color: '#4b5563' },
  iconButton: { padding: 6, borderRadius: 6, backgroundColor: '#f3f4f6' },
  
  // Estilos de tarjeta móvil
  card: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  cardSubtitle: { fontSize: 13, color: '#6b7280' },
  cardBody: { marginTop: 12, gap: 6 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardInfoText: { fontSize: 13, color: '#4b5563' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  miniActionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  avatar: { backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  avatarText: { color: '#226bfc', fontWeight: '700' },
  
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '600' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusActive: { backgroundColor: '#ecfdf5' },
  statusSuspended: { backgroundColor: '#fef2f2' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusLabel: { fontSize: 11, fontWeight: '600' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#9ca3af', marginTop: 10 },
});