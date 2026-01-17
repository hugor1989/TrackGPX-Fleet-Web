// src/apiClientClient/invoiceService.ts

import apiClient from './client';


// src/apiClient/invoiceService.ts
// ==================== INTERFACES ====================

export interface Payment {
  id: number;
  company_id: number;
  device_subscription_id?: number;
  device_id?: number;
  
  // Montos
  amount: string; // Viene como string del backend
  total: string;
  tax: string;
  currency: string;
  
  // OpenPay
  openpay_charge_id?: string;
  openpay_order_id?: string;
  authorization_code?: string;
  
  // Método de pago
  payment_method: 'card' | 'store' | 'bank_account';
  card_type?: string;
  card_last_four?: string;
  card_holder_name?: string;
  bank_name?: string;
  
  // Descripción y tipo
  description: string;
  type: 'activation' | 'renewal' | 'subscription' | 'other';
  notes?: string;
  metadata?: any;
  
  // Estados
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  is_paid: boolean;
  is_failed: boolean;
  is_refunded: boolean;
  has_invoice: boolean;
  
  // Errores
  error_code?: string;
  error_message?: string;
  
  // Fechas
  paid_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  invoice_id?: number;
  invoice?: Invoice;
  device?: {
    id: number;
    imei: string;
    model?: string;
    manufacturer?: string;
    status?: string;
  };
  subscription?: {
    id: number;
    plan_name?: string;
    status?: string;
  } | null;
}

export interface Invoice {
  id: number;
  company_id: number;
  payment_id: number;
  uuid?: string;
  folio_fiscal?: string;
  serie?: string;
  folio?: string;
  rfc_emisor: string;
  razon_social_emisor: string;
  rfc_receptor: string;
  razon_social_receptor: string;
  uso_cfdi: string;
  regimen_fiscal_receptor: string;
  total: number;
  subtotal: number;
  iva: number;
  status: 'issued' | 'cancelled' | 'pending';
  xml_path?: string;
  pdf_path?: string;
  issued_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  payment?: Payment; // Relación con pago
}

export interface RequestInvoiceRequest {
  payment_id: number;
  fiscal_data?: {
    rfc?: string;
    razon_social?: string;
    regimen_fiscal?: string;
    uso_cfdi?: string;
    codigo_postal?: string;
  };
}

export interface InvoiceCFDI {
    id: number;
    company_id: number;
    billing_cycle_id: number | null;
    invoice_number: string;
    folio: string | null;
    serie: string | null;
    invoice_date: string;
    due_date: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    currency: string;
    cfdi_uuid: string | null;
    cfdi_folio: string | null;
    cfdi_serie: string | null;
    cfdi_xml_path: string | null;
    cfdi_pdf_path: string | null;
    cfdi_original_string: string | null;
    cfdi_sat_seal: string | null;
    cfdi_cfdi_seal: string | null;
    cfdi_sat_cert_number: string | null;
    cfdi_stamp_date: string | null;
    pac_name: string | null;
    pac_rfc: string | null;
    issuer_rfc: string;
    issuer_name: string;
    issuer_fiscal_regime: string;
    receiver_rfc: string;
    receiver_name: string;
    receiver_fiscal_regime: string;
    receiver_zip_code: string;
    receiver_tax_regime: string;
    cfdi_use: string;
    cfdi_payment_method: string;
    cfdi_payment_form: string;
    export_type: string;
    cfdi_canceled_at: string | null;
    cfdi_cancellation_status: string | null;
    cfdi_cancellation_reason: string | null;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    notes: string | null;
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    is_paid: boolean;
    is_overdue: boolean;
    is_issued: boolean;
    payment: Payment | null;
            
}

