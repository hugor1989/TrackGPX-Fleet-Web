import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import driverService, { Driver } from '../../api/driverService';

export default function DriversListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar datos
  const loadDrivers = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await driverService.getDrivers();
      setDrivers(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadDrivers();
    }, [loadDrivers])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDrivers();
  };

  const handleDelete = (driver: Driver) => {
    Alert.alert(
      'Eliminar Conductor',
      `¿Estás seguro de eliminar a ${driver.account?.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await driverService.deleteDriver(driver.id);
              loadDrivers();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  // Filtrado
  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    const lowerQuery = searchQuery.toLowerCase();
    return drivers.filter(d => 
      d.account?.name.toLowerCase().includes(lowerQuery) ||
      d.account?.email.toLowerCase().includes(lowerQuery) ||
      d.license_number?.toLowerCase().includes(lowerQuery)
    );
  }, [drivers, searchQuery]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = drivers.length;
    const assigned = drivers.filter(d => d.current_vehicle).length;
    const available = total - assigned;
    return { total, assigned, available };
  }, [drivers]);

  return (
    <MainLayout activeMenu="Config-Conductores">
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Conductores</Text>
            <Text style={styles.pageSubtitle}>Gestiona tu plantilla de choferes</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddDriver' as never)}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nuevo Conductor</Text>
          </TouchableOpacity>
        </View>

        {/* STATS CARDS */}
        <View style={styles.statsRow}>
          <StatCard 
            label="Total" 
            value={stats.total} 
            icon="people" 
            color="#226bfc" 
            bg="#eff6ff" 
          />
          <StatCard 
            label="Asignados" 
            value={stats.assigned} 
            icon="car-sport" 
            color="#10b981" 
            bg="#ecfdf5" 
          />
          <StatCard 
            label="Disponibles" 
            value={stats.available} 
            icon="time" 
            color="#f59e0b" 
            bg="#fffbeb" 
          />
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, licencia o correo..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* LISTA */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#226bfc" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {filteredDrivers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No se encontraron conductores</Text>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {filteredDrivers.map((driver) => (
                  <DriverCard 
                    key={driver.id} 
                    driver={driver} 
                    onDelete={() => handleDelete(driver)}
                    onEdit={() => { 
                        // Navegar a editar (cuando crees esa pantalla)
                        // navigation.navigate('EditDriver', { driverId: driver.id }) 
                        Alert.alert("Editar", "Próximamente");
                    }}
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

// --- SUBCOMPONENTES ---

const StatCard = ({ label, value, icon, color, bg }: any) => (
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

const DriverCard = ({ driver, onDelete, onEdit, isDesktop }: { driver: Driver, onDelete: () => void, onEdit: () => void, isDesktop: boolean }) => {
  const isAssigned = !!driver.current_vehicle;

  return (
    <View style={[styles.card, isDesktop && styles.cardDesktop]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {driver.account?.name.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{driver.account?.name}</Text>
          <Text style={styles.cardEmail}>{driver.account?.email}</Text>
        </View>

        <View style={[styles.statusBadge, isAssigned ? styles.bgSuccess : styles.bgWarning]}>
          <Text style={[styles.statusText, isAssigned ? styles.textSuccess : styles.textWarning]}>
            {isAssigned ? 'Asignado' : 'Disponible'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        {driver.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{driver.phone}</Text>
          </View>
        )}
        {driver.license_number && (
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>Lic: {driver.license_number}</Text>
          </View>
        )}
      </View>

      {/* Sección de Vehículo Asignado */}
      {driver.current_vehicle ? (
        <View style={styles.assignedVehicleBox}>
          <Ionicons name="car-sport" size={18} color="#226bfc" />
          <View>
            <Text style={styles.vehicleName}>{driver.current_vehicle.name}</Text>
            <Text style={styles.vehiclePlate}>{driver.current_vehicle.plate}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.unassignedBox}>
          <Text style={styles.unassignedText}>Sin vehículo asignado</Text>
        </View>
      )}

      {/* Footer Acciones */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  // Header
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#226bfc', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, shadowColor: '#226bfc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Stats
  statsRow: { flexDirection: 'row', padding: 20, paddingBottom: 0, gap: 12 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280' },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    margin: 20, paddingHorizontal: 12, borderRadius: 12, height: 48
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1f2937' },

  // Lista
  listContent: { padding: 20, paddingTop: 0, paddingBottom: 80 },
  list: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  cardDesktop: { width: '32%' }, // 3 columnas en desktop
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#dbeafe'
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#226bfc' },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cardEmail: { fontSize: 13, color: '#6b7280' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  bgSuccess: { backgroundColor: '#dcfce7' },
  textSuccess: { color: '#166534' },
  bgWarning: { backgroundColor: '#f3f4f6' },
  textWarning: { color: '#4b5563' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  detailsContainer: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#4b5563' },

  // Vehicle Info
  assignedVehicleBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0f9ff', padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#bae6fd'
  },
  vehicleName: { fontSize: 13, fontWeight: '600', color: '#0369a1' },
  vehiclePlate: { fontSize: 12, color: '#0ea5e9' },
  
  unassignedBox: {
    backgroundColor: '#f9fafb', padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center'
  },
  unassignedText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },

  // Footer Actions
  cardFooter: { 
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center'
  },
  deleteBtn: { backgroundColor: '#fef2f2' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginTop: 10 },
});