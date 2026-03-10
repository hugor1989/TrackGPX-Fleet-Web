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
  
  category?: string;
  isSubordinate?: boolean;
  driverName?: string;
  contactPhone?: string;

  deviceInfo?: {
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
  return realVehicles.map((v, index) => {
    
    // --- Lógica de coordenadas ---
    const offsetLat = (Math.random() - 0.5) * 0.08; 
    const offsetLng = (Math.random() - 0.5) * 0.08;
    const randomLat = GDL_CENTER.lat + offsetLat;
    const randomLng = GDL_CENTER.lng + offsetLng;
    
    const isActive = Math.random() > 0.3;
    const randomStatus = isActive ? 'active' : 'stopped';
    const randomSpeed = isActive ? Math.floor(Math.random() * 60) + 10 : 0;

    const driverName = v.driver?.account?.name 
                    || v.current_assignment?.driver?.account?.name 
                    || 'No asignado';
    
    const driverPhone = v.driver?.phone || '33 0000 0000';
    
    // Fechas simuladas
    const activation = v.device?.activated_at ? v.device.activated_at.split('T')[0] : '2024-01-15';
    const expiry = '2029-01-15'; 

    return {
      id: v.id,
      name: v.name || `Unidad ${v.id}`,
      plate: v.plate || 'SIN-PLACA',
      category: v.group?.name || 'Sin Asignar', 
      isSubordinate: true,
      driverName: driverName,
      contactPhone: driverPhone,

      latitude: randomLat,
      longitude: randomLng,
      speed: randomSpeed,
      heading: Math.floor(Math.random() * 360),
      status: randomStatus,
      location: 'Ubicación Simulada GDL',

      deviceInfo: {
        imei: v.device?.imei || 'N/A',
        model: v.device?.model || 'Generic',
        sim: v.device?.sim_id || '3310203040', 
        iccid: '8952' + Math.floor(Math.random() * 100000000), 
        activationDate: activation,
        platformExpiry: expiry,
        protocol: v.device?.protocol || 'JT808',
        voltage: isActive ? '13.8 V' : '12.4 V',
        accStatus: isActive ? 'ENCENDIDO' : 'APAGADO',
        lastGps: new Date().toLocaleTimeString(),
        expiration: expiry,
        
        // ✅ CORRECCIÓN AQUÍ: Se agregó el ": '4G - Estable'" que faltaba
        signal: isActive ? '4G - Fuerte' : '4G - Estable',

        // Asignación del icono
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