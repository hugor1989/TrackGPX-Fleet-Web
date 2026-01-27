import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
// 👇 Importamos el servicio correcto
import reportService, { DriverRankingRecord } from '../../api/reportService';

export default function DriverRankingScreenWeb() {
  // Estados
  const [ranking, setRanking] = useState<DriverRankingRecord[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Función de Carga usando el Service
  const fetchRanking = async () => {
    setLoading(true);
    try {
      // ✅ Usamos la función del servicio, no axios directo
      const data = await reportService.getDriverRanking(startDate, endDate);

      console.log("Datos de ranking:", data);
      setRanking(data);
    } catch (e) {
      console.error("Error cargando ranking:", e);
      alert("No se pudo cargar el ranking de conductores.");
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => { 
    fetchRanking(); 
  }, []);

  // Helper de colores para el Score
  const getScoreColor = (score: number) => {
    if (score >= 95) return { text: '#15803d', bg: '#dcfce7' }; // Verde Fuerte (A+)
    if (score >= 80) return { text: '#166534', bg: '#f0fdf4' }; // Verde (A/B)
    if (score >= 70) return { text: '#854d0e', bg: '#fef9c3' }; // Amarillo (C)
    return { text: '#b91c1c', bg: '#fee2e2' }; // Rojo (F)
  };

  const renderItem = ({ item, index }: { item: DriverRankingRecord, index: number }) => {
    const scoreStyle = getScoreColor(item.score);
    
    return (
      <View style={styles.row}>
        {/* Posición # */}
        <View style={styles.colRank}>
           <View style={[styles.rankBadge, index < 3 && styles.topRank]}>
               <Text style={[styles.rankText, index < 3 && {color:'#fff'}]}>#{index + 1}</Text>
           </View>
        </View>
        
        {/* Conductor y Vehículo */}
        <View style={styles.colDriver}>
           <Text style={styles.driverName}>{item.driver}</Text>
           <Text style={styles.vehName}>{item.vehicle}</Text>
        </View>
        
        {/* Score y Calificación */}
        <View style={styles.colScore}>
           <View style={[styles.scoreBadge, { backgroundColor: scoreStyle.bg }]}>
              <Text style={[styles.scoreNum, { color: scoreStyle.text }]}>{item.score}</Text>
              <Text style={[styles.grade, { color: scoreStyle.text }]}>{item.grade}</Text>
           </View>
        </View>
        
        {/* Infracciones (Detalle) */}
        <View style={styles.colStats}>
           <View style={styles.statItem} title="Exceso Velocidad">
              <Ionicons name="speedometer-outline" size={14} color="#ef4444"/>
              <Text style={styles.statNum}>{item.events.overspeed}</Text>
           </View>
           <View style={styles.statItem} title="Frenados Bruscos">
              <Ionicons name="alert-circle-outline" size={14} color="#f59e0b"/>
              <Text style={styles.statNum}>{item.events.braking}</Text>
           </View>
           <View style={styles.statItem} title="Salidas de Geocerca">
              <Ionicons name="map-outline" size={14} color="#3b82f6"/>
              <Text style={styles.statNum}>{item.events.geofence}</Text>
           </View>
        </View>
      </View>
    );
  };

  return (
    <MainLayout activeMenu="Conductores">
      <View style={styles.container}>
        
        {/* Encabezado */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Scorecard de Conductores</Text>
                <Text style={styles.sub}>Ranking de seguridad y buenas prácticas de manejo.</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchRanking} disabled={loading}>
                <Ionicons name="refresh" size={20} color="#fff"/>
            </TouchableOpacity>
        </View>

        {/* Barra de Filtros */}
        <View style={styles.filterBar}>
             <View style={styles.inputGroup}>
                <Text style={styles.label}>Desde</Text>
                <TextInput type="date" style={styles.input} value={startDate} onChangeText={setStartDate} {...{type:'date'} as any}/>
             </View>
             
             <View style={styles.inputGroup}>
                <Text style={styles.label}>Hasta</Text>
                <TextInput type="date" style={styles.input} value={endDate} onChangeText={setEndDate} {...{type:'date'} as any}/>
             </View>
             
             <TouchableOpacity style={styles.btn} onPress={fetchRanking} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.btnText}>Calcular Ranking</Text>}
             </TouchableOpacity>
        </View>

        {/* Tabla */}
        <View style={styles.tableHeader}>
            <Text style={[styles.th, {width:50}]}>Pos</Text>
            <Text style={[styles.th, {flex:1}]}>Conductor / Vehículo</Text>
            <Text style={[styles.th, {width:100, textAlign:'center'}]}>Puntaje</Text>
            <Text style={[styles.th, {width:180, textAlign:'center'}]}>Infracciones (Vel / Fren / Geo)</Text>
        </View>

        <FlatList 
            data={ranking} 
            renderItem={renderItem} 
            keyExtractor={(item, index) => String(index)}
            contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="trophy-outline" size={48} color="#cbd5e1"/>
                    <Text style={styles.emptyText}>Sin datos para este periodo.</Text>
                </View>
            }
        />
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  
  header: { marginBottom: 20, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  sub: { color: '#64748b', marginTop:4 },
  refreshBtn: { backgroundColor:'#3b82f6', padding:10, borderRadius:8 },

  filterBar: { flexDirection:'row', gap:16, alignItems:'flex-end', marginBottom:24, backgroundColor:'#fff', padding:16, borderRadius:12, shadowColor:'#000', shadowOpacity:0.05 },
  inputGroup: { gap:6 },
  label: { fontSize:12, fontWeight:'700', color:'#475569' },
  input: { borderWidth:1, borderColor:'#cbd5e1', paddingHorizontal:10, borderRadius:8, height:40, backgroundColor:'#fff', outlineStyle:'none' as any },
  btn: { backgroundColor:'#2563eb', paddingHorizontal:20, height:40, borderRadius:8, justifyContent:'center' },
  btnText: { color:'#fff', fontWeight:'bold' },
  
  tableHeader: { flexDirection:'row', padding:12, backgroundColor:'#e2e8f0', borderRadius:8, marginBottom:8 },
  th: { fontWeight:'700', color:'#475569', fontSize:12 },
  
  row: { flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'#fff', borderBottomWidth:1, borderColor:'#f1f5f9' },
  
  colRank: { width: 50 },
  colDriver: { flex: 1 },
  colScore: { width: 100, alignItems:'center' },
  colStats: { width: 180, flexDirection:'row', gap:12, justifyContent:'center' },

  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center' },
  topRank: { backgroundColor:'#f59e0b' }, 
  rankText: { fontWeight:'bold', fontSize:12, color:'#64748b' },
  
  driverName: { fontWeight:'700', color:'#1e293b', fontSize:14 },
  vehName: { fontSize:12, color:'#94a3b8' },
  
  scoreBadge: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  scoreNum: { fontSize:16, fontWeight:'800' },
  grade: { fontSize:12, fontWeight:'600', opacity:0.8 },
  
  statItem: { flexDirection:'row', alignItems:'center', gap:4, width:40 },
  statNum: { fontSize:12, fontWeight:'600', color:'#475569' },

  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', marginTop: 10 }
});