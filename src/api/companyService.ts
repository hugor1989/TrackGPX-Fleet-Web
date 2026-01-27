// src/api/companyService.ts

import { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

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

// 2. 👇 Agrega la interfaz para crear empleado
export interface CreateEmployeeRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
  timezone?: string;
  roles: number[]; // Array de IDs de roles
  company_id?: number; // Opcional - se puede obtener del usuario logueado
  // NOTA: No incluimos company_id, el backend lo toma del usuario logueado
}


// 3. 👇 Agrega la interfaz para la respuesta de creación
export interface CreateEmployeeResponse {
  success: boolean;
  message?: string
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

   // Función auxiliar para obtener el company_id del usuario logueado
  private async getCurrentCompanyId(): Promise<number | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');

      //console.log(userData);
      if (userData) {
        const user = JSON.parse(userData);
        //console.log('👤 Usuario actual:', user);
        
        // Buscar company_id en diferentes ubicaciones posibles
        const companyId = user.company_id || user.company?.id || user.companyId;
        //console.log('🏢 company_id encontrado:', companyId);
        return companyId;
      }
      return null;
    } catch (error) {
     // console.error('❌ Error obteniendo company_id:', error);
      return null;
    }
  }

  
  async getCompanyEmployees(): Promise<TeamMember[]> {
    try {
      // La URL ya no lleva ID
      const response = await apiClient.get<any>('/admin/company-users/get-users');
      
      //console.log('🏢 Equipo obtenido:', response.data);
      
      // Ajusta esto según si tu back devuelve { data: [...] } o { success: true, data: [...] }
      return response.data.data || response.data; 
      
    } catch (error: any) {
      //console.error('❌ Error obteniendo equipo:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios');
    }
  }

  /**
   * Crear nuevo empleado/miembro del equipo
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<CreateEmployeeResponse> {
    try {
      // Obtener company_id del usuario actual
      const companyId = await this.getCurrentCompanyId();
      
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa. Inicie sesión nuevamente.');
      }
      
      // Crear payload completo con company_id
      const payload = {
        ...data,
        company_id: companyId
      };
      
      //console.log('👤 Creando nuevo empleado con payload:', payload);
      
      const response = await apiClient.post<CreateEmployeeResponse>(
        '/admin/company-users/create',
        payload
      );
      
      //console.log('✅ Empleado creado:', response.data || response);
      
      return response;
      
    } catch (error: any) {
     // console.error('❌ Error creando empleado:', error);
      
      if (error.response) {
        const errorData = error.response.data;
        //console.error('Error response:', errorData);
        
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat().join(', ');
          throw new Error(`Error de validación: ${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Error al crear empleado');
      }
      
      throw new Error(error.message || 'Error de conexión al crear empleado');
    }
  }

  /**
   * Actualizar empleado/miembro del equipo
   */
  async updateEmployee(id: number, data: Partial<CreateEmployeeRequest>): Promise<CreateEmployeeResponse> {
    try {
      console.log('📝 Actualizando empleado ID:', id, data);
      
      const response = await apiClient.put<CreateEmployeeResponse>(
        `/admin/company-users/update/${id}`,
        data
      );
      
      console.log('✅ Empleado actualizado:', response.data || response);
      
      return response.data || response;
      
    } catch (error: any) {
      console.error('❌ Error actualizando empleado:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar empleado');
    }
  }

  /**
   * Eliminar empleado/miembro del equipo
   */
  async deleteEmployee(id: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Eliminando empleado ID:', id);
      
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/admin/company-users/delete/${id}`
      );
      
      console.log('✅ Empleado eliminado:', response.data || response);
      
      return response.data || response;
      
    } catch (error: any) {
      console.error('❌ Error eliminando empleado:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar empleado');
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
   * Actualizar un usuario del equipo
   * PUT company-users/update/{id}
   */
  async updateMember(id: number, data: { name?: string; phone?: string; position?: string; role_id?: number }): Promise<any> {
    try {
      // Ajusta los nombres de campos según lo que espere tu backend (snake_case o camelCase)
      const response = await apiClient.put(`/company-users/update/${id}`, data);
      return response;
    } catch (error: any) {
      console.error('Error updating member:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
    }
  }

  /**
   * Suspender/Activar usuario
   * PATCH company-users/{id}/suspend
   */
  async suspendMember(id: number): Promise<any> {
    try {
      const response = await apiClient.patch(`/company-users/${id}/suspend`);
      return response;
    } catch (error: any) {
      console.error('Error suspending member:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado del usuario');
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