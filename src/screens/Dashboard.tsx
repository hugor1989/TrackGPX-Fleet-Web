import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Animated, TextInput } from 'react-native';
import DashboardLayout from '../layouts/DashboardLayout';
import RealMap from '../components/RealMap';
import { Ionicons } from "@expo/vector-icons";

interface Vehicle {
  id: number;
  name: string;
  status: string;
  speed: string;
  location: string;
  latitude: number;
  longitude: number;
  isSubordinate?: boolean;
  category?: string;
}

interface VehicleItemProps {
  vehicle: Vehicle;
  onPress?: (vehicle: Vehicle) => void;
}

type FilterType = 'all' | 'online' | 'offline';

const { width, height } = Dimensions.get('window');

export default function DashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [includeSubordinates, setIncludeSubordinates] = useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Demo']));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [panelAnimation] = useState(new Animated.Value(1));

  // Función para colapsar/expandir el panel
  const togglePanel = useCallback(() => {
    const toValue = isPanelCollapsed ? 1 : 0;
    
    Animated.timing(panelAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsPanelCollapsed(!isPanelCollapsed);
  }, [isPanelCollapsed, panelAnimation]);

  const panelWidth = panelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 380]
  });

  const toggleButtonLeft = panelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [75, 455]
  });

  const opacity = panelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  // Datos de vehículos organizados por categorías
  const vehicles: Vehicle[] = useMemo(() => [
    // Categoría Demo
    {
      id: 1,
      name: 'V7-pro-810602',
      status: 'En movimiento',
      speed: '42km/h',
      location: 'Av. Corrientes',
      latitude: -34.6037,
      longitude: -58.3816,
      isSubordinate: false,
      category: 'Demo'
    },
    {
      id: 2,
      name: '86920703287',
      status: 'En movimiento',
      speed: '20km/h',
      location: 'Palermo',
      latitude: -34.5711,
      longitude: -58.4233,
      isSubordinate: false,
      category: 'Demo'
    },
    {
      id: 3,
      name: 'S112B-396012',
      status: 'En movimiento',
      speed: '28km/h',
      location: 'Recoleta',
      latitude: -34.5895,
      longitude: -58.3974,
      isSubordinate: false,
      category: 'Demo'
    },
    {
      id: 4,
      name: 'gourouja ama...',
      status: 'En movimiento',
      speed: '68km/h',
      location: 'Belgrano',
      latitude: -34.5633,
      longitude: -58.4556,
      isSubordinate: false,
      category: 'Demo'
    },
    {
      id: 5,
      name: 'RODARIO',
      status: 'En movimiento',
      speed: '26km/h',
      location: 'San Telmo',
      latitude: -34.6212,
      longitude: -58.3731,
      isSubordinate: false,
      category: 'Demo'
    },
    // Categoría CAMS
    {
      id: 6,
      name: 'S106-396002',
      status: 'En movimiento',
      speed: '47km/h',
      location: 'Puerto Madero',
      latitude: -34.6118,
      longitude: -58.3636,
      isSubordinate: true,
      category: 'CAMS'
    },
    {
      id: 7,
      name: 'R11-396013',
      status: 'En movimiento',
      speed: '71km/h',
      location: 'Núñez',
      latitude: -34.5444,
      longitude: -58.4634,
      isSubordinate: true,
      category: 'CAMS'
    },
    {
      id: 8,
      name: 'ganindra trans',
      status: 'En movimiento',
      speed: '72km/h',
      location: 'Caballito',
      latitude: -34.6178,
      longitude: -58.4397,
      isSubordinate: true,
      category: 'CAMS'
    },
    {
      id: 9,
      name: 'GW Poer',
      status: 'En movimiento',
      speed: '103km/h',
      location: 'Villa Crespo',
      latitude: -34.5997,
      longitude: -58.4397,
      isSubordinate: true,
      category: 'CAMS'
    },
    // Categoría Free Demo
    {
      id: 10,
      name: 'FD001-TEST',
      status: 'Detenido',
      speed: '0km/h',
      location: 'Colegiales',
      latitude: -34.5739,
      longitude: -58.4483,
      isSubordinate: false,
      category: 'Free Demo'
    },
    {
      id: 11,
      name: 'FD002-DEMO',
      status: 'En movimiento',
      speed: '35km/h',
      location: 'Almagro',
      latitude: -34.6092,
      longitude: -58.4156,
      isSubordinate: false,
      category: 'Free Demo'
    },
    // Categoría HardwareDevice
    {
      id: 12,
      name: 'HW-DEV-001',
      status: 'Detenido',
      speed: '0km/h',
      location: 'Flores',
      latitude: -34.6283,
      longitude: -58.4664,
      isSubordinate: false,
      category: 'HardwareDevice'
    },
    // Categoría OBD
    {
      id: 13,
      name: 'OBD-SCAN-01',
      status: 'En movimiento',
      speed: '55km/h',
      location: 'Barracas',
      latitude: -34.6479,
      longitude: -58.3784,
      isSubordinate: false,
      category: 'OBD'
    },
    // Categoría Relay
    {
      id: 14,
      name: 'RELAY-001',
      status: 'En movimiento',
      speed: '89km/h',
      location: 'La Boca',
      latitude: -34.6345,
      longitude: -58.3632,
      isSubordinate: false,
      category: 'Relay'
    }
  ], []);

  // Toggle de categorías
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Filtrado inteligente de vehículos
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por subordinados
    if (!includeSubordinates) {
      filtered = filtered.filter(v => !v.isSubordinate);
    }

    // Filtrar por estado
    switch (selectedFilter) {
      case 'online':
        filtered = filtered.filter(v => v.status === 'En movimiento');
        break;
      case 'offline':
        filtered = filtered.filter(v => v.status === 'Detenido');
        break;
      default:
        break;
    }

    return filtered;
  }, [vehicles, selectedFilter, includeSubordinates, searchQuery]);

  // Agrupar vehículos por categoría
  const groupedVehicles = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {};
    filteredVehicles.forEach(vehicle => {
      const category = vehicle.category || 'Sin categoría';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(vehicle);
    });
    return groups;
  }, [filteredVehicles]);

  // Contadores dinámicos
  const counts = useMemo(() => {
    const baseVehicles = includeSubordinates 
      ? vehicles 
      : vehicles.filter(v => !v.isSubordinate);
    
    return {
      total: baseVehicles.length,
      online: baseVehicles.filter(v => v.status === 'En movimiento').length,
      offline: baseVehicles.filter(v => v.status === 'Detenido').length,
    };
  }, [vehicles, includeSubordinates]);

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; online: number }> = {};
    vehicles.forEach(v => {
      const category = v.category || 'Sin categoría';
      if (!counts[category]) {
        counts[category] = { total: 0, online: 0 };
      }
      counts[category].total++;
      if (v.status === 'En movimiento') {
        counts[category].online++;
      }
    });
    return counts;
  }, [vehicles]);

  const handleVehiclePress = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    console.log('Vehículo seleccionado:', vehicle.name);
  }, []);

  return (
    <DashboardLayout>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          {/* Mapa - Ocupa todo el fondo */}
          <View style={styles.mapContainer}>
            <RealMap 
              vehicles={filteredVehicles} 
              style={{ flex: 1, width: '100%', height: '100%' }} 
            />
          </View>

          {/* Botón toggle flotante */}
          <Animated.View
            style={[
              styles.panelToggleButton,
              { left: toggleButtonLeft }
            ]}
          >
            <TouchableOpacity 
              onPress={togglePanel}
              accessibilityLabel={isPanelCollapsed ? "Expandir panel" : "Colapsar panel"}
              accessibilityRole="button"
            >
              <Ionicons 
                name={isPanelCollapsed ? "chevron-forward" : "chevron-back"} 
                size={20} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Panel lateral flotante */}
          <Animated.View 
            style={[
              styles.sidePanel,
              { width: panelWidth, opacity: opacity }
            ]}
          >
            {/* Header con búsqueda */}
            <View style={styles.panelHeader}>
              <View style={styles.headerTop}>
                <Text style={styles.panelTitle}>Clien</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Nombre de cliente/Cue"
                    placeholderTextColor="#95a5a6"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <Ionicons name="search" size={18} color="#7f8c8d" style={styles.searchIcon} />
                </View>
                <TouchableOpacity style={styles.expandIcon}>
                  <Ionicons name="expand-outline" size={20} color="#2c3e50" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de categorías colapsables */}
            <ScrollView 
              style={styles.vehiclesList} 
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(groupedVehicles).map(([category, categoryVehicles]) => {
                const isExpanded = expandedCategories.has(category);
                const categoryCount = categoryCounts[category];
                
                return (
                  <View key={category} style={styles.categorySection}>
                    <TouchableOpacity 
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <Ionicons 
                          name={isExpanded ? "chevron-down" : "chevron-forward"} 
                          size={16} 
                          color="#2c3e50" 
                        />
                        <Ionicons name="people-outline" size={18} color="#3498db" style={styles.categoryIcon} />
                        <Text style={styles.categoryTitle}>
                          {category}({categoryCount?.online || 0}/{categoryCount?.total || 0})
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && categoryVehicles.map((vehicle) => (
                      <VehicleItem
                        key={vehicle.id}
                        vehicle={vehicle}
                        onPress={handleVehiclePress}
                      />
                    ))}
                  </View>
                );
              })}

              {/* Estado vacío */}
              {Object.keys(groupedVehicles).length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#bdc3c7" />
                  <Text style={styles.emptyStateTitle}>No se encontraron resultados</Text>
                  <Text style={styles.emptyStateText}>
                    Intenta con otro término de búsqueda
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer con filtros y opciones */}
            <View style={styles.panelFooter}>
              <View style={styles.footerTop}>
                <TouchableOpacity 
                  style={styles.velocidadButton}
                  onPress={() => {}}
                >
                  <Text style={styles.velocidadText}>Velocidad</Text>
                  <Ionicons name="chevron-down" size={14} color="#2c3e50" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.toggleContainer}
                  onPress={() => setIncludeSubordinates(!includeSubordinates)}
                >
                  <Text style={styles.toggleText}>Incluir subordinados</Text>
                  <View style={[styles.toggle, includeSubordinates && styles.toggleActive]}>
                    <Ionicons 
                      name={includeSubordinates ? "checkmark" : "close"} 
                      size={12} 
                      color="#ffffff" 
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.iconGroup}>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="help-circle-outline" size={20} color="#7f8c8d" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="copy-outline" size={20} color="#7f8c8d" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="location-outline" size={20} color="#7f8c8d" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tabs de filtro */}
              <View style={styles.filterTabs}>
                <TouchableOpacity
                  style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>
                    Todas({counts.total})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterTab, selectedFilter === 'online' && styles.filterTabActive]}
                  onPress={() => setSelectedFilter('online')}
                >
                  <Text style={[styles.filterTabText, selectedFilter === 'online' && styles.filterTabTextActive]}>
                    en línea({counts.online})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterTab, selectedFilter === 'offline' && styles.filterTabActive]}
                  onPress={() => setSelectedFilter('offline')}
                >
                  <Text style={[styles.filterTabText, selectedFilter === 'offline' && styles.filterTabTextActive]}>
                    sin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Alerta de aquiescencia */}
              <TouchableOpacity style={styles.aquiescenciaButton}>
                <Ionicons name="chevron-down" size={16} color="#2c3e50" />
                <Text style={styles.aquiescenciaText}>Aquiescencia(57)</Text>
                <Ionicons name="person-add-outline" size={16} color="#2c3e50" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>
    </DashboardLayout>
  );
}

