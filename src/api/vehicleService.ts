// src/api/vehicleService.ts

import apiClient from './client';

export interface Vehicle {
  id: number;
  company_id: number;
  driver_id: number | null;
  name: string;
  plate: string;
  vin: string | null;
  type: string | null; // sedan, suv, pickup, van, etc.
  brand: string | null;
  model: string | null;
  year: number | null;
  odometer: number | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  
  // Relaciones
  driver?: {
    id: number;
    account_id: number;
    company_id: number;
    license_number: string | null;
    phone: string | null;
    emergency_contact: string | null;
    created_at: string;
    updated_at: string;
    account?: {
      id: number;
      name: string;
      email: string;
    };
  };
  device?: {
    id: number;
    imei: string;
    status: string;
    is_online: boolean;
  };
  current_assignment?: VehicleAssignment;
}

export interface VehicleAssignment {
  id: number;
  vehicle_id: number;
  driver_id: number;
  assigned_from: string;
  assigned_to: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  driver?: {
    id: number;
    account: {
      name: string;
      email: string;
    };
  };
}

export interface CreateVehicleRequest {
  name: string;
  plate: string;
  vin?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  odometer?: number;
  status?: 'active' | 'inactive' | 'maintenance';
  driver_id?: number;
  device_id?: number;
}

export interface UpdateVehicleRequest {
  name?: string;
  plate?: string;
  vin?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  odometer?: number;
  status?: 'active' | 'inactive' | 'maintenance';
  driver_id?: number;
  device_id?: number;
}

export interface VehicleStats {
  total: number;
  active: number;
  with_gps: number;
  with_driver: number;
  in_maintenance: number;
}

export const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'sedan', label: 'Sedán' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Camión' },
  { value: 'motorcycle', label: 'Motocicleta' },
  { value: 'other', label: 'Otro' },
];

export const VEHICLE_BRANDS = [
  'Chevrolet', 'Ford', 'Nissan', 'Toyota', 'Honda',
  'Volkswagen', 'Mazda', 'Hyundai', 'Kia', 'Jeep',
  'RAM', 'GMC', 'Dodge', 'Chrysler', 'Mitsubishi',
  'Suzuki', 'Peugeot', 'Renault', 'Seat', 'Otro'
];

