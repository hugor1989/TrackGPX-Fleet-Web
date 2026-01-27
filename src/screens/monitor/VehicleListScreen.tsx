import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import vehicleService, { Vehicle } from '../../api/vehicleService';

export default function VehicleListScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MOVING' | 'STOPPED' | 'OFFLINE'>('ALL');

  // Carga inicial
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Filtrado (Buscador + Tabs de Estado)
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // 1. Filtro de Texto (Placa, Marca o Chofer)
      const query = searchText.toLowerCase();
      const matchesSearch = 
        v.plate.toLowerCase().includes(query) || 
        v.brand.toLowerCase().includes(query) ||
        (v.driver?.account?.name || '').toLowerCase().includes(query);

      // 2. Filtro de Estado (Simulado, ajusta según tu lógica real de 'status')
      // Asumiendo status: 'EN_RUTA', 'DETENIDO', 'SIN_SEÑAL'
      let matchesStatus = true;
      if (statusFilter === 'MOVING') matchesStatus = v.status === 'EN_RUTA';
      if (statusFilter === 'STOPPED') matchesStatus = v.status === 'DETENIDO';
      if (statusFilter === 'OFFLINE') matchesStatus = v.status === 'SIN_SEÑAL';

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchText, statusFilter]);

  // Conteos para los botones superiores
  const counts = {
    all: vehicles.length,
    moving: vehicles.filter(v => v.status === 'EN_RUTA').length,
    stopped: vehicles.filter(v => v.status === 'DETENIDO').length,
    offline: vehicles.filter(v => v.status === 'SIN_SEÑAL').length,
  };

  // Acción al dar clic en un vehículo
  const handlePressVehicle = (vehicleId: number) => {
    // @ts-ignore - Navegamos a la pantalla "Detail" que ya refactorizamos
    navigation.navigate('VehicleMonitorDetail', { vehicleId });
  };

  const renderItem = ({ item }: { item: Vehicle }) => {
    const isMoving = item.status === 'EN_RUTA';
    const isOffline = item.status === 'SIN_SEÑAL';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handlePressVehicle(item.id)}
        activeOpacity={0.7}
      >
        {/* Barra lateral de color según estado */}
        <View style={[
            styles.statusStrip, 
            isMoving ? styles.bgSuccess : isOffline ? styles.bgGray : styles.bgDanger
        ]} />
        
        <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Ionicons name="car-sport" size={20} color="#3b82f6" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.plateText}>{item.plate}</Text>
                    <Text style={styles.brandText}>{item.brand} {item.model}</Text>
                </View>
                {/* Badge de Estado */}
                <View style={[
                    styles.badge, 
                    isMoving ? styles.bgSuccessLight : isOffline ? styles.bgGrayLight : styles.bgDangerLight
                ]}>
                    <Text style={[
                        styles.badgeText, 
                        isMoving ? styles.textSuccess : isOffline ? styles.textGray : styles.textDanger
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.row}>
                    <Ionicons name="person-circle-outline" size={16} color="#64748b" />
                    <Text style={styles.footerText}>
                        {item.driver?.account?.name || 'Sin Asignar'}
                    </Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="speedometer-outline" size={16} color="#64748b" />
                    <Text style={styles.footerText}>{item.device?.speed || 0} km/h</Text>
                </View>
            </View>
        </View>

        <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <MainLayout activeMenu="Lista de Vehículos">
      <View style={styles.container}>
        
        {/* HEADER & FILTROS SUPERIORES */}
        <View style={styles.headerContainer}>
            <Text style={styles.pageTitle}>Monitor de Flota</Text>
            
            {/* Buscador */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Buscar por placa, chofer..." 
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {/* Tabs de Filtro Rápido */}
            <View style={styles.filterTabs}>
                <FilterTab label="Todos" count={counts.all} active={statusFilter==='ALL'} onPress={()=>setStatusFilter('ALL')} color="#3b82f6" />
                <FilterTab label="En Ruta" count={counts.moving} active={statusFilter==='MOVING'} onPress={()=>setStatusFilter('MOVING')} color="#10b981" />
                <FilterTab label="Detenidos" count={counts.stopped} active={statusFilter==='STOPPED'} onPress={()=>setStatusFilter('STOPPED')} color="#ef4444" />
                <FilterTab label="Sin Señal" count={counts.offline} active={statusFilter==='OFFLINE'} onPress={()=>setStatusFilter('OFFLINE')} color="#64748b" />
            </View>
        </View>

        {/* LISTA DE VEHÍCULOS */}
        {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={filteredVehicles}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="car-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No se encontraron vehículos.</Text>
                    </View>
                }
            />
        )}
      </View>
    </MainLayout>
  );
}

// Componente pequeño para los tabs de filtro
const FilterTab = ({ label, count, active, onPress, color }: any) => (
    <TouchableOpacity 
        style={[
            styles.filterTab, 
            active && { backgroundColor: color + '15', borderColor: color }
        ]} 
        onPress={onPress}
    >
        <Text style={[styles.filterLabel, active && { color: color, fontWeight:'700' }]}>{label}</Text>
        <View style={[styles.filterBadge, { backgroundColor: active ? color : '#e2e8f0' }]}>
            <Text style={[styles.filterCount, { color: active ? '#fff' : '#64748b' }]}>{count}</Text>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  
  // Header
  headerContainer: { backgroundColor: '#fff', padding: 20, paddingBottom: 10, borderBottomWidth:1, borderColor:'#e2e8f0' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 15 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#334155', outlineStyle: 'none' as any },

  filterTabs: { flexDirection: 'row', gap: 10, flexWrap:'wrap' },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#fff' },
  filterLabel: { fontSize: 13, color: '#64748b' },
  filterBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
  filterCount: { fontSize: 11, fontWeight: 'bold' },

  // Lista
  listContent: { padding: 20, gap: 12 },
  
  // Card Vehículo
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 2, borderWidth:1, borderColor:'#f1f5f9' },
  statusStrip: { width: 5 },
  bgSuccess: { backgroundColor: '#10b981' },
  bgDanger: { backgroundColor: '#ef4444' },
  bgGray: { backgroundColor: '#94a3b8' },

  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  plateText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  brandText: { fontSize: 12, color: '#64748b' },
  
  // Badges dentro de la card
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bgSuccessLight: { backgroundColor: '#dcfce7' },
  bgDangerLight: { backgroundColor: '#fee2e2' },
  bgGrayLight: { backgroundColor: '#f1f5f9' },
  textSuccess: { color: '#166534', fontSize: 10, fontWeight: 'bold' },
  textDanger: { color: '#991b1b', fontSize: 10, fontWeight: 'bold' },
  textGray: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  arrowContainer: { justifyContent: 'center', paddingRight: 16 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#94a3b8' }
});