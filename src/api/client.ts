// src/api/client.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuración base - Compatible con Web, Android, iOS
const getApiUrl = () => {
  if (!__DEV__) {
    return 'https://api.trackgpx.com/api'; // Producción
  }

  // Desarrollo - Diferentes URLs por plataforma
  return Platform.select({
    ios: 'http://127.0.0.1:8000/api',
    android: 'http://10.0.2.2:8000/api',      // Emulador Android
    // android: 'http://192.168.1.100:8000/api', // Dispositivo físico (descomentar y usar tu IP)
    web: 'http://127.0.0.1:8000/api',
    default: 'http://127.0.0.1:8000/api',
  }) as string;
};

const API_URL = getApiUrl();

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor - Agregar token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log en desarrollo
        if (__DEV__) {
          console.log('📤 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor - Manejar errores
    this.client.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log('📥 API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        if (__DEV__) {
          console.error('❌ API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
          });
        }

        // Si es 401, limpiar token y redirigir a login
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          // Aquí podrías emitir un evento para redirigir al login
        }

        return Promise.reject(error);
      }
    );
  }

  // Métodos HTTP
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Método para subir archivos
  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void) {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  // Obtener la instancia de axios si se necesita
  getClient() {
    return this.client;
  }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();
export default apiClient;