// Componente de vehículo mejorado
const VehicleItem: React.FC<VehicleItemProps> = React.memo(({ vehicle, onPress }) => {
  const isMoving = vehicle.status === 'En movimiento';
  
  return (
    <TouchableOpacity 
      style={styles.vehicleRow}
      onPress={() => onPress?.(vehicle)}
    >
      <Text style={[styles.vehicleName, isMoving && styles.vehicleNameActive]}>
        {vehicle.name}
      </Text>
      <Text style={styles.vehicleStatus}>{vehicle.status}</Text>
      <Text style={styles.vehicleSpeed}>{vehicle.speed}</Text>
      <Ionicons name="navigate-outline" size={14} color="#95a5a6" />
    </TouchableOpacity>
  );
});

VehicleItem.displayName = 'VehicleItem';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  sidePanel: {
    position: 'absolute',
    left: 60,
    top: 20,
    bottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  panelToggleButton: {
    position: 'absolute',
    top: 35,
    backgroundColor: '#3498db',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  panelHeader: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 10,
    height: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#2c3e50',
    padding: 0,
  },
  searchIcon: {
    marginLeft: 4,
  },
  expandIcon: {
    padding: 4,
  },
  vehiclesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  categorySection: {
    marginBottom: 2,
  },
  categoryHeader: {
    backgroundColor: '#e8f4f8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dae8ed',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginLeft: 4,
    marginRight: 6,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  vehicleName: {
    flex: 1,
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '500',
  },
  vehicleNameActive: {
    color: '#27ae60',
  },
  vehicleStatus: {
    fontSize: 11,
    color: '#7f8c8d',
    minWidth: 95,
  },
  vehicleSpeed: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
    minWidth: 50,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
  },
  panelFooter: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  footerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  velocidadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  velocidadText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  toggle: {
    width: 32,
    height: 18,
    backgroundColor: '#bdc3c7',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#3498db',
  },
  iconGroup: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  iconButton: {
    padding: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTabActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterTabText: {
    fontSize: 11,
    color: '#2c3e50',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  aquiescenciaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  aquiescenciaText: {
    flex: 1,
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
});