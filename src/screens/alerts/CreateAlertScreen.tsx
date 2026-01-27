import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import alertService, { CreateAlertRequest, AlertType } from '../../api/alertService';
import geofenceService, { Geofence } from '../../api/geofenceService';
import vehicleService from '../../api/vehicleService'; 

// --- CATEGORÍAS ---
const ALERT_TYPES_GROUPS = [
  {
    title: 'Geocercas y Rutas',
    data: [
      { type: 'geofence_exit', label: 'Salida de Zona', icon: 'log-out-outline', color: '#f59e0b' },
      { type: 'geofence_enter', label: 'Entrada a Zona', icon: 'log-in-outline', color: '#226bfc' },
    ]
  },
  {
    title: 'Seguridad y Hardware',
    data: [
      { type: 'power_cut', label: 'Corte de Corriente', icon: 'flash-off', color: '#dc2626' },
      { type: 'jamming', label: 'Detección de Jammer', icon: 'radio', color: '#7c3aed' },
      { type: 'towing', label: 'Movimiento sin Motor', icon: 'car-sport', color: '#be123c' },
      { type: 'sos_button', label: 'Botón de Pánico', icon: 'alert-circle', color: '#ef4444' },
      { type: 'low_battery_vehicle', label: 'Batería Baja', icon: 'battery-dead', color: '#ea580c' },
    ]
  },
  {
    title: 'Conducción y Uso',
    data: [
      { type: 'overspeed', label: 'Exceso de Velocidad', icon: 'speedometer', color: '#ef4444' },
      { type: 'stop_duration', label: 'Parada Larga (Ralentí)', icon: 'timer', color: '#6366f1' },
      { type: 'ignition_on', label: 'Motor Encendido', icon: 'key', color: '#10b981' },
      { type: 'maintenance_due', label: 'Mantenimiento', icon: 'build', color: '#059669' },
    ]
  }
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'M' },
  { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' },
  { id: 0, label: 'D' }
];

