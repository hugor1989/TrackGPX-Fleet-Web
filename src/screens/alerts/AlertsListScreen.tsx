import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import alertService, { AlertRule, AlertType } from '../../api/alertService';

// --- AYUDANTES VISUALES ---
// Traduce el código técnico a Icono y Color
const getAlertStyle = (type: AlertType) => {
  switch (type) {
    case 'overspeed': return { icon: 'speedometer', color: '#ef4444', label: 'Exceso de Velocidad' };
    case 'geofence_enter': return { icon: 'enter', color: '#226bfc', label: 'Entrada a Zona' };
    case 'geofence_exit': return { icon: 'exit', color: '#f59e0b', label: 'Salida de Zona' };
    case 'power_cut': return { icon: 'flash-off', color: '#dc2626', label: 'Corte de Corriente' };
    case 'jamming': return { icon: 'radio', color: '#7c3aed', label: 'Inhibidor (Jammer)' };
    case 'stop_duration': return { icon: 'timer', color: '#6366f1', label: 'Parada Larga' };
    case 'low_battery_vehicle': return { icon: 'battery-dead', color: '#ea580c', label: 'Batería Baja (Vehículo)' };
    case 'sos_button': return { icon: 'alert-circle', color: '#be123c', label: 'Botón de Pánico' };
    case 'maintenance_due': return { icon: 'build', color: '#059669', label: 'Mantenimiento' };
    default: return { icon: 'notifications', color: '#6b7280', label: 'Alerta General' };
  }
};

// Formatea el valor (ej. "110" -> "110 km/h")
const formatValue = (rule: AlertRule) => {
  if (!rule.value) return null;
  switch (rule.type) {
    case 'overspeed': return `${rule.value} km/h`;
    case 'stop_duration': return `${rule.value} min`;
    case 'sensor_temperature': return `${rule.value}°C`;
    case 'maintenance_due': return `${rule.value} km`;
    default: return rule.value.toString();
  }
};

export default function AlertsListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar Alertas
  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await alertService.getAlerts();
      setAlerts(data);
    } catch (error) {
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

  // Activar / Desactivar (Toggle)
  const handleToggle = async (id: number, currentIndex: number) => {
    // Optimistic Update (Cambiar visualmente antes de que responda el server para que se sienta rápido)
    const newAlerts = [...alerts];
    newAlerts[currentIndex].is_active = !newAlerts[currentIndex].is_active;
    setAlerts(newAlerts);

    try {
      await alertService.toggleAlert(id);
    } catch (error) {
      // Si falla, revertimos
      newAlerts[currentIndex].is_active = !newAlerts[currentIndex].is_active;
      setAlerts([...newAlerts]);
      alert('No se pudo actualizar el estado');
    }
  };

  // Eliminar
  const handleDelete = (id: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar esta regla de alerta?')) executeDelete(id);
    } else {
      Alert.alert('Eliminar Alerta', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => executeDelete(id) }
      ]);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      setLoading(true);
      await alertService.deleteAlert(id);
      loadData();
    } catch (error) {
      setLoading(false);
      alert('Error al eliminar');
    }
  };

  const AlertCard = ({ item, index }: { item: AlertRule, index: number }) => {
    const style = getAlertStyle(item.type);
    const valueText = formatValue(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: `${style.color}20` }]}>
            <Ionicons name={style.icon as any} size={24} color={style.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardType}>{style.label}</Text>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggle(item.id, index)}
            trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
            thumbColor={item.is_active ? '#226bfc' : '#f3f4f6'}
          />
        </View>

        <View style={styles.cardBody}>
          {/* Detalles específicos */}
          <View style={styles.detailRow}>
            {valueText && (
              <View style={styles.pill}>
                <Ionicons name="speedometer-outline" size={14} color="#374151" />
                <Text style={styles.pillText}>Límite: {valueText}</Text>
              </View>
            )}
            
            {item.geofence && (
              <View style={styles.pill}>
                <Ionicons name="map-outline" size={14} color="#374151" />
                <Text style={styles.pillText}>Zona: {item.geofence.name}</Text>
              </View>
            )}

            <View style={styles.pill}>
              <Ionicons name="car-sport-outline" size={14} color="#374151" />
              <Text style={styles.pillText}>
                {item.vehicles?.length || 0} Vehículos
              </Text>
            </View>
          </View>

          {/* Notificaciones activas */}
          <View style={styles.notifRow}>
            <Text style={styles.notifLabel}>Notifica por:</Text>
            {item.notification_settings?.push && <Ionicons name="notifications" size={16} color="#226bfc" style={{marginRight:4}} />}
            {item.notification_settings?.email && <Ionicons name="mail" size={16} color="#226bfc" />}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Eliminar Regla</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <MainLayout activeMenu="Alertas">
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Configuración de Alertas</Text>
            <Text style={styles.pageSubtitle}>Reglas de seguridad y comportamiento</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateAlert' as never)}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nueva Alerta</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#226bfc" />
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          >
            {alerts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
                </View>
                <Text style={styles.emptyTitle}>Sin reglas definidas</Text>
                <Text style={styles.emptyText}>
                  Crea tu primera regla para recibir notificaciones cuando ocurra un evento importante (robo, exceso de velocidad, etc).
                </Text>
                <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => navigation.navigate('CreateAlert' as never)}
                >
                    <Text style={styles.emptyButtonText}>Crear mi primera alerta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={isDesktop ? styles.grid : styles.list}>
                {alerts.map((alert, index) => (
                  <View key={alert.id} style={isDesktop ? styles.gridItem : undefined}>
                    <AlertCard item={alert} index={index} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
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

  scrollContent: { padding: 20 },
  list: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '32%', minWidth: 320 },

  // Card Styles
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cardType: { fontSize: 13, color: '#6b7280' },

  cardBody: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  pillText: { fontSize: 12, color: '#4b5563', fontWeight: '500' },
  
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifLabel: { fontSize: 12, color: '#9ca3af', marginRight: 4 },

  cardFooter: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { color: '#9ca3af', textAlign: 'center', maxWidth: 300, marginBottom: 24 },
  emptyButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  emptyButtonText: { color: '#374151', fontWeight: '600' },
});