import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import historyService, { Position } from '../../api/historyService';

const MAPTILER_KEY = '5BW2cZ0pvKL0Cb9HYXhW'; // Asegúrate de poner tu key

declare global { interface Window { L: any; } }

export default function PlaybackScreenWeb() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeData, setRouteData] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) { setMapReady(true); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
      setMapReady(true);
    };
    loadLeaflet();
  }, []);

  // Inicializar Mapa
  useEffect(() => {
    if (!mapReady || mapRef.current) return;
    const L = window.L;
    const map = L.map('playback-map', { center: [20.6596, -103.3496], zoom: 12, zoomControl: false });
    L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
      attribution: '© MapTiler © OpenStreetMap', maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;
  }, [mapReady]);

  useEffect(() => {
    vehicleService.getVehicles().then(data => {
      setVehicles(data);
      setFilteredVehicles(data);
    });
  }, []);

  const handleSearchText = (text: string) => {
    setSearchText(text);
    setShowDropdown(true);
    setFilteredVehicles(
      text === '' ? vehicles : vehicles.filter(v =>
        (v.plate || '').toLowerCase().includes(text.toLowerCase()) ||
        (v.name || '').toLowerCase().includes(text.toLowerCase())
      )
    );
  };

  const selectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setSearchText(`${vehicle.name} - ${vehicle.plate}`);
    setShowDropdown(false);
  };

  const calculateHeading = (start: Position, end: Position) => {
  if (!start || !end) return 0;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const lon2 = (end.longitude * Math.PI) / 180;

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

  const handleSearchRoute = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    setRouteData([]);

    try {
      const positions = await historyService.getRoute(selectedVehicle.id, selectedDate);
      if (positions.length === 0) { alert('No hay historial para este día.'); return; }

      setRouteData(positions);
      const L = window.L;
      const map = mapRef.current;

      // Limpiar capas previas
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);

      const latlngs = positions.map((p: Position) => [p.latitude, p.longitude]);
      polylineRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.9 }).addTo(map);

      // Iconos de Inicio y Fin
      L.circleMarker([positions[0].latitude, positions[0].longitude], {
        radius: 6, fillColor: '#10b981', color: '#fff', weight: 2, fillOpacity: 1
      }).addTo(map).bindTooltip('Inicio');

      L.circleMarker([positions[positions.length - 1].latitude, positions[positions.length - 1].longitude], {
        radius: 6, fillColor: '#ef4444', color: '#fff', weight: 2, fillOpacity: 1
      }).addTo(map).bindTooltip('Fin');

      // --- LÓGICA DEL ICONO DINÁMICO ---
      const iconName = selectedVehicle.map_icon || 'default';
      const iconUrl = `https://backend.track-gpx.com.mx/assets/icons/map/${iconName}.png`;

      const vehicleIcon = L.icon({
        iconUrl: iconUrl,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: 'vehicle-marker-transition'
      });

      markerRef.current = L.marker([positions[0].latitude, positions[0].longitude], { icon: vehicleIcon })
        .addTo(map)
        .bindTooltip(selectedVehicle.name, { direction: 'top', offset: [0, -15] });

      map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Timer de reproducción
  useEffect(() => {
    if (isPlaying && routeData.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= routeData.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000 / speedMultiplier);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, routeData, speedMultiplier]);

  // Actualizar posición del marcador y seguimiento del mapa
  useEffect(() => {
  if (!markerRef.current || routeData.length === 0) return;
  
  const pos = routeData[currentIndex];
  const nextPos = routeData[currentIndex + 1];
  const newPos = [pos.latitude, pos.longitude] as [number, number];
  
  markerRef.current.setLatLng(newPos);

  // --- LÓGICA DE ROTACIÓN ---
  const iconElement = markerRef.current.getElement();
  if (iconElement && nextPos) {
    const heading = calculateHeading(pos, nextPos);
    // Aplicamos la rotación mediante CSS transform
    // Nota: Leaflet ya usa transform para la posición, así que concatenamos
    iconElement.style.transformOrigin = 'center center';
    
    // Usamos una pequeña demora o requestAnimationFrame para asegurar que Leaflet 
    // no sobreescriba el transform inmediatamente
    requestAnimationFrame(() => {
      const currentTransform = iconElement.style.transform;
      // Limpiamos rotaciones previas para no acumular
      const baseTransform = currentTransform.replace(/rotate\([\s\S]*?\)/g, '');
      iconElement.style.transform = `${baseTransform} rotate(${heading}deg)`;
    });
  }
  
  if (isPlaying && !mapRef.current.getBounds().contains(newPos)) {
    mapRef.current.panTo(newPos);
  }
}, [currentIndex, isPlaying]);

  const currentPos = routeData[currentIndex];
  const progress = routeData.length > 0 ? (currentIndex / (routeData.length - 1)) * 100 : 0;

  return (
    <MainLayout activeMenu="Historial y Rutas">
      <View style={styles.wrapper}>

        {/* PANEL IZQUIERDO */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Ionicons name="map-outline" size={20} color="#2563eb" />
            <Text style={styles.sidebarTitle}>Historial de Rutas</Text>
          </View>

          <Text style={styles.fieldLabel}>Vehículo</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="car-sport-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.input}
              placeholder="Buscar vehículo..."
              value={searchText}
              onChangeText={handleSearchText}
              onFocus={() => setShowDropdown(true)}
            />
          </View>

          {showDropdown && filteredVehicles.length > 0 && (
            <View style={styles.dropdown}>
              <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                {filteredVehicles.map(v => (
                  <TouchableOpacity key={v.id} style={styles.dropdownItem} onPress={() => selectVehicle(v)}>
                    <Text style={styles.itemName}>{v.name}</Text>
                    <Text style={styles.itemPlate}>{v.plate}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Fecha</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.input}
              value={selectedDate}
              onChangeText={setSelectedDate}
              {...{ type: 'date' } as any}
            />
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearchRoute} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Mostrar Ruta</Text>}
          </TouchableOpacity>

          {routeData.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Resumen</Text>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Vel. máx</Text>
                        <Text style={styles.statValue}>{Math.max(...routeData.map(p => p.speed)).toFixed(0)} km/h</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Puntos</Text>
                        <Text style={styles.statValue}>{routeData.length}</Text>
                    </View>
                </View>
              </View>
              
              <View style={styles.divider} />
              <Text style={styles.statsTitle}>Estado Actual</Text>
              <View style={styles.currentPosCard}>
                <Text style={styles.currentPosValue}>Velocidad: {currentPos?.speed.toFixed(0)} km/h</Text>
                <Text style={styles.currentPosValue}>Ignición: {currentPos?.ignition ? 'Encendida' : 'Apagada'}</Text>
              </View>
            </>
          )}
        </View>

        {/* ÁREA DEL MAPA */}
        <View style={styles.mapArea}>
          <div id="playback-map" style={{ width: '100%', height: '100%', zIndex: 1 }} />

          {/* Player bar CORREGIDA */}
          {routeData.length > 0 && (
            <View style={styles.playerBar}>
              <TouchableOpacity onPress={() => setCurrentIndex(0)} style={styles.playerIconBtn}>
                <Ionicons name="play-skip-back" size={18} color="#374151" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.playBtn}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
              </TouchableOpacity>

              <View style={styles.progressContainer}>
                <View style={styles.track}>
                  <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                </View>
                <Text style={styles.timeLabel}>
                  {new Date(currentPos?.timestamp || 0).toLocaleTimeString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.speedBtn}
                onPress={() => setSpeedMultiplier(prev => prev >= 10 ? 1 : prev + 4)}
              >
                <Text style={styles.speedText}>{speedMultiplier}x</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 300, backgroundColor: '#fff', borderRightWidth: 1, borderColor: '#e5e7eb', padding: 20, zIndex: 1001 },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sidebarTitle: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, height: 40, marginTop: 4 },
  input: { flex: 1, fontSize: 14 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 4, zIndex: 1100, position: 'absolute', top: 110, left: 20, right: 20 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemPlate: { fontSize: 12, color: '#6b7280' },
  searchBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 15 },
  statsTitle: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, backgroundColor: '#f9fafb', padding: 10, borderRadius: 8, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#9ca3af' },
  statValue: { fontSize: 14, fontWeight: '700' },
  currentPosCard: { backgroundColor: '#f0f7ff', padding: 12, borderRadius: 8 },
  currentPosValue: { fontSize: 13, color: '#1e40af', marginBottom: 4 },
  mapArea: { flex: 1, position: 'relative' },
  playerBar: {
    position: 'absolute', bottom: 30, left: 40, right: 40, zIndex: 1000,
    backgroundColor: '#fff', borderRadius: 16, padding: 15,
    flexDirection: 'row', alignItems: 'center', gap: 15,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  playerIconBtn: { padding: 5 },
  playBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flex: 1 },
  track: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb' },
  timeLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: '600' },
  speedBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  speedText: { fontSize: 13, fontWeight: '700' },
  
});