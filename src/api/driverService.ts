// src/api/driverService.ts

import apiClient from './client';

export interface Driver {
  id: number;
  account_id: number;
  company_id: number;
  license_number: string | null;
  phone: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  
  // Relación con account
  account?: {
    id: number;
    name: string;
    email: string;
  };
  
  // Vehículo asignado actualmente
  current_vehicle?: {
    id: number;
    name: string;
    plate: string;
    brand: string;
    model: string;
  } | null; // Puede ser null si no tiene asignado
}

export interface CreateDriverRequest {
  name: string;
  email: string;
  phone?: string;
  license_number?: string;
  emergency_contact?: string;
}

export interface UpdateDriverRequest {
  name?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  emergency_contact?: string;
}

class DriverService {
  /**
   * Obtener todos los conductores
   */
  async getDrivers(): Promise<Driver[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Driver[] }>(
        '/drivers/get-all'
      );
      
      console.log('👤 Conductores obtenidos:', response.data || response);
      
      return Array.isArray(response.data) ? response.data : (response.data || []);
    } catch (error: any) {
      console.error('❌ Error getting drivers:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener conductores');
    }
  }

  /**
   * Obtener conductores disponibles (sin vehículo asignado)
   */
  async getAvailableDrivers(): Promise<Driver[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Driver[] }>(
        '/drivers/available'
      );
      
      console.log('👤 Conductores disponibles:', response.data || response);
      
      return Array.isArray(response.data) ? response.data : (response.data || []);
    } catch (error: any) {
      console.error('❌ Error getting available drivers:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener conductores disponibles');
    }
  }

  /**
   * Obtener un conductor por ID
   */
  async getDriver(id: number): Promise<Driver> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Driver }>(
        `/drivers/get-by-id/${id}`
      );
      
      console.log('👤 Conductor obtenido:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting driver:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener conductor');
    }
  }

  /**
   * Crear conductor
   */
  async createDriver(data: CreateDriverRequest): Promise<Driver> {
    try {
      console.log('➕ Creando conductor:', data);
      
      const response = await apiClient.post<{ success: boolean; data: Driver }>(
        '/drivers/create-drivers',
        data
      );
      
      console.log('✅ Conductor creado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error creating driver:', error);
      throw new Error(error.response?.data?.message || 'Error al crear conductor');
    }
  }

  /**
   * Actualizar conductor
   */
  async updateDriver(id: number, data: UpdateDriverRequest): Promise<Driver> {
    try {
      console.log('📝 Actualizando conductor:', id, data);
      
      const response = await apiClient.put<{ success: boolean; data: Driver }>(
        `/drivers/${id}`,
        data
      );
      
      console.log('✅ Conductor actualizado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating driver:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar conductor');
    }
  }

  /**
   * Eliminar conductor
   */
  async deleteDriver(id: number): Promise<void> {
    try {
      console.log('🗑️ Eliminando conductor:', id);
      
      await apiClient.delete(`/drivers/${id}`);
      
      console.log('✅ Conductor eliminado');
    } catch (error: any) {
      console.error('❌ Error deleting driver:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar conductor');
    }
  }

  /**
   * Validar email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar teléfono mexicano
   */
  validatePhone(phone: string): boolean {
    // 10 dígitos para México
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10;
  }

  /**
   * Formatear teléfono
   */
  formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  }
}

export default new DriverService();