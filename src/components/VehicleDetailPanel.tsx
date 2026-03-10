import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../api/mockData';

interface Props {
    vehicle: Vehicle;
    onClose: () => void;
    onOpenDetails: () => void; // <--- Prop clave para abrir el modal grande
}

export default function VehicleDetailPanel({ vehicle, onClose, onOpenDetails }: Props) {
    const { deviceInfo } = vehicle;

    // Helper para color de estado
    const getAccColor = (status?: string) => status === 'ENCENDIDO' ? '#10b981' : '#ef4444';

    return (
        <View style={styles.container}>
            {/* --- HEADER (Nombre y Cerrar) --- */}
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

            {/* --- TARJETAS DE ESTADO (Scroll Horizontal) --- */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
                
                {/* 1. ACC (Ignición) */}
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>ACC (Ignición)</Text>
                        <Ionicons name="key" size={14} color="#64748b" />
                    </View>
                    <Text style={[styles.value, {color: getAccColor(deviceInfo?.accStatus)}]}>
                        {deviceInfo?.accStatus || '---'}
                    </Text>
                </View>

                {/* 2. Voltaje */}
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>Voltaje Batería</Text>
                        <Ionicons name="flash" size={14} color="#eab308" />
                    </View>
                    <Text style={styles.value}>{deviceInfo?.voltage || '0 V'}</Text>
                </View>

                {/* 3. Último GPS */}
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>Último GPS</Text>
                        <Ionicons name="time" size={14} color="#3b82f6" />
                    </View>
                    <Text style={styles.value}>{deviceInfo?.lastGps || '--:--'}</Text>
                </View>
                
                {/* 4. Expiración */}
                <View style={styles.statCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.label}>Expiración</Text>
                        <Ionicons name="calendar" size={14} color="#8b5cf6" />
                    </View>
                    <Text style={styles.value}>{deviceInfo?.expiration || '---'}</Text>
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

                 {/* ESTE BOTÓN ABRE EL MODAL GRANDE */}
                 <TouchableOpacity style={styles.actionBtn} onPress={onOpenDetails}>
                    <View style={[styles.actionIcon, {backgroundColor:'#eff6ff'}]}>
                        <Ionicons name="document-text" size={22} color="#3b82f6" />
                    </View>
                    <Text style={styles.actionText}>Detalles</Text>
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