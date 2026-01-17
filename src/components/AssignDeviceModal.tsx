// src/components/AssignDeviceModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      loadAvailableDevices();
    }
  }, [visible]);

  const loadAvailableDevices = async () => {
    try {
      setLoading(true);
      setError('');

      // Importar el servicio de dispositivos
      const { default: deviceService } = await import('../api/deviceService');
      
      // Obtener dispositivos disponibles (sin vehículo asignado)
      const allDevices = await deviceService.getDevices();
      const available = allDevices.filter(d => !d.vehicle_id && d.status === 'active');
      
      setDevices(available);
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', 'No se pudieron cargar los dispositivos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDeviceId) {
      Alert.alert('Atención', 'Selecciona un dispositivo GPS');
      return;
    }

    try {
      setAssigning(true);
      
      // Importar el servicio de vehículos
      const { default: vehicleService } = await import('../api/vehicleService');
      
     const res =  await vehicleService.assignDevice(vehicleId, selectedDeviceId);
      
      if (!res) {
        Alert.alert('Éxito', 'Dispositivo GPS asignado correctamente', [
                { text: 'OK', onPress: () => {
                onSuccess();
                onClose();
                }}
            ]);      
        }else {
        console.log('✅ GPS asignado:', res);
      }
     
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Asignar Dispositivo GPS</Text>
            <TouchableOpacity onPress={onClose} disabled={assigning}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Info */}
          <View style={styles.vehicleInfo}>
            <Ionicons name="car-sport" size={24} color="#226bfc" />
            <Text style={styles.vehicleName}>{vehicleName}</Text>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#226bfc" />
              <Text style={styles.loadingText}>Cargando dispositivos...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadAvailableDevices}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>Sin dispositivos disponibles</Text>
              <Text style={styles.emptyText}>
                No hay dispositivos GPS disponibles para asignar. Todos los dispositivos ya están asignados a otros vehículos.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.devicesList}>
              <Text style={styles.devicesTitle}>
                Dispositivos disponibles ({devices.length})
              </Text>
              
              {devices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    selectedDeviceId === device.id && styles.deviceCardSelected,
                  ]}
                  onPress={() => setSelectedDeviceId(device.id)}
                  disabled={assigning}
                >
                  <View style={styles.deviceCardLeft}>
                    <View
                      style={[
                        styles.radioButton,
                        selectedDeviceId === device.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedDeviceId === device.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    
                    <View style={styles.deviceInfo}>
                      <View style={styles.deviceHeader}>
                        <Text style={styles.deviceImei}>IMEI: {device.imei}</Text>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: device.is_online ? '#10b981' : '#6b7280' },
                          ]}
                        />
                      </View>
                      
                      {(device.model || device.manufacturer) && (
                        <Text style={styles.deviceModel}>
                          {device.manufacturer} {device.model}
                        </Text>
                      )}
                      
                      <Text style={styles.deviceStatus}>
                        Estado: {device.is_online ? 'En línea' : 'Desconectado'}
                      </Text>
                    </View>
                  </View>
                  
                  <Ionicons
                    name="location"
                    size={24}
                    color={selectedDeviceId === device.id ? '#226bfc' : '#d1d5db'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          {!loading && !error && devices.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={assigning}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.assignButton,
                  (!selectedDeviceId || assigning) && styles.assignButtonDisabled,
                ]}
                onPress={handleAssign}
                disabled={!selectedDeviceId || assigning}
              >
                {assigning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.assignButtonText}>Asignar GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    flex: 1,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  devicesList: {
    flex: 1,
    padding: 20,
  },
  devicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deviceCardSelected: {
    borderColor: '#226bfc',
    backgroundColor: '#eff6ff',
  },
  deviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#226bfc',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#226bfc',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deviceImei: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceModel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  deviceStatus: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#226bfc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});