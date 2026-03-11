// src/api/mockData.ts

export interface Vehicle {
  id: number;
  name: string;
  plate: string;
  status: 'active' | 'inactive' | 'maintenance' | 'stopped';
  speed: number;
  latitude: number;
  longitude: number;
  heading: number;
  location: string;
  map_icon?: string;
  category?: string;
  isSubordinate?: boolean;
  driverName?: string;
  contactPhone?: string;

  deviceInfo?: {
    id?: number;
    imei: string;
    model: string;
    sim: string;
    iccid: string;
    activationDate: string;
    platformExpiry: string;
    protocol: string;
    voltage: string;
    accStatus: 'ENCENDIDO' | 'APAGADO';
    lastGps: string;
    expiration: string;
    signal: string;
    mapIcon: string; 
  };

  device?: { is_online: boolean };
}

// Centro de Guadalajara
const GDL_CENTER = { lat: 20.676667, lng: -103.3475 };

export const hydrateVehiclesWithMockLocation = (realVehicles: any[]): Vehicle[] => {
  return realVehicles.map((v) => {

    // ✅ Usar coordenadas reales si existen, si no simular
    const hasRealLocation = v.latitude && v.longitude;
    const lat = hasRealLocation ? v.latitude : GDL_CENTER.lat + (Math.random() - 0.5) * 0.08;
    const lng = hasRealLocation ? v.longitude : GDL_CENTER.lng + (Math.random() - 0.5) * 0.08;
    const speed = hasRealLocation ? v.speed : 0;
    const heading = hasRealLocation ? v.heading : Math.floor(Math.random() * 360);

    const isActive = v.device?.is_online ?? false;
    const randomStatus = isActive ? 'active' : 'stopped';

    const driverName = v.driver?.account?.name 
                    || v.current_assignment?.driver?.account?.name 
                    || 'No asignado';

    return {
      id: v.id,
      name: v.name || `Unidad ${v.id}`,
      plate: v.plate || 'SIN-PLACA',
      category: v.group?.name || 'Sin Asignar',
      isSubordinate: true,
      driverName: driverName,
      contactPhone: v.driver?.phone || 'N/A',
      
      latitude: lat,
      longitude: lng,
      speed: speed,
      heading: heading,
      status: randomStatus,
      location: hasRealLocation ? v.last_gps : 'Sin señal',
      map_icon: v.map_icon || 'car-sport',

      deviceInfo: {
        id: v.device?.id || 0,
        imei: v.device?.imei || 'N/A',
        model: v.device?.model || 'Generic',
        sim: v.device?.sim_id || 'N/A',
        iccid: 'N/A',
        activationDate: v.device?.activated_at?.split('T')[0] || 'N/A',
        platformExpiry: 'N/A',
        protocol: v.device?.protocol || 'GT06',
        voltage: 'N/A',
        accStatus: isActive ? 'ENCENDIDO' : 'APAGADO',
        lastGps: v.last_gps || 'Sin señal',
        expiration: 'N/A',
        signal: isActive ? '4G - Fuerte' : 'Sin señal',
        mapIcon: v.map_icon || 'car-sport'
      },

      device: { is_online: isActive }
    };
  });
};

export const simulateFleetMovement = (currentVehicles: Vehicle[]): Vehicle[] => {
  return currentVehicles.map(vehicle => {
    if (vehicle.status !== 'active') return vehicle;

    // Simulación de movimiento
    const latChange = (Math.random() - 0.5) * 0.0003; 
    const lngChange = (Math.random() - 0.5) * 0.0003;
    let newSpeed = vehicle.speed + Math.floor((Math.random() - 0.5) * 5);
    newSpeed = Math.max(10, Math.min(140, newSpeed));

    const newHeading = (vehicle.heading + (Math.random() * 20 - 10) + 360) % 360;

    return {
      ...vehicle,
      latitude: vehicle.latitude + latChange,
      longitude: vehicle.longitude + lngChange,
      speed: newSpeed,
      heading: newHeading,
      
      deviceInfo: {
        ...vehicle.deviceInfo!, 
        lastGps: new Date().toLocaleTimeString(),
        voltage: (13.5 + (Math.random() * 0.5)).toFixed(1) + ' V'
      }
    };
  });
};

export const INITIAL_VEHICLES: Vehicle[] = [];