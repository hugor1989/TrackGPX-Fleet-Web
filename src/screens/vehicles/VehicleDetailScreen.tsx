// src/screens/vehicles/VehicleDetailScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import vehicleService, { Vehicle } from '../../api/vehicleService';
import driverService from '../../api/driverService';
import fineService, { Fine } from '../../api/fineService';
import AssignDeviceModal from '../../components/AssignDeviceModal';

type TabType = 'info' | 'gps' | 'fines';

export default function VehicleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { vehicleId: number } | undefined;
  const vehicleId = params?.vehicleId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [error, setError] = useState('');
  const [showAssignDeviceModal, setShowAssignDeviceModal] = useState(false);

  // Estado para multas
  const [fines, setFines] = useState<Fine[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      setError('');

      const vehicleData = await vehicleService.getVehicle(vehicleId!);
      setVehicle(vehicleData);

      // Si hay placas, cargar multas
      if (vehicleData.plate) {
        loadFines(vehicleData.plate);
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFines = async (plate: string) => {
    try {
      setLoadingFines(true);
      const finesData = await fineService.searchByPlate(plate);
      setFines(finesData);
    } catch (err: any) {
      console.error('Error loading fines:', err);
    } finally {
      setLoadingFines(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicle();
    setRefreshing(false);
  };

  const handleUnassignDriver = async () => {
    if (!vehicle) return;

    Alert.alert(
      'Desasignar Conductor',
      '¿Estás seguro de desasignar el conductor de este vehículo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desasignar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleService.unassignDriver(vehicle.id);
              Alert.alert('Éxito', 'Conductor desasignado');
              await loadVehicle();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleUnassignDevice = async () => {
    if (!vehicle) return;

    Alert.alert(
      'Desasignar GPS',
      '¿Estás seguro de desasignar el dispositivo GPS de este vehículo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desasignar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleService.unassignDevice(vehicle.id);
              Alert.alert('Éxito', 'GPS desasignado');
              await loadVehicle();
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
          <Text style={styles.headerTitle}>Detalle del Vehículo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#226bfc" />
        </View>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Vehículo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Vehículo no encontrado</Text>
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
        <Text style={styles.headerTitle}>{vehicle.name}</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('VehicleForm' as never, { mode: 'edit', vehicleId: vehicle.id } as never)
          }
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Vehicle Header Card */}
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-sport" size={48} color="#226bfc" />
          </View>

          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehicleDetails}>
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </Text>

            <View style={styles.plateContainer}>
              <View style={styles.plate}>
                <Text style={styles.plateText}>{vehicle.plate}</Text>
              </View>
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

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={activeTab === 'info' ? '#226bfc' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'gps' && styles.tabActive]}
            onPress={() => setActiveTab('gps')}
          >
            <Ionicons
              name="location"
              size={20}
              color={activeTab === 'gps' ? '#226bfc' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === 'gps' && styles.tabTextActive]}>
              GPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'fines' && styles.tabActive]}
            onPress={() => setActiveTab('fines')}
          >
            <Ionicons
              name="warning"
              size={20}
              color={activeTab === 'fines' ? '#226bfc' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === 'fines' && styles.tabTextActive]}>
              Multas
            </Text>
            {fines.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{fines.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'info' && (
            <InfoTab
              vehicle={vehicle}
              onUnassignDriver={handleUnassignDriver}
              onUnassignDevice={handleUnassignDevice}
            />
          )}
          {activeTab === 'gps' && (
            <GPSTab
              vehicle={vehicle}
              onAssign={() => setShowAssignDeviceModal(true)}
            />
          )}
          {activeTab === 'fines' && (
            <FinesTab fines={fines} loading={loadingFines} onRefresh={() => loadFines(vehicle.plate)} />
          )}
        </View>
      </ScrollView>

      {/* Modal Asignar GPS */}
      <AssignDeviceModal
        visible={showAssignDeviceModal}
        vehicleId={vehicle.id}
        vehicleName={vehicle.name}
        onClose={() => setShowAssignDeviceModal(false)}
        onSuccess={async () => {
          setShowAssignDeviceModal(false);
          await handleRefresh();
        }}
      />
    </View>
  );
}

