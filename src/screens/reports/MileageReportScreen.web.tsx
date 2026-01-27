import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import reportService, { MileageRecord } from '../../api/reportService';

export default function MileageReportScreenWeb() {
  // --- FILTROS ---
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- DATOS ---
  const [data, setData] = useState<MileageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Estadísticas
  const [totalKm, setTotalKm] = useState(0);
  const [totalFuel, setTotalFuel] = useState(0);

  useEffect(() => {
    vehicleService.getVehicles().then((res: any) => {
      const list = Array.isArray(res) ? res : (res.data || []);
      setVehicles(list);
    });
  }, []);

  // Botones rápidos de fecha
  const setQuickDate = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    const end = new Date();
    const start = new Date();
    
    if (type === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
    } else if (type === 'week') {
        start.setDate(start.getDate() - 7);
    } else if (type === 'month') {
        start.setMonth(start.getMonth() - 1);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSearch = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const results = await reportService.getMileage(startDate, endDate, selectedVehicleId);
      setData(results);
      
      const sumKm = results.reduce((acc, curr) => acc + Number(curr.distance_km), 0);
      const sumFuel = results.reduce((acc, curr) => acc + parseFloat(curr.fuel_consumption), 0);
      
      setTotalKm(sumKm);
      setTotalFuel(sumFuel);
      setGenerated(true);
    } catch (e) {
      console.error(e);
      alert("Error al calcular kilometraje");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (data.length === 0) return;
    // Agregamos las columnas de tiempo al CSV
    let csv = "Vehiculo,Chofer,Distancia (km),Vel Max,Vel Prom,T. Movimiento,T. Detenido,Consumo Est.\n";
    data.forEach(row => {
        csv += `${row.vehicle_name},${row.driver_name},${row.distance_km},${row.max_speed},${row.avg_speed},${row.moving_time},${row.stopped_time},${row.fuel_consumption}\n`;
    });
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = `Kilometraje_${startDate}_${endDate}.csv`;
    link.click();
  };

  const maxDistanceInList = Math.max(...data.map(d => d.distance_km), 1);

  const renderItem = ({ item, index }: { item: MileageRecord, index: number }) => {
    const barWidth = `${Math.min((item.distance_km / maxDistanceInList) * 100, 100)}%`;

    return (
      <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
        <View style={styles.colName}>
            <Text style={styles.cellTitle}>{item.vehicle_name}</Text>
            <Text style={styles.cellSub}>{item.driver_name}</Text>
        </View>
        
        <View style={styles.colDist}>
            <Text style={styles.cellValueBold}>{item.distance_km} km</Text>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: barWidth as any }]} />
            </View>
        </View>

        <View style={styles.colData}><Text style={styles.cellValue}>{item.max_speed} km/h</Text></View>
        <View style={styles.colData}><Text style={styles.cellValue}>{item.avg_speed} km/h</Text></View>

        {/* COLUMNA NUEVA DE TIEMPOS */}
        <View style={[styles.colData, { alignItems: 'flex-start', paddingLeft: 10 }]}>
            <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                <Ionicons name="play-circle" size={12} color="#15803d"/>
                <Text style={[styles.cellValue, {fontSize:11, color:'#15803d'}]}>{item.moving_time}</Text>
            </View>
            <View style={{flexDirection:'row', alignItems:'center', gap:4, marginTop:2}}>
                <Ionicons name="pause-circle" size={12} color="#b91c1c"/>
                <Text style={[styles.cellValue, {fontSize:11, color:'#b91c1c'}]}>{item.stopped_time}</Text>
            </View>
        </View>
        
        <View style={styles.colData}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.fuel_consumption}</Text>
            </View>
        </View>
      </View>
    );
  };

  return (
    <MainLayout activeMenu="Kilometraje">
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.topBar}>
            <View>
                <Text style={styles.title}>Reporte de Kilometraje</Text>
                <Text style={styles.subtitle}>Distancias, tiempos de operación y consumo.</Text>
            </View>
            {generated && data.length > 0 && (
                <TouchableOpacity style={styles.downloadBtn} onPress={downloadCSV}>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.btnText}>Exportar</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* FILTROS */}
        <View style={styles.card}>
            <View style={styles.quickFilters}>
                <Text style={styles.label}>Rango Rápido:</Text>
                <TouchableOpacity onPress={() => setQuickDate('today')} style={styles.chip}><Text style={styles.chipText}>Hoy</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setQuickDate('yesterday')} style={styles.chip}><Text style={styles.chipText}>Ayer</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setQuickDate('week')} style={styles.chip}><Text style={styles.chipText}>Esta Semana</Text></TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.filtersRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Desde</Text>
                    <TextInput type="date" style={styles.input} value={startDate} onChangeText={setStartDate} {...{type:'date'} as any}/>
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hasta</Text>
                    <TextInput type="date" style={styles.input} value={endDate} onChangeText={setEndDate} {...{type:'date'} as any}/>
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Vehículo (Opcional)</Text>
                    <select style={styles.select as any} value={selectedVehicleId || ''} onChange={e => setSelectedVehicleId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">-- Todos los Vehículos --</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.plate}</option>)}
                    </select>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Calcular</Text>}
                </TouchableOpacity>
            </View>
        </View>

        {/* RESUMEN */}
        {generated && (
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <View style={[styles.iconCircle, {backgroundColor: '#dbeafe'}]}><Ionicons name="speedometer-outline" size={24} color="#2563eb"/></View>
                    <View><Text style={styles.statLabel}>Distancia Total</Text><Text style={styles.statValue}>{totalKm.toLocaleString()} km</Text></View>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconCircle, {backgroundColor: '#fce7f3'}]}><Ionicons name="water-outline" size={24} color="#db2777"/></View>
                    <View><Text style={styles.statLabel}>Combustible Est.</Text><Text style={styles.statValue}>{totalFuel.toFixed(1)} Litros</Text></View>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconCircle, {backgroundColor: '#dcfce7'}]}><Ionicons name="car-sport-outline" size={24} color="#16a34a"/></View>
                    <View><Text style={styles.statLabel}>Activos</Text><Text style={styles.statValue}>{data.filter(d => d.distance_km > 0).length} / {data.length}</Text></View>
                </View>
            </View>
        )}

        {/* TABLA */}
        <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colName]}>Vehículo / Chofer</Text>
            <Text style={[styles.th, styles.colDist]}>Distancia</Text>
            <Text style={[styles.th, styles.colData]}>Vel Max</Text>
            <Text style={[styles.th, styles.colData]}>Vel Prom</Text>
            <Text style={[styles.th, styles.colData]}>Tiempos</Text> {/* Header Nuevo */}
            <Text style={[styles.th, styles.colData]}>Consumo</Text>
        </View>

        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => String(item.vehicle_id)}
            contentContainerStyle={{paddingBottom: 40}}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="analytics-outline" size={64} color="#e5e7eb"/>
                    <Text style={styles.emptyText}>{generated ? "No hubo movimiento." : "Genera un reporte."}</Text>
                </View>
            }
        />

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 4 },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4 },
  quickFilters: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 16 },
  
  filtersRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', textTransform: 'uppercase' },
  input: { height: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff', outlineStyle:'none' as any },
  select: { height: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  
  searchBtn: { backgroundColor: '#2563eb', height: 42, paddingHorizontal: 24, borderRadius: 8, justifyContent: 'center' },
  downloadBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#10b981', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor:'#000', shadowOpacity:0.03 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  tableHeader: { flexDirection: 'row', padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, marginBottom: 8 },
  th: { fontWeight: '700', color: '#475569', fontSize: 12 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  rowAlt: { backgroundColor: '#f8fafc' },
  
  colName: { flex: 1.5 },
  colDist: { flex: 2, paddingRight: 16 }, 
  colData: { flex: 1, alignItems: 'center' },
  
  cellTitle: { fontWeight: '700', color: '#1e293b' },
  cellSub: { fontSize: 12, color: '#94a3b8' },
  cellValue: { color: '#334155' },
  cellValueBold: { fontWeight: '700', color: '#2563eb' },
  
  barTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 6, width: '100%' },
  barFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },

  badge: { backgroundColor: '#fce7f3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#be185d', fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 16, color: '#94a3b8' }
});