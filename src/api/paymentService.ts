// src/api/paymentService.ts - VERSIÓN PARA BACKEND REAL

import apiClient from './client';

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    holder_name: string;
  };
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  description: string;
  payment_method: string;
  created_at: string;
}

class PaymentService {
  /**
   * Obtener métodos de pago guardados
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { cards: PaymentMethod[] } }>(
        '/billing/payment-methods/get-all-cards'
      );
      
      console.log('💳 Response completo del backend:', response);
      
      // Intentar diferentes estructuras de response
      let methods: PaymentMethod[] = [];
      
      if (response.data?.cards && Array.isArray(response.data.cards)) {
        // Caso: { data: { cards: [...] } }
        methods = response.data.cards;
      } else if (response.data && Array.isArray(response.data)) {
        // Caso: { data: [...] }
        methods = response.data;
      } else if (response.cards && Array.isArray(response.cards)) {
        // Caso: { cards: [...] }
        methods = response.cards;
      } else if (Array.isArray(response)) {
        // Caso: [...]
        methods = response;
      }
      
      // Mapear campos del backend a estructura esperada
      methods = methods.map((card: any) => {
        // Si la estructura es plana (sin card: {...})
        if (!card.card && card.id) {
          return {
            id: card.id,
            type: 'card',
            card: {
              brand: card.brand || 'unknown',
              last4: (card.last_four || card.last4 || '0000').slice(-4),
              exp_month: parseInt(card.expiration_month || card.exp_month || '1'),
              exp_year: parseInt(card.expiration_year || card.exp_year || '2025'),
              holder_name: card.holder_name || 'TITULAR',
            },
            is_default: card.is_default || false,
            created_at: card.created_at || new Date().toISOString(),
          };
        }
        
        // Si ya tiene la estructura correcta
        return {
          ...card,
          card: {
            ...card.card,
            last4: (card.card.last_four || card.card.last4 || '0000').slice(-4),
          },
        };
      });
      
      console.log('💳 Métodos de pago procesados:', methods);
      
      return methods;
    } catch (error: any) {
      console.error('❌ Error getting payment methods:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener métodos de pago');
    }
  }

  /**
   * Agregar método de pago
   */
  async addPaymentMethod(data: {
    token_id: string;
    device_session_id: string;
  }): Promise<PaymentMethod> {
    try {
      const response = await apiClient.post<{ success: boolean; data: PaymentMethod }>(
        '/billing/payment-methods/add-card',
        data
      );
      
      console.log('✅ Método de pago agregado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error adding payment method:', error);
      throw new Error(error.response?.data?.message || 'Error al agregar método de pago');
    }
  }

  /**
   * Eliminar método de pago
   */
  async deletePaymentMethod(cardId: string): Promise<void> {
    try {
      await apiClient.delete(`/billing/payment-methods/${cardId}`);
      console.log('✅ Método de pago eliminado:', cardId);
    } catch (error: any) {
      console.error('❌ Error deleting payment method:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar método de pago');
    }
  }

  /**
   * Establecer método de pago predeterminado
   */
  async setDefaultPaymentMethod(cardId: string): Promise<PaymentMethod> {
    try {
      const response = await apiClient.post<{ success: boolean; data: PaymentMethod }>(
        `/billing/payment-methods/${cardId}/set-default`
      );
      
      console.log('✅ Método de pago predeterminado establecido:', cardId);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error setting default payment method:', error);
      throw new Error(error.response?.data?.message || 'Error al establecer método predeterminado');
    }
  }

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/billing/transactions', {
        params: { page, limit },
      });
      return response;
    } catch (error: any) {
      console.error('❌ Error getting transactions:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener transacciones');
    }
  }

  /**
   * Obtener una transacción específica
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Transaction }>(
        `/billing/transactions/${transactionId}`
      );
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting transaction:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener transacción');
    }
  }

  /**
   * Validar número de tarjeta (Algoritmo de Luhn)
   */
  validateCard(cardNumber: string): { isValid: boolean; brand: string } {
    const cleaned = cardNumber.replace(/\D/g, '');

    // Determinar marca
    let brand = 'unknown';
    if (/^4/.test(cleaned)) brand = 'visa';
    else if (/^5[1-5]/.test(cleaned)) brand = 'mastercard';
    else if (/^3[47]/.test(cleaned)) brand = 'amex';

    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return {
      isValid: sum % 10 === 0,
      brand,
    };
  }

  /**
   * Formatear número de tarjeta
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  }

  /**
   * Formatear monto con moneda
   */
  formatAmount(amount: number, currency: string = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

export default new PaymentService();