// Tab de Información
function InfoTab({
  vehicle,
  onUnassignDriver,
  onUnassignDevice,
}: {
  vehicle: Vehicle;
  onUnassignDriver: () => void;
  onUnassignDevice: () => void;
}) {
  return (
    <View>
      {/* Información General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValue}>
            {vehicleService.getTypeLabel(vehicle.type)}
          </Text>
        </View>

        {vehicle.vin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VIN:</Text>
            <Text style={styles.infoValue}>{vehicle.vin}</Text>
          </View>
        )}

        {vehicle.odometer && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Odómetro:</Text>
            <Text style={styles.infoValue}>{vehicle.odometer.toLocaleString()} km</Text>
          </View>
        )}
      </View>

      {/* Conductor Asignado */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conductor Asignado</Text>
        
        {vehicle.driver && vehicle.driver.account ? (
          <View style={styles.driverCard}>
            <View style={styles.driverIcon}>
              <Ionicons name="person" size={32} color="#226bfc" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{vehicle.driver.account.name}</Text>
              <Text style={styles.driverDetail}>{vehicle.driver.account.email}</Text>
              {vehicle.driver.phone && (
                <Text style={styles.driverDetail}>
                  📱 {driverService.formatPhone(vehicle.driver.phone)}
                </Text>
              )}
              {vehicle.driver.license_number && (
                <Text style={styles.driverDetail}>
                  🪪 Licencia: {vehicle.driver.license_number}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.unassignButton} onPress={onUnassignDriver}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Sin conductor asignado</Text>
          </View>
        )}
      </View>

      {/* Dispositivo GPS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispositivo GPS</Text>
        
        {vehicle.device ? (
          <View style={styles.deviceCard}>
            <View style={styles.deviceIcon}>
              <Ionicons name="location" size={32} color="#10b981" />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>IMEI: {vehicle.device.imei}</Text>
              <View style={styles.deviceStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: vehicle.device.is_online ? '#10b981' : '#6b7280' },
                  ]}
                />
                <Text style={styles.deviceStatusText}>
                  {vehicle.device.is_online ? 'En línea' : 'Desconectado'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.unassignButton} onPress={onUnassignDevice}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Sin dispositivo GPS asignado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Tab de GPS (ACTUALIZADO CON BOTÓN ASIGNAR)
function GPSTab({
  vehicle,
  onAssign,
}: {
  vehicle: Vehicle;
  onAssign: () => void;
}) {
  if (!vehicle.device) {
    return (
      <View>
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateTitle}>Sin GPS asignado</Text>
          <Text style={styles.emptyStateText}>
            Asigna un dispositivo GPS para rastrear este vehículo en tiempo real
          </Text>
          
          {/* Botón para asignar GPS */}
          <TouchableOpacity
            style={styles.assignGPSButton}
            onPress={onAssign}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.assignGPSButtonText}>Asignar Dispositivo GPS</Text>
          </TouchableOpacity>
        </View>
        
        {/* Info adicional */}
        <View style={styles.infoBoxGPS}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoBoxGPSText}>
            Los dispositivos GPS te permiten rastrear la ubicación en tiempo real, 
            ver historial de rutas y recibir alertas.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado del Dispositivo</Text>
        
        <View style={styles.gpsCard}>
          <View style={styles.gpsInfo}>
            <Text style={styles.gpsLabel}>IMEI:</Text>
            <Text style={styles.gpsValue}>{vehicle.device.imei}</Text>
          </View>
          
          <View style={styles.gpsInfo}>
            <Text style={styles.gpsLabel}>Estado:</Text>
            <View style={styles.gpsStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: vehicle.device.is_online ? '#10b981' : '#6b7280' },
                ]}
              />
              <Text style={styles.gpsValue}>
                {vehicle.device.is_online ? 'En línea' : 'Desconectado'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Aquí iría el mapa */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicación en Tiempo Real</Text>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={48} color="#9ca3af" />
          <Text style={styles.mapPlaceholderText}>
            Mapa en desarrollo
          </Text>
        </View>
      </View>
    </View>
  );
}

