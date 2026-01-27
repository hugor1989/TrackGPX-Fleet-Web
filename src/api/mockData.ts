// src/api/mockData.ts

// 1. Definimos la interfaz del Vehículo
export interface Vehicle {
  id: number;
  name: string;
  plate: string;
  status: 'active' | 'inactive' | 'maintenance'; // active = en movimiento
  speed: number;
  latitude: number;
  longitude: number;
  heading: number; // Dirección (0-360 grados) para rotar el icono
  location: string;
  device?: { is_online: boolean }; // Para saber si está conectado
  category?: string; // Para agrupar en el menú
  isSubordinate?: boolean;
}

// 2. Datos iniciales (Dummy Data)
// Usamos coordenadas cercanas para simular una flota en una ciudad
export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 1,
    name: 'V7-pro-810602',
    plate: 'ABC-123',
    status: 'active',
    speed: 42,
    latitude: -34.6037, // Obelisco, Buenos Aires (Ejemplo)
    longitude: -58.3816,
    heading: 90, // Este
    location: 'Av. Corrientes',
    category: 'Demo',
    device: { is_online: true }
  },
  {
    id: 2,
    name: 'Camión Reparto 01',
    plate: 'REP-999',
    status: 'active',
    speed: 25,
    latitude: -34.5711,
    longitude: -58.4233,
    heading: 180, // Sur
    location: 'Palermo',
    category: 'Logística',
    device: { is_online: true }
  },
  {
    id: 3,
    name: 'Nissan NP300',
    plate: 'JAL-554',
    status: 'inactive',
    speed: 0,
    latitude: -34.5895,
    longitude: -58.3974,
    heading: 0,
    location: 'Recoleta - Estacionado',
    category: 'Ventas',
    device: { is_online: false }
  },
  {
    id: 4,
    name: 'Moto 05',
    plate: 'MOT-222',
    status: 'active',
    speed: 68,
    latitude: -34.5633,
    longitude: -58.4556,
    heading: 45, // Noreste
    location: 'Belgrano',
    category: 'Mensajería',
    device: { is_online: true }
  },
  {
    id: 5,
    name: 'Ford Transit',
    plate: 'FOR-888',
    status: 'maintenance',
    speed: 0,
    latitude: -34.6212,
    longitude: -58.3731,
    heading: 0,
    location: 'Taller Central',
    category: 'Mantenimiento',
    device: { is_online: false }
  },
];

/**
 * 3. Función Simulación de Movimiento
 * Esta función toma la lista actual de vehículos y devuelve una NUEVA lista
 * con las coordenadas ligeramente modificadas para simular movimiento GPS.
 */
export const simulateFleetMovement = (currentVehicles: Vehicle[]): Vehicle[] => {
  return currentVehicles.map(vehicle => {
    // Si está inactivo o en mantenimiento, no se mueve
    if (vehicle.status !== 'active') return vehicle;

    // Generar un pequeño desplazamiento aleatorio
    // 0.0001 grados es aprox 11 metros
    const latChange = (Math.random() - 0.5) * 0.0003; 
    const lngChange = (Math.random() - 0.5) * 0.0003;
    
    // Variar velocidad ligeramente (simular tráfico)
    const speedChange = Math.floor((Math.random() - 0.5) * 5);
    let newSpeed = vehicle.speed + speedChange;
    // Mantener velocidad en rangos lógicos (0 - 120 km/h)
    newSpeed = Math.max(0, Math.min(120, newSpeed));

    // Calcular "heading" (rumbo) basándonos en el movimiento
    // (Simulación simple: varía un poco el rumbo actual)
    const headingChange = (Math.random() * 10 - 5);
    const newHeading = (vehicle.heading + headingChange + 360) % 360;

    return {
      ...vehicle,
      latitude: vehicle.latitude + latChange,
      longitude: vehicle.longitude + lngChange,
      speed: newSpeed,
      heading: newHeading
    };
  });
};