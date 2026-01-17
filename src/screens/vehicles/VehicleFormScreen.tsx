// src/screens/vehicles/VehicleFormScreen.tsx

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
  const params = route.params as { mode: 'create' | 'edit'; vehicleId?: number } | undefined;

  const mode = params?.mode || 'create';
  const vehicleId = params?.vehicleId;

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Campos del formulario
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [odometer, setOdometer] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<number | null>(null);

  // Listas
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar conductores y dispositivos disponibles
      const [drivers, devices] = await Promise.all([
        driverService.getAvailableDrivers(),
        deviceService.getAvailableDevices()
      ]);
      
      setAvailableDrivers(drivers);
      setAvailableDevices(devices);

      // Si es edición, cargar datos del vehículo
      if (mode === 'edit' && vehicleId) {
        const vehicle = await vehicleService.getVehicle(vehicleId);
        setName(vehicle.name);
        setPlate(vehicle.plate);
        setVin(vehicle.vin || '');
        setType(vehicle.type || '');
        setBrand(vehicle.brand || '');
        setModel(vehicle.model || '');
        setYear(vehicle.year?.toString() || '');
        setOdometer(vehicle.odometer?.toString() || '');
        setStatus(vehicle.status);
        setDriverId(vehicle.driver_id);
        setDeviceId(vehicle.device_id || null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }

    if (!plate.trim()) {
      Alert.alert('Error', 'Las placas son requeridas');
      return false;
    }

    if (!vehicleService.validatePlate(plate)) {
      Alert.alert('Error', 'Formato de placa inválido (ej: ABC-123-XYZ)');
      return false;
    }

    if (vin && !vehicleService.validateVIN(vin)) {
      Alert.alert('Error', 'VIN debe tener 17 caracteres');
      return false;
    }

    if (year && (parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1)) {
      Alert.alert('Error', 'Año inválido');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError('');

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
        driver_id: driverId || undefined,
        device_id: deviceId || undefined,
      };

      if (mode === 'create') {
        await vehicleService.createVehicle(data);
        
        // Primero navegar de regreso
        navigation.goBack();
        
        // Luego mostrar el alert con un pequeño delay
        setTimeout(() => {
          Alert.alert('Éxito', 'Vehículo creado correctamente');
        }, 100);
        
      } else if (vehicleId) {
        await vehicleService.updateVehicle(vehicleId, data);
        
        // Primero navegar de regreso
        navigation.goBack();
        
        // Luego mostrar el alert con un pequeño delay
        setTimeout(() => {
          Alert.alert('Éxito', 'Vehículo actualizado correctamente');
        }, 100);
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'create' ? 'Nuevo Vehículo' : 'Editar Vehículo'}
          </Text>
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
        <Text style={styles.headerTitle}>
          {mode === 'create' ? 'Nuevo Vehículo' : 'Editar Vehículo'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Formulario */}
        <View style={styles.form}>
          {/* Nombre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Nombre / Alias <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="ej: Camioneta 1"
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>

          {/* Placas */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Placas <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="ej: ABC-123-XYZ"
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
              editable={!saving}
            />
            <Text style={styles.hint}>Formato: ABC-123-XYZ o ABC1234</Text>
          </View>

          {/* VIN */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>VIN (Número de Serie)</Text>
            <TextInput
              style={styles.input}
              placeholder="17 caracteres"
              value={vin}
              onChangeText={setVin}
              autoCapitalize="characters"
              maxLength={17}
              editable={!saving}
            />
          </View>

          {/* Tipo */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tipo de Vehículo</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={setType}
                enabled={!saving}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar..." value="" />
                {VEHICLE_TYPES.map((t) => (
                  <Picker.Item key={t.value} label={t.label} value={t.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Marca */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Marca</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={brand}
                onValueChange={setBrand}
                enabled={!saving}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar..." value="" />
                {VEHICLE_BRANDS.map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Modelo y Año */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: F-150"
                value={model}
                onChangeText={setModel}
                editable={!saving}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Año</Text>
              <TextInput
                style={styles.input}
                placeholder="2024"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
                editable={!saving}
              />
            </View>
          </View>

          {/* Odómetro */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Odómetro (km)</Text>
            <TextInput
              style={styles.input}
              placeholder="15000"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
              editable={!saving}
            />
          </View>

          {/* Estado */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={(value) => setStatus(value as any)}
                enabled={!saving}
                style={styles.picker}
              >
                <Picker.Item label="Activo" value="active" />
                <Picker.Item label="Inactivo" value="inactive" />
                <Picker.Item label="Mantenimiento" value="maintenance" />
              </Picker>
            </View>
          </View>

          {/* Asignar Conductor */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Asignar Conductor</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={driverId}
                onValueChange={(value) => setDriverId(value as number | null)}
                enabled={!saving}
                style={styles.picker}
              >
                <Picker.Item label="Sin conductor" value={null} />
                {availableDrivers.map((driver) => (
                  <Picker.Item
                    key={driver.id}
                    label={driver.account?.name || `Conductor ${driver.id}`}
                    value={driver.id}
                  />
                ))}
              </Picker>
            </View>
            <Text style={styles.hint}>
              {availableDrivers.length === 0 
                ? 'No hay conductores disponibles'
                : `${availableDrivers.length} conductor(es) disponible(s)`
              }
            </Text>
          </View>

          {/* Asignar Dispositivo GPS */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Asignar Dispositivo GPS</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={deviceId}
                onValueChange={(value) => setDeviceId(value as number | null)}
                enabled={!saving}
                style={styles.picker}
              >
                <Picker.Item label="Sin dispositivo GPS" value={null} />
                {availableDevices.map((device) => (
                  <Picker.Item
                    key={device.id}
                    label={`${device.imei}${device.model ? ` - ${device.model}` : ''}`}
                    value={device.id}
                  />
                ))}
              </Picker>
            </View>
            <Text style={styles.hint}>
              {availableDevices.length === 0 
                ? 'No hay dispositivos GPS disponibles'
                : `${availableDevices.length} dispositivo(s) disponible(s)`
              }
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {mode === 'create' ? 'Crear Vehículo' : 'Guardar Cambios'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
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
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 16 : 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: { height: Platform.OS === 'web' ? 50 : 150 },
  buttonsContainer: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});