import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ⚠️ Pon tu API KEY aquí
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.4326, lng: -99.1332 };

export default function GeofenceMapScreenWeb() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // REFS para manipular los objetos de Google Maps sin causar re-renders infinitos
  const circleRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  const [center, setCenter] = useState(defaultCenter);
  const [radius, setRadius] = useState(200);
  const [polygonPoints, setPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', message: '' });

  // 1. CARGA DE DATOS
  useEffect(() => {
    if (route.params?.geofence) {
      const geo = route.params.geofence;
      setIsEditing(true);
      setName(geo.name);
      setType(geo.type);

      try {
        let rawCoords = geo.coordinates;
        if (typeof rawCoords === 'string') rawCoords = JSON.parse(rawCoords);

        if (geo.type === 'circle') {
          const point = Array.isArray(rawCoords) ? rawCoords[0] : rawCoords;
          const lat = parseFloat(point.latitude ?? point.lat);
          const lng = parseFloat(point.longitude ?? point.lng);
          setCenter({ lat, lng });
          setRadius(parseFloat(geo.radius) || 200);
        } else {
          const points = rawCoords.map((p: any) => ({
            lat: parseFloat(p.latitude ?? p.lat),
            lng: parseFloat(p.longitude ?? p.lng)
          }));
          setPolygonPoints(points);
          if (points.length > 0) setCenter(points[0]);
        }
      } catch (e) { console.error("Error data:", e); }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [route.params]);

  // --- MANEJADORES DE EVENTOS (SIN SETSTATE EN CADA MOVIMIENTO) ---

  const onCircleComplete = () => {
    if (circleRef.current) {
      const newCenter = circleRef.current.getCenter();
      const newRadius = circleRef.current.getRadius();
      setCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
      setRadius(newRadius);
    }
  };

  const onPolygonComplete = () => {
    if (polygonRef.current) {
      const path = polygonRef.current.getPath();
      const points = [];
      for (let i = 0; i < path.getLength(); i++) {
        points.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
      }
      setPolygonPoints(points);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (isEditing) return;
    if (type === 'polygon' && e.latLng) {
      setPolygonPoints(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return setModalConfig({type:'error', title:'Error', message:'Falta nombre'}), setModalVisible(true);
    
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

      if (isEditing) {
        await geofenceService.updateGeofence(route.params.geofence.id, payload);
      } else {
        await geofenceService.createGeofence(payload);
      }
      
      setModalConfig({ type: 'success', title: '¡Éxito!', message: 'Geocerca guardada.' });
      setModalVisible(true);
    } catch (err: any) {
      setModalConfig({ type: 'error', title: 'Error', message: err.message });
      setModalVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout activeMenu="Monitor-Geocercas">
      <View style={styles.container}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <View style={styles.mapContainer}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={15}
              onClick={handleMapClick}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {type === 'circle' && (
                <Circle 
                  onLoad={c => circleRef.current = c}
                  center={center} 
                  radius={radius} 
                  options={{ 
                    fillColor: "rgba(34, 107, 252, 0.2)", 
                    strokeColor: "#226bfc", 
                    strokeWeight: 2, 
                    editable: true, 
                    draggable: true 
                  }} 
                  onDragEnd={onCircleComplete}
                  onRadiusChanged={onCircleComplete}
                />
              )}

              {type === 'polygon' && polygonPoints.length > 0 && (
                <Polygon 
                  onLoad={p => polygonRef.current = p}
                  paths={polygonPoints} 
                  options={{ 
                    fillColor: "rgba(34, 107, 252, 0.2)", 
                    strokeColor: "#226bfc", 
                    strokeWeight: 2,
                    editable: true,
                    draggable: true
                  }} 
                  onMouseUp={onPolygonComplete}
                  onDragEnd={onPolygonComplete}
                />
              )}
            </GoogleMap>
          </View>
        </LoadScript>

        <View style={styles.sidebarPanel}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditing ? 'Editar Zona' : 'Nueva Geocerca'}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            
            <View style={styles.typeRow}>
                <TouchableOpacity style={[styles.typeBtn, type === 'circle' && styles.typeBtnActive]} onPress={() => !isEditing && setType('circle')}>
                  <Text style={[styles.typeText, type === 'circle' && {color:'#fff'}]}>Circular</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, type === 'polygon' && styles.typeBtnActive]} onPress={() => !isEditing && setType('polygon')}>
                  <Text style={[styles.typeText, type === 'polygon' && {color:'#fff'}]}>Polígono</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                    {type === 'circle' ? "Mueve el centro para reubicar o estira los bordes para el radio." : "Arrastra los puntos blancos para deformar o estirar el polígono."}
                </Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Geocerca</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {modalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              <Text style={styles.modalDesc}>{modalConfig.message}</Text>
              <TouchableOpacity style={styles.modalBtn} onPress={() => { setModalVisible(false); if(modalConfig.type==='success') navigation.goBack(); }}>
                <Text style={styles.modalBtnText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  mapContainer: { flex: 1 },
  sidebarPanel: { width: 320, backgroundColor: '#fff', padding: 20, borderLeftWidth: 1, borderColor: '#eee' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  form: { gap: 15 },
  label: { fontWeight: '600', color: '#444' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#226bfc', borderColor: '#226bfc' },
  typeText: { fontSize: 12, color: '#666' },
  hintBox: { backgroundColor: '#f0f7ff', padding: 12, borderRadius: 8 },
  hintText: { fontSize: 12, color: '#226bfc', lineHeight: 18 },
  saveBtn: { backgroundColor: '#226bfc', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { position: 'absolute', width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', zIndex: 1000 },
  modalCard: { backgroundColor:'#fff', padding: 25, borderRadius: 15, width: 300, alignItems:'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalDesc: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalBtn: { backgroundColor: '#226bfc', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});