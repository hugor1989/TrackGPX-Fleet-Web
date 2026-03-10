import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, RefreshControl, 
    TouchableOpacity, ActivityIndicator, useWindowDimensions 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../layouts/MainLayout';
import dashboardService from '../api/dashboardService';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    
    // Breakpoints
    const isDesktop = width >= 1024;
    const isTablet = width >= 700 && width < 1024;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<any>(null);

    const loadDashboard = async () => {
        try {
            const res = await dashboardService.getSummary();
            setData(res);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadDashboard(); }, []));
    const onRefresh = () => { setRefreshing(true); loadDashboard(); };

    if (loading && !data) return (
        <MainLayout activeMenu="Dashboard">
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10b981" /></View>
        </MainLayout>
    );

    return (
        <MainLayout activeMenu="Dashboard">
            <ScrollView 
                contentContainerStyle={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Centro de Control</Text>
                        <Text style={styles.headerSub}>Bienvenido, {user?.name}</Text>
                    </View>
                    {/* Botón de acción rápida */}
                    <TouchableOpacity style={styles.quickActionBtn}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={{color:'#fff', fontWeight:'600'}}>Nuevo Reporte</Text>
                    </TouchableOpacity>
                </View>

                {/* --- 1. KPIS (PULSOS) --- */}
                <View style={styles.gridContainer}>
                    <StatCard 
                        label="Total Flota" value={data?.counters?.total || 0} 
                        icon="car-sport" color="#3b82f6" bg="#eff6ff" 
                        width={isDesktop ? '23.5%' : '48%'}
                    />
                    <StatCard 
                        label="En Ruta" value={data?.counters?.active || 0} 
                        icon="navigate" color="#10b981" bg="#ecfdf5" 
                        width={isDesktop ? '23.5%' : '48%'}
                    />
                    <StatCard 
                        label="En Taller" value={data?.counters?.maintenance || 0} 
                        icon="construct" color="#f59e0b" bg="#fffbeb" 
                        width={isDesktop ? '23.5%' : '48%'}
                    />
                    <StatCard 
                        label="Score Flota" value={(data?.counters?.fleet_score || 0) + '/100'} 
                        icon="ribbon" color="#8b5cf6" bg="#f5f3ff" 
                        width={isDesktop ? '23.5%' : '48%'}
                        isScore
                    />
                </View>

                {/* --- 2. ZONA DE RIESGO Y LEGAL (SPLIT VIEW) --- */}
                <View style={[styles.splitSection, !isDesktop && {flexDirection:'column'}]}>
                    
                    {/* IZQUIERDA: CONDUCTORES RIESGOSOS (LOS PEORES) */}
                    <View style={[styles.card, { flex: 1, marginRight: isDesktop ? 20 : 0, marginBottom: 20 }]}>
                        <View style={styles.cardHeader}>
                            <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                                <Ionicons name="flash" size={20} color="#ef4444" />
                                <Text style={styles.cardTitle}>Conductores Riesgosos (Top 3)</Text>
                            </View>
                            <TouchableOpacity><Text style={styles.link}>Ver todos</Text></TouchableOpacity>
                        </View>
                        
                        {data?.risky_drivers?.length > 0 ? (
                            data.risky_drivers.map((driver: any, i: number) => (
                                <View key={i} style={styles.driverRow}>
                                    <View style={[styles.avatarBox, {backgroundColor:'#fee2e2'}]}>
                                        <Text style={{color:'#ef4444', fontWeight:'bold'}}>{driver.name.charAt(0)}</Text>
                                    </View>
                                    <View style={{flex:1, paddingHorizontal:10}}>
                                        <Text style={styles.rowTitle}>{driver.name}</Text>
                                        <Text style={styles.rowSub}>{driver.vehicle}</Text>
                                    </View>
                                    <View style={{alignItems:'flex-end'}}>
                                        <Text style={styles.scoreBad}>{driver.score}/100</Text>
                                        <Text style={styles.incidentText}>{driver.incidents} incidentes</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <EmptyState text="¡Felicidades! No hay conductores riesgosos esta semana." />
                        )}
                    </View>

                    {/* DERECHA: SEMÁFORO LEGAL (DOCUMENTOS Y MULTAS) */}
                    <View style={[styles.card, { flex: 1, marginBottom: 20 }]}>
                        <View style={styles.cardHeader}>
                            <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                                <Ionicons name="document-text" size={20} color="#f59e0b" />
                                <Text style={styles.cardTitle}>Vencimientos y Legal</Text>
                            </View>
                        </View>

                        {data?.legal_alerts?.length > 0 ? (
                            data.legal_alerts.map((doc: any, i: number) => (
                                <View key={i} style={styles.docRow}>
                                    <View style={styles.docIcon}>
                                        <Ionicons 
                                            name={doc.type === 'Multa' ? "alert-circle" : "shield-checkmark"} 
                                            size={18} 
                                            color={doc.days_left < 0 ? '#ef4444' : '#f59e0b'} 
                                        />
                                    </View>
                                    <View style={{flex:1}}>
                                        <Text style={styles.rowTitle}>{doc.type}: {doc.vehicle}</Text>
                                        <Text style={[styles.docStatus, doc.days_left < 0 && {color:'#ef4444'}]}>
                                            {doc.status} ({Math.abs(doc.days_left)} días {doc.days_left < 0 ? 'atraso' : 'restantes'})
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.payBtn}>
                                        <Text style={styles.payBtnText}>Gestionar</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <EmptyState text="Toda la documentación está al día." />
                        )}
                    </View>
                </View>

                {/* --- 3. PRÓXIMOS MANTENIMIENTOS --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                            <Ionicons name="construct" size={20} color="#3b82f6" />
                            <Text style={styles.cardTitle}>Próximos Servicios de Taller</Text>
                        </View>
                    </View>
                    <View style={styles.maintenanceGrid}>
                        {data?.maintenance?.map((item: any, i: number) => (
                            <View key={i} style={styles.maintCard}>
                                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                                    <Text style={styles.maintVehicle}>{item.vehicle}</Text>
                                    <View style={[styles.badge, item.km_left < 0 ? styles.badgeRed : styles.badgeBlue]}>
                                        <Text style={[styles.badgeText, item.km_left < 0 ? styles.textRed : styles.textBlue]}>
                                            {item.km_left < 0 ? 'VENCIDO' : 'PRÓXIMO'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.maintService}>{item.service}</Text>
                                <View style={styles.progressBarBg}>
                                    <View style={[
                                        styles.progressBarFill, 
                                        { width: item.km_left < 0 ? '100%' : '80%', backgroundColor: item.km_left < 0 ? '#ef4444' : '#3b82f6' }
                                    ]} />
                                </View>
                                <Text style={styles.maintMeta}>
                                    {item.km_left < 0 ? `Excedido por ${Math.abs(item.km_left)} km` : `Faltan ${item.km_left} km`}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </MainLayout>
    );
}

// COMPONENTES AUXILIARES
const StatCard = ({ label, value, icon, color, bg, width, isScore }: any) => (
    <View style={[styles.statCard, { width }]}>
        <View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, isScore && {color}]}>{value}</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
    </View>
);

const EmptyState = ({ text }: { text: string }) => (
    <View style={{ padding: 20, alignItems: 'center', opacity: 0.6 }}>
        <Ionicons name="checkmark-circle-outline" size={32} color="#6b7280" />
        <Text style={{ textAlign: 'center', marginTop: 8, color: '#6b7280' }}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 50 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
    headerSub: { color: '#6b7280' },
    quickActionBtn: { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
    statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2, marginBottom: 8 },
    statLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 4 },
    iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    splitSection: { flexDirection: 'row', width: '100%' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    link: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },

    // Driver Row
    driverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    avatarBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
    rowSub: { fontSize: 12, color: '#9ca3af' },
    scoreBad: { fontSize: 16, fontWeight: 'bold', color: '#ef4444' },
    incidentText: { fontSize: 11, color: '#6b7280' },

    // Doc Row
    docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
    docIcon: { width: 36, height: 36, backgroundColor: '#fffbeb', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    docStatus: { fontSize: 12, color: '#d97706', fontWeight: '500' },
    payBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    payBtnText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },

    // Maintenance
    maintenanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    maintCard: { flex: 1, minWidth: 200, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    maintVehicle: { fontWeight: 'bold', color: '#374151', fontSize: 13 },
    maintService: { color: '#6b7280', fontSize: 12, marginBottom: 8 },
    maintMeta: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'right' },
    
    // Badges & Progress
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeRed: { backgroundColor: '#fee2e2' },
    badgeBlue: { backgroundColor: '#dbeafe' },
    textRed: { color: '#991b1b', fontSize: 10, fontWeight: 'bold' },
    textBlue: { color: '#1e40af', fontSize: 10, fontWeight: 'bold' },
    progressBarBg: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
    progressBarFill: { height: '100%', borderRadius: 2 }
});