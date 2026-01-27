// src/api/billingInfoService.ts

import apiClient from './client';

export interface BillingInfo {
  id?: number;
  rfc: string;
  legal_name: string;
  fiscal_regime: string;
  tax_regime: string;
  postal_code: string;
  email_for_invoices: string;
  phone: string;
  street: string;
  exterior_number: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  cfdi_use: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBillingInfoRequest {
  rfc: string;
  legal_name: string;
  fiscal_regime: string;
  tax_regime: string;
  postal_code: string;
  email_for_invoices: string;
  phone: string;
  street: string;
  exterior_number: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  cfdi_use: string;
}

// Catálogos del SAT
export const FISCAL_REGIMES = [
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', name: 'Arrendamiento' },
  { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', name: 'Demás ingresos' },
  { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', name: 'Ingresos por intereses' },
  { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', name: 'Sin obligaciones fiscales' },
  { code: '620', name: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { code: '621', name: 'Incorporación Fiscal' },
  { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { code: '623', name: 'Opcional para Grupos de Sociedades' },
  { code: '624', name: 'Coordinados' },
  { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { code: '626', name: 'Régimen Simplificado de Confianza' },
];

export const CFDI_USES = [
  { code: 'G01', name: 'Adquisición de mercancías' },
  { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', name: 'Gastos en general' },
  { code: 'I01', name: 'Construcciones' },
  { code: 'I02', name: 'Mobilario y equipo de oficina por inversiones' },
  { code: 'I03', name: 'Equipo de transporte' },
  { code: 'I04', name: 'Equipo de cómputo y accesorios' },
  { code: 'I05', name: 'Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', name: 'Comunicaciones telefónicas' },
  { code: 'I07', name: 'Comunicaciones satelitales' },
  { code: 'I08', name: 'Otra maquinaria y equipo' },
  { code: 'D01', name: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'D02', name: 'Gastos médicos por incapacidad o discapacidad' },
  { code: 'D03', name: 'Gastos funerales' },
  { code: 'D04', name: 'Donativos' },
  { code: 'D05', name: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { code: 'D06', name: 'Aportaciones voluntarias al SAR' },
  { code: 'D07', name: 'Primas por seguros de gastos médicos' },
  { code: 'D08', name: 'Gastos de transportación escolar obligatoria' },
  { code: 'D09', name: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { code: 'D10', name: 'Pagos por servicios educativos (colegiaturas)' },
  { code: 'S01', name: 'Sin efectos fiscales' },
  { code: 'CP01', name: 'Pagos' },
  { code: 'CN01', name: 'Nómina' },
];

export const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'CDMX', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Estado de México', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

class BillingInfoService {
  /**
   * Obtener información fiscal
   */
  async getBillingInfo(): Promise<BillingInfo | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: BillingInfo[] | BillingInfo }>(
        '/billing/billing-info/get-all-data'
      );
      
      console.log('📋 Información fiscal obtenida:', response.data || response);
      
      // Manejar diferentes estructuras de respuesta
      let billingInfo = null;
      
      if (response.data) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          billingInfo = response.data[0];
        } else if (!Array.isArray(response.data)) {
          billingInfo = response.data;
        }
      } else if (response && !Array.isArray(response)) {
        billingInfo = response;
      } else if (Array.isArray(response) && response.length > 0) {
        billingInfo = response[0];
      }
      
      return billingInfo;
    } catch (error: any) {
      console.error('❌ Error getting billing info:', error);
      // Si es 404, retornar null (no hay datos fiscales aún)
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Error al obtener información fiscal');
    }
  }

  /**
   * Crear información fiscal
   */
  async createBillingInfo(data: CreateBillingInfoRequest): Promise<BillingInfo> {
    try {
      console.log('➕ Creando información fiscal:', data);
      
      const response = await apiClient.post<{ success: boolean; data: BillingInfo }>(
        '/billing/billing-info/create-billing-info',
        data
      );
      
      console.log('✅ Información fiscal creada:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error creating billing info:', error);
      throw new Error(error.response?.data?.message || 'Error al crear información fiscal');
    }
  }

  /**
   * Actualizar información fiscal
   */
  async updateBillingInfo(id: number, data: Partial<CreateBillingInfoRequest>): Promise<BillingInfo> {
    try {
      console.log('📝 Actualizando información fiscal:', id, data);
      
      const response = await apiClient.put<{ success: boolean; data: BillingInfo }>(
        `/billing/billing-info/${id}`,
        data
      );
      
      console.log('✅ Información fiscal actualizada:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating billing info:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar información fiscal');
    }
  }

  /**
   * Validar RFC
   */
  validateRFC(rfc: string): boolean {
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    return rfcRegex.test(rfc.toUpperCase());
  }

  /**
   * Formatear RFC
   */
  formatRFC(rfc: string): string {
    return rfc.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '');
  }

  /**
   * Validar código postal
   */
  validatePostalCode(postalCode: string): boolean {
    return /^\d{5}$/.test(postalCode);
  }

  /**
   * Validar email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Obtener nombre de régimen fiscal por código
   */
  getFiscalRegimeName(code: string): string {
    const regime = FISCAL_REGIMES.find(r => r.code === code);
    return regime ? `${regime.code} - ${regime.name}` : code;
  }

  /**
   * Obtener nombre de uso de CFDI por código
   */
  getCFDIUseName(code: string): string {
    const use = CFDI_USES.find(u => u.code === code);
    return use ? `${use.code} - ${use.name}` : code;
  }
}

export default new BillingInfoService();