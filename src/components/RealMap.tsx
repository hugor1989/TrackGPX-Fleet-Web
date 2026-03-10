import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Vehicle } from '../api/mockData'; 

interface RealMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  style?: any;
  onMessage?: (event: any) => void;
}

export default function RealMap({ vehicles, selectedVehicle, style, onMessage }: RealMapProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Inicializar mapa (Web/WebView)
  useEffect(() => {
    if (Platform.OS === 'web' && mapRef.current && !isMapReady) {
      initializeMap();
    }
  }, []);

  // 2. Actualizar vehículos
  useEffect(() => {
    if (isMapReady && mapRef.current?.contentWindow) {
      mapRef.current.contentWindow.postMessage({
        type: 'UPDATE_VEHICLES',
        payload: vehicles
      }, '*');
    }
  }, [vehicles, isMapReady]);

  // 3. Zoom al vehículo seleccionado
  useEffect(() => {
    if (isMapReady && selectedVehicle && mapRef.current?.contentWindow) {
      mapRef.current.contentWindow.postMessage({
        type: 'FOCUS_VEHICLE',
        payload: selectedVehicle.id
      }, '*');
    }
  }, [selectedVehicle, isMapReady]);

  const initializeMap = () => {
    const iframe = mapRef.current;
    if (!iframe) return;

    // Centro inicial: Guadalajara
    const center = { lat: 20.676667, lng: -103.3475 };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <style>
            html, body, #map { height: 100%; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
            
            /* Animación suave para el movimiento del marcador */
            .vehicle-marker-container { transition: all 0.5s linear; }
            .vehicle-icon { transition: transform 0.5s linear; }
            
            /* Popup personalizado */
            .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
            .leaflet-popup-content { margin: 0; width: auto !important; }
            .leaflet-popup-tip { box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
          </style>
        </head>
        <body>
          <div id="map"></div>

          <script>
            let map;
            let markers = {}; 

            // --- 1. DICCIONARIO DE ICONOS (SVG PATHS) ---
            const ICON_PATHS = {
                // Auto (Default)
                'car-sport': 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
                
                // Camioneta / Pickup
                'pickup': 'M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17-5.42l1.41 1.41.13.13C15.38 10.23 16.63 10.96 18 10.98V6h-2l-2.48 1.56zM5 13c1.1 0 2-.9 2-2V5H3v6c0 1.1.9 2 2 2z',
                
                // Camión
                'truck': 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
                
                // Moto
                'motorcycle': 'M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.49-1.73 4.91-4h5.18c.42 2.27 2.45 4 4.91 4 2.8 0 5-2.2 5-5 0-2.8-2.2-5-5-5zm-9.78 0h.76l1 2H5c-.34 0-.67.03-1 .08v-1.58c0-1.38 1.12-2.5 2.5-2.5h3.16zM5 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm15 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
                
                // Avión
                'airplane': 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'
            };

            function initMap() {
              // --- CAPAS ---
              const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19, attribution: '© OpenStreetMap'
              });

              const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
                  maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']
              });

              const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
                  maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']
              });

              const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
                  maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']
              });

              // --- MAPA ---
              map = L.map('map', {
                center: [${center.lat}, ${center.lng}],
                zoom: 13,
                layers: [osmLayer], // Default: OSM
                zoomControl: false 
              });

              L.control.zoom({ position: 'bottomright' }).addTo(map);

              // Control de Capas
              const baseMaps = {
                "OpenStreetMap": osmLayer,
                "Google Calles": googleStreets,
                "Google Híbrido": googleHybrid,
                "Satélite": googleSat
              };
              L.control.layers(baseMaps).addTo(map);

              sendMessageToReact({ type: 'MAP_READY' });
            }

            // --- HELPER COMUNICACIÓN ---
            function sendMessageToReact(msg) {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
                } else {
                    window.parent.postMessage(msg, '*');
                }
            }

            // --- 2. CREADOR DE ICONOS DINÁMICO ---
            function createCarIcon(color, rotation, type) {
              // Escapamos el $ para que React no lo confunda con una variable propia
              const iconUrl = \`https://backend.track-gpx.com.mx/assets/icons/map/\${type}.png\`;

              return L.icon({
                iconUrl: iconUrl,
                iconSize: [42, 42],
                iconAnchor: [21, 21],
                popupAnchor: [0, -20],
                className: 'vehicle-icon-realistic'
              });
            }

            // --- 3. CONTENIDO DEL POPUP ---
            function getPopupContent(v) {
              const speed = Math.round(v.speed);
              return \`
               <div style="font-family: 'Segoe UI', sans-serif; text-align:center; min-width: 160px; padding: 12px;">
                  
                  <h3 style="margin:0 0 8px; color:#1e293b; font-size:15px; font-weight:700; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                    \${v.name}
                  </h3>
                  
                  <div style="background-color:#f1f5f9; padding:6px; border-radius:6px; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                    <span style="font-size:18px;">👤</span>
                    <div style="text-align:left;">
                        <div style="font-size:9px; color:#64748b; font-weight:600; text-transform:uppercase;">Conductor</div>
                        <div style="font-size:12px; color:#0f172a; font-weight:600;">\${v.driverName || 'No asignado'}</div>
                    </div>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:5px 0;">
                    <div style="text-align:center; flex:1; border-right:1px solid #f1f5f9;">
                        <div style="font-size:9px; color:#94a3b8; font-weight:600;">VELOCIDAD</div>
                        <strong style="color:#0f172a; font-size:13px;">\${speed} km/h</strong>
                    </div>
                    <div style="text-align:center; flex:1;">
                         <div style="font-size:9px; color:#94a3b8; font-weight:600;">ESTADO</div>
                         <strong style="font-size:11px; color:\${v.status === 'active' ? '#10b981' : '#ef4444'}">
                            \${v.status === 'active' ? 'EN RUTA' : 'DETENIDO'}
                         </strong>
                    </div>
                  </div>

                  <div style="margin-top:8px; font-size:10px; color:#64748b; display:flex; align-items:center; justify-content:center; gap:4px;">
                     <span>📍</span> \${v.location || 'Ubicación desconocida'}
                  </div>

                </div>
              \`;
            }

            // --- 4. ACTUALIZAR MARCADORES ---
            function updateMarkers(vehiclesData) {
              vehiclesData.forEach(v => {
                  const lat = v.latitude || v.lat; // Soporte para ambos nombres de campo
                  const lng = v.longitude || v.lng;
                  
                  if (!lat || !lng) return;

                  const isMoving = v.status === 'active';
                  const color = isMoving ? '#10b981' : '#ef4444';
                  const heading = v.heading || 0;
                  
                  // --- LA CORRECCIÓN ESTÁ AQUÍ ---
                  // Buscamos primero en v.map_icon (lo que guardamos en el modal)
                  // Luego intentamos en deviceInfo (por compatibilidad con MockData)
                  // Y si no hay nada, 'car-sport'
                  const iconType = v.map_icon || (v.deviceInfo && v.deviceInfo.mapIcon) || 'car-sport';

                  if (markers[v.id]) {
                        const marker = markers[v.id];
                        marker.setLatLng([lat, lng]);
                        marker.setIcon(createCarIcon(color, heading, iconType));

                        // Esto asegura que la imagen rote sobre su propio eje
                        if (marker._icon) {
                            marker._icon.style.transformOrigin = 'center';
                            // Concatenamos la rotación al transform existente
                            marker._icon.style.transform += \` rotate(\${heading}deg)\`;
                        }
                    } else {
                      const marker = L.marker([lat, lng], {
                          icon: createCarIcon(color, heading, iconType)
                      }).addTo(map);

                      marker.bindPopup(getPopupContent(v));

                      marker.on('click', () => {
                          sendMessageToReact({ type: 'MARKER_CLICK', payload: v.id });
                      });

                      markers[v.id] = marker;
                  }
              });
          }

            function focusMarker(vehicleId) {
              const marker = markers[vehicleId];
              if (marker) {
                map.flyTo(marker.getLatLng(), 16, { animate: true, duration: 1.5 });
                marker.openPopup();
              }
            }

            // --- MESSAGE LISTENER ---
            window.addEventListener('message', (event) => {
              let data = event.data;
              if (typeof data === 'string') {
                  try { data = JSON.parse(data); } catch(e){}
              }
              const { type, payload } = data;

              if (type === 'UPDATE_VEHICLES') updateMarkers(payload);
              if (type === 'FOCUS_VEHICLE') focusMarker(payload);
            });

            // ARRANCAR
            initMap();
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

  // Manejo de eventos del WebView / Iframe
  useEffect(() => {
    const handler = (event: any) => {
       // Reenviamos el evento al padre (Dashboard)
       if (onMessage) onMessage(event);
       
       if (event.data?.type === 'MAP_READY') {
          setIsMapReady(true);
       }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, [onMessage]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
         <iframe
            ref={mapRef}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Fleet Map"
          />
      </View>
    );
  }

  // Fallback para móvil (requiere react-native-webview)
  return (
    <View style={styles.container}>
      <Text style={{padding:20, textAlign:'center', color:'#666'}}>
        Para ver el mapa en móvil, integra 'react-native-webview' aquí.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent:'center' }
});