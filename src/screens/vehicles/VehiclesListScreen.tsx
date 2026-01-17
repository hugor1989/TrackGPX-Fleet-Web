// src/screens/vehicles/VehiclesListScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import vehicleService, { Vehicle, VehicleStats } from '../../api/vehicleService';

export default function VehiclesListScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, filterStatus]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [vehiclesData, statsData] = await Promise.all([
        vehicleService.getVehicles(),
        vehicleService.getVehicleStats(),
      ]);
      
      setVehicles(vehiclesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        v =>
          v.name.toLowerCase().includes(query) ||
          v.plate.toLowerCase().includes(query) ||
          v.brand?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query)
      );
    }
    
    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(v => v.status === filterStatus);
    }
    
    setFilteredVehicles(filtered);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Eliminar Vehículo',
      `¿Estás seguro de eliminar ${vehicle.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleService.deleteVehicle(vehicle.id);
              Alert.alert('Éxito', 'Vehículo eliminado');
              await loadVehicles();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehículos</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehículos</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="car-sport" size={24} color="#226bfc" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="location" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats.with_gps}</Text>
              <Text style={styles.statLabel}>Con GPS</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="person" size={24} color="#6366f1" />
              </View>
              <Text style={styles.statValue}>{stats.with_driver}</Text>
              <Text style={styles.statLabel}>Con Conductor</Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, placa, marca..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'active' && styles.filterChipActive]}
            onPress={() => setFilterStatus('active')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'active' && styles.filterChipTextActive]}>
              Activos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'inactive' && styles.filterChipActive]}
            onPress={() => setFilterStatus('inactive')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'inactive' && styles.filterChipTextActive]}>
              Inactivos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'maintenance' && styles.filterChipActive]}
            onPress={() => setFilterStatus('maintenance')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'maintenance' && styles.filterChipTextActive]}>
              Mantenimiento
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Vehicles List */}
        {filteredVehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterStatus !== 'all' ? 'Sin resultados' : 'Sin vehículos'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus !== 'all'
                ? 'Intenta con otros términos de búsqueda'
                : 'Agrega tu primer vehículo para comenzar'}
            </Text>
            {!searchQuery && filterStatus === 'all' && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('VehicleForm' as never, { mode: 'create' } as never)}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Agregar Vehículo</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onPress={() =>
                  navigation.navigate('VehicleDetail' as never, { vehicleId: vehicle.id } as never)
                }
                onDelete={handleDeleteVehicle}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {vehicles.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('VehicleForm' as never, { mode: 'create' } as never)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Card de vehículo individual
function VehicleCard({
  vehicle,
  onPress,
  onDelete,
}: {
  vehicle: Vehicle;
  onPress: () => void;
  onDelete: (vehicle: Vehicle) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-sport" size={24} color="#226bfc" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{vehicle.name}</Text>
            <Text style={styles.cardSubtitle}>
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: vehicleService.getStatusBackground(vehicle.status) },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: vehicleService.getStatusColor(vehicle.status) },
            ]}
          >
            {vehicleService.getStatusLabel(vehicle.status)}
          </Text>
        </View>
      </View>

      {/* Placa */}
      <View style={styles.plateContainer}>
        <View style={styles.plate}>
          <Text style={styles.plateText}>{vehicle.plate}</Text>
        </View>
        <Text style={styles.plateLabel}>Placas</Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        {vehicle.driver ? (
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{vehicle.driver.account?.name || 'Conductor'}</Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#d1d5db" />
            <Text style={styles.infoTextDisabled}>Sin conductor</Text>
          </View>
        )}

        {vehicle.device ? (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#10b981" />
            <Text style={styles.infoTextGPS}>
              GPS: {vehicle.device.is_online ? 'Online' : 'Offline'}
            </Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#d1d5db" />
            <Text style={styles.infoTextDisabled}>Sin GPS</Text>
          </View>
        )}

        {vehicle.type && (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{vehicleService.getTypeLabel(vehicle.type)}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
          <Ionicons name="eye-outline" size={18} color="#226bfc" />
          <Text style={styles.actionButtonText}>Ver Detalles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonDanger}
          onPress={(e) => {
            e.stopPropagation();
            onDelete(vehicle);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: '#226bfc',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: '#991b1b' },
  statsContainer: { flexDirection: 'row', marginBottom: 20, gap: 12, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#1f2937' },
  filtersContainer: { marginBottom: 20 },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  filterChipText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  vehiclesList: { gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  plateContainer: { alignItems: 'center', marginBottom: 16 },
  plate: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  plateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  plateLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  cardInfo: { marginBottom: 16, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: '#6b7280' },
  infoTextGPS: { fontSize: 14, color: '#10b981', fontWeight: '500' },
  infoTextDisabled: { fontSize: 14, color: '#d1d5db' },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#226bfc' },
  actionButtonDanger: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#226bfc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});