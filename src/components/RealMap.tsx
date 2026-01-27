import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
// Asegúrate de importar la interfaz desde tu archivo de datos
import { Vehicle } from '../api/mockData'; 

interface RealMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null; // Recibimos el vehículo seleccionado
  style?: any;
}

export default function RealMap({ vehicles, selectedVehicle, style }: RealMapProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // ⚠️ TU API KEY AQUÍ
  const API_KEY = 'AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM'; 

  // 1. Inicializar mapa (Solo una vez)
  useEffect(() => {
    if (Platform.OS === 'web' && mapRef.current && !isMapReady) {
      initializeMap();
    }
  }, []);

  // 2. Escuchar cambios en la lista de vehículos (Simulación de movimiento)
  useEffect(() => {
    if (isMapReady && mapRef.current?.contentWindow) {
      mapRef.current.contentWindow.postMessage({
        type: 'UPDATE_VEHICLES',
        payload: vehicles
      }, '*');
    }
  }, [vehicles, isMapReady]);

  // 3. ZOOM AL VEHÍCULO SELECCIONADO (Aquí estaba el problema antes)
  useEffect(() => {
    if (isMapReady && selectedVehicle && mapRef.current?.contentWindow) {
      console.log("Zooming to ID:", selectedVehicle.id); // Debug
      mapRef.current.contentWindow.postMessage({
        type: 'FOCUS_VEHICLE',
        payload: selectedVehicle.id // Enviamos solo el ID
      }, '*');
    }
  }, [selectedVehicle, isMapReady]);

  const initializeMap = () => {
    const iframe = mapRef.current;
    if (!iframe) return;

    // Centro inicial
    const center = vehicles.length 
      ? { lat: vehicles[0].latitude, lng: vehicles[0].longitude }
      : { lat: -34.6037, lng: -58.3816 };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body, #map { height: 100%; margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let map;
            // CAMBIO 1: Usamos un objeto en lugar de array para buscar rápido por ID
            let markers = {}; 
            let infoWindows = {};

            function initMap() {
              map = new google.maps.Map(document.getElementById('map'), {
                zoom: 12,
                center: { lat: ${center.lat}, lng: ${center.lng} },
                mapTypeId: 'roadmap',
                disableDefaultUI: true,
                zoomControl: true,
              });

              // Avisar a React que estamos listos
              window.parent.postMessage({ type: 'MAP_READY' }, '*');
              
              // Carga inicial
              const initialVehicles = ${JSON.stringify(vehicles)};
              updateMarkers(initialVehicles);
            }

            // Escuchar mensajes desde React
            window.addEventListener('message', (event) => {
              const { type, payload } = event.data;
              
              if (type === 'UPDATE_VEHICLES') {
                updateMarkers(payload);
              } 
              else if (type === 'FOCUS_VEHICLE') {
                focusMarker(payload);
              }
            });

            function updateMarkers(vehiclesData) {
              vehiclesData.forEach(v => {
                const latLng = { lat: v.latitude, lng: v.longitude };
                const isMoving = v.status === 'active';

                // Si ya existe el marcador, solo lo movemos
                if (markers[v.id]) {
                  markers[v.id].setPosition(latLng);
                  
                  // Actualizar icono (rotación)
                  const icon = markers[v.id].getIcon();
                  icon.rotation = v.heading || 0;
                  markers[v.id].setIcon(icon);
                  
                } else {
                  // Si no existe, lo creamos
                  const marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: v.name,
                    icon: {
                      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 5,
                      fillColor: isMoving ? '#27ae60' : '#e74c3c', // Verde o Rojo
                      fillOpacity: 1,
                      strokeColor: 'white',
                      strokeWeight: 1,
                      rotation: v.heading || 0,
                    }
                  });

                  // Crear InfoWindow
                  const content = \`
                    <div style="font-family: Arial, sans-serif; padding: 5px;">
                      <h3 style="margin: 0 0 5px;">\${v.name}</h3>
                      <p style="margin: 0;">Vel: <b>\${v.speed} km/h</b></p>
                      <p style="margin: 0; font-size: 12px; color: #666;">\${v.location}</p>
                    </div>
                  \`;
                  
                  const infoWindow = new google.maps.InfoWindow({ content });

                  marker.addListener('click', () => {
                    closeAllInfoWindows();
                    infoWindow.open(map, marker);
                  });

                  // CAMBIO 2: Guardamos usando el ID como llave
                  markers[v.id] = marker;
                  infoWindows[v.id] = infoWindow;
                }
              });
            }

            function focusMarker(vehicleId) {
              // CAMBIO 3: Buscamos directamente por ID
              const marker = markers[vehicleId];
              
              if (marker) {
                map.panTo(marker.getPosition());
                map.setZoom(16); // Zoom más cercano
                
                // Abrimos su ventanita de información
                closeAllInfoWindows();
                if(infoWindows[vehicleId]) {
                    infoWindows[vehicleId].open(map, marker);
                }
              }
            }

            function closeAllInfoWindows() {
              Object.values(infoWindows).forEach(iw => iw.close());
            }

            window.initMap = initMap;
          </script>
          <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap">
          </script>
        </body>
      </html>
    `;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    }
  };

  // Listener para saber cuando el mapa cargó
  useEffect(() => {
    const handler = (event: any) => {
      if (event.data?.type === 'MAP_READY') {
        setIsMapReady(true);
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {!API_KEY ? (
          <Text style={{padding: 20}}>Falta API Key</Text>
        ) : (
          <iframe
            ref={mapRef}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Google Maps"
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Mapa solo disponible en Web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee' }
});