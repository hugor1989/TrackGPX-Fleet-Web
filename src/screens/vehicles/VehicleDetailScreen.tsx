import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert, // Se mantiene solo para confirmaciones (Si/No)
  RefreshControl,
  useWindowDimensions,
  Modal,
  TextInput
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Importa tus servicios y layouts
import MainLayout from '../../layouts/MainLayout';
import vehicleService, { Vehicle } from '../../api/vehicleService';
import fineService, { Fine } from '../../api/fineService';
import reportService from '../../api/reportService'; 
import AssignDeviceModal from '../../components/AssignDeviceModal';
import FeedbackModal from '../../components/FeedbackModal'; // <--- IMPORTA TU COMPONENTE AQUÍ

// --- TIPOS ---
type TabType = 'info' | 'gps' | 'fines' | 'admin';

interface MaintenanceSchedule {
    id: number;
    name: string;
    interval_km: number;
    last_service_date: string;
    last_service_odometer: number;
}

export default function VehicleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { vehicleId: number } | undefined;
  const vehicleId = params?.vehicleId;

  // --- ESTADOS PRINCIPALES ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showAssignDeviceModal, setShowAssignDeviceModal] = useState(false);
  
  // Estados Auxiliares (Multas)
  const [fines, setFines] = useState<Fine[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  // --- ESTADOS GESTIÓN ---
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]); 
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [insuranceHistory, setInsuranceHistory] = useState<any[]>([]); 
  
  // Modales
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showRegisterMaintModal, setShowRegisterMaintModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- ESTADO PARA FEEDBACK (NUEVO) ---
  const [feedback, setFeedback] = useState({
      visible: false,
      type: 'success' as 'success' | 'error',
      title: '',
      message: ''
  });

  // --- FORMULARIOS ---
  const [policyForm, setPolicyForm] = useState({
    insurance_company: '', policy_number: '', policy_expiry: '', amount: '', policy_document: null as string | null
  });

  const [scheduleForm, setScheduleForm] = useState({
    name: '', interval_km: '', last_service_date: new Date().toISOString().split('T')[0], last_service_odometer: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    schedule_id: null as number | null,
    description: '', amount: '', date: new Date().toISOString().split('T')[0], current_odometer: '', attachment: null as string | null
  });

  // --- CARGA DE DATOS ---
  const loadData = useCallback(async () => {
    if (!vehicleId) return;
    try {
      if (!refreshing) setLoading(true);
      
      const vehicleData = await vehicleService.getVehicle(vehicleId);
      setVehicle(vehicleData);
      
      // Cargar Calendarios
      try {
          const schedulesData = await vehicleService.getMaintenanceSchedules(vehicleId); 
          setSchedules(schedulesData || []);
      } catch (e) { setSchedules([]); }

      // Póliza (Estado base)
      setPolicyForm({
        insurance_company: vehicleData.insurance_company || '',
        policy_number: vehicleData.policy_number || '',
        policy_expiry: '', 
        amount: '', 
        policy_document: null
      });

      if (vehicleData.plate) loadExtras(vehicleData.plate, vehicleData.id);
    } catch (err: any) {
      Alert.alert('Error', err.message); // Error crítico de carga usa Alert nativo para bloquear
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId, refreshing]);

  const loadExtras = async (plate: string, id: number) => {
    setLoadingFines(true);
    try {
      const year = new Date().getFullYear();
      const [finesData, expensesData] = await Promise.all([
        fineService.searchByPlate(plate).catch(() => []),
        reportService.getFinancialReport(`${year-1}-01-01`, `${year+1}-12-31`, id.toString()).catch(() => ({ data: [] }))
      ]);
      setFines(finesData || []);
      
      const allExpenses = expensesData?.data || [];
      setMaintenanceHistory(allExpenses.filter((e: any) => ['MAINTENANCE', 'REPAIR'].includes(e.type_raw)));
      setInsuranceHistory(allExpenses.filter((e: any) => e.type_raw === 'INSURANCE'));

    } catch (err) { console.error(err); } finally { setLoadingFines(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const handleRefresh = () => { setRefreshing(true); loadData(); };

  // --- HELPER FEEDBACK ---
  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
      setFeedback({ visible: true, type, title, message });
  };

  const closeFeedback = () => {
      setFeedback({ ...feedback, visible: false });
      if (feedback.type === 'success') {
          // Si fue éxito, cerramos los modales de acción y recargamos
          setShowPolicyModal(false);
          setShowAddScheduleModal(false);
          setShowRegisterMaintModal(false);
          handleRefresh();
      }
  };

  // --- ACCIONES ---

  // 1. Crear Plan
  const handleCreateSchedule = async () => {
    if(!vehicle) return;
    if(!scheduleForm.name || !scheduleForm.interval_km) { 
        showFeedback('error', 'Faltan Datos', 'El nombre y el kilometraje son obligatorios.'); 
        return; 
    }
    
    setUploading(true);
    try {
        const payload = {
            name: scheduleForm.name,
            interval_km: parseInt(scheduleForm.interval_km),
            last_service_date: scheduleForm.last_service_date,
            last_service_odometer: parseInt(scheduleForm.last_service_odometer || '0')
        };
        await vehicleService.createMaintenanceSchedule(vehicle.id, payload);
        
        showFeedback('success', 'Plan Creado', 'La alerta de mantenimiento se ha configurado correctamente.');
        
        // Limpiar form
        setScheduleForm({ name:'', interval_km:'', last_service_date: new Date().toISOString().split('T')[0], last_service_odometer:'' });
    } catch (error: any) { 
        showFeedback('error', 'Error', error.message || 'No se pudo guardar el plan.');
    } finally { setUploading(false); }
  };

  // 2. Registrar Gasto
  const handleRegisterExpense = async () => {
    if(!vehicle) return;
    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('description', expenseForm.description);
        formData.append('amount', expenseForm.amount);
        formData.append('date', expenseForm.date);
        formData.append('current_odometer', expenseForm.current_odometer);
        if (expenseForm.schedule_id) formData.append('schedule_id', expenseForm.schedule_id.toString());
        
        if (expenseForm.attachment) {
            const uri = expenseForm.attachment;
            const filename = uri.split('/').pop() || 'ticket.jpg';
            // @ts-ignore
            if (Platform.OS !== 'web') formData.append('attachment', { uri, name: filename, type: 'image/jpeg' });
        }
        await vehicleService.registerMaintenance(vehicle.id, formData);
        
        showFeedback('success', 'Mantenimiento Registrado', 'La información y el gasto se guardaron correctamente.');
    } catch (error: any) { 
        showFeedback('error', 'Error', 'No se pudo registrar el mantenimiento.');
    } finally { setUploading(false); }
  };

  // 3. Póliza (Guardar)
  const handleSavePolicy = async () => {
    if(!vehicle) return;
    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('insurance_company', policyForm.insurance_company);
        formData.append('policy_number', policyForm.policy_number);
        formData.append('policy_expiry', policyForm.policy_expiry);
        if(policyForm.amount) formData.append('amount', policyForm.amount);
        if (policyForm.policy_document) {
            const uri = policyForm.policy_document;
            const filename = uri.split('/').pop() || 'poliza.jpg';
            // @ts-ignore
            if (Platform.OS !== 'web') formData.append('policy_document', { uri, name: filename, type: 'image/jpeg' });
        }
        await vehicleService.updateInsurance(vehicle.id, formData);
        
        showFeedback('success', 'Póliza Renovada', 'Los datos del seguro han sido actualizados.');
    } catch (error: any) { 
        showFeedback('error', 'Error', 'No se pudo actualizar la póliza.');
    } finally { setUploading(false); }
  };

  // 4. Abrir Modal Póliza (Limpiando datos viejos)
  const handleOpenRenewModal = () => {
      if (!vehicle) return;
      setPolicyForm({
          // Mantenemos estos
          insurance_company: vehicle.insurance_company || '',
          policy_number: vehicle.policy_number || '',
          // Borramos estos para forzar captura nueva
          policy_expiry: '', 
          amount: '', 
          policy_document: null 
      });
      setShowPolicyModal(true);
  };

  // Auxiliares
  const pickImage = async (target: 'policy' | 'expense') => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.7 });
    if (!result.canceled) {
        if(target === 'policy') setPolicyForm({...policyForm, policy_document: result.assets[0].uri});
        else setExpenseForm({...expenseForm, attachment: result.assets[0].uri});
    }
  };

  const openRegisterModal = (schedule?: MaintenanceSchedule) => {
      setExpenseForm({
          schedule_id: schedule ? schedule.id : null,
          description: schedule ? `Servicio: ${schedule.name}` : '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          current_odometer: vehicle?.odometer?.toString() || '',
          attachment: null
      });
      setShowRegisterMaintModal(true);
  };

  const handleUnassign = async (type: 'driver' | 'device') => {
    if (!vehicle) return;
    // Usamos Alert nativo para confirmación porque bloquea la UI
    Alert.alert("Confirmar", "¿Estás seguro de desvincular?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, Desvincular", style: "destructive", onPress: async () => {
          try {
              if (type==='driver') await vehicleService.unassignDriver(vehicle.id);
              else await vehicleService.unassignDevice(vehicle.id);
              
              showFeedback('success', 'Desvinculado', 'El recurso ha sido liberado correctamente.');
          } catch(e: any) {
              showFeedback('error', 'Error', e.message);
          }
      }}
    ]);
  };

  if (loading && !vehicle) return <MainLayout><View style={styles.loadingCenter}><ActivityIndicator size="large" color="#226bfc" /></View></MainLayout>;
  if (!vehicle) return null;

  return (
    <MainLayout activeMenu="Config-Vehiculos">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {/* Hero Card */}
          <View style={styles.heroCard}>
             <View style={styles.heroLeft}>
                <View style={styles.iconCircle}><Ionicons name="car-sport" size={32} color="#226bfc" /></View>
                <View><Text style={styles.heroTitle}>{vehicle.name}</Text><Text style={styles.heroSubtitle}>{vehicle.plate}</Text></View>
             </View>
             <StatusBadge status={vehicle.status} />
          </View>

          {/* TABS */}
          <View style={styles.tabContainer}>
            <TabButton label="Información" icon="information-circle" active={activeTab === 'info'} onPress={() => setActiveTab('info')} />
            <TabButton label="Rastreo GPS" icon="location" active={activeTab === 'gps'} onPress={() => setActiveTab('gps')} />
            <TabButton label="Gestión" icon="folder-open" active={activeTab === 'admin'} onPress={() => setActiveTab('admin')} />
            <TabButton label="Multas" icon="warning" active={activeTab === 'fines'} onPress={() => setActiveTab('fines')} badge={fines.length > 0 ? fines.length : undefined} />
          </View>

          <View style={styles.tabContent}>
            
            {/* --- 1. INFO TAB --- */}
            {activeTab === 'info' && <InfoTabContent vehicle={vehicle} onUnassignDriver={() => handleUnassign('driver')} />}

            {/* --- 2. GPS TAB --- */}
            {activeTab === 'gps' && <GpsTabContent vehicle={vehicle} onAssign={() => setShowAssignDeviceModal(true)} onUnassign={() => handleUnassign('device')} />}
            
            {/* --- 3. GESTIÓN TAB --- */}
            {activeTab === 'admin' && (
               <View style={styles.grid}>
                   {/* Tarjeta Seguro (Usamos la función que limpia datos) */}
                   <InsuranceCard vehicle={vehicle} history={insuranceHistory} onRenew={handleOpenRenewModal} />

                   {/* Lista de Planes */}
                   <View style={styles.sectionHeaderRow}>
                       <Text style={styles.sectionTitle}>Calendario de Servicios</Text>
                       <TouchableOpacity style={styles.addBtnSmall} onPress={() => setShowAddScheduleModal(true)}>
                           <Ionicons name="add" size={16} color="#fff"/>
                           <Text style={styles.addBtnText}>Nuevo Plan</Text>
                       </TouchableOpacity>
                   </View>

                   {schedules.length > 0 ? (
                       schedules.map((item) => (
                           <ScheduleCard key={item.id} schedule={item} currentOdometer={vehicle.odometer || 0} onRegister={() => openRegisterModal(item)} />
                       ))
                   ) : (
                       <View style={styles.emptyCard}>
                           <Text style={{color:'#6b7280'}}>No hay alertas configuradas.</Text>
                       </View>
                   )}

                   {/* Historial Gastos */}
                   <Text style={[styles.sectionTitle, {marginTop:20}]}>Historial de Ejecución</Text>
                   <View style={styles.card}>
                       {maintenanceHistory.length > 0 ? maintenanceHistory.map((item, i) => (
                           <View key={i} style={styles.historyRow}>
                               <Ionicons name="checkmark-circle" size={18} color="#10b981"/>
                               <View style={{flex:1}}>
                                   <Text style={styles.historyText}>{item.description}</Text>
                                   <Text style={styles.historyDate}>{item.date}</Text>
                               </View>
                               <Text style={{fontWeight:'bold'}}>${item.amount}</Text>
                           </View>
                       )) : <Text style={{color:'#9ca3af', fontStyle:'italic'}}>Sin historial reciente.</Text>}
                   </View>
               </View>
            )}

            {/* --- 4. MULTAS TAB --- */}
            {activeTab === 'fines' && <FinesTabContent fines={fines} loading={loadingFines} onRefresh={() => loadExtras(vehicle.plate, vehicle.id)} />}
          </View>
        </ScrollView>

        {/* --- MODALES --- */}
        <AssignDeviceModal visible={showAssignDeviceModal} vehicleId={vehicle.id} vehicleName={vehicle.name} onClose={() => setShowAssignDeviceModal(false)} onSuccess={() => { setShowAssignDeviceModal(false); handleRefresh(); }} />

        {/* Modal Crear Plan */}
        <Modal visible={showAddScheduleModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Nuevo Recordatorio</Text>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput style={styles.input} placeholder="Ej. Cambio de Aceite" value={scheduleForm.name} onChangeText={t => setScheduleForm({...scheduleForm, name: t})}/>
                    <Text style={styles.label}>Frecuencia (Km)</Text>
                    <TextInput style={styles.input} placeholder="10000" keyboardType="numeric" value={scheduleForm.interval_km} onChangeText={t => setScheduleForm({...scheduleForm, interval_km: t})}/>
                    <View style={{flexDirection:'row', gap:10}}>
                        <View style={{flex:1}}><Text style={styles.label}>Ultimo Km</Text><TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={scheduleForm.last_service_odometer} onChangeText={t => setScheduleForm({...scheduleForm, last_service_odometer: t})}/></View>
                        <View style={{flex:1}}><Text style={styles.label}>Ultima Fecha</Text><TextInput style={styles.input} placeholder="YYYY-MM-DD" value={scheduleForm.last_service_date} onChangeText={t => setScheduleForm({...scheduleForm, last_service_date: t})}/></View>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateSchedule} disabled={uploading}>
                         {uploading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>Guardar Plan</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setShowAddScheduleModal(false)} style={{alignItems:'center', marginTop:15}}><Text style={{color:'#6b7280'}}>Cancelar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Modal Registrar Gasto */}
        <Modal visible={showRegisterMaintModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Registrar Mantenimiento</Text>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput style={styles.input} value={expenseForm.description} onChangeText={t => setExpenseForm({...expenseForm, description: t})}/>
                    <View style={{flexDirection:'row', gap:10}}>
                         <View style={{flex:1}}><Text style={styles.label}>Costo ($)</Text><TextInput style={styles.input} keyboardType="numeric" value={expenseForm.amount} onChangeText={t => setExpenseForm({...expenseForm, amount: t})}/></View>
                         <View style={{flex:1}}><Text style={styles.label}>Km Actual</Text><TextInput style={styles.input} keyboardType="numeric" value={expenseForm.current_odometer} onChangeText={t => setExpenseForm({...expenseForm, current_odometer: t})}/></View>
                    </View>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('expense')}>
                         <Text style={{color:'#4b5563'}}>Subir Ticket/Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleRegisterExpense} disabled={uploading}>
                         {uploading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>Guardar y Cerrar</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setShowRegisterMaintModal(false)} style={{alignItems:'center', marginTop:15}}><Text style={{color:'#6b7280'}}>Cancelar</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Modal Póliza (CON FEEDBACK VISUAL y LIMPIEZA) */}
        <Modal visible={showPolicyModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Renovar Póliza</Text>
                        <TouchableOpacity onPress={()=>setShowPolicyModal(false)}><Ionicons name="close" size={24} color="#6b7280"/></TouchableOpacity>
                    </View>
                    
                    <Text style={styles.label}>Aseguradora</Text>
                    <TextInput style={styles.input} value={policyForm.insurance_company} onChangeText={t => setPolicyForm({...policyForm, insurance_company: t})} placeholder="Ej. AXA"/>
                    
                    <Text style={styles.label}>No. Póliza</Text>
                    <TextInput style={styles.input} value={policyForm.policy_number} onChangeText={t => setPolicyForm({...policyForm, policy_number: t})} placeholder="XXX-XXX"/>
                    
                    <Text style={styles.label}>Nueva Fecha Vencimiento</Text>
                    <TextInput style={styles.input} value={policyForm.policy_expiry} onChangeText={t => setPolicyForm({...policyForm, policy_expiry: t})} placeholder="YYYY-MM-DD"/>
                    
                    <Text style={styles.label}>Costo Renovación ($)</Text>
                    <TextInput style={styles.input} value={policyForm.amount} onChangeText={t => setPolicyForm({...policyForm, amount: t})} placeholder="0.00" keyboardType="numeric"/>
                    
                    {/* Botón con Feedback visual */}
                    <TouchableOpacity 
                        style={[styles.uploadBtn, policyForm.policy_document ? {backgroundColor: '#ecfdf5', borderColor: '#10b981'} : {}]} 
                        onPress={() => pickImage('policy')}
                    >
                        <Ionicons 
                            name={policyForm.policy_document ? "checkmark-circle" : "cloud-upload"} 
                            size={20} 
                            color={policyForm.policy_document ? "#10b981" : "#6b7280"}
                        />
                        <Text style={{marginLeft: 8, color: policyForm.policy_document ? '#065f46' : '#4b5563', fontWeight: policyForm.policy_document ? '600' : '400'}}>
                            {policyForm.policy_document ? "Documento Listo" : "Subir Documento (PDF/Foto)"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePolicy} disabled={uploading}>
                        {uploading ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold'}}>Guardar Renovación</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* FEEDBACK MODAL (NUEVO) */}
        <FeedbackModal 
            visible={feedback.visible}
            type={feedback.type}
            title={feedback.title}
            message={feedback.message}
            onClose={closeFeedback}
        />

      </View>
    </MainLayout>
  );
}

