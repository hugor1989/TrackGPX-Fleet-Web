import axios from 'axios';
import apiClient from './client';

export interface Fine {
  folio: string;
  clave: string;
  motivo: string;
  fecha: string;
  hora: string;
  monto: string;
  estatus: string;
}

export interface FineSearchResponse {
  success: boolean;
  multas?: Fine[];
  estado?: string;
  placa?: string;
  total?: number;
  fechaConsulta?: string;
  message?: string;
}

// URL de tu Scraper (Robot)
const MULTAS_API_BASE = 'http://localhost:3002';

class FineService {
  /**
   * Buscar multas por placa y Sincronizar con Backend
   */
  async searchByPlate(plate: string): Promise<Fine[]> {
    try {
      console.log('🚨 Buscando multas en Robot para:', plate);

      const cleanPlate = plate.replace(/[-\s]/g, '').toUpperCase();

      // 1. CONSULTA AL ROBOT (Scraping)
      const response = await axios.post<FineSearchResponse>(
        `${MULTAS_API_BASE}/api/multas`,
        {
          placa: cleanPlate,
          estado: 'jalisco'
        }
      );

      console.log('📋 Respuesta Robot:', response.data);

      
      if (response.data.success && response.data.multas) {
        
        // ============================================================
        // 2. 🔌 SINCRONIZACIÓN: ENVIAR A LARAVEL PARA GUARDAR
        // ============================================================
        try {
            console.log("💾 Guardando en Base de Datos...");
            
            // Usamos el endpoint que creamos en el paso anterior
            await apiClient.post('/billing/webhooks/scraping/fines', {
                plate: cleanPlate,
                state: 'Jalisco',
                fines: response.data.multas // Enviamos el array tal cual
            });
            
            console.log("✅ ¡Sincronización exitosa con Laravel!");
            
        } catch (syncError) {
            // No detenemos la app si falla el guardado, solo avisamos
            console.error("⚠️ Error guardando en BD (pero mostramos resultados):", syncError);
        }
        // ============================================================

        return response.data.multas;
      }

      return [];
    } catch (error: any) {
      console.error('❌ Error searching fines:', error);

      if (error.response?.status === 404) {
        return [];
      }

      throw new Error(error.response?.data?.message || 'Error al buscar multas');
    }
  }

  // ... (El resto de tus métodos formatMonto, calculateFineStats, etc. se quedan igual) ...
  
  calculateFineStats(fines: Fine[]) {
    const pendientes = fines.filter(f => f.estatus.toLowerCase().includes('pendiente'));
    const pagadas = fines.filter(f => f.estatus.toLowerCase().includes('pagad'));

    const totalMonto = fines.reduce((sum, fine) => {
      const monto = parseFloat(fine.monto.replace(/[^0-9.-]/g, '')) || 0;
      return sum + monto;
    }, 0);

    const montoPendiente = pendientes.reduce((sum, fine) => {
      const monto = parseFloat(fine.monto.replace(/[^0-9.-]/g, '')) || 0;
      return sum + monto;
    }, 0);

    return {
      total: fines.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      totalMonto,
      montoPendiente,
    };
  }
  
  // ... resto de helpers de formato ...
  formatMonto(monto: string): string {
    const amount = parseFloat(monto.replace(/[^0-9.-]/g, '')) || 0;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }

  formatDate(fecha: string): string {
    try {
        if(!fecha) return '-';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return fecha; }
  }
  
  getStatusColor(estatus: string): string {
    if(!estatus) return '#6b7280';
    const s = estatus.toLowerCase();
    if (s.includes('pendiente')) return '#ef4444';
    if (s.includes('pagad')) return '#10b981';
    return '#6b7280';
  }

  getStatusBackground(estatus: string): string {
    if(!estatus) return '#f3f4f6';
    const s = estatus.toLowerCase();
    if (s.includes('pendiente')) return '#fee2e2';
    if (s.includes('pagad')) return '#dcfce7';
    return '#f3f4f6';
  }
}

export default new FineService();