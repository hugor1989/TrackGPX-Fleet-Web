// src/api/authService.ts

import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    company_id: number;
    company?: {
      id: number;
      name: string;
      openpay_customer_id: string;
    };
  };
  message?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  company_name: string;
}

// Tipo para errores de API
interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

class AuthService {
  /**
   * Manejar errores de API de forma consistente
   */
  private handleError(error: unknown): string {
    if (error instanceof AxiosError) {
      const apiError = error.response?.data as ApiErrorResponse;
      return apiError?.message || error.message || 'Error desconocido';
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Error desconocido';
  }

  /**
   * Login de usuario
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      console.log('Login response:', response);
      if (response.token && response.user) {
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        
        if (credentials.remember) {
          await AsyncStorage.setItem('remember_me', 'true');
          await AsyncStorage.setItem('saved_email', credentials.email);
        } else {
          await AsyncStorage.removeItem('remember_me');
          await AsyncStorage.removeItem('saved_email');
        }
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: this.handleError(error),
      };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/register', data);

      if (response.token && response.user) {
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: this.handleError(error),
      };
    }
  }

  /**
   * Obtener token actual
   */
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<any | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Verificar si está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Obtener email guardado (remember me)
   */
  async getSavedEmail(): Promise<string | null> {
    const rememberMe = await AsyncStorage.getItem('remember_me');
    if (rememberMe === 'true') {
      return await AsyncStorage.getItem('saved_email');
    }
    return null;
  }

  /**
   * Verificar token (validar con backend)
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await apiClient.get('/user');
      return !!response;
    } catch (error) {
      await this.logout();
      return false;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post<{ token: string }>('/refresh');
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/forgot-password', { email });
      return {
        success: true,
        message: response.message || 'Correo de recuperación enviado',
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error),
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/reset-password', data);
      return {
        success: true,
        message: response.message || 'Contraseña actualizada',
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error),
      };
    }
  }
}

// Crear instancia singleton
const authServiceInstance = new AuthService();

// Export default para import default
export default authServiceInstance;

// Export named para import destructuring
export { authServiceInstance as authService };