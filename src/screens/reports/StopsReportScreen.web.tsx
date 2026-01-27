import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import MainLayout from '../../layouts/MainLayout';
import vehicleService from '../../api/vehicleService';
import reportService, { StopRecord } from '../../api/reportService';

const GOOGLE_MAPS_API_KEY = "TU_API_KEY_AQUI"; 

export default function StopsReportScreenWeb() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [minTime, setMinTime] = useState('5');
  
  const [stops, setStops] = useState<StopRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedStop, setSelectedStop] = useState<StopRecord | null>(null);

  // 1. CARGA DE VEHÍCULOS (CORREGIDA PARA TU NUEVO CONTROLLER)
  useEffect(() => {
    vehicleService.getVehicles()
      .then((response: any) => {
        let list: any[] = [];
        
        // 🔍 DETECTIVE DE FORMATOS:
        if (Array.isArray(response)) {
            // Caso A: Array directo
            list = response;
        } else if (response.data && Array.isArray(response.data)) {
            // Caso B: Tu nuevo controller ({ success: true, data: [...] })
            list = response.data;
        } else if (response.success && Array.isArray(response.vehicles)) {
            // Caso C: Alguna variante futura
            list = response.vehicles;
        }

        setVehicles(list);
        if(list.length > 0) setSelectedVehicleId(list[0].id);
      })
      .catch(err => console.error("Error cargando vehículos:", err));
  }, []);

  // 2. OBTENER INFO DEL CHOFER (CORREGIDA PARA LEER 'driver.account')
  const getCurrentVehicleInfo = () => {
    const v = vehicles.find(item => item.id === selectedVehicleId);
    if (!v) return { vehicle: 'Desconocido', driver: 'No Asignado' };

    let driverName = 'No Asignado';

    // Tu controller carga 'driver' y 'driver.account'. Buscamos el nombre en orden de prioridad:
    if (v.driver) {
        // 1. Nombre en la cuenta de usuario (si existe)
        if (v.driver.account && v.driver.account.name) {
            driverName = v.driver.account.name;
        } 
        // 2. Nombre y Apellido en el perfil del conductor
        else if (v.driver.first_name || v.driver.last_name) {
            driverName = `${v.driver.first_name || ''} ${v.driver.last_name || ''}`.trim();
        }
        // 3. Campo genérico 'name' en el perfil
        else if (v.driver.name) {
            driverName = v.driver.name;
        }
    } 
    // 4. Nombre directo en la tabla vehículos (si usaste mi truco temporal anterior)
    else if (v.driver_name) {
        driverName = v.driver_name;
    }

    return {
        vehicle: `${v.brand} ${v.plate}`,
        driver: driverName
    };
  };

  const handleSearch = async () => {
    if (!selectedVehicleId) return alert("Selecciona un vehículo");
    setLoading(true);
    setGenerated(false);
    setStops([]);

    try {
      const response: any = await reportService.getStops(selectedVehicleId, date, parseInt(minTime) || 5);
      
      let list = [];
      if (Array.isArray(response)) list = response;
      else if (response.data && Array.isArray(response.data)) list = response.data;
      
      setStops(list);
      setGenerated(true);
    } catch (e) {
      console.error(e);
      alert("Error al generar reporte.");
    } finally {
      setLoading(false);
    }
  };

  // ... Resto de funciones (openMap, downloadReport, renderItem) IGUAL QUE ANTES ...
  // Solo copio las necesarias para que funcione el componente
  
  const openMap = (stop: StopRecord) => { setSelectedStop(stop); setMapVisible(true); };

  const downloadReport = () => {
    if (!stops?.length) return;
    const info = getCurrentVehicleInfo();
    let csvContent = "data:text/csv;charset=utf-8,REPORTE DE PARADAS\n";
    csvContent += `Vehículo:,${info.vehicle}\nChofer:,${info.driver}\nFecha:,${date}\n\n#,Inicio,Fin,Duracion,Ubicacion,Coordenadas\n`;
    stops.forEach((item, index) => {
        const safeAddress = (item.address || '').replace(/,/g, ' '); 
        const row = `${index + 1},${item.start_time},${item.end_time},${item.duration},"${safeAddress}","${item.latitude}, ${item.longitude}"`;
        csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Paradas_${info.vehicle.replace(/\s/g, '_')}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const info = getCurrentVehicleInfo(); 

  const renderItem = ({ item, index }: { item: StopRecord, index: number }) => (
    <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
      <View style={styles.colIcon}><View style={styles.stopIcon}><Text style={styles.stopIndex}>{index + 1}</Text></View></View>
      <View style={styles.colTime}><Text style={styles.cellTextBold}>{item.start_time}</Text><Text style={styles.cellSubText}>a {item.end_time}</Text></View>
      <View style={styles.colDuration}><View style={styles.badge}><Ionicons name="hourglass-outline" size={12} color="#b45309" /><Text style={styles.badgeText}>{item.duration}</Text></View></View>
      <View style={styles.colAddress}><Text style={styles.cellText} numberOfLines={2}>{item.address || `Lat: ${item.latitude.toFixed(4)}`}</Text></View>
      <View style={styles.colAction}><TouchableOpacity style={styles.mapBtn} onPress={() => openMap(item)}><Ionicons name="map-outline" size={18} color="#2563eb" /><Text style={styles.mapBtnText}>Ver</Text></TouchableOpacity></View>
    </View>
  );

  return (
    <MainLayout activeMenu="Paradas">
      <View style={styles.container}>
        <View style={styles.topBar}>
            <View><Text style={styles.title}>Reporte de Paradas</Text><Text style={styles.subtitle}>Auditoría de estancias.</Text></View>
            {generated && stops.length > 0 && (
                <TouchableOpacity style={styles.downloadBtn} onPress={downloadReport}><Ionicons name="cloud-download-outline" size={20} color="#fff" /><Text style={styles.downloadText}>Excel</Text></TouchableOpacity>
            )}
        </View>
        <View style={styles.filterCard}>
            <View style={styles.filtersRow}>
                <View style={styles.inputGroup}><Text style={styles.label}>Vehículo</Text>
                    <select style={styles.select as any} value={selectedVehicleId || ''} onChange={(e) => setSelectedVehicleId(Number(e.target.value))}>
                        {vehicles.map(v => (<option key={v.id} value={v.id}>{v.brand} {v.plate}</option>))}
                    </select>
                </View>
                <View style={styles.inputGroup}><Text style={styles.label}>Fecha</Text><TextInput type="date" style={styles.input} value={date} onChangeText={setDate} {...{ type: 'date' } as any}/></View>
                <View style={[styles.inputGroup, {width: 80}]}><Text style={styles.label}>Min</Text><TextInput style={styles.input} value={minTime} onChangeText={setMinTime} keyboardType="numeric"/></View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>{loading ? <ActivityIndicator size="small" color="#fff"/> : <Ionicons name="search" size={20} color="#fff" />}<Text style={styles.searchBtnText}>Generar</Text></TouchableOpacity>
            </View>
        </View>
        {generated && (
            <View style={styles.summaryBar}>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Vehículo:</Text><Text style={styles.summaryValue}>{info.vehicle}</Text></View>
                <View style={styles.separator} />
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Chofer:</Text><Text style={styles.summaryValue}>{info.driver}</Text></View>
                <View style={styles.separator} />
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Paradas:</Text><Text style={styles.summaryValue}>{stops.length}</Text></View>
            </View>
        )}
        <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colIcon]}>#</Text><Text style={[styles.headerText, styles.colTime]}>Horario</Text><Text style={[styles.headerText, styles.colDuration]}>Duración</Text><Text style={[styles.headerText, styles.colAddress]}>Ubicación</Text><Text style={[styles.headerText, styles.colAction]}>Mapa</Text>
        </View>
        <FlatList data={stops} renderItem={renderItem} keyExtractor={(item, index) => String(index)} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="stats-chart-outline" size={64} color="#e5e7eb" /><Text style={styles.emptyText}>{generated ? "El vehículo no se detuvo." : "Selecciona filtros."}</Text></View>}/>
        <Modal visible={mapVisible} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Ubicación</Text><TouchableOpacity onPress={() => setMapVisible(false)}><Ionicons name="close" size={24} color="#374151"/></TouchableOpacity></View><View style={styles.mapContainer}>{selectedStop && mapVisible && (<LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}><GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: selectedStop.latitude, lng: selectedStop.longitude }} zoom={16}><Marker position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }} /></GoogleMap></LoadScript>)}</View><View style={styles.modalFooter}><Text style={styles.addressText}>{selectedStop?.address || "..."}</Text></View></View></View></Modal>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#6b7280' },
  downloadBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#059669', padding: 10, borderRadius: 8 },
  downloadText: { color: '#fff', fontWeight: 'bold' },
  filterCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20 },
  filtersRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', flexWrap:'wrap' },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  select: { height: 42, padding: 10, borderRadius: 6, borderColor: '#d1d5db', borderWidth: 1, minWidth: 200 },
  input: { height: 42, padding: 10, borderRadius: 6, borderColor: '#d1d5db', borderWidth: 1, minWidth: 140, outlineStyle:'none' as any },
  searchBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#2563eb', height: 42, paddingHorizontal: 20, borderRadius: 6, alignItems:'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  summaryBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 20, borderColor: '#dbeafe', borderWidth:1 },
  summaryItem: { flexDirection: 'row', gap: 6 },
  summaryLabel: { fontWeight: '600', color: '#1e40af' },
  summaryValue: { color: '#1e3a8a' },
  separator: { width: 1, height: 16, backgroundColor: '#bfdbfe', marginHorizontal: 16 },
  tableHeader: { flexDirection: 'row', padding: 12, backgroundColor: '#e5e7eb', borderRadius: 8, marginBottom: 8 },
  headerText: { fontWeight: 'bold', color: '#6b7280', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  rowAlt: { backgroundColor: '#f9fafb' },
  colIcon: { width: 50, alignItems: 'center' }, colTime: { width: 140 }, colDuration: { width: 120 }, colAddress: { flex: 1 }, colAction: { width: 80, alignItems: 'center' },
  stopIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  stopIndex: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
  cellTextBold: { fontWeight: '600' }, cellSubText: { fontSize: 12, color: '#6b7280' }, cellText: { fontSize: 13, color: '#4b5563' },
  badge: { flexDirection: 'row', gap: 4, backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#c2410c' },
  mapBtn: { flexDirection: 'row', gap: 4, padding: 6, backgroundColor: '#f0f9ff', borderRadius: 6 },
  mapBtnText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 60 }, emptyText: { color: '#9ca3af', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 600, height: 500, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontWeight: 'bold', fontSize: 16 },
  mapContainer: { flex: 1 },
  modalFooter: { padding: 16, backgroundColor: '#f9fafb' },
  addressText: { fontWeight: '600' }
});