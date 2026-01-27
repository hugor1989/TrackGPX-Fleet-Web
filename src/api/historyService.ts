import apiClient from './client';

export interface Position {
  id: number;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  ignition: boolean;
  timestamp: string;
  address?: string;
  attributes?: any; // Batería, combustible, etc.
}

export interface RouteResponse {
  success: boolean;
  count: number;
  data: Position[];
}

class HistoryService {
  async getRoute(vehicleId: number, date: string): Promise<Position[]> {
    // date formato: 'YYYY-MM-DD'
    const response = await apiClient.get<RouteResponse>(`/billing/history/route`, {
      params: { vehicle_id: vehicleId, date }
    });
    return response.data;
  }
}

export default new HistoryService();