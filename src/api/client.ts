import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { StorageHelper } from '../utils/storageHelper';

// ---------------------------------------------------------------------------
// CONFIGURACIÓN DE URLS
// ---------------------------------------------------------------------------

// ⚠️ IMPORTANTE: Cambia esta URL por la de tu servidor real cuando despliegues
const PROD_API_URL = 'https://backend-flotillas.track-gpx.com/api'; 

const getApiUrl = (): string => {
  // 1. Entorno de Producción
  if (process.env.NODE_ENV === 'production' || !__DEV__) {
    return PROD_API_URL;
  }

  // 2. Entorno de Desarrollo (Localhost)
  return Platform.select({
    ios: 'http://127.0.0.1:8000/api',      // Simulador iOS
    android: 'http://10.0.2.2:8000/api',   // Emulador Android
    web: 'http://127.0.0.1:8000/api',      // Navegador Web
    default: 'http://127.0.0.1:8000/api',
  }) as string;
};

// ---------------------------------------------------------------------------
// CLASE API CLIENT
// ---------------------------------------------------------------------------

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // --- REQUEST INTERCEPTOR (Enviar Token) ---
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Usamos StorageHelper para mantener consistencia
          const token = await StorageHelper.getItem('auth_token');

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          if (__DEV__) {
            console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
          }
        } catch (error) {
          console.error('Error obteniendo token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // --- RESPONSE INTERCEPTOR (Manejar Errores Globales) ---
    this.client.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log(`✅ [API Success] ${response.status} - ${response.config.url}`);
        }
        return response;
      },
      async (error: AxiosError) => {
        // Log detallado solo en desarrollo
        if (__DEV__) {
          console.error(`❌ [API Error] ${error.response?.status} - ${error.config?.url}`, error.response?.data);
        }

        // Manejo automático de sesión expirada (401)
        if (error.response?.status === 401) {
          console.warn('⚠️ Sesión expirada (401). Limpiando credenciales...');
          
          // Limpieza usando StorageHelper
          await StorageHelper.removeItem('auth_token');
          await StorageHelper.removeItem('user_data');

          // NOTA: Aquí deberías disparar la navegación al Login.
          // Como este archivo no es un componente React, la forma común es:
          // 1. Usar una referencia de navegación global (NavigationRef).
          // 2. O emitir un evento (DeviceEventEmitter).
          // Ejemplo: NavigationService.navigate('Login');
        }

        return Promise.reject(error);
      }
    );
  }

  // -------------------------------------------------------------------------
  // MÉTODOS PÚBLICOS
  // -------------------------------------------------------------------------

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Método especial para subir imágenes/archivos
  async upload<T>(url: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  }

  /**
   * Permite acceder a la instancia original de axios si se requiere configuración avanzada
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Exportamos una instancia única (Singleton) para usar en toda la app
export const apiClient = new ApiClient();
export default apiClient;