// src/api/deviceService.ts - VERSIÓN PARA BACKEND REAL

import apiClient from './client';

export interface Device {
  id: number;
  imei: string;
  serial_number: string;
  model: string;
  status: 'active' | 'inactive' | 'suspended';
  company_id: number;
  vehicle_id?: number;
  activation_code?: string;
  activated_at?: string;
  created_at: string;
  updated_at: string;
  manufacturer?: string;
  vehicle?: {
    id: number;
    name: string;
    plate: string;
  } | null;
  subscription_status?: string;
}

export interface ActivateDeviceRequest {
  imei: string;
  activation_code: string;
  plan_id: number;
  billing_cycle: 'monthly' | 'annual';
  card_id: string;
  device_session_id: string;
}

export interface ActivateDeviceResponse {
  success: boolean;
  message: string;
  data: {
    device: Device;
    subscription: any;
    payment: any;
  };
}

class DeviceService {
  /**
   * Obtener dispositivos disponibles para activar
   */
  async getAvailableDevices(): Promise<Device[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Device[] }>(
        '/billing/devices/available'
      );
      return response.data || response || [];
    } catch (error: any) {
      console.error('❌ Error getting available devices:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener dispositivos disponibles');
    }
  }

  /**
   * Obtener todos los dispositivos de la empresa
   */
  async getDevices(): Promise<Device[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Device[] }>('/billing/devices/devices-sinasignar');
      return response.data || response || [];
    } catch (error: any) {
      console.error('❌ Error getting devices:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener dispositivos');
    }
  }

  /**
   * Obtener un dispositivo específico
   */
  async getDevice(id: number): Promise<Device> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Device }>(
        `/devices/${id}`
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting device:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener dispositivo');
    }
  }

  /**
   * Obtener un dispositivo específico
   */
  async getAllDevices(): Promise<Device[]> {
    try {
      // ✅ CORRECCIÓN: Usar POST y la ruta correcta (asumiendo prefix 'devices' o 'activation')
      // Ajusta la URL '/devices/get-all-devices' según tu grupo de rutas en api.php
      const response = await apiClient.post<{ success: boolean; data: Device[] }>(
        '/billing/devices/get-all-devices' // ⚠️ Verifica el prefijo en tu routes/api.php
      );
      
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Error getting devices:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener dispositivos');
    }
  }


  /**
   * Preview de activación (validar IMEI y código antes de activar)
   */
  async previewActivation(imei: string, activationCode: string): Promise<Device> {
    try {
      console.log('🔍 Validando dispositivo:', { imei, activationCode });
      
      const response = await apiClient.get<{ success: boolean; data: Device }>(
        `/billing/devices/preview/${imei}`);
      
      console.log('✅ Dispositivo validado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error validating device:', error);
      throw new Error(error.response?.data?.message || 'Código de activación inválido');
    }
  }

  /**
   * Activar dispositivo con pago
   */
  async activateDevice(data: ActivateDeviceRequest): Promise<ActivateDeviceResponse> {
    try {
      console.log('🚀 Activando dispositivo:', data);
      
      const response = await apiClient.post<ActivateDeviceResponse>(
        '/billing/devices/activate',
        data
      );
      
      console.log('✅ Dispositivo activado:', response);
      
      return response;
    } catch (error: any) {
      console.error('❌ Error activating device:', error);
      throw new Error(error.response?.data?.message || 'Error al activar dispositivo');
    }
  }

  /**
   * Actualizar dispositivo
   */
  async updateDevice(id: number, data: Partial<Device>): Promise<Device> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Device }>(
        `/devices/${id}`,
        data
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating device:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar dispositivo');
    }
  }

  /**
   * Desactivar dispositivo
   */
  async deactivateDevice(id: number): Promise<void> {
    try {
      await apiClient.post(`/devices/${id}/deactivate`);
    } catch (error: any) {
      console.error('❌ Error deactivating device:', error);
      throw new Error(error.response?.data?.message || 'Error al desactivar dispositivo');
    }
  }

  /**
   * Asignar dispositivo a vehículo
   */
  async assignToVehicle(deviceId: number, vehicleId: number): Promise<Device> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Device }>(
        `/devices/${deviceId}/assign`,
        { vehicle_id: vehicleId }
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error assigning device:', error);
      throw new Error(error.response?.data?.message || 'Error al asignar dispositivo');
    }
  }

  /**
   * Desasignar dispositivo de vehículo
   */
  async unassignFromVehicle(deviceId: number): Promise<Device> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Device }>(
        `/devices/${deviceId}/unassign`
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error unassigning device:', error);
      throw new Error(error.response?.data?.message || 'Error al desasignar dispositivo');
    }
  }

  /**
   * Obtener historial de ubicaciones
   */
  async getLocationHistory(
    deviceId: number,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `/devices/${deviceId}/history`,
        {
          params: { start_date: startDate, end_date: endDate },
        }
      );
      return response.data || response || [];
    } catch (error: any) {
      console.error('❌ Error getting location history:', error);
      throw new Error(
        error.response?.data?.message || 'Error al obtener historial de ubicaciones'
      );
    }
  }
}

export default new DeviceService();