export interface InvoiceListResponse {
  success: boolean;
  data: InvoiceCFDI[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaymentListResponse {
  success: boolean;
  data: Payment[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface InvoiceResponse {
  success: boolean;
  data: Invoice;
  message?: string;
}

// ==================== SERVICE ====================

class InvoiceService {
  
  /**
   * Obtener pagos sin factura (disponibles para facturar)
   */
  async getPaymentsWithoutInvoice(): Promise<Payment[]> {
    try {
      const response = await apiClient.get<PaymentListResponse>('/invoice/payments/without-invoice');
      console.log('Respuesta de pagos sin factura:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo pagos sin factura:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener pagos');
    }
  }

  /**
   * Obtener todos los pagos de la empresa
   */
  async getPayments(page: number = 1, perPage: number = 10): Promise<PaymentListResponse> {
    try {
      const response = await apiClient.get<PaymentListResponse>('/invoice/get-all-payments', {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo pagos:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener pagos');
    }
  }

  /**
   * Solicitar factura para un pago
   */
  async requestInvoice(data: RequestInvoiceRequest): Promise<Invoice> {
    try {
      const response = await apiClient.post<InvoiceResponse>('/invoice/invoices/request', data);
      return response.data;
    } catch (error: any) {
      console.error('Error solicitando factura:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al solicitar factura. Verifica que el pago no tenga factura previa.'
      );
    }
  }

  /**
   * Obtener todas las facturas de la empresa
   */
  async getInvoices(page: number = 1, perPage: number = 10): Promise<InvoiceListResponse> {
    try {
      const response = await apiClient.get<InvoiceListResponse>('/invoice/get-all-invoices', {
        params: { page, per_page: perPage }
      });
      console.log('Respuesta de facturas:', response.data);
      return response;
    } catch (error: any) {
      console.error('Error obteniendo facturas:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener facturas');
    }
  }

  /**
   * Obtener detalle de una factura
   */
  async getInvoice(id: number): Promise<Invoice> {
    try {
      const response = await apiClient.get<InvoiceResponse>(`/invoice/invoices/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Error obteniendo factura:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener factura');
    }
  }

  /**
   * Descargar XML de factura
   */
  async downloadXML(invoiceId: number): Promise<string> {
    try {
      const response = await apiClient.get(`/invoice/invoices/${invoiceId}/xml`, {
        responseType: 'blob'
      });
      
      // Crear URL del blob para descargar
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error: any) {
      console.error('Error descargando XML:', error);
      throw new Error(error.response?.data?.message || 'Error al descargar XML');
    }
  }

  /**
   * Descargar PDF de factura
   */
  async downloadPDF(invoiceId: number): Promise<string> {
    try {
      const response = await apiClient.get(`/invoice/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      
      // Crear URL del blob para descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error: any) {
      console.error('Error descargando PDF:', error);
      throw new Error(error.response?.data?.message || 'Error al descargar PDF');
    }
  }

  /**
   * Cancelar factura
   */
  async cancelInvoice(invoiceId: number, reason: string): Promise<Invoice> {
    try {
      const response = await apiClient.post<InvoiceResponse>(`/invoice/invoices/${invoiceId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error: any) {
      console.error('Error cancelando factura:', error);
      throw new Error(error.response?.data?.message || 'Error al cancelar factura');
    }
  }

  /**
   * Reenviar factura por correo
   */
  async resendInvoice(invoiceId: number, email?: string): Promise<boolean> {
    try {
      await apiClient.post(`/invoice/invoices/${invoiceId}/resend`, { email });
      return true;
    } catch (error: any) {
      console.error('Error reenviando factura:', error);
      throw new Error(error.response?.data?.message || 'Error al reenviar factura');
    }
  }

  /**
   * Obtener estadísticas de facturación
   */
  async getInvoiceStats(): Promise<{
    total_invoices: number;
    total_amount: number;
    pending_invoices: number;
    issued_invoices: number;
    cancelled_invoices: number;
  }> {
    try {
      const response = await apiClient.get('/invoice/invoices/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  }
}

export default new InvoiceService();