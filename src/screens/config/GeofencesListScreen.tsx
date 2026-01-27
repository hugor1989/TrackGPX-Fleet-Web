import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import geofenceService, { Geofence } from '../../api/geofenceService';

export default function GeofencesListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar datos
  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await geofenceService.getGeofences();
      setGeofences(data || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleDelete = (id: number, name: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`¿Estás seguro de eliminar la geocerca "${name}"?`);
      if (confirm) executeDelete(id);
    } else {
      Alert.alert(
        'Eliminar Geocerca',
        `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            style: 'destructive',
            onPress: () => executeDelete(id)
          }
        ]
      );
    }
  };

  const executeDelete = async (id: number) => {
    try {
      setLoading(true);
      await geofenceService.deleteGeofence(id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar');
      setLoading(false);
    }
  };

  // Componente de Tarjeta (Corregido: Incluye todos los elementos visuales)
  const GeofenceItem = ({ item }: { item: Geofence }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('GeofenceMap', { geofence: item } as never)}
    >
      {/* Tira de color lateral */}
      <View style={[styles.colorStrip, { backgroundColor: item.color || '#226bfc' }]} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {/* Icono del tipo de geocerca */}
          <View style={styles.iconBox}>
            <Ionicons 
              name={item.type === 'circle' ? 'ellipse-outline' : 'shapes-outline'} 
              size={24} 
              color="#226bfc" 
            />
          </View>
          
          {/* Títulos y descripción */}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.type === 'circle' 
                ? `Circular • Radio: ${item.radius?.toFixed(0) || 0}m` 
                : 'Polígono personalizado'}
            </Text>
          </View>
          
          {/* Botón de eliminar (Con stopPropagation para que no abra el mapa al borrar) */}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item.id, item.name);
            }} 
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        {/* Footer con info de vehículos */}
        <View style={styles.cardFooter}>
            <View style={styles.footerTag}>
                <Ionicons name="car-sport-outline" size={14} color="#6b7280" />
                <Text style={styles.footerText}>
                    {item.vehicles_count || 0} Vehículos asignados
                </Text>
            </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <MainLayout activeMenu="Monitor-Geocercas">
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Geocercas</Text>
            <Text style={styles.pageSubtitle}>Zonas seguras y puntos de interés</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('GeofenceMap' as never)}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nueva Geocerca</Text>
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#226bfc" />
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {geofences.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                    <Ionicons name="map-outline" size={48} color="#9ca3af" />
                </View>
                <Text style={styles.emptyTitle}>No tienes geocercas</Text>
                <Text style={styles.emptyText}>
                    Crea zonas en el mapa para monitorear entradas y salidas de tus vehículos.
                </Text>
                <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => navigation.navigate('GeofenceMap' as never)}
                >
                    <Text style={styles.emptyButtonText}>Crear mi primera geocerca</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {geofences.map((geo) => (
                  <View key={geo.id} style={isDesktop ? styles.gridItem : undefined}>
                    <GeofenceItem item={geo} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    padding: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#226bfc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    shadowColor: '#226bfc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // List System
  listContent: { padding: 20, paddingBottom: 50 },
  list: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '32%', minWidth: 300 },

  // Card Design
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    cursor: 'pointer' // Mejora UX en web
  },
  colorStrip: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center'
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#6b7280' },
  
  deleteBtn: { 
    padding: 8, borderRadius: 8, backgroundColor: '#fef2f2', 
    alignSelf: 'flex-start'
  },

  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  footerTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { color: '#9ca3af', textAlign: 'center', maxWidth: 300, marginBottom: 24 },
  emptyButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  emptyButtonText: { color: '#374151', fontWeight: '600' },
});