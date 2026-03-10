// src/api/vehicleService.ts

import apiClient from './client';


class sharedLinkService {
  /**
   * Obtener todos los vehículos
   */
  


  async generateLink(vehicleId: number | string, hours: number = 24) {
        try {
            console.log('🔗 Generando link para vehículo:', vehicleId);
            
            // Usamos apiClient en lugar de axios directo
            const response = await apiClient.post('/admin/shared-links', {
                vehicle_id: vehicleId,
                hours: hours
            });

            // Si tu API envuelve todo en un objeto { success, data }
            // retornamos response.data.data o simplemente response.data
            return response || response;
            
        } catch (error: any) {
            console.error("❌ Error en sharedLinkService.generateLink:", error);
            // Mismo manejo de errores que tus otras funciones
            throw new Error(error.response?.data?.message || 'Error al generar link');
        }
    }

}

export default new sharedLinkService();