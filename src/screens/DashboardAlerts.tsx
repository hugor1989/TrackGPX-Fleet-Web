import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // Para sonido de alerta
import alertService, { AlertLog } from '../api/alertService';
import moment from 'moment'; // O tu función helper de tiempo

// Configuración
const POLL_INTERVAL = 15000; // Revisar cada 15 segundos
const MAX_VISIBLE_ALERTS = 4; // Máximo de alertas en pantalla

export default function DashboardAlerts() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const lastAlertIdRef = useRef<number>(0); // Para saber cuál fue la última y no repetir sonido
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animación de entrada

  // Cargar Sonido (Opcional)
  const [sound, setSound] = useState<Audio.Sound>();

  async function playSound() {
    try {
      // Un 'bip' sencillo si tienes el archivo, si no, comenta esto
      // const { sound } = await Audio.Sound.createAsync(require('../../assets/alert.mp3'));
      // setSound(sound);
      // await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound', error);
    }
  }

  useEffect(() => {
    // 1. Carga inicial
    checkNewAlerts();

    // 2. Intervalo (Polling)
    const interval = setInterval(checkNewAlerts, POLL_INTERVAL);

    // Animación de entrada del panel
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      clearInterval(interval);
      sound?.unloadAsync();
    };
  }, []);

  const checkNewAlerts = async () => {
    try {
      // Pedimos solo las NO LEÍDAS
      const response = await alertService.getAlertLogs({ unread_only: true, page: 1 });
      
      // Detección de datos (igual que hicimos en la pantalla de logs)
      let incoming: AlertLog[] = [];
      if (Array.isArray(response)) incoming = response;
      else if (response && Array.isArray(response.data)) incoming = response.data;
      else if (response?.data?.data) incoming = response.data.data;

      if (incoming.length > 0) {
        // Ordenamos por ID descendente (la más nueva arriba)
        const sorted = incoming.sort((a, b) => b.id - a.id).slice(0, MAX_VISIBLE_ALERTS);
        
        // Detectar si hay una NUEVA REAL (ID mayor al que teníamos)
        const newestId = sorted[0].id;
        if (newestId > lastAlertIdRef.current) {
            // ¡Nueva Alerta Detectada!
            if (lastAlertIdRef.current !== 0) { // No sonar en la primera carga masiva
                playSound(); 
            }
            lastAlertIdRef.current = newestId;
            setAlerts(sorted);
        } else {
            // Solo actualizamos la lista por si alguna se marcó como leída en otro lado
            setAlerts(sorted);
        }
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error("Error polling alerts:", error);
    }
  };

  const handleDismiss = async (id: number) => {
    // La quitamos visualmente rápido
    setAlerts(prev => prev.filter(a => a.id !== id));
    // Marcamos como leída en backend
    await alertService.markAsRead(id);
  };

  const getIcon = (type: string) => {
    if (type.includes('power')) return { name: 'flash', color: '#dc2626', bg: '#fee2e2' };
    if (type.includes('speed')) return { name: 'speedometer', color: '#ea580c', bg: '#ffedd5' };
    if (type.includes('geofence')) return { name: 'map', color: '#2563eb', bg: '#dbeafe' };
    if (type.includes('sos')) return { name: 'alert-circle', color: '#be123c', bg: '#ffe4e6' };
    return { name: 'notifications', color: '#4b5563', bg: '#f3f4f6' };
  };

  if (alerts.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
            <View style={styles.dot} />
            <Text style={styles.headerTitle}>Alertas en Vivo</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ActiveAlerts' as never)}>
             <Text style={styles.seeAll}>Ver Todo</Text>
        </TouchableOpacity>
      </View>

      {alerts.map((alert) => {
        const iconStyle = getIcon(alert.type);
        return (
          <TouchableOpacity 
            key={alert.id} 
            style={styles.card}
            activeOpacity={0.9} // Efecto visual suave al presionar
            onPress={() => (navigation as any).navigate('AlertDetailMap', { alert })}
          >
            {/* Barra lateral de color */}
            <View style={[styles.strip, { backgroundColor: iconStyle.color }]} />
            
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <View style={[styles.iconBox, { backgroundColor: iconStyle.bg }]}>
                        <Ionicons name={iconStyle.name as any} size={16} color={iconStyle.color} />
                    </View>
                    <Text style={styles.timeText}>Hace instantes</Text> 
                </View>

                <Text style={styles.vehicleText} numberOfLines={1}>
                    {alert.vehicle ? `${alert.vehicle.plate} • ${alert.vehicle.brand}` : 'Vehículo Desconocido'}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>{alert.message}</Text>
            </View>

            {/* El botón de cerrar (La X) sigue funcionando independiente */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => handleDismiss(alert.id)}>
                <Ionicons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20, // Posición flotante abajo
    left: 20,   // A la izquierda (Estilo WhatsGPS / consola profesional)
    width: 300, // Ancho fijo
    zIndex: 1000, // Encima del mapa
    gap: 10,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 4, backdropFilter: 'blur(10px)'
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  seeAll: { color: '#bfdbfe', fontSize: 11, marginLeft: 8, fontWeight: '600' },

  // Tarjetas
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: {width:0, height:4},
    elevation: 5,
    overflow: 'hidden',
    minHeight: 80
  },
  strip: { width: 4 },
  content: { flex: 1, padding: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  iconBox: { padding: 4, borderRadius: 6 },
  timeText: { fontSize: 10, color: '#9ca3af' },
  vehicleText: { fontSize: 13, fontWeight: 'bold', color: '#1f2937' },
  messageText: { fontSize: 12, color: '#4b5563', lineHeight: 16 },
  
  closeBtn: { padding: 8, alignItems: 'flex-start' }
});