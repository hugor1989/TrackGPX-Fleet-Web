import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import alertService, { AlertLog, AlertType } from '../../api/alertService';
import moment from 'moment'; // Si no tienes moment, usa una función simple de fecha
import 'moment/locale/es'; // Configura idioma español

// Configurar moment (Opcional, si usas otra librería ajusta aquí)
moment.locale('es');

// --- HELPER VISUAL: COLORES E ICONOS ---
const getLogStyle = (type: AlertType) => {
  switch (type) {
    case 'power_cut': return { icon: 'flash-off', color: '#dc2626', bg: '#fef2f2', label: 'Corte de Corriente' };
    case 'sos_button': return { icon: 'alert-circle', color: '#be123c', bg: '#fff1f2', label: 'Botón Pánico' };
    case 'jamming': return { icon: 'radio', color: '#7c3aed', bg: '#f5f3ff', label: 'Inhibidor' };
    
    case 'geofence_exit': return { icon: 'log-out-outline', color: '#f59e0b', bg: '#fffbeb', label: 'Salida de Zona' };
    case 'geofence_enter': return { icon: 'log-in-outline', color: '#226bfc', bg: '#eff6ff', label: 'Entrada a Zona' };
    
    case 'overspeed': return { icon: 'speedometer', color: '#ef4444', bg: '#fef2f2', label: 'Exceso Velocidad' };
    case 'stop_duration': return { icon: 'timer', color: '#6366f1', bg: '#eef2ff', label: 'Parada Larga' };
    case 'maintenance_due': return { icon: 'build', color: '#059669', bg: '#ecfdf5', label: 'Mantenimiento' };
    
    default: return { icon: 'notifications', color: '#6b7280', bg: '#f3f4f6', label: 'Evento' };
  }
};

type RouteParams = {
  params: {
    filterMode?: 'active' | 'geofence' | 'speed' | 'maintenance';
    title?: string;
  };
};

