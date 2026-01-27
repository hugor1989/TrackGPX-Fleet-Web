// src/utils/storageHelper.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageHelper {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      // Intentar con AsyncStorage primero
      await AsyncStorage.setItem(key, value);
      
      // Para web, también en localStorage como backup
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('No se pudo guardar en localStorage:', e);
        }
      }
    } catch (error) {
      console.error(`Error guardando ${key}:`, error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      // Intentar AsyncStorage primero
      let value = await AsyncStorage.getItem(key);
      
      // Si no hay valor en AsyncStorage y estamos en web, intentar localStorage
      if (!value && typeof window !== 'undefined' && window.localStorage) {
        value = localStorage.getItem(key);
        // Si encontramos en localStorage, sincronizar a AsyncStorage
        if (value) {
          await AsyncStorage.setItem(key, value);
        }
      }
      
      return value;
    } catch (error) {
      console.error(`Error obteniendo ${key}:`, error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error eliminando ${key}:`, error);
    }
  }
}