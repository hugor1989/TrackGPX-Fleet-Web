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
  Linking,
  Modal,
  TextInput,
  Image
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import * as ImagePicker from 'expo-image-picker'; 

// Importa tus layouts y servicios
import MainLayout from '../../layouts/MainLayout';
import vehicleService, { Vehicle } from '../../api/vehicleService';
import fineService, { Fine } from '../../api/fineService';
import reportService, { ExpenseRecord } from '../../api/reportService';
import { fetchGasPrice, FuelType } from '../../api/gasPriceService';
import AssignDeviceModal from '../../components/AssignDeviceModal';

const { width } = Dimensions.get('window');
const isDesktop = width > 1024; 

// ⚠️ REEMPLAZA CON TU API KEY REAL
const GOOGLE_MAPS_API_KEY = "TU_API_KEY_AQUI"; 

type TabType = 'DASHBOARD' | 'FINANCE' | 'CONFIG';

// ==========================================
// COMPONENTE: POPUP PERSONALIZADO
// ==========================================
const CustomPopup = ({ visible, type, title, message, onAction }: any) => {
    if (!visible) return null;
    
    const isSuccess = type === 'success';
    const color = isSuccess ? '#10b981' : '#ef4444'; // Verde o Rojo
    const bgIcon = isSuccess ? '#d1fae5' : '#fee2e2'; 

    return (
        <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
                <View style={[styles.popupIconCircle, { backgroundColor: bgIcon }]}>
                    <Ionicons name={isSuccess ? "checkmark" : "alert"} size={32} color={color} />
                </View>
                <Text style={styles.popupTitle}>{title}</Text>
                <Text style={styles.popupMessage}>{message}</Text>
                
                <TouchableOpacity 
                    style={[styles.popupBtn, { backgroundColor: color }]} 
                    onPress={onAction}
                >
                    <Text style={styles.popupBtnText}>{isSuccess ? "Continuar" : "Entendido"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ==========================================
// PANTALLA PRINCIPAL
// ==========================================
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
  
  // Modal de Gastos
  const [showExpenseModal, setShowExpenseModal] = useState(false);

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
      // TRUCO PRO: Le ponemos .catch() a cada llamada individualmente.
      // Si falla, retornamos null (o array vacío) en lugar de romper todo el bloque.
      const [finesRes, expensesRes] = await Promise.all([
        
        // 1. Llamada a Multas (Si falla, devuelve [])
        fineService.searchByPlate(plate)
            .catch(error => {
                console.warn("⚠️ Falló API Multas:", error);
                return []; // Retorno seguro
            }),

        // 2. Llamada a Gastos (Si falla, devuelve null)
        reportService.getFinancialReport('2026-01-01', '2026-12-31', id.toString())
            .catch(error => {
                console.warn("⚠️ Falló API Reportes:", error);
                return null; // Retorno seguro
            })
      ]);

      // --- AHORA PROCESAMOS LO QUE HAYA LLEGADO ---

      // Multas (si falló, finesRes será [])
      setFines(finesRes || []);

      // Gastos (si falló, expensesRes será null)
      console.log("📦 GASTOS RESPUESTA:", expensesRes); // Para debug

      // Lógica segura para leer la data
      // Nota: Ajusta esto según si usaste la Opción A o B en el paso anterior
      const expensesData = expensesRes?.data || expensesRes; // Intenta leer .data, si no usa el objeto directo
      
      if (expensesData && Array.isArray(expensesData)) {
          setExpenses(expensesData);
      } else if (expensesData?.data && Array.isArray(expensesData.data)) {
          // Por si viene anidado axios { data: { data: [] } }
          setExpenses(expensesData.data);
      } else {
          setExpenses([]);
      }

    } catch (e) { 
        // Este catch solo se activa si hay un error DE LÓGICA en el código de arriba,
        // ya no por errores de red de las APIs.
        console.error("Error crítico en loadExtras:", e); 
    } finally { 
        setLoadingExtras(false); 
    }
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
            
            {activeTab === 'FINANCE' && 
                <FinanceView 
                    vehicle={vehicle} 
                    expenses={expenses} 
                    fines={fines} 
                    loading={loadingExtras} 
                    onAdd={() => setShowExpenseModal(true)} 
                />
            }
            
            {activeTab === 'CONFIG' && <ConfigView vehicle={vehicle} onAssign={() => setShowAssignModal(true)} />}
        </ScrollView>

        <AssignDeviceModal 
            visible={showAssignModal} 
            vehicleId={vehicle.id} 
            vehicleName={vehicle.name} 
            onClose={() => setShowAssignModal(false)} 
            onSuccess={loadData} 
        />

        {/* === 4. MODAL DE GASTOS INTELIGENTE === */}
        <Modal visible={showExpenseModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Registrar Nuevo Gasto</Text>
                        <TouchableOpacity onPress={()=>setShowExpenseModal(false)}>
                            <Ionicons name="close" size={24} color="#64748b"/>
                        </TouchableOpacity>
                    </View>
                    
                    {/* FORMULARIO CON POPUP INTEGRADO */}
                    <ExpenseForm 
                        vehicleId={vehicle.id} 
                        onClose={()=>setShowExpenseModal(false)} 
                        onSuccess={()=>{
                            setShowExpenseModal(false); 
                            loadData(); 
                        }}
                    />
                </View>
            </View>
        </Modal>

      </View>
    </MainLayout>
  );
}

// ==========================================
// FORMULARIO INTELIGENTE (WEB/MOBILE + POPUP)
// ==========================================
const ExpenseForm = ({ vehicleId, onClose, onSuccess }: any) => {
    // Estado del Formulario
    const [form, setForm] = useState({
        type: 'FUEL', amount: '', description: '', 
        liters: '', pricePerLiter: '', attachment: null as string|null, date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);

    // Estado del POPUP
    const [popup, setPopup] = useState({ 
        visible: false, type: 'success', title: '', message: '', onAction: () => {} 
    });

    const handleFuelCalc = async () => {
        if(form.type !== 'FUEL') return;
        let price = form.pricePerLiter;
        if(!price) {
            setCalculating(true);
            let fuelType: FuelType = 'regular';
            if(form.description.toLowerCase().includes('premium')) fuelType = 'premium';
            if(form.description.toLowerCase().includes('diesel')) fuelType = 'diesel';
            const apiPrice = await fetchGasPrice(fuelType);
            if(apiPrice) {
                price = apiPrice;
                setForm(p => ({...p, pricePerLiter: apiPrice}));
            }
            setCalculating(false);
        }
        if(form.liters && price) {
            const total = (parseFloat(form.liters) * parseFloat(price)).toFixed(2);
            setForm(p => ({...p, amount: total}));
        }
    };

    const pickImage = async () => {
        const res = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false });
        if(!res.canceled) setForm(p => ({...p, attachment: res.assets[0].uri}));
    };

    const submit = async () => {
        setLoading(true);
        const formData = new FormData();
        
        formData.append('vehicle_id', String(vehicleId));
        formData.append('date', form.date);
        formData.append('type', form.type);
        formData.append('amount', form.amount);
        formData.append('description', form.description);
        if(form.liters) formData.append('liters', form.liters);
        if(form.pricePerLiter) formData.append('price_per_liter', form.pricePerLiter);
        
        // MANEJO HÍBRIDO DE ARCHIVO (WEB vs MOBILE)
        if (form.attachment) {
            const isPng = form.attachment.toLowerCase().includes('png');
            const ext = isPng ? 'png' : 'jpg';
            const mimeType = isPng ? 'image/png' : 'image/jpeg';
            const filename = `ticket-${Date.now()}.${ext}`; // Nombre único

            if (Platform.OS === 'web') {
                try {
                    const res = await fetch(form.attachment);
                    const blob = await res.blob();
                    formData.append('attachment', blob, filename);
                } catch (e) { console.error(e); }
            } else {
                // @ts-ignore
                formData.append('attachment', { uri: form.attachment, name: filename, type: mimeType });
            }
        }

        const res = await reportService.createExpenseMultipart(formData);
        setLoading(false);

        if (res.success) {
            setPopup({
                visible: true,
                type: 'success',
                title: '¡Gasto Guardado!',
                message: 'El registro y la evidencia se subieron correctamente.',
                onAction: onSuccess // Cierra todo al confirmar
            });
        } else {
            setPopup({
                visible: true,
                type: 'error',
                title: 'Ocurrió un error',
                message: res.message || "No se pudo conectar con el servidor.",
                onAction: () => setPopup(p => ({...p, visible: false}))
            });
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.typeRow}>
                    <TouchableOpacity style={[styles.typeOpt, form.type==='FUEL' && styles.typeActive]} onPress={()=>setForm({...form, type:'FUEL'})}><Text style={form.type==='FUEL' && {color:'#fff', fontWeight:'bold'}}>⛽ Combustible</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.typeOpt, form.type==='MAINTENANCE' && styles.typeActive]} onPress={()=>setForm({...form, type:'MAINTENANCE'})}><Text style={form.type==='MAINTENANCE' && {color:'#fff', fontWeight:'bold'}}>🔧 Taller</Text></TouchableOpacity>
                </View>

                {form.type === 'FUEL' && (
                    <View style={styles.calcBox}>
                        <Text style={styles.label}>Calculadora:</Text>
                        <View style={{flexDirection:'row', gap:10}}>
                            <TextInput style={[styles.input, {flex:1}]} placeholder="Litros" keyboardType="numeric" value={form.liters} onChangeText={t=>setForm({...form, liters:t})} onBlur={handleFuelCalc}/>
                            <TextInput style={[styles.input, {flex:1}]} placeholder="$/Litro" keyboardType="numeric" value={form.pricePerLiter} onChangeText={t=>setForm({...form, pricePerLiter:t})} />
                        </View>
                        {calculating && <ActivityIndicator size="small" color="#2563eb"/>}
                    </View>
                )}

                <Text style={styles.label}>Monto Total ($)</Text>
                <TextInput style={[styles.input, {fontSize:20, fontWeight:'bold'}]} value={form.amount} onChangeText={t=>setForm({...form, amount:t})} keyboardType="numeric" placeholder="0.00"/>

                <Text style={styles.label}>Descripción</Text>
                <TextInput style={styles.input} value={form.description} onChangeText={t=>setForm({...form, description:t})} placeholder="Ej. Carga G500"/>

                <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                    {form.attachment ? <Image source={{uri:form.attachment}} style={{width:'100%', height:140, borderRadius:8, resizeMode:'contain'}}/> : 
                    <><Ionicons name="camera" size={28} color="#6b7280"/><Text style={{color:'#6b7280', marginTop:8}}>Foto del Ticket</Text></>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Guardar Gasto</Text>}
                </TouchableOpacity>
            </ScrollView>

            <CustomPopup 
                visible={popup.visible} 
                type={popup.type} 
                title={popup.title} 
                message={popup.message} 
                onAction={popup.onAction} 
            />
        </View>
    );
};

