import apiClient from './client';

// Tipos de Alerta (Igual que en BD)
export type AlertType = 
  | 'geofence_enter' | 'geofence_exit' 
  | 'overspeed' | 'stop_duration' 
  | 'harsh_acceleration' | 'harsh_braking' | 'harsh_turn'
  | 'power_cut' | 'low_battery_vehicle' | 'low_battery_device' | 'sos_button' | 'jamming' | 'towing' | 'door_open'
  | 'ignition_on' | 'ignition_off'
  | 'sensor_fuel_drop' | 'sensor_temperature' | 'maintenance_due';

export interface AlertRule {
  id: number;
  name: string;
  type: AlertType;
  geofence_id?: number;
  geofence?: { id: number; name: string }; // Relación
  value?: number;
  notification_settings: {
    push: boolean;
    email: boolean;
    emails?: string[];
  };
  schedule_settings?: {
    enabled: boolean;
    start_time?: string;
    end_time?: string;
    days?: number[]; // 0=Domingo, 1=Lunes...
  };
  vehicles?: { id: number; plate: string; brand: string; model: string }[];
  is_active: boolean;
  created_at: string;
}
export interface AlertLog {
  id: number;
  type: AlertType;
  message: string;
  vehicle?: { id: number; plate: string; brand: string; model: string };
  latitude?: number;
  longitude?: number;
  speed?: number;
  occurred_at: string; // Fecha ISO
  is_read: boolean;
}

// Params para filtrar (Tipo, Vehículo, Solo No Leídas)
export interface AlertLogParams {
  type?: AlertType;
  vehicle_id?: number;
  unread_only?: boolean;
  page?: number;
}

export interface CreateAlertRequest {
  name: string;
  type: AlertType;
  vehicle_ids: number[];
  geofence_id?: number;
  value?: number;
  notification_settings: {
    push: boolean;
    email: boolean;
    emails?: string[]; // Opcional: lista de correos extra
  };
  schedule_settings?: any; // Opcional
}

class AlertService {
  async getAlerts(): Promise<AlertRule[]> {
    const response = await apiClient.get<{ success: boolean; data: AlertRule[] }>('/billing/alerts/get-all');
    return response.data;
  }

  async createAlert(data: CreateAlertRequest): Promise<AlertRule> {
    const response = await apiClient.post<{ success: boolean; data: AlertRule }>('/billing/alerts/create', data);
    return response.data;
  }

  async deleteAlert(id: number): Promise<void> {
    await apiClient.delete(`/alerts/${id}`);
  }

  async toggleAlert(id: number): Promise<AlertRule> {
    const response = await apiClient.patch<{ success: boolean; data: AlertRule }>(`/billing/alerts/update-toggle/${id}/toggle`);
    return response.data;
  }

  async getAlertLogs(params: AlertLogParams = {}): Promise<{ data: AlertLog[], current_page: number, last_page: number }> {
    // Convertimos params a query string
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.vehicle_id) query.append('vehicle_id', params.vehicle_id.toString());
    if (params.unread_only) query.append('unread_only', 'true');
    if (params.page) query.append('page', params.page.toString());

    const response = await apiClient.get<any>(`/billing/alert-logs/get-all?${query.toString()}`);
    return response.data; // Asumiendo que Laravel regresa el objeto paginado directo
  }

  async markAsRead(id: number): Promise<void> {
    await apiClient.post(`/billing/alert-logs/reading/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.post(`/billing/alert-logs/mark-all-read`);
  }
}

export default new AlertService();