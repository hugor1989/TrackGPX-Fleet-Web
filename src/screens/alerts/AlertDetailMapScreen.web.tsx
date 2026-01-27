import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import MainLayout from '../../layouts/MainLayout';
import { AlertLog } from '../../api/alertService';

// ⚠️ TU API KEY AQUÍ
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

const containerStyle = { width: '100%', height: '100%' };

export default function AlertDetailMapScreenWeb() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  
  // Recibimos la alerta completa por parámetros
  const alert = route.params?.alert as AlertLog;

  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // Coordenadas del evento (o default CDMX si falla)
  const eventLocation = {
    lat: alert?.latitude || 19.4326,
    lng: alert?.longitude || -99.1332
  };

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!alert) {
    return (
      <MainLayout activeMenu="Alertas-Activas">
        <View style={styles.errorContainer}>
          <Text>No se especificó una alerta.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text>Volver</Text>
          </TouchableOpacity>
        </View>
      </MainLayout>
    );
  }

  // Helpers para iconos y colores (reutilizando lógica visual)
  const getIconData = (type: string) => {
    if (type.includes('power')) return { icon: 'flash', color: '#dc2626', label: 'Corte de Corriente' };
    if (type.includes('speed')) return { icon: 'speedometer', color: '#ea580c', label: 'Exceso de Velocidad' };
    if (type.includes('geofence')) return { icon: 'map', color: '#2563eb', label: 'Evento de Zona' };
    return { icon: 'notifications', color: '#4b5563', label: 'Evento del Sistema' };
  };

  const iconData = getIconData(alert.type);

  return (
    <MainLayout activeMenu="Alertas-Activas">
      <View style={styles.container}>
        
        {/* --- PANEL LATERAL (INFORMACIÓN) --- */}
        <View style={styles.sidebar}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle de Alerta</Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            
            {/* Tarjeta Principal */}
            <View style={[styles.mainCard, { borderLeftColor: iconData.color }]}>
              <View style={[styles.iconBox, { backgroundColor: iconData.color + '20' }]}>
                <Ionicons name={iconData.icon as any} size={32} color={iconData.color} />
              </View>
              <Text style={styles.alertTitle}>{iconData.label}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{new Date(alert.occurred_at).toLocaleString()}</Text>
            </View>

            {/* Detalles Técnicos */}
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>Datos del Vehículo</Text>
              
              <View style={styles.row}>
                <Ionicons name="car-sport-outline" size={20} color="#6b7280" />
                <View>
                  <Text style={styles.rowLabel}>Vehículo</Text>
                  <Text style={styles.rowValue}>
                    {alert.vehicle ? `${alert.vehicle.brand} ${alert.vehicle.model}` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
                <View>
                  <Text style={styles.rowLabel}>Placas / ID</Text>
                  <Text style={styles.rowValue}>{alert.vehicle?.plate || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Datos del Evento</Text>

              {alert.speed !== undefined && (
                <View style={styles.row}>
                  <Ionicons name="speedometer-outline" size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.rowLabel}>Velocidad Detectada</Text>
                    <Text style={styles.rowValue}>{alert.speed.toFixed(0)} km/h</Text>
                  </View>
                </View>
              )}

              <View style={styles.row}>
                <Ionicons name="location-outline" size={20} color="#6b7280" />
                <View>
                  <Text style={styles.rowLabel}>Coordenadas</Text>
                  <Text style={styles.rowValue}>
                    {alert.latitude?.toFixed(5)}, {alert.longitude?.toFixed(5)}
                  </Text>
                </View>
              </View>

            </View>

            {/* Botones de Acción */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.primaryBtnText}>Marcar como Atendido</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>

        {/* --- MAPA (DERECHA) --- */}
        <View style={styles.mapContainer}>
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={eventLocation}
              zoom={16}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{ 
                streetViewControl: false, 
                mapTypeControl: false,
                fullscreenControl: false
              }}
            >
              {/* Marcador del Evento */}
              <Marker 
                position={eventLocation}
              />
              
              {/* Ventanita de Info sobre el marcador */}
              <InfoWindow position={eventLocation}>
                <div style={{ padding: 5, color: '#000' }}>
                  <b style={{fontSize:'14px'}}>{iconData.label}</b><br/>
                  <span style={{fontSize:'12px'}}>{new Date(alert.occurred_at).toLocaleTimeString()}</span>
                </div>
              </InfoWindow>
            </GoogleMap>
          </LoadScript>
        </View>

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', height: '100%' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Sidebar
  sidebar: { width: 360, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 10 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  scrollContent: { flex: 1, padding: 20 },

  // Main Card
  mainCard: { backgroundColor: '#f9fafb', padding: 20, borderRadius: 12, borderLeftWidth: 4, marginBottom: 24 },
  iconBox: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  alertMessage: { fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 8 },
  alertTime: { fontSize: 12, color: '#9ca3af' },

  // Details
  detailsContainer: { gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rowLabel: { fontSize: 12, color: '#6b7280' },
  rowValue: { fontSize: 15, fontWeight: '500', color: '#1f2937' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  actions: { marginTop: 40, marginBottom: 40 },
  primaryBtn: { backgroundColor: '#226bfc', padding: 16, borderRadius: 8, alignItems: 'center', shadowColor: '#226bfc', shadowOpacity: 0.2, shadowRadius: 4 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backBtn: { marginTop: 20, padding: 10, backgroundColor: '#eee', borderRadius: 5 },

  // Map
  mapContainer: { flex: 1, backgroundColor: '#e5e7eb' },
});