// ==========================================
// VISTAS Y COMPONENTES UI
// ==========================================

const DashboardView = ({ vehicle, apiKey }: any) => {
    const lat = vehicle.device?.latitude || 19.4326;
    const lng = vehicle.device?.longitude || -99.1332;

    return (
        <View style={styles.fadeIn}>
            <View style={styles.dashboardGrid}>
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
                        <View style={styles.mapOverlay}>
                            <View><Text style={styles.overlayLabel}>Velocidad</Text><Text style={styles.overlayValue}>{vehicle.device?.speed || 0} km/h</Text></View>
                            <View style={styles.dividerV} />
                            <View><Text style={styles.overlayLabel}>Último Reporte</Text><Text style={styles.overlayValueSmall}>{vehicle.device?.last_update || 'Hace un momento'}</Text></View>
                        </View>
                    </View>
                </View>

                <View style={styles.rightCol}>
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Conductor</Text>
                            <TouchableOpacity><Text style={styles.linkText}>Detalles</Text></TouchableOpacity>
                        </View>
                        {vehicle.driver ? (
                            <View style={styles.driverRow}>
                                <View style={styles.avatar}><Text style={styles.avatarText}>{vehicle.driver.account?.name.charAt(0)}</Text></View>
                                <View><Text style={styles.driverName}>{vehicle.driver.account?.name}</Text><Text style={styles.driverSub}>Licencia: {vehicle.driver.license_number || '---'}</Text></View>
                                <TouchableOpacity style={styles.callIconBtn} onPress={() => vehicle.driver.phone && Linking.openURL(`tel:${vehicle.driver.phone}`)}><Ionicons name="call" size={18} color="#fff" /></TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.emptyBox}><Text style={styles.emptyText}>Sin conductor asignado</Text></View>
                        )}
                    </View>

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

const FinanceView = ({ expenses, fines, loading, onAdd }: any) => {
    if(loading) return <ActivityIndicator color="#2563eb" style={{marginTop: 20}} />;
    
    // Estados
    const [filter, setFilter] = useState('ALL');
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // --- 1. PROCESAMIENTO Y CALCULOS ---
    const parseMoney = (value: any) => {
        if (!value) return 0;
        const clean = String(value).replace(/[^0-9.]/g, ''); 
        return parseFloat(clean) || 0;
    };

    // A) Listas Maestras (Base de datos + Scraping)
    // Nota: Asumimos que 'expenses' ya trae las multas de la BD.
    // Si tu backend ya mezcla todo, usa solo 'expenses'. Si no, une como antes: [...expenses, ...fines]
    const masterList = [...expenses, ...fines]; // Unimos por si acaso el backend no trae las del scraping

    // B) Cálculos para las TARJETAS (Siempre sobre el total sin filtros)
    const totals = masterList.reduce((acc, item) => {
        const isScraping = !item.type_raw && (item.monto || item.folio);
        const type = isScraping ? 'FINE' : (item.type_raw || 'OTHER');
        const amount = parseMoney(item.amount || item.monto);
        
        acc.grandTotal += amount;
        if(type === 'FUEL') { acc.fuel += amount; acc.fuelCount++; }
        else if(type === 'FINE') { acc.fines += amount; acc.finesCount++; }
        else if(type === 'INSURANCE') { acc.ins += amount; acc.insCount++; }
        else if(['MAINTENANCE', 'REPAIR'].includes(type)) { acc.maint += amount; acc.maintCount++; }
        
        return acc;
    }, { grandTotal:0, fuel:0, fuelCount:0, maint:0, maintCount:0, ins:0, insCount:0, fines:0, finesCount:0 });

    // --- 2. HELPER DE ESTILOS (Iconos y Categorías) ---
    const getStyles = (item: any) => {
        const isScraping = !item.type_raw && (item.monto || item.folio);
        let typeRaw = isScraping ? 'FINE' : (item.type_raw || 'OTHER');
        
        switch (typeRaw) {
            case 'FUEL': return { icon: 'water', color: '#3b82f6', bg: '#eff6ff', label: 'Combustible', cat: 'FUEL' };
            case 'MAINTENANCE': return { icon: 'build', color: '#f59e0b', bg: '#fffbeb', label: 'Mantenimiento', cat: 'MAINT' };
            case 'REPAIR': return { icon: 'hammer', color: '#d97706', bg: '#fffbeb', label: 'Reparación', cat: 'MAINT' };
            case 'INSURANCE': return { icon: 'shield-checkmark', color: '#8b5cf6', bg: '#f5f3ff', label: 'Seguro', cat: 'OTHER' };
            case 'FINE': return { icon: 'alert-circle', color: '#ef4444', bg: '#fef2f2', label: 'Infracción', cat: 'FINE' };
            default: return { icon: 'wallet', color: '#64748b', bg: '#f1f5f9', label: 'Otro', cat: 'OTHER' };
        }
    };

    // --- 3. LISTA FILTRADA Y ORDENADA PARA EL HISTORIAL ---
    const filteredList = masterList
        .filter(item => {
            if (filter === 'ALL') return true;
            return getStyles(item).cat === filter;
        })
        .sort((a, b) => {
            // Ordenar por fecha descendente
            const dateA = new Date(a.date || a.detected_at || 0);
            const dateB = new Date(b.date || b.detected_at || 0);
            return dateB.getTime() - dateA.getTime();
        });


    return (
        <View style={styles.fadeIn}>
            
            {/* === SECCIÓN 1: COSTO TOTAL MAYOR === */}
            <View style={localStyles.totalCard}>
                <View>
                    <Text style={localStyles.totalLabel}>Costo Total Operativo (Año)</Text>
                    <Text style={localStyles.totalValue}>${totals.grandTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</Text>
                </View>
                <TouchableOpacity style={localStyles.btnAdd} onPress={onAdd}>
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={localStyles.btnAddText}>Registrar</Text>
                </TouchableOpacity>
            </View>

            {/* === SECCIÓN 2: GRID DE TARJETAS (RESTITUIDO) === */}
            <View style={localStyles.gridContainer}>
                <CategoryCard 
                    label="Combustible" amount={totals.fuel} count={totals.fuelCount} 
                    icon="water" color="#3b82f6" bg="#eff6ff" 
                />
                <CategoryCard 
                    label="Mantenimiento" amount={totals.maint} count={totals.maintCount} 
                    icon="build" color="#f59e0b" bg="#fffbeb" 
                />
                <CategoryCard 
                    label="Seguros" amount={totals.ins} count={totals.insCount} 
                    icon="shield-checkmark" color="#8b5cf6" bg="#f5f3ff" 
                />
                <CategoryCard 
                    label="Infracciones" amount={totals.fines} count={totals.finesCount} 
                    icon="alert-circle" color="#ef4444" bg="#fef2f2" 
                />
            </View>

            {/* === SECCIÓN 3: BARRA DE FILTROS === */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}} contentContainerStyle={{gap: 8}}>
                <FilterChip label="Todos" active={filter==='ALL'} onPress={()=>setFilter('ALL')} />
                <FilterChip label="Combustible" active={filter==='FUEL'} onPress={()=>setFilter('FUEL')} icon="water"/>
                <FilterChip label="Taller" active={filter==='MAINT'} onPress={()=>setFilter('MAINT')} icon="build"/>
                <FilterChip label="Multas" active={filter==='FINE'} onPress={()=>setFilter('FINE')} icon="alert-circle"/>
                <FilterChip label="Otros/Seguro" active={filter==='OTHER'} onPress={()=>setFilter('OTHER')} icon="wallet"/>
            </ScrollView>

            {/* === SECCIÓN 4: HISTORIAL DETALLADO === */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Movimientos Recientes ({filteredList.length})</Text>
                    <Ionicons name="time-outline" size={20} color="#94a3b8" />
                </View>
                
                {filteredList.slice(0, 20).map((item:any, i:number) => { // Limitamos a 20 para no saturar
                    const style = getStyles(item);
                    const amount = parseMoney(item.amount || item.monto);
                    const date = item.date || item.detected_at || item.fecha;
                    const desc = item.description || item.motivo || 'Sin descripción';
                    const hasAttachment = !!item.attachment;

                    return (
                        <TouchableOpacity key={i} style={styles.rowItem} onPress={() => setSelectedItem(item)}>
                            <View style={[styles.iconBox, {backgroundColor: style.bg}]}>
                                <Ionicons name={style.icon as any} size={18} color={style.color}/>
                            </View>
                            
                            <View style={{flex:1}}>
                                <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                                    <Text style={styles.itemTitle}>{style.label}</Text>
                                    {hasAttachment && <Ionicons name="attach" size={14} color="#64748b"/>}
                                </View>
                                <Text style={styles.itemSub} numberOfLines={1}>{date} • {desc}</Text>
                            </View>

                            <Text style={[styles.itemAmount, style.cat==='FINE' && {color:'#ef4444'}]}>
                                -${amount.toLocaleString('es-MX', {minimumFractionDigits: 0})}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                
                {filteredList.length === 0 && (
                    <View style={{padding: 20, alignItems:'center'}}>
                        <Text style={styles.emptyText}>No hay movimientos con este filtro.</Text>
                    </View>
                )}
            </View>

            {/* === MODAL DE DETALLE (CON ARREGLO DE IMAGEN) === */}
            <Modal visible={!!selectedItem} transparent animationType="fade">
                <View style={localStyles.modalOverlay}>
                    <View style={localStyles.detailCard}>
                        <View style={localStyles.detailHeader}>
                            <Text style={localStyles.detailTitle}>Detalle del Movimiento</Text>
                            <TouchableOpacity onPress={()=>setSelectedItem(null)} style={{padding:4}}>
                                <Ionicons name="close" size={24} color="#64748b"/>
                            </TouchableOpacity>
                        </View>
                        
                        {selectedItem && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={localStyles.amountRow}>
                                    <Text style={localStyles.amountLabel}>Monto Total</Text>
                                    <Text style={localStyles.amountBig}>
                                        ${parseMoney(selectedItem.amount || selectedItem.monto).toLocaleString('es-MX', {minimumFractionDigits:2})}
                                    </Text>
                                </View>
                                
                                <View style={localStyles.infoBox}>
                                    <DetailRow label="Fecha" value={selectedItem.date || selectedItem.detected_at} />
                                    <DetailRow label="Categoría" value={getStyles(selectedItem).label} />
                                    <DetailRow label="Concepto" value={selectedItem.description || selectedItem.motivo} isLast />
                                </View>

                                <Text style={localStyles.sectionTitle}>EVIDENCIA / TICKET</Text>
                                {selectedItem.attachment ? (
                                    <View style={localStyles.imageContainer}>
                                        <Image 
                                            source={{uri: selectedItem.attachment}} 
                                            style={localStyles.evidenceImage}
                                            resizeMode="contain"
                                            onError={(e) => console.log("Error cargando imagen:", e.nativeEvent.error)}
                                        />
                                    </View>
                                ) : (
                                    <View style={localStyles.noReceiptBox}>
                                        <Ionicons name="document-text-outline" size={40} color="#cbd5e1" />
                                        <Text style={{color:'#94a3b8', marginTop: 8, fontSize:13}}>Sin comprobante adjunto</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </View>
    );
};

// --- COMPONENTES AUXILIARES Y ESTILOS ---

// Tarjeta Pequeña del Grid
const CategoryCard = ({ label, amount, count, icon, color, bg }: any) => (
    <View style={localStyles.catCard}>
        <View style={[localStyles.catIcon, {backgroundColor: bg}]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <View>
            <Text style={localStyles.catLabel}>{label}</Text>
            <Text style={localStyles.catAmount}>${amount.toLocaleString('es-MX', {maximumFractionDigits:0})}</Text>
            <Text style={localStyles.catCount}>{count} registros</Text>
        </View>
    </View>
);

// Chip de Filtro
const FilterChip = ({ label, active, onPress, icon }: any) => (
    <TouchableOpacity onPress={onPress} style={[localStyles.chip, active && localStyles.chipActive]}>
        {icon && <Ionicons name={icon} size={14} color={active ? '#fff' : '#64748b'} />}
        <Text style={[localStyles.chipText, active && localStyles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
);

// Fila de Detalle
const DetailRow = ({ label, value, isLast }: any) => (
    <View style={[localStyles.detailRow, isLast && {borderBottomWidth:0}]}>
        <Text style={localStyles.detailLabelCol}>{label}</Text>
        <Text style={localStyles.detailValueCol}>{value}</Text>
    </View>
);


// ESTILOS LOCALES PARA ESTA VISTA
const localStyles = StyleSheet.create({

    // Total Principal
    totalCard: {
        backgroundColor: '#0f172a', borderRadius: 16, padding: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, shadowColor: '#0f172a', shadowOpacity: 0.2, shadowOffset: {width:0, height:4}, elevation: 5
    },
    totalLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    totalValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
    btnAdd: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 6 },
    btnAddText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    
    // Grid de Tarjetas
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    catCard: { 
        backgroundColor: '#fff', width: '48%', padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: '#f1f5f9', gap: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1
    },
    catIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    catLabel: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    catAmount: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginVertical: 2 },
    catCount: { color: '#94a3b8', fontSize: 11 },

    // Chips
    chip: { flexDirection:'row', alignItems:'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
    chipTextActive: { color: '#fff' },

    // Modal Detalle
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    detailCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '85%', width: '100%', maxWidth: 500, alignSelf:'center' },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    detailTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    amountRow: { alignItems: 'center', marginBottom: 20 },
    amountLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, fontWeight:'600' },
    amountBig: { fontSize: 36, fontWeight: '800', color: '#0f172a' },
    infoBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth:1, borderColor:'#f1f5f9' },
    detailRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical: 12, borderBottomWidth:1, borderColor:'#e2e8f0' },
    detailLabelCol: { color:'#64748b', fontWeight:'500', fontSize:14 },
    detailValueCol: { fontWeight:'600', color:'#1e293b', maxWidth:'65%', textAlign:'right', fontSize:14 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 12, textTransform:'uppercase' },
    
    // Estilos de Imagen Arreglados
    imageContainer: { 
        width: '100%', height: 300, backgroundColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: '#e2e8f0', justifyContent:'center', alignItems:'center'
    },
    evidenceImage: { width: '100%', height: '100%' },
    noReceiptBox: { alignItems:'center', justifyContent:'center', padding: 30, borderWidth: 2, borderColor: '#f1f5f9', borderStyle: 'dashed', borderRadius: 12, backgroundColor:'#f8fafc' },
});

const ConfigView = ({ vehicle, onAssign }: any) => {
    return (
        <View style={styles.fadeIn}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Hardware GPS</Text>
                {vehicle.device ? (
                    <View>
                        <View style={styles.deviceRow}>
                            <View style={styles.deviceIcon}><Ionicons name="hardware-chip" size={30} color="#64748b"/></View>
                            <View><Text style={styles.deviceModel}>{vehicle.device.model || 'Modelo Estándar'}</Text><Text style={styles.deviceImei}>IMEI: {vehicle.device.imei}</Text></View>
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
                        <TouchableOpacity style={styles.btnPrimary} onPress={onAssign}><Text style={styles.btnPrimaryText}>Vincular Dispositivo Ahora</Text></TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

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
        <View><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>
    </View>
);

const CommandRow = ({ title, desc, icon, danger }: any) => (
    <View style={styles.cmdRow}>
        <View style={styles.row}>
            <View style={[styles.cmdIcon, danger && {backgroundColor:'#fee2e2'}]}>
                <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#64748b'} />
            </View>
            <View><Text style={styles.cmdTitle}>{title}</Text><Text style={styles.cmdDesc}>{desc}</Text></View>
        </View>
        <Switch trackColor={{false:"#e2e8f0", true: danger?"#ef4444":"#2563eb"}} thumbColor="#fff" value={false} />
    </View>
);

// ==========================================
// ESTILOS COMPLETOS
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

  contentArea: { padding: 20, paddingBottom: 40 },
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
  
  emptyBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  btnPrimary: { marginTop: 10, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  // === ESTILOS MODAL Y POPUP ===
  modalOverlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, zIndex: 9999 
  },
  modalContainer: { 
    backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '90%',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  label: { fontWeight: '600', marginBottom: 6, color: '#475569', fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeOpt: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  typeActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  calcBox: { backgroundColor: '#eff6ff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe' },
  cameraBtn: { height: 120, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#f8fafc' },
  saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },

  // Estilos Popup Personalizado
  popupOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100, borderRadius: 16
  },
  popupCard: {
    width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#f1f5f9'
  },
  popupIconCircle: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  popupTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  popupMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  popupBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  popupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});