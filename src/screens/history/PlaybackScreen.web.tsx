import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, LoadScript, Polyline, Marker } from '@react-google-maps/api';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import historyService, { Position } from '../../api/historyService';

// ⚠️ TU API KEY
const GOOGLE_MAPS_API_KEY = "AIzaSyB-x2Ix1eMVDuwtARoG-NsGm4rmfvCHdyM"; 

const containerStyle = { width: '100%', height: '100%' };
const polylineOptions = { strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5 };

export default function PlaybackScreenWeb() {
  // --- ESTADOS ---
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeData, setRouteData] = useState<Position[]>([]);
  
  // Player
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    vehicleService.getVehicles().then(data => {
      setVehicles(data);
      setFilteredVehicles(data);
    });
  }, []);

  // Filtro de búsqueda
  const handleSearchText = (text: string) => {
    setSearchText(text);
    setShowDropdown(true);
    if (text === '') {
        setFilteredVehicles(vehicles);
    } else {
        const filtered = vehicles.filter(v => 
            v.plate.toLowerCase().includes(text.toLowerCase()) || 
            v.brand.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredVehicles(filtered);
    }
  };

  const selectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setSearchText(`${vehicle.brand} - ${vehicle.plate}`);
    setShowDropdown(false);
  };

  const handleSearchRoute = async () => {
    if (!selectedVehicle) return alert("Selecciona un vehículo");
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    setRouteData([]);

    try {
      const positions = await historyService.getRoute(selectedVehicle.id, selectedDate);
      if (positions.length === 0) alert("No hay historial para este día.");
      else {
        setRouteData(positions);
        if (mapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          positions.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }));
          mapRef.current.fitBounds(bounds);
        }
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // Lógica de Animación
  useEffect(() => {
    if (isPlaying && routeData.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= routeData.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000 / speedMultiplier);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, routeData, speedMultiplier]);

  const currentPos = routeData[currentIndex];

  const getCarIcon = (heading: number) => ({
    path: window.google ? window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW : 'M -2,0 0,-2 2,0 0,2 z',
    scale: 6, fillColor: "#10b981", fillOpacity: 1, strokeWeight: 1, strokeColor: "#064e3b", rotation: heading,
  });

  return (
    <MainLayout activeMenu="Historial y Rutas">
      <View style={styles.container}>
        
        {/* 1. MAPA DE FONDO (FULL SCREEN) */}
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: 19.4326, lng: -99.1332 }}
            zoom={12}
            onLoad={(map) => (mapRef.current = map)}
            options={{ disableDefaultUI: true, zoomControl: true }} // Limpiamos controles de Google
          >
            {routeData.length > 0 && <Polyline path={routeData.map(p => ({ lat: p.latitude, lng: p.longitude }))} options={polylineOptions} />}
            {currentPos && <Marker position={{ lat: currentPos.latitude, lng: currentPos.longitude }} icon={getCarIcon(currentPos.heading)} zIndex={100} />}
          </GoogleMap>
        </LoadScript>

        {/* 2. TARJETA FLOTANTE DE BÚSQUEDA (ARRIBA IZQ) */}
        <View style={styles.searchCard}>
            <Text style={styles.cardTitle}>Configurar Recorrido</Text>
            
            {/* Input Buscador */}
            <View style={styles.inputWrapper}>
                <Ionicons name="car-sport-outline" size={20} color="#6b7280" style={{marginRight:8}}/>
                <TextInput 
                    style={styles.input}
                    placeholder="Buscar vehículo..."
                    value={searchText}
                    onChangeText={handleSearchText}
                    onFocus={() => setShowDropdown(true)}
                />
            </View>

            {/* Dropdown de Resultados (Se muestra solo al buscar) */}
            {showDropdown && filteredVehicles.length > 0 && (
                <View style={styles.dropdownList}>
                    <ScrollView style={{maxHeight: 200}}>
                        {filteredVehicles.map(v => (
                            <TouchableOpacity key={v.id} style={styles.dropdownItem} onPress={() => selectVehicle(v)}>
                                <Text style={styles.itemText}>{v.brand} {v.model}</Text>
                                <Text style={styles.itemSubText}>{v.plate}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Selector de Fecha */}
            <View style={[styles.inputWrapper, {marginTop: 10}]}>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" style={{marginRight:8}}/>
                <TextInput 
                    type="date"
                    style={styles.input}
                    value={selectedDate}
                    onChangeText={setSelectedDate}
                    {...{ type: 'date' } as any}
                />
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={handleSearchRoute} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.btnText}>Mostrar Ruta</Text>}
            </TouchableOpacity>
        </View>

        {/* 3. INFO FLOTANTE (ARRIBA DERECHA - SOLO SI HAY RUTA) */}
        {currentPos && (
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="speedometer" size={18} color="#2563eb"/>
                    <Text style={styles.infoValue}>{currentPos.speed.toFixed(0)} km/h</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="time" size={18} color="#6b7280"/>
                    <Text style={styles.infoValue}>{new Date(currentPos.timestamp).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="power" size={18} color={currentPos.ignition ? '#10b981' : '#ef4444'}/>
                    <Text style={[styles.infoValue, {color: currentPos.ignition ? '#10b981' : '#ef4444'}]}>
                        {currentPos.ignition ? 'ON' : 'OFF'}
                    </Text>
                </View>
            </View>
        )}

        {/* 4. PLAYER BAR FLOTANTE (ABAJO) */}
        {routeData.length > 0 && (
            <View style={styles.playerBar}>
                <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.playBtn}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.progressContainer}>
                    <View style={styles.track}>
                        <View style={[styles.progress, { width: `${(currentIndex / routeData.length) * 100}%` }]} />
                    </View>
                    <Text style={styles.timeLabel}>
                        {currentIndex} / {routeData.length} pts
                    </Text>
                </View>

                <TouchableOpacity style={styles.speedBtn} onPress={() => setSpeedMultiplier(prev => prev >= 10 ? 1 : prev === 1 ? 5 : 10)}>
                    <Text style={styles.speedText}>{speedMultiplier}x</Text>
                </TouchableOpacity>
            </View>
        )}

      </View>
    </MainLayout>
  );
}

// ESTILOS "MODERNOS"
const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', backgroundColor: '#e5e7eb' },
  
  // Tarjeta de Búsqueda
  searchCard: {
    position: 'absolute', top: 20, left: 20, width: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Efecto semi-transparente
    borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    zIndex: 20
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1f2937' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  input: { flex: 1, height: 40, fontSize: 14, color: '#374151', outlineStyle: 'none' as any }, // outlineStyle web
  
  // Dropdown Resultados
  dropdownList: {
    maxHeight: 200, backgroundColor: '#fff', 
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 4,
    position: 'absolute', top: 110, left: 16, right: 16, zIndex: 50, // Flota sobre todo
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderColor: '#f9fafb' },
  itemText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  itemSubText: { fontSize: 12, color: '#6b7280' },

  searchBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Info Card (Top Right)
  infoCard: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 4
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontWeight: '600', color: '#374151', fontSize: 13 },

  // Player Bar (Bottom)
  playerBar: {
    position: 'absolute', bottom: 30, left: '5%', width: '90%',
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 10
  },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flex: 1 },
  track: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: '#2563eb' },
  timeLabel: { fontSize: 11, color: '#6b7280', marginTop: 6, textAlign: 'right' },
  speedBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  speedText: { fontSize: 12, fontWeight: 'bold', color: '#374151' }
});