// Tab de Multas
function FinesTab({
  fines,
  loading,
  onRefresh,
}: {
  fines: Fine[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
        <Text style={styles.loadingText}>Consultando multas...</Text>
      </View>
    );
  }

  if (fines.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
        <Text style={styles.emptyStateTitle}>Sin multas</Text>
        <Text style={styles.emptyStateText}>
          Este vehículo no tiene multas registradas
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#226bfc" />
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = fineService.calculateFineStats(fines);

  return (
    <View>
      {/* Stats */}
      <View style={styles.finesStats}>
        <View style={styles.fineStatCard}>
          <Text style={styles.fineStatValue}>{stats.total}</Text>
          <Text style={styles.fineStatLabel}>Total</Text>
        </View>
        <View style={[styles.fineStatCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.fineStatValue, { color: '#dc2626' }]}>{stats.pendientes}</Text>
          <Text style={styles.fineStatLabel}>Pendientes</Text>
        </View>
        <View style={[styles.fineStatCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.fineStatValue, { color: '#16a34a' }]}>{stats.pagadas}</Text>
          <Text style={styles.fineStatLabel}>Pagadas</Text>
        </View>
      </View>

      <View style={styles.finesTotalCard}>
        <Text style={styles.finesTotalLabel}>Total a pagar:</Text>
        <Text style={styles.finesTotalValue}>
          {fineService.formatMonto(stats.montoPendiente.toString())}
        </Text>
      </View>

      {/* Lista de multas */}
      <View style={styles.finesList}>
        {fines.map((fine, index) => (
          <View key={index} style={styles.fineCard}>
            <View style={styles.fineHeader}>
              <View style={styles.fineHeaderLeft}>
                <Ionicons name="warning" size={24} color="#f59e0b" />
                <View>
                  <Text style={styles.fineFolio}>Folio: {fine.folio}</Text>
                  <Text style={styles.fineDate}>{fineService.formatDate(fine.fecha)}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.fineStatusBadge,
                  { backgroundColor: fineService.getStatusBackground(fine.estatus) },
                ]}
              >
                <Text
                  style={[
                    styles.fineStatusText,
                    { color: fineService.getStatusColor(fine.estatus) },
                  ]}
                >
                  {fine.estatus}
                </Text>
              </View>
            </View>

            <Text style={styles.fineInfraction}>{fine.clave}</Text>
            
            <View style={styles.fineDetails}>
              <View style={styles.fineDetailRow}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.fineDetailText}>{fine.lugar}</Text>
              </View>
              <View style={styles.fineDetailRow}>
                <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                <Text style={styles.fineDetailText}>{fine.motivo}</Text>
              </View>
            </View>

            <View style={styles.fineAmount}>
              <Text style={styles.fineAmountLabel}>Monto:</Text>
              <Text style={styles.fineAmountValue}>{fineService.formatMonto(fine.monto)}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#226bfc" />
        <Text style={styles.refreshButtonText}>Actualizar Multas</Text>
      </TouchableOpacity>
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginTop: 16 },
  content: { flex: 1 },
  vehicleHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vehicleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  vehicleDetails: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  plateContainer: { marginTop: 12, alignItems: 'flex-start' },
  plate: {
    backgroundColor: '#1f2937',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  plateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#226bfc' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#226bfc', fontWeight: '600' },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  tabContent: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  driverIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  driverDetail: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  unassignButton: { padding: 8 },
  emptyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  deviceStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deviceStatusText: { fontSize: 13, color: '#6b7280' },
  gpsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gpsInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsLabel: { fontSize: 14, color: '#6b7280' },
  gpsValue: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  gpsStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapPlaceholder: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginTop: 16 },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  assignGPSButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  assignGPSButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoBoxGPS: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  infoBoxGPSText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    gap: 6,
  },
  refreshButtonText: { fontSize: 14, fontWeight: '600', color: '#226bfc' },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  finesStats: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fineStatCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fineStatValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  fineStatLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  finesTotalCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  finesTotalLabel: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  finesTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#92400e' },
  finesList: { gap: 12 },
  fineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fineHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fineFolio: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  fineDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  fineStatusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fineStatusText: { fontSize: 11, fontWeight: '600' },
  fineInfraction: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 12,
  },
  fineDetails: { gap: 6, marginBottom: 12 },
  fineDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fineDetailText: { fontSize: 13, color: '#6b7280', flex: 1 },
  fineAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  fineAmountLabel: { fontSize: 14, color: '#6b7280' },
  fineAmountValue: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
});