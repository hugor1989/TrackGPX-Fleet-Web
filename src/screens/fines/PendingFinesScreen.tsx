import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Alert, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import fineService from '../../api/fineOService';

export default function PendingFinesScreen() {
    const [loading, setLoading] = useState(false);
    const [fines, setFines] = useState<any[]>([]);
    const [totalDebt, setTotalDebt] = useState(0);

    // Cargar solo pendientes
    const loadPending = async () => {
        setLoading(true);
        try {
            // Reutilizamos el endpoint history pero forzamos status='pending'
            const res = await fineService.getHistory({ status: 'pending' });
            setFines(res.data);
            setTotalDebt(res.stats.total_amount); // Usamos el total que ya calcula el back
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { loadPending(); }, []));

    // Acción de Pagar
    const handlePay = (fine: any) => {
        Alert.alert(
            "Registrar Pago",
            `¿Deseas marcar la multa ${fine.reference} como PAGADA?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Confirmar Pago", 
                    onPress: async () => {
                        try {
                            // Aquí llamarías a tu endpoint de pagar: await fineService.pay(fine.id);
                            // Por ahora simulamos recarga:
                            Alert.alert("Éxito", "Pago registrado correctamente");
                            loadPending(); 
                        } catch (e) {
                            Alert.alert("Error", "No se pudo registrar el pago");
                        }
                    } 
                }
            ]
        );
    };

    const formatCurrency = (amount: any) => parseFloat(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year:'2-digit' });

    const renderCard = ({ item }: { item: any }) => (
        <View style={styles.card}>
            {/* Encabezado de la Tarjeta (Rojo para urgencia) */}
            <View style={styles.cardHeader}>
                <View style={{flexDirection:'row', gap:8, alignItems:'center'}}>
                    <Ionicons name="warning" size={18} color="#ef4444" />
                    <Text style={styles.cardDate}>{formatDate(item.detected_at)}</Text>
                </View>
                <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
            </View>

            {/* Cuerpo de la Tarjeta */}
            <View style={styles.cardBody}>
                
                {/* Vehículo */}
                <View style={styles.row}>
                    <Ionicons name="car-sport" size={16} color="#64748b" />
                    <Text style={styles.mainText}>{item.vehicle?.plate} • {item.vehicle?.name}</Text>
                </View>

                {/* Grupo / Responsable */}
                <View style={styles.row}>
                    <Ionicons name="people" size={16} color="#64748b" />
                    <Text style={styles.subText}>
                        {item.vehicle?.group?.name || 'Sin Grupo'} 
                        {item.vehicle?.group?.supervisor_name ? ` • Sup: ${item.vehicle.group.supervisor_name}` : ''}
                    </Text>
                </View>

                {/* Motivo */}
                <View style={[styles.row, {alignItems:'flex-start'}]}>
                    <Ionicons name="document-text" size={16} color="#64748b" style={{marginTop:2}} />
                    <View style={{flex:1}}>
                        <Text style={styles.folioText}>Folio: {item.reference}</Text>
                        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                    </View>
                </View>

            </View>

            {/* Pie de Tarjeta (Botón de Acción) */}
            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item)}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.payBtnText}>Registrar Pago</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <MainLayout activeMenu="Pendientes">
            <View style={styles.container}>
                
                <View style={styles.header}>
                    <Text style={styles.title}>Pendientes de Pago</Text>
                </View>

                {/* TOTAL DEUDA (Banner de Alerta) */}
                <View style={styles.debtBanner}>
                    <View>
                        <Text style={styles.debtLabel}>DEUDA TOTAL ACUMULADA</Text>
                        <Text style={styles.debtValue}>{formatCurrency(totalDebt)}</Text>
                    </View>
                    <View style={styles.debtIcon}>
                        <Ionicons name="alert-circle" size={32} color="#fff" />
                    </View>
                </View>

                {/* LISTA DE TARJETAS */}
                {loading ? <ActivityIndicator style={{marginTop:50}} size="large" color="#ef4444" /> : (
                    <FlatList
                        data={fines}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderCard}
                        contentContainerStyle={{paddingBottom: 50}}
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPending} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="checkmark-done-circle" size={64} color="#10b981" />
                                <Text style={styles.emptyText}>¡Todo al día!</Text>
                                <Text style={styles.emptySub}>No hay multas pendientes por pagar.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
    header: { marginBottom: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },

    // Banner Deuda
    debtBanner: { backgroundColor: '#ef4444', borderRadius: 12, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, shadowColor:'#ef4444', shadowOffset:{width:0, height:4}, shadowOpacity:0.3, shadowRadius:5, elevation:5 },
    debtLabel: { color: '#fee2e2', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    debtValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    debtIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 50 },

    // Cards
    card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    
    // Card Header
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fef2f2', borderBottomWidth: 1, borderBottomColor: '#fee2e2' },
    cardDate: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
    cardAmount: { color: '#b91c1c', fontWeight: '800', fontSize: 16 },

    // Card Body
    cardBody: { padding: 15, gap: 10 },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    mainText: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    subText: { fontSize: 13, color: '#64748b' },
    folioText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
    descText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },

    // Card Footer
    cardFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    payBtn: { backgroundColor: '#1e293b', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 8 },
    payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#10b981', marginTop: 10 },
    emptySub: { fontSize: 14, color: '#94a3b8' }
});