// --- TUS COMPONENTES ORIGINALES ---

const InfoTabContent = ({ vehicle, onUnassignDriver }: any) => (
  <View style={styles.grid}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Datos Técnicos</Text>
      <View style={styles.infoRow}>
        <InfoItem label="Tipo" value={vehicleService.getTypeLabel(vehicle.type)} icon="options-outline" />
        <InfoItem label="Odómetro" value={`${vehicle.odometer?.toLocaleString() || 0} km`} icon="speedometer-outline" />
      </View>
      <View style={{height:1, backgroundColor:'#f3f4f6', marginVertical:12}} />
      <View style={styles.infoRow}>
        <InfoItem label="VIN / Serie" value={vehicle.vin || 'No registrado'} icon="barcode-outline" />
        <InfoItem label="Año" value={vehicle.year?.toString()} icon="calendar-outline" />
      </View>
    </View>

    <View style={styles.card}>
      <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:16}}>
        <Text style={styles.cardTitle}>Conductor Asignado</Text>
        {vehicle.driver && (<TouchableOpacity onPress={onUnassignDriver}><Text style={{color:'#ef4444', fontWeight:'600'}}>Desasignar</Text></TouchableOpacity>)}
      </View>
      {vehicle.driver && vehicle.driver.account ? (
        <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
          <View style={{width:48, height:48, borderRadius:24, backgroundColor:'#dbeafe', alignItems:'center', justifyContent:'center'}}>
            <Text style={{fontSize:18, fontWeight:'bold', color:'#1e40af'}}>{vehicle.driver.account.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={{fontWeight:'600', color:'#1f2937'}}>{vehicle.driver.account.name}</Text>
            <Text style={{fontSize:13, color:'#6b7280'}}>{vehicle.driver.account.email}</Text>
          </View>
        </View>
      ) : (
        <View style={{alignItems:'center', padding:20}}><Text style={{color:'#9ca3af'}}>Sin conductor</Text></View>
      )}
    </View>
  </View>
);

