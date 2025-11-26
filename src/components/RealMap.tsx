import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface Vehicle {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  speed: string;
  location?: string;
}

interface RealMapProps {
  vehicles: Vehicle[];
  style?: any;
}

export default function RealMap({ vehicles, style }: RealMapProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  const API_KEY = 'AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM';

  useEffect(() => {
    console.log('🗺️ RealMap - Montando componente');
    console.log('📍 Platform:', Platform.OS);
    console.log('🚗 Vehículos recibidos:', vehicles?.length || 0, vehicles);
    console.log('🎯 MapRef:', !!mapRef.current);
    
    if (Platform.OS === 'web') {
      // Esperar un momento para que el iframe esté listo
      setTimeout(() => {
        if (mapRef.current) {
          console.log('✅ Inicializando mapa...');
          initializeMap();
        } else {
          console.log('❌ MapRef no está disponible aún');
          setError('MapRef no disponible');
        }
      }, 100);
    }
  }, [vehicles]);

  const initializeMap = () => {
    const iframe = mapRef.current;
    if (!iframe) {
      console.error('❌ No hay iframe reference');
      setError('No iframe reference');
      return;
    }

    console.log('🎨 Generando HTML del mapa...');

    // Centro por defecto o primer vehículo
    const center = vehicles && vehicles.length > 0
      ? { lat: vehicles[0].latitude, lng: vehicles[0].longitude }
      : { lat: -34.6037, lng: -58.3816 }; // Buenos Aires

    console.log('📍 Centro del mapa:', center);

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
            console.log('📍 Mapa cargando...');
            let map;
            let markers = [];
            
            function initMap() {
              console.log('✅ initMap called');
              
              try {
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

                console.log('✅ Mapa creado');

                const vehicles = ${JSON.stringify(vehicles || [])};
                console.log('🚗 Vehículos a renderizar:', vehicles.length);
                
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
                    markers.forEach(m => m.infoWindow.close());
                    infoWindow.open(map, marker);
                  });

                  markers.push({ marker, infoWindow });
                });

                console.log('✅ Marcadores creados:', markers.length);

                if (vehicles.length > 1) {
                  const bounds = new google.maps.LatLngBounds();
                  vehicles.forEach(vehicle => {
                    bounds.extend({ lat: vehicle.latitude, lng: vehicle.longitude });
                  });
                  map.fitBounds(bounds);
                }

                console.log('✅ Mapa completamente inicializado');
              } catch (error) {
                console.error('❌ Error al inicializar mapa:', error);
              }
            }

            window.initMap = initMap;
            console.log('📍 Cargando Google Maps API...');
          </script>
          <script 
            async 
            defer
            src="https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap"
            onerror="console.error('❌ Error cargando Google Maps API')"
          >
          </script>
        </body>
      </html>
    `;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        console.log('📝 Escribiendo HTML en iframe...');
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        setMapLoaded(true);
        console.log('✅ HTML escrito correctamente');
      } else {
        console.error('❌ No se puede acceder al documento del iframe');
        setError('No se puede acceder al documento del iframe');
      }
    } catch (err) {
      console.error('❌ Error al escribir en iframe:', err);
      setError('Error al escribir en iframe: ' + err);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Error de mapa</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        <iframe
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          title="Google Maps"
        />
      </View>
    );
  }

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
    backgroundColor: '#e8f4f8',
  },
  errorContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    zIndex: 1000,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
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