import React, { useState } from 'react'; // Añadimos useState para el feedback de carga
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../api/mockData';
import sharedLinkService from '../api/sharedLinkService';


interface Props {
    vehicle: Vehicle;
    onClose: () => void;
    onOpenDetails: () => void;
}

export default function VehicleDetailPanel({ vehicle, onClose, onOpenDetails }: Props) {
    const { deviceInfo } = vehicle;
    const [sharing, setSharing] = useState(false); // Estado para mostrar carga al generar link

    const getAccColor = (status?: string) => status === 'ENCENDIDO' ? '#10b981' : '#ef4444';

    // 🔥 FUNCIÓN PARA GENERAR Y COMPARTIR EL LINK
    const handleShareLink = async () => {
        // Validamos que el vehículo tenga un ID válido antes de disparar
        if (!vehicle || !vehicle.id) {
            alert('Error: Vehículo no identificado');
            return;
        }

        try {
            setSharing(true);
            
            // 1. Llamada al servicio que usa tu apiClient
            const response = await sharedLinkService.generateLink(vehicle.id, 24);

            /**
             * OJO AQUÍ: Si tu apiClient devuelve la respuesta completa de Axios, 
             * el token estará en response.data.token o response.token 
             * dependiendo de cómo manejes el return en el service.
             */
            const token = response.token || response.data?.token;

            if (token) {
                // Construimos la URL apuntando a la ruta WEB de Laravel (sin /api)
                const shareUrl = `https://backend.track-gpx.com.mx/track-live/${token}`;
                
                if (Platform.OS === 'web') {
                    // Copiado para navegador (Chrome, Safari, etc.)
                    await navigator.clipboard.writeText(shareUrl);
                    alert('🚀 ¡Enlace de rastreo copiado! Ya puedes pegarlo en WhatsApp.');
                } else {
                    // Menú nativo para Android/iOS
                    await Share.share({
                        message: `📍 Sigue el vehículo ${vehicle.name} de TrackGPX en tiempo real aquí: ${shareUrl}`,
                        url: shareUrl
                    });
                }
            } else {
                throw new Error('No se recibió un token válido del servidor');
            }
        } catch (error: any) {
            console.error("Error al compartir:", error);
            alert(error.message || 'No se pudo generar el enlace. Intenta de nuevo.');
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                    <View style={styles.iconBox}>
                        <Ionicons name="car-sport" size={24} color="#3b82f6" />
                    </View>
                    <View>
                        <Text style={styles.title}>{vehicle.name}</Text>
                        <Text style={styles.subtitle}>
                            IMEI: <Text style={{fontWeight:'bold'}}>{deviceInfo?.imei || 'N/A'}</Text>
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* --- TARJETAS DE ESTADO --- */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>ACC (Ignición)</Text>
                        <Ionicons name="key" size={14} color="#64748b" />
                    </View>
                    <Text style={[styles.value, {color: getAccColor(deviceInfo?.accStatus)}]}>
                        {deviceInfo?.accStatus || '---'}
                    </Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>Voltaje Batería</Text>
                        <Ionicons name="flash" size={14} color="#eab308" />
                    </View>
                    <Text style={styles.value}>{deviceInfo?.voltage || '0 V'}</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>Último GPS</Text>
                        <Ionicons name="time" size={14} color="#3b82f6" />
                    </View>
                    <Text style={styles.value}>{deviceInfo?.lastGps || '--:--'}</Text>
                </View>
            </ScrollView>
            
            {/* --- BOTONES DE ACCIÓN RÁPIDA --- */}
            <View style={styles.actionsRow}>
                 <TouchableOpacity style={styles.actionBtn}>
                    <View style={[styles.actionIcon, {backgroundColor:'#eff6ff'}]}>
                        <Ionicons name="play-circle" size={22} color="#3b82f6" />
                    </View>
                    <Text style={styles.actionText}>Playback</Text>
                 </TouchableOpacity>

                 <TouchableOpacity style={styles.actionBtn} onPress={onOpenDetails}>
                    <View style={[styles.actionIcon, {backgroundColor:'#eff6ff'}]}>
                        <Ionicons name="document-text" size={22} color="#3b82f6" />
                    </View>
                    <Text style={styles.actionText}>Detalles</Text>
                 </TouchableOpacity>

                 {/* 👇 NUEVO BOTÓN: COMPARTIR */}
                 <TouchableOpacity style={styles.actionBtn} onPress={handleShareLink} disabled={sharing}>
                    <View style={[styles.actionIcon, {backgroundColor:'#f0fdf4'}]}>
                        {sharing ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                        ) : (
                            <Ionicons name="share-social" size={22} color="#16a34a" />
                        )}
                    </View>
                    <Text style={[styles.actionText, {color:'#16a34a'}]}>Compartir</Text>
                 </TouchableOpacity>

                 <TouchableOpacity style={styles.actionBtn}>
                    <View style={[styles.actionIcon, {backgroundColor:'#fef2f2'}]}>
                        <Ionicons name="lock-closed" size={22} color="#ef4444" />
                    </View>
                    <Text style={[styles.actionText, {color:'#ef4444'}]}>Paro Motor</Text>
                 </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0, 
        left: 0, 
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        // Sombra fuerte para resaltar sobre el mapa
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: -4 }, 
        shadowOpacity: 0.15, 
        shadowRadius: 12, 
        elevation: 20,
        zIndex: 2000,
        paddingBottom: 30 // Espacio extra para iPhones sin botón home
    },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
    
    // ScrollView Tarjetas
    statsContainer: { marginBottom: 20 },
    statCard: {
        width: 130,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    label: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
    value: { fontSize: 15, fontWeight: '700', color: '#1e293b' },

    // Acciones
    actionsRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        borderTopWidth: 1, 
        borderColor: '#f1f5f9', 
        paddingTop: 20 
    },
    actionBtn: { alignItems: 'center', gap: 8 },
    actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    actionText: { fontSize: 12, color: '#334155', fontWeight: '600' }
});