const GpsTabContent = ({ vehicle, onAssign, onUnassign }: any) => {
  const hasDevice = !!vehicle.device;
  const isOnline = vehicle.device?.is_online;
  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:16}}>
          <Text style={styles.cardTitle}>Dispositivo GPS</Text>
          {hasDevice ? <TouchableOpacity onPress={onUnassign}><Text style={{color:'#ef4444'}}>Desvincular</Text></TouchableOpacity> : <TouchableOpacity onPress={onAssign}><Text style={{color:'#226bfc'}}>Vincular</Text></TouchableOpacity>}
        </View>
        {hasDevice ? (
          <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
            <View style={{width:48, height:48, borderRadius:24, backgroundColor: isOnline ? '#10b981' : '#9ca3af', alignItems:'center', justifyContent:'center'}}>
              <Ionicons name="wifi" size={24} color="#fff" />
            </View>
            <View>
              <Text style={{fontWeight:'600'}}>{isOnline ? 'Conectado' : 'Desconectado'}</Text>
              <Text style={{fontSize:13, color:'#6b7280'}}>IMEI: {vehicle.device.imei}</Text>
            </View>
          </View>
        ) : <View style={{alignItems:'center', padding:20}}><Text style={{color:'#9ca3af'}}>Sin dispositivo</Text></View>}
      </View>
    </View>
  );
};

