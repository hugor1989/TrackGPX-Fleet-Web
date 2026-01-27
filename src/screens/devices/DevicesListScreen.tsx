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
  useWindowDimensions,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import deviceService, { Device } from '../../api/deviceService';

export default function DevicesListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar datos
  const loadDevices = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await deviceService.getAllDevices();
      setDevices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  // Filtrado
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const lowerQuery = searchQuery.toLowerCase();
    return devices.filter(d => 
      d.imei.includes(lowerQuery) ||
      d.model?.toLowerCase().includes(lowerQuery) ||
      d.vehicle?.plate.toLowerCase().includes(lowerQuery)
    );
  }, [devices, searchQuery]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === 'active').length; // Ajusta según tus status reales
    const unassigned = devices.filter(d => !d.vehicle).length;
    return { total, online, unassigned };
  }, [devices]);

  return (
    <MainLayout activeMenu="Config-Dispositivos">
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Dispositivos GPS</Text>
            <Text style={styles.pageSubtitle}>Inventario y estado de conexión</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('ActivateDevice' as never)} // Asumiendo que crearás esta pantalla
          >
            <Ionicons name="scan" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Activar Nuevo</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <StatCard 
            label="Total GPS" 
            value={stats.total} 
            icon="hardware-chip" 
            color="#226bfc" 
            bg="#eff6ff" 
          />
          <StatCard 
            label="Activos" 
            value={stats.online} 
            icon="wifi" 
            color="#10b981" 
            bg="#ecfdf5" 
          />
          <StatCard 
            label="Sin Asignar" 
            value={stats.unassigned} 
            icon="cube" 
            color="#f59e0b" 
            bg="#fffbeb" 
          />
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por IMEI, Modelo o Placa..."
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
            {filteredDevices.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="hardware-chip-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No se encontraron dispositivos</Text>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {filteredDevices.map((device) => (
                  <DeviceCard 
                    key={device.id} 
                    device={device} 
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

const DeviceCard = ({ device, isDesktop }: { device: Device, isDesktop: boolean }) => {
  const isAssigned = !!device.vehicle;
  const isActive = device.status === 'active'; // Ajustar según backend ('active', 'online', etc)

  return (
    <View style={[styles.card, isDesktop && styles.cardDesktop]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, isActive ? styles.iconBoxActive : styles.iconBoxInactive]}>
          <Ionicons name="hardware-chip" size={24} color={isActive ? "#10b981" : "#6b7280"} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.imeiText}>IMEI: {device.imei}</Text>
          <Text style={styles.modelText}>
            {device.manufacturer} {device.model || 'Genérico'}
          </Text>
        </View>

        <View style={[styles.statusBadge, isActive ? styles.bgSuccess : styles.bgGray]}>
          <Text style={[styles.statusText, isActive ? styles.textSuccess : styles.textGray]}>
            {isActive ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="qr-code-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>S/N: {device.serial_number || 'N/A'}</Text>
        </View>
        
        {/* Vehículo Asignado */}
        {isAssigned ? (
          <View style={styles.assignedBox}>
            <Ionicons name="car-sport" size={16} color="#226bfc" />
            <Text style={styles.assignedText}>
              <Text style={{fontWeight: 'bold'}}>{device.vehicle?.name}</Text> • {device.vehicle?.plate}
            </Text>
          </View>
        ) : (
          <View style={styles.unassignedBox}>
            <Text style={styles.unassignedText}>Disponible para asignar</Text>
          </View>
        )}
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

  // List
  listContent: { padding: 20, paddingTop: 0, paddingBottom: 80 },
  list: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  cardDesktop: { width: '32%' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: '#ecfdf5' },
  iconBoxInactive: { backgroundColor: '#f3f4f6' },

  imeiText: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  modelText: { fontSize: 13, color: '#6b7280' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  bgSuccess: { backgroundColor: '#dcfce7' },
  textSuccess: { color: '#166534' },
  bgGray: { backgroundColor: '#f3f4f6' },
  textGray: { color: '#4b5563' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  detailsContainer: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#6b7280' },

  assignedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', padding: 8, borderRadius: 8,
  },
  assignedText: { fontSize: 13, color: '#1e40af' },

  unassignedBox: {
    padding: 8, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center'
  },
  unassignedText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginTop: 10 },
});