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
  Dimensions,
  Linking
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
const isDesktop = width > 1024; 

// ⚠️ REEMPLAZA CON TU API KEY REAL
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

type TabType = 'DASHBOARD' | 'FINANCE' | 'CONFIG';

export default function VehicleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { vehicleId: number } | undefined;
  const vehicleId = params?.vehicleId;

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  
  // Data Auxiliar
  const [fines, setFines] = useState<Fine[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // --- CARGA DE DATOS ---
  const loadData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      if (!refreshing) setLoading(true);
      const v = await vehicleService.getVehicle(vehicleId);
      setVehicle(v);
      if (v.plate) loadExtras(v.plate, v.id);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cargar el vehículo');
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
        // Ajusta las fechas según tu necesidad (ej. año actual)
        reportService.getFinancialReport('2026-01-01', '2026-12-31', id.toString())
      ]);
      setFines(finesRes || []);
      if (expensesRes?.data) setExpenses(expensesRes.data);
    } catch (e) { console.error(e); } 
    finally { setLoadingExtras(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // --- ACCIONES RÁPIDAS ---
  const handleCallDriver = () => {
    if(vehicle?.driver?.phone) Linking.openURL(`tel:${vehicle.driver.phone}`);
    else Alert.alert("Sin teléfono", "El conductor no tiene número registrado.");
  };

  const handleShareLocation = () => {
    Alert.alert("Compartir", `Enlace de seguimiento generado para ${vehicle?.plate}`);
  };

  if (loading && !vehicle) return <MainLayout><View style={styles.center}><ActivityIndicator size="large" color="#2563eb"/></View></MainLayout>;
  if (!vehicle) return null;

  return (
    <MainLayout activeMenu="Lista de Vehículos">
      <View style={styles.container}>
        
        {/* === 1. HEADER PREMIUM === */}
        <View style={styles.headerCard}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#64748b" />
                    <Text style={styles.backText}>Volver a la flota</Text>
                </TouchableOpacity>
                <View style={[styles.statusBadge, vehicle.status === 'EN_RUTA' ? styles.bgSuccess : styles.bgDanger]}>
                    <View style={[styles.statusDot, vehicle.status === 'EN_RUTA' ? styles.dotSuccess : styles.dotDanger]} />
                    <Text style={[styles.statusText, vehicle.status === 'EN_RUTA' ? styles.textSuccess : styles.textDanger]}>
                        {vehicle.status || 'DESCONOCIDO'}
                    </Text>
                </View>
            </View>

            <View style={styles.headerMain}>
                <View style={styles.headerLeft}>
                    <View style={styles.carAvatar}>
                        <Ionicons name="car-sport" size={36} color="#2563eb" />
                    </View>
                    <View>
                        <Text style={styles.carTitle}>{vehicle.name || `${vehicle.brand} ${vehicle.model}`}</Text>
                        <Text style={styles.carSub}>{vehicle.brand} {vehicle.model} {vehicle.year} • {vehicle.plate}</Text>
                    </View>
                </View>
                
                {/* Botones de Acción Rápida */}
                <View style={styles.actionRow}>
                    <ActionButton icon="call" label="Llamar" onPress={handleCallDriver} color="#2563eb" bg="#eff6ff" />
                    <ActionButton icon="share-social" label="Compartir" onPress={handleShareLocation} color="#0f172a" bg="#f1f5f9" />
                    <ActionButton icon="pencil" label="Editar" onPress={() => navigation.navigate('VehicleForm' as never, { mode: 'edit', vehicleId: vehicle.id } as never)} color="#64748b" bg="#fff" border />
                </View>
            </View>
        </View>

        {/* === 2. TABS NAVIGATOR === */}
        <View style={styles.tabBar}>
            <TabItem title="Resumen Operativo" active={activeTab === 'DASHBOARD'} onPress={() => setActiveTab('DASHBOARD')} icon="grid" />
            <TabItem title="Finanzas & Costos" active={activeTab === 'FINANCE'} onPress={() => setActiveTab('FINANCE')} icon="wallet" badge={expenses.length + fines.length} />
            <TabItem title="Configuración GPS" active={activeTab === 'CONFIG'} onPress={() => setActiveTab('CONFIG')} icon="settings" />
        </View>

        {/* === 3. CONTENIDO DINÁMICO === */}
        <ScrollView 
            contentContainerStyle={styles.contentArea}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
            showsVerticalScrollIndicator={false}
        >
            {activeTab === 'DASHBOARD' && <DashboardView vehicle={vehicle} apiKey={GOOGLE_MAPS_API_KEY} />}
            {activeTab === 'FINANCE' && <FinanceView vehicle={vehicle} expenses={expenses} fines={fines} loading={loadingExtras} />}
            {activeTab === 'CONFIG' && <ConfigView vehicle={vehicle} onAssign={() => setShowAssignModal(true)} />}
        </ScrollView>

        <AssignDeviceModal 
            visible={showAssignModal} 
            vehicleId={vehicle.id} 
            vehicleName={vehicle.name} 
            onClose={() => setShowAssignModal(false)} 
            onSuccess={loadData} 
        />
      </View>
    </MainLayout>
  );
}

// ==========================================
// VISTAS (VIEWS)
// ==========================================

const DashboardView = ({ vehicle, apiKey }: any) => {
    // Si no tiene coordenadas, usa CDMX por defecto
    const lat = vehicle.device?.latitude || 19.4326;
    const lng = vehicle.device?.longitude || -99.1332;

    return (
        <View style={styles.fadeIn}>
            <View style={styles.dashboardGrid}>
                
                {/* COLUMNA IZQUIERDA: MAPA */}
                <View style={styles.mapCard}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.cardTitle}>Ubicación en Tiempo Real</Text>
                        <View style={styles.liveBadge}><View style={styles.pulsingDot}/><Text style={styles.liveText}>EN VIVO</Text></View>
                    </View>
                    <View style={styles.mapContainer}>
                        {Platform.OS === 'web' ? (
                            <LoadScript googleMapsApiKey={apiKey}>
                                <GoogleMap mapContainerStyle={{width:'100%', height:'100%'}} center={{lat, lng}} zoom={15} options={{disableDefaultUI:true}}>
                                    <Marker position={{lat, lng}} />
                                </GoogleMap>
                            </LoadScript>
                        ) : <Text>Mapa Nativo</Text>}
                        {/* Overlay Stats */}
                        <View style={styles.mapOverlay}>
                            <View>
                                <Text style={styles.overlayLabel}>Velocidad</Text>
                                <Text style={styles.overlayValue}>{vehicle.device?.speed || 0} km/h</Text>
                            </View>
                            <View style={styles.dividerV} />
                            <View>
                                <Text style={styles.overlayLabel}>Último Reporte</Text>
                                <Text style={styles.overlayValueSmall}>{vehicle.device?.last_update || 'Hace un momento'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* COLUMNA DERECHA: KPI & CHOFER */}
                <View style={styles.rightCol}>
                    {/* Tarjeta Chofer */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Conductor</Text>
                            <TouchableOpacity><Text style={styles.linkText}>Detalles</Text></TouchableOpacity>
                        </View>
                        {vehicle.driver ? (
                            <View style={styles.driverRow}>
                                <View style={styles.avatar}><Text style={styles.avatarText}>{vehicle.driver.account?.name.charAt(0)}</Text></View>
                                <View>
                                    <Text style={styles.driverName}>{vehicle.driver.account?.name}</Text>
                                    <Text style={styles.driverSub}>Licencia: {vehicle.driver.license_number || '---'}</Text>
                                </View>
                                <TouchableOpacity style={styles.callIconBtn} onPress={() => vehicle.driver.phone && Linking.openURL(`tel:${vehicle.driver.phone}`)}>
                                    <Ionicons name="call" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.emptyBox}><Text style={styles.emptyText}>Sin conductor asignado</Text></View>
                        )}
                    </View>

                    {/* KPIs Rápidos */}
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="speedometer" label="Odómetro" value={`${vehicle.odometer || 0} km`} color="#3b82f6" bg="#eff6ff" />
                        <KpiCard icon="water" label="Combustible" value={`${vehicle.fuel_level || 0}%`} color="#10b981" bg="#d1fae5" />
                        <KpiCard icon="battery-charging" label="Voltaje" value="12.4 V" color="#f59e0b" bg="#fef3c7" />
                        <KpiCard icon="hardware-chip" label="Satélites" value="8" color="#6366f1" bg="#e0e7ff" />
                    </View>
                </View>
            </View>
        </View>
    );
};

