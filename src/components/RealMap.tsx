import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface Vehicle {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  speed: string;
}

interface RealMapProps {
  vehicles: Vehicle[];
  style?: any;
}

export default function RealMap({ vehicles, style }: RealMapProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Tu API Key de Google Maps (IMPORTANTE: Configúrala aquí o usa variables de entorno)
  const API_KEY = 'AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM'; // Reemplazar con tu API key real

  useEffect(() => {
    if (Platform.OS === 'web' && mapRef.current && vehicles.length > 0) {
      initializeMap();
    }
  }, [vehicles]);

  const initializeMap = () => {
    const iframe = mapRef.current;
    if (!iframe) return;

    // Calcular el centro del mapa basado en los vehículos
    const center = vehicles.length 
      ? { lat: vehicles[0].latitude, lng: vehicles[0].longitude }
      : { lat: 20.5426093, lng: -103.2778923 };

    // Crear HTML del mapa con Google Maps JavaScript API
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { height: 100%; width: 100%; overflow: hidden; }
            #map { height: 100%; width: 100%; }
            .info-window {
              font-family: Arial, sans-serif;
              padding: 8px;
            }
            .info-window h3 {
              margin: 0 0 8px 0;
              color: #2c3e50;
              font-size: 14px;
            }
            .info-window p {
              margin: 4px 0;
              font-size: 12px;
              color: #555;
            }
            .info-window .status {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              margin-top: 4px;
            }
            .info-window .moving {
              background: #27ae60;
              color: white;
            }
            .info-window .stopped {
              background: #e74c3c;
              color: white;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let map;
            let markers = [];
            
            function initMap() {
              // Configurar el mapa
              map = new google.maps.Map(document.getElementById('map'), {
                zoom: 12,
                center: { lat: ${center.lat}, lng: ${center.lng} },
                mapTypeId: 'roadmap',
                styles: [
                  {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                  }
                ],
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: false,
              });

              // Agregar marcadores para cada vehículo
              const vehicles = ${JSON.stringify(vehicles)};
              
              vehicles.forEach(vehicle => {
                const isMoving = vehicle.status === 'En movimiento';
                
                const marker = new google.maps.Marker({
                  position: { lat: vehicle.latitude, lng: vehicle.longitude },
                  map: map,
                  title: vehicle.name,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: isMoving ? '#27ae60' : '#e74c3c',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  },
                  label: {
                    text: vehicle.name.charAt(0),
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }
                });

                const infoContent = \`
                  <div class="info-window">
                    <h3>\${vehicle.name}</h3>
                    <p><strong>Ubicación:</strong> \${vehicle.location || 'Desconocida'}</p>
                    <p><strong>Velocidad:</strong> \${vehicle.speed}</p>
                    <span class="status \${isMoving ? 'moving' : 'stopped'}">
                      \${vehicle.status}
                    </span>
                  </div>
                \`;

                const infoWindow = new google.maps.InfoWindow({
                  content: infoContent
                });

                marker.addListener('click', () => {
                  // Cerrar todas las ventanas de información abiertas
                  markers.forEach(m => m.infoWindow.close());
                  infoWindow.open(map, marker);
                });

                markers.push({ marker, infoWindow });
              });

              // Ajustar el mapa para mostrar todos los marcadores
              if (vehicles.length > 1) {
                const bounds = new google.maps.LatLngBounds();
                vehicles.forEach(vehicle => {
                  bounds.extend({ lat: vehicle.latitude, lng: vehicle.longitude });
                });
                map.fitBounds(bounds);
              }
            }

            window.initMap = initMap;
          </script>
          <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap">
          </script>
        </body>
      </html>
    `;

    // Inyectar el HTML en el iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setMapLoaded(true);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {!API_KEY || API_KEY === 'TU_API_KEY_AQUI' ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Configuración necesaria</Text>
            <Text style={styles.errorText}>
              Necesitas agregar tu Google Maps API Key en RealMap.tsx
            </Text>
            <Text style={styles.errorSteps}>
              Pasos:
              {'\n'}1. Ve a Google Cloud Console
              {'\n'}2. Habilita "Maps JavaScript API"
              {'\n'}3. Copia tu API Key
              {'\n'}4. Reemplaza 'TU_API_KEY_AQUI' en el código
            </Text>
          </View>
        ) : (
          <>
            <iframe
              ref={mapRef}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Google Maps"
            />
            
          </>
        )}
      </View>
    );
  }

  // Para móvil, mostrar mensaje o implementar react-native-maps
  return (
    <View style={[styles.container, styles.mobileContainer, style]}>
      <Text style={styles.mobileText}>
        Vista de mapa disponible solo en versión web
      </Text>
      <Text style={styles.mobileSubtext}>
        Para móvil, instala react-native-maps
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e8f4f8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff3cd',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#856404',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorSteps: {
    fontSize: 14,
    color: '#856404',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    textAlign: 'left',
  },
  overlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  overlaySubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  mobileContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  mobileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  mobileSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});