import apiClient from './client'; // Usa tu cliente configurado
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FuelType = 'regular' | 'premium' | 'diesel';
const CACHE_KEY = 'FUEL_PRICE_CACHE';
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 horas

export const fetchGasPrice = async (type: FuelType): Promise<string | null> => {
  try {
    // 1. Cache Local
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, prices } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        console.log("⚡ Precio desde Cache:", prices[type]);
        return prices[type];
      }
    }

    // 2. Consulta a TU PROXY (Laravel) en lugar de directo a la API externa
    console.log("🌐 Actualizando precios desde Servidor...");
    const response = await apiClient.get('/proxy/gas-prices'); 
    const data = response.data; // Axios ya parsea JSON

    // Helper para buscar en el array feo que devuelve esa API
    const find = (k: string) => data.find((d: any) => d.tipo_combustible?.includes(k))?.precio_promedio || null;

    const newPrices = {
        regular: find('Regular'),
        premium: find('Premium'),
        diesel: find('Diésel')
    };

    // 3. Guardar Cache
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), prices: newPrices }));

    return newPrices[type];

  } catch (error) {
    console.error("❌ Error obteniendo gasolina:", error);
    return null;
  }
};