export default function AlertLogsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  
  // Parámetros de la ruta (Definen el modo de la pantalla)
  const filterMode = route.params?.filterMode || 'active';
  const pageTitle = route.params?.title || 'Centro de Alertas';

  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Carga de Datos
 const loadData = async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (pageNum === 1 && !shouldRefresh) setLoading(true);
      
      const params: any = { page: pageNum };
      
      if (filterMode === 'active') params.unread_only = true;
      else if (filterMode === 'speed') params.type = 'overspeed';
      else if (filterMode === 'maintenance') params.type = 'maintenance_due';

      // 1. Obtenemos la respuesta cruda
      const response = await alertService.getAlertLogs(params);
      
      console.log("Respuesta Backend:", response); // 🔍 DEBUG: Mira esto en tu consola

      // 2. DETECCIÓN INTELIGENTE DE DATOS
      // A veces Laravel devuelve { data: [...] } (paginado)
      // A veces devuelve [...] (array directo)
      // A veces tu API wrapper devuelve { success: true, data: [...] }
      let incomingLogs: AlertLog[] = [];

      if (Array.isArray(response)) {
          incomingLogs = response; // Es un array directo
      } else if (response && Array.isArray(response.data)) {
          incomingLogs = response.data; // Es paginación o wrapper estándar
      } else if (response && response.data && Array.isArray(response.data)) {
           incomingLogs = response.data; // Wrapper doble (común en algunos setups)
      } else {
          console.warn("Estructura de respuesta desconocida", response);
          incomingLogs = [];
      }

      // 3. Filtrado Cliente (Solo si es necesario)
      if (filterMode === 'geofence') {
        // Usamos ?. por seguridad, aunque incomingLogs ya debería ser array
        incomingLogs = incomingLogs.filter(l => l.type && l.type.includes('geofence'));
      }

      // 4. Actualización de Estado
      if (shouldRefresh || pageNum === 1) {
        setLogs(incomingLogs);
      } else {
        setLogs(prev => [...prev, ...incomingLogs]);
      }
      
      // Verificamos si hay más páginas (si es paginado)
      if (response && response.current_page && response.last_page) {
          setHasMore(response.current_page < response.last_page);
          setPage(pageNum);
      } else {
          setHasMore(false); // Si no es paginado, asumimos que es todo
      }

    } catch (error) {
      console.error("Error cargando logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(1, true);
    }, [filterMode])
  );

  const handleMarkRead = async (id: number) => {
    // Optimistic Update: Lo quitamos de la lista visualmente si estamos en modo "Activas"
    if (filterMode === 'active') {
      setLogs(prev => prev.filter(l => l.id !== id));
    } else {
      // Si es historial, solo lo marcamos visualmente como leído (gris)
      setLogs(prev => prev.map(l => l.id === id ? { ...l, is_read: true } : l));
    }
    
    // Llamada API silenciosa
    try {
      await alertService.markAsRead(id);
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    setLogs([]); // Limpiamos todo visualmente
    setLoading(true);
    await alertService.markAllAsRead();
    setLoading(false);
    loadData(1, true);
  };

  // Renderizado de cada Tarjeta
  const renderItem = ({ item }: { item: AlertLog }) => {
    const style = getLogStyle(item.type);
    const timeAgo = moment(item.occurred_at).fromNow(); // O tu función helper si decidiste no usar moment

    return (
      <TouchableOpacity 
        style={[styles.card, !item.is_read && styles.unreadCard]}
        activeOpacity={0.9}
        // 👇 AQUÍ AGREGAMOS LA NAVEGACIÓN (Usando as any para evitar error de tipado)
        onPress={() => (navigation as any).navigate('AlertDetailMap', { alert: item })}
      >
        {/* Barra lateral de color */}
        <View style={[styles.colorStrip, { backgroundColor: style.color }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
              <Ionicons name={style.icon as any} size={20} color={style.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={styles.vehicleText}>
                    {item.vehicle ? `${item.vehicle.brand} ${item.vehicle.model} • ${item.vehicle.plate}` : 'Vehículo Eliminado'}
                </Text>
                <Text style={styles.timeText}>{timeAgo}</Text>
              </View>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          </View>

          {/* Footer con acciones */}
          <View style={styles.cardFooter}>
             <View style={styles.tag}>
                <Text style={[styles.tagText, { color: style.color }]}>{style.label}</Text>
             </View>
             
             {/* Botón de Marcar Leído (Funciona independiente aunque esté dentro) */}
             {!item.is_read && (
               <TouchableOpacity onPress={() => handleMarkRead(item.id)} style={styles.checkBtn}>
                 <Text style={styles.checkText}>Marcar Leído</Text>
                 <Ionicons name="checkmark-done" size={16} color="#226bfc" />
               </TouchableOpacity>
             )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <MainLayout activeMenu={filterMode === 'active' ? 'Alertas-Activas' : `Alertas-${filterMode.charAt(0).toUpperCase() + filterMode.slice(1)}`}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>{pageTitle}</Text>
            <Text style={styles.subtitle}>
              {filterMode === 'active' 
                ? 'Eventos pendientes de revisión' 
                : 'Historial completo de eventos'}
            </Text>
          </View>
          
          {filterMode === 'active' && logs.length > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
              <Ionicons name="checkmark-done-circle" size={18} color="#226bfc" />
              <Text style={styles.readAllText}>Limpiar Todo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista */}
        {loading && !refreshing && page === 1 ? (
          <ActivityIndicator size="large" color="#226bfc" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={logs}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(1, true)} />}
            onEndReached={() => { if(hasMore) loadData(page + 1); }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Sin novedades</Text>
                <Text style={styles.emptyText}>
                  {filterMode === 'active' 
                    ? 'Todo está tranquilo. No hay alertas pendientes.' 
                    : 'No se encontraron registros en el historial.'}
                </Text>
              </View>
            }
          />
        )}

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 13, color: '#6b7280' },
  
  readAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  readAllText: { color: '#226bfc', fontWeight: '600', fontSize: 13 },

  listContent: { padding: 16, gap: 12 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  unreadCard: { borderColor: '#bfdbfe', backgroundColor: '#fdfeff' },
  colorStrip: { width: 5 },
  cardContent: { flex: 1, padding: 12 },
  
  cardHeader: { flexDirection: 'row', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  vehicleText: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  timeText: { fontSize: 12, color: '#9ca3af' },
  messageText: { fontSize: 14, color: '#4b5563', marginTop: 2, lineHeight: 20 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f9fafb' },
  tagText: { fontSize: 11, fontWeight: '600' },
  
  checkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkText: { fontSize: 12, color: '#226bfc', fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyText: { color: '#9ca3af', marginTop: 8 },
});