// --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE PARA EL $NaN ---
const FinanceView = ({ expenses, fines, loading }: any) => {
    if(loading) return <ActivityIndicator color="#2563eb" />;
    
    // --- FUNCIÓN HELPER PARA LIMPIAR DINERO ---
    const parseMoney = (value: any) => {
        if (!value) return 0;
        // Convierte a string, quita '$' y ',', deja solo números y punto
        const clean = String(value).replace(/[^0-9.]/g, ''); 
        const number = parseFloat(clean);
        return isNaN(number) ? 0 : number;
    };

    // 1. Sumar Gastos
    const totalExp = expenses.reduce((acc: number, curr: any) => {
        return acc + parseMoney(curr.amount);
    }, 0);

    // 2. Sumar Multas (Aquí estaba el error)
    const totalFines = fines.reduce((acc: number, curr: any) => {
        // El robot manda 'monto', la BD manda 'amount'. Revisamos ambos.
        const valor = curr.amount !== undefined ? curr.amount : curr.monto;
        return acc + parseMoney(valor);
    }, 0);

    const grandTotal = totalExp + totalFines;

    return (
        <View style={styles.fadeIn}>
            {/* Resumen Financiero */}
            <View style={styles.financeSummary}>
                <View style={styles.financeCardMain}>
                    <Text style={styles.financeLabelWhite}>Costo Total Operativo (Año)</Text>
                    <Text style={styles.financeValueWhite}>
                        ${grandTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </Text>
                </View>
                <View style={styles.financeCardSec}>
                    <Text style={styles.financeLabel}>Multas</Text>
                    <Text style={[styles.financeValue, {color:'#ef4444'}]}>
                        ${totalFines.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </Text>
                </View>
                <View style={styles.financeCardSec}>
                    <Text style={styles.financeLabel}>Mantenimiento/Gas</Text>
                    <Text style={[styles.financeValue, {color:'#2563eb'}]}>
                        ${totalExp.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </Text>
                </View>
            </View>

            {/* Listas Detalladas */}
            <View style={styles.splitRow}>
                {/* Tabla de Gastos */}
                <View style={[styles.card, {flex:1}]}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Últimos Gastos</Text>
                        <TouchableOpacity style={styles.btnSmall}><Text style={styles.btnSmallText}>+ Nuevo</Text></TouchableOpacity>
                    </View>
                    {expenses.slice(0, 5).map((ex:any, i:number) => (
                        <View key={i} style={styles.rowItem}>
                            <View style={[styles.iconBox, {backgroundColor:'#f1f5f9'}]}><Ionicons name="wallet" size={16} color="#475569"/></View>
                            <View style={{flex:1}}>
                                <Text style={styles.itemTitle}>{ex.type}</Text>
                                <Text style={styles.itemSub}>{ex.date}</Text>
                            </View>
                            <Text style={styles.itemAmount}>${parseMoney(ex.amount).toFixed(2)}</Text>
                        </View>
                    ))}
                    {expenses.length === 0 && <Text style={styles.emptyText}>Sin registros.</Text>}
                </View>

                {/* Tabla de Multas */}
                <View style={[styles.card, {flex:1}]}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>Infracciones ({fines.length})</Text>
                    </View>
                    {fines.map((fine:any, i:number) => {
                        // Unificamos nombres de propiedades (API vs BD)
                        const motivo = fine.description || fine.motivo;
                        const estado = fine.status || fine.estatus || 'pending';
                        const monto = parseMoney(fine.amount || fine.monto);
                        const isPaid = estado === 'paid' || estado === 'PAGADA';

                        return (
                            <View key={i} style={styles.rowItem}>
                                <View style={[styles.iconBox, {backgroundColor: isPaid ? '#dcfce7' : '#fee2e2'}]}>
                                    <Ionicons name="warning" size={16} color={isPaid ? '#166534' : '#991b1b'}/>
                                </View>
                                <View style={{flex:1}}>
                                    <Text style={styles.itemTitle} numberOfLines={2}>{motivo}</Text>
                                    <Text style={[styles.itemSub, {color: isPaid ? '#166534' : '#991b1b'}]}>
                                        {estado.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.itemAmount}>${monto.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                    {fines.length === 0 && <Text style={styles.emptyText}>Limpio. Sin multas.</Text>}
                </View>
            </View>
        </View>
    );
};

const ConfigView = ({ vehicle, onAssign }: any) => {
    return (
        <View style={styles.fadeIn}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Hardware GPS</Text>
                {vehicle.device ? (
                    <View>
                        <View style={styles.deviceRow}>
                            <View style={styles.deviceIcon}><Ionicons name="hardware-chip" size={30} color="#64748b"/></View>
                            <View>
                                <Text style={styles.deviceModel}>{vehicle.device.model || 'Modelo Estándar'}</Text>
                                <Text style={styles.deviceImei}>IMEI: {vehicle.device.imei}</Text>
                            </View>
                            <TouchableOpacity style={styles.unlinkBtn}><Text style={styles.unlinkText}>Desvincular</Text></TouchableOpacity>
                        </View>
                        
                        <View style={styles.separator} />
                        
                        <Text style={styles.sectionTitle}>Comandos GPRS</Text>
                        <View style={styles.commandList}>
                            <CommandRow title="Corte de Motor" desc="Detiene el flujo de combustible" icon="power" danger />
                            <CommandRow title="Alerta de Velocidad" desc="Notificar si supera 100 km/h" icon="speedometer" />
                            <CommandRow title="Modo Parking" desc="Alerta si se mueve estando apagado" icon="car" />
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No hay GPS vinculado</Text>
                        <TouchableOpacity style={styles.btnPrimary} onPress={onAssign}>
                            <Text style={styles.btnPrimaryText}>Vincular Dispositivo Ahora</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

// ==========================================
// COMPONENTES UI REUTILIZABLES
// ==========================================

const ActionButton = ({ icon, label, onPress, color, bg, border }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.actionBtn, {backgroundColor: bg}, border && {borderWidth:1, borderColor:'#e2e8f0'}]}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.actionBtnText, {color: color}]}>{label}</Text>
    </TouchableOpacity>
);

const TabItem = ({ title, active, onPress, icon, badge }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.tabItem, active && styles.tabItemActive]}>
        <Ionicons name={icon} size={18} color={active ? '#2563eb' : '#64748b'} />
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
        {badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
    </TouchableOpacity>
);

const KpiCard = ({ icon, label, value, color, bg }: any) => (
    <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, {backgroundColor: bg}]}><Ionicons name={icon} size={20} color={color} /></View>
        <View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </View>
    </View>
);

const CommandRow = ({ title, desc, icon, danger }: any) => (
    <View style={styles.cmdRow}>
        <View style={styles.row}>
            <View style={[styles.cmdIcon, danger && {backgroundColor:'#fee2e2'}]}>
                <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#64748b'} />
            </View>
            <View>
                <Text style={styles.cmdTitle}>{title}</Text>
                <Text style={styles.cmdDesc}>{desc}</Text>
            </View>
        </View>
        <Switch trackColor={{false:"#e2e8f0", true: danger?"#ef4444":"#2563eb"}} thumbColor="#fff" value={false} />
    </View>
);

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fadeIn: { flex: 1, gap: 20 },

  // HEADER CARD
  headerCard: { backgroundColor: '#fff', padding: 20, paddingBottom: 24, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bgSuccess: { backgroundColor: '#dcfce7' }, bgDanger: { backgroundColor: '#fee2e2' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotSuccess: { backgroundColor: '#16a34a' }, dotDanger: { backgroundColor: '#dc2626' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  textSuccess: { color: '#166534' }, textDanger: { color: '#991b1b' },

  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 },
  headerLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  carAvatar: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  carTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  carSub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { fontWeight: '600', fontSize: 13 },

  // TABS
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, marginRight: 24, borderBottomWidth: 2, borderColor: 'transparent' },
  tabItemActive: { borderColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#2563eb', fontWeight: '700' },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // CONTENT
  contentArea: { padding: 20, paddingBottom: 40 },

  // DASHBOARD GRID
  dashboardGrid: { gap: 20, flexDirection: isDesktop ? 'row' : 'column' },
  mapCard: { flex: 2, backgroundColor: '#fff', borderRadius: 16, padding: 6, shadowColor: '#000', shadowOpacity: 0.03, elevation: 2, minHeight: 400 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, marginBottom: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { fontSize: 10, color: '#b91c1c', fontWeight: 'bold' },
  
  mapContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mapOverlay: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 10, flexDirection: 'row', gap: 16, shadowColor: '#000', shadowOpacity: 0.1 },
  overlayLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  overlayValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  overlayValueSmall: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
  dividerV: { width: 1, backgroundColor: '#e2e8f0' },

  rightCol: { flex: 1, gap: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  linkText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  driverSub: { fontSize: 13, color: '#64748b' },
  callIconBtn: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.03 },
  kpiIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 12, color: '#64748b' },

  // FINANCES
  financeSummary: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  financeCardMain: { flex: 2, backgroundColor: '#0f172a', padding: 20, borderRadius: 16 },
  financeCardSec: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03 },
  financeLabelWhite: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  financeValueWhite: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  financeLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  financeValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  
  splitRow: { flexDirection: 'row', gap: 20 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  itemSub: { fontSize: 11, color: '#64748b' },
  itemAmount: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  btnSmall: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  btnSmallText: { color: '#2563eb', fontSize: 11, fontWeight: 'bold' },

  // CONFIG
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 20 },
  deviceIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  deviceModel: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  deviceImei: { fontFamily: Platform.OS==='ios'?'Courier':'monospace', color: '#64748b' },
  unlinkBtn: { marginLeft: 'auto', padding: 8 },
  unlinkText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  commandList: { gap: 12 },
  cmdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cmdIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  cmdTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cmdDesc: { fontSize: 11, color: '#64748b' },
  
  separator: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 },
  
  // EMPTY STATES
  emptyBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  btnPrimary: { marginTop: 10, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' }
});