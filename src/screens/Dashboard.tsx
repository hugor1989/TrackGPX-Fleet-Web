import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, 
         StyleSheet, Dimensions, Animated, TextInput } 
         from 'react-native';
import { Ionicons } from "@expo/vector-icons";

// IMPORTS CORREGIDOS
import MainLayout from '../layouts/MainLayout';
import RealMap from '../components/RealMap';
// 👇 IMPORTANTE: Importamos todo desde el archivo de datos simulados
import { Vehicle, INITIAL_VEHICLES, simulateFleetMovement } from '../api/mockData';
import DashboardAlerts from './DashboardAlerts'; // <--- Importar

// Eliminamos la interfaz Vehicle local para evitar conflictos

interface VehicleItemProps {
  vehicle: Vehicle;
  onPress?: (vehicle: Vehicle) => void;
  isActive?: boolean;
}

type FilterType = 'all' | 'online' | 'offline';

const { width } = Dimensions.get('window');

export default function DashboardPage() {
  // ✅ ESTADO: Inicializamos con los datos del mockData
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [includeSubordinates, setIncludeSubordinates] = useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Usamos un Set para las categorías expandidas
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Demo', 'Logística', 'Ventas']));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [panelAnimation] = useState(new Animated.Value(1));

  // 🔥 EFECTO DE SIMULACIÓN (El corazón del movimiento)
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(currentVehicles => {
        // 1. Calculamos las nuevas posiciones
        const movedVehicles = simulateFleetMovement(currentVehicles);
        
        // 2. Si tienes un vehículo seleccionado, actualizamos su info para que el mapa lo siga
        if (selectedVehicle) {
          const updatedSelected = movedVehicles.find(v => v.id === selectedVehicle.id);
          if (updatedSelected) {
            setSelectedVehicle(updatedSelected);
          }
        }
        
        return movedVehicles;
      });
    }, 2000); // Se actualiza cada 2 segundos

    return () => clearInterval(interval);
  }, [selectedVehicle]); // Dependencia crítica: selectedVehicle

  // --- ANIMACIONES DEL PANEL ---
  const togglePanel = useCallback(() => {
    const toValue = isPanelCollapsed ? 1 : 0;
    Animated.timing(panelAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsPanelCollapsed(!isPanelCollapsed);
  }, [isPanelCollapsed, panelAnimation]);

  const panelWidth = panelAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 380] });
  const toggleButtonLeft = panelAnimation.interpolate({ inputRange: [0, 1], outputRange: [75, 455] });
  const opacity = panelAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // --- LÓGICA DE CATEGORÍAS ---
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  }, []);

  // --- FILTRADO INTELIGENTE (Adaptado a mockData) ---
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;

    // 1. Búsqueda por Nombre o Placa
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(q) ||
        (v.plate && v.plate.toLowerCase().includes(q))
      );
    }

    // 2. Filtro de Subordinados (Simulado)
    if (!includeSubordinates) {
      filtered = filtered.filter(v => !v.isSubordinate);
    }

    // 3. Filtro por Estado (Usando propiedad 'status' del mock)
    switch (selectedFilter) {
      case 'online':
        filtered = filtered.filter(v => v.status === 'active');
        break;
      case 'offline':
        filtered = filtered.filter(v => v.status !== 'active');
        break;
    }

    return filtered;
  }, [vehicles, selectedFilter, includeSubordinates, searchQuery]);

  // --- AGRUPACIÓN ---
  const groupedVehicles = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {};
    filteredVehicles.forEach(vehicle => {
      const category = vehicle.category || 'Sin Categoría';
      if (!groups[category]) groups[category] = [];
      groups[category].push(vehicle);
    });
    return groups;
  }, [filteredVehicles]);

  // --- CONTADORES ---
  const counts = useMemo(() => {
    // Calculamos sobre el total sin filtrar por texto para los tabs
    const baseList = includeSubordinates ? vehicles : vehicles.filter(v => !v.isSubordinate);
    return {
      total: baseList.length,
      online: baseList.filter(v => v.status === 'active').length,
      offline: baseList.filter(v => v.status !== 'active').length,
    };
  }, [vehicles, includeSubordinates]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, { total: number; online: number }> = {};
    vehicles.forEach(v => {
      const cat = v.category || 'Sin Categoría';
      if (!c[cat]) c[cat] = { total: 0, online: 0 };
      c[cat].total++;
      if (v.status === 'active') c[cat].online++;
    });
    return c;
  }, [vehicles]);

  const handleVehiclePress = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // En pantallas pequeñas, colapsar menú al seleccionar
    if (width < 768) togglePanel();
  }, [togglePanel]);

  return (
    <MainLayout activeMenu="Dashboard">
      <View style={styles.container}>
        <View style={styles.mainContent}>
          
          {/* MAPA */}
          <View style={styles.mapContainer}>
            <RealMap 
              vehicles={filteredVehicles} 
              selectedVehicle={selectedVehicle}
              style={{ flex: 1, width: '100%', height: '100%' }} 
            />
          </View>

          {/* BOTÓN FLOTANTE */}
          <Animated.View style={[styles.panelToggleButton, { left: toggleButtonLeft }]}>
            <TouchableOpacity onPress={togglePanel}>
              <Ionicons name={isPanelCollapsed ? "chevron-forward" : "chevron-back"} size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>

          {/* ✅ AQUI AGREGAS EL PANEL DE ALERTAS */}
            <DashboardAlerts />
          {/* PANEL LATERAL */}
          <Animated.View style={[styles.sidePanel, { width: panelWidth, opacity: opacity }]}>
            
            {/* Header */}
            <View style={styles.panelHeader}>
              <View style={styles.headerTop}>
                <Text style={styles.panelTitle}>Flota</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar placa/nombre..."
                    placeholderTextColor="#95a5a6"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <Ionicons name="search" size={18} color="#7f8c8d" style={styles.searchIcon} />
                </View>
              </View>
            </View>

            {/* Lista Scrollable */}
            <ScrollView style={styles.vehiclesList} showsVerticalScrollIndicator={false}>
              {Object.entries(groupedVehicles).map(([category, categoryVehicles]) => {
                const isExpanded = expandedCategories.has(category);
                const stats = categoryCounts[category];
                
                return (
                  <View key={category} style={styles.categorySection}>
                    <TouchableOpacity 
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={16} color="#2c3e50" />
                        <Ionicons name="people-outline" size={18} color="#3498db" style={styles.categoryIcon} />
                        <Text style={styles.categoryTitle}>
                          {category} ({stats?.online || 0}/{stats?.total || 0})
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && categoryVehicles.map((vehicle) => (
                      <VehicleItem
                        key={vehicle.id}
                        vehicle={vehicle}
                        isActive={selectedVehicle?.id === vehicle.id}
                        onPress={handleVehiclePress}
                      />
                    ))}
                  </View>
                );
              })}

              {Object.keys(groupedVehicles).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>Sin resultados</Text>
                  <Text style={styles.emptyStateText}>Intenta otra búsqueda</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.panelFooter}>
              <View style={styles.footerTop}>
                <TouchableOpacity style={styles.toggleContainer} onPress={() => setIncludeSubordinates(!includeSubordinates)}>
                  <Text style={styles.toggleText}>Incluir subordinados</Text>
                  <View style={[styles.toggle, includeSubordinates && styles.toggleActive]}>
                    <Ionicons name={includeSubordinates ? "checkmark" : "close"} size={12} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.filterTabs}>
                <FilterTab label={`Todos (${counts.total})`} active={selectedFilter === 'all'} onPress={() => setSelectedFilter('all')} />
                <FilterTab label={`En ruta (${counts.online})`} active={selectedFilter === 'online'} color="#27ae60" onPress={() => setSelectedFilter('online')} />
                <FilterTab label={`Detenidos (${counts.offline})`} active={selectedFilter === 'offline'} color="#e74c3c" onPress={() => setSelectedFilter('offline')} />
              </View>
            </View>

          </Animated.View>
        </View>
      </View>
    </MainLayout>
  );
}

