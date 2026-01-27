import apiClient from './client';

// Interfaces de tipos para TypeScript
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Geofence {
  id: number;
  name: string;
  description?: string; // El backend nos mandará una generada
  type: 'circle' | 'polygon';
  
  // Coordenadas: Puede ser un objeto {lat, long} para circulo 
  // o un array de objetos para polígono
  coordinates: Coordinate | Coordinate[]; 
  
  radius?: number; // En metros (solo círculos)
  color?: string; // El backend nos mandará azul por defecto
  vehicles_count?: number;
  created_at: string;
}

export interface CreateGeofenceRequest {
  name: string;
  type: 'circle' | 'polygon';
  coordinates: Coordinate | Coordinate[];
  radius?: number;
  vehicle_ids?: number[]; // Opcional: Para asignar vehículos al crear
}

class GeofenceService {
  /**
   * Obtener todas las geocercas
   */
  async getGeofences(): Promise<Geofence[]> {
    try {
      // Petición GET al backend
      const response = await apiClient.get<{ success: boolean; data: Geofence[] }>('/geofences/get-all');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching geofences:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar geocercas');
    }
  }

  /**
   * Crear una nueva geocerca
   */
  async createGeofence(data: CreateGeofenceRequest): Promise<Geofence> {
    try {
      // Petición POST al backend
      const response = await apiClient.post<{ success: boolean; data: Geofence }>('/geofences/create', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating geofence:', error);
      throw new Error(error.response?.data?.message || 'Error al guardar la geocerca');
    }
  }

  /**
   * Eliminar una geocerca
   */
  async deleteGeofence(id: number): Promise<void> {
    try {
      // Petición DELETE al backend
      await apiClient.delete(`/geofences/${id}`);
    } catch (error: any) {
      console.error('Error deleting geofence:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar');
    }
  }
}

export default new GeofenceService();