export default function CreateAlertScreen() {
  const navigation = useNavigation();

  // Datos
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Formulario
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [geofenceId, setGeofenceId] = useState<number | null>(null);
  const [value, setValue] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
  
  // Notificaciones
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  // --- NUEVO: HORARIOS ---
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1,2,3,4,5]); // Lunes a Viernes default
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // UI
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estado para el Modal de Éxito/Error
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', message: '' });

  // Carga Inicial
  useEffect(() => {
    const init = async () => {
      try {
        const [vData, gData] = await Promise.all([
          vehicleService.getVehicles(), 
          geofenceService.getGeofences()
        ]);
        setVehicles(vData || []);
        setGeofences(gData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    init();
  }, []);

  // Helpers UI
  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    if (modalConfig.type === 'success') {
      navigation.goBack();
    }
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const toggleAllVehicles = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(vehicles.map(v => v.id));
    }
  };

  const toggleVehicle = (id: number) => {
    if (selectedVehicles.includes(id)) setSelectedVehicles(selectedVehicles.filter(v => v !== id));
    else setSelectedVehicles([...selectedVehicles, id]);
  };

  // GUARDAR
  const handleSave = async () => {
    if (!name.trim()) return showModal('error', 'Falta Nombre', 'Asigna un nombre a la regla.');
    if (!selectedType) return showModal('error', 'Falta Tipo', 'Selecciona el tipo de alerta.');
    if (selectedVehicles.length === 0) return showModal('error', 'Sin Vehículos', 'Selecciona al menos un vehículo.');

    // Validaciones Específicas
    if ((selectedType.includes('geofence')) && !geofenceId) return showModal('error', 'Falta Zona', 'Selecciona una geocerca.');
    if ((selectedType === 'overspeed' || selectedType === 'stop_duration') && !value) return showModal('error', 'Falta Valor', 'Ingresa el límite.');

    // Validación Horario
    if (scheduleEnabled && selectedDays.length === 0) {
       return showModal('error', 'Horario Inválido', 'Selecciona al menos un día para el horario.');
    }

    try {
      setSaving(true);
      
      const payload: CreateAlertRequest = {
        name,
        type: selectedType,
        vehicle_ids: selectedVehicles,
        notification_settings: {
          push: pushEnabled,
          email: emailEnabled
        },
        geofence_id: geofenceId || undefined,
        value: value ? parseFloat(value) : undefined,
        
        // ✅ AQUÍ ENVIAMOS EL HORARIO
        schedule_settings: scheduleEnabled ? {
          enabled: true,
          days: selectedDays,
          start_time: startTime,
          end_time: endTime
        } : null
      };

      await alertService.createAlert(payload);
      showModal('success', '¡Alerta Creada!', 'La regla se ha configurado y activado correctamente.');
      
    } catch (error: any) {
      showModal('error', 'Error', error.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout activeMenu="Alertas">
      <View style={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
          <Text style={styles.pageTitle}>Nueva Regla de Alerta</Text>
        </View>

        {loadingData ? (
          <ActivityIndicator size="large" color="#226bfc" style={{ marginTop: 50 }} />
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.content}>
              
              {/* TIPO Y NOMBRE */}
              <View style={styles.section}>
                <Text style={styles.label}>Tipo de Alerta</Text>
                <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowTypeModal(true)}>
                  {selectedType ? (
                    <Text style={styles.selectorTextSelected}>
                      {ALERT_TYPES_GROUPS.flatMap(g => g.data).find(t => t.type === selectedType)?.label}
                    </Text>
                  ) : (
                    <Text style={styles.selectorTextPlaceholder}>Selecciona un tipo...</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>

                <Text style={styles.label}>Nombre de la Regla</Text>
                <TextInput style={styles.input} placeholder="Ej. Exceso Velocidad Ruta Norte" value={name} onChangeText={setName} />
              </View>

              {/* CONFIGURACIÓN */}
              {selectedType && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Configuración</Text>
                  
                  {(selectedType.includes('geofence')) && (
                    <View>
                      <Text style={styles.label}>Selecciona la Zona</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.geoScroll}>
                        {geofences.map(geo => (
                          <TouchableOpacity
                            key={geo.id}
                            style={[styles.geoChip, geofenceId === geo.id && styles.geoChipSelected, { borderColor: geo.color || '#226bfc' }]}
                            onPress={() => setGeofenceId(geo.id)}
                          >
                            <Ionicons name={geo.type === 'circle' ? 'ellipse' : 'shapes'} size={14} color={geofenceId === geo.id ? '#fff' : geo.color || '#226bfc'} />
                            <Text style={[styles.geoChipText, geofenceId === geo.id && { color: '#fff' }]}>{geo.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {selectedType === 'overspeed' && (
                    <View>
                      <Text style={styles.label}>Límite de Velocidad (km/h)</Text>
                      <TextInput style={styles.input} placeholder="Ej. 110" keyboardType="numeric" value={value} onChangeText={setValue} />
                    </View>
                  )}

                  {selectedType === 'stop_duration' && (
                    <View>
                      <Text style={styles.label}>Minutos permitidos</Text>
                      <TextInput style={styles.input} placeholder="Ej. 15" keyboardType="numeric" value={value} onChangeText={setValue} />
                    </View>
                  )}
                </View>
              )}

              {/* HORARIOS */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <Text style={styles.sectionTitle}>Restricción de Horario</Text>
                  <Switch value={scheduleEnabled} onValueChange={setScheduleEnabled} trackColor={{true: '#bfdbfe'}} thumbColor={scheduleEnabled ? '#226bfc' : '#f3f4f6'} />
                </View>
                
                {scheduleEnabled && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Días Activos</Text>
                    <View style={styles.daysRow}>
                      {DAYS_OF_WEEK.map(day => (
                        <TouchableOpacity 
                          key={day.id} 
                          style={[styles.dayCircle, selectedDays.includes(day.id) && styles.dayCircleSelected]}
                          onPress={() => toggleDay(day.id)}
                        >
                          <Text style={[styles.dayText, selectedDays.includes(day.id) && { color: '#fff' }]}>{day.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Desde</Text>
                        <TextInput style={styles.inputTime} value={startTime} onChangeText={setStartTime} placeholder="00:00" maxLength={5} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Hasta</Text>
                        <TextInput style={styles.inputTime} value={endTime} onChangeText={setEndTime} placeholder="23:59" maxLength={5} />
                      </View>
                    </View>
                    <Text style={styles.helper}>La alerta SOLO se disparará dentro de este horario.</Text>
                  </View>
                )}
              </View>

              {/* VEHÍCULOS */}
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.sectionTitle}>Vehículos</Text>
                  <TouchableOpacity onPress={toggleAllVehicles}>
                    <Text style={styles.linkText}>{selectedVehicles.length === vehicles.length ? 'Ninguno' : 'Todos'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.vehicleList}>
                  {vehicles.map(v => (
                    <TouchableOpacity key={v.id} style={[styles.vehicleItem, selectedVehicles.includes(v.id) && styles.vehicleItemSelected]} onPress={() => toggleVehicle(v.id)}>
                      <Ionicons name={selectedVehicles.includes(v.id) ? "checkbox" : "square-outline"} size={20} color={selectedVehicles.includes(v.id) ? "#226bfc" : "#9ca3af"} />
                      <Text style={styles.vehicleText}>{v.brand} {v.model} - {v.plate}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* NOTIFICACIONES */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notificaciones</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Notificación Push</Text>
                  <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{true: '#bfdbfe'}} thumbColor={pushEnabled ? '#226bfc' : '#f3f4f6'} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Correo Electrónico</Text>
                  <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{true: '#fde047'}} thumbColor={emailEnabled ? '#ca8a04' : '#f3f4f6'} />
                </View>
              </View>
              
              <View style={{height: 100}} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Regla</Text>}
          </TouchableOpacity>
        </View>

        {/* MODAL DE TIPOS */}
        <Modal visible={showTypeModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tipo de Alerta</Text>
                <TouchableOpacity onPress={() => setShowTypeModal(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
              </View>
              <FlatList
                data={ALERT_TYPES_GROUPS}
                keyExtractor={(item) => item.title}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.groupTitle}>{item.title}</Text>
                    {item.data.map((typeItem) => (
                      <TouchableOpacity key={typeItem.type} style={styles.modalTypeItem} onPress={() => { setSelectedType(typeItem.type as any); setShowTypeModal(false); if(!name) setName(typeItem.label); }}>
                         <View style={[styles.iconBox, { backgroundColor: typeItem.color + '20' }]}>
                            <Ionicons name={typeItem.icon as any} size={20} color={typeItem.color} />
                         </View>
                         <Text style={styles.modalTypeText}>{typeItem.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* ✅ MODAL DE ÉXITO / ERROR (PREMIUM) */}
        {modalVisible && (
          <View style={styles.modalOverlayAlert}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIcon, { backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
                <Ionicons name={modalConfig.type === 'success' ? 'checkmark' : 'alert'} size={32} color={modalConfig.type === 'success' ? '#166534' : '#991b1b'} />
              </View>
              <Text style={styles.modalTitleAlert}>{modalConfig.title}</Text>
              <Text style={styles.modalDescAlert}>{modalConfig.message}</Text>
              <TouchableOpacity 
                style={[styles.modalBtnAlert, { backgroundColor: modalConfig.type === 'success' ? '#226bfc' : '#ef4444' }]}
                onPress={closeModal}
              >
                <Text style={styles.modalBtnTextAlert}>{modalConfig.type === 'success' ? 'Aceptar' : 'Cerrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  
  content: { padding: 20 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 6, marginTop: 4 },
  
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 16 },
  selectorTextPlaceholder: { color: '#9ca3af', fontSize: 16 },
  selectorTextSelected: { color: '#1f2937', fontSize: 16, fontWeight: '500' },

  // Horarios
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  dayCircleSelected: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  dayText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  timeRow: { flexDirection: 'row', gap: 16 },
  inputTime: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, textAlign: 'center', fontSize: 16 },
  helper: { fontSize: 12, color: '#9ca3af', marginTop: 8, fontStyle: 'italic' },

  // Geofence
  geoScroll: { flexDirection: 'row', paddingVertical: 8 },
  geoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, backgroundColor: '#fff' },
  geoChipSelected: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  geoChipText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },

  // Vehicles
  linkText: { color: '#226bfc', fontWeight: '600', fontSize: 13 },
  vehicleList: { marginTop: 8 },
  vehicleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  vehicleItemSelected: { backgroundColor: '#eff6ff' },
  vehicleText: { fontSize: 14, color: '#374151' },

  // Switches
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { fontSize: 14, color: '#374151' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e5e7eb' },
  saveBtn: { backgroundColor: '#226bfc', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  groupTitle: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  modalTypeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalTypeText: { flex: 1, fontSize: 16, color: '#374151' },

  // Estilos del Modal Alerta (Popup Éxito)
  modalOverlayAlert: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: 320, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  modalIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitleAlert: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' },
  modalDescAlert: { textAlign: 'center', color: '#6b7280', marginBottom: 24 },
  modalBtnAlert: { width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnTextAlert: { color: '#fff', fontWeight: 'bold' }
});