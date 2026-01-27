// src/api/subscriptionService.ts

import apiClient from './client';

export interface Subscription {
  id: number;
  company_id: number;
  device_id: number;
  vehicle_id: number | null;
  plan_id: number;
  amount: string;
  billing_cycle: string;
  currency: string;
  status: 'active' | 'paused' | 'canceled' | 'expired';
  activated_at: string;
  start_date: string;
  end_date: string;
  next_billing_date: string | null;
  auto_renew: boolean;
  paused_at: string | null;
  paused_by: number | null;
  pause_reason: string | null;
  canceled_at: string | null;
  canceled_by: number | null;
  cancelation_reason: string | null;
  created_at: string;
  updated_at: string;
  
  // Campos calculados del backend
  days_to_billing: number;
  is_active: boolean;
  is_paused: boolean;
  is_canceled: boolean;
  total_with_tax: number;
  monthly_price: number;
  
  // Relaciones
  device?: {
    id: number;
    company_id: number;
    imei: string;
    activation_code: string;
    activated_at: string | null;
    serial_number: string | null;
    model: string | null;
    manufacturer: string | null;
    protocol: string | null;
    last_connection: string | null;
    firmware_version: string | null;
    status: string;
    vehicle_id: number | null;
    sim_id: number | null;
    created_at: string;
    updated_at: string;
    is_activated: boolean;
    is_online: boolean;
    vehicle?: {
      id: number;
      name: string;
      plates?: string;
    };
  };
  plan?: {
    id: number;
    openpay_plan_id: string;
    name: string;
    description: string;
    features: string[];
    status: string;
    sat_product_code: string;
    price: string;
    currency: string;
    interval: string; // 'month' | 'year'
    interval_count: number;
    max_vehicles: number;
    created_at: string;
    updated_at: string;
  };
}

export interface SubscriptionStats {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  total_monthly_cost: number;
}

class SubscriptionService {
  /**
   * Obtener todas las suscripciones
   */
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { 
          data: Subscription[];
          current_page: number;
          total: number;
        } 
      }>(
        '/billing/subscriptions/get-all-data'
      );
      
      console.log('📊 Suscripciones obtenidas:', response);
      
      // Manejar estructura paginada: response.data.data
      let subscriptions: Subscription[] = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        subscriptions = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        subscriptions = response.data;
      }
      
      console.log('📊 Suscripciones procesadas:', subscriptions.length);
      
      return subscriptions;
    } catch (error: any) {
      console.error('❌ Error getting subscriptions:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener suscripciones');
    }
  }

  /**
   * Obtener estadísticas de suscripciones
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    try {
      const subscriptions = await this.getSubscriptions();
      
      const stats: SubscriptionStats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.is_active).length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        cancelled: subscriptions.filter(s => s.is_canceled).length,
        total_monthly_cost: 0,
      };
      
      // Calcular costo mensual total
      subscriptions.forEach(sub => {
        if (sub.is_active && sub.plan) {
          // Si el plan es mensual, usar el precio directo
          // Si es anual, dividir entre 12
          const price = parseFloat(sub.plan.price);
          if (sub.plan.interval === 'month') {
            stats.total_monthly_cost += price;
          } else if (sub.plan.interval === 'year') {
            stats.total_monthly_cost += price / 12;
          }
        }
      });
      
      return stats;
    } catch (error: any) {
      console.error('❌ Error getting subscription stats:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(subscriptionId: number): Promise<void> {
    try {
      console.log('🚫 Cancelando suscripción:', subscriptionId);
      
      await apiClient.post(`/billing/subscriptions/${subscriptionId}/cancel`);
      
      console.log('✅ Suscripción cancelada');
    } catch (error: any) {
      console.error('❌ Error cancelling subscription:', error);
      throw new Error(error.response?.data?.message || 'Error al cancelar suscripción');
    }
  }

  /**
   * Reactivar suscripción
   */
  async reactivateSubscription(subscriptionId: number): Promise<void> {
    try {
      console.log('🔄 Reactivando suscripción:', subscriptionId);
      
      await apiClient.post(`/billing/subscriptions/${subscriptionId}/reactivate`);
      
      console.log('✅ Suscripción reactivada');
    } catch (error: any) {
      console.error('❌ Error reactivating subscription:', error);
      throw new Error(error.response?.data?.message || 'Error al reactivar suscripción');
    }
  }

  /**
   * Actualizar método de pago de suscripción
   */
  async updatePaymentMethod(subscriptionId: number, paymentMethodId: string): Promise<void> {
    try {
      console.log('💳 Actualizando método de pago:', subscriptionId, paymentMethodId);
      
      await apiClient.put(`/billing/subscriptions/${subscriptionId}/payment-method`, {
        payment_method_id: paymentMethodId,
      });
      
      console.log('✅ Método de pago actualizado');
    } catch (error: any) {
      console.error('❌ Error updating payment method:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar método de pago');
    }
  }

  /**
   * Formatear estado de suscripción
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activa',
      paused: 'Pausada',
      canceled: 'Cancelada',
      expired: 'Expirada',
    };
    return labels[status] || status;
  }

  /**
   * Obtener color del estado
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10b981',
      paused: '#f59e0b',
      canceled: '#6b7280',
      expired: '#ef4444',
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Obtener color de fondo del badge
   */
  getStatusBackground(status: string): string {
    const backgrounds: Record<string, string> = {
      active: '#dcfce7',
      paused: '#fef3c7',
      canceled: '#f3f4f6',
      expired: '#fee2e2',
    };
    return backgrounds[status] || '#f3f4f6';
  }

  /**
   * Formatear fecha
   */
  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calcular días restantes
   */
  getDaysRemaining(endDate: string): number {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatear precio
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  }
}

export default new SubscriptionService();