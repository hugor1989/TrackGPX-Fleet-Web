import apiClient from './client';

export interface StopRecord {
  id: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time: string;
  duration: string;
  address?: string;
}

// 2. AGREGA ESTA NUEVA (Describe la respuesta completa del Backend)
export interface StopsResponse {
  success: boolean;
  meta: {
    vehicle: string;  // Ej: "Chevrolet JRV1138"
    driver: string;   // Ej: "Juan Pérez"
    date: string;     // Ej: "2026-01-16"
  };
  count: number;
  data: StopRecord[]; // <--- Aquí reutilizamos tu interfaz vieja
}

// INTERFAZ ACTUALIZADA CON TIEMPOS
export interface MileageRecord {
  vehicle_id: number;
  vehicle_name: string;
  driver_name: string;
  distance_km: number;
  max_speed: number;
  avg_speed: number;
  fuel_consumption: string;
  moving_time: string;  // Nuevo
  stopped_time: string; // Nuevo
}
// --- NUEVA INTERFAZ PARA RANKING ---
export interface DriverRankingRecord {
  vehicle: string;
  driver: string;
  score: number;       // 0 a 100
  grade: string;       // A, B, C, F
  events: {
    overspeed: number;
    braking: number;
    geofence: number;
  };
}
export interface ExpenseRecord {
  id: number;
  vehicle: string;
  date: string;
  type: string;
  type_raw: string; // Para colores
  amount: number;
  description: string;
}

export interface FinancialResponse {
  success: boolean;
  summary: {
    total: number;
    fuel: number;
    maintenance: number;
    others: number;
  };
  data: ExpenseRecord[];
}
class ReportService {
  async getStops(vehicleId: number, date: string, minMinutes: number = 5): Promise<StopsResponse[]> {
    const response = await apiClient.get<any>(`/billing/reports/stops`, {
      params: { vehicle_id: vehicleId, date, min_minutes: minMinutes }
    });

    console.log("Respuesta de getStops:", response.data); // <--- Loguea la respuesta completa
    return response.data;
  }

    async getMileage(startDate: string, endDate: string, vehicleId?: number | null): Promise<MileageRecord[]> {
    const params: any = { start_date: startDate, end_date: endDate };
    if (vehicleId) params.vehicle_id = vehicleId;

    const response = await apiClient.get<any>(`/billing/reports/mileage`, { params });
    // Soporte robusto: devuelve data.data o data directo
    return response.data || response.data || [];
  }

  // 3. NUEVO: Reporte de Conductores (Ranking)
  async getDriverRanking(startDate: string, endDate: string): Promise<DriverRankingRecord[]> {
    const params = { start_date: startDate, end_date: endDate };
    
    // Llamada limpia al endpoint
    const response = await apiClient.get<any>('/billing/reports/drivers/ranking', { params });
    
    // Retornamos el array de datos
    return response.data || [];
  }

  async getFinancialReport(startDate: string, endDate: string, vehicleId?: string): Promise<FinancialResponse | null> {
    const params: any = { start_date: startDate, end_date: endDate };
    if (vehicleId) params.vehicle_id = vehicleId;

    const response = await apiClient.get<FinancialResponse>('/billing/reports/financial/expenses', { params });
    return response;
  }

  
}

export default new ReportService();