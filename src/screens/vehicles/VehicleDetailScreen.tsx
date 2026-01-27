import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout'; // ✅ Integración con Layout
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showAssignDeviceModal, setShowAssignDeviceModal] = useState(false);

  // Estado Multas
  const [fines, setFines] = useState<Fine[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  const loadData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      if (!refreshing) setLoading(true);
      const vehicleData = await vehicleService.getVehicle(vehicleId);
      setVehicle(vehicleData);

      if (vehicleData.plate) {
        // Cargar multas en segundo plano para no bloquear la UI principal
        loadFines(vehicleData.plate);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId, refreshing]);

  const loadFines = async (plate: string) => {
    try {
      setLoadingFines(true);
      const finesData = await fineService.searchByPlate(plate);
      setFines(finesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFines(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // --- ACCIONES ---
  const handleUnassign = async (type: 'driver' | 'device') => {
    if (!vehicle) return;
    const title = type === 'driver' ? 'Desasignar Conductor' : 'Desvincular GPS';
    const msg = type === 'driver' 
      ? '¿Confirmas quitar al conductor de este vehículo?' 
      : '¿Confirmas desvincular el dispositivo GPS?';

    Alert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'driver') await vehicleService.unassignDriver(vehicle.id);
            else await vehicleService.unassignDevice(vehicle.id);
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading && !vehicle) {
    return (
      <MainLayout>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#226bfc" />
        </View>
      </MainLayout>
    );
  }

  if (!vehicle) return null;

  return (
    <MainLayout activeMenu="Config-Vehiculos">
      <View style={styles.container}>
        
        {/* HEADER DE NAVEGACIÓN */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('VehicleForm' as never, { mode: 'edit', vehicleId: vehicle.id } as never)}
          >
            <Ionicons name="pencil" size={16} color="#226bfc" />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* TARJETA PRINCIPAL DEL VEHÍCULO */}
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="car-sport" size={32} color="#226bfc" />
              </View>
              <View>
                <Text style={styles.heroTitle}>{vehicle.name}</Text>
                <Text style={styles.heroSubtitle}>{vehicle.brand} {vehicle.model} {vehicle.year}</Text>
              </View>
            </View>
            
            <View style={styles.heroRight}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>{vehicle.plate}</Text>
              </View>
              <StatusBadge status={vehicle.status} />
            </View>
          </View>

          {/* TABS (Segmented Control) */}
          <View style={styles.tabContainer}>
            <TabButton 
              label="Información" 
              icon="information-circle" 
              active={activeTab === 'info'} 
              onPress={() => setActiveTab('info')} 
            />
            <TabButton 
              label="Rastreo GPS" 
              icon="location" 
              active={activeTab === 'gps'} 
              onPress={() => setActiveTab('gps')} 
            />
            <TabButton 
              label="Multas" 
              icon="warning" 
              active={activeTab === 'fines'} 
              onPress={() => setActiveTab('fines')} 
              badge={fines.length > 0 ? fines.length : undefined}
            />
          </View>

          {/* CONTENIDO DE TABS */}
          <View style={styles.tabContent}>
            {activeTab === 'info' && (
              <InfoTabContent 
                vehicle={vehicle} 
                onUnassignDriver={() => handleUnassign('driver')} 
              />
            )}
            {activeTab === 'gps' && (
              <GpsTabContent 
                vehicle={vehicle} 
                onAssign={() => setShowAssignDeviceModal(true)}
                onUnassign={() => handleUnassign('device')}
              />
            )}
            {activeTab === 'fines' && (
              <FinesTabContent 
                fines={fines} 
                loading={loadingFines} 
                onRefresh={() => loadFines(vehicle.plate)} 
              />
            )}
          </View>
        </ScrollView>

        {/* MODAL */}
        <AssignDeviceModal
          visible={showAssignDeviceModal}
          vehicleId={vehicle.id}
          vehicleName={vehicle.name}
          onClose={() => setShowAssignDeviceModal(false)}
          onSuccess={() => {
            setShowAssignDeviceModal(false);
            handleRefresh();
          }}
        />
      </View>
    </MainLayout>
  );
}

// --- COMPONENTES INTERNOS ---

const InfoTabContent = ({ vehicle, onUnassignDriver }: any) => (
  <View style={styles.grid}>
    {/* Datos Técnicos */}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Datos Técnicos</Text>
      <View style={styles.infoRow}>
        <InfoItem label="Tipo" value={vehicleService.getTypeLabel(vehicle.type)} icon="options-outline" />
        <InfoItem label="Odómetro" value={`${vehicle.odometer?.toLocaleString() || 0} km`} icon="speedometer-outline" />
      </View>
      <View style={styles.separator} />
      <View style={styles.infoRow}>
        <InfoItem label="VIN / Serie" value={vehicle.vin || 'No registrado'} icon="barcode-outline" />
        <InfoItem label="Año" value={vehicle.year?.toString()} icon="calendar-outline" />
      </View>
    </View>

    {/* Tarjeta de Conductor */}
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Conductor Asignado</Text>
        {vehicle.driver && (
          <TouchableOpacity onPress={onUnassignDriver}>
            <Text style={styles.actionLinkDanger}>Desasignar</Text>
          </TouchableOpacity>
        )}
      </View>

      {vehicle.driver && vehicle.driver.account ? (
        <View style={styles.driverProfile}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>
              {vehicle.driver.account.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{vehicle.driver.account.name}</Text>
            <Text style={styles.driverEmail}>{vehicle.driver.account.email}</Text>
            {vehicle.driver.phone && (
              <View style={styles.driverMeta}>
                <Ionicons name="call-outline" size={14} color="#6b7280" />
                <Text style={styles.driverMetaText}>{vehicle.driver.phone}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={32} color="#d1d5db" />
          <Text style={styles.emptyText}>Sin conductor asignado</Text>
        </View>
      )}
    </View>
  </View>
);

const GpsTabContent = ({ vehicle, onAssign, onUnassign }: any) => {
  const hasDevice = !!vehicle.device;
  const isOnline = vehicle.device?.is_online;

  return (
    <View style={styles.grid}>
      {/* Estado GPS */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Dispositivo GPS</Text>
          {hasDevice ? (
            <TouchableOpacity onPress={onUnassign}>
              <Text style={styles.actionLinkDanger}>Desvincular</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onAssign}>
              <Text style={styles.actionLink}>Vincular</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasDevice ? (
          <View style={styles.gpsStatusContainer}>
            <View style={[styles.gpsIndicatorBig, isOnline ? styles.bgSuccess : styles.bgGray]}>
              <Ionicons name={isOnline ? "wifi" : "wifi-outline"} size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.gpsStatusTitle}>
                {isOnline ? 'Conectado y Transmitiendo' : 'Sin Señal / Desconectado'}
              </Text>
              <Text style={styles.gpsIMEI}>IMEI: {vehicle.device.imei}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={32} color="#d1d5db" />
            <Text style={styles.emptyText}>No hay dispositivo vinculado</Text>
          </View>
        )}
      </View>

      {/* Mapa Preview */}
      {hasDevice && (
        <View style={[styles.card, { padding: 0, overflow: 'hidden', height: 250 }]}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color="#9ca3af" />
            <Text style={styles.mapText}>Ubicación en tiempo real</Text>
            <TouchableOpacity style={styles.mapBtn}>
              <Text style={styles.mapBtnText}>Ver en Mapa Completo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const FinesTabContent = ({ fines, loading, onRefresh }: any) => {
  if (loading) return <ActivityIndicator size="small" color="#226bfc" style={{ marginTop: 20 }} />;

  if (fines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#10b981" />
        </View>
        <Text style={styles.emptyTitle}>¡Todo en orden!</Text>
        <Text style={styles.emptySubtitle}>No se encontraron multas para esta placa.</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshBtnText}>Verificar nuevamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.finesHeader}>
        <Text style={styles.finesCount}>{fines.length} Infracciones encontradas</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#226bfc" />
        </TouchableOpacity>
      </View>
      
      {fines.map((fine: Fine, index: number) => (
        <View key={index} style={styles.fineTicket}>
          {/* Borde izquierdo de color según estado */}
          <View style={[styles.fineStrip, { backgroundColor: fine.estatus === 'PAGADA' ? '#10b981' : '#ef4444' }]} />
          
          <View style={styles.fineContent}>
            <View style={styles.fineTop}>
              <Text style={styles.fineFolio}>Folio: {fine.folio}</Text>
              <View style={[styles.fineBadge, fine.estatus === 'PAGADA' ? styles.bgSuccessLight : styles.bgDangerLight]}>
                <Text style={[styles.fineBadgeText, fine.estatus === 'PAGADA' ? styles.textSuccess : styles.textDanger]}>
                  {fine.estatus}
                </Text>
              </View>
            </View>
            
            <Text style={styles.fineReason}>{fine.motivo}</Text>
            
            <View style={styles.fineDetails}>
              <View style={styles.fineDetailItem}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                <Text style={styles.fineDetailText}>{fineService.formatDate(fine.fecha)}</Text>
              </View>
              <Text style={styles.fineAmount}>{fineService.formatMonto(fine.monto)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// --- HELPERS UI ---

const TabButton = ({ label, icon, active, onPress, badge }: any) => (
  <TouchableOpacity 
    style={[styles.tabBtn, active && styles.tabBtnActive]} 
    onPress={onPress}
  >
    <Ionicons name={icon} size={18} color={active ? '#226bfc' : '#6b7280'} />
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    {badge && (
      <View style={styles.tabBadge}>
        <Text style={styles.tabBadgeText}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const InfoItem = ({ label, value, icon }: any) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIconBox}>
      <Ionicons name={icon} size={18} color="#9ca3af" />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config = vehicleService.getStatusConfig(status); // Asumiendo que tienes este helper, si no, usa el switch
  return (
    <View style={[styles.statusBadge, { backgroundColor: config?.bg || '#f3f4f6' }]}>
      <Text style={[styles.statusText, { color: config?.color || '#374151' }]}>
        {vehicleService.getStatusLabel(status)}
      </Text>
    </View>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  // Navigation Header
  navHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editBtnText: { fontSize: 13, color: '#226bfc', fontWeight: '600' },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 12, marginBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    flexWrap: 'wrap', gap: 16
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  heroSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  plateBadge: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  plateText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Tabs
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginBottom: 20
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6
  },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#226bfc' },
  tabBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabContent: { flex: 1 },

  // Cards & Grid
  grid: { gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  actionLink: { fontSize: 13, color: '#226bfc', fontWeight: '600' },
  actionLinkDanger: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  
  infoRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  infoItem: { flex: 1, flexDirection: 'row', gap: 10, minWidth: 140, marginBottom: 12 },
  infoIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  // Driver Profile
  driverProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
  driverName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  driverEmail: { fontSize: 13, color: '#6b7280' },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  driverMetaText: { fontSize: 12, color: '#6b7280' },

  // GPS Styles
  gpsStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gpsIndicatorBig: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bgSuccess: { backgroundColor: '#10b981' },
  bgGray: { backgroundColor: '#9ca3af' },
  gpsStatusTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  gpsIMEI: { fontSize: 13, color: '#6b7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  mapPlaceholder: { height: '100%', backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', gap: 12 },
  mapText: { color: '#6b7280', fontSize: 14 },
  mapBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db' },
  mapBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  // Fines
  finesHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  finesCount: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  fineTicket: {
    backgroundColor: '#fff', marginBottom: 12, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    flexDirection: 'row', overflow: 'hidden'
  },
  fineStrip: { width: 6 },
  fineContent: { flex: 1, padding: 12 },
  fineTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fineFolio: { fontSize: 12, color: '#9ca3af', fontWeight: 'bold' },
  fineBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fineBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  bgSuccessLight: { backgroundColor: '#dcfce7' },
  bgDangerLight: { backgroundColor: '#fee2e2' },
  textSuccess: { color: '#166534' },
  textDanger: { color: '#991b1b' },
  fineReason: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  fineDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fineDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fineDetailText: { fontSize: 12, color: '#6b7280' },
  fineAmount: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },

  // Empty States
  emptyState: { alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  refreshBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 8 },
  refreshBtnText: { color: '#226bfc', fontWeight: '600' },
});
