import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout'; // ✅ Usamos el Layout principal
import vehicleService, { Vehicle, VehicleStats } from '../../api/vehicleService';

// --- COMPONENTES AUXILIARES ---

// 1. Badge de Placa Estilizada
const LicensePlate = ({ plate }: { plate: string }) => (
  <View style={styles.plateContainer}>
    <View style={styles.plateBorder}>
      <View style={styles.plateTop} />
      <Text style={styles.plateText}>{plate}</Text>
    </View>
  </View>
);

// 2. Chip de Estado (GPS)
const GpsStatusBadge = ({ isOnline }: { isOnline: boolean }) => (
  <View style={[styles.gpsBadge, isOnline ? styles.gpsOnline : styles.gpsOffline]}>
    <View style={[styles.gpsDot, { backgroundColor: isOnline ? '#10b981' : '#6b7280' }]} />
    <Text style={[styles.gpsText, { color: isOnline ? '#065f46' : '#374151' }]}>
      {isOnline ? 'GPS Online' : 'Sin Señal'}
    </Text>
  </View>
);

// 3. Skeleton Loader (Efecto de carga elegante)
const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonBody} />
      </View>
    ))}
  </View>
);

export default function VehiclesListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');

  // Carga de datos
  const loadData = useCallback(async () => {
    try {
      // Si es refresh manual, no mostramos el skeleton completo, solo el spinner del refresh
      if (!refreshing) setLoading(true);
      
      const [vehiclesData, statsData] = await Promise.all([
        vehicleService.getVehicles(),
        vehicleService.getVehicleStats(),
      ]);
      
      setVehicles(vehiclesData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Recargar al entrar (útil si vienes de crear/editar)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtrado optimizado
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.brand && v.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, filterStatus]);

  // Acciones
  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      'Eliminar Vehículo',
      `¿Confirmas eliminar a ${vehicle.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleService.deleteVehicle(vehicle.id);
              loadData(); // Recargar lista
            } catch (error: any) {
              Alert.alert("Error", "No se pudo eliminar el vehículo.");
            }
          },
        },
      ]
    );
  };

  return (
    <MainLayout activeMenu="Config-Vehiculos">
      <View style={styles.container}>
        
        {/* HEADER DE LA PÁGINA */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Vehículos</Text>
            <Text style={styles.pageSubtitle}>Administra tu flota y asignaciones</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('VehicleForm' as never, { mode: 'create' } as never)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nuevo Vehículo</Text>
          </TouchableOpacity>
        </View>

        {/* ESTADÍSTICAS (Resumen rápido) */}
        {stats && (
          <View style={styles.statsRow}>
            <StatItem 
              icon="car-sport" 
              value={stats.total} 
              label="Total" 
              color="#226bfc" 
              bg="#eff6ff" 
            />
            <StatItem 
              icon="checkmark-circle" 
              value={stats.active} 
              label="Activos" 
              color="#10b981" 
              bg="#ecfdf5" 
            />
            <StatItem 
              icon="wifi" 
              value={stats.with_gps} 
              label="Con GPS" 
              color="#f59e0b" 
              bg="#fffbeb" 
            />
            <StatItem 
              icon="person" 
              value={stats.with_driver} 
              label="Asignados" 
              color="#6366f1" 
              bg="#e0e7ff" 
            />
          </View>
        )}

        {/* BARRA DE HERRAMIENTAS (Búsqueda y Filtros) */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar placa, marca, alias..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <FilterChip label="Todos" active={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
            <FilterChip label="Activos" active={filterStatus === 'active'} onPress={() => setFilterStatus('active')} />
            <FilterChip label="Inactivos" active={filterStatus === 'inactive'} onPress={() => setFilterStatus('inactive')} />
            <FilterChip label="Mantenimiento" active={filterStatus === 'maintenance'} onPress={() => setFilterStatus('maintenance')} />
          </ScrollView>
        </View>

        {/* LISTA DE VEHÍCULOS */}
        {loading && !refreshing ? (
          <LoadingSkeleton />
        ) : (
          <ScrollView 
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#226bfc']} />}
          >
            {filteredVehicles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No se encontraron vehículos</Text>
                <Text style={styles.emptySubtitle}>Intenta ajustar tus filtros o agrega uno nuevo.</Text>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard 
                    key={vehicle.id} 
                    vehicle={vehicle} 
                    onPress={() => navigation.navigate('VehicleDetail' as never, { vehicleId: vehicle.id } as never)}
                    onDelete={() => handleDelete(vehicle)}
                    isDesktop={isDesktop}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </MainLayout>
  );
}

// --- SUBCOMPONENTES DE UI ---

const StatItem = ({ icon, value, label, color, bg }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const FilterChip = ({ label, active, onPress }: any) => (
  <TouchableOpacity 
    style={[styles.filterChip, active && styles.filterChipActive]} 
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const VehicleCard = ({ vehicle, onPress, onDelete, isDesktop }: any) => {
  const isOnline = vehicle.device?.is_online || false;
  
  return (
    <TouchableOpacity 
      style={[styles.card, isDesktop && styles.cardDesktop]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header Tarjeta */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="car-sport" size={24} color="#226bfc" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{vehicle.name}</Text>
          <Text style={styles.cardSubtitle}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Cuerpo: Placa y Estado */}
      <View style={styles.cardBody}>
        <LicensePlate plate={vehicle.plate} />
        <GpsStatusBadge isOnline={isOnline} />
      </View>

      {/* Footer: Info adicional */}
      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <Ionicons name="person-outline" size={14} color="#6b7280" />
          <Text style={styles.footerText} numberOfLines={1}>
            {vehicle.driver?.account?.name || 'Sin conductor'}
          </Text>
        </View>
        
        {/* Indicador de Status Texto */}
        <View style={[
          styles.statusDot, 
          { backgroundColor: vehicle.status === 'active' ? '#10b981' : '#f59e0b' }
        ]} />
      </View>
    </TouchableOpacity>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  // Header
  pageHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#226bfc', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, shadowColor: '#226bfc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row', padding: 15, gap: 10,
    flexWrap: 'wrap' // Para que baje en móvil si no cabe
  },
  statCard: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  // Toolbar
  toolbar: { paddingHorizontal: 15, paddingBottom: 10, gap: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1f2937' },
  filterScroll: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8
  },
  filterChipActive: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  filterText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  // Lista y Grid
  listContent: { padding: 15, paddingBottom: 80 },
  list: { gap: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },

  // Card Vehículo
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  cardDesktop: { width: '48%' }, // 2 columnas en desktop
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cardSubtitle: { fontSize: 13, color: '#6b7280' },
  deleteBtn: { padding: 6, borderRadius: 6, backgroundColor: '#fef2f2' },

  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  
  // Placa Estilizada
  plateContainer: { backgroundColor: '#f3f4f6', padding: 2, borderRadius: 6 },
  plateBorder: { 
    borderWidth: 2, borderColor: '#1f2937', borderRadius: 4, 
    paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#fff',
    alignItems: 'center' 
  },
  plateText: { 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    fontWeight: 'bold', fontSize: 16, color: '#1f2937', letterSpacing: 1 
  },
  plateTop: { height: 4, width: 20, backgroundColor: '#fbbf24', borderRadius: 2, marginBottom: 2 }, // Detalle amarillo tipo placa

  // Badges GPS
  gpsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  gpsOnline: { backgroundColor: '#ecfdf5' },
  gpsOffline: { backgroundColor: '#f3f4f6' },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  gpsText: { fontSize: 11, fontWeight: '600' },

  // Footer Card
  cardFooter: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' 
  },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 13, color: '#6b7280' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4 },

  // Skeleton
  skeletonContainer: { padding: 15, gap: 15 },
  skeletonCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, height: 160 },
  skeletonHeader: { width: '60%', height: 20, backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 10 },
  skeletonBody: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8 }
});