// --- SUBCOMPONENTES ---

const VehicleItem = React.memo(({ vehicle, onPress, isActive }: VehicleItemProps) => {
  const isMoving = vehicle.status === 'active';
  
  return (
    <TouchableOpacity 
      style={[styles.vehicleRow, isActive && styles.vehicleRowActive]}
      onPress={() => onPress?.(vehicle)}
    >
      <View style={[styles.statusDot, { backgroundColor: isMoving ? '#27ae60' : '#e74c3c' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.vehicleName, isMoving && styles.vehicleNameActive]}>
          {vehicle.name}
        </Text>
        {/* Mostramos la PLACA real del mockData */}
        <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.vehicleSpeed}>{vehicle.speed} km/h</Text>
        <Text style={styles.vehicleStatus}>{isMoving ? 'En ruta' : 'Detenido'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const FilterTab = ({ label, active, onPress, color = '#3498db' }: any) => (
  <TouchableOpacity
    style={[styles.filterTab, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
  >
    <Text style={[styles.filterTabText, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Estilos base
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  mainContent: { flex: 1, position: 'relative' },
  mapContainer: { ...StyleSheet.absoluteFillObject },
  
  // Panel Lateral
  sidePanel: {
    position: 'absolute', left: 60, top: 20, bottom: 20,
    backgroundColor: '#ffffff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    overflow: 'hidden',
  },
  panelToggleButton: {
    position: 'absolute', top: 35, zIndex: 1001,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, elevation: 12,
  },
  
  // Header Panel
  panelHeader: { padding: 15, borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 10, height: 32 },
  searchInput: { flex: 1, fontSize: 12, color: '#2c3e50' },
  searchIcon: { marginLeft: 4 },
  
  // Lista
  vehiclesList: { flex: 1, backgroundColor: '#f8f9fa' },
  categorySection: { marginBottom: 2 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#e8f4f8', borderBottomWidth: 1, borderColor: '#dae8ed' },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { marginHorizontal: 6 },
  categoryTitle: { fontSize: 13, fontWeight: '600', color: '#2c3e50' },
  
  // Items de Vehículo
  vehicleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', gap: 8 },
  vehicleRowActive: { backgroundColor: '#ebf5fb', borderLeftWidth: 3, borderLeftColor: '#3498db' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  vehicleName: { fontSize: 12, fontWeight: '500', color: '#e74c3c' },
  vehicleNameActive: { color: '#27ae60' },
  vehiclePlate: { fontSize: 11, color: '#95a5a6' },
  vehicleStatus: { fontSize: 10, color: '#7f8c8d' },
  vehicleSpeed: { fontSize: 12, fontWeight: 'bold', color: '#2c3e50' },

  // Empty State
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateTitle: { fontSize: 14, fontWeight: 'bold', color: '#7f8c8d' },
  emptyStateText: { fontSize: 12, color: '#95a5a6' },

  // Footer
  panelFooter: { padding: 10, borderTopWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  footerTop: { flexDirection: 'row', marginBottom: 10, justifyContent: 'space-between' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { fontSize: 11, color: '#7f8c8d' },
  toggle: { width: 32, height: 18, backgroundColor: '#bdc3c7', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  toggleActive: { backgroundColor: '#3498db' },
  
  filterTabs: { flexDirection: 'row', gap: 5 },
  filterTab: { flex: 1, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff', alignItems: 'center' },
  filterTabText: { fontSize: 10, fontWeight: '500', color: '#2c3e50' },
});