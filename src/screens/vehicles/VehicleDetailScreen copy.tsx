import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Switch,
  TextInput,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import MainLayout from '../../layouts/MainLayout';
import vehicleService, { Vehicle } from '../../api/vehicleService';
import fineService, { Fine } from '../../api/fineService';
import reportService, { ExpenseRecord } from '../../api/reportService';
import AssignDeviceModal from '../../components/AssignDeviceModal';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

type TabType = 'TRACKING' | 'INFO' | 'CONFIG' | 'EXPENSES' | 'FINES';
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

export default function VehicleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { vehicleId: number } | undefined;
  const vehicleId = params?.vehicleId;

  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('TRACKING');
  const [showAssignDeviceModal, setShowAssignDeviceModal] = useState(false);
  
  // Sub-data
  const [fines, setFines] = useState<Fine[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const loadData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      if (!refreshing) setLoading(true);
      const v = await vehicleService.getVehicle(vehicleId);
      setVehicle(v);
      if (v.plate) loadExtras(v.plate, v.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId, refreshing]);

  const loadExtras = async (plate: string, id: number) => {
    setLoadingExtras(true);
    try {
      const [finesRes, expensesRes] = await Promise.all([
        fineService.searchByPlate(plate),
        reportService.getFinancialReport('2026-01-01', '2026-12-31', id.toString())
      ]);
      setFines(finesRes || []);
      if (expensesRes?.data) setExpenses(expensesRes.data);
    } catch (e) { console.error(e); } 
    finally { setLoadingExtras(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading && !vehicle) return <MainLayout><View style={styles.center}><ActivityIndicator size="large" color="#2563eb"/></View></MainLayout>;
  if (!vehicle) return null;

  return (
    <MainLayout activeMenu="Lista de Vehículos">
      <View style={styles.container}>
        
        {/* === 1. HERO HEADER "GLASSMORFISM STYLE" === */}
        <View style={styles.heroSection}>
            <View style={styles.heroTopRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
                <View style={[styles.statusPill, vehicle.status === 'EN_RUTA' ? styles.bgSuccess : styles.bgDanger]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{vehicle.status || 'DESCONOCIDO'}</Text>
                </View>
            </View>

            <View style={styles.heroContent}>
                <View style={styles.heroIconBox}>
                    <Ionicons name="car-sport" size={40} color="#2563eb" />
                </View>
                <View>
                    <Text style={styles.heroTitle}>{vehicle.brand} {vehicle.model}</Text>
                    <Text style={styles.heroSubtitle}>{vehicle.year} • {vehicle.color}</Text>
                </View>
                <View style={styles.plateBox}>
                    <Text style={styles.plateText}>{vehicle.plate}</Text>
                </View>
            </View>
        </View>

        {/* === 2. TABS MODERNOS === */}
        <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                <TabButton label="Seguimiento" icon="map" active={activeTab === 'TRACKING'} onPress={() => setActiveTab('TRACKING')} />
                <TabButton label="Info & Chofer" icon="information-circle" active={activeTab === 'INFO'} onPress={() => setActiveTab('INFO')} />
                <TabButton label="Configuración" icon="settings" active={activeTab === 'CONFIG'} onPress={() => setActiveTab('CONFIG')} />
                <TabButton label="Gastos" icon="wallet" active={activeTab === 'EXPENSES'} onPress={() => setActiveTab('EXPENSES')} badge={expenses.length} />
                <TabButton label="Multas" icon="warning" active={activeTab === 'FINES'} onPress={() => setActiveTab('FINES')} badge={fines.length} />
            </ScrollView>
        </View>

        {/* === 3. CONTENIDO === */}
        <ScrollView 
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        >
            {activeTab === 'TRACKING' && <TrackingTab vehicle={vehicle} apiKey={GOOGLE_MAPS_API_KEY} />}
            {activeTab === 'INFO' && <InfoTab vehicle={vehicle} />}
            {activeTab === 'CONFIG' && <ConfigTab vehicle={vehicle} />}
            {activeTab === 'EXPENSES' && <ExpensesTab expenses={expenses} loading={loadingExtras} />}
            {activeTab === 'FINES' && <FinesTab fines={fines} loading={loadingExtras} />}
        </ScrollView>
      </View>
      
      <AssignDeviceModal 
        visible={showAssignDeviceModal} 
        vehicleId={vehicle.id} 
        vehicleName={vehicle.name} 
        onClose={() => setShowAssignDeviceModal(false)} 
        onSuccess={loadData} 
      />
    </MainLayout>
  );
}

// === COMPONENTES TABS ===

const TrackingTab = ({ vehicle, apiKey }: any) => {
    const lat = vehicle.device?.latitude || 19.4326;
    const lng = vehicle.device?.longitude || -99.1332;
    const isOnline = vehicle.device?.is_online;

    return (
        <View style={styles.fadeIn}>
            <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                    <LoadScript googleMapsApiKey={apiKey}>
                        <GoogleMap mapContainerStyle={{width:'100%', height:'100%'}} center={{lat, lng}} zoom={16} options={{disableDefaultUI:true}}>
                            <Marker position={{lat, lng}} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                        </GoogleMap>
                    </LoadScript>
                ) : <Text>Mapa Nativo</Text>}
                
                {/* TARJETA FLOTANTE SOBRE EL MAPA (Estilo Uber) */}
                <View style={styles.mapOverlayCard}>
                    <View style={styles.rowBetween}>
                        <View style={styles.rowGap}>
                            <View style={[styles.signalIndicator, isOnline ? styles.bgSuccess : styles.bgGray]} />
                            <View>
                                <Text style={styles.overlayLabel}>Estado</Text>
                                <Text style={styles.overlayValue}>{isOnline ? 'Conectado' : 'Sin Señal'}</Text>
                            </View>
                        </View>
                        <View style={styles.dividerVertical} />
                        <View>
                            <Text style={styles.overlayLabel}>Velocidad</Text>
                            <Text style={styles.overlayValue}>{vehicle.device?.speed || 0} km/h</Text>
                        </View>
                    </View>
                    <View style={styles.overlayFooter}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.overlayTime}>Último reporte: {vehicle.device?.last_update || 'Hace un momento'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const InfoTab = ({ vehicle }: any) => (
    <View style={styles.fadeIn}>
        <View style={styles.gridContainer}>
            {/* Tarjeta Técnica */}
            <View style={styles.cardLarge}>
                <Text style={styles.cardTitle}>Ficha Técnica</Text>
                <View style={styles.gridRow}>
                    <InfoBox label="Odómetro" value={`${vehicle.odometer || 0} km`} icon="speedometer" color="#3b82f6" />
                    <InfoBox label="Combustible" value={`${vehicle.fuel_level || 0}%`} icon="water" color="#ef4444" />
                    <InfoBox label="Motor" value={vehicle.engine_hours || '0h'} icon="cog" color="#64748b" />
                    <InfoBox label="VIN" value={vehicle.vin || '---'} icon="barcode" color="#8b5cf6" />
                </View>
            </View>

            {/* Tarjeta Conductor */}
            <View style={styles.cardLarge}>
                <Text style={styles.cardTitle}>Conductor Asignado</Text>
                {vehicle.driver ? (
                    <View style={styles.driverCard}>
                        <View style={styles.driverAvatar}>
                            <Text style={styles.driverInitials}>{vehicle.driver.account?.name.charAt(0)}</Text>
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.driverName}>{vehicle.driver.account?.name}</Text>
                            <Text style={styles.driverDetail}>{vehicle.driver.phone || 'Sin teléfono'}</Text>
                            <Text style={styles.driverDetail}>{vehicle.driver.license_number || 'Licencia: ---'}</Text>
                        </View>
                        <TouchableOpacity style={styles.btnIcon}>
                            <Ionicons name="call" size={20} color="#2563eb" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyStateSimple}>
                        <Ionicons name="person-add-outline" size={24} color="#94a3b8" />
                        <Text style={styles.emptyText}>Sin conductor</Text>
                    </View>
                )}
            </View>
        </View>
    </View>
);

const ConfigTab = ({ vehicle }: any) => (
    <View style={styles.fadeIn}>
        <View style={styles.cardLarge}>
            <Text style={styles.cardTitle}>Dispositivo GPS</Text>
            {vehicle.device ? (
                <View>
                    <View style={styles.deviceInfoRow}>
                        <Ionicons name="hardware-chip-outline" size={24} color="#475569" />
                        <View>
                            <Text style={styles.deviceTextBold}>{vehicle.device.model || 'Tracker Genérico'}</Text>
                            <Text style={styles.deviceTextSub}>IMEI: {vehicle.device.imei}</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    <Text style={styles.sectionSubTitle}>Comandos Remotos</Text>
                    <View style={styles.commandRow}>
                        <View style={{flex:1}}>
                            <Text style={styles.cmdTitle}>Corte de Motor</Text>
                            <Text style={styles.cmdDesc}>Apaga el vehículo en caso de emergencia.</Text>
                        </View>
                        <Switch trackColor={{false:"#e2e8f0", true:"#fee2e2"}} thumbColor={true ? "#ef4444" : "#fff"} value={false} />
                    </View>
                </View>
            ) : (
                <Text style={styles.emptyText}>No hay dispositivo vinculado.</Text>
            )}
        </View>
    </View>
);

const ExpensesTab = ({ expenses, loading }: any) => {
    if(loading) return <ActivityIndicator color="#2563eb"/>;
    return (
        <View style={styles.fadeIn}>
            <View style={[styles.cardLarge, {padding:0}]}>
                <View style={styles.cardHeaderAction}>
                    <Text style={styles.cardTitle}>Historial de Gastos</Text>
                    <TouchableOpacity style={styles.btnSmall}><Text style={styles.btnSmallText}>+ Nuevo</Text></TouchableOpacity>
                </View>
                {expenses.length === 0 ? <EmptyState text="No hay gastos registrados." /> : 
                    expenses.map((ex:any, i:number) => (
                        <View key={i} style={styles.listItem}>
                            <View style={[styles.listIcon, {backgroundColor:'#eff6ff'}]}><Ionicons name="wallet" size={18} color="#2563eb"/></View>
                            <View style={{flex:1}}>
                                <Text style={styles.listTitle}>{ex.type}</Text>
                                <Text style={styles.listSub}>{ex.date} • {ex.description}</Text>
                            </View>
                            <Text style={styles.listAmount}>${ex.amount}</Text>
                        </View>
                    ))
                }
            </View>
        </View>
    );
};

const FinesTab = ({ fines, loading }: any) => {
    if(loading) return <ActivityIndicator color="#2563eb"/>;
    return (
        <View style={styles.fadeIn}>
            <View style={styles.cardLarge}>
                <View style={styles.cardHeaderAction}>
                   <Text style={styles.cardTitle}>Multas e Infracciones</Text>
                   <View style={styles.badgeCount}><Text style={styles.badgeTextWhite}>{fines.length}</Text></View>
                </View>
                {fines.length === 0 ? <EmptyState text="¡Limpio! Sin multas encontradas." /> :
                    fines.map((fine:any, i:number) => (
                        <View key={i} style={styles.fineCard}>
                            <View style={[styles.fineStatusStrip, {backgroundColor: fine.estatus === 'PAGADA' ? '#10b981' : '#ef4444'}]} />
                            <View style={{padding:12, flex:1}}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.fineRef}>Folio: {fine.folio}</Text>
                                    <Text style={[styles.fineStatusText, {color: fine.estatus === 'PAGADA' ? '#10b981' : '#ef4444'}]}>{fine.estatus}</Text>
                                </View>
                                <Text style={styles.fineReason}>{fine.motivo}</Text>
                                <Text style={styles.fineAmount}>${fine.monto}</Text>
                            </View>
                        </View>
                    ))
                }
            </View>
        </View>
    );
};

