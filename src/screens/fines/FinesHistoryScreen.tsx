import React, { useState, useCallback, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, TextInput, Modal, ScrollView, Platform, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import fineService from '../../api/fineOService';
import groupService from '../../api/groupService';

// --- COMPONENTE ESPECIAL: DATE INPUT (Web & Mobile) ---
const DateInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.dateGroup}>
                <Text style={styles.labelMini}>{label}</Text>
                <View style={styles.webDateWrapper}>
                    {/* @ts-ignore: Input nativo de HTML para soporte de calendario */}
                    <input 
                        type="date" 
                        value={value}
                        onChange={(e: any) => onChange(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            fontSize: '12px',
                            color: '#334155',
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'transparent',
                            fontFamily: 'system-ui'
                        }}
                    />
                </View>
            </View>
        );
    }

    // Fallback para Móvil
    return (
        <View style={styles.dateGroup}>
            <Text style={styles.labelMini}>{label}</Text>
            <TextInput 
                style={styles.dateInput} 
                value={value} 
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
            />
        </View>
    );
};

export default function FinesHistoryScreen() {
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false); // Estado para loading de exportación
    
    // Datos
    const [fines, setFines] = useState<any[]>([]);
    const [stats, setStats] = useState({ total_amount: 0, paid_count: 0, pending_count: 0 });
    const [groups, setGroups] = useState<any[]>([]);

    // --- FILTROS ---
    const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>('all');
    const [selectedGroupName, setSelectedGroupName] = useState('Todas las Flotas');
    
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [statusLabel, setStatusLabel] = useState('Cualquier Estatus');

    const [searchText, setSearchText] = useState('');
    
    // Fechas (Default: Inicio de mes a Hoy)
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);

    // --- MODALES ---
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false); // Nuevo Modal Export

    // 1. Carga inicial de Grupos
    useEffect(() => {
        groupService.getGroups().then(setGroups).catch(console.error);
    }, []);

    // 2. Función de Carga de Reporte
    const loadReport = async () => {
        setLoading(true);
        try {
            const filters = {
                group_id: selectedGroupId,
                status: selectedStatus,
                search: searchText,
                start_date: startDate,
                end_date: endDate
            };
            const res = await fineService.getHistory(filters);
            setFines(res.data);
            setStats(res.stats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 3. Efecto: Búsqueda en Vivo (Debounce) + Filtros
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            loadReport();
        }, 600); // Espera 600ms después de escribir para buscar

        return () => clearTimeout(delaySearch);
    }, [selectedGroupId, selectedStatus, startDate, endDate, searchText]);

    // 4. Función de Exportación
    const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
        setShowExportModal(false);
        setExporting(true);
        try {
            const filters = {
                group_id: selectedGroupId,
                status: selectedStatus,
                search: searchText,
                start_date: startDate,
                end_date: endDate
            };
            
            // Asumiendo que agregaste 'exportReport' a fineService.ts como te indiqué
            await fineService.exportReport(filters, format);
            
            // En web la descarga es automática, en móvil podríamos mostrar un mensaje
            if(Platform.OS !== 'web') Alert.alert("Éxito", "Reporte descargado");
            
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo generar el archivo");
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (amount: any) => parseFloat(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year:'2-digit' });

    // --- RENDERIZADO DE FILA ---
    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.row}>
            {/* Fecha y Estatus */}
            <View style={styles.colDate}>
                <Text style={styles.dateText}>{formatDate(item.detected_at)}</Text>
                <View style={[styles.statusBadge, item.status === 'paid' ? styles.bgGreen : styles.bgRed]}>
                    <Text style={styles.statusBadgeText}>{item.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}</Text>
                </View>
            </View>

            {/* Detalle (Vehículo, Grupo, Conductor) */}
            <View style={styles.colInfo}>
                {/* LÍNEA 1: Placa • Folio */}
                <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                    <Text style={styles.plateText}>{item.vehicle?.plate}</Text>
                    <Text style={{fontSize:12, color:'#94a3b8'}}>•</Text>
                    <Text style={{fontSize:12, color:'#334155', fontWeight:'bold'}}>
                        Folio: {item.reference || 'S/N'}
                    </Text>
                </View>

                {/* LÍNEA 2: Motivo (Descripción) */}
                <Text style={{fontSize:11, color:'#475569', fontStyle:'italic', marginTop:2}} numberOfLines={1}>
                    "{item.description || 'Sin motivo registrado'}"
                </Text>

                {/* LÍNEA 3: Grupo, Supervisor y Conductor (Lo que ya tenías) */}
                <View style={{marginTop:4, gap:2}}>
                    {/* Grupo */}
                    <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                        <View style={[styles.dot, { backgroundColor: item.vehicle?.group?.color || '#cbd5e1' }]} />
                        <Text style={styles.groupText}>{item.vehicle?.group?.name || 'Sin Grupo'}</Text>
                        <Text style={styles.supText}>(Sup: {item.vehicle?.group?.supervisor?.name || 'N/A'})</Text>
                    </View>
                    
                    {/* Conductor */}
                    <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                        <Ionicons name="person" size={10} color="#64748b" />
                        <Text style={styles.driverText}>
                           {item.vehicle?.driver?.account?.name || item.vehicle?.driver?.name || 'No Asignado'}
                        </Text>
                    </View>
                </View>
            </View>
            {/* Monto */}
            <View style={styles.colAmount}>
                <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
            </View>
        </View>
    );

    return (
        <MainLayout activeMenu="Historial">
            <View style={styles.container}>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Reporte Histórico</Text>
                    <TouchableOpacity 
                        style={[styles.exportBtn, exporting && {opacity: 0.7}]} 
                        onPress={() => setShowExportModal(true)}
                        disabled={exporting}
                    >
                        {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
                        <Text style={styles.exportText}>{exporting ? 'Generando...' : 'Exportar'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Panel de Filtros */}
                <View style={styles.controlPanel}>
                    {/* Fila 1: Buscador */}
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={18} color="#94a3b8" />
                        <TextInput 
                            placeholder="Buscar por placa, conductor o vehículo..." 
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {loading && <ActivityIndicator size="small" color="#3b82f6" style={{marginLeft:10}}/>}
                    </View>

                    {/* Fila 2: Selectores */}
                    <View style={styles.filterRow}>
                        
                        {/* Fechas */}
                        <DateInput label="Desde" value={startDate} onChange={setStartDate} />
                        <DateInput label="Hasta" value={endDate} onChange={setEndDate} />

                        {/* Filtro Grupo */}
                        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowGroupModal(true)}>
                            <Text style={styles.labelMini}>Flota / Grupo</Text>
                            <View style={styles.filterBtnContent}>
                                <Text style={styles.filterBtnText} numberOfLines={1}>{selectedGroupName}</Text>
                                <Ionicons name="chevron-down" size={14} color="#64748b" />
                            </View>
                        </TouchableOpacity>

                         {/* Filtro Estatus */}
                         <TouchableOpacity style={styles.filterBtn} onPress={() => setShowStatusModal(true)}>
                            <Text style={styles.labelMini}>Estatus Pago</Text>
                            <View style={styles.filterBtnContent}>
                                <Text style={styles.filterBtnText}>{statusLabel}</Text>
                                <Ionicons name="chevron-down" size={14} color="#64748b" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* KPIs (Tarjetas de Resumen) */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Gastado</Text>
                        <Text style={styles.statValue}>{formatCurrency(stats.total_amount)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}># Multas</Text>
                        <Text style={styles.statValue}>{stats.paid_count + stats.pending_count}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Pendientes</Text>
                        <Text style={[styles.statValue, {color:'#ef4444'}]}>{stats.pending_count}</Text>
                    </View>
                </View>

                {/* Tabla de Resultados */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, {flex: 0.25}]}>FECHA</Text>
                    <Text style={[styles.th, {flex: 0.45}]}>DETALLE</Text>
                    <Text style={[styles.th, {flex: 0.3, textAlign:'right'}]}>MONTO</Text>
                </View>

                <FlatList
                    data={fines}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{paddingBottom: 50}}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={{alignItems:'center', marginTop:30}}>
                                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                                <Text style={{color:'#94a3b8', marginTop:10}}>No se encontraron resultados.</Text>
                            </View>
                        ) : null
                    }
                />

                {/* --- MODAL 1: EXPORTAR --- */}
                <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExportModal(false)}>
                        <View style={styles.dropdownModal}>
                            <Text style={styles.dropdownTitle}>Seleccionar Formato</Text>
                            
                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleExport('xlsx')}>
                                <Ionicons name="grid" size={18} color="#10b981" />
                                <Text style={styles.dropdownText}>Excel (.xlsx)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleExport('pdf')}>
                                <Ionicons name="document" size={18} color="#ef4444" />
                                <Text style={styles.dropdownText}>PDF (Imprimible)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.dropdownOption} onPress={() => handleExport('csv')}>
                                <Ionicons name="code" size={18} color="#64748b" />
                                <Text style={styles.dropdownText}>CSV (Texto plano)</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* --- MODAL 2: GRUPOS --- */}
                <Modal visible={showGroupModal} transparent animationType="fade" onRequestClose={() => setShowGroupModal(false)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGroupModal(false)}>
                        <View style={[styles.dropdownModal, {height: 300}]}>
                            <Text style={styles.dropdownTitle}>Filtrar por Grupo</Text>
                            <ScrollView>
                                <TouchableOpacity style={styles.dropdownOption} onPress={() => { setSelectedGroupId('all'); setSelectedGroupName('Todas las Flotas'); setShowGroupModal(false); }}>
                                    <Text style={styles.dropdownText}>Todas las Flotas</Text>
                                    {selectedGroupId === 'all' && <Ionicons name="checkmark" size={16} color="#3b82f6"/>}
                                </TouchableOpacity>
                                {groups.map(g => (
                                    <TouchableOpacity key={g.id} style={styles.dropdownOption} onPress={() => { setSelectedGroupId(g.id); setSelectedGroupName(g.name); setShowGroupModal(false); }}>
                                        <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                                            <View style={[styles.dot, {backgroundColor: g.color}]} />
                                            <Text style={styles.dropdownText}>{g.name}</Text>
                                        </View>
                                        {selectedGroupId === g.id && <Ionicons name="checkmark" size={16} color="#3b82f6"/>}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* --- MODAL 3: ESTATUS --- */}
                <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
                        <View style={styles.dropdownModal}>
                            <Text style={styles.dropdownTitle}>Filtrar por Estatus</Text>
                            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setSelectedStatus('all'); setStatusLabel('Cualquier Estatus'); setShowStatusModal(false); }}>
                                <Text style={styles.dropdownText}>Cualquier Estatus</Text>
                                {selectedStatus === 'all' && <Ionicons name="checkmark" size={16} color="#3b82f6"/>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setSelectedStatus('pending'); setStatusLabel('Solo Pendientes'); setShowStatusModal(false); }}>
                                <Text style={styles.dropdownText}>Solo Pendientes</Text>
                                {selectedStatus === 'pending' && <Ionicons name="checkmark" size={16} color="#3b82f6"/>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setSelectedStatus('paid'); setStatusLabel('Solo Pagadas'); setShowStatusModal(false); }}>
                                <Text style={styles.dropdownText}>Solo Pagadas</Text>
                                {selectedStatus === 'paid' && <Ionicons name="checkmark" size={16} color="#3b82f6"/>}
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

            </View>
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
    exportBtn: { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 6, alignItems:'center' },
    exportText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    // Panel de Control
    controlPanel: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 10, height: 36, marginBottom: 10 },
    searchInput: { 
        flex: 1, 
        marginLeft: 8, 
        fontSize: 13, 
        height: '100%',
        ...Platform.select({
            web: {
                outlineStyle: 'none' as any // 'as any' para calmar a TS
            }
        })
    },
    
    filterRow: { flexDirection: 'row', gap: 10, flexWrap:'wrap' },
    labelMini: { fontSize: 10, color: '#94a3b8', marginBottom: 2, fontWeight: '600' },
    
    // Date Picker Web
    dateGroup: { width: 110 },
    webDateWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 6, height: 32, justifyContent: 'center', backgroundColor: '#fff' },
    dateInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, height: 32, fontSize: 12, color: '#334155', backgroundColor:'#fff' },

    // Botones Filtro
    filterBtn: { flex: 1, minWidth: 100 },
    filterBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 8, height: 32, backgroundColor:'#fff' },
    filterBtnText: { fontSize: 12, color: '#334155', fontWeight:'500' },

    // KPIs
    statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },

    // Tabla
    tableHeader: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 8 },
    th: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
    
    row: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    
    colDate: { flex: 0.25 },
    dateText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    statusBadgeText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
    bgGreen: { backgroundColor: '#10b981' },
    bgRed: { backgroundColor: '#ef4444' },

    colInfo: { flex: 0.45, paddingHorizontal: 8 },
    plateText: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
    groupText: { fontSize: 11, color: '#64748b' },
    supText: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' },
    driverText: { fontSize: 10, color: '#64748b' },
    dot: { width: 6, height: 6, borderRadius: 3 },

    colAmount: { flex: 0.3, alignItems: 'flex-end' },
    amountText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
    dropdownModal: { backgroundColor: '#fff', borderRadius: 12, padding: 10, width: 280, shadowColor:'#000', shadowOpacity:0.2, elevation:5 },
    dropdownTitle: { fontSize: 12, fontWeight:'bold', color:'#94a3b8', marginBottom: 8, paddingLeft: 8, textTransform:'uppercase' },
    dropdownOption: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor:'#f1f5f9' },
    dropdownText: { fontSize: 14, color: '#334155' }
});