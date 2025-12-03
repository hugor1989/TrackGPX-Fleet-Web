// src/api/userService.ts

import apiClient from './client';

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  role?: Role;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role_id: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  is_active?: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

class UserService {
  /**
   * Obtener todos los usuarios de la empresa
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: User[] }>(
        '/users'
      );
      
      const users = response.data || response || [];
      console.log('👥 Usuarios obtenidos:', users);
      
      return Array.isArray(users) ? users : [];
    } catch (error: any) {
      console.error('❌ Error getting users:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios');
    }
  }

  /**
   * Obtener un usuario específico
   */
  async getUser(id: number): Promise<User> {
    try {
      const response = await apiClient.get<{ success: boolean; data: User }>(
        `/users/${id}`
      );
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting user:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener usuario');
    }
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      console.log('➕ Creando usuario:', data);
      
      const response = await apiClient.post<{ success: boolean; data: User }>(
        '/users',
        data
      );
      
      console.log('✅ Usuario creado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      throw new Error(error.response?.data?.message || 'Error al crear usuario');
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    try {
      console.log('📝 Actualizando usuario:', id, data);
      
      const response = await apiClient.put<{ success: boolean; data: User }>(
        `/users/${id}`,
        data
      );
      
      console.log('✅ Usuario actualizado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
      console.log('✅ Usuario eliminado:', id);
    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  }

  /**
   * Activar/desactivar usuario
   */
  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    try {
      const response = await apiClient.patch<{ success: boolean; data: User }>(
        `/users/${id}/status`,
        { is_active: isActive }
      );
      
      console.log(`✅ Usuario ${isActive ? 'activado' : 'desactivado'}:`, id);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error toggling user status:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar estado del usuario');
    }
  }

  /**
   * Obtener todos los roles disponibles
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Role[] }>(
        '/roles'
      );
      
      const roles = response.data || response || [];
      console.log('🎭 Roles obtenidos:', roles);
      
      return Array.isArray(roles) ? roles : [];
    } catch (error: any) {
      console.error('❌ Error getting roles:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener roles');
    }
  }

  /**
   * Obtener un rol específico con permisos
   */
  async getRole(id: number): Promise<Role> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Role }>(
        `/roles/${id}`
      );
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error getting role:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener rol');
    }
  }

  /**
   * Crear nuevo rol
   */
  async createRole(data: { name: string; description: string; permissions: string[] }): Promise<Role> {
    try {
      console.log('➕ Creando rol:', data);
      
      const response = await apiClient.post<{ success: boolean; data: Role }>(
        '/roles',
        data
      );
      
      console.log('✅ Rol creado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error creating role:', error);
      throw new Error(error.response?.data?.message || 'Error al crear rol');
    }
  }

  /**
   * Actualizar rol
   */
  async updateRole(id: number, data: { name?: string; description?: string; permissions?: string[] }): Promise<Role> {
    try {
      console.log('📝 Actualizando rol:', id, data);
      
      const response = await apiClient.put<{ success: boolean; data: Role }>(
        `/roles/${id}`,
        data
      );
      
      console.log('✅ Rol actualizado:', response.data || response);
      
      return response.data || response;
    } catch (error: any) {
      console.error('❌ Error updating role:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar rol');
    }
  }

  /**
   * Eliminar rol (solo roles personalizados)
   */
  async deleteRole(id: number): Promise<void> {
    try {
      await apiClient.delete(`/roles/${id}`);
      console.log('✅ Rol eliminado:', id);
    } catch (error: any) {
      console.error('❌ Error deleting role:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar rol');
    }
  }

  /**
   * Obtener todos los permisos disponibles
   */
  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Permission[] }>(
        '/permissions'
      );
      
      const permissions = response.data || response || [];
      console.log('🔐 Permisos obtenidos:', permissions);
      
      return Array.isArray(permissions) ? permissions : [];
    } catch (error: any) {
      console.error('❌ Error getting permissions:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener permisos');
    }
  }

  /**
   * Invitar usuario por email
   */
  async inviteUser(email: string, roleId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📧 Invitando usuario:', email);
      
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/users/invite',
        { email, role_id: roleId }
      );
      
      console.log('✅ Invitación enviada');
      
      return response;
    } catch (error: any) {
      console.error('❌ Error inviting user:', error);
      throw new Error(error.response?.data?.message || 'Error al enviar invitación');
    }
  }

  /**
   * Validar email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar contraseña
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Al menos una mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Al menos una minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Al menos un número');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new UserService();