const FinesTabContent = ({ fines, loading, onRefresh }: any) => {
  if (loading) return <ActivityIndicator color="#226bfc" />;
  if (fines.length === 0) return <View style={styles.emptyCard}><Text style={{color:'#6b7280'}}>Sin multas registradas.</Text><TouchableOpacity onPress={onRefresh}><Text style={{color:'#226bfc', marginTop:8}}>Verificar</Text></TouchableOpacity></View>;
  return (
    <View>
      {fines.map((fine: Fine, index: number) => (
        <View key={index} style={[styles.card, {flexDirection:'row', marginBottom:10}]}>
          <View style={{width:4, backgroundColor: fine.estatus === 'PAGADA' ? '#10b981' : '#ef4444', marginRight:12}} />
          <View style={{flex:1}}>
             <Text style={{fontWeight:'bold', color:'#374151'}}>Folio: {fine.folio}</Text>
             <Text style={{fontSize:13, color:'#6b7280'}}>{fine.motivo}</Text>
             <Text style={{fontSize:14, fontWeight:'bold', marginTop:4}}>{fineService.formatMonto(fine.monto)}</Text>
          </View>
          <View><Text style={{fontSize:11, fontWeight:'bold', color: fine.estatus === 'PAGADA' ? '#10b981' : '#ef4444'}}>{fine.estatus}</Text></View>
        </View>
      ))}
    </View>
  );
};

