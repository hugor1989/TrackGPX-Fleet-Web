import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import reportService, { ExpenseRecord } from '../../api/reportService';

export default function FinancialReportScreenWeb() {
  // Filtros
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Ajustar a fin de mes si quieres

  // Datos
  const [data, setData] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, fuel: 0, maintenance: 0, others: 0 });
  const [loading, setLoading] = useState(false);

  // Carga inicial
  useEffect(() => {
    vehicleService.getVehicles().then((res:any) => setVehicles(Array.isArray(res)?res:res.data||[]));
    // Calculamos inicio de mes para que se vea bonito al entrar
    const start = new Date(); start.setDate(1);
    setStartDate(start.toISOString().split('T')[0]);
    
    // Auto-fetch al cargar (opcional, mejor que el usuario de clic)
    // fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await reportService.getFinancialReport(startDate, endDate, selectedVehicleId);
      if (res && res.success) {
        setData(res.data);
        setSummary(res.summary);
      }
    } catch (e) {
      console.error(e);
      alert("Error cargando finanzas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
        case 'FUEL': return { text: '#059669', bg: '#d1fae5', label: 'Combustible' };
        case 'MAINTENANCE': return { text: '#b45309', bg: '#fef3c7', label: 'Mantenimiento' };
        case 'INSURANCE': return { text: '#4f46e5', bg: '#e0e7ff', label: 'Seguro' };
        case 'FINE': return { text: '#dc2626', bg: '#fee2e2', label: 'Multa' };
        default: return { text: '#4b5563', bg: '#f3f4f6', label: 'Otro' };
    }
  };

  const renderItem = ({ item }: { item: ExpenseRecord }) => {
    const style = getTypeColor(item.type_raw);
    return (
      <View style={styles.row}>
        <View style={styles.colDate}>
            <Text style={styles.cellText}>{item.date}</Text>
        </View>
        <View style={styles.colVeh}>
            <Text style={styles.cellTitle}>{item.vehicle}</Text>
            <View style={[styles.badge, { backgroundColor: style.bg }]}>
                <Text style={[styles.badgeText, { color: style.text }]}>{item.type}</Text>
            </View>
        </View>
        <View style={styles.colDesc}>
            <Text style={styles.cellText} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={styles.colAmount}>
            <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
        </View>
      </View>
    );
  };

  // Cálculo de porcentajes para las barras
  const totalSafe = summary.total || 1; 
  const fuelPct = (summary.fuel / totalSafe) * 100;
  const maintPct = (summary.maintenance / totalSafe) * 100;
  const otherPct = (summary.others / totalSafe) * 100;

  return (
    <MainLayout activeMenu="Financieros">
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>Gastos Operativos</Text>
            <Text style={styles.sub}>Control de costos de flota.</Text>
        </View>

        {/* --- TARJETAS DE RESUMEN (DASHBOARD) --- */}
        <View style={styles.summaryRow}>
            {/* Total */}
            <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Gasto Total</Text>
                <Text style={styles.cardValueBig}>{formatCurrency(summary.total)}</Text>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, {width: '100%', backgroundColor: '#2563eb'}]}/></View>
            </View>

            {/* Combustible */}
            <View style={styles.summaryCard}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={styles.cardLabel}>Combustible</Text>
                    <Ionicons name="water" size={16} color="#059669"/>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(summary.fuel)}</Text>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, {width: `${fuelPct}%`, backgroundColor: '#059669'}]}/></View>
                <Text style={styles.pctText}>{fuelPct.toFixed(1)}% del total</Text>
            </View>

            {/* Mantenimiento */}
            <View style={styles.summaryCard}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={styles.cardLabel}>Mantenimiento</Text>
                    <Ionicons name="build" size={16} color="#b45309"/>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(summary.maintenance)}</Text>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, {width: `${maintPct}%`, backgroundColor: '#b45309'}]}/></View>
                <Text style={styles.pctText}>{maintPct.toFixed(1)}% del total</Text>
            </View>
        </View>

        {/* Filtros */}
        <View style={styles.filterBar}>
             <View style={styles.inputGroup}><Text style={styles.label}>Desde</Text><TextInput type="date" style={styles.input} value={startDate} onChangeText={setStartDate} {...{type:'date'} as any}/></View>
             <View style={styles.inputGroup}><Text style={styles.label}>Hasta</Text><TextInput type="date" style={styles.input} value={endDate} onChangeText={setEndDate} {...{type:'date'} as any}/></View>
             <View style={[styles.inputGroup, {flex:1}]}>
                <Text style={styles.label}>Vehículo</Text>
                <select style={styles.select as any} value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
                    <option value="">-- Todos --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.plate}</option>)}
                </select>
             </View>
             <TouchableOpacity style={styles.btn} onPress={fetchData} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.btnText}>Ver Reporte</Text>}
             </TouchableOpacity>
        </View>

        {/* Tabla */}
        <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDate]}>Fecha</Text>
            <Text style={[styles.th, styles.colVeh]}>Vehículo / Concepto</Text>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colAmount]}>Monto</Text>
        </View>

        <FlatList 
            data={data} 
            renderItem={renderItem} 
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="wallet-outline" size={48} color="#cbd5e1"/>
                    <Text style={styles.emptyText}>No hay gastos registrados en este periodo.</Text>
                </View>
            }
        />
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  sub: { color: '#64748b', marginTop:4 },

  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor:'#000', shadowOpacity:0.03, borderWidth:1, borderColor:'#e2e8f0' },
  cardLabel: { fontSize: 12, fontWeight:'600', color:'#64748b', textTransform:'uppercase' },
  cardValueBig: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginVertical: 8 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginVertical: 6 },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 4 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: 11, color:'#94a3b8', marginTop: 4 },

  filterBar: { flexDirection:'row', gap:16, alignItems:'flex-end', marginBottom:20, backgroundColor:'#fff', padding:16, borderRadius:12, shadowColor:'#000', shadowOpacity:0.05 },
  inputGroup: { gap:6 },
  label: { fontSize:12, fontWeight:'700', color:'#475569' },
  input: { borderWidth:1, borderColor:'#cbd5e1', paddingHorizontal:10, borderRadius:8, height:40, backgroundColor:'#fff', outlineStyle:'none' as any },
  select: { borderWidth:1, borderColor:'#cbd5e1', paddingHorizontal:10, borderRadius:8, height:40, backgroundColor:'#fff' },
  btn: { backgroundColor:'#2563eb', paddingHorizontal:20, height:40, borderRadius:8, justifyContent:'center' },
  btnText: { color:'#fff', fontWeight:'bold' },
  
  tableHeader: { flexDirection:'row', padding:12, backgroundColor:'#e2e8f0', borderRadius:8, marginBottom:8 },
  th: { fontWeight:'700', color:'#475569', fontSize:12 },
  
  row: { flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'#fff', borderBottomWidth:1, borderColor:'#f1f5f9' },
  colDate: { width: 100 },
  colVeh: { width: 200 },
  colDesc: { flex: 1 },
  colAmount: { width: 120, alignItems: 'flex-end' },

  badge: { paddingHorizontal:8, paddingVertical:2, borderRadius:4, alignSelf:'flex-start', marginTop:4 },
  badgeText: { fontSize:10, fontWeight:'700' },
  
  cellText: { color: '#334155', fontSize: 13 },
  cellTitle: { fontWeight: '700', color: '#1e293b', fontSize: 13 },
  amountText: { fontWeight: '700', color: '#0f172a', fontSize: 14 },

  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', marginTop: 10 }
});