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
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import vehicleService, { CreateVehicleRequest, VEHICLE_TYPES, VEHICLE_BRANDS } from '../../api/vehicleService';
import driverService, { Driver } from '../../api/driverService';
import deviceService, { Device } from '../../api/deviceService';

export default function VehicleFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 1. RECUPERAR PARÁMETROS
  const params = route.params as { mode: 'create' | 'edit'; vehicleId?: number } | undefined;
  const mode = params?.mode || 'create';
  const vehicleId = params?.vehicleId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [odometer, setOdometer] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
  
  // ✅ CORRECCIÓN 1: Inicializar con string vacío para evitar warning "value prop should not be null"
  const [driverId, setDriverId] = useState<number | string>(''); 
  const [deviceId, setDeviceId] = useState<number | string>('');

  // Listas para los selectores
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar catálogos
      const [driversRes, devicesRes] = await Promise.allSettled([
        driverService.getAvailableDrivers(),
        deviceService.getAvailableDevices()
      ]);

      const drivers = driversRes.status === 'fulfilled' ? driversRes.value : [];
      const devices = devicesRes.status === 'fulfilled' ? devicesRes.value : [];
      
      setAvailableDrivers(drivers);
      setAvailableDevices(devices);

      // SI ES EDICIÓN: CARGAR DATOS
      if (mode === 'edit' && vehicleId) {
        console.log('✏️ Modo Edición: Cargando vehículo...', vehicleId);
        const vehicle = await vehicleService.getVehicle(vehicleId);
        
        setName(vehicle.name);
        setPlate(vehicle.plate);
        setVin(vehicle.vin || '');
        setType(vehicle.type || '');
        setBrand(vehicle.brand || '');
        setModel(vehicle.model || '');
        setYear(vehicle.year ? String(vehicle.year) : '');
        setOdometer(vehicle.odometer ? String(vehicle.odometer) : '');
        setStatus(vehicle.status);
        
        // ✅ CORRECCIÓN 2: Si es null, lo pasamos a '' para el Picker
        setDriverId(vehicle.driver_id || '');
        setDeviceId(vehicle.device_id || '');

        // Agregar conductor actual a la lista si existe
        if (vehicle.driver) {
           const exists = drivers.find(d => d.id === vehicle.driver?.id);
           if (!exists) {
             setAvailableDrivers(prev => [vehicle.driver!, ...prev]);
           }
        }
      }

    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar los datos: ' + err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !plate.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa el Nombre y la Placa.');
      return;
    }

    try {
      setSaving(true);
      
      // ✅ CORRECCIÓN 3: Convertir strings vacíos a undefined/null para enviar al backend
      const finalDriverId = driverId === '' ? undefined : Number(driverId);
      const finalDeviceId = deviceId === '' ? undefined : Number(deviceId);

      const data: CreateVehicleRequest = {
        name: name.trim(),
        plate: vehicleService.formatPlate(plate),
        vin: vin.trim() || undefined,
        type: type || undefined,
        brand: brand || undefined,
        model: model.trim() || undefined,
        year: year ? parseInt(year) : undefined,
        odometer: odometer ? parseInt(odometer) : undefined,
        status,
        driver_id: finalDriverId,
        device_id: finalDeviceId,
      };

      console.log('📤 Enviando datos:', data);

      if (mode === 'create') {
        await vehicleService.createVehicle(data);
        Alert.alert('Éxito', 'Vehículo creado correctamente');
      } else if (vehicleId) {
        await vehicleService.updateVehicle(vehicleId, data);
        Alert.alert('Éxito', 'Vehículo actualizado correctamente');
      }
      
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#226bfc" />
        <Text style={{marginTop: 10, color: '#6b7280'}}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'create' ? 'Nuevo Vehículo' : 'Editar Vehículo'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderBtn}>
          {saving ? <ActivityIndicator color="#226bfc" /> : <Text style={styles.saveHeaderText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* PREVIEW PLACA */}
        <View style={styles.platePreviewContainer}>
          <View style={styles.plateFrame}>
            <View style={styles.plateHeader} />
            <Text style={styles.plateText}>
              {plate.length > 0 ? plate.toUpperCase() : 'AAA-000'}
            </Text>
          </View>
          <Text style={styles.helperText}>{mode === 'edit' ? 'Editando unidad' : 'Vista previa de la placa'}</Text>
        </View>

        {/* SECCIÓN 1: IDENTIDAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IDENTIDAD</Text>
          <View style={styles.card}>
            <InputGroup 
              label="Nombre / Alias" 
              placeholder="Ej. Unidad 01" 
              value={name} 
              onChangeText={setName} 
              icon="car-sport-outline"
            />
            <InputGroup 
              label="Placas" 
              placeholder="Ej. JRV1138" 
              value={plate} 
              onChangeText={(t) => setPlate(t.toUpperCase())} 
              icon="grid-outline"
            />
            <InputGroup 
              label="VIN (Opcional)" 
              placeholder="Número de serie" 
              value={vin} 
              onChangeText={(t) => setVin(t.toUpperCase())} 
              maxLength={17}
              icon="barcode-outline"
              last
            />
          </View>
        </View>

        {/* SECCIÓN 2: DETALLES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETALLES TÉCNICOS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Marca</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={brand} onValueChange={setBrand} style={styles.picker}>
                    <Picker.Item label="Seleccionar" value="" color="#9ca3af" />
                    {VEHICLE_BRANDS.map(b => <Picker.Item key={b} label={b} value={b} />)}
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
                    <Picker.Item label="Seleccionar" value="" color="#9ca3af" />
                    {VEHICLE_TYPES.map(t => <Picker.Item key={t.value} label={t.label} value={t.value} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <View style={{ flex: 2, marginRight: 12 }}> 
                <InputGroup 
                  label="Modelo" 
                  placeholder="Ej. Versa" 
                  value={model} 
                  onChangeText={setModel} 
                  noMargin 
                />
              </View>
              <View style={{ flex: 1 }}> 
                <InputGroup 
                  label="Año" 
                  placeholder="2024" 
                  value={year} 
                  onChangeText={setYear} 
                  keyboardType="numeric" 
                  maxLength={4} 
                  noMargin 
                />
              </View>
            </View>
          </View>
        </View>

        {/* SECCIÓN 3: OPERACIÓN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OPERACIÓN Y ASIGNACIÓN</Text>
          <View style={styles.card}>
            
            <View style={styles.formItem}>
              <Text style={styles.label}>Estado del Vehículo</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                  <Picker.Item label="🟢 Activo" value="active" />
                  <Picker.Item label="🔴 Inactivo" value="inactive" />
                  <Picker.Item label="🟠 Mantenimiento" value="maintenance" />
                </Picker>
              </View>
            </View>

            <View style={[styles.formItem, { marginTop: 16 }]}>
              <Text style={styles.label}>Conductor Asignado</Text>
              <View style={styles.pickerWrapper}>
                <Picker 
                  selectedValue={driverId} 
                  onValueChange={setDriverId} 
                  style={styles.picker}
                >
                  {/* ✅ CORRECCIÓN 4: value="" en lugar de null */}
                  <Picker.Item label="Sin conductor" value="" color="#9ca3af" />
                  {availableDrivers.map(d => (
                    <Picker.Item key={d.id} label={d.account?.name || `ID: ${d.id}`} value={d.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.formItem, { marginTop: 16 }]}>
              <Text style={styles.label}>Dispositivo GPS</Text>
              <View style={styles.pickerWrapper}>
                <Picker 
                  selectedValue={deviceId} 
                  onValueChange={setDeviceId} 
                  style={styles.picker}
                >
                   {/* ✅ CORRECCIÓN 5: value="" en lugar de null */}
                  <Picker.Item label="Sin dispositivo" value="" color="#9ca3af" />
                  {availableDevices.map(d => (
                    <Picker.Item key={d.id} label={`${d.imei} (${d.model || 'GPS'})`} value={d.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <InputGroup 
                label="Odómetro Actual (km)" 
                placeholder="0" 
                value={odometer} 
                onChangeText={setOdometer} 
                keyboardType="numeric" 
                icon="speedometer-outline"
                last
              />
            </View>

          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FOOTER FLOTANTE (Solo Móvil) */}
      {Platform.OS !== 'web' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Guardar Cambios</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// --- SUBCOMPONENTES ---
const InputGroup = ({ label, placeholder, value, onChangeText, icon, keyboardType, maxLength, last, noMargin }: any) => (
  <View style={[styles.inputContainer, !last && !noMargin && { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12, marginBottom: 12 }]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      {icon && <Ionicons name={icon} size={20} color="#9ca3af" style={{ marginRight: 10 }} />}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#d1d5db"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 60, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
  },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  saveHeaderBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  saveHeaderText: { color: '#226bfc', fontWeight: 'bold', fontSize: 16 },
  content: { padding: 20, paddingBottom: 100 },
  platePreviewContainer: { alignItems: 'center', marginBottom: 24 },
  plateFrame: {
    backgroundColor: '#fff', borderWidth: 4, borderColor: '#1f2937', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', minWidth: 180,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4
  },
  plateHeader: { width: 40, height: 4, backgroundColor: '#fbbf24', borderRadius: 2, marginBottom: 6 },
  plateText: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  helperText: { marginTop: 8, fontSize: 12, color: '#9ca3af' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  inputContainer: {},
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 16, color: '#1f2937', padding: 0 },
  row: { flexDirection: 'row' },
  formItem: {},
  pickerWrapper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb', overflow: 'hidden' },
  picker: { height: Platform.OS === 'web' ? 45 : 50, width: '100%' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb'
  },
  footerBtn: {
    backgroundColor: '#226bfc', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#226bfc', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  footerBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});