// --- COMPONENTES GESTIÓN ---

const ScheduleCard = ({ schedule, currentOdometer, onRegister }: { schedule: MaintenanceSchedule, currentOdometer: number, onRegister: () => void }) => {
    const nextKm = schedule.last_service_odometer + schedule.interval_km;
    const remaining = nextKm - currentOdometer;
    const progress = Math.min(Math.max(((currentOdometer - schedule.last_service_odometer) / schedule.interval_km) * 100, 0), 100);
    
    let color = '#10b981'; 
    let status = 'A tiempo';
    if (remaining <= 0) { color = '#ef4444'; status = 'Vencido'; }
    else if (remaining < 1000) { color = '#f59e0b'; status = 'Próximo'; }

    return (
        <View style={styles.card}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
                <Text style={{fontSize:15, fontWeight:'bold', color:'#374151'}}>{schedule.name}</Text>
                <View style={{backgroundColor: color+'20', paddingHorizontal:6, borderRadius:4}}>
                    <Text style={{color: color, fontSize:10, fontWeight:'bold'}}>{status}</Text>
                </View>
            </View>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end'}}>
                <View style={{flex:1, marginRight:12}}>
                    <Text style={{fontSize:12, color:'#6b7280'}}>
                        {remaining > 0 ? `Faltan ${remaining.toLocaleString()} km` : `Vencido por ${Math.abs(remaining).toLocaleString()} km`}
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={{fontSize:10, color:'#9ca3af'}}>Intervalo: {schedule.interval_km.toLocaleString()} km</Text>
                </View>
                <TouchableOpacity style={styles.actionBtnSmall} onPress={onRegister}>
                    <Text style={styles.actionBtnText}>Registrar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const InsuranceCard = ({ vehicle, history, onRenew }: any) => (
    <View style={styles.card}>
        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:12}}>
            <View style={{flexDirection:'row', gap:8, alignItems:'center'}}>
                <Ionicons name="shield-checkmark" size={20} color="#8b5cf6"/>
                <Text style={styles.cardTitle}>Póliza de Seguro</Text>
            </View>
            <TouchableOpacity onPress={onRenew}><Text style={{color:'#226bfc', fontSize:12, fontWeight:'600'}}>Renovar</Text></TouchableOpacity>
        </View>
        <View style={{backgroundColor:'#f9fafb', padding:12, borderRadius:8}}>
             <Text style={{fontSize:11, color:'#6b7280'}}>Póliza Actual</Text>
             <Text style={{fontSize:16, fontWeight:'bold', color:'#1f2937'}}>{vehicle.policy_number || '---'}</Text>
             <Text style={{fontSize:12, color:'#4b5563'}}>{vehicle.insurance_company}</Text>
        </View>
    </View>
);

