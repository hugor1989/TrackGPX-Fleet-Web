import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, LoadScript, Circle, Polygon, Marker } from '@react-google-maps/api';
import geofenceService, { CreateGeofenceRequest } from '../../api/geofenceService';
import MainLayout from '../../layouts/MainLayout';

// ⚠️ TU API KEY AQUÍ
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.4326, lng: -99.1332 };

export default function GeofenceMapScreenWeb() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Estados
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true); // Nuevo estado de carga inicial
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [radius, setRadius] = useState(200);
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', message: '' });

  // 1. CARGA DE DATOS (EDICIÓN O NUEVO)
  useEffect(() => {
    if (route.params?.geofence) {
      const geo = route.params.geofence;
      console.log("📍 Editando Geocerca:", geo); // Debug en consola

      setIsEditing(true);
      setName(geo.name);
      setType(geo.type);

      // --- PARSEO ROBUSTO DE COORDENADAS ---
      try {
        let rawCoords = geo.coordinates;
        
        // Si por alguna razón llega como string, lo parseamos
        if (typeof rawCoords === 'string') {
          rawCoords = JSON.parse(rawCoords);
        }

        if (geo.type === 'circle') {
          // Lógica para Círculo
          // Aceptamos array de 1 punto o objeto directo
          const point = Array.isArray(rawCoords) ? rawCoords[0] : rawCoords;
          
          // Detectamos si viene como lat/lng o latitude/longitude
          const lat = parseFloat(point.latitude ?? point.lat);
          const lng = parseFloat(point.longitude ?? point.lng);

          if (!isNaN(lat) && !isNaN(lng)) {
            setCenter({ lat, lng });
            setRadius(parseFloat(geo.radius) || 200);
          }

        } else {
          // Lógica para Polígono
          if (Array.isArray(rawCoords)) {
            const points = rawCoords.map((p: any) => ({
              lat: parseFloat(p.latitude ?? p.lat),
              lng: parseFloat(p.longitude ?? p.lng)
            })).filter(p => !isNaN(p.lat) && !isNaN(p.lng)); // Filtramos inválidos

            console.log("🔻 Puntos Polígono procesados:", points);
            setPolygonPoints(points);

            // Centrar mapa en el primer punto del polígono
            if (points.length > 0) {
              setCenter(points[0]);
            }
          }
        }
      } catch (e) {
        console.error("Error parseando coordenadas:", e);
      }
      setLoading(false);

    } else {
      // MODO NUEVO: Obtener ubicación actual
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
            setLoading(false);
          },
          () => setLoading(false) // Si falla, usamos default
        );
      } else {
        setLoading(false);
      }
    }
  }, [route.params]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => setMap(mapInstance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  // Eventos Mapa
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (isEditing) return;
    if (type === 'polygon' && e.latLng) {
      setPolygonPoints([...polygonPoints, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
    }
  };

  const handleDragEnd = () => {
    if (isEditing) return;
    if (map && type === 'circle') {
      const newCenter = map.getCenter();
      if (newCenter) setCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
    }
  };

  // Modal Helpers
  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    if (modalConfig.type === 'success' && !isEditing) {
      navigation.goBack();
    }
  };

  // Guardar
  const handleSave = async () => {
    if (isEditing) {
        navigation.goBack();
        return;
    }
    if (!name.trim()) return showModal('error', 'Falta Nombre', 'Por favor asigna un nombre.');
    if (type === 'polygon' && polygonPoints.length < 3) return showModal('error', 'Polígono Incompleto', 'Marca al menos 3 puntos.');

    try {
      setSaving(true);
      const payload: CreateGeofenceRequest = {
        name,
        type,
        coordinates: type === 'circle' 
          ? { latitude: center.lat, longitude: center.lng }
          : polygonPoints.map(p => ({ latitude: p.lat, longitude: p.lng })),
        radius: type === 'circle' ? radius : 0,
      };

      await geofenceService.createGeofence(payload);
      showModal('success', '¡Geocerca Guardada!', 'La zona se ha registrado correctamente.');
    } catch (err: any) {
      showModal('error', 'Error al Guardar', err.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout activeMenu="Monitor-Geocercas">
      <View style={styles.container}>
        
        {/* MAPA */}
        <View style={styles.mapContainer}>
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              onDragEnd={handleDragEnd}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {/* CÍRCULO */}
              {type === 'circle' && (
                <>
                  <Marker position={center} />
                  <Circle 
                    center={center} 
                    radius={radius} 
                    options={{ 
                        fillColor: "rgba(34, 107, 252, 0.2)", 
                        strokeColor: "rgba(34, 107, 252, 0.8)", 
                        strokeWeight: 2, 
                        clickable: false,
                    }} 
                  />
                </>
              )}

              {/* POLÍGONO - AQUI ESTABA EL DETALLE, AHORA YA DEBE PINTARSE */}
              {type === 'polygon' && polygonPoints.length > 0 && (
                <Polygon 
                  paths={polygonPoints} 
                  options={{ 
                      fillColor: "rgba(34, 107, 252, 0.2)", 
                      strokeColor: "rgba(34, 107, 252, 0.8)", 
                      strokeWeight: 2,
                      clickable: false
                  }} 
                />
              )}
              
              {/* Marcadores de vértices para Polígono */}
              {type === 'polygon' && polygonPoints.map((p, i) => (
                 <Marker key={i} position={p} label={{ text: `${i+1}`, color: "white", fontSize: "12px" }} />
              ))}
            </GoogleMap>
          </LoadScript>
        </View>

        {/* SIDEBAR PANEL */}
        <View style={styles.sidebarPanel}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
                {isEditing ? 'Detalle de Zona' : 'Nueva Geocerca'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#226bfc" style={{marginTop: 50}} />
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput 
                  style={[styles.input, isEditing && styles.inputDisabled]} 
                  value={name} 
                  onChangeText={setName}
                  editable={!isEditing}
                  placeholder="Nombre de la zona"
              />
              
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.typeRow}>
                {(!isEditing || type === 'circle') && (
                  <TouchableOpacity 
                    style={[styles.typeBtn, type === 'circle' && styles.typeBtnActive]} 
                    onPress={() => !isEditing && setType('circle')}
                    disabled={isEditing}
                  >
                    <Text style={[styles.typeText, type === 'circle' && {color:'#fff'}]}>Circular</Text>
                  </TouchableOpacity>
                )}
                
                {(!isEditing || type === 'polygon') && (
                  <TouchableOpacity 
                    style={[styles.typeBtn, type === 'polygon' && styles.typeBtnActive]} 
                    onPress={() => !isEditing && setType('polygon')}
                    disabled={isEditing}
                  >
                    <Text style={[styles.typeText, type === 'polygon' && {color:'#fff'}]}>Polígono</Text>
                  </TouchableOpacity>
                )}
              </View>

              {type === 'circle' ? (
                 <View style={styles.controlGroup}>
                   <Text style={styles.label}>Radio: {radius} m</Text>
                   {!isEditing ? (
                      <View style={styles.radiusInputRow}>
                          <TouchableOpacity onPress={() => setRadius(Math.max(50, radius - 50))} style={styles.radiusBtn}><Ionicons name="remove" size={16} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => setRadius(radius + 50)} style={styles.radiusBtn}><Ionicons name="add" size={16} /></TouchableOpacity>
                      </View>
                   ) : null}
                   {!isEditing && <Text style={styles.hint}>Arrastra el mapa para ubicar el centro</Text>}
                 </View>
              ) : (
                 !isEditing && (
                  <TouchableOpacity style={styles.undoBtn} onPress={() => setPolygonPoints(prev => prev.slice(0, -1))}>
                      <Text>Deshacer Punto</Text>
                  </TouchableOpacity>
                 )
              )}

              <TouchableOpacity 
                  style={[styles.saveBtn, isEditing && styles.closeBtn]} 
                  onPress={handleSave} 
                  disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                      {isEditing ? 'Cerrar' : 'Guardar Geocerca'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MODAL */}
        {modalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIcon, { backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
                <Ionicons name={modalConfig.type === 'success' ? 'checkmark' : 'alert'} size={32} color={modalConfig.type === 'success' ? '#166534' : '#991b1b'} />
              </View>
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              <Text style={styles.modalDesc}>{modalConfig.message}</Text>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: modalConfig.type === 'success' ? '#226bfc' : '#ef4444' }]}
                onPress={closeModal}
              >
                <Text style={styles.modalBtnText}>{modalConfig.type === 'success' ? 'Aceptar' : 'Cerrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', height: '100%', position: 'relative' },
  mapContainer: { flex: 1, height: '100%' },
  sidebarPanel: { width: 320, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#e5e7eb', padding: 20, height: '100%', zIndex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  form: { gap: 16 },
  label: { fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#f9fafb' },
  inputDisabled: { color: '#6b7280', backgroundColor: '#f3f4f6' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  typeBtnActive: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  typeText: { fontSize: 13, color: '#6b7280' },
  controlGroup: { padding: 16, backgroundColor: '#f3f4f6', borderRadius: 8 },
  radiusInputRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  radiusBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
  undoBtn: { padding: 10, backgroundColor: '#f3f4f6', alignItems: 'center', borderRadius: 8 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#226bfc', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  closeBtn: { backgroundColor: '#4b5563' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: 350, padding: 30, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  modalIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' },
  modalDesc: { textAlign: 'center', color: '#6b7280', marginBottom: 24 },
  modalBtn: { width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});