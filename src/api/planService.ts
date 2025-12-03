// src/api/planService.ts - VERSIÓN PARA BACKEND REAL

import apiClient from './client';

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  max_vehicles: number;
  max_users: number;
  features: string[];
  is_active: boolean;
  trial_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
}

class PlanService {
  /**
   * Obtener todos los planes activos
   */
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Plan[] }>('/billing/plans/get-all-plan');
      
      // Validar que la respuesta tenga datos
      const plans = response.data || response || [];
      
      console.log('📊 Planes obtenidos del backend:', plans);
      
      return Array.isArray(plans) ? plans : [];
    } catch (error: any) {
      console.error('❌ Error getting plans:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener planes');
    }
  }

  /**
   * Obtener un plan específico
   */
  async getPlan(id: number): Promise<Plan> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Plan }>(
        `/plans/${id}`
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting plan:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener plan');
    }
  }

  /**
   * Comparar planes
   */
  async comparePlans(planIds: number[]): Promise<{
    plans: Plan[];
    comparison: Record<string, any>;
  }> {
    try {
      const response = await apiClient.post('/plans/compare', { plan_ids: planIds });
      return response;
    } catch (error: any) {
      console.error('❌ Error comparing plans:', error);
      throw new Error(error.response?.data?.message || 'Error al comparar planes');
    }
  }

  /**
   * Calcular precio con descuentos
   * IMPORTANTE: Asegura que todos los valores sean números
   */
  calculatePrice(plan: Plan, billingCycle: 'monthly' | 'annual'): {
    basePrice: number;
    discount: number;
    finalPrice: number;
    savings: number;
  } {
    // Convertir a número y manejar valores inválidos
    const basePrice = Number(plan?.price) || 0;
    
    let discount = 0;
    let finalPrice = basePrice;

    if (billingCycle === 'annual') {
      // 2 meses gratis en plan anual (16.67% descuento)
      discount = basePrice * 2; // 2 meses gratis
      finalPrice = basePrice * 10; // Solo pagas 10 meses
    }

    // Asegurar que todos los valores sean números válidos
    const result = {
      basePrice: Number(basePrice) || 0,
      discount: Number(discount) || 0,
      finalPrice: Number(finalPrice) || 0,
      savings: Number(discount) || 0,
    };

    console.log('💰 Precio calculado:', {
      plan: plan?.name,
      billingCycle,
      result
    });

    return result;
  }

  /**
   * Formatear features de un plan
   */
  formatFeatures(plan: Plan): PlanFeature[] {
    if (!plan?.features || !Array.isArray(plan.features)) {
      return [];
    }

    return plan.features.map((feature) => ({
      name: feature,
      description: '',
      included: true,
    }));
  }

  /**
   * Obtener plan recomendado según cantidad de vehículos
   */
  async getRecommendedPlan(vehicleCount: number): Promise<Plan | null> {
    try {
      const plans = await this.getPlans();
      const activePlans = plans
        .filter((p) => p.is_active)
        .sort((a, b) => (a.price || 0) - (b.price || 0));

      for (const plan of activePlans) {
        if (vehicleCount <= (plan.max_vehicles || 0)) {
          return plan;
        }
      }

      // Si ninguno es suficiente, retornar el más grande
      return activePlans[activePlans.length - 1] || null;
    } catch (error) {
      console.error('Error getting recommended plan:', error);
      return null;
    }
  }
}

export default new PlanService();