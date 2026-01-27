import apiClient from './client';
import { StorageHelper } from '../utils/storageHelper'; // ✅ Importación correcta
import { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// INTERFACES
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
  company?: {
    id: number;
    name: string;
    openpay_customer_id: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  company_name: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  data?: {
    user?: User;
  };
  message?: string;
}

// Tipo para errores de API (Laravel suele devolver "message" y "errors")
interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// SERVICIO DE AUTENTICACIÓN
// ---------------------------------------------------------------------------

class AuthService {
  
  /**
   * Helper privado para formatear errores de Axios
   */
  private handleError(error: unknown): string {
    if (error instanceof AxiosError) {
      const apiError = error.response?.data as ApiErrorResponse;
      // Si hay un mensaje específico del backend, úsalo.
      return apiError?.message || error.message || 'Error de conexión con el servidor';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ha ocurrido un error desconocido';
  }

  /**
   * Iniciar sesión
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      if (__DEV__) {
        console.log('🔐 Login Response:', response.success ? 'Success' : 'Failed');
      }

      // Validamos que existan token y datos del usuario
      if (response.token && response.data?.user) {
        // ✅ Guardar usando StorageHelper
        await StorageHelper.setItem('auth_token', response.token);
        await StorageHelper.setItem('user_data', JSON.stringify(response.data.user));
        
        // Manejo de "Recordar usuario"
        if (credentials.remember) {
          await StorageHelper.setItem('remember_me', 'true');
          await StorageHelper.setItem('saved_email', credentials.email);
        } else {
          await StorageHelper.removeItem('remember_me');
          await StorageHelper.removeItem('saved_email');
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
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      // Intentamos avisar al backend
      await apiClient.post('/logout');
    } catch (error) {
      console.warn('Logout warning: No se pudo conectar con el servidor', error);
    } finally {
      // ✅ Siempre limpiamos el almacenamiento local, falle o no el backend
      await StorageHelper.removeItem('auth_token');
      await StorageHelper.removeItem('user_data');
    }
  }

  /**
   * Registrar nuevo usuario (Empresa)
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/register', data);

      // Corrección: Acceder a user dentro de data, igual que en login
      const user = response.data?.user;

      if (response.token && user) {
        await StorageHelper.setItem('auth_token', response.token);
        await StorageHelper.setItem('user_data', JSON.stringify(user));
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
   * Obtener token actual (útil para validaciones rápidas)
   */
  async getToken(): Promise<string | null> {
    return await StorageHelper.getItem('auth_token');
  }

  /**
   * Obtener objeto usuario desde storage
   */
  async getCurrentUser(): Promise<User | null> {
    const userData = await StorageHelper.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Verificar si existe sesión localmente
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Recuperar email guardado para autocompletar login
   */
  async getSavedEmail(): Promise<string | null> {
    const rememberMe = await StorageHelper.getItem('remember_me');
    if (rememberMe === 'true') {
      return await StorageHelper.getItem('saved_email');
    }
    return null;
  }

  /**
   * Validar token contra el backend (útil al abrir la app)
   */
  async verifyToken(): Promise<boolean> {
    try {
      // Si el endpoint /user retorna 200 OK, el token es válido
      await apiClient.get('/user');
      return true;
    } catch (error) {
      // Si falla (401), hacemos logout local
      await this.logout();
      return false;
    }
  }

  /**
   * Renovar token (Refresh Token)
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post<{ token: string }>('/refresh');
      if (response.token) {
        await StorageHelper.setItem('auth_token', response.token);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/forgot-password', { email });
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
}

// Singleton
const authServiceInstance = new AuthService();
export default authServiceInstance;
export { authServiceInstance as authService };