import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import reportService, { MileageRecord } from '../../api/reportService';

export default function MileageReportScreenWeb() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<MileageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Totales
  const [stats, setStats] = useState({ km: 0, fuel: 0, efficiency: 0 });

  useEffect(() => {
    vehicleService.getVehicles().then((res: any) => {
      const list = Array.isArray(res) ? res : (res.data || []);
      setVehicles(list);
    });
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const results = await reportService.getMileage(startDate, endDate, selectedVehicleId);
      setData(results);
      
      const sumKm = results.reduce((acc, curr) => acc + Number(curr.distance_km), 0);
      const sumFuel = results.reduce((acc, curr) => acc + parseFloat(curr.fuel_consumption), 0);
      
      setStats({
        km: sumKm,
        fuel: sumFuel,
        efficiency: sumFuel > 0 ? (sumKm / sumFuel) : 0
      });
      setGenerated(true);
    } catch (e) {
      console.error(e);
      alert("Error al calcular reporte");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (data.length === 0) return;
    const headers = ["Vehiculo", "Chofer", "Distancia (km)", "Vel Max (km/h)", "Vel Prom (km/h)", "T. Movimiento", "T. Detenido", "Consumo (L)", "Rendimiento (km/L)"];
    
    const rows = data.map(row => [
        row.vehicle_name,
        row.driver_name,
        row.distance_km.toFixed(2),
        Number(row.max_speed).toFixed(1),
        Number(row.avg_speed).toFixed(1),
        row.moving_time,
        row.stopped_time,
        row.fuel_consumption,
        (Number(row.distance_km) / Number(row.fuel_consumption || 1)).toFixed(2)
    ]);

    let csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Kilometraje_${startDate}.csv`);
    link.click();
  };

  const renderItem = ({ item }: { item: MileageRecord }) => {
    const performance = (Number(item.distance_km) / Number(item.fuel_consumption || 1)).toFixed(1);
    
    return (
      <View style={styles.row}>
        <View style={styles.colName}>
            <Text style={styles.cellTitle}>{item.vehicle_name}</Text>
            <Text style={styles.cellSub}>{item.driver_name || 'Sin chofer asignado'}</Text>
        </View>
        
        <View style={styles.colDist}>
            <Text style={styles.cellValueBold}>{Number(item.distance_km).toFixed(1)} km</Text>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(Number(item.distance_km), 100)}%` as any }]} />
            </View>
        </View>

        <View style={styles.colData}><Text style={styles.cellValue}>{Number(item.max_speed).toFixed(1)}</Text></View>
        <View style={styles.colData}><Text style={styles.cellValue}>{Number(item.avg_speed).toFixed(1)}</Text></View>

        <View style={styles.colData}>
            <View style={styles.timeWrapper}>
                <View style={styles.timeItem}>
                    <View style={[styles.dot, {backgroundColor: '#22c55e'}]}/>
                    <Text style={styles.timeText}>{item.moving_time}</Text>
                </View>
                <View style={styles.timeItem}>
                    <View style={[styles.dot, {backgroundColor: '#ef4444'}]}/>
                    <Text style={styles.timeText}>{item.stopped_time}</Text>
                </View>
            </View>
        </View>
        
        <View style={styles.colData}>
            <Text style={styles.fuelText}>{item.fuel_consumption} L</Text>
            <Text style={styles.efficiencyText}>{performance} km/L</Text>
        </View>
      </View>
    );
  };

  return (
    <MainLayout activeMenu="Kilometraje">
      <View style={styles.container}>
        
        <View style={styles.topBar}>
            <View>
                <Text style={styles.title}>Reporte de Kilometraje</Text>
                <Text style={styles.subtitle}>Análisis de eficiencia y distancias recorridas</Text>
            </View>
            <TouchableOpacity 
                style={[styles.downloadBtn, (!generated || data.length === 0) && {opacity: 0.5}]} 
                onPress={downloadCSV}
                disabled={!generated}
            >
                <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Exportar CSV</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.card}>
            <View style={styles.filtersRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Desde</Text>
                    <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} {...{type:'date'} as any}/>
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hasta</Text>
                    <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} {...{type:'date'} as any}/>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Vehículo</Text>
                    <select 
                        style={styles.select as any} 
                        value={selectedVehicleId || ''} 
                        onChange={e => setSelectedVehicleId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Todos los vehículos</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
                    </select>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Generar Reporte</Text>}
                </TouchableOpacity>
            </View>
        </View>

        {generated && (
            <View style={styles.statsRow}>
                <StatCard icon="speedometer" label="Distancia Total" value={`${stats.km.toFixed(1)} km`} color="#2563eb" bg="#dbeafe" />
                <StatCard icon="color-fill" label="Combustible" value={`${stats.fuel.toFixed(1)} L`} color="#db2777" bg="#fce7f3" />
                <StatCard icon="leaf" label="Rendimiento Prom." value={`${stats.efficiency.toFixed(1)} km/L`} color="#16a34a" bg="#dcfce7" />
            </View>
        )}

        <View style={styles.tableHeader}>
            <Text style={[styles.th, {flex: 1.5}]}>Vehículo / Chofer</Text>
            <Text style={[styles.th, {flex: 2}]}>Kilometraje</Text>
            <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>V. Max</Text>
            <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>V. Prom</Text>
            <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>Tiempos</Text>
            <Text style={[styles.th, {flex: 1, textAlign: 'center'}]}>Consumo</Text>
        </View>

        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => String(item.vehicle_id)}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="document-text-outline" size={48} color="#cbd5e1"/>
                    <Text style={styles.emptyText}>No hay datos para mostrar</Text>
                </View>
            }
        />
      </View>
    </MainLayout>
  );
}

// Componente pequeño para las cards de arriba
const StatCard = ({icon, label, value, color, bg}: any) => (
    <View style={styles.statCard}>
        <View style={[styles.iconCircle, {backgroundColor: bg}]}><Ionicons name={icon} size={22} color={color}/></View>
        <View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  subtitle: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  filtersRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  input: { height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  select: { height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, fontSize: 13, backgroundColor: '#fff' },
  searchBtn: { backgroundColor: '#2563eb', height: 40, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center' },
  downloadBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  iconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  tableHeader: { flexDirection: 'row', padding: 14, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 4 },
  th: { fontWeight: '700', color: '#64748b', fontSize: 11, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  colName: { flex: 1.5 },
  colDist: { flex: 2, paddingRight: 20 },
  colData: { flex: 1, alignItems: 'center' },
  cellTitle: { fontWeight: '700', color: '#334155', fontSize: 14 },
  cellSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cellValue: { color: '#475569', fontWeight: '600' },
  cellValueBold: { fontWeight: '800', color: '#2563eb', fontSize: 15 },
  barTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 8 },
  barFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  timeWrapper: { gap: 4 },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  timeText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  fuelText: { fontWeight: '700', color: '#be185d' },
  efficiencyText: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontWeight: '500' }
});