class VehicleService {
  /**
   * Obtener todos los vehículos
   */
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Vehicle[] }>(
        '/vehicles/get-all'
      );
      
      console.log('🚗 Vehículos obtenidos:', response.data || response);
      
      return Array.isArray(response.data) ? response.data : (response.data || []);
    } catch (error: any) {
      console.error('❌ Error getting vehicles:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener vehículos');
    }
  }

  /**
   * Obtener un vehículo por ID
   */
  async getVehicle(id: number): Promise<Vehicle> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Vehicle }>(
        `/vehicles/get-by-id/${id}`
      );
      
      console.log('🚗 Vehículo obtenido:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting vehicle:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener vehículo');
    }
  }

  /**
   * Crear vehículo
   */
  async createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
    try {
      console.log('➕ Creando vehículo:', data);
      
      const response = await apiClient.post<{ success: boolean; data: Vehicle }>(
        '/vehicles/create-vehicles',
        data
      );
      
     //console.log('✅ Vehículo creado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error creating vehicle:', error);
      throw new Error(error.response?.data?.message || 'Error al crear vehículo');
    }
  }

  /**
   * Actualizar vehículo
   */
  async updateVehicle(id: number, data: UpdateVehicleRequest): Promise<Vehicle> {
    try {
      console.log('📝 Actualizando vehículo:', id, data);
      
      const response = await apiClient.put<{ success: boolean; data: Vehicle }>(
        `/vehicles/update-vehicles/${id}`,
        data
      );
      
      console.log('✅ Vehículo actualizado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating vehicle:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar vehículo');
    }
  }

  /**
   * Eliminar vehículo
   */
  async deleteVehicle(id: number): Promise<void> {
    try {
      console.log('🗑️ Eliminando vehículo:', id);
      
      await apiClient.delete(`/vehicles/${id}`);
      
      console.log('✅ Vehículo eliminado');
    } catch (error: any) {
      console.error('❌ Error deleting vehicle:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar vehículo');
    }
  }

  /**
   * Asignar conductor a vehículo
   */
  async assignDriver(vehicleId: number, driverId: number): Promise<VehicleAssignment> {
    try {
      console.log('👤 Asignando conductor:', vehicleId, driverId);
      
      const response = await apiClient.post<{ success: boolean; data: VehicleAssignment }>(
        `/vehicles/assign/${vehicleId}/assign-driver`,
        { driver_id: driverId }
      );
      
      console.log('✅ Conductor asignado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error assigning driver:', error);
      throw new Error(error.response?.data?.message || 'Error al asignar conductor');
    }
  }

  /**
   * Desasignar conductor de vehículo
   */
  async unassignDriver(vehicleId: number): Promise<void> {
    try {
      console.log('👤 Desasignando conductor:', vehicleId);
      
      await apiClient.delete(`/vehicles/unassig/${vehicleId}/assign-driver`);
      
      console.log('✅ Conductor desasignado');
    } catch (error: any) {
      console.error('❌ Error unassigning driver:', error);
      throw new Error(error.response?.data?.message || 'Error al desasignar conductor');
    }
  }

  /**
   * Asignar dispositivo GPS a vehículo
   */
  async assignDevice(vehicleId: number, deviceId: number): Promise<void> {
    try {
      console.log('📡 Asignando GPS:', vehicleId, deviceId);
      
      const response = await apiClient.post(
        `/vehicles/assignD/${vehicleId}/assign-device`,
        { device_id: deviceId }
      );
      
      return response.data || response;
      console.log('✅ GPS asignado');
    } catch (error: any) {
      console.error('❌ Error assigning device:', error);
      throw new Error(error.response?.data?.message || 'Error al asignar GPS');
    }
  }

  /**
   * Desasignar dispositivo GPS de vehículo
   */
  async unassignDevice(vehicleId: number): Promise<void> {
    try {
      console.log('📡 Desasignando GPS:', vehicleId);
      
      await apiClient.delete(`/vehicles/unassignD/${vehicleId}/assign-device`);
      
      console.log('✅ GPS desasignado');
    } catch (error: any) {
      console.error('❌ Error unassigning device:', error);
      throw new Error(error.response?.data?.message || 'Error al desasignar GPS');
    }
  }

  /**
   * Obtener estadísticas de vehículos
   */
  async getVehicleStats(): Promise<VehicleStats> {
    try {
      const vehicles = await this.getVehicles();
      
      const stats: VehicleStats = {
        total: vehicles.length,
        active: vehicles.filter(v => v.status === 'active').length,
        with_gps: vehicles.filter(v => v.device).length,
        with_driver: vehicles.filter(v => v.driver_id).length,
        in_maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      };
      
      return stats;
    } catch (error: any) {
      console.error('❌ Error getting vehicle stats:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  }

  /**
   * Validar placa mexicana
   */
  validatePlate(plate: string): boolean {
    // Formato mexicano: ABC-123-DEF o ABC1234
    const plateRegex = /^[A-Z]{3}-?\d{3,4}-?[A-Z]{0,3}$/i;
    return plateRegex.test(plate.replace(/\s/g, ''));
  }

  /**
   * Formatear placa
   */
  formatPlate(plate: string): string {
    return plate.toUpperCase().replace(/\s/g, '');
  }
getStatusConfig(status: string) {
  switch (status) {
    case 'active': return { bg: '#dcfce7', color: '#166534' };
    case 'inactive': return { bg: '#fee2e2', color: '#991b1b' };
    case 'maintenance': return { bg: '#ffedd5', color: '#9a3412' };
    default: return { bg: '#f3f4f6', color: '#374151' };
  }
}
  /**
   * Validar VIN
   */
  validateVIN(vin: string): boolean {
    // VIN es de 17 caracteres
    return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
  }

  /**
   * Obtener label de estado
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      maintenance: 'Mantenimiento',
    };
    return labels[status] || status;
  }

  /**
   * Obtener color de estado
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10b981',
      inactive: '#6b7280',
      maintenance: '#f59e0b',
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Obtener background de estado
   */
  getStatusBackground(status: string): string {
    const backgrounds: Record<string, string> = {
      active: '#dcfce7',
      inactive: '#f3f4f6',
      maintenance: '#fef3c7',
    };
    return backgrounds[status] || '#f3f4f6';
  }

  /**
   * Formatear tipo de vehículo
   */
  getTypeLabel(type: string | null): string {
    if (!type) return 'Sin especificar';
    const vehicleType = VEHICLE_TYPES.find(t => t.value === type);
    return vehicleType ? vehicleType.label : type;
  }
}

export default new VehicleService();