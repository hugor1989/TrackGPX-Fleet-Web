// src/api/fineService.ts
import axios from 'axios';

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

const MULTAS_API_BASE = 'http://localhost:3002';

class FineService {
  /**
   * Buscar multas por placa
   */
  async searchByPlate(plate: string): Promise<Fine[]> {
    try {
      console.log('🚨 Buscando multas para placa:', plate);

      const cleanPlate = plate.replace(/[-\s]/g, '').toUpperCase();

      const response = await axios.post<FineSearchResponse>(
        `${MULTAS_API_BASE}/api/multas`,
        {
          placa: cleanPlate,
          estado: 'jalisco'
        }
      );

      console.log('📋 Respuesta API multas:', response.data);

      if (response.data.success && response.data.multas) {
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

  /**
   * NO EXISTE EN TU API — la dejo solo por si luego la implementas
   */
  async getFineDetails(folio: string): Promise<Fine | null> {
    console.warn("⚠️ Endpoint /infracciones/detalle/:folio NO existe en tu API Node.");
    return null;
  }

  /**
   * Calcular estadísticas de multas
   */
  calculateFineStats(fines: Fine[]) {
    const pendientes = fines.filter(f =>
      f.estatus.toLowerCase().includes('pendiente')
    );

    const pagadas = fines.filter(f =>
      f.estatus.toLowerCase().includes('pagad')
    );

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

  formatMonto(monto: string): string {
    const amount = parseFloat(monto.replace(/[^0-9.-]/g, '')) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  }

  formatDate(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return fecha;
    }
  }

  getStatusColor(estatus: string): string {
    const statusLower = estatus.toLowerCase();

    if (statusLower.includes('pendiente')) return '#ef4444';
    if (statusLower.includes('pagad')) return '#10b981';

    return '#6b7280';
  }

  getStatusBackground(estatus: string): string {
    const statusLower = estatus.toLowerCase();

    if (statusLower.includes('pendiente')) return '#fee2e2';
    if (statusLower.includes('pagad')) return '#dcfce7';

    return '#f3f4f6';
  }

  isPending(fine: Fine): boolean {
    return fine.estatus.toLowerCase().includes('pendiente');
  }

  isPaid(fine: Fine): boolean {
    return fine.estatus.toLowerCase().includes('pagad');
  }
}

export default new FineService();