// === COMPONENTES UI ===

const TabButton = ({ label, icon, active, onPress, badge }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.tabItem, active && styles.tabItemActive]}>
        <Ionicons name={icon} size={18} color={active ? '#2563eb' : '#64748b'} />
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        {badge > 0 && <View style={styles.badgeSmall}><Text style={styles.badgeTextSmall}>{badge}</Text></View>}
    </TouchableOpacity>
);

const InfoBox = ({label, value, icon, color}:any) => (
    <View style={styles.infoBox}>
        <View style={[styles.infoIconCircle, {backgroundColor: color + '20'}]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.infoBoxValue}>{value}</Text>
        <Text style={styles.infoBoxLabel}>{label}</Text>
    </View>
);

const EmptyState = ({text}:any) => (
    <View style={{padding:30, alignItems:'center'}}>
        <Ionicons name="folder-open-outline" size={40} color="#cbd5e1"/>
        <Text style={{color:'#94a3b8', marginTop:10}}>{text}</Text>
    </View>
);

// === ESTILOS MODERNOS ===

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fadeIn: { flex:1 },

  // Hero Section (Fondo Azul Oscuro)
  heroSection: { backgroundColor: '#1e293b', padding: 24, paddingBottom: 32 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: '#cbd5e1', fontWeight: '600' },
  statusPill: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  bgSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  bgDanger: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusDot: { width:8, height:8, borderRadius:4, backgroundColor:'#fff' },
  statusText: { color:'#fff', fontWeight:'bold', fontSize:12 },

  heroContent: { flexDirection:'row', alignItems:'center', gap:16 },
  heroIconBox: { width:64, height:64, borderRadius:16, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOpacity:0.2, elevation:5 },
  heroTitle: { fontSize:22, fontWeight:'800', color:'#fff' },
  heroSubtitle: { color:'#94a3b8', fontSize:14 },
  plateBox: { marginLeft:'auto', backgroundColor:'#0f172a', paddingHorizontal:16, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:'#334155' },
  plateText: { color:'#fff', fontWeight:'bold', letterSpacing:1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Tabs Modernos
  tabContainer: { marginTop: -20, paddingHorizontal: 20, marginBottom: 16 },
  tabScroll: { gap: 10, paddingRight:20 },
  tabItem: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', paddingHorizontal:20, paddingVertical:14, borderRadius:12, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4, elevation:2 },
  tabItemActive: { backgroundColor:'#eff6ff', borderWidth:1, borderColor:'#bfdbfe' },
  tabLabel: { color:'#64748b', fontWeight:'600' },
  tabLabelActive: { color:'#2563eb' },
  badgeSmall: { backgroundColor:'#ef4444', borderRadius:10, paddingHorizontal:6, height:18, justifyContent:'center' },
  badgeTextSmall: { color:'#fff', fontSize:10, fontWeight:'bold' },

  // Contenido
  contentContainer: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // Mapa & Overlays
  mapWrapper: { height: 400, borderRadius: 20, overflow: 'hidden', backgroundColor:'#cbd5e1', position:'relative', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:10, elevation:5 },
  mapOverlayCard: { position:'absolute', bottom:20, left:20, right:20, backgroundColor:'rgba(255,255,255,0.95)', borderRadius:16, padding:16, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8, backdropFilter: 'blur(10px)' },
  rowBetween: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  rowGap: { flexDirection:'row', gap:10, alignItems:'center' },
  signalIndicator: { width:12, height:12, borderRadius:6 },
  bgGray: { backgroundColor: '#94a3b8' },
  dividerVertical: { width:1, height:30, backgroundColor:'#e2e8f0' },
  overlayLabel: { fontSize:11, color:'#64748b', textTransform:'uppercase', fontWeight:'bold' },
  overlayValue: { fontSize:18, color:'#0f172a', fontWeight:'800' },
  overlayFooter: { flexDirection:'row', gap:6, marginTop:10, paddingTop:10, borderTopWidth:1, borderColor:'#f1f5f9', alignItems:'center' },
  overlayTime: { color:'#64748b', fontSize:12 },

  // Cards y Grids
  cardLarge: { backgroundColor:'#fff', borderRadius:16, padding:20, shadowColor:'#000', shadowOpacity:0.03, elevation:2 },
  cardTitle: { fontSize:16, fontWeight:'700', color:'#1e293b', marginBottom:16 },
  gridContainer: { gap:16 },
  gridRow: { flexDirection:'row', flexWrap:'wrap', gap:16 },
  
  // Info Boxes
  infoBox: { flex:1, minWidth: '40%', backgroundColor:'#f8fafc', padding:16, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#f1f5f9' },
  infoIconCircle: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', marginBottom:8 },
  infoBoxValue: { fontSize:16, fontWeight:'bold', color:'#0f172a' },
  infoBoxLabel: { fontSize:12, color:'#64748b' },

  // Driver Card
  driverCard: { flexDirection:'row', alignItems:'center', gap:16, backgroundColor:'#f8fafc', padding:16, borderRadius:12, borderWidth:1, borderColor:'#f1f5f9' },
  driverAvatar: { width:50, height:50, borderRadius:25, backgroundColor:'#dbeafe', alignItems:'center', justifyContent:'center' },
  driverInitials: { fontSize:20, fontWeight:'bold', color:'#1e40af' },
  driverName: { fontSize:16, fontWeight:'700', color:'#1e293b' },
  driverDetail: { color:'#64748b', fontSize:13 },
  btnIcon: { padding:10, backgroundColor:'#fff', borderRadius:10, shadowColor:'#000', shadowOpacity:0.05 },
  emptyStateSimple: { alignItems:'center', padding:20, gap:8 },
  emptyText: { color:'#94a3b8' },

  // List Items (Gastos)
  cardHeaderAction: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, paddingBottom:10 },
  btnSmall: { backgroundColor:'#eff6ff', paddingHorizontal:12, paddingVertical:6, borderRadius:6 },
  btnSmallText: { color:'#2563eb', fontWeight:'600', fontSize:12 },
  listItem: { flexDirection:'row', alignItems:'center', gap:12, padding:16, borderBottomWidth:1, borderColor:'#f1f5f9' },
  listIcon: { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  listTitle: { fontWeight:'600', color:'#1e293b' },
  listSub: { fontSize:12, color:'#64748b' },
  listAmount: { fontWeight:'bold', color:'#0f172a' },

  // Multas
  badgeCount: { backgroundColor:'#ef4444', borderRadius:10, paddingHorizontal:8, paddingVertical:2 },
  badgeTextWhite: { color:'#fff', fontSize:12, fontWeight:'bold' },
  fineCard: { flexDirection:'row', backgroundColor:'#fff', borderRadius:8, overflow:'hidden', marginBottom:12, borderWidth:1, borderColor:'#f1f5f9', marginTop:10 },
  fineStatusStrip: { width:5 },
  fineRef: { fontSize:12, fontWeight:'bold', color:'#94a3b8' },
  fineStatusText: { fontSize:11, fontWeight:'bold' },
  fineReason: { fontSize:14, fontWeight:'600', color:'#1e293b', marginVertical:4 },
  fineAmount: { fontSize:16, fontWeight:'800', color:'#0f172a' },

  // Config
  deviceInfoRow: { flexDirection:'row', gap:16, alignItems:'center', marginBottom:20 },
  deviceTextBold: { fontSize:16, fontWeight:'bold', color:'#1e293b' },
  deviceTextSub: { color:'#64748b', fontFamily:'monospace' },
  sectionSubTitle: { fontSize:13, fontWeight:'700', color:'#64748b', textTransform:'uppercase', marginBottom:12 },
  commandRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, backgroundColor:'#fef2f2', borderRadius:12, borderWidth:1, borderColor:'#fee2e2' },
  cmdTitle: { fontSize:15, fontWeight:'700', color:'#991b1b' },
  cmdDesc: { fontSize:12, color:'#b91c1c' },
  separator: { height:1, backgroundColor:'#f1f5f9', marginVertical:20 }
});