// Helpers
const TabButton = ({ label, icon, active, onPress, badge }: any) => (
  <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
    <Ionicons name={icon} size={18} color={active ? '#226bfc' : '#6b7280'} />
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    {badge && <View style={{backgroundColor:'#ef4444', borderRadius:8, paddingHorizontal:4, marginLeft:4}}><Text style={{color:'#fff', fontSize:10}}>{badge}</Text></View>}
  </TouchableOpacity>
);
const InfoItem = ({ label, value, icon }: any) => (
  <View style={{flex:1, flexDirection:'row', gap:10, marginBottom:10}}>
    <View style={{width:36, height:36, borderRadius:8, backgroundColor:'#f9fafb', alignItems:'center', justifyContent:'center'}}><Ionicons name={icon} size={18} color="#9ca3af" /></View>
    <View><Text style={{fontSize:12, color:'#6b7280'}}>{label}</Text><Text style={{fontWeight:'500', color:'#1f2937'}}>{value}</Text></View>
  </View>
);
const StatusBadge = ({ status }: { status: string }) => (
    <View style={{backgroundColor:'#f3f4f6', paddingHorizontal:8, paddingVertical:4, borderRadius:12}}>
        <Text style={{fontSize:11, fontWeight:'600', color:'#374151'}}>{vehicleService.getStatusLabel(status)}</Text>
    </View>
);

// Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 20 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  heroCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowOpacity: 0.05, elevation: 2 },
  heroLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  heroSubtitle: { fontSize: 14, color: '#6b7280' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 4 },
  tabBtnActive: { backgroundColor: '#fff', elevation: 1 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#226bfc' },
  tabContent: { flex: 1 },
  grid: { gap: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  addBtnSmall: { backgroundColor: '#226bfc', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  infoRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  progressBarBg: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginVertical: 6, width: '100%' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  actionBtnSmall: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { color: '#226bfc', fontWeight: '600', fontSize: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  historyText: { fontSize: 13, color: '#374151', flex: 1 },
  historyDate: { fontSize: 11, color: '#9ca3af' },
  emptyCard: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 450, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight:'500' },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#226bfc', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent:'center', padding: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, marginBottom: 12 }
});