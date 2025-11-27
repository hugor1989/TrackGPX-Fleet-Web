// src/api/companyService.ts

import { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import apiClient from './client';

// 1. 👇 Agrega y EXPORTA la interfaz aquí al inicio del archivo
export interface TeamMember {
  id: number;
  company_id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  timezone: string | null;
  roles: any[]; 
  status?: string;
  account?: any; // Si necesitas datos de la relación account
}

export interface Company {
  id: number;
  slug: string;
  name: string;
  rfc?: string;
  fiscal_address?: string;
  contact_email?: string;
  phone?: string;
  status: 'active' | 'suspended';
  logo?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  rfc?: string;
  fiscal_address?: string;
  contact_email?: string;
  phone?: string;
  website?: string;
}

class CompanyService {
  /* export const getCompanyEmployees = async (companyId: number) => {
    const response = await client.get(`/companies/${companyId}/users`);
    return response.data;
};

export const addCompanyEmployee = async (userData: any) => {
    const response = await client.post('/users', userData); // O tu endpoint específico
    return response.data;
}; */

  async getCompanyEmployees(): Promise<TeamMember[]> {
    try {
      // La URL ya no lleva ID
      const response = await apiClient.get<any>('/admin/company-users/get-users');
      
      console.log('🏢 Equipo obtenido:', response.data);
      
      // Ajusta esto según si tu back devuelve { data: [...] } o { success: true, data: [...] }
      return response.data.data || response.data; 
      
    } catch (error: any) {
      console.error('❌ Error obteniendo equipo:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios');
    }
}
  /**
   * Obtener información de la empresa
   */
  async getCompany(): Promise<Company> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Company }>(
        '/admin/companie/my-company'
      );
      
      console.log('🏢 Información de empresa obtenida:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting company:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener información de la empresa');
    }
  }

  /**
   * Actualizar información de la empresa
   */
  async updateCompany(data: UpdateCompanyRequest): Promise<Company> {
    try {
      console.log('📝 Actualizando empresa:', data);
      
      const response = await apiClient.put<{ success: boolean; data: Company }>(
        '/admin/companie/updateMyCompanie',
        data
      );
      
      console.log('✅ Empresa actualizada:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating company:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar información de la empresa');
    }
  }

  /**
   * Subir logo de la empresa
   */
  async uploadLogo(file: File | Blob): Promise<{ logo_url: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      console.log('📤 Subiendo logo...');

      const response = await apiClient.post<{ success: boolean; data: { logo_url: string } }>(
        '/admin/company/update-logo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Logo subido:', response.data || response);

      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error uploading logo:', error);
      throw new Error(error.response?.data?.message || 'Error al subir logo');
    }
  }

  /**
   * Eliminar logo de la empresa
   */
  async deleteLogo(): Promise<void> {
    try {
      await apiClient.delete('/admin/company/delete/logo');
      console.log('✅ Logo eliminado');
    } catch (error: any) {
      console.error('❌ Error deleting logo:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar logo');
    }
  }

  /**
   * Validar RFC (México)
   */
  validateRFC(rfc: string): boolean {
    // RFC Persona Moral: 12 caracteres
    // RFC Persona Física: 13 caracteres
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
   * Validar email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Formatear teléfono (quitar caracteres no numéricos)
   */
  formatPhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}

export default new CompanyService();