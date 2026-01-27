import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import MapView, { Circle, Polygon, Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'; // Agregamos useRoute
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location'; 
import geofenceService, { CreateGeofenceRequest, Geofence } from '../../api/geofenceService';

const INITIAL_REGION = {
  latitude: 19.4326,
  longitude: -99.1332,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Tipamos los parámetros de la ruta
type GeofenceMapRouteProp = RouteProp<{ params: { geofence?: Geofence } }, 'params'>;

export default function GeofenceMapScreen() {
  const navigation = useNavigation();
  const route = useRoute<GeofenceMapRouteProp>(); // Hook para recibir datos
  const mapRef = useRef<MapView>(null);

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Nuevo estado
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  
  const [circleCenter, setCircleCenter] = useState(INITIAL_REGION);
  const [radius, setRadius] = useState(200);
  const [polygonPoints, setPolygonPoints] = useState<{ latitude: number; longitude: number }[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', message: '' });

  // 1. CARGAR DATOS SI ES EDICIÓN/VISUALIZACIÓN
  useEffect(() => {
    if (route.params?.geofence) {
      const geo = route.params.geofence;
      setIsEditing(true);
      setName(geo.name);
      setType(geo.type);

      if (geo.type === 'circle') {
        // Aseguramos que coordinates sea tratado como objeto
        const coords = geo.coordinates as any; 
        // A veces el backend manda array aunque sea circulo, prevenimos eso:
        const center = Array.isArray(coords) ? coords[0] : coords;

        setCircleCenter({
          latitude: parseFloat(center.latitude),
          longitude: parseFloat(center.longitude),
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        setRadius(geo.radius || 200);

        // Centrar mapa
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: parseFloat(center.latitude),
            longitude: parseFloat(center.longitude),
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 1000);
        }, 500);

      } else {
        // Polígono
        const points = (geo.coordinates as any[]).map(p => ({
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude)
        }));
        setPolygonPoints(points);
        
        // Centrar en el primer punto
        if (points.length > 0) {
          setTimeout(() => {
            mapRef.current?.animateToRegion({
              latitude: points[0].latitude,
              longitude: points[0].longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }, 1000);
          }, 500);
        }
      }
    } else {
      // SI ES NUEVO: Obtener ubicación actual
      getCurrentLocation();
    }
  }, [route.params]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setCircleCenter(region as any);
      mapRef.current?.animateToRegion(region, 1000);
    } catch (e) { console.log(e); }
  };

  const handleMapPress = (e: MapPressEvent) => {
    if (type === 'polygon') {
      setPolygonPoints([...polygonPoints, e.nativeEvent.coordinate]);
    }
  };

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Por ahora, si es edición, solo mostramos alerta (porque no hicimos el endpoint UPDATE en backend aun)
    // Si quisieras update, sería llamar a geofenceService.updateGeofence
    if (isEditing) {
       showModal('success', 'Modo Visualización', 'La edición de geocercas estará disponible en la próxima actualización.');
       return;
    }

    if (!name.trim()) return showModal('error', 'Falta información', 'Asigna un nombre a la geocerca.');
    if (type === 'polygon' && polygonPoints.length < 3) return showModal('error', 'Polígono inválido', 'Marca al menos 3 puntos.');

    try {
      setSaving(true);
      const payload: CreateGeofenceRequest = {
        name,
        type,
        coordinates: type === 'circle' 
          ? { latitude: circleCenter.latitude, longitude: circleCenter.longitude }
          : polygonPoints,
        radius: type === 'circle' ? radius : 0,
      };

      await geofenceService.createGeofence(payload);
      showModal('success', '¡Guardado!', 'La geocerca se ha creado correctamente.');
    } catch (err: any) {
      showModal('error', 'Error al guardar', err.message || 'Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={(region) => {
          // Solo actualizamos centro si es Círculo y NO es solo visualización (opcional)
          // Aquí permitimos moverlo para ver
          if (type === 'circle') {
            setCircleCenter({ latitude: region.latitude, longitude: region.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta });
          }
        }}
        onPress={handleMapPress}
      >
        {type === 'circle' && (
          <>
            <Marker coordinate={circleCenter}>
               <View style={styles.centerMarker}><Ionicons name="scan-outline" size={24} color="#226bfc" /></View>
            </Marker>
            <Circle center={circleCenter} radius={radius} fillColor="rgba(34, 107, 252, 0.15)" strokeColor="rgba(34, 107, 252, 0.8)" strokeWidth={2} />
          </>
        )}
        {type === 'polygon' && (
          <>
            <Polygon coordinates={polygonPoints} fillColor="rgba(34, 107, 252, 0.15)" strokeColor="rgba(34, 107, 252, 0.8)" strokeWidth={2} />
            {polygonPoints.map((p, i) => <Marker key={i} coordinate={p}><View style={styles.vertexDot} /></Marker>)}
          </>
        )}
      </MapView>

      <View style={styles.headerFloating}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
            {isEditing ? 'Ver Geocerca' : 'Nueva Geocerca'}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomPanelWrapper}>
        <View style={styles.bottomPanel}>
          <TextInput 
            style={styles.inputName} 
            placeholder="Nombre..." 
            value={name} 
            onChangeText={setName} 
            editable={!isEditing} // Bloqueamos nombre si es solo ver
          />
          
          <View style={styles.typeSelector}>
            <TouchableOpacity 
                style={[styles.typeBtn, type === 'circle' && styles.typeBtnActive]} 
                onPress={() => !isEditing && setType('circle')}
                disabled={isEditing}
            >
              <Ionicons name="ellipse-outline" size={18} color={type === 'circle' ? '#fff' : '#6b7280'} />
              <Text style={[styles.typeText, type === 'circle' && styles.typeTextActive]}>Circular</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.typeBtn, type === 'polygon' && styles.typeBtnActive]} 
                onPress={() => !isEditing && setType('polygon')}
                disabled={isEditing}
            >
              <Ionicons name="shapes-outline" size={18} color={type === 'polygon' ? '#fff' : '#6b7280'} />
              <Text style={[styles.typeText, type === 'polygon' && styles.typeTextActive]}>Polígono</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlsArea}>
            {type === 'circle' ? (
              <View>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.controlLabel}>Radio</Text>
                  <Text style={styles.radiusValue}>{radius.toFixed(0)} m</Text>
                </View>
                <Slider 
                    style={{ width: '100%', height: 40 }} 
                    minimumValue={50} maximumValue={5000} step={50} 
                    value={radius} onValueChange={setRadius} 
                    minimumTrackTintColor="#226bfc" maximumTrackTintColor="#e5e7eb" thumbTintColor="#226bfc" 
                    disabled={isEditing} // Bloqueamos slider
                />
              </View>
            ) : (
              <View style={styles.polygonHeader}>
                  <Text style={styles.controlLabel}>Puntos: {polygonPoints.length}</Text>
                  {!isEditing && (
                    <TouchableOpacity onPress={() => setPolygonPoints(polygonPoints.slice(0, -1))} disabled={polygonPoints.length === 0}>
                        <Ionicons name="arrow-undo" size={20} color="#4b5563" />
                    </TouchableOpacity>
                  )}
              </View>
            )}
          </View>

          {/* Botón Guardar - Lo ocultamos si es solo ver, o cambiamos texto */}
          {!isEditing ? (
             <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
               {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Geocerca</Text>}
             </TouchableOpacity>
          ) : (
             <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#6b7280'}]} onPress={() => navigation.goBack()}>
                <Text style={styles.saveBtnText}>Cerrar</Text>
             </TouchableOpacity>
          )}
          
        </View>
      </KeyboardAvoidingView>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIcon, { backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
              <Ionicons name={modalConfig.type === 'success' ? 'checkmark' : 'alert'} size={32} color={modalConfig.type === 'success' ? '#166534' : '#991b1b'} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: modalConfig.type === 'success' ? '#226bfc' : '#ef4444' }]} 
              onPress={() => {
                setModalVisible(false);
                if (modalConfig.type === 'success' && !isEditing) navigation.goBack();
              }} 
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: '100%', height: '100%' },
  headerFloating: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, shadowOpacity: 0.1, elevation: 5 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  centerMarker: { opacity: 0.8 },
  vertexDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3, borderColor: '#226bfc' },
  bottomPanelWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomPanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowOpacity: 0.1, elevation: 20 },
  inputName: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 20 },
  typeSelector: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 8 },
  typeBtnActive: { backgroundColor: '#fff', elevation: 1 },
  typeText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeTextActive: { color: '#226bfc' },
  controlsArea: { minHeight: 60, marginBottom: 20 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  controlLabel: { fontWeight: '600', color: '#374151' },
  radiusValue: { fontWeight: 'bold', color: '#226bfc' },
  polygonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { backgroundColor: '#226bfc', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});