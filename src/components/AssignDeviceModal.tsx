import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import deviceService from '../api/deviceService';
import vehicleService from '../api/vehicleService';

// Interfaces basadas en tu código actual
interface Device {
  id: number;
  imei: string;
  status: string;
  is_online: boolean;
  model?: string;
  manufacturer?: string;
}

interface AssignDeviceModalProps {
  visible: boolean;
  vehicleId: number;
  vehicleName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignDeviceModal({
  visible,
  vehicleId,
  vehicleName,
  onClose,
  onSuccess,
}: AssignDeviceModalProps) {
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Cargar dispositivos al abrir
  useEffect(() => {
    if (visible) {
      loadAvailableDevices();
      setSearchQuery(''); // Limpiar búsqueda al abrir
    }
  }, [visible]);

  const loadAvailableDevices = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtenemos todos y filtramos en el cliente (o usa un endpoint específico si lo tienes)
      const allDevices = await deviceService.getAvailableDevices(); 
      // Nota: Si tu servicio no tiene 'getAvailableDevices', usa la lógica de filtro que tenías:
      // const allDevices = await deviceService.getDevices();
      // const available = allDevices.filter(d => !d.vehicle_id && d.status === 'active');
      
      setDevices(allDevices);
    } catch (err: any) {
      setError('No se pudieron cargar los dispositivos disponibles.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (deviceId: number) => {
    try {
      setAssigning(true);
      
      // Llamada a tu servicio
      const res = await vehicleService.assignDevice(vehicleId, deviceId);
      
      // Validación flexible según lo que retorne tu backend (booleano u objeto)
      if (res || res?.success) {
        Alert.alert('Éxito', 'Dispositivo GPS asignado correctamente', [
          { 
            text: 'OK', 
            onPress: () => {
              onSuccess();
              onClose();
            }
          }
        ]);
      } else {
        throw new Error('La respuesta del servidor no fue exitosa');
      }

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al asignar el dispositivo');
    } finally {
      setAssigning(false);
    }
  };

  // Filtrado local para el buscador
  const filteredDevices = devices.filter(d => 
    d.imei.includes(searchQuery) || 
    (d.model && d.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.manufacturer && d.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={styles.deviceItem} 
      onPress={() => handleAssign(item.id)}
      disabled={assigning}
    >
      <View style={styles.deviceIcon}>
        <Ionicons name="hardware-chip-outline" size={24} color="#226bfc" />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceImei}>{item.imei}</Text>
        <Text style={styles.deviceMeta}>
          {item.manufacturer} {item.model} • <Text style={{color: item.is_online ? '#10b981' : '#9ca3af'}}>{item.is_online ? 'Online' : 'Offline'}</Text>
        </Text>
      </View>
      <View style={styles.assignAction}>
        <Ionicons name="add-circle" size={28} color="#226bfc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        {/* Al tocar el fondo oscuro, se cierra */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Header Visual */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <View style={styles.headerTop}>
              <Text style={styles.title}>Vincular GPS</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Asignando a: <Text style={styles.highlight}>{vehicleName}</Text>
            </Text>
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar IMEI o Modelo..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Contenido */}
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#226bfc" />
              <Text style={styles.loadingText}>Buscando dispositivos...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadAvailableDevices}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredDevices.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No se encontraron resultados' : 'No hay dispositivos libres'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDevices}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderDeviceItem}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Overlay de carga al asignar */}
          {assigning && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.assigningText}>Asignando...</Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  highlight: {
    color: '#226bfc',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    margin: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceImei: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  deviceMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  assignAction: {
    padding: 4,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginVertical: 12,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  retryText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#1f2937',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  assigningText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});